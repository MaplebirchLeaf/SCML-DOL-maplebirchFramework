// ./src/services/Translator.ts

import { Languages, Translations, type LanguageCode } from '../constants';
import jsyaml from 'js-yaml';
import type ModLoader from '../host/ModLoader';
import Catalog from '../infra/Catalog';
import Diagnostics from '../infra/Diagnostics';
import type Emitter from '../infra/Emitter';
import type IndexedDB from './IndexedDB';

export type Translation = Record<string, string>;
type LanguageFiles = string | string[];
type LanguageConfig = string[] | Partial<Record<string, LanguageFiles | { file: LanguageFiles }>>;

interface SourceTranslation {
  text: string;
  order: number;
}

interface TranslationRecord {
  bucket: 'translation';
  id: string;
  translationKey: string;
  translations: Translation;
  sources: Partial<Record<LanguageCode, string>>;
  contributions?: Partial<Record<LanguageCode, Record<string, SourceTranslation>>>;
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

interface TranslationAddon {
  hook<T>(name: string, handler: (task: { modName: string; config: T }) => void | Promise<void>): boolean;
}

export class Translator extends Catalog<string, Translation> {
  public static readonly DEFAULT_LANGS = Languages as readonly LanguageCode[];
  public static readonly BATCH_SIZE = 500;
  public language: LanguageCode = navigator.language.includes('zh') ? 'CN' : 'EN';
  private readonly STORE = 'language';
  private readonly cache = new Map<string, string>();
  private readonly sourceOrders = new Map<LanguageCode, Map<string, number>>();
  private preloaded = false;

  public constructor(
    readonly idb: IndexedDB,
    modloader: ModLoader,
    readonly events: Emitter,
    private readonly addon: () => TranslationAddon | undefined
  ) {
    super(modloader);
    this.events.once(':indexedDB', () => this.initDB());
    this.events.once(':idbReady', () => this.setLanguage());
  }

  private initDB(): void {
    this.idb.define(this.STORE, { keyPath: ['bucket', 'id'] }, [{ name: 'bucket', keyPath: 'bucket', options: { unique: false } }]);
    this.addon()?.hook<LanguageConfig>('language', async ({ modName, config }) => {
      if (Array.isArray(config)) {
        const languages = config.map(language => language.toUpperCase()).filter((language): language is LanguageCode => (Languages as readonly string[]).includes(language));
        for await (const progress of this.import(modName, languages)) if (progress.type === 'error') this.write(`导入失败: ${progress.language}`, 'ERROR', 'translator');
        return;
      }
      for (const [Language, source] of Object.entries(config)) {
        const language = Language.toUpperCase();
        if (!(Languages as readonly string[]).includes(language)) {
          this.write(`跳过不支持的语言: ${Language}`, 'WARN', 'translator');
          continue;
        }
        const value = typeof source === 'string' || Array.isArray(source) ? source : source?.file;
        const files = Array.isArray(value) ? value : [value];
        if (!files.length || !files.every((file): file is string => typeof file === 'string' && !!file.trim())) {
          this.write(`语言 ${language} 缺少有效的 file 配置`, 'WARN', 'translator');
          continue;
        }
        for await (const progress of this.importFile(
          modName,
          language as LanguageCode,
          files.map(file => file.trim())
        ))
          if (progress.type === 'error') this.write(`导入失败: ${progress.language}`, 'ERROR', 'translator');
      }
    });
  }

  public async setLanguage(language?: string): Promise<LanguageCode> {
    const browserLanguage: LanguageCode = navigator.language.includes('zh') ? 'CN' : 'EN';
    const saved = language
      ? null
      : ((await this.idb
          .with('settings', 'readonly', tx => tx.objectStore('settings').get('Language'))
          .catch(error => {
            this.write(`语言设置读取失败: ${Diagnostics.message(error)}`, 'WARN', 'translator');
            return null;
          })) as LanguageSetting | null);
    const code = String(language ?? saved?.value ?? browserLanguage).toUpperCase();
    this.language = (Translator.DEFAULT_LANGS as readonly string[]).includes(code) ? (code as LanguageCode) : browserLanguage;
    this.write(`语言设置为: ${this.language}`, 'DEBUG');
    return this.language;
  }

  public async *import(modName: string, languages: readonly LanguageCode[] = Translator.DEFAULT_LANGS): AsyncGenerator<ImportProgress> {
    for (const language of languages) {
      const paths: string[] = [];
      for (const format of ['json', 'yml', 'yaml']) {
        const path = `translations/${language.toUpperCase()}.${format}`;
        if (this.getModFile(modName, path, true)) paths.push(path);
      }
      if (!paths.length) {
        this.write(`找不到 ${language} 翻译文件`, 'WARN');
        yield {
          type: 'not_found',
          language,
          count: 0,
          error: new Error('未找到翻译文件')
        };
        continue;
      }
      yield* this.importFile(modName, language, paths);
    }
  }

  public async *importFile(modName: string, language: LanguageCode, paths: string | readonly string[]): AsyncGenerator<ImportProgress> {
    const files = typeof paths === 'string' ? [paths] : paths;
    if (!files.length) return;
    const translations: Record<string, string> = {};
    try {
      for (const path of files) {
        const file = this.getModFile(modName, path);
        if (!file) {
          yield { type: 'not_found', language, count: 0, error: new Error(`未找到翻译文件: ${modName}/${path}`) };
          return;
        }
        Object.assign(translations, this.parseTranslations(await file.async('string'), path));
      }
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
      const reason = error instanceof Error ? error : new Error(Diagnostics.message(error));
      this.write(`加载失败: ${modName}/${files.join(', ')} - ${reason.message}`, 'ERROR');
      yield {
        type: 'error',
        language,
        count: 0,
        error: reason
      };
    }
  }

  public t(translationKey: string, space = false): string {
    const translations = this.items.get(translationKey);
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
    const translations = this.items.get(translationKey);
    if (!translations) return false;
    return Boolean(translations[this.language] ?? translations.EN ?? Object.values(translations).find(Boolean));
  }

  public set(translationKey: string, translations: Record<string, unknown>): boolean {
    if (!translationKey.trim()) {
      this.write(`无效的翻译键: ${translationKey}`, 'WARN');
      return false;
    }

    const normalized: Translation = {};
    for (const [language, value] of Object.entries(translations)) {
      const code = language.toUpperCase();
      if (!(Translator.DEFAULT_LANGS as readonly string[]).includes(code)) {
        this.write(`跳过不支持的语言: ${language}`, 'WARN');
        continue;
      }
      if (typeof value === 'string') {
        normalized[code] = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        normalized[code] = String(value);
      } else if (value != null) {
        this.write(`跳过无效翻译值: ${translationKey}/${code}`, 'WARN', 'translator', value);
      }
    }

    if (!Object.keys(normalized).length) {
      this.write(`翻译 ${translationKey} 没有有效内容`, 'WARN');
      return false;
    }
    this.items.set(translationKey, {
      ...this.items.get(translationKey),
      ...normalized
    });

    this.rebuild();

    return true;
  }

  public async preload(): Promise<void> {
    if (this.preloaded) return;

    try {
      await this.loadBundledTranslations();
      const records = (await this.idb.with(this.STORE, 'readonly', tx => tx.objectStore(this.STORE).index('bucket').getAll('translation'))) as TranslationRecord[];
      for (const record of records) {
        const translations = this.visibleTranslations(record);
        if (Object.keys(translations).length) this.items.set(record.translationKey, translations);
        else this.items.delete(record.translationKey);
      }
      this.rebuild();
      this.preloaded = true;
      this.write(`预加载完成: ${records.length} 条`, 'DEBUG');
    } catch (error) {
      this.write(`预加载失败: ${Diagnostics.message(error)}`, 'ERROR');
    }
  }

  public async clearStorage(): Promise<void> {
    try {
      await this.idb.clearStore(this.STORE);
      this.items.clear();
      this.cache.clear();
      this.sourceOrders.clear();
      this.preloaded = false;
      this.write('语言数据库已清空', 'DEBUG');
    } catch (error) {
      this.write(`清空语言数据库失败: ${Diagnostics.message(error)}`, 'ERROR');
    }
  }

  private async loadBundledTranslations(): Promise<void> {
    for (const language of Translator.DEFAULT_LANGS) {
      const contents = Translations[language];
      if (!contents?.length) continue;
      const translations = Object.assign({}, ...contents.map(content => this.parseTranslations(content, `translations/${language}.yaml`))) as Record<string, string>;
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
    let sourceOrder = this.sourceOrders.get(language);
    if (!sourceOrder) {
      sourceOrder = new Map<string, number>();
      this.sourceOrders.set(language, sourceOrder);
    }
    if (!sourceOrder.has(modName)) sourceOrder.set(modName, sourceOrder.size);
    const hash = await this.computeHash(translations);
    const fileRecord = await this.readFileRecord(modName, language);

    const newKeys = new Set(keys);
    const removedKeys = new Set((fileRecord?.keys ?? []).filter(key => !newKeys.has(key)));
    await this.removeOldTranslations(modName, language, removedKeys);
    let current = 0;

    for (let i = 0; i < keys.length; i += Translator.BATCH_SIZE) {
      const batch = keys.slice(i, i + Translator.BATCH_SIZE).map<BatchEntry>(translationKey => ({
        translationKey,
        text: translations[translationKey]
      }));
      const records = await this.writeBatch(modName, language, batch);
      for (const record of records) this.syncTranslation(record, language);
      current += batch.length;
      yield {
        progress: Math.min(100, Math.floor((current / total) * 100)),
        current,
        total
      };
    }
    if (hash !== fileRecord?.hash) await this.writeFileRecord(modName, language, hash, keys);
    this.rebuild();
    if (!total) yield { progress: 100, current: 0, total: 0 };
    this.write(`加载翻译: ${modName}/${language} (${total} 项)`, 'DEBUG');
  }

  private async writeBatch(modName: string, language: LanguageCode, entries: BatchEntry[]): Promise<TranslationRecord[]> {
    return this.idb.with(this.STORE, 'readwrite', async tx => {
      const store = tx.objectStore(this.STORE);
      const records = (await Promise.all(entries.map(entry => store.get(['translation', entry.translationKey])))) as Array<TranslationRecord | undefined>;
      const merged: TranslationRecord[] = [];
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const record: TranslationRecord = records[i] ?? {
          bucket: 'translation',
          id: entry.translationKey,
          translationKey: entry.translationKey,
          translations: {},
          sources: {},
          updatedAt: 0
        };
        if (this.updateSource(record, modName, language, entry.text)) {
          record.updatedAt = Date.now();
          await store.put(record);
        }
        merged.push(record);
      }
      return merged;
    });
  }

  private async removeOldTranslations(modName: string, language: LanguageCode, translationKeys: Set<string>): Promise<void> {
    if (!translationKeys.size) return;
    const merged: TranslationRecord[] = [];
    await this.idb.with(this.STORE, 'readwrite', async tx => {
      const store = tx.objectStore(this.STORE);
      for (const translationKey of translationKeys) {
        const record = (await store.get(['translation', translationKey])) as TranslationRecord | undefined;
        if (!record) continue;
        if (this.updateSource(record, modName, language)) {
          if (Object.keys(record.translations).length || Object.keys(record.contributions ?? {}).length) {
            record.updatedAt = Date.now();
            await store.put(record);
          } else {
            await store.delete(['translation', translationKey]);
          }
        }
        merged.push(record);
      }
    });

    for (const record of merged) this.syncTranslation(record, language);
    this.rebuild();
    this.write(`清理旧翻译: ${modName}/${language} ${merged.length} 个`, 'DEBUG');
  }

  private updateSource(record: TranslationRecord, modName: string, language: LanguageCode, text?: string): boolean {
    const sourceOrder = this.sourceOrders.get(language)!;
    let contributions = { ...record.contributions?.[language] };
    let changed = false;
    const owner = record.sources[language];
    if (owner && !Object.hasOwn(contributions, owner) && record.translations[language] !== undefined) {
      contributions = { ...contributions, [owner]: { text: record.translations[language], order: sourceOrder.get(owner) ?? -1 } };
      changed = true;
    }
    if (text === undefined) {
      changed ||= Object.hasOwn(contributions, modName);
      delete contributions[modName];
    } else {
      const order = sourceOrder.get(modName)!;
      changed ||= contributions[modName]?.text !== text || contributions[modName]?.order !== order;
      contributions = { ...contributions, [modName]: { text, order } };
    }
    const active = this.activeSources();
    let winner: [string, SourceTranslation] | undefined;
    for (const entry of Object.entries(contributions)) {
      if (!active.has(entry[0])) continue;
      const order = sourceOrder.get(entry[0]) ?? entry[1].order;
      if (!winner || order >= (sourceOrder.get(winner[0]) ?? winner[1].order)) winner = entry;
    }
    changed ||= record.sources[language] !== winner?.[0] || record.translations[language] !== winner?.[1].text;
    record.contributions ??= {};
    if (Object.keys(contributions).length) record.contributions[language] = contributions;
    else delete record.contributions[language];
    if (winner) {
      record.sources[language] = winner[0];
      record.translations[language] = winner[1].text;
    } else {
      delete record.sources[language];
      delete record.translations[language];
    }
    return changed;
  }

  private activeSources(): Set<string> {
    return new Set(['maplebirch', ...this.modloader!.modUtils.getModListNameNoAlias()]);
  }

  private visibleTranslations(record: TranslationRecord): Translation {
    const active = this.activeSources();
    const translations: Translation = {};
    for (const language of Translator.DEFAULT_LANGS) {
      const contributions = record.contributions?.[language];
      if (!contributions) {
        const owner = record.sources[language];
        const text = record.translations[language];
        if (text !== undefined && (!owner || active.has(owner))) translations[language] = text;
        continue;
      }
      const order = this.sourceOrders.get(language);
      let winner: SourceTranslation | undefined;
      let winningOrder = -Infinity;
      for (const [source, contribution] of Object.entries(contributions)) {
        if (!active.has(source)) continue;
        const priority = order?.get(source) ?? contribution.order;
        if (priority >= winningOrder) {
          winner = contribution;
          winningOrder = priority;
        }
      }
      if (winner) translations[language] = winner.text;
    }
    return translations;
  }

  private syncTranslation(record: TranslationRecord, language: LanguageCode): void {
    const visible = this.visibleTranslations(record);
    const translations = { ...visible, ...this.items.get(record.translationKey) };
    if (Object.hasOwn(visible, language)) translations[language] = visible[language];
    else delete translations[language];
    if (Object.keys(translations).length) this.items.set(record.translationKey, translations);
    else this.items.delete(record.translationKey);
  }

  private async readFileRecord(modName: string, language: LanguageCode): Promise<FileRecord | null> {
    const record = await this.idb.with(this.STORE, 'readonly', tx => tx.objectStore(this.STORE).get(['file', [modName, language]]));
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

    await this.idb.with(this.STORE, 'readwrite', tx => tx.objectStore(this.STORE).put(record));
  }

  private async loadTranslation(translationKey: string): Promise<boolean> {
    try {
      const record = (await this.idb.with(this.STORE, 'readonly', tx => tx.objectStore(this.STORE).get(['translation', translationKey]))) as TranslationRecord | undefined;
      if (!record) return false;
      const translations = this.visibleTranslations(record);
      if (!Object.keys(translations).length) return false;
      this.items.set(record.translationKey, translations);
      this.rebuild();
      return true;
    } catch (error) {
      this.write(`加载翻译失败: ${translationKey} - ${Diagnostics.message(error)}`, 'DEBUG');
      return false;
    }
  }

  private parseTranslations(content: string, path: string): Record<string, string> {
    const raw: unknown = path.endsWith('.json') ? JSON.parse(content) : path.endsWith('.yml') || path.endsWith('.yaml') ? jsyaml.load(content) : null;
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
    const modLoader = this.modloader!.modLoader;
    if (!modLoader) {
      this.write('Mod 加载器未设置', 'ERROR');
      return null;
    }
    const modZip = modLoader.getModZip(modName);
    if (!modZip) {
      this.write(`找不到 Mod: ${modName}`, 'ERROR');
      return null;
    }
    const file = modZip.zip.file(path);
    if (!file && !silent) this.write(`文件未找到: ${modName}/${path}`, 'ERROR');
    return file ?? null;
  }

  private rebuild(): void {
    this.cache.clear();
    for (const [translationKey, translations] of this.items) for (const text of Object.values(translations)) if (text) this.cache.set(text, translationKey);
  }
}

export default Translator;
