import path from 'node:path';
import { mkdir, readdir, stat, readFile } from 'node:fs/promises';
import { readPackageJSON } from 'pkg-types';
import JSZip from 'jszip';

interface ScmlConfig {
  name: string;
  nickName: { en: string; cn: string };
  alias: string[];
  scriptFileList: string[];
  dependenceInfo: Array<{ modName: string; version: string }>;
}

async function createModPackage() {
  const rootDir = path.join(import.meta.dir, '..');
  const distDir = path.join(rootDir, 'dist');
  const publicDir = path.join(rootDir, 'public');
  const packageDir = path.join(rootDir, 'package');

  await mkdir(packageDir, { recursive: true });

  const pkg = await readPackageJSON(rootDir);
  if (!pkg?.version) throw new Error('package.json 中缺少 version');
  const scml = (pkg as { scml?: ScmlConfig }).scml;
  if (!scml) throw new Error('package.json 中缺少 scml 配置');

  const version = pkg.version;
  const zip = new JSZip();
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

  const boot = {
    name: scml.name,
    nickName: scml.nickName,
    alias: scml.alias,
    version,
    styleFileList: styleFiles,
    tweeFileList: [],
    imgFileList: [],
    scriptFileList: scml.scriptFileList,
    additionFile: additionFiles,
    scriptFileList_inject_early: ['inject_early.js'],
    scriptFileList_earlyload: [],
    scriptFileList_preload: [],
    additionBinaryFile: [],
    additionDir: [],
    addonPlugin: [],
    dependenceInfo: scml.dependenceInfo
  };

  zip.file('boot.json', JSON.stringify(boot, null, 2));

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
