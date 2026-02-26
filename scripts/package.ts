import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { readPackageJSON } from 'pkg-types';
import { createZip } from './zip';

async function createModPackage() {
  const rootDir = path.join(import.meta.dir, '..');

  const packageDir = path.join(rootDir, 'package');
  await mkdir(packageDir, { recursive: true });
  const pkg = await readPackageJSON(rootDir);
  const gameVersion = pkg.scml.dependenceInfo.find((dep: { modName: string }) => dep.modName === 'GameVersion').version;

  const zipPath = path.join(packageDir, `maplebirch-${gameVersion}-v${pkg.version}.mod.zip`);

  const zipBuffer = await createZip(rootDir);

  await Bun.write(zipPath, zipBuffer);

  console.log(`✓ 压缩包已生成: ${zipPath}`);
}

createModPackage().catch(console.error);
