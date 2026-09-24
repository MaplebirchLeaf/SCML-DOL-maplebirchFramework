import path from 'node:path';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';

interface DependencyPackage {
  name: string;
  version: string;
  license?: string;
  dependencies?: Record<string, string>;
}

function dependencyName(name: string): string {
  if (!/^(?:@[^/]+\/)?[^/.][^/]*$/.test(name) || name.includes('..')) throw new Error(`Invalid dependency name: ${name}`);
  return name;
}

async function packageDirectory(rootDir: string, parentDir: string, name: string): Promise<string> {
  for (let directory = parentDir; ; directory = path.dirname(directory)) {
    const candidate = path.join(directory, 'node_modules', dependencyName(name));
    try {
      if ((await stat(path.join(candidate, 'package.json'))).isFile()) return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if (directory === rootDir || path.dirname(directory) === directory) break;
  }
  throw new Error(`Runtime dependency not installed: ${name}`);
}

async function licenseFiles(directory: string, name: string): Promise<Array<[string, string]>> {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && /^(?:licen[sc]e|copying|notice)(?:[._-].*)?$/i.test(entry.name))
    .map(entry => entry.name)
    .sort();
  if (!entries.length) throw new Error(`Runtime dependency ${name} has no license or notice file`);
  return Promise.all(entries.map(async file => [file, (await readFile(path.join(directory, file), 'utf8')).replace(/\r\n/g, '\n').trimEnd()]));
}

export async function collectThirdPartyNotices(rootDir: string): Promise<string> {
  const root = path.resolve(rootDir);
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as DependencyPackage;
  const packages = new Map<string, { license: string; files: Array<[string, string]> }>();

  async function visit(name: string, parentDir: string): Promise<void> {
    const directory = await packageDirectory(root, parentDir, name);
    const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8')) as DependencyPackage;
    if (pkg.name !== name || !pkg.version) throw new Error(`Invalid runtime dependency metadata: ${name}`);
    const identity = `${pkg.name}@${pkg.version}`;
    if (packages.has(identity)) return;
    packages.set(identity, { license: pkg.license ?? 'SEE LICENSE FILE', files: await licenseFiles(directory, identity) });
    for (const child of Object.keys(pkg.dependencies ?? {}).sort()) await visit(child, directory);
  }

  for (const name of Object.keys(manifest.dependencies ?? {}).sort()) await visit(name, root);
  const sections = [...packages]
    .sort(([first], [second]) => (first < second ? -1 : first > second ? 1 : 0))
    .map(([identity, { license, files }]) => [`${identity} (${license})`, ...files.map(([file, content]) => `--- ${file} ---\n${content}`)].join('\n\n'));
  return `Third-party notices for Maplebirch\nGenerated from runtime dependencies; do not edit by hand.\n\n${sections.join('\n\n=====\n\n')}\n`;
}

if (import.meta.main) {
  const root = path.join(import.meta.dir, '..');
  const target = path.join(root, 'THIRD_PARTY_NOTICES');
  try {
    const content = await collectThirdPartyNotices(root);
    if (Bun.argv.includes('--check')) {
      if ((await readFile(target, 'utf8')) !== content) throw new Error('THIRD_PARTY_NOTICES is outdated; run bun run notices');
    } else {
      await writeFile(target, content);
      console.log('Updated THIRD_PARTY_NOTICES');
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
