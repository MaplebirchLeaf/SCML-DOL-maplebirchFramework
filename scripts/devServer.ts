import { existsSync, readdirSync } from 'fs';
import type { RspackOptions } from '@rspack/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createZip } from './zip';

export function devServerConfig(modFilename: string): RspackOptions {
  if (!existsSync('./game/Degrees of Lewdity.html')) return {};

  const modListHandler = (_req: IncomingMessage, res: ServerResponse) => {
    const mods = existsSync('./game/mods')
      ? readdirSync('./game/mods')
          .filter(f => f.endsWith('.zip'))
          .map(f => `/mods/${f}`)
      : [];
    const modI18N = mods.find(m => m.includes('ModI18N'));
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify([...(modI18N ? [modI18N] : []), ...mods.filter(m => !m.includes('ModI18N')), `/${modFilename}`]));
  };

  const modZipHandler = async (_req: IncomingMessage, res: ServerResponse) => {
    try {
      const zip = await createZip(process.cwd());
      res.writeHead(200, { 'Content-Type': 'application/zip' }).end(zip);
    } catch (err) {
      console.error('Error creating zip:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' }).end('Internal Server Error');
    }
  };

  return {
    devServer: {
      port: 1451,
      open: true,
      liveReload: false,
      hot: false,
      static: {
        directory: 'game',
        staticOptions: { index: 'Degrees of Lewdity.html' }
      },
      devMiddleware: {
        writeToDisk: true
      },
      setupMiddlewares: (middlewares, devServer) => {
        if (!devServer) throw new Error('@rspack/dev-server is not defined');
        devServer.app?.get('/modList.json', modListHandler);
        devServer.app?.get(`/${modFilename}`, modZipHandler);
        return middlewares;
      }
    }
  };
}
