import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { readPackageJSON } from 'pkg-types';
import AdmZip from 'adm-zip';

interface ScmlConfig {
  name: string;
  nickName: { en: string; cn: string };
  alias: string[];
  scriptFileList: string[];
  dependenceInfo: Array<{ modName: string; version: string }>;
}

export async function createZip(rootDir: string) {
  const distDir = path.join(rootDir, 'dist');
  const publicDir = path.join(rootDir, 'public');

  const pkg = await readPackageJSON(rootDir);
  if (!pkg?.version) throw new Error('package.json 中缺少 version');
  const scml = (pkg as { scml?: ScmlConfig }).scml;
  if (!scml) throw new Error('package.json 中缺少 scml 配置');

  const zip = new AdmZip();
  const styleFiles: string[] = [];
  const additionFiles: string[] = [];

  const distFiles = ['inject_early.js', 'maplebirch.d.ts'];
  for (const file of distFiles) {
    try {
      zip.addFile(file, await readFile(path.join(distDir, file)));
    } catch {
      console.warn(`警告: 找不到文件 ${file}，跳过`);
    }
  }

  async function addPublicFilesToZip(currentPath: string, basePath = '') {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        await addPublicFilesToZip(fullPath, relativePath);
      } else {
        const normalizedPath = relativePath.replace(/\\/g, '/');
        const fileContent = await readFile(fullPath);

        if (normalizedPath.endsWith('.css')) {
          styleFiles.push(normalizedPath);
        } else if (normalizedPath.endsWith('.yaml') || normalizedPath.endsWith('.json')) {
          additionFiles.push(normalizedPath);
        }

        zip.addFile(normalizedPath, fileContent);
      }
    }
  }

  await addPublicFilesToZip(publicDir);

  const boot = {
    name: pkg.name,
    nickName: scml.nickName,
    alias: scml.alias,
    version: pkg.version,
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

  zip.addFile('boot.json', Buffer.from(JSON.stringify(boot, null, 2)));
  return zip.toBuffer();
}
