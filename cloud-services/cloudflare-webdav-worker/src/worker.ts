import { deleteAccount, hasStorage, login, register, requireBearerUser } from './auth';
import { cloudResponse, jsonResponse, optionsResponse, textResponse } from './http';
import { deleteObject, getJson, putJson, userKey } from './r2Store';
import type { AuthUser, Env, RemoteSaveCode, RemoteSaveItem } from './types';

function slotFromPath(pathname: string) {
  const match = /^\/saves\/(\d+)$/.exec(pathname);
  if (!match) return null;
  const slot = Number(match[1]);
  return Number.isInteger(slot) && slot >= 0 && slot <= 10 ? slot : null;
}

async function readJson<T>(request: Request): Promise<T | Response> {
  try {
    return (await request.json()) as T;
  } catch {
    return textResponse('invalid json body', 400);
  }
}

async function listSaves(env: Env, user: AuthUser) {
  const rows = await env.SAVE_DB.prepare('SELECT slot, updated_at AS updatedAt FROM saves WHERE user_id = ? ORDER BY slot').bind(user.id).all<RemoteSaveItem>();
  return jsonResponse(rows.results ?? []);
}

async function getSave(env: Env, user: AuthUser, slot: number) {
  const row = await env.SAVE_DB.prepare('SELECT slot, updated_at AS updatedAt, object_key AS objectKey FROM saves WHERE user_id = ? AND slot = ?')
    .bind(user.id, slot)
    .first<RemoteSaveItem & { objectKey: string }>();
  if (!row) return textResponse('not found', 404);
  const item = await getJson<RemoteSaveItem>(env, row.objectKey);
  if (!item) return textResponse('not found', 404);
  return jsonResponse({ slot: row.slot, updatedAt: row.updatedAt, payload: item.payload });
}

async function putSave(request: Request, env: Env, user: AuthUser, slot: number) {
  const item = await readJson<RemoteSaveItem>(request);
  if (item instanceof Response) return item;
  if (!item?.payload) return textResponse('missing payload', 400);
  const updatedAt = Number(item.updatedAt) || Date.now();
  const objectKey = userKey(user.id, `slots/${slot}.json`);
  await putJson(env, objectKey, { slot, updatedAt, payload: item.payload });
  await env.SAVE_DB.prepare(
    `INSERT INTO saves (user_id, slot, updated_at, object_key)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, slot) DO UPDATE SET updated_at = excluded.updated_at, object_key = excluded.object_key`
  )
    .bind(user.id, slot, updatedAt, objectKey)
    .run();
  return jsonResponse({ slot, updatedAt });
}

async function deleteSave(env: Env, user: AuthUser, slot: number) {
  await deleteObject(env, userKey(user.id, `slots/${slot}.json`));
  await env.SAVE_DB.prepare('DELETE FROM saves WHERE user_id = ? AND slot = ?').bind(user.id, slot).run();
  return cloudResponse(null, { status: 204 });
}

async function getSaveCode(env: Env, user: AuthUser) {
  const row = await env.SAVE_DB.prepare('SELECT updated_at AS updatedAt, object_key AS objectKey FROM save_codes WHERE user_id = ?').bind(user.id).first<RemoteSaveCode & { objectKey: string }>();
  if (!row) return textResponse('not found', 404);
  const item = await getJson<RemoteSaveCode>(env, row.objectKey);
  if (!item) return textResponse('not found', 404);
  return jsonResponse({ updatedAt: row.updatedAt, payload: item.payload });
}

async function putSaveCode(request: Request, env: Env, user: AuthUser) {
  const item = await readJson<RemoteSaveCode>(request);
  if (item instanceof Response) return item;
  if (!item?.payload) return textResponse('missing payload', 400);
  const updatedAt = Number(item.updatedAt) || Date.now();
  const objectKey = userKey(user.id, 'save-code.json');
  await putJson(env, objectKey, { updatedAt, payload: item.payload });
  await env.SAVE_DB.prepare(
    `INSERT INTO save_codes (user_id, updated_at, object_key)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET updated_at = excluded.updated_at, object_key = excluded.object_key`
  )
    .bind(user.id, updatedAt, objectKey)
    .run();
  return jsonResponse({ updatedAt });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return optionsResponse();
    if (!hasStorage(env)) return textResponse('Missing SAVE_BUCKET or SAVE_DB binding', 500);
    if (url.pathname === '/') return textResponse('Cloud save server is running.');
    if (url.pathname === '/health') return jsonResponse({ ok: true });
    if (url.pathname === '/auth/register' && request.method === 'POST') return register(request, env);
    if (url.pathname === '/auth/login' && request.method === 'POST') return login(request, env);

    const user = await requireBearerUser(request, env);
    if (user instanceof Response) return user;

    if (url.pathname === '/auth/account' && request.method === 'DELETE') return deleteAccount(request, env, user);
    if (url.pathname === '/saves' && request.method === 'GET') return listSaves(env, user);
    if (url.pathname === '/save-code' && request.method === 'GET') return getSaveCode(env, user);
    if (url.pathname === '/save-code' && request.method === 'PUT') return putSaveCode(request, env, user);

    const slot = slotFromPath(url.pathname);
    if (slot !== null) {
      if (request.method === 'GET') return getSave(env, user, slot);
      if (request.method === 'PUT') return putSave(request, env, user, slot);
      if (request.method === 'DELETE') return deleteSave(env, user, slot);
    }

    return textResponse('Not found', 404);
  }
};
