import './runtime';
import { expect, mock, test } from 'bun:test';

let transaction: { done: Promise<void>; abort(): void; objectStore?(name: string): { indexNames: { contains(name: string): boolean } } };
let openError: Error | null = null;
let storesAvailable = true;
let closed = 0;
let deleted = 0;
let rebuildPending = false;
let oldVersionPending = false;
let requestedVersions: Array<number | undefined> = [];
mock.module('idb', () => ({
  async openDB(
    _name: string,
    version?: number,
    options?: {
      upgrade(db: { objectStoreNames: { contains(name: string): boolean }; createObjectStore(name: string): { indexNames: { contains(name: string): boolean }; createIndex(): void } }): void;
    }
  ) {
    requestedVersions.push(version);
    if (version !== undefined && openError) throw openError;
    if (rebuildPending || oldVersionPending) {
      options?.upgrade({
        objectStoreNames: { contains: () => storesAvailable },
        createObjectStore: () => {
          storesAvailable = true;
          return { indexNames: { contains: () => true }, createIndex() {} };
        }
      });
      rebuildPending = false;
      oldVersionPending = false;
    }
    return {
      version: version ?? IndexedDB.DATABASE_VERSION,
      objectStoreNames: { contains: () => storesAvailable },
      transaction: () => transaction,
      close() {
        closed++;
      }
    };
  },
  async deleteDB() {
    deleted++;
    if (openError?.name === 'VersionError') openError = null;
    storesAvailable = false;
    rebuildPending = true;
    transaction = { done: Promise.resolve(), abort() {}, objectStore: () => ({ indexNames: { contains: () => true } }) };
  }
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

test('rejects schema registration after the database is open', async () => {
  const service = new IndexedDB();
  await service.init();
  expect(() => service.define('late')).toThrow('IDB存储必须在数据库打开前注册: late');
});

test('upgrades an older database without clearing it', async () => {
  requestedVersions = [];
  deleted = 0;
  storesAvailable = false;
  oldVersionPending = true;
  transaction = { done: Promise.resolve(), abort() {}, objectStore: () => ({ indexNames: { contains: () => true } }) };
  const service = new IndexedDB();
  service.define('settings', { keyPath: 'key' });
  await service.init();
  expect(requestedVersions).toEqual([IndexedDB.DATABASE_VERSION]);
  expect(deleted).toBe(0);
  expect(storesAvailable).toBe(true);
});

test('recreates a newer database at the current framework version', async () => {
  requestedVersions = [];
  deleted = 0;
  openError = new DOMException('requested version is lower', 'VersionError');
  const service = new IndexedDB();
  try {
    await service.init();
    expect(requestedVersions).toEqual([IndexedDB.DATABASE_VERSION, IndexedDB.DATABASE_VERSION]);
    expect(deleted).toBe(1);
    expect(await service.init()).toBeUndefined();
    expect(requestedVersions).toHaveLength(2);
  } finally {
    openError = null;
  }
});

test('recreates all registered stores when an existing database is newer', async () => {
  requestedVersions = [];
  deleted = 0;
  openError = new DOMException('requested version is lower', 'VersionError');
  storesAvailable = false;
  const service = new IndexedDB();
  service.define('settings', { keyPath: 'key' });
  try {
    await service.init();
    expect(requestedVersions).toEqual([IndexedDB.DATABASE_VERSION, IndexedDB.DATABASE_VERSION]);
    expect(deleted).toBe(1);
    expect(storesAvailable).toBe(true);
  } finally {
    openError = null;
    storesAvailable = true;
  }
});

test('recreates a current-version database that lacks a registered store', async () => {
  requestedVersions = [];
  deleted = 0;
  closed = 0;
  storesAvailable = false;
  transaction = { done: Promise.resolve(), abort() {}, objectStore: () => ({ indexNames: { contains: () => true } }) };
  const service = new IndexedDB();
  service.define('cheats', { keyPath: 'name' });
  try {
    await service.init();
    expect(requestedVersions).toEqual([IndexedDB.DATABASE_VERSION, IndexedDB.DATABASE_VERSION]);
    expect(closed).toBe(1);
    expect(deleted).toBe(1);
    expect(storesAvailable).toBe(true);
  } finally {
    storesAvailable = true;
  }
});

test('recreates a current-version database that lacks a required index', async () => {
  requestedVersions = [];
  closed = 0;
  deleted = 0;
  transaction = {
    done: Promise.resolve(),
    abort() {},
    objectStore: () => ({ indexNames: { contains: () => false } })
  };
  const service = new IndexedDB();
  service.define('settings', { keyPath: 'key' }, [{ name: 'byKey', keyPath: 'key' }]);
  try {
    await service.init();
    expect(requestedVersions).toEqual([IndexedDB.DATABASE_VERSION, IndexedDB.DATABASE_VERSION]);
    expect(closed).toBe(1);
    expect(deleted).toBe(1);
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
