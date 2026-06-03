import type { Env } from './types';

function decodeBasicAuth(header: string): [string, string] | null {
  if (!header.startsWith('Basic ')) return null;

  try {
    const credentials = atob(header.slice(6));
    const separator = credentials.indexOf(':');
    if (separator < 0) return null;
    return [credentials.slice(0, separator), credentials.slice(separator + 1)];
  } catch {
    return null;
  }
}

export function hasAuthConfig(env: Env) {
  return Boolean(env.WEBDAV_USER && env.WEBDAV_PASSWORD);
}

export function basicAuthOk(request: Request, env: Env) {
  const credentials = decodeBasicAuth(request.headers.get('Authorization') || '');
  if (!credentials) return false;

  const [username, password] = credentials;
  return username === env.WEBDAV_USER && password === env.WEBDAV_PASSWORD;
}
