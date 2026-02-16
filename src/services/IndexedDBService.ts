// ./src/services/IndexedDBService.ts

import { version } from './../constants';
import { MaplebirchCore } from '../core';

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
  static DATABASE_NAME = 'maplebirch';
  static DATABASE_VERSION: number;

  private db: any = null;
  private ready = false;
  private stores = new Map<string, StoreDefinition>();

  constructor(readonly core: MaplebirchCore) {
    IndexedDBService.DATABASE_VERSION = parseInt(version.split('.')[0], 10);
  }

  register(name: string, options: IDBObjectStoreParameters = { keyPath: 'id' }, indexes: Array<{ name: string; keyPath: string | string[]; options?: IDBIndexParameters }> = []): void {
    if (typeof name !== 'string') {
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

  async init(): Promise<void> {
    if (this.ready) return;
    try {
      const idbRef = this.core.modUtils.getIdbRef();
      this.db = await idbRef.idb_openDB(IndexedDBService.DATABASE_NAME, IndexedDBService.DATABASE_VERSION, {
        upgrade: (db: IDBDatabase, _oldVersion: any, _newVersion: any, transaction: IDBTransaction) => this.createStores(db, transaction)
      });
    } catch (error: any) {
      await this.core.disabled('maplebirch');
    } finally {
      if (!this.ready) this.core.logger.log('IDB数据库初始化完成', 'INFO', this.stores);
      this.ready = true;
      await this.checkStore();
    }
  }

  private createStores(db: IDBDatabase, _transaction: IDBTransaction): void {
    for (const storeDef of this.stores.values()) {
      if (!db.objectStoreNames.contains(storeDef.name)) {
        const store = db.createObjectStore(storeDef.name, storeDef.options);
        for (const indexDef of storeDef.indexes || []) {
          try {
            store.createIndex(indexDef.name, indexDef.keyPath, indexDef.options || {});
          } catch (err) {
            /* ignore */
          }
        }
      }
    }
  }

  private async checkStore(): Promise<void> {
    if (!this.ready || !this.db) return;
    const dbStoreNames = Array.from(this.db.objectStoreNames);
    const storeNames = Array.from(this.stores.keys());
    for (const storeName of storeNames) {
      if (!dbStoreNames.includes(storeName)) {
        await this.resetDatabase();
        break;
      }
    }
  }

  async withTransaction<T>(storeNames: string | string[], mode: IDBTransactionMode, callback: (tx: any) => Promise<T>): Promise<T> {
    if (!this.ready) await this.init();
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
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

  async clearStore(storeName: string): Promise<void> {
    return this.withTransaction([storeName], 'readwrite', async (tx: any) => {
      const store = tx.objectStore(storeName);
      await store.clear();
    });
  }

  async deleteDatabase(): Promise<boolean> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      const idbRef = this.core.modUtils.getIdbRef();
      await idbRef.idb_deleteDB(IndexedDBService.DATABASE_NAME);
      this.ready = false;
      return true;
    } catch (error: any) {
      this.core.logger.log(`删除数据库失败: ${error?.message || error}`, 'ERROR');
      return false;
    }
  }

  async resetDatabase(): Promise<void> {
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
