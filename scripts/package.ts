import path from 'node:path';
import { mkdir, readdir, stat, readFile } from 'node:fs/promises';
import JSZip from 'jszip';

async function createModPackage() {
  const rootDir = path.join(import.meta.dir, '..');
  const distDir = path.join(rootDir, 'dist');
  const publicDir = path.join(rootDir, 'public');
  const packageDir = path.join(rootDir, 'package');

  await mkdir(packageDir, { recursive: true });

  const zip = new JSZip();
  const bootTemplate = await Bun.file(path.join(rootDir, 'boot.json')).json();
  const version = (bootTemplate as { version?: string }).version;

  const styleFiles: string[] = [];
  const additionFiles: string[] = [];

  const distFiles = ['inject_early.js', 'maplebirch.d.ts'];
  for (const file of distFiles) {
    const filePath = path.join(distDir, file);
    try {
      const fileContent = await readFile(filePath);
      zip.file(file, fileContent);
    } catch (error) {
      console.warn(`警告: 找不到文件 ${file}，跳过`);
    }
  }

  async function addPublicFilesToZip(currentPath: string, basePath = '') {
    const items = await readdir(currentPath);

    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const itemStat = await stat(itemPath);
      const relativePath = path.join(basePath, item);

      if (itemStat.isDirectory()) {
        await addPublicFilesToZip(itemPath, relativePath);
      } else {
        const normalizedPath = relativePath.replace(/\\/g, '/');
        const fileContent = await readFile(itemPath);

        if (normalizedPath.endsWith('.css')) {
          styleFiles.push(normalizedPath);
        } else if (normalizedPath.endsWith('.yaml') || normalizedPath.endsWith('.json')) {
          additionFiles.push(normalizedPath);
        }

        zip.file(normalizedPath, fileContent);
      }
    }
  }

  await addPublicFilesToZip(publicDir);

  const modifiedBoot = {
    ...(bootTemplate as object),
    scriptFileList_inject_early: ['inject_early.js'],
    styleFileList: styleFiles,
    additionFile: additionFiles
  };

  zip.file('boot.json', JSON.stringify(modifiedBoot, null, 2));

  const zipBuffer = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  const zipPath = path.join(packageDir, `SCML-maplebirchFrameworks-${version}.zip`);
  await Bun.write(zipPath, zipBuffer);

  console.log(`✓ 压缩包已生成: ${zipPath}`);
}

createModPackage().catch(console.error);
