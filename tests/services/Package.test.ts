import { afterEach, describe, expect, test } from 'bun:test';
import AdmZip from 'adm-zip';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { collectThirdPartyNotices } from '../../scripts/notices';
import { createModPackage } from '../../scripts/package';
import { verifyPackage } from '../../scripts/verify-package';
import { createZip, verifyZip } from '../../scripts/zip';
import { generateTypesPackage } from '../../scripts/types';

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'maplebirch-package-'));
  roots.push(root);
  await mkdir(path.join(root, 'dist'));
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'maplebirch',
      version: '1.2.3',
      dependencies: { zeta: '1.0.0', alpha: '2.0.0' },
      scml: { nickName: { en: 'Test', cn: '测试' }, alias: [], dependenceInfo: [{ modName: 'GameVersion', version: '0.5.0' }] }
    })
  );
  await writeFile(path.join(root, 'README.md'), 'Readme\n');
  await writeFile(path.join(root, 'LICENSE'), 'MIT project license\n');
  await writeFile(path.join(root, 'LICENSE-CC-BY-NC-SA-4.0'), 'Creative Commons project license\n');
  await writeFile(path.join(root, 'dist', 'inject_early.js'), 'window.test = true;\n');
  await writeFile(path.join(root, 'dist', 'maplebirch.d.ts'), 'declare const test: true;\n');
  await dependency(root, 'zeta', '1.0.0', { gamma: '3.0.0' });
  await dependency(root, 'alpha', '2.0.0');
  await dependency(root, 'gamma', '3.0.0');
  await writeFile(path.join(root, 'THIRD_PARTY_NOTICES'), await collectThirdPartyNotices(root));
  return root;
}

async function dependency(root: string, name: string, version: string, dependencies: Record<string, string> = {}): Promise<void> {
  const directory = path.join(root, 'node_modules', name);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'package.json'), JSON.stringify({ name, version, license: 'MIT', dependencies }));
  await writeFile(path.join(directory, 'LICENSE'), `${name} license\n`);
}

describe('package licenses', () => {
  test('copies both project licenses into the published type package', async () => {
    const root = await fixture();
    const packageDir = path.join(root, 'packages', 'types');
    await mkdir(packageDir, { recursive: true });
    await writeFile(path.join(packageDir, 'package.json'), JSON.stringify({ name: '@example/types', version: '0.0.0' }));
    await generateTypesPackage(root);
    for (const name of ['LICENSE', 'LICENSE-CC-BY-NC-SA-4.0']) {
      expect(await readFile(path.join(packageDir, name))).toEqual(await readFile(path.join(root, name)));
    }
  });

  test('collects direct and transitive runtime license texts in stable name order', async () => {
    const root = await fixture();
    const notices = await collectThirdPartyNotices(root);
    expect(notices.indexOf('alpha@2.0.0')).toBeLessThan(notices.indexOf('gamma@3.0.0'));
    expect(notices.indexOf('gamma@3.0.0')).toBeLessThan(notices.indexOf('zeta@1.0.0'));
    expect(notices).toContain('alpha license');
    expect(notices).toContain('gamma license');
    expect(await collectThirdPartyNotices(root)).toBe(notices);
  });

  test('fails when a runtime dependency has no distributable license text', async () => {
    const root = await fixture();
    await rm(path.join(root, 'node_modules', 'gamma', 'LICENSE'));
    await expect(collectThirdPartyNotices(root)).rejects.toThrow('gamma');
  });

  test('refuses to package a stale notice file', async () => {
    const root = await fixture();
    await writeFile(path.join(root, 'THIRD_PARTY_NOTICES'), 'outdated');
    await expect(createZip(root)).rejects.toThrow('THIRD_PARTY_NOTICES');
  });

  test('creates a deterministic ZIP with exact contents and verifies the final archive', async () => {
    const root = await fixture();
    const first = await createZip(root);
    const second = await createZip(root);
    expect(first.equals(second)).toBe(true);
    await expect(verifyZip(root, first)).resolves.toBeUndefined();
    const zip = new AdmZip(first);
    expect(zip.getEntries().map(entry => entry.entryName)).toEqual([
      'boot.json',
      'dist/inject_early.js',
      'dist/maplebirch.d.ts',
      'LICENSE',
      'LICENSE-CC-BY-NC-SA-4.0',
      'README.md',
      'THIRD_PARTY_NOTICES'
    ]);
    expect(zip.readAsText('THIRD_PARTY_NOTICES')).toBe(await collectThirdPartyNotices(root));
    const boot = JSON.parse(zip.readAsText('boot.json')) as { additionFile: string[] };
    expect(boot.additionFile).toEqual(['LICENSE', 'LICENSE-CC-BY-NC-SA-4.0', 'README.md', 'THIRD_PARTY_NOTICES']);

    zip.deleteFile('LICENSE');
    await expect(verifyZip(root, zip.toBuffer())).rejects.toThrow('LICENSE');
  });

  test('does not silently omit required declaration files', async () => {
    const root = await fixture();
    await rm(path.join(root, 'dist', 'maplebirch.d.ts'));
    await expect(createZip(root)).rejects.toThrow('maplebirch.d.ts');
    expect(await readFile(path.join(root, 'LICENSE'), 'utf8')).toContain('MIT');
  });

  test('validates the ZIP written to disk and rejects a modified archive', async () => {
    const root = await fixture();
    await createModPackage(root, { force: true, zip: true, modpack: false });
    await expect(verifyPackage(root)).resolves.toBeUndefined();
    const file = path.join(root, 'package', 'maplebirch-0.5.0-v1.2.3.mod.zip');
    const zip = new AdmZip(await readFile(file));
    zip.deleteFile('README.md');
    await writeFile(file, zip.toBuffer());
    await expect(verifyPackage(root)).rejects.toThrow('README.md');
  });

  test('packages only the ZIP by default', async () => {
    const root = await fixture();
    await createModPackage(root);
    expect(await readdir(path.join(root, 'package'))).toEqual(['maplebirch-0.5.0-v1.2.3.mod.zip']);
  });

  test('produces identical ZIP bytes in different time zones', async () => {
    const root = await fixture();
    const projectRoot = path.join(import.meta.dir, '..', '..');
    const build = (zone: string) =>
      Bun.spawnSync({
        cmd: [
          process.execPath,
          '-e',
          'import { createZip } from "./scripts/zip.ts"; import { createHash } from "node:crypto"; console.log(createHash("sha256").update(await createZip(process.env.MAPLEBIRCH_TEST_ROOT!)).digest("hex"))'
        ],
        cwd: projectRoot,
        env: { ...process.env, TZ: zone, MAPLEBIRCH_TEST_ROOT: root }
      });
    const utc = build('UTC');
    const shanghai = build('Asia/Shanghai');
    expect(utc.exitCode).toBe(0);
    expect(shanghai.exitCode).toBe(0);
    expect(utc.stdout.toString()).toBe(shanghai.stdout.toString());
  });
});
