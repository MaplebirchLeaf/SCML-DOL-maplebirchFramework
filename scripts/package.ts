import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { readPackageJSON } from 'pkg-types';
import { createZip } from './zip';

async function createModPackage() {
  const rootDir = path.join(import.meta.dir, '..');

  const packageDir = path.join(rootDir, 'package');
  await mkdir(packageDir, { recursive: true });
  const pkg = await readPackageJSON(rootDir);

  const zipPath = path.join(packageDir, `SCML-maplebirchFrameworks-${pkg.version}.zip`);

  const zipBuffer = await createZip(rootDir);

  await Bun.write(zipPath, zipBuffer);

  console.log(`✓ 压缩包已生成: ${zipPath}`);
}

createModPackage().catch(console.error);
