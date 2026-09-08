// ./cloudflare/worker.ts

interface R2ObjectLike {
  key: string;
  uploaded?: Date;
}

interface R2ListResultLike {
  objects: R2ObjectLike[];
}

interface R2ObjectBodyLike {
  body: ReadableStream<Uint8Array>;
}

interface R2BucketLike {
  list(options?: { prefix?: string }): Promise<R2ListResultLike>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  put(key: string, value: string | ArrayBuffer | ArrayBufferView | Blob | ReadableStream): Promise<unknown>;
  delete(key: string): Promise<void>;
}

interface Env {
  SAVE_BUCKET: R2BucketLike;
  MAPLEBIRCH_TOKEN: string;
}

interface RemoteSaveItem {
  slot: number;
  updatedAt: number;
  payload: unknown;
}

interface RemoteSaveCode {
  updatedAt: number;
  payload: unknown;
}

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

function slotFromPath(pathname: string): number | null {
  const match = /^\/saves\/(\d+)$/.exec(pathname);
  if (!match) return null;
  const slot = Number(match[1]);
  if (!Number.isInteger(slot) || slot < 0 || slot > 10) return null;
  return slot;
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

async function listSaves(env: Env): Promise<Response> {
  const result = await env.SAVE_BUCKET.list({
    prefix: 'slots/'
  });

  const saves = result.objects
    .map(object => {
      const match = /^slots\/(\d+)\.json$/.exec(object.key);
      if (!match) return null;
      const slot = Number(match[1]);
      if (!Number.isInteger(slot) || slot < 0 || slot > 10) return null;
      return {
        slot,
        updatedAt: object.uploaded?.getTime() ?? 0
      };
    })
    .filter(
      (
        item
      ): item is {
        slot: number;
        updatedAt: number;
      } => item !== null
    )
    .sort((a, b) => a.slot - b.slot);

  return json(saves);
}

async function getSave(env: Env, slot: number): Promise<Response> {
  const object = await env.SAVE_BUCKET.get(`slots/${slot}.json`);
  if (!object) return text('Save not found.', 404);
  return response(object.body as BodyInit, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

async function putSave(request: Request, env: Env, slot: number): Promise<Response> {
  const input = await readJson<RemoteSaveItem>(request);
  if (!input || input.payload == null) return text('Invalid save payload.', 400);
  const item: RemoteSaveItem = {
    slot,
    updatedAt: Number(input.updatedAt) || Date.now(),
    payload: input.payload
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

async function getSaveCode(env: Env): Promise<Response> {
  const object = await env.SAVE_BUCKET.get('save-code.json');
  if (!object) return text('Save code not found.', 404);
  return response(object.body as BodyInit, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

async function putSaveCode(request: Request, env: Env): Promise<Response> {
  const input = await readJson<RemoteSaveCode>(request);
  if (!input || input.payload == null) return text('Invalid save code payload.', 400);
  const item: RemoteSaveCode = {
    updatedAt: Number(input.updatedAt) || Date.now(),
    payload: input.payload
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
    if (request.method === 'GET') return getSaveCode(env);
    if (request.method === 'PUT') return putSaveCode(request, env);
  }

  const slot = slotFromPath(url.pathname);

  if (slot !== null) {
    if (request.method === 'GET') return getSave(env, slot);
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
      console.error(error);
      return text(error instanceof Error ? error.message : String(error), 500);
    }
  }
};
