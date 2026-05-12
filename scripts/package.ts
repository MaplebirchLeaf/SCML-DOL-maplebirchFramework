import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { readPackageJSON } from 'pkg-types';
import { createZip } from './zip';

async function createModPackage() {
  const rootDir = path.join(import.meta.dir, '..');
  const packageDir = path.join(rootDir, 'package');
  await mkdir(packageDir, { recursive: true });

  const pkg = await readPackageJSON(rootDir);
  const gameVersion = pkg.scml.dependenceInfo.find((dep: { modName: string }) => dep.modName === 'GameVersion').version.match(/\d+(\.\d+)*/)?.[0];
  const baseName = `maplebirch-${gameVersion}-v${pkg.version}`;
  const zipPath = path.join(packageDir, `${baseName}.mod.zip`);
  const zipBuffer = await createZip(rootDir);

  await Bun.write(zipPath, zipBuffer);
  console.log(`Zip package generated: ${zipPath}`);
}

createModPackage().catch(error => {
  console.error(error);
  process.exit(1);
});
