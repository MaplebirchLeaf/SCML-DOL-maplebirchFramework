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

export async function createZip(rootDir: string): Promise<Buffer> {
  const distDir = path.join(rootDir, 'dist');
  const publicDir = path.join(rootDir, 'public');

  const pkg = await readPackageJSON(rootDir);
  if (!pkg?.version) throw new Error('package.json 中缺少 version');
  const scml = (pkg as { scml?: ScmlConfig }).scml;
  if (!scml) throw new Error('package.json 中缺少 scml 配置');

  const zip = new AdmZip();
  const styleFiles: string[] = [];
  const additionFiles: string[] = [];

  for (const file of ['inject_early.js', 'maplebirch.d.ts']) {
    try {
      const buf = await readFile(path.join(distDir, file));
      zip.addFile(`dist/${file}`, buf);
    } catch {
      console.warn(`警告: 找不到文件 ${file}，跳过`);
    }
  }

  const readmePath = path.join(rootDir, 'README.md');
  zip.addFile('README.md', await readFile(readmePath));
  additionFiles.push('README.md');
  const additionExt = new Set(['.yaml', '.yml', '.json']);
  async function addPublic(dir: string, base = ''): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = path.join(base, e.name).replace(/\\/g, '/');

      if (e.isDirectory()) {
        await addPublic(full, rel);
        continue;
      }

      const buf = await readFile(full);
      if (rel.endsWith('.css')) styleFiles.push(rel);
      if ([...additionExt].some(ext => rel.endsWith(ext))) additionFiles.push(rel);

      zip.addFile(rel, buf);
    }
  }

  await addPublic(publicDir);

  const boot = {
    name: pkg.name,
    nickName: scml.nickName,
    alias: scml.alias,
    version: pkg.version,
    styleFileList: styleFiles,
    tweeFileList: [],
    imgFileList: [],
    scriptFileList: scml.scriptFileList,
    scriptFileList_inject_early: ['dist/inject_early.js'],
    scriptFileList_earlyload: [],
    scriptFileList_preload: [],
    additionFile: additionFiles,
    additionBinaryFile: [],
    additionDir: [],
    addonPlugin: [],
    dependenceInfo: scml.dependenceInfo
  };

  zip.addFile('boot.json', Buffer.from(JSON.stringify(boot, null, 2)));
  return zip.toBuffer();
}
