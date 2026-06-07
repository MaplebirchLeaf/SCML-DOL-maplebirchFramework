import type { Env } from './types';

export function userKey(userId: number, key: string) {
  return `users/${userId}/${key}`;
}

export async function putJson(env: Env, key: string, value: unknown) {
  await env.SAVE_BUCKET.put(key, JSON.stringify(value), {
    httpMetadata: {
      contentType: 'application/json'
    }
  });
}

export async function getJson<T>(env: Env, key: string): Promise<T | null> {
  const object = await env.SAVE_BUCKET.get(key);
  if (!object) return null;
  return JSON.parse(await object.text()) as T;
}

export async function deleteObject(env: Env, key: string) {
  await env.SAVE_BUCKET.delete(key);
}
