import path from "node:path";
import { mkdir, readdir, stat, readFile } from "node:fs/promises";
import JSZip from "jszip";

async function createModPackage() {
  const rootDir = path.join(import.meta.dir, "..");
  const distDir = path.join(rootDir, "dist");
  const packageDir = path.join(rootDir, "package");

  await mkdir(packageDir, { recursive: true });

  const zip = new JSZip();
  const bootTemplate = await Bun.file(path.join(rootDir, "boot.json")).json();
  const version = (bootTemplate as { version?: string }).version;

  const styleFiles: string[] = [];
  const additionFiles: string[] = [];

  async function addFilesToZip(currentPath: string) {
    const items = await readdir(currentPath);

    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const itemStat = await stat(itemPath);

      if (itemStat.isDirectory()) {
        await addFilesToZip(itemPath);
      } else {
        const relativePath = path.relative(distDir, itemPath);
        const normalizedPath = relativePath.replace(/\\/g, "/");
        const fileContent = await readFile(itemPath);

        if (normalizedPath.endsWith(".css")) {
          styleFiles.push(normalizedPath);
        } else if (
          normalizedPath.endsWith(".yaml") ||
          normalizedPath.endsWith(".json")
        ) {
          additionFiles.push(normalizedPath);
        }

        zip.file(normalizedPath, fileContent);
      }
    }
  }

  await addFilesToZip(distDir);

  const modifiedBoot = {
    ...(bootTemplate as object),
    scriptFileList_inject_early: ["inject_early.js"],
    styleFileList: styleFiles,
    additionFile: additionFiles,
  };

  zip.file("boot.json", JSON.stringify(modifiedBoot, null, 2));

  const zipBuffer = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });

  const zipPath = path.join(
    packageDir,
    `SCML-maplebirchFrameworks-${version}.zip`
  );
  await Bun.write(zipPath, zipBuffer);

  console.log(`✓ 压缩包已生成: ${zipPath}`);
}

createModPackage().catch(console.error);
