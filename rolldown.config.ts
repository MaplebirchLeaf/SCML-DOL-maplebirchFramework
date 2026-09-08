import { defineConfig } from 'rolldown';
import { dts } from 'rolldown-plugin-dts';

export default defineConfig({
  input: {
    maplebirch: 'src/main.ts'
  },

  external: [/^@scml\//, /^@types\//, 'howler', 'js-yaml', 'marked', 'twine-sugarcube'],

  plugins: [
    dts({
      generator: 'tsgo',
      emitDtsOnly: true,
      tsconfig: './tsconfig.types.json',
      sourcemap: false
    })
  ],

  output: {
    dir: 'dist',
    format: 'es',
    codeSplitting: false,
    cleanDir: false
  }
});
