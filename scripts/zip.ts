import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { readPackageJSON } from 'pkg-types';
import AdmZip from 'adm-zip';
import { collectThirdPartyNotices } from './notices';

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

  const scml = pkg.scml as ScmlConfig | undefined;
  const gameVersion = scml?.dependenceInfo?.find(dep => dep.modName === 'GameVersion')?.version.match(/\d+(\.\d+)*/)?.[0];
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

async function packageFiles(rootDir: string): Promise<Map<string, Buffer>> {
  const distDir = path.join(rootDir, 'dist');

  const pkg = await readPackageJSON(rootDir);
  if (!pkg?.version) throw new Error('package.json 中缺少 version');
  const scml = (pkg as { scml?: ScmlConfig }).scml;
  if (!scml) throw new Error('package.json 中缺少 scml 配置');

  const additionFiles = ['LICENSE', 'LICENSE-CC-BY-NC-SA-4.0', 'README.md', 'THIRD_PARTY_NOTICES'];
  const notices = await readFile(path.join(rootDir, 'THIRD_PARTY_NOTICES'));
  if (!notices.equals(Buffer.from(await collectThirdPartyNotices(rootDir)))) throw new Error('THIRD_PARTY_NOTICES is outdated; run bun run notices');
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

  return new Map([
    ['LICENSE', await readFile(path.join(rootDir, 'LICENSE'))],
    ['LICENSE-CC-BY-NC-SA-4.0', await readFile(path.join(rootDir, 'LICENSE-CC-BY-NC-SA-4.0'))],
    ['README.md', await readFile(path.join(rootDir, 'README.md'))],
    ['THIRD_PARTY_NOTICES', notices],
    ['boot.json', Buffer.from(JSON.stringify(boot, null, 2))],
    ['dist/inject_early.js', await readFile(path.join(distDir, 'inject_early.js'))],
    ['dist/maplebirch.d.ts', await readFile(path.join(distDir, 'maplebirch.d.ts'))]
  ]);
}

export async function createZip(rootDir: string): Promise<Buffer> {
  const files = await packageFiles(rootDir);
  const zip = new AdmZip();
  for (const [name, data] of [...files].sort(([first], [second]) => first.localeCompare(second, 'en'))) zip.addFile(name, data);
  for (const entry of zip.getEntries()) entry.header.time = new Date(1980, 0, 1);
  return zip.toBuffer();
}

export async function verifyZip(rootDir: string, archive: Buffer): Promise<void> {
  const files = await packageFiles(rootDir);
  const entries = new AdmZip(archive).getEntries();
  const actual = entries.map(entry => entry.entryName);
  const expected = [...files.keys()].sort((first, second) => first.localeCompare(second, 'en'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`ZIP contents mismatch: expected ${expected.join(', ')}, got ${actual.join(', ')}`);
  for (const entry of entries) {
    if (!files.get(entry.entryName)!.equals(entry.getData())) throw new Error(`ZIP file differs from source: ${entry.entryName}`);
  }
}

export async function createZipPackage(rootDir: string): Promise<PackageAsset> {
  const info = await resolvePackageInfo(rootDir);
  return {
    fileName: `${info.baseName}.mod.zip`,
    buffer: await createZip(rootDir)
  };
}
