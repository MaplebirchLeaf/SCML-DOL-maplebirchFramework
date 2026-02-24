import path from 'path';
import { rspack, type RspackOptions, type Configuration } from '@rspack/core';
import { defineConfig } from '@rspack/cli';
import { existsSync, readdirSync } from 'fs';
import { name, version } from './package.json';
import { production } from './scripts/production';
import { createZip } from './scripts/zip';

const modFilename = `${name}-${version}.mod.zip`;

function commonConfig(isProduction: boolean): Configuration {
  return {
    entry: './src/main.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'inject_early.js',
      library: {
        name: 'maplebirch',
        type: 'window',
        export: 'default'
      }
    },
    devtool: isProduction ? false : 'inline-source-map',
    resolve: {
      extensions: ['.ts', '.js', '.twee'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    module: {
      rules: [
        {
          test: /\.twee$/,
          resourceQuery: /raw/,
          type: 'asset/source'
        },
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript'
                }
              },
              env: {
                targets: '> 0.5%, not dead, not ie 11'
              }
            }
          },
          type: 'javascript/auto'
        }
      ]
    },
    performance: {
      hints: false
    }
  };
}

function devServerConfig(): RspackOptions {
  if (!existsSync('./game/index.html')) return {};

  return {
    devServer: {
      port: 5678,
      liveReload: false,
      hot: false,
      static: 'game',
      devMiddleware: {
        writeToDisk: true
      },
      setupMiddlewares: (middlewares, devServer) => {
        if (!devServer) {
          throw new Error('@rspack/dev-server is not defined');
        }

        devServer.app?.get('/modList.json', (_req: any, response: any) => {
          const mods = existsSync('./game/mods')
            ? readdirSync('./game/mods/')
                .filter(f => f.endsWith('.zip'))
                .map(f => `/mods/${f}`)
            : [];
          response.json([...mods, `/${modFilename}`]);
        });

        devServer.app?.get(`/${modFilename}`, async (_req: any, response: any) => {
          try {
            const zip = await createZip(process.cwd());
            response.send(zip);
          } catch (error) {
            console.error('Error creating zip:', error);
            response.status(500).send('Internal Server Error');
          }
        });

        return middlewares;
      }
    }
  };
}

export default (_env: unknown, argv: { mode?: string }): Configuration => {
  const isProduction = argv.mode === 'production';

  if (isProduction) {
    return {
      ...commonConfig(isProduction),
      ...devServerConfig(),
      ...production(rspack)
    };
  }
  return defineConfig({
    ...commonConfig(isProduction),
    ...devServerConfig()
  });
};
