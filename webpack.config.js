const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
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
      extensions: ['.ts', '.js'],
      alias: { 
        '@': path.resolve(__dirname, 'src'),
        'lodash-es': 'lodash-es',
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              presets: [
                ['@babel/preset-env', { 
                  targets: "> 0.5%, not dead, not ie 11",
                  useBuiltIns: 'entry',
                  corejs: 3,
                  modules: false
                }],
                '@babel/preset-typescript'
              ],
            }
          }
        }
      ]
    },
    optimization: isProduction ? {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              passes: 3,
              drop_debugger: true,
              pure_getters: true,
              reduce_vars: true,
              collapse_vars: true,
              dead_code: true,
              unused: true,
              evaluate: true,
            },
            mangle: { 
              toplevel: true,
              keep_classnames: /^[^_]/,
              properties: {
                regex: /^_/,
                reserved: []
              }
            },
            format: {
              comments: false,
              ascii_only: true,
              beautify: false,
              wrap_iife: true,
              keep_quoted_props: true
            },
            ecma: 2022
          },
          parallel: true,
          extractComments: false
        })
      ],
      usedExports: true,
      sideEffects: true,
      concatenateModules: true,
    } : {},
    performance: {
      hints: false,
      maxEntrypointSize: 2 * 1024 * 1024,
      maxAssetSize: 2 * 1024 * 1024
    }
  };
};