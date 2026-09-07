// ./src/services/IndexedDBService.ts

import { deleteDB, openDB, type IDBPDatabase, type IDBPTransaction } from 'idb';
import { version } from '../constants';
import type { MaplebirchCore } from '../core';

interface StoreIndex {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
}

interface StoreDefinition {
  options: IDBObjectStoreParameters;
  indexes: StoreIndex[];
}

type Transaction<Mode extends IDBTransactionMode = IDBTransactionMode> = IDBPTransaction<unknown, string[], Mode>;

const [major = 0, minor = 0, patch = 0] = version.split('.').map(value => Number.parseInt(value, 10) || 0);

class IndexedDBService {
  public static readonly DATABASE_NAME = 'maplebirch';
  public static readonly DATABASE_VERSION = major * 10000 + minor * 100 + patch;

  private db: IDBPDatabase<unknown> | null = null;
  private opening: Promise<void> | null = null;
  private readonly stores = new Map<string, StoreDefinition>();

  public constructor(readonly core: MaplebirchCore) {}

  public register(name: string, options: IDBObjectStoreParameters = { keyPath: 'id' }, indexes: StoreIndex[] = []): void {
    if (this.stores.has(name)) {
      this.core.logger.log(`存储 ${name} 已注册`, 'WARN');
      return;
    }

    this.stores.set(name, { options, indexes });
    this.core.logger.log(`注册存储: ${name}`, 'DEBUG');
  }

  public async init(): Promise<void> {
    if (this.db) return;
    if (this.opening) return this.opening;

    this.opening = this.open();

    try {
      await this.opening;
    } finally {
      this.opening = null;
    }
  }

  private async open(): Promise<void> {
    const db = await openDB<unknown>(IndexedDBService.DATABASE_NAME, IndexedDBService.DATABASE_VERSION, {
      upgrade: (db, _oldVersion, _newVersion, tx) => {
        for (const [name, definition] of this.stores) {
          const store = db.objectStoreNames.contains(name) ? tx.objectStore(name) : db.createObjectStore(name, definition.options);
          for (const index of definition.indexes) {
            if (store.indexNames.contains(index.name)) continue;
            store.createIndex(index.name, index.keyPath, index.options);
          }
        }
      },
      blocking: () => {
        this.db?.close();
        this.db = null;
      }
    });

    const missingStores = [...this.stores.keys()].filter(name => !db.objectStoreNames.contains(name));

    if (missingStores.length) {
      db.close();
      throw new Error(`IDB缺少存储: ${missingStores.join(', ')}`);
    }

    if (this.stores.size) {
      const tx = db.transaction([...this.stores.keys()], 'readonly');

      const missingIndexes: string[] = [];

      for (const [name, definition] of this.stores) {
        const store = tx.objectStore(name);
        for (const index of definition.indexes) if (!store.indexNames.contains(index.name)) missingIndexes.push(`${name}.${index.name}`);
      }

      await tx.done;

      if (missingIndexes.length) {
        db.close();
        throw new Error(`IDB缺少索引: ${missingIndexes.join(', ')}`);
      }
    }

    this.db = db;
    this.core.logger.log('IDB数据库初始化完成', 'DEBUG', this.stores);
  }

  public async withTransaction<T, Mode extends IDBTransactionMode>(storeNames: string | string[], mode: Mode, callback: (tx: Transaction<Mode>) => T | Promise<T>): Promise<T> {
    await this.init();

    if (!this.db) throw new Error('IDB数据库尚未初始化');
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    for (const name of names) if (!this.db.objectStoreNames.contains(name)) throw new Error(`IDB存储不存在: ${name}`);
    const tx = this.db.transaction(names, mode);
    try {
      const result = await callback(tx);
      await tx.done;
      return result;
    } catch (error) {
      try {
        tx.abort();
      } catch {}
      throw error;
    }
  }

  public clearStore(storeName: string): Promise<void> {
    return this.withTransaction(storeName, 'readwrite', tx => tx.objectStore(storeName).clear());
  }

  public async deleteDatabase(): Promise<boolean> {
    try {
      if (this.opening) await this.opening.catch(() => undefined);
      this.db?.close();
      this.db = null;
      await deleteDB(IndexedDBService.DATABASE_NAME);
      return true;
    } catch (error) {
      this.core.logger.log(`删除数据库失败: ${this.error(error)}`, 'ERROR');
      return false;
    }
  }

  private error(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

export default IndexedDBService;
