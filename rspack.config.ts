import path from 'path';
import { rspack } from '@rspack/core';
import type { Configuration } from '@rspack/core';
<<<<<<< HEAD
import { production } from './scripts/production';
=======
>>>>>>> 11f091a6af963002e33cded9527680448f073973

export default (env: unknown, argv: { mode?: string }): Configuration => {
  const isProduction = argv.mode === 'production';

<<<<<<< HEAD
  const config: Configuration = {
=======
  return {
>>>>>>> 11f091a6af963002e33cded9527680448f073973
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
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'lodash-es': 'lodash-es',
      },
    },
    module: {
      rules: [
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
<<<<<<< HEAD
    performance: {
      hints: false,
=======
    optimization: isProduction
      ? {
          minimize: true,
          minimizer: [
            new rspack.SwcJsMinimizerRspackPlugin({
              minimizerOptions: {
                compress: {
                  passes: 3,
                },
                format: {
                  comments: false,
                },
                mangle: true,
                ecma: 2022,
              },
            }),
          ],
          usedExports: true,
          sideEffects: true,
          concatenateModules: true,
        }
      : {},
    performance: {
      hints: false,
      maxEntrypointSize: 2 * 1024 * 1024,
      maxAssetSize: 2 * 1024 * 1024,
>>>>>>> 11f091a6af963002e33cded9527680448f073973
    },
    plugins: [
      new rspack.CopyRspackPlugin({
        patterns: [{ from: 'public' }],
      }),
    ],
  };
<<<<<<< HEAD

  if (isProduction) {
    return {
      ...config,
      ...production(rspack),
    };
  }

  return config;
};
=======
};
>>>>>>> 11f091a6af963002e33cded9527680448f073973
