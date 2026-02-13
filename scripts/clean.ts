import path from "node:path";
import { rm } from "node:fs/promises";

async function clean() {
  const distDir = path.join(import.meta.dir, "..", "dist");
  const packageDir = path.join(import.meta.dir, "..", "package");

  try {
    await rm(distDir, { recursive: true, force: true });
    console.log("✓ dist目录已清理");
    await rm(packageDir, { recursive: true, force: true });
    console.log("✓ package目录已清理");
  } catch (err) {
    console.error("清理目录时出错:", err);
    process.exit(1);
  }
}

clean();
