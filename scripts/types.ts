import path from 'node:path';
import { copyFile, readFile, writeFile } from 'node:fs/promises';

interface RootPackage {
  version?: string;
}

interface TypesPackage extends Record<string, unknown> {
  version?: string;
}

const defaultRootDir = path.join(import.meta.dir, '..');

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function readRootVersion(rootDir: string): Promise<string> {
  const rootPackage = await readJson<RootPackage>(path.join(rootDir, 'package.json'));
  if (!rootPackage.version) {
    throw new Error('Root package.json must declare a version.');
  }
  return rootPackage.version;
}

export async function generateTypesPackage(rootDir: string = defaultRootDir): Promise<void> {
  const distDir = path.join(rootDir, 'dist');
  const distEntry = path.join(distDir, 'index.d.ts');
  const distTypes = path.join(distDir, 'maplebirch.d.ts');
  const templateDir = path.join(rootDir, 'scripts', 'types-package');
  const packageJsonPath = path.join(templateDir, 'package.json');
  const version = await readRootVersion(rootDir);
  const declarations = await readFile(distEntry, 'utf8');
  const typesPackage = await readJson<TypesPackage>(packageJsonPath);

  typesPackage.version = version;
  await Promise.all([
    writeFile(distTypes, declarations),
    copyFile(path.join(templateDir, 'package.d.ts'), path.join(distDir, 'package.d.ts')),
    copyFile(path.join(templateDir, 'README.md'), path.join(distDir, 'README.md')),
    copyFile(path.join(rootDir, 'LICENSE'), path.join(distDir, 'LICENSE')),
    copyFile(path.join(rootDir, 'LICENSE-CC-BY-NC-SA-4.0'), path.join(distDir, 'LICENSE-CC-BY-NC-SA-4.0')),
    writeFile(path.join(distDir, 'package.json'), `${JSON.stringify(typesPackage, null, 2)}\n`)
  ]);

  console.log(`Types package generated: ${path.relative(rootDir, distDir)}`);
}

if (import.meta.main) {
  generateTypesPackage().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
