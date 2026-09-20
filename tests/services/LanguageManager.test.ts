import './runtime';
import { expect, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';
const { default: LanguageManager } = await import('../../src/services/LanguageManager');

function fixture() {
  let active = ['base', 'override'];
  const records = new Map<string, unknown>();
  const files: Record<string, Record<string, string>> = { base: { name: 'Base' }, override: { name: 'Override' } };
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
  const core = {
    once() {},
    log() {},
    logger: { log() {} },
    modUtils: { getModListNameNoAlias: () => active },
    modLoader: { getModZip: (name: string) => ({ zip: { file: () => ({ async: async () => JSON.stringify(files[name]) }) } }) },
    idb: {
      async withTransaction(_names: unknown, _mode: unknown, callback: (tx: { objectStore(): typeof store }) => unknown) {
        return callback({ objectStore: () => store });
      }
    }
  } as unknown as MaplebirchCore;
  return {
    core,
    records,
    setActive: (names: string[]) => {
      active = names;
    }
  };
}

async function importFile(manager: InstanceType<typeof LanguageManager>, modName: string) {
  for await (const progress of manager.importFile(modName, 'EN', 'translations.json')) expect(progress.type).not.toBe('error');
}

test('disabled translation overrides disappear without deleting their stored contribution', async () => {
  const { core, records, setActive } = fixture();
  const initial = new LanguageManager(core);
  await importFile(initial, 'base');
  await importFile(initial, 'override');
  expect(initial.t('name')).toBe('Override');
  const saved = structuredClone(records.get('["translation","name"]'));

  setActive(['base']);
  const disabled = new LanguageManager(core);
  await disabled.preload();
  expect(disabled.t('name')).toBe('Base');
  expect(disabled.auto('Override')).toBe('Override');
  expect(records.get('["translation","name"]')).toEqual(saved);

  await importFile(disabled, 'base');
  expect(disabled.t('name')).toBe('Base');
  setActive(['base', 'override']);
  const restored = new LanguageManager(core);
  await restored.preload();
  expect(restored.t('name')).toBe('Override');
});

test('a translation with no active provider is absent from both preload and lazy lookup', async () => {
  const { core, records, setActive } = fixture();
  await importFile(new LanguageManager(core), 'override');
  setActive([]);
  const manager = new LanguageManager(core);
  await manager.preload();
  expect(manager.has('name')).toBe(false);
  expect(manager.t('name')).toBe('[name]');
  await Bun.sleep(0);
  expect(manager.has('name')).toBe(false);
  expect(records.has('["translation","name"]')).toBe(true);
});
