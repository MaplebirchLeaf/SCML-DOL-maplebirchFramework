// ./cloudflare/worker.ts
/// <reference types="@cloudflare/workers-types" />

interface Env {
  SAVE_BUCKET: R2Bucket;
  MAPLEBIRCH_TOKEN: string;
}

class HttpError extends Error {
  public constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const MAX_BODY_BYTES = 32 * 1024 * 1024;
const MAX_SLOT = 200;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, GET, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400'
};

function response(body: BodyInit | null, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
  return new Response(body, {
    ...init,
    headers
  });
}

function json(value: unknown, status = 200): Response {
  return response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

function text(value: string, status = 200): Response {
  return response(value, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

function authorized(request: Request, env: Env): boolean {
  const token = request.headers.get('Authorization');
  return !!env.MAPLEBIRCH_TOKEN && token === `Bearer ${env.MAPLEBIRCH_TOKEN}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function slotFromPath(pathname: string): number | null {
  const match = /^\/saves\/(\d+)$/.exec(pathname);
  if (!match) return null;
  const slot = Number(match[1]);
  if (!Number.isInteger(slot) || slot < 0 || slot > MAX_SLOT) return null;
  return slot;
}

async function readJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) throw new HttpError(413, 'Payload too large.');
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BODY_BYTES) throw new HttpError(413, 'Payload too large.');
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    return null;
  }
}

async function listSaves(env: Env): Promise<Response> {
  const result = await env.SAVE_BUCKET.list({
    prefix: 'slots/'
  });

  const saves: Array<{ slot: number; updatedAt: number }> = [];
  for (const object of result.objects) {
    const match = /^slots\/(\d+)\.json$/.exec(object.key);
    if (!match) continue;
    const slot = Number(match[1]);
    if (!Number.isInteger(slot) || slot < 0 || slot > MAX_SLOT) continue;
    saves.push({ slot, updatedAt: object.uploaded.getTime() });
  }
  saves.sort((a, b) => a.slot - b.slot);

  return json(saves);
}

async function getStored(bucket: R2Bucket, key: string, notFound: string): Promise<Response> {
  const object = await bucket.get(key);
  if (!object) return text(notFound, 404);
  return response(object.body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

async function putSave(request: Request, env: Env, slot: number): Promise<Response> {
  const input = await readJson(request);
  if (!isObject(input) || !isObject(input.payload)) return text('Invalid save payload.', 400);
  const payload = input.payload;
  if (payload.slot !== slot || !isObject(payload.save) || !Number.isFinite(payload.exportedAt) || (payload.gameId !== undefined && typeof payload.gameId !== 'string')) {
    return text('Invalid save payload.', 400);
  }
  const item = {
    slot,
    updatedAt: Number(input.updatedAt) || Date.now(),
    payload
  };
  await env.SAVE_BUCKET.put(`slots/${slot}.json`, JSON.stringify(item));
  return json({
    slot,
    updatedAt: item.updatedAt
  });
}

async function deleteSave(env: Env, slot: number): Promise<Response> {
  await env.SAVE_BUCKET.delete(`slots/${slot}.json`);
  return response(null, {
    status: 204
  });
}

async function putSaveCode(request: Request, env: Env): Promise<Response> {
  const input = await readJson(request);
  if (!isObject(input) || !isObject(input.payload)) return text('Invalid save code payload.', 400);
  const payload = input.payload;
  if (typeof payload.code !== 'string' || !payload.code || !Number.isFinite(payload.exportedAt) || (payload.gameId !== undefined && typeof payload.gameId !== 'string')) {
    return text('Invalid save code payload.', 400);
  }
  const item = {
    updatedAt: Number(input.updatedAt) || Date.now(),
    payload
  };
  await env.SAVE_BUCKET.put('save-code.json', JSON.stringify(item));
  return json({
    updatedAt: item.updatedAt
  });
}

async function handle(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return response(null, { status: 204 });

  if (!env.SAVE_BUCKET) return text('SAVE_BUCKET binding is missing.', 500);
  if (!env.MAPLEBIRCH_TOKEN) return text('MAPLEBIRCH_TOKEN is missing.', 500);
  const url = new URL(request.url);
  if (url.pathname === '/health') return json({ ok: true });
  if (!authorized(request, env)) return text('Unauthorized', 401);
  if (url.pathname === '/saves' && request.method === 'GET') return listSaves(env);
  if (url.pathname === '/save-code') {
    if (request.method === 'GET') return getStored(env.SAVE_BUCKET, 'save-code.json', 'Save code not found.');
    if (request.method === 'PUT') return putSaveCode(request, env);
  }

  const slot = slotFromPath(url.pathname);

  if (slot !== null) {
    if (request.method === 'GET') return getStored(env.SAVE_BUCKET, `slots/${slot}.json`, 'Save not found.');
    if (request.method === 'PUT') return putSave(request, env, slot);
    if (request.method === 'DELETE') return deleteSave(env, slot);
  }

  return text('Not found', 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (error) {
      if (error instanceof HttpError) return text(error.message, error.status);
      console.error(error);
      return text('Internal server error.', 500);
    }
  }
} satisfies ExportedHandler<Env>;
