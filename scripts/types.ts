import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

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

function normalizeDeclarations(content: string): string {
  return content
    .replace(
      /^import\s*\{[^}]*\}\s*from\s*'\.\/(passage|dialog|state|save|wikifier|macro|config|engine|util|browser|story|setting|simpleaudio|uibar|ui|fullscreen|has|l10n|links|loadscreen|scripting|simplestore|template|visibility|debugbar|idb|alert|version|jquery-shim)\.js';\r?\n/gm,
      ''
    )
    .replace(/PassageAPI\$1/g, 'PassageAPI')
    .replace(/DialogAPI\$1/g, 'DialogAPI');
}

export async function generateTypesPackage(rootDir: string = defaultRootDir): Promise<void> {
  const distTypes = path.join(rootDir, 'dist', 'maplebirch.d.ts');
  const packageDir = path.join(rootDir, 'packages', 'types');
  const packageJsonPath = path.join(packageDir, 'package.json');
  const version = await readRootVersion(rootDir);
  const declarations = normalizeDeclarations(await readFile(distTypes, 'utf8'));
  const typesPackage = await readJson<TypesPackage>(packageJsonPath);

  typesPackage.version = version;

  await Promise.all([writeFile(distTypes, declarations), writeFile(path.join(packageDir, 'maplebirch.d.ts'), declarations), writeFile(packageJsonPath, `${JSON.stringify(typesPackage, null, 2)}\n`)]);

  console.log(`Types package generated: ${path.relative(rootDir, packageDir)}`);
}

if (import.meta.main) {
  generateTypesPackage().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
