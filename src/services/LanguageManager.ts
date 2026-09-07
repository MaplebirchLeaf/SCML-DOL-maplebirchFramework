// ./src/services/LanguageManager.ts

import { Languages, Translations, type LanguageCode } from '../constants';
import type { MaplebirchCore } from '../core';

export type Translation = Record<string, string>;
type LanguageConfig = string[] | Partial<Record<string, string | { file: string }>>;

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

interface LanguageSetting {
  value?: string;
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

interface BatchEntry {
  translationKey: string;
  text: string;
}

class LanguageManager {
  public static readonly DEFAULT_LANGS = Languages as readonly LanguageCode[];
  public static readonly BATCH_SIZE = 500;
  public language: LanguageCode = navigator.language.includes('zh') ? 'CN' : 'EN';
  private readonly STORE = 'language';
  private readonly translations = new Map<string, Translation>();
  private readonly cache = new Map<string, string>();
  private preloaded = false;

  public constructor(readonly core: MaplebirchCore) {
    this.core.once(':indexedDB', () => this.initDB());
    this.core.once(':idbReady', () => this.setLanguage());
  }

  private initDB(): void {
    this.core.idb.register(this.STORE, { keyPath: ['bucket', 'id'] }, [{ name: 'bucket', keyPath: 'bucket', options: { unique: false } }]);
    this.core.addon.hook<LanguageConfig>('language', async ({ modName, config }) => {
      if (Array.isArray(config)) {
        const languages = config.map(language => language.toUpperCase()).filter((language): language is LanguageCode => (Languages as readonly string[]).includes(language));
        for await (const progress of this.import(modName, languages)) if (progress.type === 'error') this.core.log(`导入失败: ${progress.language}`, 'ERROR');
        return;
      }
      for (const [Language, source] of Object.entries(config)) {
        const language = Language.toUpperCase();
        if (!(Languages as readonly string[]).includes(language)) {
          this.core.log(`跳过不支持的语言: ${Language}`, 'WARN');
          continue;
        }
        const file = typeof source === 'string' ? source : source?.file;
        if (!file?.trim()) {
          this.core.log(`语言 ${language} 缺少有效的 file 配置`, 'WARN');
          continue;
        }
        for await (const progress of this.importFile(modName, language as LanguageCode, file.trim())) if (progress.type === 'error') this.core.log(`导入失败: ${progress.language}`, 'ERROR');
      }
    });
  }

  public async setLanguage(language?: string): Promise<LanguageCode> {
    const browserLanguage: LanguageCode = navigator.language.includes('zh') ? 'CN' : 'EN';
    const saved = language ? null : ((await this.core.idb.withTransaction('settings', 'readonly', tx => tx.objectStore('settings').get('Language')).catch(() => null)) as LanguageSetting | null);
    const code = String(language ?? saved?.value ?? browserLanguage).toUpperCase();
    this.language = (LanguageManager.DEFAULT_LANGS as readonly string[]).includes(code) ? (code as LanguageCode) : browserLanguage;
    this.core.logger.log(`语言设置为: ${this.language}`, 'DEBUG');
    return this.language;
  }

  public async *import(modName: string, languages: readonly LanguageCode[] = LanguageManager.DEFAULT_LANGS): AsyncGenerator<ImportProgress> {
    for (const language of languages) {
      let found = false;
      let failed = false;
      let count = 0;

      for (const format of ['json', 'yml', 'yaml']) {
        const path = `translations/${language.toUpperCase()}.${format}`;
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
        } catch (error) {
          failed = true;
          const reason = this.error(error);
          this.core.logger.log(`处理失败: ${modName}/${path} - ${reason.message}`, 'ERROR');
          yield {
            type: 'error',
            language,
            count: 0,
            error: reason
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

  public async *importFile(modName: string, language: LanguageCode, path: string): AsyncGenerator<ImportProgress> {
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
    } catch (error) {
      const reason = this.error(error);
      this.core.logger.log(`加载失败: ${modName}/${path} - ${reason.message}`, 'ERROR');
      yield {
        type: 'error',
        language,
        count: 0,
        error: reason
      };
    }
  }

  public t(translationKey: string, space = false): string {
    const translations = this.translations.get(translationKey);
    if (!translations) {
      void this.loadTranslation(translationKey);
      return `[${translationKey}]`;
    }
    const result = translations[this.language] ?? translations.EN ?? Object.values(translations).find(Boolean) ?? `[${translationKey}]`;
    return this.language === 'EN' && space && result[0] !== '[' ? `${result} ` : result;
  }

  public auto(text: string): string {
    if (!text) return text;
    const translationKey = this.cache.get(text);
    return translationKey ? this.t(translationKey) : text;
  }

  public has(translationKey: string): boolean {
    const translations = this.translations.get(translationKey);
    if (!translations) return false;
    return Boolean(translations[this.language] ?? translations.EN ?? Object.values(translations).find(Boolean));
  }

  public set(translationKey: string, translations: Record<string, unknown>): boolean {
    if (!translationKey.trim()) {
      this.core.logger.log(`无效的翻译键: ${translationKey}`, 'WARN');
      return false;
    }

    const normalized: Translation = {};
    for (const [language, value] of Object.entries(translations)) {
      const code = language.toUpperCase();
      if (!(LanguageManager.DEFAULT_LANGS as readonly string[]).includes(code)) {
        this.core.logger.log(`跳过不支持的语言: ${language}`, 'WARN');
        continue;
      }
      if (typeof value === 'string') {
        normalized[code] = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        normalized[code] = String(value);
      } else if (value != null) {
        this.core.logger.log(`跳过无效翻译值: ${translationKey}/${code}`, 'WARN', value);
      }
    }

    if (!Object.keys(normalized).length) {
      this.core.logger.log(`翻译 ${translationKey} 没有有效内容`, 'WARN');
      return false;
    }
    this.translations.set(translationKey, {
      ...this.translations.get(translationKey),
      ...normalized
    });

    this.rebuild();

    return true;
  }

  public async preload(): Promise<void> {
    if (this.preloaded) return;

    try {
      await this.loadBundledTranslations();
      const records = (await this.core.idb.withTransaction(this.STORE, 'readonly', tx => tx.objectStore(this.STORE).index('bucket').getAll('translation'))) as TranslationRecord[];
      for (const record of records) this.translations.set(record.translationKey, record.translations);
      this.rebuild();
      this.preloaded = true;
      this.core.logger.log(`预加载完成: ${records.length} 条`, 'DEBUG');
    } catch (error) {
      this.core.logger.log(`预加载失败: ${this.error(error).message}`, 'ERROR');
    }
  }

  public async clearStorage(): Promise<void> {
    try {
      await this.core.idb.clearStore(this.STORE);
      this.translations.clear();
      this.cache.clear();
      this.preloaded = false;
      this.core.logger.log('语言数据库已清空', 'DEBUG');
    } catch (error) {
      this.core.logger.log(`清空语言数据库失败: ${this.error(error).message}`, 'ERROR');
    }
  }

  private async loadBundledTranslations(): Promise<void> {
    for (const language of LanguageManager.DEFAULT_LANGS) {
      const content = Translations[language];
      if (!content) continue;
      const path = `translations/${language.toUpperCase()}.yaml`;
      const translations = this.parseTranslations(content, path);
      for await (const progress of this.writeTranslations('maplebirch', language, translations)) if (progress.progress >= 100) continue;
    }
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
    const keys = Object.keys(translations);
    const total = keys.length;

    if (!total) {
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

    const newKeys = new Set(keys);
    const removedKeys = new Set((fileRecord?.keys ?? []).filter(key => !newKeys.has(key)));
    await this.removeOldTranslations(modName, language, removedKeys);
    let current = 0;

    for (let i = 0; i < keys.length; i += LanguageManager.BATCH_SIZE) {
      const batch = keys.slice(i, i + LanguageManager.BATCH_SIZE).map<BatchEntry>(translationKey => ({
        translationKey,
        text: translations[translationKey]
      }));
      await this.writeBatch(modName, language, batch);
      for (const entry of batch) this.translations.set(entry.translationKey, { ...this.translations.get(entry.translationKey), [language]: entry.text });
      current += batch.length;
      yield {
        progress: Math.min(100, Math.floor((current / total) * 100)),
        current,
        total
      };
    }
    await this.writeFileRecord(modName, language, hash, keys);
    this.rebuild();
    this.core.logger.log(`加载翻译: ${modName}/${language} (${total} 项)`, 'DEBUG');
  }

  private async writeBatch(modName: string, language: LanguageCode, entries: BatchEntry[]): Promise<void> {
    const updatedAt = Date.now();
    await this.core.idb.withTransaction(this.STORE, 'readwrite', async tx => {
      const store = tx.objectStore(this.STORE);
      const records = (await Promise.all(entries.map(entry => store.get(['translation', entry.translationKey])))) as Array<TranslationRecord | undefined>;
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const existing = records[i];
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
    if (!translationKeys.size) return;
    const removed: string[] = [];
    await this.core.idb.withTransaction(this.STORE, 'readwrite', async tx => {
      const store = tx.objectStore(this.STORE);
      for (const translationKey of translationKeys) {
        const record = (await store.get(['translation', translationKey])) as TranslationRecord | undefined;
        if (!record) continue;
        if (record.sources[language] !== modName) continue;
        delete record.translations[language];
        delete record.sources[language];
        if (Object.keys(record.translations).length) {
          await store.put(record);
        } else {
          await store.delete(['translation', translationKey]);
        }
        removed.push(translationKey);
      }
    });

    for (const translationKey of removed) {
      const translations = this.translations.get(translationKey);
      if (!translations) continue;
      delete translations[language];
      if (!Object.keys(translations).length) this.translations.delete(translationKey);
    }
    this.rebuild();
    this.core.logger.log(`清理旧翻译: ${modName}/${language} ${removed.length} 个`, 'DEBUG');
  }

  private async readFileRecord(modName: string, language: LanguageCode): Promise<FileRecord | null> {
    const record = await this.core.idb.withTransaction(this.STORE, 'readonly', tx => tx.objectStore(this.STORE).get(['file', [modName, language]]));
    return (record as FileRecord | undefined) ?? null;
  }

  private async writeFileRecord(modName: string, language: LanguageCode, hash: string, keys: string[]): Promise<void> {
    const record: FileRecord = {
      bucket: 'file',
      id: [modName, language],
      modName,
      language,
      hash,
      keys
    };

    await this.core.idb.withTransaction(this.STORE, 'readwrite', tx => tx.objectStore(this.STORE).put(record));
  }

  private async loadFileTranslations(keys: string[]): Promise<void> {
    if (!keys.length) return;
    const records = await this.core.idb.withTransaction(this.STORE, 'readonly', tx => {
      const store = tx.objectStore(this.STORE);
      return Promise.all(keys.map(key => store.get(['translation', key])));
    });
    for (const record of records as Array<TranslationRecord | undefined>) {
      if (!record) continue;
      this.translations.set(record.translationKey, record.translations);
    }
    this.rebuild();
  }

  private async loadTranslation(translationKey: string): Promise<boolean> {
    try {
      const record = (await this.core.idb.withTransaction(this.STORE, 'readonly', tx => tx.objectStore(this.STORE).get(['translation', translationKey]))) as TranslationRecord | undefined;
      if (!record) return false;
      this.translations.set(record.translationKey, record.translations);
      this.rebuild();
      return true;
    } catch (error) {
      this.core.logger.log(`加载翻译失败: ${translationKey} - ${this.error(error).message}`, 'DEBUG');
      return false;
    }
  }

  private parseTranslations(content: string, path: string): Record<string, string> {
    const raw: unknown = path.endsWith('.json') ? JSON.parse(content) : path.endsWith('.yml') || path.endsWith('.yaml') ? this.core.yaml.load(content) : null;
    if (!raw || typeof raw !== 'object') throw new Error(`翻译文件内容无效: ${path}`);
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        result[key] = String(value);
      }
    }
    return result;
  }

  private async computeHash(data: Record<string, string>): Promise<string> {
    const stable = Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)));
    const buffer = new TextEncoder().encode(JSON.stringify(stable));
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private getModFile(modName: string, path: string, silent = false) {
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
    return file ?? null;
  }

  private rebuild(): void {
    this.cache.clear();
    for (const [translationKey, translations] of this.translations) for (const text of Object.values(translations)) if (text) this.cache.set(text, translationKey);
  }

  private error(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }
}

export default LanguageManager;
