import path from 'path';
import { rspack } from '@rspack/core';
import type { Configuration } from '@rspack/core';
import { production } from './scripts/production';

export default (env: unknown, argv: { mode?: string }): Configuration => {
  const isProduction = argv.mode === 'production';

  const config: Configuration = {
    entry: './src/main.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'inject_early.js',
      library: {
        name: 'maplebirch',
        type: 'window',
        export: 'default',
      },
    },
    devtool: isProduction ? false : 'inline-source-map',
    resolve: {
      extensions: ['.ts', '.js', '.twee'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'lodash-es': 'lodash-es',
      },
    },
    module: {
      rules: [
        {
          test: /\.twee$/,
          resourceQuery: /raw/,
          type: 'asset/source',
        },
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                },
              },
              env: {
                targets: '> 0.5%, not dead, not ie 11',
              },
            },
          },
          type: 'javascript/auto',
        },
      ],
    },
    performance: {
      hints: false,
    },
    plugins: [
      new rspack.CopyRspackPlugin({
        patterns: [{ from: 'public' }],
      }),
    ],
  };

  if (isProduction) {
    return {
      ...config,
      ...production(rspack),
    };
  }

  return config;
};
