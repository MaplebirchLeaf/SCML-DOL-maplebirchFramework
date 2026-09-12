import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { createModPackage } from '../scripts/package';
import { createZip } from '../scripts/zip';

let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), 'maplebirch-package-test-'));
  await mkdir(path.join(rootDir, 'dist'));
  await writeFile(
    path.join(rootDir, 'package.json'),
    JSON.stringify({
      name: 'maplebirch',
      version: '1.0.0',
      scml: {
        nickName: { en: 'Test', cn: '测试' },
        alias: [],
        dependenceInfo: [{ modName: 'GameVersion', version: '>=0.5.12.10' }]
      }
    })
  );
  await writeFile(path.join(rootDir, 'README.md'), '# Package fixture');
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

describe('mod packaging', () => {
  test('rejects a missing runtime entry without writing package artifacts', async () => {
    await expect(createModPackage(rootDir)).rejects.toThrow('inject_early.js');
    expect(await readdir(path.join(rootDir, 'package'))).toEqual([]);
  });

  test('rejects an unreadable runtime entry', async () => {
    await mkdir(path.join(rootDir, 'dist', 'inject_early.js'));
    await expect(createZip(rootDir)).rejects.toThrow();
  });

  test('includes the runtime referenced by boot.json when optional types are absent', async () => {
    const runtime = 'window.maplebirch = {};';
    await writeFile(path.join(rootDir, 'dist', 'inject_early.js'), runtime);

    const zip = new AdmZip(await createZip(rootDir));
    const boot = JSON.parse(zip.readAsText('boot.json')) as { scriptFileList_inject_early: string[] };

    expect(boot.scriptFileList_inject_early).toEqual(['dist/inject_early.js']);
    expect(zip.readAsText(boot.scriptFileList_inject_early[0])).toBe(runtime);
    expect(zip.getEntry('dist/maplebirch.d.ts')).toBeNull();
  });

  test('includes optional type declarations when available', async () => {
    const declarations = 'declare const maplebirch: object;';
    await writeFile(path.join(rootDir, 'dist', 'inject_early.js'), 'window.maplebirch = {};');
    await writeFile(path.join(rootDir, 'dist', 'maplebirch.d.ts'), declarations);

    const zip = new AdmZip(await createZip(rootDir));

    expect(zip.readAsText('dist/maplebirch.d.ts')).toBe(declarations);
  });
});
