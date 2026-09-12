import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateTypesPackage } from '../scripts/types';

let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), 'maplebirch-types-test-'));
  await mkdir(path.join(rootDir, 'dist'));
  await mkdir(path.join(rootDir, 'packages', 'types'), { recursive: true });
  await writeFile(path.join(rootDir, 'package.json'), JSON.stringify({ version: '5.0.0' }));
  await writeFile(path.join(rootDir, 'dist', 'maplebirch.d.ts'), "import { Passage } from './passage.js';\nexport declare const passage: PassageAPI$1;\n");
  await writeFile(
    path.join(rootDir, 'packages', 'types', 'package.json'),
    JSON.stringify({
      name: '@scml-dol-maplebirch/types',
      version: '4.3.0',
      description: 'Maintained package metadata'
    })
  );
  await writeFile(path.join(rootDir, 'packages', 'types', 'README.md'), '# Maintained README\n');
  await writeFile(path.join(rootDir, 'packages', 'types', 'index.d.ts'), 'export type Maintained = true;\n');
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

describe('types package generation', () => {
  test('updates generated declarations and version without replacing maintained package sources', async () => {
    await generateTypesPackage(rootDir);

    const packageJson = JSON.parse(await readFile(path.join(rootDir, 'packages', 'types', 'package.json'), 'utf8')) as { name: string; version: string; description: string };

    expect(packageJson).toEqual({
      name: '@scml-dol-maplebirch/types',
      version: '5.0.0',
      description: 'Maintained package metadata'
    });
    expect(await readFile(path.join(rootDir, 'packages', 'types', 'maplebirch.d.ts'), 'utf8')).toBe('export declare const passage: PassageAPI;\n');
    expect(await readFile(path.join(rootDir, 'packages', 'types', 'README.md'), 'utf8')).toBe('# Maintained README\n');
    expect(await readFile(path.join(rootDir, 'packages', 'types', 'index.d.ts'), 'utf8')).toBe('export type Maintained = true;\n');
  });

  test('rejects a root package without an explicit version', async () => {
    await writeFile(path.join(rootDir, 'package.json'), '{}');

    await expect(generateTypesPackage(rootDir)).rejects.toThrow('Root package.json must declare a version');
  });

  test('keeps the published package and workflow on the organization scope', async () => {
    const projectRoot = path.join(import.meta.dir, '..');
    const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'packages', 'types', 'package.json'), 'utf8')) as { name: string; exports?: Record<string, unknown> };
    const readme = await readFile(path.join(projectRoot, 'packages', 'types', 'README.md'), 'utf8');
    const entry = await readFile(path.join(projectRoot, 'packages', 'types', 'index.d.ts'), 'utf8');
    const workflow = await readFile(path.join(projectRoot, '.github', 'workflows', 'publish-types.yml'), 'utf8');

    expect(packageJson.name).toBe('@scml-dol-maplebirch/types');
    expect(packageJson.exports).toEqual({ '.': { types: './index.d.ts' } });
    expect(readme).toContain('npm install --save-dev @scml-dol-maplebirch/types');
    expect(entry).toContain("function clone(...args: Parameters<Utils['clone']>)");
    expect(entry).not.toContain("const clone: Utils['clone']");
    expect(workflow).toContain('npm view "@scml-dol-maplebirch/types@$VERSION"');
    expect(workflow).not.toContain('@scml-maplebirch/types');
  });
});
