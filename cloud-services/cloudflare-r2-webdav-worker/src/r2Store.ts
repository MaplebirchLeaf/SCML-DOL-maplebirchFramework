import { cloudResponse, textResponse } from './http';
import type { Env } from './types';

export function keyFromUrl(url: URL) {
  const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (!key || key.includes('..')) return '';
  return key;
}

export async function putObject(env: Env, key: string, request: Request) {
  await env.SAVE_BUCKET.put(key, request.body, {
    httpMetadata: {
      contentType: request.headers.get('Content-Type') || 'application/json'
    }
  });
  return cloudResponse(null, { status: 204 });
}

export async function getObject(env: Env, key: string) {
  const object = await env.SAVE_BUCKET.get(key);
  if (!object) return textResponse('Not found', 404);

  return cloudResponse(object.body, {
    status: 200,
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/json',
      ETag: object.httpEtag
    }
  });
}

export async function deleteObject(env: Env, key: string) {
  await env.SAVE_BUCKET.delete(key);
  return cloudResponse(null, { status: 204 });
}
