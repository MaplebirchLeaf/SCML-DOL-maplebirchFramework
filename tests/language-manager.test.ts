import './helpers/runtime';
import { describe, expect, test } from 'bun:test';
import type { MaplebirchCore } from '../src/core';
import type { LanguageCode } from '../src/constants';

const { default: LanguageManager } = await import('../src/services/LanguageManager');

function createFixture(records = new Map<string, any>()) {
  const files = new Map<string, string>();
  const store = {
    get: async (key: unknown) => structuredClone(records.get(JSON.stringify(key))),
    put: async (record: any) => records.set(JSON.stringify([record.bucket, record.id]), structuredClone(record)),
    delete: async (key: unknown) => records.delete(JSON.stringify(key)),
    index: () => ({ getAll: async (bucket: string) => structuredClone([...records.values()].filter(record => record.bucket === bucket)) })
  };
  const core = {
    once: () => undefined,
    logger: { log: () => undefined },
    idb: {
      withTransaction: async (_name: string, _mode: string, callback: (tx: any) => unknown) => callback({ objectStore: () => store }),
      clearStore: async () => records.clear()
    },
    modLoader: {
      getModZip: (modName: string) => ({ zip: { file: (path: string) => ({ async: async () => files.get(`${modName}/${path}`) }) } })
    }
  } as unknown as MaplebirchCore;
  const manager = new LanguageManager(core);
  return {
    manager,
    records,
    record: (key: string) => records.get(JSON.stringify(['translation', key])),
    async import(modName: string, translations: Record<string, string>, language: LanguageCode = 'EN') {
      files.set(`${modName}/${language}.json`, JSON.stringify(translations));
      for await (const progress of manager.importFile(modName, language, `${language}.json`)) {
        if (progress.type === 'error') throw progress.error;
      }
    }
  };
}

describe('LanguageManager source imports', () => {
  test('keeps later-source overrides when an earlier source changes across reloads', async () => {
    const first = createFixture();
    await first.import('A', { shared: 'A v1' });
    await first.import('B', { shared: 'B' });
    expect(first.manager.t('shared')).toBe('B');

    const reloaded = createFixture(first.records);
    await reloaded.import('A', { shared: 'A v2' });
    await reloaded.import('B', { shared: 'B' });

    expect(reloaded.manager.t('shared')).toBe('B');
    expect(reloaded.record('shared').translations.EN).toBe('B');
  });

  test('keeps first-import source precedence when the same source is updated again', async () => {
    const fixture = createFixture();
    await fixture.import('A', { shared: 'A v1' });
    await fixture.import('B', { shared: 'B' });
    await fixture.import('A', { shared: 'A v2' });

    expect(fixture.manager.t('shared')).toBe('B');
  });

  test('clears an empty source and restores an earlier source without removing other mods', async () => {
    const fixture = createFixture();
    await fixture.import('A', { shared: 'A', earlier: 'keep A' });
    await fixture.import('B', { shared: 'B', removed: 'remove B' });
    await fixture.import('C', { unrelated: 'keep C' });
    await fixture.import('B', {});

    expect(fixture.manager.t('shared')).toBe('A');
    expect(fixture.manager.has('removed')).toBe(false);
    expect(fixture.manager.t('earlier')).toBe('keep A');
    expect(fixture.manager.t('unrelated')).toBe('keep C');
    expect(fixture.record('removed')).toBeUndefined();
    const reloaded = createFixture(fixture.records);
    await reloaded.manager.preload();
    expect(reloaded.manager.t('shared')).toBe('A');
    expect(reloaded.manager.has('removed')).toBe(false);
  });

  test('restores a persisted source before its file is imported again', async () => {
    const first = createFixture();
    await first.import('A', { shared: 'A' });
    await first.import('B', { shared: 'B' });

    const reloaded = createFixture(first.records);
    await reloaded.import('B', {});

    expect(reloaded.manager.t('shared')).toBe('A');
    expect(reloaded.record('shared').sources.EN).toBe('A');
  });

  test('removes only the current source language and preserves another source winner', async () => {
    const fixture = createFixture();
    await fixture.import('A', { shared: 'A', bilingual: 'English' });
    await fixture.import('A', { bilingual: '中文' }, 'CN');
    await fixture.import('B', { shared: 'B' });
    await fixture.import('A', {});

    expect(fixture.manager.t('shared')).toBe('B');
    expect(fixture.record('bilingual').translations).toEqual({ CN: '中文' });
    await fixture.import('B', {});
    expect(fixture.manager.has('shared')).toBe(false);
  });

  test('migrates legacy cached records on import without losing other languages', async () => {
    const first = createFixture();
    await first.import('A', { shared: 'A' });
    await first.import('B', { shared: 'B' });
    await first.import('C', { shared: '中文' }, 'CN');
    const legacy = first.record('shared');
    for (const field of Object.keys(legacy)) {
      if (!['bucket', 'id', 'translationKey', 'translations', 'sources', 'updatedAt'].includes(field)) delete legacy[field];
    }

    const reloaded = createFixture(first.records);
    await reloaded.import('A', { shared: 'A' });
    await reloaded.import('B', { shared: 'B' });
    await reloaded.import('B', {});

    expect(reloaded.record('shared').translations).toEqual({ EN: 'A', CN: '中文' });
  });

  test('preserves runtime translations in other languages when importing a source', async () => {
    const fixture = createFixture();
    await fixture.import('A', { shared: 'A v1' });
    fixture.manager.set('shared', { CN: '手动文本' });
    await fixture.import('A', { shared: 'A v2' });
    await fixture.manager.setLanguage('CN');

    expect(fixture.manager.t('shared')).toBe('手动文本');
  });

  test('uses the new source order after reloading unchanged files', async () => {
    const first = createFixture();
    await first.import('A', { shared: 'A' });
    await first.import('B', { shared: 'B' });
    const reloaded = createFixture(first.records);
    await reloaded.import('B', { shared: 'B' });
    await reloaded.import('A', { shared: 'A' });

    expect(reloaded.manager.t('shared')).toBe('A');
  });

  test('keeps first-import source precedence independent for each language', async () => {
    const fixture = createFixture();
    await fixture.import('B', { shared: 'B 中文' }, 'CN');
    await fixture.import('A', { shared: 'A English' });
    await fixture.import('B', { shared: 'B English' });
    await fixture.import('A', { shared: 'A 中文' }, 'CN');

    expect(fixture.manager.t('shared')).toBe('B English');
    await fixture.manager.setLanguage('CN');
    expect(fixture.manager.t('shared')).toBe('A 中文');
  });

  test('reorders unchanged sources independently for each language after reload', async () => {
    const first = createFixture();
    await first.import('A', { shared: 'A English' });
    await first.import('B', { shared: 'B English' });
    await first.import('A', { shared: 'A 中文' }, 'CN');
    await first.import('B', { shared: 'B 中文' }, 'CN');

    const reloaded = createFixture(first.records);
    await reloaded.import('B', { shared: 'B English' });
    await reloaded.import('A', { shared: 'A English' });
    await reloaded.import('A', { shared: 'A 中文' }, 'CN');
    await reloaded.import('B', { shared: 'B 中文' }, 'CN');

    expect(reloaded.manager.t('shared')).toBe('A English');
    await reloaded.manager.setLanguage('CN');
    expect(reloaded.manager.t('shared')).toBe('B 中文');
    expect(reloaded.record('shared').sources).toEqual({ EN: 'A', CN: 'B' });
  });
});
