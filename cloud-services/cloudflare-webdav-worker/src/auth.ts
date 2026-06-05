import { cloudResponse, jsonResponse, textResponse, unauthorizedResponse } from './http';
import { deleteObject, userKey } from './r2Store';
import type { AuthResponse, AuthUser, Env } from './types';

const usernamePattern = /^[a-z0-9_-]{3,40}$/;
const passwordIterations = 210000;
const sessionDays = 30;

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function randomToken() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function sha256Hex(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: passwordIterations, hash: 'SHA-256' }, material, 256);
  return bytesToBase64(new Uint8Array(bits));
}

async function readAuthBody(request: Request): Promise<{ username: string; password: string } | Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return textResponse('invalid json body', 400);
  }
  const username = String(body?.username || '')
    .trim()
    .toLowerCase();
  const password = String(body?.password || '');
  if (!usernamePattern.test(username)) return textResponse('username must be 3-40 chars: a-z, 0-9, _ or -', 400);
  if (password.length < 8) return textResponse('password must be at least 8 chars', 400);
  return { username, password };
}

async function issueSession(env: Env, user: AuthUser): Promise<AuthResponse> {
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const now = Date.now();
  const expiresAt = now + sessionDays * 24 * 60 * 60 * 1000;
  await env.SAVE_DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(tokenHash, user.id, expiresAt, now).run();
  return { userId: user.id, username: user.username, token, expiresAt };
}

export function hasStorage(env: Env) {
  return Boolean(env.SAVE_DB && env.SAVE_BUCKET);
}

export async function register(request: Request, env: Env): Promise<Response> {
  const body = await readAuthBody(request);
  if (body instanceof Response) return body;

  const maxUsers = Math.max(1, Number(env.MAX_USERS || 5) || 5);
  const count = await env.SAVE_DB.prepare('SELECT COUNT(*) AS count FROM users').first<{ count: number }>();
  if ((count?.count || 0) >= maxUsers) return textResponse('user limit reached', 403);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await hashPassword(body.password, salt);
  const now = Date.now();
  try {
    const result = await env.SAVE_DB.prepare('INSERT INTO users (username, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?)')
      .bind(body.username, bytesToBase64(salt), passwordHash, now)
      .run();
    return jsonResponse(await issueSession(env, { id: Number(result.meta.last_row_id), username: body.username }));
  } catch (error: any) {
    if (
      String(error?.message || error)
        .toLowerCase()
        .includes('unique')
    )
      return textResponse('username already exists', 409);
    return textResponse(String(error?.message || error), 500);
  }
}

export async function login(request: Request, env: Env): Promise<Response> {
  const body = await readAuthBody(request);
  if (body instanceof Response) return body;

  const user = await env.SAVE_DB.prepare('SELECT id, username, password_salt, password_hash FROM users WHERE username = ?')
    .bind(body.username)
    .first<{ id: number; username: string; password_salt: string; password_hash: string }>();
  if (!user) return unauthorizedResponse();
  const hash = await hashPassword(body.password, base64ToBytes(user.password_salt));
  if (hash !== user.password_hash) return unauthorizedResponse();
  return jsonResponse(await issueSession(env, { id: user.id, username: user.username }));
}

export async function requireBearerUser(request: Request, env: Env): Promise<AuthUser | Response> {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return textResponse('missing bearer token', 401);
  const tokenHash = await sha256Hex(token);
  const row = await env.SAVE_DB.prepare(
    `SELECT users.id AS id, users.username AS username
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?`
  )
    .bind(tokenHash, Date.now())
    .first<AuthUser>();
  if (!row) return textResponse('invalid or expired token', 401);
  return row;
}

export async function deleteAccount(request: Request, env: Env, user: AuthUser): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return textResponse('invalid json body', 400);
  }
  const password = String(body?.password || '');
  if (password.length < 8) return textResponse('password must be at least 8 chars', 400);
  const record = await env.SAVE_DB.prepare('SELECT password_salt, password_hash FROM users WHERE id = ?').bind(user.id).first<{ password_salt: string; password_hash: string }>();
  if (!record) return textResponse('user not found', 404);
  const hash = await hashPassword(password, base64ToBytes(record.password_salt));
  if (hash !== record.password_hash) return unauthorizedResponse();
  const listed = await env.SAVE_BUCKET.list({ prefix: userKey(user.id, '') });
  await Promise.all(listed.objects.map(object => deleteObject(env, object.key)));
  await env.SAVE_DB.batch([
    env.SAVE_DB.prepare('DELETE FROM save_codes WHERE user_id = ?').bind(user.id),
    env.SAVE_DB.prepare('DELETE FROM saves WHERE user_id = ?').bind(user.id),
    env.SAVE_DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    env.SAVE_DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id)
  ]);
  return cloudResponse(null, { status: 204 });
}
