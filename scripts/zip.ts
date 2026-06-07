import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { readPackageJSON } from 'pkg-types';
import AdmZip from 'adm-zip';

interface ScmlConfig {
  name: string;
  nickName: { en: string; cn: string };
  alias: string[];
  dependenceInfo: Array<{ modName: string; version: string }>;
}

export interface PackageInfo {
  name: string;
  version: string;
  gameVersion: string;
  baseName: string;
}

export interface PackageAsset {
  fileName: string;
  buffer: Buffer;
}

export async function resolvePackageInfo(rootDir: string): Promise<PackageInfo> {
  const pkg = await readPackageJSON(rootDir);
  if (!pkg?.name) throw new Error('package.json missing name');
  if (!pkg?.version) throw new Error('package.json missing version');

  const gameVersion = pkg.scml.dependenceInfo.find((dep: { modName: string }) => dep.modName === 'GameVersion').version.match(/\d+(\.\d+)*/)?.[0];
  if (!gameVersion) throw new Error('package.json scml.dependenceInfo missing GameVersion');

  return {
    name: pkg.name,
    version: pkg.version,
    gameVersion,
    baseName: `maplebirch-${gameVersion}-v${pkg.version}`
  };
}

export function devZipFileName(name: string, version: string): string {
  return `${name}-${version}.mod.zip`;
}

export async function createZip(rootDir: string): Promise<Buffer> {
  const distDir = path.join(rootDir, 'dist');

  const pkg = await readPackageJSON(rootDir);
  if (!pkg?.version) throw new Error('package.json 中缺少 version');
  const scml = (pkg as { scml?: ScmlConfig }).scml;
  if (!scml) throw new Error('package.json 中缺少 scml 配置');

  const zip = new AdmZip();
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
  const boot = {
    name: pkg.name,
    nickName: scml.nickName,
    alias: scml.alias,
    version: pkg.version,
    styleFileList: [],
    tweeFileList: [],
    imgFileList: [],
    scriptFileList: [],
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

export async function createZipPackage(rootDir: string): Promise<PackageAsset> {
  const info = await resolvePackageInfo(rootDir);
  return {
    fileName: `${info.baseName}.mod.zip`,
    buffer: await createZip(rootDir)
  };
}
