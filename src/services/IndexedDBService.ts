// ./src/services/IndexedDBService.ts

import { openDB, deleteDB, type IDBPDatabase } from 'idb';
import { version } from './../constants';
import type { MaplebirchCore } from '../core';

type StoreDefinition = {
  name: string;
  options?: IDBObjectStoreParameters;
  indexes?: {
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
  }[];
};

class IndexedDBService {
  public static DATABASE_NAME = 'maplebirch';
  public static DATABASE_VERSION: number;

  private db: IDBPDatabase<unknown> | null = null;
  private ready = false;
  private opening: Promise<void> | null = null;
  private stores = new Map<string, StoreDefinition>();

  public constructor(readonly core: MaplebirchCore) {
    const [major, minor, patch] = version.split('.').map(v => parseInt(v, 10) || 0);
    IndexedDBService.DATABASE_VERSION = major * 10000 + minor * 100 + patch;
  }

  public register(name: string, options: IDBObjectStoreParameters = { keyPath: 'id' }, indexes: Array<{ name: string; keyPath: string | string[]; options?: IDBIndexParameters }> = []): void {
    if (typeof name !== 'string' || !name) {
      this.core.logger.log(`无效的存储名称: ${name as any}`, 'ERROR');
      return;
    }
    if (this.stores.has(name)) {
      this.core.logger.log(`存储 ${name} 已注册`, 'WARN');
      return;
    }
    this.stores.set(name, { name, options, indexes });
    this.core.logger.log(`注册存储: ${name}`, 'DEBUG');
  }

  public async init(): Promise<void> {
    if (this.ready) return;
    if (this.opening) return this.opening;
    this.opening = (async () => {
      try {
        this.db = await openDB(IndexedDBService.DATABASE_NAME, IndexedDBService.DATABASE_VERSION, { upgrade: db => this.createStores(db) });
        this.ready = true;
        this.core.logger.log('IDB数据库初始化完成', 'INFO', this.stores);
      } catch (error: any) {
        this.db = null;
        this.ready = false;
        this.core.logger.log(`IDB数据库初始化失败: ${error?.message || error}`, 'ERROR');
        await this.deleteDatabase();
        await this.core.disabled('maplebirch');
        throw error;
      }
    })();
    try {
      await this.opening;
    } finally {
      this.opening = null;
    }
  }

  private createStores(db: IDBPDatabase<unknown>): void {
    for (const storeDef of this.stores.values()) {
      if (!db.objectStoreNames.contains(storeDef.name)) {
        const store = db.createObjectStore(storeDef.name, storeDef.options);
        for (const indexDef of storeDef.indexes || []) store.createIndex(indexDef.name, indexDef.keyPath, indexDef.options || {});
      }
    }
  }

  public async checkStore(): Promise<void> {
    if (!this.ready) await this.init();
    if (!this.db) return;
    const dbStoreNames = Array.from(this.db.objectStoreNames);
    const storeNames = Array.from(this.stores.keys());
    for (const storeName of storeNames) {
      if (!dbStoreNames.includes(storeName)) {
        this.core.logger.log(`IDB缺少存储: ${storeName}`, 'WARN');
        await this.resetDatabase();
        break;
      }
    }
  }

  public async withTransaction<T>(storeNames: string | string[], mode: IDBTransactionMode, callback: (tx: any) => T | Promise<T>): Promise<T> {
    if (!this.ready) await this.init();
    if (!this.db) throw new Error('IDB数据库尚未初始化');
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    for (const name of names) if (!this.db.objectStoreNames.contains(name)) throw new Error(`IDB存储不存在: ${name}`);
    const tx = this.db.transaction(names, mode);
    try {
      const result = await callback(tx);
      await tx.done;
      return result;
    } catch (error: any) {
      this.core.logger.log(`事务执行失败: ${error?.message || error}`, 'ERROR');
      throw error;
    }
  }

  public async clearStore(storeName: string): Promise<void> {
    return this.withTransaction([storeName], 'readwrite', async (tx: any) => {
      const store = tx.objectStore(storeName);
      await store.clear();
    });
  }

  public async deleteDatabase(): Promise<boolean> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      this.ready = false;
      this.opening = null;
      await deleteDB(IndexedDBService.DATABASE_NAME);
      return true;
    } catch (error: any) {
      this.core.logger.log(`删除数据库失败: ${error?.message || error}`, 'ERROR');
      return false;
    }
  }

  public async resetDatabase(): Promise<void> {
    try {
      const deleted = await this.deleteDatabase();
      if (!deleted) throw new Error('删除数据库失败');
      await this.init();
      location.reload();
    } catch (error: any) {
      this.core.logger.log(`数据库重置失败: ${error?.message || error}`, 'ERROR');
    }
  }
}

export default IndexedDBService;
