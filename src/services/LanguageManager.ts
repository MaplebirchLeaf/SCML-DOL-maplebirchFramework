// ./src/services/LanguageManager.ts

import { Languages, type LanguageCode } from './../constants';
import type { MaplebirchCore } from '../core';

export type Translation = Record<string, string>;

type Bucket = 'translation' | 'file';

interface TranslationRecord {
  bucket: 'translation';
  id: string;
  translationKey: string;
  translations: Translation;
  sources: Partial<Record<LanguageCode, string>>;
  updatedAt: number;
}

interface FileRecord {
  bucket: 'file';
  id: [string, LanguageCode];
  modName: string;
  language: LanguageCode;
  hash: string;
  keys: string[];
}

interface ImportProgress {
  type: 'process' | 'complete' | 'error' | 'not_found';
  language: LanguageCode;
  progress?: number;
  current?: number;
  total?: number;
  count?: number;
  error?: Error | null;
}

class LanguageManager {
  static readonly DEFAULT_LANGS = Languages as readonly LanguageCode[];
  static readonly BATCH_SIZE = 500;

  language: LanguageCode = navigator.language.includes('zh') ? 'CN' : 'EN';

  private readonly STORE = 'language';

  private translations = new Map<string, Translation>();
  private textCache = new Map<string, string>();
  private fileHashes = new Map<string, Map<LanguageCode, string>>();
  private preloaded = false;

  constructor(readonly core: MaplebirchCore) {
    this.core.once(':indexedDB', () => this.initDB());
    this.core.once(':idbReady', async () => await this.setLanguage());
  }

  private initDB(): void {
    this.core.idb.register(this.STORE, { keyPath: ['bucket', 'id'] }, [{ name: 'bucket', keyPath: 'bucket', options: { unique: false } }]);
  }

  async setLanguage(language?: string): Promise<LanguageCode> {
    const browserLanguage: LanguageCode = navigator.language.includes('zh') ? 'CN' : 'EN';
    const saved = language ? null : await this.core.idb.withTransaction(['settings'], 'readonly', async (tx: any) => await tx.objectStore('settings').get('Language')).catch(() => null);
    const code = String(language ?? saved?.value ?? browserLanguage).toUpperCase();
    this.language = (LanguageManager.DEFAULT_LANGS as readonly string[]).includes(code) ? (code as LanguageCode) : browserLanguage;
    this.textCache.clear();
    this.core.logger.log(`语言设置为: ${this.language}`, 'DEBUG');
    return this.language;
  }

  async *import(modName: string, languages: readonly LanguageCode[] = LanguageManager.DEFAULT_LANGS): AsyncGenerator<ImportProgress> {
    for (const language of languages) {
      const formats = ['json', 'yml', 'yaml'];
      let found = false;
      let failed = false;
      let count = 0;
      for (const format of formats) {
        const path = `translations/${language.toLowerCase()}.${format}`;
        const file = this.getModFile(modName, path, true);
        if (!file) continue;
        found = true;
        try {
          this.core.logger.log(`处理 ${language} 翻译: ${modName}/${path}`, 'DEBUG');
          const content = await file.async('string');
          const translations = this.parseTranslations(content, path);
          for await (const progress of this.writeTranslations(modName, language, translations)) {
            yield {
              ...progress,
              language,
              type: 'process'
            };
          }
          count = Object.keys(translations).length;
        } catch (error: any) {
          failed = true;
          this.core.logger.log(`处理失败: ${modName}/${path} - ${error.message}`, 'ERROR');
          yield {
            type: 'error',
            language,
            count: 0,
            error
          };
        }
      }
      if (!found) {
        this.core.logger.log(`找不到 ${language} 翻译文件`, 'WARN');
        yield {
          type: 'not_found',
          language,
          count: 0,
          error: new Error('未找到翻译文件')
        };
        continue;
      }
      if (!failed) {
        yield {
          type: 'complete',
          language,
          count,
          error: null
        };
      }
    }
  }

  async *importFile(modName: string, language: LanguageCode, path: string): AsyncGenerator<ImportProgress> {
    const file = this.getModFile(modName, path);
    if (!file) return;
    try {
      const content = await file.async('string');
      const translations = this.parseTranslations(content, path);
      for await (const progress of this.writeTranslations(modName, language, translations)) {
        yield {
          ...progress,
          language,
          type: 'process'
        };
      }
      yield {
        type: 'complete',
        language,
        count: Object.keys(translations).length,
        error: null
      };
    } catch (error: any) {
      this.core.logger.log(`加载失败: ${modName}/${path} - ${error.message}`, 'ERROR');
      yield {
        type: 'error',
        language,
        count: 0,
        error
      };
    }
  }

  t(translationKey: string, space = false): string {
    const record = this.translations.get(translationKey);
    if (!record || typeof record !== 'object') {
      if (record !== undefined) this.translations.delete(translationKey);
      void this.loadTranslation(translationKey);
      return `[${translationKey}]`;
    }
    const result = record[this.language] ?? record.EN ?? Object.values(record).find(value => typeof value === 'string' && value.length > 0) ?? `[${translationKey}]`;
    return this.language === 'EN' && space && result[0] !== '[' ? result + ' ' : result;
  }

  auto(text: string): string {
    if (!text) return text;
    const cachedKey = this.textCache.get(text);
    if (cachedKey) return this.t(cachedKey);
    const result = this.findLoadedText(text);
    if (result) return result;
    void this.findTextInDB(text);
    return text;
  }

  async preload(): Promise<void> {
    if (this.preloaded) return;
    try {
      const records = await this.core.idb.withTransaction([this.STORE], 'readonly', async (tx: any) => await tx.objectStore(this.STORE).index('bucket').getAll('translation'));
      for (const record of records as TranslationRecord[]) this.translations.set(record.translationKey, record.translations);
      this.preloaded = true;
      this.core.logger.log(`预加载完成: ${records.length} 条`, 'INFO');
    } catch (error: any) {
      this.core.logger.log(`预加载失败: ${error.message}`, 'ERROR');
    }
  }

  async clearStorage(): Promise<void> {
    try {
      await this.core.idb.clearStore(this.STORE);
      this.translations.clear();
      this.textCache.clear();
      this.fileHashes.clear();
      this.preloaded = false;
      this.core.logger.log('语言数据库已清空', 'DEBUG');
    } catch (error: any) {
      this.core.logger.log(`清空语言数据库失败: ${error.message}`, 'ERROR');
    }
  }

  has(translationKey: string): boolean {
    const record = this.translations.get(translationKey);
    if (!record || typeof record !== 'object') return false;
    return Boolean(record[this.language] ?? record.EN ?? Object.values(record).find(value => typeof value === 'string' && value.length > 0));
  }

  set(translationKey: string, translations: Record<string, unknown>): boolean {
    if (typeof translationKey !== 'string' || !translationKey.trim()) {
      this.core.logger.log(`无效的翻译键: ${String(translationKey)}`, 'WARN');
      return false;
    }
    if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
      this.core.logger.log(`翻译 ${translationKey} 的内容格式无效`, 'WARN');
      return false;
    }
    const normalized: Translation = {};
    for (const [language, value] of Object.entries(translations)) {
      const code = language.toUpperCase();
      if (!(LanguageManager.DEFAULT_LANGS as readonly string[]).includes(code)) {
        this.core.logger.log(`跳过不支持的语言: ${language}`, 'WARN');
        continue;
      }
      if (value == null) continue;
      if (typeof value === 'string') {
        normalized[code] = value;
        continue;
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        normalized[code] = value.toString();
        continue;
      }
      this.core.logger.log(`跳过无效翻译值: ${translationKey}/${code}`, 'WARN', value);
    }
    if (Object.keys(normalized).length === 0) {
      this.core.logger.log(`翻译 ${translationKey} 没有有效内容`, 'WARN');
      return false;
    }
    this.translations.set(translationKey, {
      ...this.translations.get(translationKey),
      ...normalized
    });
    this.textCache.clear();
    return true;
  }

  private async *writeTranslations(
    modName: string,
    language: LanguageCode,
    translations: Record<string, string>
  ): AsyncGenerator<{
    progress: number;
    current: number;
    total: number;
  }> {
    const translationKeys = Object.keys(translations);
    const total = translationKeys.length;
    if (total === 0) {
      yield {
        progress: 100,
        current: 0,
        total: 0
      };
      return;
    }

    const hash = await this.computeHash(translations);
    const fileRecord = await this.readFileRecord(modName, language);
    if (hash === fileRecord?.hash) {
      await this.loadFileTranslations(fileRecord.keys);
      this.core.logger.log(`翻译未变更: ${modName}/${language}`, 'DEBUG');
      yield {
        progress: 100,
        current: 0,
        total: 0
      };
      return;
    }
    const oldKeys = new Set(fileRecord?.keys || []);
    const newKeys = new Set(translationKeys);
    const removedKeys = new Set([...oldKeys].filter(key => !newKeys.has(key)));
    await this.removeOldTranslations(modName, language, removedKeys);
    let current = 0;
    for (let i = 0; i < translationKeys.length; i += LanguageManager.BATCH_SIZE) {
      const batchKeys = translationKeys.slice(i, i + LanguageManager.BATCH_SIZE);
      const batch = batchKeys.map(translationKey => ({
        translationKey,
        text: translations[translationKey]
      }));
      await this.writeBatch(modName, language, batch);
      for (const item of batch) {
        this.translations.set(item.translationKey, {
          ...this.translations.get(item.translationKey),
          [language]: item.text
        });
      }
      current += batchKeys.length;
      yield {
        progress: Math.min(100, Math.floor((current / total) * 100)),
        current,
        total
      };
    }
    await this.writeFileRecord(modName, language, hash, translationKeys);
    this.textCache.clear();
    this.core.logger.log(`加载翻译: ${modName}/${language} (${total} 项)`, 'DEBUG');
  }

  private async writeBatch(
    modName: string,
    language: LanguageCode,
    entries: Array<{
      translationKey: string;
      text: string;
    }>
  ): Promise<void> {
    if (entries.length === 0) return;

    try {
      await this.writeBatchRaw(modName, language, entries);
      this.core.logger.log(`批量存储翻译: ${modName}/${language} ${entries.length} 条`, 'DEBUG');
    } catch (error: any) {
      this.core.logger.log(`批量存储失败: ${error.message}`, 'ERROR');
      const size = Math.max(50, Math.floor(LanguageManager.BATCH_SIZE / 10));
      for (let i = 0; i < entries.length; i += size) await this.writeBatchRaw(modName, language, entries.slice(i, i + size));
      this.core.logger.log(`小批量重试完成: ${modName}/${language}`, 'DEBUG');
    }
  }

  private async writeBatchRaw(
    modName: string,
    language: LanguageCode,
    entries: Array<{
      translationKey: string;
      text: string;
    }>
  ): Promise<void> {
    const updatedAt = Date.now();
    await this.core.idb.withTransaction([this.STORE], 'readwrite', async (tx: any) => {
      const store = tx.objectStore(this.STORE);
      const records = await Promise.all(entries.map(entry => store.get(['translation', entry.translationKey])));
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const existing = records[i] as TranslationRecord | undefined;
        const record: TranslationRecord = {
          bucket: 'translation',
          id: entry.translationKey,
          translationKey: entry.translationKey,
          translations: {
            ...existing?.translations,
            [language]: entry.text
          },
          sources: {
            ...existing?.sources,
            [language]: modName
          },
          updatedAt
        };
        await store.put(record);
      }
    });
  }

  private async removeOldTranslations(modName: string, language: LanguageCode, translationKeys: Set<string>): Promise<void> {
    if (translationKeys.size === 0) return;
    try {
      await this.core.idb.withTransaction([this.STORE], 'readwrite', async (tx: any) => {
        const store = tx.objectStore(this.STORE);
        for (const translationKey of translationKeys) {
          const record = (await store.get(['translation', translationKey])) as TranslationRecord | undefined;
          if (!record) continue;
          if (record.sources?.[language] !== modName) continue;
          delete record.translations[language];
          delete record.sources[language];
          if (Object.keys(record.translations).length > 0) {
            await store.put(record);
          } else {
            await store.delete(['translation', translationKey]);
          }
          const memory = this.translations.get(translationKey);
          if (memory) {
            delete memory[language];
            if (Object.keys(memory).length === 0) this.translations.delete(translationKey);
          }
        }
      });
      this.textCache.clear();
      this.core.logger.log(`清理旧翻译: ${modName}/${language} ${translationKeys.size} 个`, 'DEBUG');
    } catch (error: any) {
      this.core.logger.log(`清理旧翻译失败: ${error.message}`, 'ERROR');
    }
  }

  private async readFileRecord(modName: string, language: LanguageCode): Promise<FileRecord | null> {
    const cachedHash = this.fileHashes.get(modName)?.get(language);
    try {
      const record = await this.core.idb.withTransaction([this.STORE], 'readonly', async (tx: any) => await tx.objectStore(this.STORE).get(['file', [modName, language]]));
      const fileRecord = (record as FileRecord | undefined) || null;
      if (fileRecord?.hash && fileRecord.hash !== cachedHash) this.setFileHash(modName, language, fileRecord.hash);
      return fileRecord;
    } catch (error: any) {
      this.core.logger.log(`读取翻译文件记录失败: ${modName}/${language} - ${error.message}`, 'DEBUG');
      return null;
    }
  }

  private async writeFileRecord(modName: string, language: LanguageCode, hash: string, keys: string[]): Promise<void> {
    try {
      const record: FileRecord = {
        bucket: 'file',
        id: [modName, language],
        modName,
        language,
        hash,
        keys
      };
      await this.core.idb.withTransaction([this.STORE], 'readwrite', async (tx: any) => await tx.objectStore(this.STORE).put(record));
      this.setFileHash(modName, language, hash);
    } catch (error: any) {
      this.core.logger.log(`保存翻译文件记录失败: ${modName}/${language} - ${error.message}`, 'ERROR');
    }
  }

  private async loadFileTranslations(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      const records = await this.core.idb.withTransaction([this.STORE], 'readonly', async (tx: any) => {
        const store = tx.objectStore(this.STORE);
        return await Promise.all(keys.map(key => store.get(['translation', key])));
      });
      for (const record of records as Array<TranslationRecord | undefined>) if (record) this.translations.set(record.translationKey, record.translations);
    } catch (error: any) {
      this.core.logger.log(`加载翻译缓存失败: ${error.message}`, 'DEBUG');
    }
  }

  private async loadTranslation(translationKey: string): Promise<boolean> {
    try {
      const record = await this.core.idb.withTransaction([this.STORE], 'readonly', async (tx: any) => await tx.objectStore(this.STORE).get(['translation', translationKey]));
      if (!record) return false;
      const translationRecord = record as TranslationRecord;
      this.translations.set(translationRecord.translationKey, translationRecord.translations);
      return true;
    } catch (error: any) {
      this.core.logger.log(`加载翻译失败: ${translationKey} - ${error.message}`, 'DEBUG');
      return false;
    }
  }

  private findLoadedText(text: string): string | null {
    for (const [translationKey, translations] of this.translations) {
      if (translations[this.language] === text) {
        this.textCache.set(text, translationKey);
        return text;
      }
      for (const value of Object.values(translations)) {
        if (value !== text) continue;
        this.textCache.set(text, translationKey);
        return this.t(translationKey);
      }
    }
    return null;
  }

  private async findTextInDB(text: string): Promise<string | null> {
    try {
      const records = await this.core.idb.withTransaction([this.STORE], 'readonly', async (tx: any) => await tx.objectStore(this.STORE).index('bucket').getAll('translation'));
      for (const record of records as TranslationRecord[]) {
        const translations = record.translations;
        if (translations[this.language] === text) {
          this.translations.set(record.translationKey, translations);
          this.textCache.set(text, record.translationKey);
          return record.translationKey;
        }
        for (const value of Object.values(translations)) {
          if (value !== text) continue;
          this.translations.set(record.translationKey, translations);
          this.textCache.set(text, record.translationKey);
          return record.translationKey;
        }
      }
      return null;
    } catch (error: any) {
      this.core.logger.log(`反查翻译失败: ${text} - ${error.message}`, 'DEBUG');
      return null;
    }
  }

  private parseTranslations(content: string, path: string): Record<string, string> {
    const raw = path.endsWith('.json') ? JSON.parse(content) : path.endsWith('.yml') || path.endsWith('.yaml') ? this.core.yaml.load(content) : null;
    if (!raw || typeof raw !== 'object') throw new Error(`翻译文件内容无效: ${path}`);
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (value == null) continue;
      if (typeof value === 'string') {
        result[key] = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        result[key] = String(value);
      }
    }
    return result;
  }

  private async computeHash(data: Record<string, string>): Promise<string> {
    const stableData = Object.keys(data)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = data[key];
          return acc;
        },
        {} as Record<string, string>
      );
    const buffer = new TextEncoder().encode(JSON.stringify(stableData));
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  private getModFile(modName: string, path: string, silent = false): any {
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
    if (!file && !silent) this.core.logger.log(`文件未找到: ${modName}/${path}`, 'ERROR');
    return file || null;
  }

  private setFileHash(modName: string, language: LanguageCode, hash: string): void {
    let hashes = this.fileHashes.get(modName);
    if (!hashes) {
      hashes = new Map<LanguageCode, string>();
      this.fileHashes.set(modName, hashes);
    }
    hashes.set(language, hash);
  }
}

export default LanguageManager;
