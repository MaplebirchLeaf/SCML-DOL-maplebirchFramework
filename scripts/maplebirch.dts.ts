// scripts/maplebirch.dts.ts

import { mkdir, writeFile } from "node:fs/promises";
import { generateDtsBundle } from "dts-bundle-generator";

async function main() {
  await mkdir("./dist", { recursive: true });

  try {
    const [result] = generateDtsBundle([
      {
        filePath: "./src/main.ts",
        output: {
          noBanner: true,
          sortNodes: true,
        },
      },
    ]);

    await writeFile("./dist/maplebirch.d.ts", result, "utf8");
    console.log("✓ Type definitions generated successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Failed to generate type definitions:", message);
    process.exit(1);
  }
}

main();
