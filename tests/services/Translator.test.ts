import './runtime';
import { expect, mock, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import jsyaml from 'js-yaml';
import type ModLoader from '../../src/host/ModLoader';
import Emitter from '../../src/infra/Emitter';
import Diagnostics from '../../src/infra/Diagnostics';
import ModI18N from '../../src/compat/ModI18N';
import type { MaplebirchCore } from '../../src/core';
import type IndexedDB from '../../src/services/IndexedDB';
mock.module('../../src/macros/index', () => ({ _language() {}, _languageSwitch() {}, _languageButton() {}, _languageLink() {}, _languageListbox() {}, _radiobuttonsfrom() {}, _overlayReplace() {} }));
const [{ default: Translator }, { default: Macros }, { Translations }] = await Promise.all([import('../../src/services/Translator'), import('../../src/macros/macros'), import('../../src/constants')]);

function fixture() {
  let active = ['base', 'override'];
  const records = new Map<string, unknown>();
  const files: Record<string, Record<string, string>> = { base: { name: 'Base' }, override: { name: 'Override' } };
  const extraFiles: Record<string, Record<string, string>> = {};
  const store = {
    async get(key: unknown) {
      return structuredClone(records.get(JSON.stringify(key)));
    },
    async put(record: { bucket: string; id: unknown }) {
      records.set(JSON.stringify([record.bucket, record.id]), structuredClone(record));
    },
    async delete(key: unknown) {
      records.delete(JSON.stringify(key));
    },
    index() {
      return {
        async getAll(bucket: string) {
          return [...records.values()].filter(record => (record as { bucket: string }).bucket === bucket).map(record => structuredClone(record));
        }
      };
    }
  };
  const modloader = {
    modUtils: { getModListNameNoAlias: () => active, getLogger: () => ({ warn() {}, error() {} }) },
    modLoader: {
      getModZip: (name: string) => ({
        zip: {
          file: (path: string) => {
            const content = extraFiles[name]?.[path] ?? (path === 'translations.json' ? JSON.stringify(files[name]) : undefined);
            return content === undefined ? null : { async: async () => content };
          }
        }
      })
    }
  } as unknown as ModLoader;
  const idb = {
    async with(_names: unknown, _mode: unknown, callback: (tx: { objectStore(): typeof store }) => unknown) {
      return callback({ objectStore: () => store });
    }
  } as unknown as IndexedDB;
  const events = { once() {} } as unknown as Emitter;
  return {
    create: () => new Translator(idb, modloader, events, () => undefined),
    idb,
    modloader,
    records,
    setFile: (modName: string, filePath: string, content: string) => {
      (extraFiles[modName] ??= {})[filePath] = content;
    },
    setActive: (names: string[]) => {
      active = names;
    }
  };
}

test('one language merges ordered files into one replaceable source snapshot', async () => {
  const { create, setFile } = fixture();
  setFile('base', 'i18n/common.yml', 'first: First\nshared: Earlier\n');
  setFile('base', 'i18n/ui.json', JSON.stringify({ second: 'Second', shared: 'Later' }));
  const manager = create();
  const progress = [];
  for await (const item of manager.importFile('base', 'EN', ['i18n/common.yml', 'i18n/ui.json'])) progress.push(item);
  expect(progress.at(-1)).toMatchObject({ type: 'complete', count: 3 });
  expect(manager.t('first')).toBe('First');
  expect(manager.t('second')).toBe('Second');
  expect(manager.t('shared')).toBe('Later');

  setFile('base', 'i18n/ui.json', JSON.stringify({ second: 'Updated' }));
  for await (const item of manager.importFile('base', 'EN', ['i18n/common.yml', 'i18n/ui.json'])) expect(item.type).not.toBe('error');
  expect(manager.t('first')).toBe('First');
  expect(manager.t('second')).toBe('Updated');
  expect(manager.t('shared')).toBe('Earlier');
});

test('a missing file does not partially replace an existing language snapshot', async () => {
  const { create, setFile } = fixture();
  setFile('base', 'i18n/common.yml', 'existing: Original\n');
  const manager = create();
  for await (const item of manager.importFile('base', 'EN', 'i18n/common.yml')) expect(item.type).not.toBe('error');
  setFile('base', 'i18n/common.yml', 'new: New\n');
  const progress = [];
  for await (const item of manager.importFile('base', 'EN', ['i18n/common.yml', 'i18n/missing.yml'])) progress.push(item);
  expect(progress.at(-1)?.type).toBe('not_found');
  expect(manager.t('existing')).toBe('Original');
  expect(manager.has('new')).toBe(false);
});

test('an invalid later file leaves the previous language snapshot intact', async () => {
  const { create, setFile } = fixture();
  setFile('base', 'i18n/a.yml', 'existing: Original\n');
  const manager = create();
  for await (const item of manager.importFile('base', 'EN', 'i18n/a.yml')) expect(item.type).not.toBe('error');
  setFile('base', 'i18n/a.yml', 'new: New\n');
  setFile('base', 'i18n/b.json', '{ invalid json');
  const progress = [];
  for await (const item of manager.importFile('base', 'EN', ['i18n/a.yml', 'i18n/b.json'])) progress.push(item);
  expect(progress.at(-1)?.type).toBe('error');
  expect(manager.t('existing')).toBe('Original');
  expect(manager.has('new')).toBe(false);
});

test('default JSON and YAML files are merged instead of replacing each other', async () => {
  const { create, setFile } = fixture();
  setFile('base', 'translations/EN.json', JSON.stringify({ jsonOnly: 'JSON', shared: 'JSON' }));
  setFile('base', 'translations/EN.yaml', 'yamlOnly: YAML\nshared: YAML\n');
  const manager = create();
  for await (const item of manager.import('base', ['EN'])) expect(item.type).not.toBe('error');
  expect(manager.t('jsonOnly')).toBe('JSON');
  expect(manager.t('yamlOnly')).toBe('YAML');
  expect(manager.t('shared')).toBe('YAML');
});

test('boot language config accepts ordered file arrays per language', async () => {
  const { idb, modloader, setFile } = fixture();
  setFile('base', 'i18n/a.yml', 'a: A\n');
  setFile('base', 'i18n/b.yml', 'b: B\n');
  setFile('base', 'i18n/cn-a.yml', 'a: 甲\n');
  setFile('base', 'i18n/cn-b.yml', 'b: 乙\n');
  let initialize: (() => void) | undefined;
  let loadLanguage: ((task: { modName: string; config: unknown }) => void | Promise<void>) | undefined;
  const events = {
    once(name: string, callback: () => void) {
      if (name === ':indexedDB') initialize = callback;
    }
  } as unknown as Emitter;
  const addon = () => ({
    hook<T>(name: string, handler: (task: { modName: string; config: T }) => void | Promise<void>) {
      if (name === 'language') loadLanguage = handler as typeof loadLanguage;
      return true;
    }
  });
  const manager = new Translator(Object.assign(idb, { define: () => true }), modloader, events, addon);
  initialize?.();
  await loadLanguage?.({ modName: 'base', config: { EN: ['i18n/a.yml', 'i18n/b.yml'], CN: { file: ['i18n/cn-a.yml', 'i18n/cn-b.yml'] } } });
  expect(manager.t('a')).toBe('A');
  expect(manager.t('b')).toBe('B');
  await manager.setLanguage('CN');
  expect(manager.t('a')).toBe('甲');
  expect(manager.t('b')).toBe('乙');
});

test('bundled translation sections merge before replacing one language snapshot', async () => {
  const bundled = Translations as Record<string, unknown>;
  const previous = bundled.EN;
  bundled.EN = ['first: First\nshared: Earlier\n', 'second: Second\nshared: Later\n'];
  try {
    const manager = fixture().create();
    await manager.preload();
    expect(manager.t('first')).toBe('First');
    expect(manager.t('second')).toBe('Second');
    expect(manager.t('shared')).toBe('Later');
  } finally {
    if (previous === undefined) delete bundled.EN;
    else bundled.EN = previous;
  }
});

test('bundled CN and EN sections have matching unique keys', () => {
  const sections = ['Common', 'Character', 'Framework', 'Credential', 'CloudSave', 'Traits'];
  const keys = new Map<string, string[]>();
  for (const language of ['CN', 'EN']) {
    const seen = new Set<string>();
    for (const section of sections) {
      const path = new URL(`../../src/assets/translations/${language}/${section}.yaml`, import.meta.url);
      const parsed = jsyaml.load(readFileSync(path, 'utf8')) as Record<string, unknown>;
      for (const key of Object.keys(parsed)) {
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    keys.set(language, [...seen].sort());
  }
  expect(keys.get('CN')).toEqual(keys.get('EN'));
  expect(keys.get('CN')).toHaveLength(170);
});

async function importFile(manager: InstanceType<typeof Translator>, modName: string) {
  for await (const progress of manager.importFile(modName, 'EN', 'translations.json')) expect(progress.type).not.toBe('error');
}

test('language macro manager updates connected nodes and cleans up detached nodes', async () => {
  const originalSetup = Object.getOwnPropertyDescriptor(globalThis, 'setup');
  const setup = { maplebirch: {} };
  Object.defineProperty(globalThis, 'setup', { value: setup, configurable: true });
  try {
    const events = new Emitter();
    const core = { on: events.on.bind(events), infra: { diagnostics: new Diagnostics() } } as unknown as MaplebirchCore;
    const manager = new Macros(core);
    manager.install();
    manager.install();
    const language = (setup.maplebirch as { language: { add(type: string, updater: () => void, root: Node): void; managers: Record<string, Set<() => void>> } }).language;
    let updates = 0;
    const root = { isConnected: true };
    language.add('language', () => updates++, root as Node);
    await events.trigger(':language');
    expect(updates).toBe(1);
    root.isConnected = false;
    await events.trigger(':passageend');
    expect(language.managers.language.size).toBe(0);
  } finally {
    if (originalSetup) Object.defineProperty(globalThis, 'setup', originalSetup);
    else Reflect.deleteProperty(globalThis, 'setup');
  }
});

test('ModI18N compatibility translates only unchanged native text', async () => {
  const originalSetup = Object.getOwnPropertyDescriptor(globalThis, 'setup');
  const setup = {
    NPC_CN_NAME: (text: string) => (text === 'native' ? '原版' : text),
    NPC_CN_TITLE: (text: string) => text
  };
  Object.defineProperty(globalThis, 'setup', { value: setup, configurable: true });
  try {
    const modloader = { modUtils: { getModListNameNoAlias: () => ['ModI18N'] } } as unknown as ModLoader;
    const manager = new Translator({} as IndexedDB, modloader, new Emitter(), () => undefined);
    manager.set('english', { EN: 'english', CN: '中文' });
    await manager.setLanguage('CN');
    const compatibility = new ModI18N(manager, modloader);
    compatibility.install();
    const patchedName = setup.NPC_CN_NAME;
    compatibility.install();
    expect(setup.NPC_CN_NAME).toBe(patchedName);
    expect(setup.NPC_CN_NAME('native')).toBe('原版');
    expect(setup.NPC_CN_NAME('english')).toBe('中文');
    expect(setup.NPC_CN_TITLE('english')).toBe('中文');
  } finally {
    if (originalSetup) Object.defineProperty(globalThis, 'setup', originalSetup);
    else Reflect.deleteProperty(globalThis, 'setup');
  }
});

test('disabled translation overrides disappear without deleting their stored contribution', async () => {
  const { create, records, setActive } = fixture();
  const initial = create();
  await importFile(initial, 'base');
  await importFile(initial, 'override');
  expect(initial.t('name')).toBe('Override');
  const saved = structuredClone(records.get('["translation","name"]'));

  setActive(['base']);
  const disabled = create();
  await disabled.preload();
  expect(disabled.t('name')).toBe('Base');
  expect(disabled.auto('Override')).toBe('Override');
  expect(records.get('["translation","name"]')).toEqual(saved);

  await importFile(disabled, 'base');
  expect(disabled.t('name')).toBe('Base');
  setActive(['base', 'override']);
  const restored = create();
  await restored.preload();
  expect(restored.t('name')).toBe('Override');
});

test('a translation with no active provider is absent from both preload and lazy lookup', async () => {
  const { create, records, setActive } = fixture();
  await importFile(create(), 'override');
  setActive([]);
  const manager = create();
  await manager.preload();
  expect(manager.has('name')).toBe(false);
  expect(manager.t('name')).toBe('[name]');
  await Bun.sleep(0);
  expect(manager.has('name')).toBe(false);
  expect(records.has('["translation","name"]')).toBe(true);
});
