import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    maplebirch: "src/main.ts",
  },
  outDir: "dist",
  dts: {
    only: true,
  },
  tsconfig: "tsconfig.json",
});
