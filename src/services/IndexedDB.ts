// ./src/services/IndexedDB.ts

import { deleteDB, openDB, type IDBPDatabase, type IDBPTransaction } from 'idb';
import { version } from '../constants';
import Diagnostics from '../infra/Diagnostics';
import Catalog from '../infra/Catalog';
import type ModLoader from '../host/ModLoader';

export interface StoreIndex {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
}

interface StoreDefinition {
  options: IDBObjectStoreParameters;
  indexes: StoreIndex[];
}

export type Transaction<Mode extends IDBTransactionMode = IDBTransactionMode> = IDBPTransaction<unknown, string[], Mode>;

const [major = 0, minor = 0, patch = 0] = version.split('.').map(value => Number.parseInt(value, 10) || 0);

export class IndexedDB extends Catalog<string, StoreDefinition> {
  public static readonly DATABASE_NAME = 'maplebirch';
  public static readonly DATABASE_VERSION = major * 10000 + minor * 100 + patch;

  private db: IDBPDatabase<unknown> | null = null;
  private opening: Promise<void> | null = null;
  public constructor(modloader?: ModLoader) {
    super(modloader);
  }

  public define(name: string, options: IDBObjectStoreParameters = { keyPath: 'id' }, indexes: StoreIndex[] = []): boolean {
    if (this.db || this.opening) throw new Error(`IDB存储必须在数据库打开前注册: ${name}`);
    if (!this.add(name, { options, indexes })) {
      this.write(`存储 ${name} 已注册`, 'WARN', 'indexedDB');
      return false;
    }

    this.write(`注册存储: ${name}`, 'DEBUG', 'indexedDB');
    return true;
  }

  public async loadLogLevel(): Promise<string | boolean | undefined> {
    const setting = (await this.with('settings', 'readonly', tx => tx.objectStore('settings').get('DEBUG')).catch(error => {
      this.write(`日志级别读取失败: ${Diagnostics.message(error)}`, 'WARN', 'indexedDB');
      return undefined;
    })) as { value?: boolean } | undefined;
    return setting?.value;
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
    const blocking = () => {
      this.db?.close();
      this.db = null;
    };
    const upgrade = (db: IDBPDatabase<unknown>, _oldVersion: number, _newVersion: number | null, tx: IDBPTransaction<unknown, string[], 'versionchange'>) => {
      for (const [name, definition] of this.items) {
        const store = db.objectStoreNames.contains(name) ? tx.objectStore(name) : db.createObjectStore(name, definition.options);
        for (const index of definition.indexes) {
          if (store.indexNames.contains(index.name)) continue;
          store.createIndex(index.name, index.keyPath, index.options);
        }
      }
    };
    let db: IDBPDatabase<unknown>;
    try {
      db = await openDB<unknown>(IndexedDB.DATABASE_NAME, IndexedDB.DATABASE_VERSION, {
        upgrade,
        blocking
      });
    } catch (error) {
      if (!error || typeof error !== 'object' || !('name' in error) || error.name !== 'VersionError') throw error;
      await deleteDB(IndexedDB.DATABASE_NAME);
      this.write(`IDB数据库版本高于当前框架，已清空并按版本 ${IndexedDB.DATABASE_VERSION} 重建`, 'WARN', 'indexedDB');
      db = await openDB<unknown>(IndexedDB.DATABASE_NAME, IndexedDB.DATABASE_VERSION, { upgrade, blocking });
    }

    const missing = async () => {
      const stores = [...this.items.keys()].filter(name => !db.objectStoreNames.contains(name));
      const indexes: string[] = [];
      const existing = [...this.items.keys()].filter(name => db.objectStoreNames.contains(name));
      if (existing.length) {
        const tx = db.transaction(existing, 'readonly');
        for (const name of existing) {
          const store = tx.objectStore(name);
          for (const index of this.items.get(name)!.indexes) if (!store.indexNames.contains(index.name)) indexes.push(`${name}.${index.name}`);
        }
        await tx.done;
      }
      return { stores, indexes };
    };

    let absent = await missing();
    if (absent.stores.length || absent.indexes.length) {
      db.close();
      await deleteDB(IndexedDB.DATABASE_NAME);
      this.write(`IDB数据库缺少存储或索引，已清空并按版本 ${IndexedDB.DATABASE_VERSION} 重建`, 'WARN', 'indexedDB', absent);
      db = await openDB<unknown>(IndexedDB.DATABASE_NAME, IndexedDB.DATABASE_VERSION, { upgrade, blocking });
      absent = await missing();
    }
    if (absent.stores.length || absent.indexes.length) {
      db.close();
      throw new Error(absent.stores.length ? `IDB缺少存储: ${absent.stores.join(', ')}` : `IDB缺少索引: ${absent.indexes.join(', ')}`);
    }

    this.db = db;
    this.write('IDB数据库初始化完成', 'INFO', 'indexedDB');
  }

  public async with<T, Mode extends IDBTransactionMode>(storeNames: string | string[], mode: Mode, callback: (tx: Transaction<Mode>) => T | Promise<T>): Promise<T> {
    await this.init();

    if (!this.db) throw new Error('IDB数据库尚未初始化');
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    for (const name of names) if (!this.db.objectStoreNames.contains(name)) throw new Error(`IDB存储不存在: ${name}`);
    const tx = this.db.transaction(names, mode);
    const completion = tx.done;
    void completion.catch(() => undefined);
    try {
      const result = await callback(tx);
      await completion;
      return result;
    } catch (error) {
      try {
        tx.abort();
      } catch (abortError) {
        this.write(`事务中止失败: ${Diagnostics.message(abortError)}`, 'WARN', 'indexedDB', abortError);
      }
      await completion.catch(() => undefined);
      throw error;
    }
  }

  public clearStore(storeName: string): Promise<void> {
    return this.with(storeName, 'readwrite', tx => tx.objectStore(storeName).clear());
  }

  public async deleteDatabase(): Promise<boolean> {
    try {
      if (this.opening) await this.opening.catch(error => this.write(`数据库打开失败，继续删除: ${Diagnostics.message(error)}`, 'WARN', 'indexedDB'));
      this.db?.close();
      this.db = null;
      await deleteDB(IndexedDB.DATABASE_NAME);
      return true;
    } catch (error) {
      this.write(`删除数据库失败: ${Diagnostics.message(error)}`, 'ERROR', 'indexedDB', error);
      return false;
    }
  }
}

export default IndexedDB;
