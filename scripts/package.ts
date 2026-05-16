import path from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import { createModPackPackage } from './modpack';
import { createZipPackage, type PackageAsset } from './zip';

export interface PackageOptions {
  force: boolean;
  zip: boolean;
  modpack: boolean;
}

function parseOptions(args: string[]): PackageOptions {
  const zipOnly = args.includes('--zip-only');
  const modpackOnly = args.includes('--modpack-only');
  if (zipOnly && modpackOnly) throw new Error('--zip-only and --modpack-only cannot be used together');
  return {
    force: args.includes('--force'),
    zip: !modpackOnly,
    modpack: !zipOnly
  };
}

async function isSameFile(filePath: string, buffer: Buffer): Promise<boolean> {
  try {
    const current = await readFile(filePath);
    return current.byteLength === buffer.byteLength && current.equals(buffer);
  } catch {
    return false;
  }
}

async function writeChanged(packageDir: string, asset: PackageAsset, force: boolean): Promise<'written' | 'skipped'> {
  const target = path.join(packageDir, asset.fileName);
  if (!force && (await isSameFile(target, asset.buffer))) {
    console.log(`Package unchanged: ${target}`);
    return 'skipped';
  }
  await Bun.write(target, asset.buffer);
  console.log(`Package generated: ${target}`);
  return 'written';
}

export async function createModPackage(rootDir: string, options: PackageOptions = parseOptions([])): Promise<void> {
  const packageDir = path.join(rootDir, 'package');
  await mkdir(packageDir, { recursive: true });
  const zipPackage = await createZipPackage(rootDir);
  if (options.zip) await writeChanged(packageDir, zipPackage, options.force);
  if (options.modpack) await writeChanged(packageDir, await createModPackPackage(rootDir, zipPackage.buffer), options.force);
}

if (import.meta.main) {
  createModPackage(path.join(import.meta.dir, '..'), parseOptions(Bun.argv.slice(2))).catch(error => {
    console.error(error);
    process.exit(1);
  });
}
