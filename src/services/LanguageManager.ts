// ./src/services/LanguageManager.ts

import { Languages } from './../constants';
import type { MaplebirchCore } from '../core';

export type Translation = Record<string, string>;
type LanguageCode = 'EN' | 'CN';

class LanguageManager {
  static readonly DEFAULT_LANGS: readonly LanguageCode[] = Languages as readonly LanguageCode[];
  static readonly BATCH_SIZE = 500;

  language: LanguageCode = navigator.language.includes('zh') ? 'CN' : 'EN';
  translations = new Map<string, Translation>();
  private cache = new Map<string, string>();
  private preloaded = false;
  private fileHashes = new Map<string, string>();

  constructor(readonly core: MaplebirchCore) {
    this.core.once(':indexedDB', () => this.initDB());
    this.core.once(':idbReady', async () => await this.normalizeLang());
  }

  async normalizeLang(lang?: string): Promise<LanguageCode> {
    const check: LanguageCode = navigator.language.includes('zh') ? 'CN' : 'EN';
    const record = lang ? null : await this.core.idb.withTransaction(['settings'], 'readonly', async (tx: any) => await tx.objectStore('settings').get('Language')).catch(() => null);
    const code = String(lang ?? record?.value ?? check).toUpperCase();
    this.language = (LanguageManager.DEFAULT_LANGS as readonly string[]).includes(code) ? (code as LanguageCode) : check;
    this.cache.clear();
    this.core.logger.log(`语言设置为: ${this.language}`, 'DEBUG');
    return this.language;
  }

  initDB(): void {
    this.core.idb.register('language-metadata', { keyPath: 'key' });

    this.core.idb.register('language-translations', { keyPath: 'key' }, [{ name: 'mod', keyPath: 'mod' }]);

    this.core.idb.register('language-text-index', { keyPath: ['key', 'language', 'text_value'] }, [
      { name: 'text_value', keyPath: 'text_value' },
      { name: 'key', keyPath: 'key' }
    ]);
  }

  private modFile(modName: string, path: string, silent = false): any {
    const modLoader = this.core.modLoader;
    if (!modLoader) {
      this.core.logger.log('Mod 加载器未设置', 'ERROR');
      return null;
    }
    const modZip = modLoader.getModZip(modName);
    if (!modZip) {
      this.core.logger.log(`找不到 Mod: ${modName}`, 'ERROR');
      return null;
    }
    const file = modZip.zip.file(path);
    if (!file && !silent) this.core.logger.log(`文件未找到: ${path}`, 'ERROR');
    return file || null;
  }

  async *importAll(modName: string, langs: readonly string[] = LanguageManager.DEFAULT_LANGS) {
    for (const lang of langs) {
      const formats = ['json', 'yml', 'yaml'];
      let processedCount = 0;
      let error: Error | null = null;
      let foundAny = false;
      for (const format of formats) {
        const path = `translations/${lang.toLowerCase()}.${format}`;
        const file = this.modFile(modName, path, true);
        if (!file) continue;
        this.core.logger.log(`处理 ${lang} 翻译: ${path}`, 'DEBUG');
        foundAny = true;
        try {
          const content = await file.async('string');
          const data = this.parseFile(content, path);
          for await (const progress of this.processStream(modName, lang, data)) yield { ...progress, lang, type: 'process' };
          processedCount = Object.keys(data).length;
        } catch (err: any) {
          error = err;
          this.core.logger.log(`处理失败: ${path} - ${err.message}`, 'ERROR');
          yield { lang, count: 0, error, type: 'error' };
        }
      }
      if (!foundAny) {
        this.core.logger.log(`找不到 ${lang} 翻译文件`, 'WARN');
        yield { lang, count: 0, error: new Error('未找到翻译文件'), type: 'not_found' };
      } else if (!error) {
        yield { lang, count: processedCount, error: null, type: 'complete' };
      }
    }
  }

  async *load(modName: string, lang: string, path: string) {
    const file = this.modFile(modName, path);
    if (!file) return;
    try {
      const content = await file.async('string');
      const data = this.parseFile(content, path);
      for await (const progress of this.processStream(modName, lang, data)) yield { ...progress, lang, type: 'process' };
      yield { lang, count: Object.keys(data).length, error: null, type: 'complete' };
    } catch (err: any) {
      this.core.logger.log(`加载失败: ${modName}/${path} - ${err.message}`, 'ERROR');
      yield { lang, count: 0, error: err, type: 'error' };
    }
  }

  private async *processStream(modName: string, lang: string, translations: Record<string, string>) {
    const keys = Object.keys(translations);
    const total = keys.length;

    if (total === 0) {
      yield { progress: 100, current: 0, total: 0 };
      return;
    }

    const fileHash = await this.computeHash(translations);
    const lastHash = await this.getFileHash(modName, lang);

    if (fileHash === lastHash) {
      this.core.logger.log(`翻译未变更: ${modName}/${lang}`, 'DEBUG');
      yield { progress: 100, current: 0, total: 0 };
      return;
    }

    const existingKeys = await this.getKeysForMod(modName, lang);
    const newKeys = new Set(keys);
    const oldKeys = new Set([...existingKeys].filter(k => !newKeys.has(k)));
    if (oldKeys.size > 0) await this.cleanOldKeys(oldKeys, lang);
    let processed = 0;

    for (let i = 0; i < keys.length; i += LanguageManager.BATCH_SIZE) {
      const batchKeys = keys.slice(i, i + LanguageManager.BATCH_SIZE);
      const entries = batchKeys.map(key => {
        if (!this.translations.has(key)) this.translations.set(key, {});
        this.translations.get(key)![lang] = translations[key];
        return {
          key,
          translations: { [lang]: translations[key] },
          mod: modName
        };
      });

      await this.storeBatch(entries);

      processed += batchKeys.length;
      yield {
        progress: Math.min(100, Math.floor((processed / total) * 100)),
        current: processed,
        total
      };
    }

    await this.saveFileHash(modName, lang, fileHash);
    this.core.logger.log(`加载翻译: ${lang} (${keys.length} 项)`, 'DEBUG');
  }

  t(key: string, space = false): string {
    const rec = this.translations.get(key);
    if (!rec) {
      void this.loadFromDB(key);
      return `[${key}]`;
    }
    const result = rec[this.language] || rec.EN || Object.values(rec)[0] || `[${key}]`;
    if (this.language === 'EN' && space === true) return result + ' ';
    return result;
  }

  auto(text: string): string {
    if (!text) return text;
    const cached = this.cache.get(text);
    if (cached) return this.t(cached);
    for (const [key, trans] of this.translations) {
      if (trans[this.language] === text) return text;
      for (const lang in trans) {
        if (trans[lang] === text) {
          this.cache.set(text, key);
          return this.t(key);
        }
      }
    }
    void this.findKeyAsync(text);
    return text;
  }

  async preload(): Promise<void> {
    if (this.preloaded) return;

    try {
      await this.core.idb.withTransaction(['language-translations'], 'readonly', async (tx: any) => {
        const store = tx.objectStore('language-translations');
        const all = await store.getAll();
        let count = 0;

        for (const rec of all) {
          this.translations.set(rec.key, rec.translations || {});
          count++;
        }

        this.preloaded = true;
        this.core.logger.log(`预加载完成: ${count} 条`, 'INFO');
      });
    } catch (err: any) {
      this.core.logger.log(`预加载失败: ${err.message}`, 'ERROR');
    }
  }

  async clearDB(): Promise<void> {
    try {
      await this.core.idb.clearStore('language-metadata');
      await this.core.idb.clearStore('language-translations');
      await this.core.idb.clearStore('language-text-index');
      this.preloaded = false;
      this.translations.clear();
      this.cache.clear();
      this.fileHashes.clear();
      this.core.logger.log('数据库已清空', 'DEBUG');
    } catch (err: any) {
      this.core.logger.log(`清空失败: ${err.message}`, 'ERROR');
    }
  }

  private parseFile(content: string, path: string): any {
    if (path.endsWith('.json')) return JSON.parse(content);
    if (path.endsWith('.yml') || path.endsWith('.yaml')) return this.core.yaml.load(content);
    throw new Error(`不支持的文件格式: ${path}`);
  }

  private async computeHash(data: any): Promise<string> {
    const contentStr = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuf = encoder.encode(contentStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuf);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async getFileHash(modName: string, lang: string): Promise<string | null> {
    const key = `${modName}_${lang}`;
    if (this.fileHashes.has(key)) return this.fileHashes.get(key)!;
    try {
      return await this.core.idb.withTransaction(['language-metadata'], 'readonly', async (tx: any) => {
        const store = tx.objectStore('language-metadata');
        const hash = (await store.get(key))?.hash || null;
        if (hash) this.fileHashes.set(key, hash);
        return hash;
      });
    } catch (err: any) {
      this.core.logger.log(`获取哈希失败: ${key} - ${err.message}`, 'DEBUG');
      return null;
    }
  }

  private async saveFileHash(modName: string, lang: string, hash: string): Promise<void> {
    const key = `${modName}_${lang}`;
    try {
      await this.core.idb.withTransaction(['language-metadata'], 'readwrite', async (tx: any) => {
        const store = tx.objectStore('language-metadata');
        await store.put({
          key,
          hash,
          timestamp: Date.now()
        });
        this.fileHashes.set(key, hash);
      });
    } catch (err: any) {
      this.core.logger.log(`保存哈希失败: ${err.message}`, 'ERROR');
    }
  }

  private async storeBatch(
    entries: Array<{
      key: string;
      translations: Record<string, string>;
      mod: string;
    }>
  ): Promise<void> {
    if (!entries || entries.length === 0) return;

    try {
      const map = new Map<string, { translations: Record<string, string>; mod: string }>();

      for (const { key, translations, mod } of entries) {
        if (!map.has(key)) map.set(key, { translations: {}, mod });
        const bucket = map.get(key)!;
        bucket.translations = { ...bucket.translations, ...translations };
        if (mod) bucket.mod = mod;
      }

      const keys = Array.from(map.keys());

      await this.core.idb.withTransaction(['language-translations', 'language-text-index'], 'readwrite', async (tx: any) => {
        const tStore = tx.objectStore('language-translations');
        const textStore = tx.objectStore('language-text-index');
        const keyIndex = textStore.index('key');
        const records = await Promise.all(keys.map(k => tStore.get(k)));
        const mergedMap = new Map<string, Record<string, string>>();

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const existing = records[i];
          const newBucket = map.get(key)!;
          const merged = existing ? { ...existing.translations, ...newBucket.translations } : newBucket.translations;
          mergedMap.set(key, merged);

          await tStore.put({
            key,
            translations: merged,
            mod: newBucket.mod || existing?.mod,
            timestamp: Date.now()
          });
        }

        for (const key of keys) {
          let cursor = await keyIndex.openCursor(IDBKeyRange.only(key));
          while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
          }
        }

        for (const key of keys) {
          const translations = mergedMap.get(key)!;
          for (const lang in translations) {
            await textStore.add({
              text_value: translations[lang],
              key,
              language: lang
            });
          }
        }
      });

      this.core.logger.log(`批量存储: ${keys.length} 条`, 'DEBUG');
    } catch (err: any) {
      this.core.logger.log(`批量存储失败: ${err.message}`, 'ERROR');

      try {
        await this.retrySmall(entries);
      } catch (e: any) {
        this.core.logger.log(`重试失败: ${e.message}`, 'ERROR');
        await this.core.idb.resetDatabase();
      }
    }
  }

  private async retrySmall(
    entries: Array<{
      key: string;
      translations: Record<string, string>;
      mod: string;
    }>
  ): Promise<void> {
    const small = Math.max(50, Math.floor(LanguageManager.BATCH_SIZE / 10));

    for (let i = 0; i < entries.length; i += small) {
      const chunk = entries.slice(i, i + small);

      await this.core.idb.withTransaction(['language-translations', 'language-text-index'], 'readwrite', async (tx: any) => {
        const store = tx.objectStore('language-translations');
        const textStore = tx.objectStore('language-text-index');
        const keyIndex = textStore.index('key');

        for (const { key, translations, mod } of chunk) {
          const existing = await store.get(key);
          const merged = existing ? { ...existing.translations, ...translations } : translations;

          await store.put({
            key,
            translations: merged,
            mod: mod || existing?.mod,
            timestamp: Date.now()
          });

          let cursor = await keyIndex.openCursor(IDBKeyRange.only(key));
          while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
          }

          for (const lang in merged) {
            await textStore.add({
              text_value: merged[lang],
              key,
              language: lang
            });
          }
        }
      });
    }

    this.core.logger.log('重试完成', 'DEBUG');
  }

  private async getKeysForMod(modName: string, lang: string): Promise<Set<string>> {
    try {
      return await this.core.idb.withTransaction(['language-translations'], 'readonly', async (tx: any) => {
        const store = tx.objectStore('language-translations');
        const index = store.index('mod');
        const records = await index.getAll(modName);
        return new Set(records.filter((r: any) => r.translations && Object.prototype.hasOwnProperty.call(r.translations, lang)).map((r: any) => r.key));
      });
    } catch (err: any) {
      this.core.logger.log(`获取键失败: ${modName}/${lang} - ${err.message}`, 'DEBUG');
      return new Set();
    }
  }

  private async cleanOldKeys(oldKeys: Set<string>, lang: string): Promise<void> {
    if (oldKeys.size === 0) return;

    try {
      await this.core.idb.withTransaction(['language-translations', 'language-text-index'], 'readwrite', async (tx: any) => {
        const store = tx.objectStore('language-translations');
        const textStore = tx.objectStore('language-text-index');
        const keyIndex = textStore.index('key');

        for (const key of Array.from(oldKeys)) {
          const record = await store.get(key);
          if (!record) continue;

          if (record.translations && Object.prototype.hasOwnProperty.call(record.translations, lang)) {
            delete record.translations[lang];

            if (Object.keys(record.translations).length > 0) {
              await store.put(record);
            } else {
              await store.delete(key);
            }
          }

          let cursor = await keyIndex.openCursor(IDBKeyRange.only(key));
          while (cursor) {
            if (cursor.value.language === lang) await cursor.delete();
            cursor = await cursor.continue();
          }
        }
      });

      this.core.logger.log(`清理旧键: ${oldKeys.size} 个`, 'DEBUG');
    } catch (err: any) {
      this.core.logger.log(`清理失败: ${err.message}`, 'ERROR');
    }
  }

  private async loadFromDB(key: string): Promise<boolean> {
    try {
      return await this.core.idb.withTransaction(['language-translations'], 'readonly', async (tx: any) => {
        const store = tx.objectStore('language-translations');
        const record = await store.get(key);
        if (!record) return false;
        this.translations.set(key, record.translations || {});
        return true;
      });
    } catch (err: any) {
      this.core.logger.log(`加载失败: ${key} - ${err.message}`, 'DEBUG');
      return false;
    }
  }

  private async findKeyAsync(text: string): Promise<string | null> {
    try {
      return await this.core.idb.withTransaction(['language-text-index'], 'readonly', async (tx: any) => {
        const store = tx.objectStore('language-text-index');
        const index = store.index('text_value');
        const records = await index.getAll(text);
        if (records.length === 0) return null;
        const key = records[0].key;
        this.cache.set(text, key);
        return key;
      });
    } catch (err: any) {
      this.core.logger.log(`查找失败: ${text} - ${err.message}`, 'DEBUG');
      return null;
    }
  }
}

export default LanguageManager;
