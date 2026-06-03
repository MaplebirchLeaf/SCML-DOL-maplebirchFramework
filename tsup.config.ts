import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    maplebirch: 'src/main.ts'
  },
  outDir: 'dist',
  format: ['esm'],
  dts: {
    only: true,
    compilerOptions: {
      ignoreDeprecations: '6.0'
    }
  },
  tsconfig: 'tsconfig.json'
});
