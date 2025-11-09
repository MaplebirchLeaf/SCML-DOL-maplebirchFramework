// @ts-check
/// <reference path='../maplebirch.d.ts' />
(async() => {
  'use strict';
  const frameworkVersion = '2.5.0';
  const lastUpdate = '2025.10.29';
  const lastModifiedBy = '楓樺葉';
  const DEBUGMODE = true;

  const ModuleState = {
    PENDING: 0,
    MOUNTED: 1,
    ERROR: 2
  };

  if (window.maplebirch) return;

  let yaml = window.jsyaml;
  if (!yaml) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js';
    script.onload = () => yaml = window.jsyaml;
    script.onerror = () => yaml = { load: JSON.parse };
    document.head.appendChild(script);
  }

  class Logger {
    /** @type {Object<string, {level: number, tag: string, style: string}>} */
    static LogConfig = {
      DEBUG: { level: 0, tag: '[调试]', style: 'color: #9E9E9E; font-weight: bold;' },
      INFO:  { level: 1, tag: '[信息]', style: 'color: #2E7D32; font-weight: bold;' },
      WARN:  { level: 2, tag: '[警告]', style: 'color: #FF8F00; font-weight: bold;' },
      ERROR: { level: 3, tag: '[错误]', style: 'color: #C62828; font-weight: bold;' }
    };
    /** @type {Object<string|number, string|number>} */
    static LogLevel = (() => {
      /** @type {Object<string|number, string|number>} */
      const map = {};
      Object.entries(Logger.LogConfig).forEach(([name, cfg]) => {
        map[name] = cfg.level;
        map[cfg.level] = name;
      });
      return map;
    })();
    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.core = core;
      const start = DEBUGMODE ? 'DEBUG' : 'INFO';
      this.level = Logger.LogLevel[start] ?? Logger.LogLevel.INFO;
    }
    /**
     * 记录日志
     * @param {string} message 日志消息
     * @param {string|number} [levelName] 日志级别(字符串或数字)
     * @param {...any} objects 额外对象
     */
    log(message, levelName = 'INFO', ...objects) {
      try {
        const lname = ('' + (levelName || 'INFO')).toUpperCase();
        const config = Logger.LogConfig[lname] || Logger.LogConfig.INFO;
        if (config.level < this.level) return;
        console.log(`%c[maplebirch]${config.tag} ${message}`, config.style);
        if (objects && objects.length > 0) objects.forEach(o => console.dir(o));
        if (this.core.modUtils && this.core.modUtils.getLogger) {
          const modLogger = this.core.modUtils.getLogger();
          if (modLogger) {
            if (lname === 'WARN' && modLogger.warn) {
              modLogger.warn(message);
            } else if (lname === 'ERROR' && modLogger.error) {
              modLogger.error(message);
            }
          }
        }
      } catch (e) {
        try { console.error('[Logger] 写日志失败:', e); } catch (_) { }
      }
    }
    
    set LevelName(levelName) {
      if (!levelName) return;
      const u = ('' + levelName).toUpperCase();
      if (!(u in Logger.LogConfig)) { this.log(`无效日志级别: ${levelName}`, 'WARN'); return; }
      this.level = Logger.LogConfig[u].level;
      this.log(`日志级别变更为: ${u}`, u);
    }

    get LevelName() {
      return Logger.LogLevel[this.level] || 'INFO';
    }
  }

  class LanguageManager {
    static DEFAULT_LANGS = ['EN', 'CN'];
    static DEFAULT_IMPORT_CONCURRENCY = 2;    // 默认并发导入数
    static DEFAULT_BATCH_SIZE = 500;          // 默认批处理大小
    static DEFAULT_PRELOAD_YIELD = 500;       // 默认预加载让步间隔
    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.core = core;
      this.language = this.#detectLanguage();  // 自动检测语言
      this.translations = new Map();           // 内存翻译缓存
      this.cache = new Map();                  // 文本->键名缓存
      this.db = null;                          // IndexedDB引用
      this.isPreloaded = false;                // 预加载状态标志
      this.fileHashes = new Map();             // 文件哈希缓存
      this.#initConfig();                      // 初始化配置
    }

    #initConfig() {
      this.#importConcurrency = LanguageManager.DEFAULT_IMPORT_CONCURRENCY;
      this.#batchSize = LanguageManager.DEFAULT_BATCH_SIZE;
      this.#preloadYieldEvery = LanguageManager.DEFAULT_PRELOAD_YIELD;
    }

    #detectLanguage() {
      // @ts-ignore
      const lang = navigator.language || navigator.userLanguage || 'en';
      return lang.includes('zh') ? 'CN' : 'EN';
    }
    /** 初始化翻译数据库 @returns {Promise<void>} */
    async initDatabase() {
      if (this.db) return;
      try {
        const idbRef = this.core.modUtils.getIdbRef();
        const dbName = 'maplebirch_translations';
        this.db = await idbRef.idb_openDB(dbName, 2, {
          /** @param {any} db @param {number} oldVersion @param {number} newVersion @param {any} transaction */
          upgrade: (db, oldVersion, newVersion, transaction) => {
            if (!db.objectStoreNames.contains('metadata')) db.createObjectStore('metadata', { keyPath: 'key' });
            if (!db.objectStoreNames.contains('translations')) {
              const store = db.createObjectStore('translations', { keyPath: 'key' });
              store.createIndex('mod', 'mod', { multiEntry: false });
              store.createIndex('language', 'language', { multiEntry: true });
            }
            if (!db.objectStoreNames.contains('text_index')) {
              const textStore = db.createObjectStore('text_index', { autoIncrement: true });
              textStore.createIndex('text_value', 'text_value', { unique: false });
              textStore.createIndex('key', 'key', { unique: false });
            }
          }
        });
        this.core.logger.log('翻译数据库初始化成功', 'DEBUG');
      } catch (/** @type {any} */err) {
        this.core.logger.log(`翻译数据库初始化失败: ${err?.message || err}`, 'ERROR');
        this.db = null;
      }
    }
    /** 设置当前语言 @param {string} lang 语言代码 */
    setLanguage(lang) {
      if (!lang) return;
      this.language = ('' + lang).toUpperCase();
      this.cache.clear();
      this.core.logger.log(`语言设置为: ${this.language}`, 'DEBUG');
    }
    /**
     * 导入所有语言的翻译文件
     * @param {string} modName 模块名称
     * @param {string[]} [languages] 语言列表，默认为 DEFAULT_LANGS
     * @returns {Promise<boolean>} 是否全部导入成功
     */
    async importAllLanguages(modName, languages = LanguageManager.DEFAULT_LANGS) {
      if (!this.core.modLoader) { this.core.logger.log('Mod 加载器未设置，无法导入翻译', 'ERROR'); return false; }
      const concurrency = this.#importConcurrency;
      const tasks = [];
      for (const lang of languages) {
        tasks.push(async () => {
          const formats = ['json', 'yml', 'yaml'];
          let foundAny = false;
          let loadedAny = false;
          /** @type {Object<string, string>} */
          const allTranslations = {};
          for (const format of formats) {
            const filePath = `translations/${lang.toLowerCase()}.${format}`;
            const modZip = this.core.modLoader.getModZip(modName);
            if (!modZip || !modZip.zip.file(filePath)) continue;
            foundAny = true;
            this.core.logger.log(`找到 ${lang} 语言翻译文件: ${filePath}`, 'DEBUG');
            try {
              const file = modZip.zip.file(filePath);
              const content = await file.async('text');
              let data;
              if (filePath.endsWith('.json')) {
                data = JSON.parse(content);
              } else if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
                data = yaml.load(content);
              }
              Object.assign(allTranslations, data);
              loadedAny = true;
              this.core.logger.log(`成功加载翻译内容: ${filePath}`, 'DEBUG');
            } catch (/** @type {any} */err) {
              this.core.logger.log(`加载失败: ${filePath} - ${err?.message || err}`, 'ERROR');
            }
          }
          if (!foundAny) { this.core.logger.log(`找不到 ${lang} 语言的翻译文件`, 'WARN'); return false; }
          if (!loadedAny) { this.core.logger.log(`找到 ${lang} 语言的翻译文件但全部加载失败`, 'WARN'); return false; }
          const result = await this.#processTranslations(modName, lang, allTranslations);
          if (result) this.core.logger.log(`成功处理 ${lang} 语言翻译 (${Object.keys(allTranslations).length} 项)`, 'DEBUG');
          return result;
        });
      }
      const results = [];
      for (let i = 0; i < tasks.length; i += concurrency) {
        const batch = tasks.slice(i, i + concurrency).map(fn => fn());
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
      }
      return results.every(Boolean);
    }
    /**
     * 加载指定翻译文件
     * @param {string} modName 模块名称
     * @param {string} languageCode 语言代码
     * @param {string} filePath 文件路径
     * @returns {Promise<boolean>} 是否成功加载
     */
    async loadTranslations(modName, languageCode, filePath) {
      if (!this.core.modLoader) { this.core.logger.log('Mod 加载器未设置', 'ERROR'); return false; }
      const modZip = this.core.modLoader.getModZip(modName);
      if (!modZip) { this.core.logger.log(`找不到 Mod: ${modName}`, 'ERROR'); return false; }
      const file = modZip.zip.file(filePath);
      if (!file) return false;
      try {
        const content = await file.async('text');
        let data;
        if (filePath.endsWith('.json')) {
          try {
            data = JSON.parse(content);
          } catch (/** @type {any} */jsonErr) {
            this.core.logger.log(`JSON 解析失败: ${filePath} - ${jsonErr.message}`, 'ERROR');
            return false;
          }
        } else if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
          try {
            data = yaml.load(content);
          } catch (/** @type {any} */yamlErr) {
            this.core.logger.log(`YAML 解析失败: ${filePath} - ${yamlErr.message}`, 'ERROR');
            return false;
          }
        } else {
          this.core.logger.log(`不支持的文件格式: ${filePath}`, 'ERROR');
          return false;
        }
        return await this.#processTranslations(modName, languageCode, data);
      } catch (/** @type {any} */err) {
        this.core.logger.log(`加载失败: ${modName}/${filePath} - ${err?.message || err}`, 'ERROR');
        return false;
      }
    }
    /** 获取翻译文本 @param {string} key 翻译键名 @param {boolean} [space=false] 是否在英文后添加空格 @returns {string} 翻译后的文本 */
    t(key, space=false) {
      const rec = this.translations.get(key);
      if (!rec) {
        this.#loadTranslationFromIDB(key);
        return `[${key}]`;
      }
      let result = rec[this.language] || rec.EN || Object.values(rec)[0] || `[${key}]`;
      if (this.language === 'EN' && space === true) return result + ' ';
      return result;
    }
    /** 自动翻译文本 @param {string} sourceText 源文本 @returns {string} 翻译后的文本 */
    autoTranslate(sourceText) {
      if (!sourceText) return sourceText;
      if (this.#isCurrentLanguage(sourceText)) return sourceText;
      if (this.cache.has(sourceText)) return this.t(this.cache.get(sourceText));
      for (const [key, trans] of this.translations) {
        for (const lang in trans) {
          if (trans[lang] === sourceText) {
            this.cache.set(sourceText, key);
            return this.t(key);
          }
        }
      }
      this.#findKeyByTextAsync(sourceText);
      return sourceText;
    }

    async preloadAllTranslations() {
      if (!this.db || this.isPreloaded) return;
      try {
        const tx = this.db.transaction('translations', 'readonly');
        const store = tx.objectStore('translations');
        let cursor = await store.openCursor();
        let count = 0;
        while (cursor) {
          const rec = cursor.value;
          this.translations.set(rec.key, rec.translations || {});
          count++;
          if (count % this.#preloadYieldEvery === 0) await new Promise(r => setTimeout(r, 0));
          cursor = await cursor.continue();
        }
        this.isPreloaded = true;
        this.core.logger.log(`预加载完成: ${count} 条翻译`, 'INFO');
      } catch (/** @type {any} */err) {
        this.core.logger.log(`预加载失败: ${err?.message || err}`, 'ERROR');
      }
    }

    async clearDatabase() {
      if (!this.db) return;
      try {
        const idbRef = this.core.modUtils.getIdbRef();
        await idbRef.idb_deleteDB('maplebirch_translations');
        this.db = null;
        this.isPreloaded = false;
        this.translations.clear();
        this.cache.clear();
        this.fileHashes.clear();
        this.core.logger.log('翻译数据库已清空', 'DEBUG');
        await this.initDatabase();
      } catch (/** @type {any} */err) {
        this.core.logger.log(`数据库清空失败: ${err?.message || err}`, 'ERROR');
      }
    }

    async cleanOldVersions() {
      if (!this.db) return;
      try {
        const tx = this.db.transaction('metadata', 'readwrite');
        const store = tx.objectStore('metadata');
        const all = await store.getAll();
        const latest = new Map();
        for (const rec of all) {
          const base = rec.key.split('_')[0];
          if (!latest.has(base) || latest.get(base).timestamp < rec.timestamp) latest.set(base, rec);
        }
        for (const rec of all) {
          const base = rec.key.split('_')[0];
          if (latest.get(base).key !== rec.key) await store.delete(rec.key);
        }
        this.core.logger.log('清理旧版本翻译数据完成', 'INFO');
      } catch (/** @type {any} */err) {
        this.core.logger.log(`清理旧版本失败: ${err?.message || err}`, 'ERROR');
      }
    }
    // @ts-ignore
    #importConcurrency;
    // @ts-ignore
    #batchSize;
    // @ts-ignore
    #preloadYieldEvery;
    /**
     * 处理翻译数据
     * @param {string} modName 模块名称
     * @param {string} lang 语言代码
     * @param {Object<string, string>} translations 翻译数据对象
     * @returns {Promise<boolean>} 处理是否成功
     */
    async #processTranslations(modName, lang, translations) {
      try {
        const combinedContent = JSON.stringify(translations);
        const encoder = new TextEncoder();
        const data = encoder.encode(combinedContent);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        const lastHash = await this.#getLastFileHash(modName, lang);
        if (fileHash === lastHash) {
          this.core.logger.log(`翻译内容未变更: ${modName}/${lang} (跳过导入)`, 'DEBUG');
          return true;
        }
        const keys = Object.keys(translations);
        if (keys.length === 0) {
          await this.#storeFileHash(modName, lang, fileHash);
          return true;
        }
        const entries = [];
        for (const key of keys) {
          if (!this.translations.has(key)) this.translations.set(key, {});
          const rec = this.translations.get(key);
          rec[lang] = translations[key];
          entries.push({ key, translations: { [lang]: translations[key] }, mod: modName });
        }
        for (let i = 0; i < entries.length; i += this.#batchSize) {
          const chunk = entries.slice(i, i + this.#batchSize);
          await this.#storeBatchInDB(chunk);
        }
        const existingKeys = await this.#getExistingKeysForMod(modName);
        const newKeys = new Set(keys);
        const obsoleteKeys = new Set([...existingKeys].filter(k => !newKeys.has(k)));
        if (obsoleteKeys.size > 0) await this.#cleanupObsoleteKeys(obsoleteKeys, lang);
        await this.#storeFileHash(modName, lang, fileHash);
        this.core.logger.log(`加载翻译: ${lang} (${keys.length} 项)`, 'DEBUG');
        return true;
      } catch (/** @type {any} */err) {
        this.core.logger.log(`处理翻译失败: ${modName}/${lang} - ${err?.message || err}`, 'ERROR');
        return false;
      }
    }
    /**
     * 获取上次文件哈希值
     * @param {string} modName 模块名称
     * @param {string} lang 语言代码
     * @returns {Promise<string|null>} 文件哈希值或null
     */
    async #getLastFileHash(modName, lang) {
      if (!this.db) return null;
      try {
        const tx = this.db.transaction('metadata', 'readonly');
        const store = tx.objectStore('metadata');
        return (await store.get(`${modName}_${lang}`))?.hash || null;
      } catch (/** @type {any} */err) {
        this.core.logger.log(`获取文件哈希失败: ${modName}_${lang} - ${err?.message || err}`, 'DEBUG');
        return null;
      }
    }
    /**
     * 存储文件哈希值
     * @param {string} modName 模块名称
     * @param {string} lang 语言代码
     * @param {string} hash 文件哈希值
     * @returns {Promise<void>}
     */
    async #storeFileHash(modName, lang, hash) {
      if (!this.db) return;
      try {
        const tx = this.db.transaction('metadata', 'readwrite');
        const store = tx.objectStore('metadata');
        await store.put({ key: `${modName}_${lang}`, hash, timestamp: Date.now() });
        this.fileHashes.set(`${modName}_${lang}`, hash);
      } catch (/** @type {any} */err) {
        this.core.logger.log(`存储文件哈希失败: ${err?.message || err}`, 'ERROR');
      }
    }
    /**
     * 批量存储到数据库
     * @param {Array<{key: string, translations: Object<string, string>, mod: string}>} entries 翻译条目数组
     * @returns {Promise<void>}
     */
    async #storeBatchInDB(entries) {
      if (!this.db || !entries || entries.length === 0) return;
      try {
        const map = new Map();
        for (const { key, translations, mod } of entries) {
          if (!map.has(key)) map.set(key, { translations: {}, mod });
          const bucket = map.get(key);
          bucket.translations = { ...bucket.translations, ...translations };
          if (mod) bucket.mod = mod;
        }
        const tx = this.db.transaction(['translations', 'text_index'], 'readwrite');
        const tStore = tx.objectStore('translations');
        const textStore = tx.objectStore('text_index');
        const keyIndex = textStore.index('key');
        const keys = Array.from(map.keys());
        const existingArr = await Promise.all(keys.map(k => tStore.get(k)));
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const existing = existingArr[i];
          const newBucket = map.get(key);
          const merged = existing ? { ...existing.translations, ...newBucket.translations } : newBucket.translations;
          await tStore.put({ key, translations: merged, mod: newBucket.mod || existing?.mod, timestamp: Date.now() });
        }
        for (const key of keys) {
          let cursor = await keyIndex.openCursor(IDBKeyRange.only(key));
          while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
          }
        }
        for (const key of keys) {
          const translations = map.get(key).translations;
          for (const lang in translations) {
            await textStore.add({ text_value: translations[lang], key, language: lang });
          }
        }
        await tx.done;
        this.core.logger.log(`批量存储完成: ${keys.length} 条`, 'DEBUG');
      } catch (/** @type {any} */err) {
        this.core.logger.log(`批量存储失败: ${err?.message || err}`, 'ERROR');
        try {
          await this.#retryStoreInSmallerChunks(entries);
        } catch (/** @type {any} */e) {
          this.core.logger.log(`重试也失败: ${e?.message || e}`, 'ERROR');
        }
      }
    }
    /**
     * 重试存储小块数据
     * @param {Array<{key: string, translations: Object<string, string>, mod: string}>} entries 翻译条目数组
     * @returns {Promise<void>}
     */
    async #retryStoreInSmallerChunks(entries) {
      const small = Math.max(50, Math.floor(this.#batchSize / 10));
      for (let i = 0; i < entries.length; i += small) {
        const chunk = entries.slice(i, i + small);
        const tx = this.db.transaction(['translations', 'text_index'], 'readwrite');
        const tStore = tx.objectStore('translations');
        const textStore = tx.objectStore('text_index');
        const keyIndex = textStore.index('key');
        for (const { key, translations, mod } of chunk) {
          const existing = await tStore.get(key);
          const merged = existing ? { ...existing.translations, ...translations } : translations;
          await tStore.put({ key, translations: merged, mod: mod || existing?.mod, timestamp: Date.now() });
          let cursor = await keyIndex.openCursor(IDBKeyRange.only(key));
          while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
          }
          for (const lang in translations) {
            await textStore.add({ text_value: translations[lang], key, language: lang });
          }
        }
        await tx.done;
      }
      this.core.logger.log(`降级重试批量写入完成`, 'DEBUG');
    }
    /** 获取模块的现有键 @param {string} modName 模块名称 @returns {Promise<Set<string>>} 现有键的集合 */
    async #getExistingKeysForMod(modName) {
      if (!this.db) return new Set();
      try {
        const tx = this.db.transaction('translations', 'readonly');
        const store = tx.objectStore('translations');
        const index = store.index('mod');
        const records = await index.getAll(modName);
        return new Set(records.map((/** @type {{key: string}} */r) => r.key));
      } catch (/** @type {any} */err) {
        this.core.logger.log(`获取现有键失败: ${modName} - ${err?.message || err}`, 'DEBUG');
        return new Set();
      }
    }
    /** 清理过时的键 @param {Set<string>} obsoleteKeys 过时的键集合 @param {string} lang 语言代码 @returns {Promise<void>} */
    async #cleanupObsoleteKeys(obsoleteKeys, lang) {
      if (!this.db || obsoleteKeys.size === 0) return;
      try {
        const tx = this.db.transaction(['translations', 'text_index'], 'readwrite');
        const tStore = tx.objectStore('translations');
        const textStore = tx.objectStore('text_index');
        const keyIndex = textStore.index('key');
        for (const key of Array.from(obsoleteKeys)) {
          const record = await tStore.get(key);
          if (!record) continue;
          if (record.translations && record.translations[lang]) {
            delete record.translations[lang];
            if (Object.keys(record.translations).length > 0) {
              await tStore.put(record);
            } else {
              await tStore.delete(key);
            }
          }
          let cursor = await keyIndex.openCursor(IDBKeyRange.only(key));
          while (cursor) {
            if (cursor.value.language === lang) await cursor.delete();
            cursor = await cursor.continue();
          }
        }
        await tx.done;
        this.core.logger.log(`清理过时键: ${obsoleteKeys.size} 个`, 'DEBUG');
      } catch (/** @type {any} */err) {
        this.core.logger.log(`清理过时键失败: ${err?.message || err}`, 'ERROR');
      }
    }
    /** 从数据库加载翻译 @param {string} key 翻译键名 @returns {Promise<void>} */
    async #loadTranslationFromIDB(key) {
      if (!this.db) return;
      try {
        const tx = this.db.transaction('translations', 'readonly');
        const store = tx.objectStore('translations');
        const record = await store.get(key);
        if (record) this.translations.set(key, record.translations || {});
      } catch (/** @type {any} */err) {
        this.core.logger.log(`加载翻译失败: ${key} - ${err?.message || err}`, 'DEBUG');
      }
    }
    /** 异步查找翻译键 @param {string} text 文本内容 @returns {Promise<void>} */
    async #findKeyByTextAsync(text) {
      if (!this.db) return;
      try {
        const tx = this.db.transaction('text_index', 'readonly');
        const store = tx.objectStore('text_index');
        const index = store.index('text_value');
        const records = await index.getAll(text);
        if (records.length > 0) {
          const key = records[0].key;
          this.cache.set(text, key);
        }
      } catch (/** @type {any} */err) {
        this.core.logger.log(`查找翻译键失败: ${text} - ${err?.message || err}`, 'DEBUG');
      }
    }
     /** 检查是否为当前语言 @param {string} text 文本内容 @returns {boolean} */
    #isCurrentLanguage(text) {
      if (this.cache.has(text)) {
        const key = this.cache.get(text);
        const translations = this.translations.get(key);
        if (translations && translations[this.language] === text) return true;
      }
      for (const translations of this.translations.values()) {
        if (translations[this.language] === text) return true;
      }
      return false;
    }
  }

  class EventEmitter {
    static streamConfig = {
      batchSize: 15,     // 每批处理监听器数量
      yieldInterval: 1   // 批处理间让步(ms)
    }
    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.core = core;
      this.executionQueue = new Map();
      this.isProcessing = new Map();
      /** @type {Object<string, Array<{callback: Function, description: string, internalId: string}>>} 事件监听器集合，使用字符串索引签名 */
      this.events = {
        ':coreReady':           [], // (本)框架核心完成
        ':expectedmodulecount': [], // (本)框架模块就绪
        ':dataImport':          [], // 数据导入时机(即modloader可用时机)
        ':dataInit':            [], // 框架提供的模组V变量注册接口
        ':onSave':              [], // 保存
        ':loadSaveData':        [], // 加载存档数据
        ':onLoad':              [], // 读档
        ':oncloseoverlay':      [], // 关闭窗口
        ':languageChange':      [], // 语言切换
        ':storyready':          [], // 游戏准备完成(即重载页面末尾)
        ':passageinit':         [], // 段落初始化
        ':passagestart':        [], // 段落开始
        ':passagerender':       [], // 段落渲染
        ':passagedisplay':      [], // 段落显示
        ':passageend':          [], // 段落结束
        ':definewidget':        [], // (本)框架宏定义时机
        ':finally':             [], // 最后时机
      };
    }
    /**
     * 注册事件监听器
     * @param {string} eventName 事件名称
     * @param {Function} callback 回调函数
     * @param {string} [description] 监听器描述
     * @returns {boolean} 是否注册成功
     */
    on(eventName, callback, description = '') {
      if (!this.events[eventName]) {
        this.events[eventName] = [];
        this.executionQueue.set(eventName, []);
        this.isProcessing.set(eventName, false);
        this.core.logger.log(`创建新事件类型: ${eventName}`, 'DEBUG');
      }
      const internalId = description || `evt_${Math.random().toString(36).slice(2,10)}_${Date.now()}`;
      if (this.events[eventName].some(l => l.callback === callback || l.internalId === internalId)) {
        this.core.logger.log(`回调函数已注册: ${eventName} (跳过重复)`, 'DEBUG');
        return false;
      }
      const listener = { callback, description, internalId };
      this.events[eventName].push(listener);
      this.core.logger.log(`注册事件监听器: ${eventName}${description ? ` (描述: ${description})` : ''} (当前: ${this.events[eventName].length})`,'DEBUG');
      return true;
    }
    /**
     * 移除事件监听器
     * @param {string} eventName 事件名称
     * @param {Function|string} identifier 监听器标识符
     * @returns {boolean}
     */
    off(eventName, identifier) {
      if (!this.events[eventName]) {
        this.core.logger.log(`无效事件名: ${eventName}`, 'WARN');
        return false;
      }
      const listeners = this.events[eventName];
      let removed = false;
      for (let i = listeners.length - 1; i >= 0; i--) {
        const listener = listeners[i];
        if (listener.callback === identifier || listener.description === identifier || listener.internalId === identifier) {
          listeners.splice(i, 1);
          removed = true;
          this.core.logger.log(`移除事件监听器: ${eventName}${identifier instanceof Function ? ' (函数引用)' : ` (描述: ${identifier})`}`, 'DEBUG');
        }
      }
      if (!removed) {
        this.core.logger.log(`未找到匹配的监听器: ${eventName} (标识符: ${identifier instanceof Function ? '函数引用' : identifier})`, 'DEBUG');
      } else {
        this.core.logger.log(`移除后剩余监听器: ${listeners.length}`, 'DEBUG');
      }
      return removed;
    }
    /**
     * 注册一次性事件监听器
     * @param {string} eventName 事件名称
     * @param {Function} callback 回调函数
     * @param {string} [description] 监听器描述
     * @returns {boolean} 是否注册成功
     */
    once(eventName, callback, description = '') {
      const onceWrapper = (/** @type {...any} */ ...args) => {
        try { callback(...args); } finally { this.off(eventName, onceWrapper); }
      };
      return this.on(eventName, onceWrapper, description);
    }
    /** 触发事件 @param {string} eventName 事件名称 @param {...any} args 事件参数 */
    trigger(eventName, ...args) {
      if (!this.events[eventName] || this.events[eventName].length === 0) return;
      const queue = this.executionQueue.get(eventName) || [];
      queue.push({ args });
      this.executionQueue.set(eventName, queue);
      if (!this.isProcessing.get(eventName)) this.#processQueue(eventName);
    }
    /** 处理事件队列 @param {string} eventName 事件名称 @returns {Promise<void>} */
    async #processQueue(eventName) {
      this.isProcessing.set(eventName, true);
      const queue = this.executionQueue.get(eventName);
      while (queue.length > 0) {
        const eventData = queue.shift();
        const listeners = [...this.events[eventName]];
        for (let i = 0; i < listeners.length; i += EventEmitter.streamConfig.batchSize) {
          const batch = listeners.slice(i, i + EventEmitter.streamConfig.batchSize);
          await Promise.all(batch.map(listener => {
            return /** @type {Promise<void>} */(new Promise(resolve => {
              try {
                const result = listener.callback(...eventData.args);
                if (result instanceof Promise) {
                  result.then(resolve).catch(error => {
                    this.core.logger.log(`${eventName}事件处理错误: ${error.message}`, 'ERROR');
                    resolve();
                  });
                } else {
                  resolve();
                }
              } catch (/** @type {any} */error) {
                this.core.logger.log(`${eventName}事件处理错误: ${error.message}`, 'ERROR');
                resolve();
              }
            }));
          }));
          if (EventEmitter.streamConfig.yieldInterval > 0) await new Promise(r => setTimeout(r, EventEmitter.streamConfig.yieldInterval));
        }
      }
      this.isProcessing.set(eventName, false);
    }
  }

  class ModuleManager {
    static streamConfig = {
      batchSize: 7,     // 批处理大小
      yieldInterval: 1  // 批处理间让步时间(ms)
    }
    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.core = core;
      this.registry = {
        modules: new Map(),        // 模块名称->模块对象
        states: new Map(),         // 模块名称->状态
        dependencies: new Map(),   // 模块名称->直接依赖
        dependents: new Map(),     // 模块名称->依赖者
        allDependencies: new Map(),// 模块名称->所有依赖(传递闭包)
        waitingQueue: new Map(),   // 等待队列
      };

      this.initPhase = {
        preInitCompleted: false,            // 预初始化完成
        mainInitCompleted: false,           // 主初始化完成
        loadInitExecuted: false,            // 读存档初始化
        postInitExecuted: false,            // 后初始化完成
        expectedModuleCount: 99,            // 预期模块数量
        registeredModuleCount: 0,           // 已注册模块数
        allModuleRegisteredTriggered: false // 所有模块注册事件触发标志
      };

      this.preInitialized = new Set();      // 预初始化模块集合
      this.#waitingResolvers = new Map();   // 等待解析器
      this.#depthMemo = new Map();          // 深度计算缓存
    }
    /**
     * 注册模块
     * @param {string} name 模块名称
     * @param {any} module 模块对象
     * @param {string[]} [dependencies] 依赖列表
     * @returns {Promise<boolean>} 是否注册成功
     */
    async register(name, module, dependencies = []) {
      const reg = this.registry;
      if (reg.modules.has(name)) {
        this.core.logger.log(`模块 ${name} 已注册`, 'WARN');
        return false;
      }
      const moduleDependencies = [...(module.dependencies || []), ...dependencies];
      const allDependencies = new Set();
      /** 递归收集依赖 @param {string} depName 依赖名称 @param {Set<string>} [visited] 已访问的依赖集合 */
      const collectDependencies = (depName, visited = new Set()) => {
        if (visited.has(depName)) return;
        visited.add(depName);
        if (reg.modules.has(depName)) {
          const depDeps = [...reg.dependencies.get(depName) || []];
          depDeps.forEach(dep => {
            allDependencies.add(dep);
            collectDependencies(dep, visited);
          });
        }
      };
      moduleDependencies.forEach(dep => {
        allDependencies.add(dep);
        collectDependencies(dep);
      });
      if (this.#detectCircularDependency(name, [...allDependencies])) {
        this.core.logger.log(`模块 ${name} 注册失败: 存在循环依赖`, 'ERROR');
        return false;
      }
      reg.modules.set(name, module);
      reg.states.set(name, ModuleState.PENDING);
      reg.dependencies.set(name, new Set(moduleDependencies));
      reg.allDependencies.set(name, allDependencies);
      if (!reg.dependents.has(name)) reg.dependents.set(name, new Set());
      moduleDependencies.forEach(dep => {
        if (!reg.dependents.has(dep)) reg.dependents.set(dep, new Set());
        reg.dependents.get(dep).add(name);
      });
      this.core.logger.log(`注册模块: ${name}, 依赖: [${moduleDependencies.join(', ')}]`, 'DEBUG');
      this.core.logger.log(`传递依赖: [${[...allDependencies].join(', ')}]`, 'DEBUG');
      this.initPhase.registeredModuleCount++;
      this.#checkModuleRegistration();
      if (reg.waitingQueue.has(name)) {
        const waitingModules = [...reg.waitingQueue.get(name)];
        reg.waitingQueue.delete(name);
        waitingModules.forEach(moduleName => {
          if (reg.states.get(moduleName) === ModuleState.PENDING) setTimeout(() => this.#initModule(moduleName), 0);
        });
      }
      return true;
    }
    /** 设置预期模块数量 @param {number} count 预期模块数量 */
    setExpectedModuleCount(count) {
      this.initPhase.expectedModuleCount = count;
      this.#checkModuleRegistration();
    }
    
    getDependencyGraph() {
      const reg = this.registry;
      /** @type {Object<string, {dependencies: string[], dependents: string[], state: string, allDependencies: string[]}>} */
      const graph = {};
      /** @type {Object<number, string>} */
      const StateName = {
        0: 'PENDING',
        1: 'MOUNTED',
        2: 'ERROR'
      };
      reg.modules.forEach((_, name) => {
        const stateValue = reg.states.get(name);
        graph[name] = {
          dependencies: Array.from(reg.dependencies.get(name) || []),
          dependents: Array.from(reg.dependents.get(name) || []),
          state: StateName[stateValue] || `UNKNOWN(${stateValue})`,
          allDependencies: Array.from(reg.allDependencies.get(name) || [])
        };
      });
      return graph;
    }

    async preInit() {
      if (this.initPhase.preInitCompleted) return;
      await this.#initAllModules(true);
      this.initPhase.preInitCompleted = true;
      this.core.logger.log(`预初始化完成`, 'INFO');
    }

    async init() {
      if (this.initPhase.mainInitCompleted) return;
      if (!this.initPhase.preInitCompleted) await this.preInit();
      await this.#initAllModules(false);
      this.initPhase.mainInitCompleted = true;
      this.core.logger.log(`主初始化完成`, 'INFO');
    }

    async loadInit() {
      if (this.initPhase.loadInitExecuted) return;
      if (!this.initPhase.mainInitCompleted) return;
      const reg = this.registry;
      const initOrder = this.#getTopologicalOrder();
      for (let i = 0; i < initOrder.length; i += ModuleManager.streamConfig.batchSize) {
        const batch = initOrder.slice(i, i + ModuleManager.streamConfig.batchSize);
        await Promise.all(batch.map(async name => {
          const module = reg.modules.get(name);
          if (reg.states.get(name) !== ModuleState.MOUNTED) return;
          if (typeof module.loadInit === 'function') {
            try {
              const result = module.loadInit();
              if (result instanceof Promise) await result;
              this.core.logger.log(`[${name}] 读档初始化完成`, 'DEBUG');
            } catch (/** @type {any} */error) {
              this.core.logger.log(`${name} 读档初始化失败: ${error.message}`, 'ERROR');
            }
          }
        }));
        await new Promise(resolve => setTimeout(resolve, ModuleManager.streamConfig.yieldInterval));
      }
      this.initPhase.loadInitExecuted = true;
      this.core.logger.log(`loadInit完成`, 'INFO');
    }

    async postInit() {
      if (this.initPhase.postInitExecuted) return;
      if (!this.initPhase.mainInitCompleted) return;
      const reg = this.registry;
      const initOrder = this.#getTopologicalOrder();
      for (let i = 0; i < initOrder.length; i += ModuleManager.streamConfig.batchSize) {
        const batch = initOrder.slice(i, i + ModuleManager.streamConfig.batchSize);
        await Promise.all(batch.map(async name => {
          const module = reg.modules.get(name);
          if (reg.states.get(name) !== ModuleState.MOUNTED) return;
          if (typeof module.postInit === 'function') {
            try {
              const result = module.postInit();
              if (result instanceof Promise) await result;
              this.core.logger.log(`[${name}] 后初始化完成`, 'DEBUG');
            } catch (/** @type {any} */error) {
              this.core.logger.log(`${name} 后初始化失败: ${error.message}`, 'ERROR');
            }
          }
        }));
        await new Promise(resolve => setTimeout(resolve, ModuleManager.streamConfig.yieldInterval));
      }
      this.initPhase.postInitExecuted = true;
      this.core.logger.log(`后初始化完成`, 'INFO');
    }

    #waitingResolvers;
    #depthMemo;

    #checkModuleRegistration() {
      if (this.initPhase.allModuleRegisteredTriggered) return;
      const { expectedModuleCount, registeredModuleCount } = this.initPhase;
      if (registeredModuleCount >= expectedModuleCount) {
        this.core.logger.log(`模块注册完成 (${registeredModuleCount}/${expectedModuleCount})`, 'DEBUG');
        this.core.events.trigger(':allModuleRegistered');
        this.initPhase.allModuleRegisteredTriggered = true;
      }
    }
    /** 等待模块初始化完成 @param {string} moduleName 模块名称 @returns {Promise<void>} */
    #waitForModule(moduleName) {
      const reg = this.registry;
      if (this.preInitialized.has(moduleName) || reg.states.get(moduleName) === ModuleState.MOUNTED || reg.states.get(moduleName) === ModuleState.ERROR) return Promise.resolve();
      return new Promise((resolve) => {
        if (!this.#waitingResolvers.has(moduleName)) this.#waitingResolvers.set(moduleName, []);
        this.#waitingResolvers.get(moduleName).push(resolve);
      });
    }
    /** 解析等待器 @param {string} moduleName 模块名称 */
    #resolveWaiters(moduleName) {
      const list = this.#waitingResolvers.get(moduleName);
      if (!list) return;
      for (const res of list) try { res(); } catch (e) {}
      this.#waitingResolvers.delete(moduleName);
    }
    /**
     * 检查模块依赖
     * @param {string} moduleName 模块名称
     * @param {boolean} [isPreInit] 是否为预初始化
     * @returns {Promise<boolean>} 依赖是否就绪
     */
    async #checkDependencies(moduleName, isPreInit = false) {
      const reg = this.registry;
      const dependencies = [...(reg.allDependencies.get(moduleName) || [])];
      for (const dep of dependencies) {
        if (!reg.modules.has(dep)) {
          if (!reg.waitingQueue.has(dep)) reg.waitingQueue.set(dep, new Set());
          reg.waitingQueue.get(dep).add(moduleName);
          return false;
        }
        if (isPreInit) {
          if (!this.preInitialized.has(dep)) await this.#waitForModule(dep);
        } else {
          const depState = reg.states.get(dep);
          if (depState !== ModuleState.MOUNTED && depState !== ModuleState.ERROR) {
            await this.#waitForModule(dep);
            if (reg.states.get(dep) === ModuleState.ERROR) return false;
          } else if (depState === ModuleState.ERROR) return false;
        }
      }
      return true;
    }

    async #initAllModules(isPreInit = false) {
      const initOrder = this.#getTopologicalOrder();
      const batchSize = ModuleManager.streamConfig.batchSize;
      for (let i = 0; i < initOrder.length; i += batchSize) {
        const batch = initOrder.slice(i, i + batchSize);
        await Promise.all(batch.map(name => this.#initModule(name, isPreInit)));
        await new Promise(resolve => setTimeout(resolve, ModuleManager.streamConfig.yieldInterval));
      }
    }
    /**
     * 初始化单个模块
     * @param {string} moduleName 模块名称
     * @param {boolean} isPreInit 是否为预初始化
     * @returns {Promise<boolean>} 是否初始化成功
     */
    async #initModule(moduleName, isPreInit = false) {
      const reg = this.registry;
      const module = reg.modules.get(moduleName);
      if (!module) return false;
      const state = reg.states.get(moduleName);
      if ([ModuleState.MOUNTED, ModuleState.ERROR].includes(state)) return false;
      reg.states.set(moduleName, ModuleState.PENDING);
      const ready = await this.#checkDependencies(moduleName, isPreInit);
      if (!ready) return false;
      try {
        const initType = isPreInit ? 'preInit' : 'Init';
        if (typeof module[initType] === 'function') {
          const result = module[initType]();
          if (result instanceof Promise) await result;
        }
        if (isPreInit) {
          if (this.core.meta.coreModules?.includes(moduleName))  /** @type {any} */(this.core)[moduleName] = module;
          this.preInitialized.add(moduleName);
        } else {
          reg.states.set(moduleName, ModuleState.MOUNTED);
        }
        this.#resolveWaiters(moduleName);
        return true;
      } catch (err) {
        reg.states.set(moduleName, ModuleState.ERROR);
        this.#resolveWaiters(moduleName);
        return false;
      }
    }
    /** 获取拓扑排序顺序 @returns {string[]} 拓扑排序后的模块名称数组 */
    #getTopologicalOrder() {
      const reg = this.registry;
      const inDegree = new Map();
      /** @type {string[]} 队列 */
      const queue = [];
      const result = [];
      reg.modules.forEach((_, name) => {
        const deg = reg.dependencies.get(name)?.size || 0;
        inDegree.set(name, deg);
        if (deg === 0) queue.push(name);
      });
      let head = 0;
      while (head < queue.length) {
        const name = queue[head++];
        result.push(name);
        (reg.dependents.get(name) || []).forEach((/** @type {string} */dep) => {
          const deg = inDegree.get(dep) - 1;
          inDegree.set(dep, deg);
          if (deg === 0) queue.push(dep);
        });
      }
      return result;
    }
    /**
     * 检测循环依赖
     * @param {string} startName 起始模块名称
     * @param {string[]} dependencies 依赖列表
     * @returns {boolean} 是否存在循环依赖
     */
    #detectCircularDependency(startName, dependencies) {
      const reg = this.registry;
      const visited = new Set();
      const onStack = new Set();
      const graph = new Map();
      reg.modules.forEach((_, nm) => graph.set(nm, Array.from(reg.dependencies.get(nm) || [])));
      if (!graph.has(startName)) graph.set(startName, dependencies || []);
      /** 深度优先搜索函数 @param {string} node 当前节点 @returns {boolean} 是否检测到循环依赖 */
      const dfs = node => {
        if (onStack.has(node)) return true;
        if (visited.has(node)) return false;
        visited.add(node);
        onStack.add(node);
        const neighs = graph.get(node) || [];
        for (const n of neighs) if (dfs(n)) return true;
        onStack.delete(node);
        return false;
      };
      if (dfs(startName)) {
        this.core.logger.log(`循环依赖检测到: ${startName}`, 'ERROR');
        return true;
      }
      return false;
    }
    /** 获取模块深度 @param {string} moduleName 模块名称 @returns {number} 模块深度 */
    #getModuleDepth(moduleName) {
      if (this.#depthMemo.has(moduleName)) return this.#depthMemo.get(moduleName);
      const deps = this.registry.dependencies.get(moduleName) || new Set();
      const depth = deps.size === 0 ? 0 : Math.max(...[...deps].map(d => this.#getModuleDepth(d) + 1));
      this.#depthMemo.set(moduleName, depth);
      return depth;
    }
  }

  class MaplebirchCore {
    static Manager = {
      Logger,
      LanguageManager,
      EventEmitter,
      ModuleManager
    }

    static constants = {
      ModuleState,
      LogLevel: Object.fromEntries(Object.entries(Logger.LogConfig).map(([name]) => [name, Logger.LogLevel[name]]))
    }

    // 框架元信息
    static meta = {
      version: frameworkVersion,
      name: 'maplebirch Core',
      author: '楓樺葉',
      modifiedby: lastModifiedBy,
      UpdateDate: lastUpdate,
      availableLanguages: LanguageManager.DEFAULT_LANGS,
    }

    constructor() {
      this.meta = {
        state: ModuleState.PENDING,
        coreModules: ['state', 'audio', 'tool', 'var', 'npc', 'char', 'shop'],
        initializedAt: new Date().toLocaleString(),
      };
      /** @type {string[]} */
      this.modList = [];
      this.logger = new Logger(this);
      this.lang = new LanguageManager(this);
      this.events = new EventEmitter(this);
      this.modules = new ModuleManager(this);
      this.modLoader = null;
      this.modUtils = null;
      this.onLoad = false;
    }
    /** @param {string} msg @param {any[]} objs */
    log(msg, level = 'INFO', ...objs) {
      this.logger.log(msg, level, ...objs);
    }  
    /** @param {string} evt @param {Function} handler */
    on(evt, handler, desc = '') {
      return this.events.on(evt, handler, desc);
    }
    /** @param {string} evt @param {string|Function} identifier */
    off(evt, identifier) {
      return this.events.off(evt, identifier);
    }
    /** @param {string} evt @param {Function} handler */
    once(evt, handler, desc = '') {
      return this.events.once(evt, handler, desc);
    }    
    /** @param {string} evt @param {...any} args */
    trigger(evt, ...args) {
      this.events.trigger(evt, ...args);
    }
    /** @param {string} name @param {any} module @param {string[]} [dependencies] */
    async register(name, module, dependencies = []) {
      return this.modules.register(name, module, dependencies);
    }

    async preInit() {
      return this.modules.preInit();
    }

    async init() {
      await this.modules.init();
    }

    async loadInit() {
      return this.modules.loadInit();
    }

    async postInit() {
      return this.modules.postInit();
    }
    /** @param {string} key @param {boolean} [space=false] */
    t(key, space = false) {
      return this.lang.t(key, space);
    }
    /** @param {string} text */
    autoTranslate(text) {
      return this.lang.autoTranslate(text);
    }
    /** @param {any} modLoader @param {any} modUtils */
    setModLoader(modLoader,  modUtils) {
      this.modLoader = modLoader;
      this.modUtils = modUtils;
      this.logger.log('Mod加载器已设置', 'DEBUG');
    }

    set Language(lang) {
      this.lang.setLanguage(lang);
      this.events.trigger(':languageChange');
    }

    set LogLevel(level) {
      this.logger.LevelName = level;
    }
    /** @param {number} count */
    set ExModCount(count) {
      this.logger.log(`设置预期模块数量: ${count}`, 'DEBUG');
      this.modules.setExpectedModuleCount(count);
    }    
    /** @param {any} name */
    getModule(name) {
      return this.modules.registry.modules.get(name);
    }

    get Language() {
      return this.lang.language;
    }

    get LogLevel() {
      return this.logger.LevelName;
    }

    get expectedModuleCount() {
      return this.modules.initPhase.expectedModuleCount;
    }
    
    get registeredModuleCount() {
      return this.modules.initPhase.registeredModuleCount;
    }
    
    get dependencyGraph() {
      return this.modules.getDependencyGraph();
    }

    get yaml() {
      return yaml;
    }
  }

  window.maplebirch = new MaplebirchCore();
  const maplebirch = window.maplebirch;

  maplebirch.once(':coreReady', () => {
    maplebirch.log(`核心系统创建完成 (v${MaplebirchCore.meta.version})\n初始化时间: ${maplebirch.meta.initializedAt}\n开始设置初始化流程`, 'INFO');
    maplebirch.log('初始化内置监听', 'DEBUG');
    $(document).on(':oncloseoverlay', () => maplebirch.trigger(':oncloseoverlay'));
    $(document).on(':passageinit', (/** @type {any} */ev) => maplebirch.trigger(':passageinit' , ev));
    $(document).on(':passagestart', () => maplebirch.trigger(':passagestart'));
    $(document).on(':passagerender', () => maplebirch.trigger(':passagerender'));
    $(document).on(':passagedisplay', () => maplebirch.trigger(':passagedisplay'));
    $(document).on(':passageend', () => maplebirch.trigger(':passageend'));
    $(document).on(':storyready', () => maplebirch.trigger(':storyready', State));

    maplebirch.once(':dataImport', async () => {
      await maplebirch.lang.initDatabase();
      await maplebirch.lang.preloadAllTranslations();
      await maplebirch.lang.importAllLanguages('maplebirch');
    });

    maplebirch.once(':allModuleRegistered', async () => {
      maplebirch.log('所有模块注册完成，开始预初始化', 'INFO');
      const modLoader = window.modSC2DataManager.getModLoader();
      const modUtils = window.modSC2DataManager.getModUtils();
      maplebirch.setModLoader(modLoader, modUtils);
      await maplebirch.preInit();
      maplebirch.trigger(':dataImport');
    });

    maplebirch.on(':passageinit', async (/** @type {{ passage: any; }} */ev) => {
      const passage = ev.passage;
      if (!passage || passage.tags.includes('widget')) return;
      if (passage.title == 'Start' || passage.title == 'Downgrade Waiting Room') return;
      maplebirch.modules.initPhase.postInitExecuted = false;
      await maplebirch.init();
    });

    maplebirch.on(':passagestart', async () => {
      if (maplebirch.onLoad) {
        let retryCount = 0;
        const stateShow = !maplebirch.modules.initPhase.mainInitCompleted;
        const tryLoadInit = async () => {
          if (maplebirch.modules.initPhase.mainInitCompleted) {
            maplebirch.trigger(':loadSaveData', State);
            await maplebirch.loadInit();
            if (stateShow) SugarCube.Engine.show();
            maplebirch.onLoad = false;
          } else if (retryCount < 5) {
            retryCount++;
            setTimeout(tryLoadInit, 1);
          }
        };
        tryLoadInit();
      }
    });

    maplebirch.on(':passagerender', async () => {
      let retryCount = 0;
      const tryPostInit = async () => {
        if (maplebirch.modules.initPhase.loadInitExecuted) {
          await maplebirch.postInit();
        } else if (maplebirch.modules.initPhase.mainInitCompleted) {
          if (maplebirch.onLoad) return;
          await maplebirch.postInit();
        } else if (retryCount < 5) {
          retryCount++;
          setTimeout(tryPostInit, 1);
        }
      };
      tryPostInit();
    });

    maplebirch.on(':passageend' , async () => setTimeout(() => maplebirch.events.trigger(':finally'), 1000));

    maplebirch.once(':storyready' , async () => {
      SugarCube.Save.onSave.add(async() => maplebirch.trigger(':onSave', State));
      SugarCube.Save.onLoad.add(async() => {
        maplebirch.trigger(':onLoad');
        maplebirch.onLoad = true;
        maplebirch.modules.initPhase.loadInitExecuted = false;
      });
    });
    
    maplebirch.ExModCount = 8;
    maplebirch.log('初始化流程设置结束', 'INFO');
  })
  maplebirch.trigger(':coreReady');
})();