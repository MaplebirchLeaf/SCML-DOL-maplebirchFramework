import type { Configuration } from '@rspack/core';

export function production(rspack: typeof import('@rspack/core').rspack): Partial<Configuration> {
  return {
    optimization: {
      minimize: true,
      minimizer: [
        new rspack.SwcJsMinimizerRspackPlugin({
          minimizerOptions: {
            compress: {
              passes: 3
            },
            format: {
              comments: false
            },
            mangle: {
              keep_classnames: true,
              keep_fnames: true,
              toplevel: true,
            },
            ecma: 2022,
          },
        }),
      ],
      usedExports: true,
      sideEffects: true,
      concatenateModules: true,
    },
  };
}