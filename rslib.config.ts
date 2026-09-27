import path from 'node:path';
import { defineConfig } from '@rslib/core';

const rootDir = import.meta.dirname;

export default defineConfig({
  lib: [
    {
      id: 'maplebirch',
      format: 'iife',
      bundle: true,
      autoExtension: false,
      dts: true
    }
  ],
  source: {
    entry: {
      maplebirch: './src/index.ts'
    },
    assetsInclude: [/\.twee$/, /\.ya?ml$/],
    tsconfigPath: './tsconfig.types.json'
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src')
    },
    aliasStrategy: 'prefer-alias'
  },
  output: {
    target: 'web',
    distPath: {
      root: 'dist',
      js: './'
    },
    filename: {
      js: 'inject_early.js'
    },
    filenameHash: false,
    cleanDistPath: true,
    sourceMap: false,
    legalComments: 'none',
    overrideBrowserslist: ['> 0.5%', 'not dead', 'not ie 11'],
    minify: {
      js: true,
      css: false,
      jsOptions: {
        minimizerOptions: {
          compress: {
            passes: 3
          },
          format: {
            comments: false
          },
          mangle: {
            keep_classnames: true,
            toplevel: true
          },
          ecma: 2022
        }
      }
    }
  },
  tools: {
    rspack(config) {
      config.output ??= {};
      config.output.library = {
        name: 'maplebirch',
        type: 'window',
        export: 'default'
      };
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: true,
        concatenateModules: true
      };
      config.performance = {
        ...config.performance,
        hints: false
      };
    }
  }
});
