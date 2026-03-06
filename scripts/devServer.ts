import { existsSync, readdirSync } from 'fs';
import type { RspackOptions } from '@rspack/core';
import { createZip } from './zip';

export function devServerConfig(modFilename: string): RspackOptions {
  if (!existsSync('./game/Degrees of Lewdity.html')) return {};

  const modListHandler = () => (_req: any, res: any) => {
    const mods = existsSync('./game/mods')
      ? readdirSync('./game/mods')
          .filter(f => f.endsWith('.zip'))
          .map(f => `/mods/${f}`)
      : [];

    const modI18N = mods.find(m => m.includes('ModI18N'));

    res.json([...(modI18N ? [modI18N] : []), ...mods.filter(m => !m.includes('ModI18N')), `/${modFilename}`]);
  };

  const modZipHandler = () => async (_req: any, res: any) => {
    try {
      const zip = await createZip(process.cwd());
      res.send(zip);
    } catch (err) {
      console.error('Error creating zip:', err);
      res.status(500).send('Internal Server Error');
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
        devServer.app?.get('/modList.json', modListHandler());
        devServer.app?.get(`/${modFilename}`, modZipHandler());
        return middlewares;
      }
    }
  };
}
