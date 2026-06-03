import { basicAuthOk, hasAuthConfig } from './auth';
import { cloudResponse, optionsResponse, textResponse, unauthorizedResponse } from './http';
import { deleteObject, getObject, keyFromUrl, putObject } from './r2Store';
import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return optionsResponse();

    // 框架会用 /health 判断是否为 Go 后端。这里返回 404，让框架按 WebDAV 处理。
    if (url.pathname === '/health') return textResponse('Not found', 404);

    if (!hasAuthConfig(env)) return textResponse('Missing WEBDAV_USER or WEBDAV_PASSWORD', 500);
    if (!basicAuthOk(request, env)) return unauthorizedResponse();

    const key = keyFromUrl(url);
    if (!key) return textResponse('Invalid path', 400);

    switch (request.method) {
      case 'MKCOL':
        // R2 没有真实目录。框架只需要确认 slots/ 可以使用，所以这里直接成功。
        return cloudResponse(null, { status: 201 });

      case 'PUT':
        return await putObject(env, key, request);

      case 'GET':
        return await getObject(env, key);

      case 'DELETE':
        return await deleteObject(env, key);

      default:
        return textResponse('Method not allowed', 405);
    }
  }
};
