import './runtime';
import { expect, mock, test } from 'bun:test';

let transaction: { done: Promise<void>; abort(): void; objectStore?(name: string): { indexNames: { contains(name: string): boolean } } };
let openError: Error | null = null;
let storesAvailable = true;
let closed = 0;
let requestedVersions: Array<number | undefined> = [];
mock.module('idb', () => ({
  async openDB(_name: string, version?: number) {
    requestedVersions.push(version);
    if (version !== undefined && openError) throw openError;
    return {
      version: 50001,
      objectStoreNames: { contains: () => storesAvailable },
      transaction: () => transaction,
      close() {
        closed++;
      }
    };
  },
  async deleteDB() {}
}));
const { default: IndexedDB } = await import('../../src/services/IndexedDB');

test('defines a store once through the catalog', () => {
  const service = new IndexedDB();
  expect(service.define('settings', { keyPath: 'key' })).toBe(true);
  expect(service.define('settings', { keyPath: 'key' })).toBe(false);
  expect(service.has('settings')).toBe(true);
});

test('announces database readiness at INFO before the saved log level can be read', async () => {
  const service = new IndexedDB();
  const messages: Array<{ message: string; level?: string; scope?: string }> = [];
  service.write = (message, level, scope) => messages.push({ message, level, scope });

  await service.init();

  expect(messages).toContainEqual({ message: 'IDB数据库初始化完成', level: 'INFO', scope: 'indexedDB' });
});

test('opens an existing newer database without downgrading or deleting it', async () => {
  requestedVersions = [];
  openError = new DOMException('requested version is lower', 'VersionError');
  const service = new IndexedDB();
  try {
    await service.init();
    expect(requestedVersions).toEqual([IndexedDB.DATABASE_VERSION, undefined]);
    expect(await service.init()).toBeUndefined();
    expect(requestedVersions).toHaveLength(2);
  } finally {
    openError = null;
  }
});

test('does not bypass schema validation when opening a newer database', async () => {
  requestedVersions = [];
  closed = 0;
  openError = new DOMException('requested version is lower', 'VersionError');
  storesAvailable = false;
  const service = new IndexedDB();
  service.define('settings', { keyPath: 'key' });
  try {
    await expect(service.init()).rejects.toThrow('IDB缺少存储: settings');
    expect(requestedVersions).toEqual([IndexedDB.DATABASE_VERSION, undefined]);
    expect(closed).toBe(1);
  } finally {
    openError = null;
    storesAvailable = true;
  }
});

test('rejects a newer database that lacks a required index', async () => {
  requestedVersions = [];
  closed = 0;
  openError = new DOMException('requested version is lower', 'VersionError');
  transaction = {
    done: Promise.resolve(),
    abort() {},
    objectStore: () => ({ indexNames: { contains: () => false } })
  };
  const service = new IndexedDB();
  service.define('settings', { keyPath: 'key' }, [{ name: 'byKey', keyPath: 'key' }]);
  try {
    await expect(service.init()).rejects.toThrow('IDB缺少索引: settings.byKey');
    expect(requestedVersions).toEqual([IndexedDB.DATABASE_VERSION, undefined]);
    expect(closed).toBe(1);
  } finally {
    openError = null;
  }
});

test('does not retry unrelated IndexedDB open errors', async () => {
  requestedVersions = [];
  const error = new DOMException('storage unavailable', 'SecurityError');
  openError = error;
  const service = new IndexedDB();
  try {
    await expect(service.init()).rejects.toBe(error);
    expect(requestedVersions).toEqual([IndexedDB.DATABASE_VERSION]);
  } finally {
    openError = null;
  }
});

test('transaction callback failures retain the original error and consume abort rejection', async () => {
  let abort!: (reason?: unknown) => void;
  transaction = {
    done: new Promise<void>((_resolve, reject) => {
      abort = reject;
    }),
    abort() {
      abort(new Error('transaction aborted'));
    }
  };
  const error = new Error('callback failed');
  const service = new IndexedDB();
  await expect(
    service.with('settings', 'readwrite', () => {
      throw error;
    })
  ).rejects.toBe(error);
  await Bun.sleep(0);
});

test('a successful callback resolves only after its transaction commits', async () => {
  let commit!: () => void;
  transaction = {
    done: new Promise<void>(resolve => {
      commit = resolve;
    }),
    abort() {}
  };
  const service = new IndexedDB();
  let settled = false;
  const operation = service
    .with('settings', 'readwrite', () => 7)
    .then(value => {
      settled = true;
      return value;
    });
  await Bun.sleep(0);
  expect(settled).toBe(false);
  commit();
  expect(await operation).toBe(7);
});
