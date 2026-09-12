import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { createModPackage } from '../scripts/package';
import { createModPackFromZip, createModPackPackage } from '../scripts/modpack';
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

  test('writes both release formats and safely skips unchanged artifacts', async () => {
    await writeFile(path.join(rootDir, 'dist', 'inject_early.js'), 'window.maplebirch = {};');

    await createModPackage(rootDir);
    const firstFiles = (await readdir(path.join(rootDir, 'package'))).sort();
    await createModPackage(rootDir);
    const secondFiles = (await readdir(path.join(rootDir, 'package'))).sort();

    expect(firstFiles).toEqual(['maplebirch-0.5.12.10-v1.0.0.mod.zip', 'maplebirch-0.5.12.10-v1.0.0.modpack']);
    expect(secondFiles).toEqual(firstFiles);
  });

  test('honors zip-only, modpack-only, and forced package options', async () => {
    await writeFile(path.join(rootDir, 'dist', 'inject_early.js'), 'window.maplebirch = {};');

    await createModPackage(rootDir, { force: false, zip: true, modpack: false });
    expect(await readdir(path.join(rootDir, 'package'))).toEqual(['maplebirch-0.5.12.10-v1.0.0.mod.zip']);

    await createModPackage(rootDir, { force: true, zip: false, modpack: true });
    expect((await readdir(path.join(rootDir, 'package'))).sort()).toEqual(['maplebirch-0.5.12.10-v1.0.0.mod.zip', 'maplebirch-0.5.12.10-v1.0.0.modpack']);
  });
});

describe('modpack packaging', () => {
  test('rejects zip archives without boot metadata', () => {
    const zip = new AdmZip();
    zip.addFile('dist/inject_early.js', Buffer.from('runtime'));

    expect(() => createModPackFromZip('Test', zip.toBuffer())).toThrow('boot.json not found');
  });

  test('produces a deterministic block-aligned modpack with protocol offsets and checksum', () => {
    const zip = new AdmZip();
    zip.addFile('boot.json', Buffer.from('{"name":"Test"}'));
    zip.addFile('nested/data.txt', Buffer.from('data'));
    zip.addFile('empty.bin', Buffer.alloc(0));
    const input = zip.toBuffer();

    const first = createModPackFromZip('Test', input);
    const second = createModPackFromZip('Test', input);
    const view = new DataView(first.buffer, first.byteOffset, first.byteLength);

    expect(first).toEqual(second);
    expect(first.subarray(0, 16).toString()).toBe('JeremieModLoader');
    expect(first.length % 64).toBe(8);
    expect(view.getBigUint64(64, true)).toBe(128n);
    expect(view.getBigUint64(72, true)).toBeGreaterThan(128n);
    expect(view.getBigUint64(80, true) % 64n).toBe(0n);
    expect(view.getBigUint64(first.length - 8, true)).not.toBe(0n);
  });

  test('creates a named modpack package from the repository package fixture', async () => {
    await writeFile(path.join(rootDir, 'dist', 'inject_early.js'), 'window.maplebirch = {};');

    const asset = await createModPackPackage(rootDir);

    expect(asset.fileName).toBe('maplebirch-0.5.12.10-v1.0.0.modpack');
    expect(asset.buffer.subarray(0, 16).toString()).toBe('JeremieModLoader');
  });
});
