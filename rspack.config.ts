import path from 'path';
import { rspack, type Configuration } from '@rspack/core';
import { defineConfig } from '@rspack/cli';
import { name, version } from './package.json';
import { production } from './scripts/production';
import { devServerConfig } from './scripts/devServer';

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
              jsc: { parser: { syntax: 'typescript' } },
              env: { targets: '> 0.5%, not dead, not ie 11' }
            }
          },
          type: 'javascript/auto'
        }
      ]
    },
    performance: { hints: false }
  };
}

export default (_env: unknown, argv: { mode?: string }): Configuration => {
  const isProduction = argv.mode === 'production';

  const config: Configuration = {
    ...commonConfig(isProduction),
    ...devServerConfig(modFilename)
  };

  return isProduction ? { ...config, ...production(rspack) } : defineConfig(config);
};
