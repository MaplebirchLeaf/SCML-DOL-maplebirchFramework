// @ts-check
/// <reference path='../../maplebirch.d.ts' />
(async() => {
  'use strict';

  // 变量迁徙系统 - 用于管理数据迁移和版本控制
  class migration {
    /** @type {Function} */
    static logger = new Function;

    /** @param {(arg0: string) => Function} createLog */
    static init(createLog) {
      if (typeof createLog === 'function') migration.logger = createLog('migration');
    }

    static create() {
      return new migration();
    }

    constructor() {
      this.log = migration.logger;
      /** @type {{ fromVersion: string; toVersion: string; migrationFn: Function; }[]} */
      this.migrations = [];

      const renameFunc = (/** @type {Object} */data, /** @type {string} */oldPath, /** @type {string} */newPath) => {
        /** @type {any} */
        const source = this.utils.resolvePath(data, oldPath);
        if (!source?.parent[source.key]) return false;
        const value = source.parent[source.key];
        delete source.parent[source.key];
        /** @type {any} */
        const target = this.utils.resolvePath(data, newPath, true);
        target.parent[target.key] = value;
        return true;
      };

      this.utils = {
        /**
         * 解析对象路径
         * @param {Object} obj - 目标对象
         * @param {string} path - 点分隔路径
         * @param {boolean} [createIfMissing=false] - 是否自动创建缺失路径
         * @returns {Object|null} { parent: 父对象, key: 末级键名 } 或 null
         */
        resolvePath: (obj, path, createIfMissing = false) => {
          const parts = String(path).split('.').filter(Boolean);
          if (parts.length === 0) return null;
          /** @type {any} */let current = obj;
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (current[part] === undefined) {
              if (!createIfMissing) return null;
              current[part] = {};
            }
            current = current[part];
            if (current === null || typeof current !== 'object') {
              if (!createIfMissing) return null;
              current = {};
            }
          }
          return { parent: current, key: parts.at(-1) };
        },

        /**
         * 重命名对象属性路径
         * @param {Object} data - 目标数据对象
         * @param {string} oldPath - 原路径
         * @param {string} newPath - 新路径
         * @returns {boolean} 是否成功
         */
        rename: renameFunc,

        /** 移动对象属性（rename的别名） */
        move: renameFunc,

        /**
         * 删除对象属性
         * @param {Object} data - 目标数据对象
         * @param {string} path - 点分隔路径
         * @returns {boolean} 是否成功
         */
        remove: (data, path) => {
          /** @type {any} */
          const target = this.utils.resolvePath(data, path);
          if (target?.parent[target.key] !== undefined) {
            delete target.parent[target.key];
            return true;
          }
          return false;
        },

        /**
         * 转换属性值
         * @param {Object} data - 目标数据对象
         * @param {string} path - 点分隔路径
         * @param {Function} transformer - 转换函数 (value) => newValue
         * @returns {boolean} 是否成功
         */
        transform: (data, path, transformer) => {
          /** @type {any} */
          const target = this.utils.resolvePath(data, path);
          if (!target?.parent[target.key]) return false;
          try {
            target.parent[target.key] = transformer(target.parent[target.key]);
            return true;
          } catch {
            return false;
          }
        },

        /**
         * 填充缺失属性
         * @param {Object} target - 目标对象
         * @param {Object} defaults - 默认值模板对象
         * @param {Object} [options] - 配置选项
         * @param {string} [options.mode="merge"] - 数组处理方式 ("merge" 或 "replace")
         */
        fill: (target, defaults, options = {}) => {
          const mode = options.mode || "merge";
          const filterFn = (/** @type {string} */key, /** @type {any} */value, /** @type {any} */depth) => {
            if (key === "version") return false;
            return !Object.prototype.hasOwnProperty.call(target, key);
          }
          try {
            maplebirch.tool.merge(target, defaults, { mode, filterFn });
          } catch (/** @type {any} */err) {
            this.log(`属性填充失败: ${err?.message || err}`, 'ERROR');
          }
        }
      };
      Object.freeze(this.utils);
    }

    /** @param {string} a @param {string} b */
    #compareVersions(a, b) {
      const parse = (/** @type {string} */v) => String(v || '0.0.0').split('.').map(Number);
      const v1 = parse(a);
      const v2 = parse(b);
      for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
        const diff = (v1[i] || 0) - (v2[i] || 0);
        if (diff) return diff;
      }
      return 0;
    }

    /**
     * 添加迁移脚本
     * @param {string} fromVersion - 起始版本号 (格式: 'x.y.z')
     * @param {string} toVersion - 目标版本号 (格式: 'x.y.z')
     * @param {Function} migrationFn - 迁移函数，格式: (data, utils) => void
     */
    add(fromVersion, toVersion, migrationFn) {
      if (typeof migrationFn !== 'function') return;
      const exists = this.migrations.some(m => m.fromVersion === fromVersion && m.toVersion === toVersion);
      if (exists) { this.log(`重复迁移: ${fromVersion} -> ${toVersion}`, 'WARN'); return; }
      this.migrations.push({ fromVersion, toVersion, migrationFn });
    }

    /**
     * 执行数据迁移
     * @param {Object<any,any>} data - 待迁移的数据对象
     * @param {string} targetVersion - 目标版本
     */
    run(data, targetVersion) {
      data.version ||= '0.0.0';
      let currentVersion = data.version;
      if (!/^\d+(\.\d+){0,2}$/.test(targetVersion)) this.log(`警告: 目标版本格式无效 ${targetVersion}`, 'WARN');
      if (this.#compareVersions(currentVersion, targetVersion) >= 0) return;

      const sortedMigrations = [...this.migrations].sort((a, b) => this.#compareVersions(a.fromVersion, b.fromVersion) || this.#compareVersions(a.toVersion, b.toVersion));
      let steps = 0;
      const MAX_STEPS = 100;

      while (this.#compareVersions(currentVersion, targetVersion) < 0 && steps++ < MAX_STEPS) {
        const candidates = sortedMigrations.filter(m => this.#compareVersions(m.fromVersion, currentVersion) === 0 && this.#compareVersions(m.toVersion, targetVersion) <= 0);
        /** @type {any} */
        const migration = candidates.reduce((best, curr) => this.#compareVersions(curr.toVersion, best.toVersion) > 0 ? curr : best , { toVersion: currentVersion });
        if (!migration || migration.toVersion === currentVersion) {
          this.log(`迁移中断: ${currentVersion} -> ${targetVersion}`, 'WARN');
          break;
        }
        try {
          this.log(`迁移中: ${currentVersion} → ${migration.toVersion}`, 'DEBUG');
          migration.migrationFn(data, this.utils);
          data.version = currentVersion = migration.toVersion;
        } catch (/** @type {any} */e) {
          /** @type {any} */
          const migrationError = new Error(`迁移失败 ${currentVersion}→${migration.toVersion}: ${e.message}`);
          migrationError.fromVersion = currentVersion;
          migrationError.toVersion = migration.toVersion;
          migrationError.cause = e;
          this.log('迁移失败', 'ERROR', migrationError.message);
          throw migrationError;
        }
      }
      if (this.#compareVersions(currentVersion, targetVersion) < 0) {
        this.log(`强制设置版本: ${targetVersion}`, 'WARN');
        data.version = targetVersion;
      }
    }
  }

  // 随机数系统 - 用于生成可控的随机数序列
  class randSystem {
    /** @type {Function} */
    static logger = new Function;

    /** @param {(arg0: string) => Function} createLog */
    static init(createLog) {
      if (typeof createLog === 'function') randSystem.logger = createLog('rand');
    }

    constructor() {
      this.log = randSystem.logger;
      /** @type {{ seed: any , history: number[], pointer: number}} */
      this.state = {
        seed: null,       // 当前种子值
        history: [],      // 历史记录
        pointer: 0        // 当前位置指针
      };
    }

    set Seed(seed) {
      this.state.seed = parseInt(seed) & 0x7FFFFFFF;
      this.state.history = [];
      this.state.pointer = 0;
    }

    get Seed() {
      return this.state.seed;
    }

    /** @param {number} max */
    get(max) {
      if (this.state.seed === null) this.state.seed = Date.now() & 0x7FFFFFFF;
      if (this.state.pointer < this.state.history.length) {
        const value = this.state.history[this.state.pointer];
        this.state.pointer++;
        return (value % (max + 1));
      }
      this.state.seed = (this.state.seed * 1103515245 + 12345) & 0x7FFFFFFF;
      const value = Math.floor((this.state.seed / 0x7FFFFFFF) * 101);
      this.state.history.push(value);
      if (this.state.history.length > 100) {
        this.state.history.shift();
        this.state.pointer = Math.max(0, this.state.pointer - 1);
      }

      this.state.pointer++;
      return (value % (max + 1));
    }

    get rng() {
      if (this.state.seed === null) this.state.seed = Date.now() & 0x7FFFFFFF;
      if (this.state.pointer < this.state.history.length) {
        const value = this.state.history[this.state.pointer];
        this.state.pointer++;
        return (value % 100) + 1;
      }
      this.state.seed = (this.state.seed * 1103515245 + 12345) & 0x7FFFFFFF;
      const value = Math.floor((this.state.seed / 0x7FFFFFFF) * 101);
      this.state.history.push(value);
      if (this.state.history.length > 100) {
        this.state.history.shift();
        this.state.pointer = Math.max(0, this.state.pointer - 1);
      }
      this.state.pointer++;
      return (value % 100) + 1;
    }

    get history() {
      return [...this.state.history];
    }

    get pointer() {
      return this.state.pointer;
    }

    backtrack(steps = 1) {
      if (steps <= 0) return;
      let newPointer = this.state.pointer - steps;
      if (newPointer < 0) newPointer = 0;
      this.state.pointer = newPointer;
    }
  }

  // 部件系统 - 用于定义和管理宏部件
  class defineWidget {
    /** @param {{ (message: string, level?: string, ...objects: any[]): void; (msg: string, level?: string, ...objs: any[]): void; }} logger */
    constructor(logger) {
      this.log = logger;
      /** @type {any} */
      this.statFunctions = {};
      /** @type {string[]} */
      this.macro = [];
    }

    get Macro() {
      return maplebirch.SugarCube.Macro;
    }

    /**
     * 定义宏
     * @param {string} macroName - 宏名称
     * @param {Function} macroFunction - 宏处理函数
     * @param {Array<string>} [tags] - 标签配置
     * @param {boolean} [skipArgs] - 是否跳过参数解析
     */
    defineMacro(macroName, macroFunction, tags, skipArgs, isAsync=false) {
      if (this.Macro.has(macroName)) { this.Macro.delete(macroName); this.log(`已删除现有宏: ${macroName}`, 'DEBUG'); }
      const logger = this.log; 
      this.Macro.add(macroName, {
        isAsync: isAsync ? true : false,
        isWidget: isAsync ? false : true,
        tags,
        skipArgs,
        handler() {
          try {
            macroFunction.apply(this, this.args);
          } catch (error) {
            logger(`宏执行错误: ${macroName}\n${error}`, 'ERROR');
          }
        },
      });
      const index = this.macro.indexOf(macroName);
      if (index === -1) {
        this.macro.push(macroName);
      } else {
        this.macro[index] = macroName;
      }
      this.log(`已定义/更新宏: ${macroName}`, 'DEBUG');
    }

    /**
     * 定义字符串输出宏（简化版）
     * @param {string} macroName - 宏名称
     * @param {Function} macroFunction - 返回字符串的函数
     * @param {Array<string>} [tags] - 标签配置
     * @param {boolean} [skipArgs] - 是否跳过参数解析
     * @param {boolean} [maintainContext] - 是否保持上下文
     */
    defineMacroS(macroName, macroFunction, tags, skipArgs, maintainContext) {
      this.defineMacro(
        macroName,
        // @ts-ignore
        function () {$(this.output).wiki(macroFunction.apply(maintainContext ? this : null, this.args));},
        tags,
        skipArgs
      );
    }

    /**
     * 状态变化显示
     * @param {string} statType - 状态类型（如"力量"）
     * @param {number} amount - 变化量
     * @param {string} colorClass - 颜色CSS类名
     * @param {Function} [condition] - 显示条件（默认总是显示）
     * @returns {DocumentFragment} 状态变化元素片段
     */
    statChange(statType, amount, colorClass, condition = () => true) {
      amount = Number(amount);
      if (V?.statdisable === "t" || !condition()) return document.createDocumentFragment();
      const fragment = document.createDocumentFragment();
      const span = document.createElement("span");
      span.className = colorClass;
      const prefix = amount < 0 ? "- " : "+ ";
      span.textContent = `${prefix.repeat(Math.abs(amount))}${statType}`;
      fragment.appendChild(document.createTextNode(" | "));
      fragment.appendChild(span);

      return fragment;
    }
    
    /**
     * 创建状态显示函数
     * @param {string} name - 函数名称
     * @param {Function} fn - 状态显示函数
     */
    create(name, fn) {
      if (!this.statFunctions[name] && !this.Macro.get(name)) {
        // @ts-ignore
        this.defineMacro(name, function() { this.output.append(fn(...this.args)); });
        this.statFunctions[name] = fn;
        this.log(`已创建状态显示函数: ${name}`, 'DEBUG');
      } else {
        this.log(`已存在名为"${name}"的函数`, 'WARN');
      }
    }
    
    /**
     * 调用状态显示函数
     * @param {string} name - 函数名称
     * @param {...any} args - 函数参数
     * @returns {DocumentFragment} 渲染结果
     */
    callStatFunction(name, ...args) {
      if (this.statFunctions[name]) return this.statFunctions[name](...args);
      this.log(`未找到状态显示函数: ${name}`, 'ERROR');
      return document.createDocumentFragment();
    }
  }

  // 文本系统 - 用于注册和渲染文本片段
  class htmlTools {
    /** @param {{ (message: string, level?: string, ...objects: any[]): void; (msg: string, level?: string, ...objs: any[]): void; }} logger */
    constructor(logger) {
      this.log = logger;
      this.store = new Map();
    }

    get Wikifier() {
      return maplebirch.SugarCube.Wikifier;
    }

    /** 替换文本内容 @param {string|Object} oldText - 要替换的文本 * @param {string} newText - 新文本 */
    replaceText(oldText, newText) {
      const passageContent = document.getElementById('passage-content');
      if (!passageContent) return;
      const targetText = window.lanSwitch(oldText);
      const actualNewText = window.lanSwitch(newText);
      const fullText = passageContent.textContent;
      if (!fullText.includes(targetText)) return;
      const walker = document.createTreeWalker(
        passageContent,
        NodeFilter.SHOW_TEXT,
        null,
      );
      let node;
      const nodesToReplace = [];
      // @ts-ignore
      while (node = walker.nextNode()) if (node.textContent.includes(targetText)) nodesToReplace.push(node);
      nodesToReplace.forEach(node => {
        try {
          const containerId = `textReplace_${Date.now()}_${Math.random()}`;
          const container = document.createElement('span');
          container.id = containerId;
          // @ts-ignore
          node.parentNode.replaceChild(container, node);
          new maplebirch.SugarCube.Wikifier(null, `<<replace "#${containerId}">>${actualNewText}<</replace>>`);
        } catch (error) {
          this.log('replaceText:', 'ERROR', error);
          try { node.textContent = actualNewText; } catch (e) { }
        }
      });
    }

    /** 替换链接 @param {string|Object} oldLink - 要替换的链接文本 @param {string} newLink - 新链接内容 */
    replaceLink(oldLink, newLink) {
      const passageContent = document.getElementById('passage-content');
      if (!passageContent) return;
      const targetLink = window.lanSwitch(oldLink);
      const actualNewLink = window.lanSwitch(newLink);
      const links = passageContent.querySelectorAll('.macro-link, .link-internal');
      for (let link of links) {
        if (link.textContent.includes(targetLink)) {
          try {
            const containerId = `linkReplace_${Date.now()}`;
            const container = document.createElement('span');
            container.id = containerId;
            // @ts-ignore
            link.parentNode.replaceChild(container, link);
            new maplebirch.SugarCube.Wikifier(null, `<<replace "#${containerId}">>${actualNewLink}<</replace>>`);
            break;
          } catch (error) {
            this.log('replaceLink:', 'ERROR', error)
            try { link.outerHTML = actualNewLink; } catch (e) {}
          }
        }
      }
    }

    /**
     * 注册文本处理器函数
     * @param {string} key - 要注册的文本片段标识键
     * @param {function} handler - 文本生成函数
     * @param {string} [id] - 可选的自定义处理器ID
     */
    reg(key, handler, id) {
      if (!key || typeof handler !== 'function') {
        this.log('注册失败: 参数无效', 'WARN');
        return false;
      }
      if (!this.store.has(key)) this.store.set(key, []);
      const finalId = id ?? `ts_${maplebirch.tool.random(0, 0xFFFFFFFF)}`;
      this.store.get(key).push({ id: finalId, fn: handler });
      this.log(`已注册处理器 [${key}] (ID: ${finalId})`, 'DEBUG');
      return finalId;
    }

    /** @param {string} key @param {String|Function} idOrHandler */
    unreg(key, idOrHandler) {
      if (!this.store.has(key)) return false;
      if (!idOrHandler) {
        this.store.delete(key);
        this.log(`已清除键值所有处理器 [${key}]`, 'DEBUG');
        return true;
      }
      const originalCount = this.store.get(key).length;
      const arr = this.store.get(key).filter((/** @type {{ id:string; fn:Function; }} */ h) => h.id !== idOrHandler && h.fn !== idOrHandler);
      if (arr.length) {
        this.store.set(key, arr);
        const removedCount = originalCount - arr.length;
        this.log(`已移除键值 [${key}] 的 ${removedCount} 个处理器`, 'DEBUG');
      } else {
        this.store.delete(key);
        this.log(`已移除键值所有处理器 [${key}]`, 'DEBUG');
      }
      return true;
    }

    clear() {
      const keyCount = this.store.size;
      this.store.clear();
      this.log(`已清除所有键值 (共 ${keyCount} 个)`, 'DEBUG');
    }

    /**
     * 渲染文本片段（同步版本）
     * @param {string|string[]} keys - 要渲染的键或键数组
     * @param {object} context - 渲染上下文
     * @returns {DocumentFragment} 渲染结果
     */
    renderFragment(keys, context = {}) {
      const fragment = document.createDocumentFragment();
      const tools = {
        ctx: context,
        text: (/** @type {String|null} */content, /** @type {?string} */style) => {
          if (content == null) return tools;
          const el = document.createElement('span');
          if (style) el.classList.add(style);
          const contentStr = String(content);
          const translated = maplebirch.auto(contentStr);
          el.textContent = (translated == null ? '' : translated) + ' ';
          fragment.appendChild(el);
          return tools;
        },
        line: (/** @type {String|null} */content, /** @type {?string} */style) => {
          fragment.appendChild(document.createElement('br'));
          if (content == null) return tools;
          const contentStr = String(content);
          const translated = maplebirch.auto(contentStr);
          tools.text(translated, style);
          return tools;
        },
        wikify: (/** @type {String|null} */content) => {
          if (!this.Wikifier) {
            this.log('Wikifier 未设置，无法解析维基语法', 'ERROR');
            tools.text(content, null);
            return tools;
          }
          const tempContainer = document.createElement('div');
          const contentStr = content != null ? String(content) : '';
          new this.Wikifier(tempContainer, contentStr);
          while (tempContainer.firstChild) fragment.appendChild(tempContainer.firstChild);
          return tools;
        },
        raw: (/** @type {Node|String|null} */content) => {
          if (content == null) return tools;
          if (content instanceof Node) {
            fragment.appendChild(content);
          } else {
            const contentStr = String(content);
            const translated = maplebirch.auto(contentStr);
            fragment.appendChild(document.createTextNode(translated));
          }
          return tools;
        },
        box: (/** @type {Node|String|null} */content, /** @type {?string} */style) => {
          const box = document.createElement('div');
          if (style) box.classList.add(style);
          if (content == null) { fragment.appendChild(box); return tools; }
          if (content instanceof Node) {
            box.appendChild(content);
          } else {
            const contentStr = String(content);
            const translated = maplebirch.auto(contentStr);
            box.appendChild(document.createTextNode(translated));
          }
          fragment.appendChild(box);
          return tools;
        }
      };
      const list = Array.isArray(keys) ? keys.slice() : (keys == null ? [] : [keys]);
      for (const key of list) {
        if (!this.store.has(key)) {
          this.log(`渲染片段: 未找到键值 [${key}]`, 'DEBUG');
          continue;
        }
        const handlers = this.store.get(key).slice();
        this.log(`开始渲染键值 [${key}] (${handlers.length} 个处理器)`, 'DEBUG');
        for (const { fn } of handlers) {
          try {
            fn(tools);
          } catch (/**@type {any}*/e) {
            this.log(`处理器错误 [${key}]: ${e?.message || e}`, 'ERROR');
          }
        }
      }

      return fragment;
    }

    /**
     * 渲染到宏输出
     * @param {Object<any,any>} macro - 宏上下文
     * @param {string|string[]} keys - 要渲染的键或键数组
     */
    renderToMacroOutput(macro, keys) {
      if (!keys) return;
      try {
        const frag = this.renderFragment(keys, macro);
        if (macro?.output?.append) {
          macro.output.append(frag);
        } else if (macro?.output?.appendChild) {
          macro.output.appendChild(frag);
        } else {
          this.log(`无法找到宏输出目标: ${macro}`, 'WARN');
          console.log(frag);
        }
      } catch (/**@type {any}*/e) {
        this.log(`渲染到宏输出失败: ${e?.message || e}`, 'ERROR');
      }
    }

    /**
     * 创建宏处理器
     * @param {object} [options] - 配置选项
     * @returns {Function} 宏处理函数
     */
    makeMacroHandler(options = {}) {
      const cfg = { allowCSV: true, ...options };
      const self = this;
      return function () {
        // @ts-ignore
        const raw = this.args && this.args.length ? this.args[0] : null;
        let keys = raw;
        if (cfg.allowCSV && typeof raw === 'string' && raw.includes(',')) keys = raw.split(',').map(s => s.trim()).filter(Boolean);
        // @ts-ignore
        self.renderToMacroOutput(this, keys);
      };
    }
  }

  // 框架系统 - 用于管理和渲染各种框架部件
  class frameworks {
    /** @param {{ (message: string, level?: string, ...objects: any[]): void; (msg: string, level?: string, ...objs: any[]): void; }} logger */
    constructor(logger) {
      this.log = logger;
      /** @type {Object<string,Array<string|object>>} */
      this.data = {
        Init                    : [], // 初始化脚本-静态变量(如setup)
        DataInit                : [], // 初始化变量( 读档 或 开始游戏 时注入你模组需要注入的变量)
        Header                  : [], // 页眉
        Footer                  : [], // 页脚
        Information             : [], // 信息栏
        Options                 : [], // 选项栏
        Cheats                  : [], // 作弊栏
        Statistics              : [], // 统计栏
        Journal                 : [], // 日志尾部

        BeforeLinkZone          : [], // 链接前区域
        AfterLinkZone           : [], // 链接后区域
        CustomLinkZone          : [], // 自定义任意位置的链接前

        CaptionDescription      : [], // 标题描述
        StatusBar               : [], // 状态栏
        MenuBig                 : [], // 大菜单
        MenuSmall               : [], // 小菜单
        CaptionAfterDescription : [], // 标题描述后
        HintMobile              : [], // 移动端图标(即疼痛上方)
        StatsMobile             : [], // 移动端状态(即疼痛等)
        CharaDescription        : [], // 角色描述
        DegreesBonusDisplay     : [], // 属性加成显示
        DegreesBox              : [], // 属性
        SkillsBonusDisplay      : [], // 技能加成显示
        SkillsBox               : [], // 技能
        SubjectBoxBonusDisplay  : [], // 学科加成显示
        SchoolSubjectsBox       : [], // 学科
        SchoolMarksText         : [], // 成绩
        WeaponBox               : [], // 武器

        ReputationModify        : [], // 声誉显示修改区
        Reputation              : [], // 声誉
        FameModify              : [], // 知名度显示修改区
        Fame                    : [], // 知名度
        StatusSocial            : [], // 自定义社交状态

        NPCinit                 : [], // 原版NPC初遇初始化(详情看原版initnpc宏)
        NPCspawn                : [], // 原版NPC出现初始化(详情看原版npc宏)
      };
      /** @type {(Object<any,Function>|Function)[]} */
      this.initFunction = [];
      /** @type {string[]|Function[]} */
      this.specialWidget = [];
      /** @type {Object<string,Array<string>|Function>} */
      this.default = {};
      this.widgethtml = '';
      this.patchedPassage = new Set();
      this.locationPassage = {};
      this.widgetPassage = {};
      maplebirch.trigger(':framework-init', this);
    }

    /**
     * 注册初始化部件
     * @param {...(string|Function|Object)} widgets - 要注册的部件
     */
    onInit(...widgets) {
      widgets.forEach(widget => {
        if (typeof widget === 'string') {
          this.data.Init.push(widget);
        } else {
          this.initFunction.push(widget);
        }
      });
    }

    /**
     * 添加部件到指定区域
     * @param {string} zone - 目标区域名称
     * @param {...(string|Function|Object<any,Array<string>>|Array<string>)} widgets - 要添加的部件
     */
    addTo(zone, ...widgets) {
      if (!this.data[zone]) { this.log(`区域 ${zone} 不存在`, 'ERROR'); return; }
      widgets.forEach(widget => {
        if (zone === 'CustomLinkZone') {
          let position = 0;
          let pureWidget = null;
          if (Array.isArray(widget) && widget.length === 2) {
            position = widget[0];
            pureWidget = widget[1];
          } else if (typeof widget === 'object') {
            position = widget.widget[0];
            pureWidget = {
              widget: widget.widget[1],
              passage: widget.passage,
              exclude: widget.exclude,
              match: widget.match,
            }
          }
          this.data[zone].push({ position, widget: pureWidget });
        } else {
          if (typeof widget === 'string') {
            this.data[zone].push(widget);
          } else if (typeof widget === 'function') {
            const funcName = widget.name || `func_${this.#hashCode(widget.toString())}`;
            this.initFunction.push({ name: funcName, func: widget });
            this.data[zone].push(`run ${funcName}()`);
          } else if (typeof widget === 'object' && widget.widget) {
            this.data[zone].push(widget);
          }
        }
      });
    }

    /** @param {string} str */
    #hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(16).substring(0, 8);
    }

    storyInit() {
      if (this.initFunction.length === 0) return;
      this.log(`执行 ${this.initFunction.length} 个初始化函数`, 'DEBUG');
      
      this.initFunction.forEach(initfunc => {
        try {
          if (typeof initfunc === 'function') {
            initfunc();
          } else if (typeof initfunc === 'object' && typeof initfunc.init === 'function') {
            initfunc.init();
          }
        } catch (/**@type {any}*/error) {
          this.log(`初始化函数执行失败: ${error.message}`, 'ERROR');
          this.log(error.stack, 'DEBUG');
        }
      });
    }

    async #createWidgets() {
      const data = this.data;
      const print = {
        start : (/** @type {string} */zone) => {
          let html = `<<widget "maplebirch${zone}">>\n\t`;
          if (typeof this.default[zone] === 'function') {
            html += `${this.default[zone]()}\n\t`;
          } else if (typeof this.default[zone] === 'string') {
            html += `${this.default[zone]}\n\t`;
          }
          return html;
        },
        end : (/** @type {string} */zone, /** @type {number} */length) => {
          let html = '\n<</widget>>\n\n';
          const br = ['CaptionAfterDescription'];
          if (br.includes(zone) && length > 0) html = `<br>\n\t${html}`;
          return html;
        }
      };

      let html = '\r\n';

      for (const zone in data) {
        if (new Set(['BeforeLinkZone', 'AfterLinkZone', 'CustomLinkZone']).has(zone)) continue;
        let _html = print.start(zone);
        _html += `<<= maplebirch.tool.framework.play("${zone}")>>`;
        _html += print.end(zone, data[zone].length);
        html += _html;
      }
      
      this.widgethtml = html;
      this.log('部件代码创建完成', 'DEBUG');
    }

    async #createSpecialWidgets() {
      let html = '\r\n';
      for (const widget of this.specialWidget) {
        if (typeof widget === 'function') {
          html += widget();
        } else if (typeof widget === 'string') {
          html += widget;
        }
      }

      this.widgethtml += html;
      return html;
    }

    /**
     * 渲染指定区域内容
     * @param {string} zone - 区域名称
     * @param {string} passageTitle - 当前段落标题
     * @returns {string|object|object[]} 渲染结果
     */
    play(zone, passageTitle) {
      const data = this.data[zone];
      if (!data?.length) return '';
      const title = passageTitle ?? V.passage;
      if (zone === 'CustomLinkZone') {
        /**@type {any[]}*/
        const sortedData = data.slice().sort((/**@type {Object<Any,Number>}*/a, /**@type {Object<Any,Number>}*/b) => a.position - b.position);
        /**@type {Object<any,any>}*/
        const positionGroups = {};
        sortedData.forEach(item => {
          const pos = item.position;
          positionGroups[pos] = positionGroups[pos] || [];
          positionGroups[pos].push(item.widget);
        });
        return Object.entries(positionGroups).map(([posStr, widgets]) => ({
          position: parseInt(posStr),
          macro: widgets.map((/**@type {string|Object}*/ w) => this.#renderWidget(w, title)).join('')
        }));
      }
      return data.reduce((result, widget) => result + this.#renderWidget(widget, title), '');
    }

    /**
     * 私有方法：渲染单个部件
     * @param {string|Object<any,any>} widget - 部件定义
     * @param {string} title - 当前段落标题
     * @returns {string} 渲染结果
     */
    #renderWidget(widget, title) {
      if (typeof widget === 'string') {
        return `<<${widget}>>`;
      }

      if (typeof widget === 'object') {
        if (widget.type === 'function') {
          const funcString = widget.func.toString();
          return `<<run (${funcString})()>>`;
        }

        const { exclude, match, passage, widget: widgetName } = widget;

        if (exclude) {
          if (!exclude.includes(title)) return `<<${widgetName}>>`;
          return '';
        }

        if (match instanceof RegExp && match.test(title)) {
          return `<<${widgetName}>>`;
        }

        if (passage) {
          const shouldInclude = (typeof passage === 'string' && passage === title) || (Array.isArray(passage) && passage.includes(title)) || (passage.length === 0);
          if (shouldInclude) return `<<${widgetName}>>`;
          return '';
        }

        if (widgetName) return `<<${widgetName}>>`;
      }

      return '';
    }

    /**
     * 私有方法：匹配并应用替换规则
     * @param {Object<any,any>} set - 替换配置
     * @param {string} source - 原始文本
     * @returns {string} 处理后的文本
     */
    #matchAndApply(set, source) {
      const patterns = [
        { type: 'src', pattern: set.src },
        { type: 'srcmatch', pattern: set.srcmatch },
        { type: 'srcmatchgroup', pattern: set.srcmatchgroup },
      ];
      for (const { type, pattern } of patterns) {
        if (!pattern) continue;
        let matched = false;
        switch (type) {
          case 'src': if (typeof pattern === 'string' && source.includes(pattern)) matched = true; break;
          case 'srcmatch': if (pattern instanceof RegExp) matched = pattern.test(source); break;
          case 'srcmatchgroup': if (pattern instanceof RegExp) matched = pattern.test(source); break;
        }
        if (!matched) continue;
        let result = source;
        switch (type) {
          case 'src':
            if (set.to) result = source.replace(pattern, set.to);
            if (set.applyafter) result = source.replace(pattern, (match) => match + set.applyafter);
            if (set.applybefore) result = source.replace(pattern, (match) => set.applybefore + match);
            break;
          case 'srcmatch':
            if (set.to) result = source.replace(pattern, set.to);
            if (set.applyafter) result = source.replace(pattern, (match) => match + set.applyafter);
            if (set.applybefore) result = source.replace(pattern, (match) => set.applybefore + match);
            break;
          case 'srcmatchgroup':
            if (pattern instanceof RegExp) {
              const matches = source.match(pattern) || [];
              if (matches.length > 0) {
                matches.forEach(match => {
                  if (set.to) { result = result.replace(match, set.to); }
                  else if (set.applyafter) { result = result.replace(match, match + set.applyafter); }
                  else if (set.applybefore) { result = result.replace(match, set.applybefore + match); }
                });
              }
            }
            break;
        }
        if (result !== source) return result;
      }
      const patternType = set.src ? '字符串' : set.srcmatch ? '正则' : set.srcmatchgroup ? '正则组' : '未知';
      const pattern = set.src || set.srcmatch?.toString() || set.srcmatchgroup?.toString() || '无';
      this.log(`替换失败: 未找到匹配 (${patternType}: ${pattern})`, 'WARN');
      return source;
    }

    /**
     * 私有方法：特殊段落包装
     * @param {Object<string,string>} passage - 段落对象
     * @param {string} title - 段落标题
     * @returns {Object} 包装后的段落
     */
    #wrapSpecialPassages(passage, title) {
      const wrappers = {
        'StoryCaption': (/**@type {string}*/content) => content,
        'PassageHeader': (/**@type {string}*/content) => `<div id="passage-header">\n${content}\n<<maplebirchHeader>>\n</div>`,
        'PassageFooter': (/**@type {string}*/content) => `<div id="passage-footer">\n<<maplebirchFooter>>\n${content}\n</div>`,
        'default': (/**@type {string}*/content) => `<div id="passage-content">\n<<= maplebirch.state.StateManager.trigger('interrupt')>>\n${content}\n<<= maplebirch.state.StateManager.trigger('overlay')>>\n</div>`
      };
      // @ts-ignore
      const wrapper = wrappers[title] || wrappers.default;
      passage.content = wrapper(passage.content);
      return passage;
    }

    /**
     * 私有方法：应用内容补丁
     * @param {Object<string,string>} passage - 段落对象
     * @param {string} title - 段落标题
     * @param {Object<string,string>} patchSets - 补丁配置
     * @returns {Object} 修改后的段落
     */
    #applyContentPatches(passage, title, patchSets) {
      if (!patchSets || !patchSets[title]) return passage;
      let source = String(passage.content);
      for (const set of patchSets[title]) source = this.#matchAndApply(set, source);
      passage.content = source;
      return passage;
    }

    /**
     * 主段落处理函数
     * @param {'before'|'after'} type - 时机类型
     * @param {Object<any,any>} passage - 段落对象
     * @param {string} title - 段落标题
     * @returns {Promise<Object>} 处理后的段落
     */
    async patchPassage(type, passage, title) { 
      if (!this.patchedPassage.has(title) && type === 'before') {
        if (passage.tags.includes('widget')) {
          if (Object.keys(this.widgetPassage).length > 0) passage = this.#applyContentPatches(passage, title, this.widgetPassage);
        } else {
          if (Object.keys(this.locationPassage).length > 0) passage = this.#applyContentPatches(passage, title, this.locationPassage);
        }
        this.patchedPassage.add(title);
      }
      if (type === 'after') if (!passage.tags.includes('widget')) passage = this.#wrapSpecialPassages(passage, title);
      return passage;
    }

    /**
     * 部件初始化
     * @param {Map<string,any>} passageData - 段落数据映射
     * @returns {Promise<Map<string,string>>} 处理后的段落数据
     */
    async widgetInit(passageData) {
      await this.#createWidgets();
      await this.#createSpecialWidgets();

      let data = {
        id       : 0,
        name     : 'Maplebirch Frameworks Widgets',
        position : '100,100',
        size     : '100,100',
        tags     : ['widget'],
        content  : this.widgethtml
      };

      passageData.set('Maplebirch Frameworks Widgets', data);
      this.log('创建部件段落: Maplebirch Frameworks Widgets', 'DEBUG');

      const storyInit = passageData.get('StoryInit');
      if (storyInit) {
        storyInit.content += '\n<<maplebirchInit>>\n';
        passageData.set('StoryInit', storyInit);
      }
      
      return passageData;
    }

    /** @param {'before'|'after'} type */
    async patchModToGame(type) {
      const oldSCdata = modSC2DataManager.getSC2DataInfoAfterPatch();
      const SCdata = oldSCdata.cloneSC2DataInfo();
      const passageData = SCdata.passageDataItems.map;
  
      if (type === 'before') await this.widgetInit(passageData);
      
      for (const [title, passage] of passageData) {
        try {
          this.patchPassage(type, passage, title);
        } catch (/**@type {any}*/e) {
          const errorMsg = e?.message ? e.message : e;
          this.log(`处理段落 ${title} 时出错: ${errorMsg}`, 'ERROR');
          addonTweeReplacer.logger.error(`PatchScene: ${title} ${errorMsg}`);
        }
      }
      SCdata.passageDataItems.back2Array();
      addonTweeReplacer.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
      this.log('框架补丁应用完成', 'DEBUG');
    }
  }

  // 链接区域管理工具 - 用于在链接前后插入区域
  const applyLinkZone = (() => {
    'use strict';

    const defaultConfig = {
      containerId: 'passage-content',
      linkSelector: '.macro-link',
      beforeMacro: () => maplebirch.tool.framework.play('BeforeLinkZone'),
      afterMacro: () => maplebirch.tool.framework.play('AfterLinkZone'),
      customMacro: () => maplebirch.tool.framework.play('CustomLinkZone'),
      zoneStyle: {
        display: 'none',
        verticalAlign: 'top',
      },
      onBeforeApply: null,
      onAfterApply: null,
      debug: false
    };

    /** @param {string} message @param {any[]} objects */
    function log(message, level = 'INFO', ...objects) {
      maplebirch.log(`[tool] ${message}`, level, ...objects);
    }

    function apply(userConfig = {}) {
      const config = maplebirch.tool.merge({}, defaultConfig, userConfig);
      config.onBeforeApply?.();
      const linkZone = new LinkZoneManager(config.containerId, config.linkSelector, log);
      const result = linkZone.applyZones(config);
      if (result) addContentToZones(config);
      config.onAfterApply?.(result, config);
      return result;
    }

    /** @param {{ beforeMacro: string; afterMacro: string; customMacro: () => any[]; }} config */
    function addContentToZones(config) {
      defaultZone('beforeLinkZone', config.beforeMacro, config);
      defaultZone('afterLinkZone', config.afterMacro, config);
      const MacroArray = Array.isArray(config.customMacro()) ? config.customMacro() : [];
      if (MacroArray?.length > 0) {
        MacroArray.forEach((/** @type {{ position: number; macro: string; }} */zoneConfig) => {
          const position = zoneConfig.position;
          customZone(position, zoneConfig.macro, config);
        });
      }
    }

    /**
     * @param {string} zoneId
     * @param {string} macro
     * @param {{ beforeMacro: string; afterMacro: string; customMacro: () => any[]; }} config
     */
    function defaultZone(zoneId, macro, config) {
      const element = document.getElementById(zoneId);
      if (!element) return;
      processMacroContent(element, macro, config);
    }

    /**
     * @param {number} position
     * @param {string} macro
     * @param {{beforeMacro: string;afterMacro: string;customMacro: () => any[];}} config
     */
    function customZone(position, macro, config) {
      const element = document.querySelector(`[data-link-zone-position="${position}"]`);
      if (!element) return;
      processMacroContent(element, macro, config);
    }

    /**
     * @param {Element|any} element
     * @param {string|Function} macro
     * @param {{ beforeMacro?: string; afterMacro?: string; customMacro?: (() => any[]) | (() => any[]); debug?: boolean; }} config
     */
    function processMacroContent(element, macro, config) {
      let macroContent;
      if (typeof macro === 'function') {
        try {
          macroContent = macro();
        } catch (/**@type {any}*/error) {
          log(`[link] 执行宏函数出错: ${error.message}`, 'ERROR');
          return;
        }
      } else {
        macroContent = macro;
      }
      if (!macroContent) {
        element.innerHTML = '';
        element.style.display = 'none';
        return;
      }
      const tempContainer = document.createElement('div');
      if (typeof $.wiki === 'function') {
        $(tempContainer).wiki(macroContent);
      } else if (typeof Wikifier !== 'undefined') {
        new maplebirch.SugarCube.Wikifier(tempContainer, macroContent);
      } else if (typeof wikifier === 'function') {
        tempContainer.innerHTML = macroContent;
        wikifier(tempContainer);
      } else {
        tempContainer.innerHTML = macroContent;
      }
      element.innerHTML = '';
      element.append(...tempContainer.childNodes);
      element.querySelectorAll('script').forEach((/** @type {{ textContent: string | null; replaceWith: (arg0: HTMLScriptElement) => void; }} */script) => {
        const newScript = document.createElement('script');
        newScript.textContent = script.textContent;
        script.replaceWith(newScript);
      });
      if (element.childNodes.length > 0) {
        element.style.display = 'block';
      } else {
        element.style.display = 'none';
      }
      if (config.debug) log('[link] 添加内容到区域', 'DEBUG', macroContent);
    }

    class LinkZoneManager {
      /** @param {{ (message: string, level?: string, ...objects: any[]): void; (msg: string, level?: string, ...objs: any[]): void; }} logger */
      constructor(containerId = 'passages', linkSelector = '.macro-link', logger) {
        this.log = logger || maplebirch.log;
        this.containerId = containerId;
        this.linkSelector = linkSelector;
        this.#resetState();
      }

      #resetState() {
        this.firstLink = null;
        this.lastLink = null;
        /** @type {string | any[]} */
        this.allLinks = [];
        this.lineBreakBeforeFirstLink = null;
      }

      detectLinks() {
        this.#resetState();
        const container = document.getElementById(this.containerId);
        if (!container) return null;
        this.allLinks = Array.from(container.querySelectorAll(this.linkSelector)).filter(link => this.#isElementVisible(link));
        if (this.allLinks.length === 0) return null;
        this.firstLink = this.allLinks[0];
        this.lastLink = this.allLinks[this.allLinks.length - 1];
        this.#detectLineBreakBeforeFirstLink();
        return {
          firstLink: this.firstLink,
          lastLink: this.lastLink,
          totalLinks: this.allLinks.length,
          lineBreakBeforeFirstLink: this.lineBreakBeforeFirstLink
        };
      }

      #detectLineBreakBeforeFirstLink() {
        let node = this.firstLink.previousSibling;
        while (node) {
          if (this.#isLineBreakNode(node)) {
            this.lineBreakBeforeFirstLink = node;
            return;
          }
          node = node.previousSibling;
        }
      }

      /** @param {Element} node */
      #isLineBreakNode(node) {
        if (!node) return false;
        switch (node.nodeType) {
          case Node.TEXT_NODE:
            return /\n/.test(node.textContent);
          case Node.ELEMENT_NODE:
            if (['BR', 'HR'].includes(node.nodeName)) return true;
            const blockTags = ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE'];
            if (blockTags.includes(node.nodeName)) return true;
            return ['block', 'flex', 'grid', 'table', 'table-row', 'table-cell'].includes(getComputedStyle(node).display);
          default:
            return false;
        }
      }

      /** @param {Element} element */
      #isElementVisible(element) {
        if (!element || !element.getBoundingClientRect) return false;
        const { display, visibility, opacity } = getComputedStyle(element);
        if (display === 'none' || visibility === 'hidden' || opacity === '0') return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      /**
       * @param {?string} id
       * @param {{ zoneStyle: any;}} config
       */
      #createZoneElement(id, config) {
        const zone = document.createElement('div');
        if (id) zone.id = id;
        Object.assign(zone.style, config.zoneStyle);
        return zone;
      }

      /**
       * @param {any} position
       * @param {{ zoneStyle: any; }} config
       */
      #applyCustomLinkZone(position, config) {
        // @ts-ignore
        if (position < 0 || position >= this.allLinks.length) return null;
        // @ts-ignore
        const targetLink = this.allLinks[position];
        if (!targetLink) {
          this.log(`[link] 未找到位置 ${position} 的链接`, 'WARN');
          return null;
        }
        const zone = this.#createZoneElement(null, config);
        zone.setAttribute('data-link-zone-position', position);
        let lineBreakNode = null;
        let node = targetLink.previousSibling;
        while (node) {
          if (this.#isLineBreakNode(node)) {
            lineBreakNode = node;
            break;
          }
          node = node.previousSibling;
        }
        if (lineBreakNode) {
          if (lineBreakNode.nodeType === Node.TEXT_NODE) {
            const content = lineBreakNode.textContent;
            const breakIndex = content.lastIndexOf('\n');
            if (breakIndex === -1) {
              lineBreakNode.after(zone);
            } else {
              const beforeText = content.substring(0, breakIndex + 1);
              const afterText = content.substring(breakIndex + 1);
              lineBreakNode.textContent = beforeText;
              lineBreakNode.after(zone, document.createTextNode(afterText));
            }
          } else {
            lineBreakNode.after(zone);
          }
        } else {
          targetLink.before(zone);
        }
        this.log(`[link] 在位置 ${position} 的链接前插入区域（ID: ${zone.id}）`, 'DEBUG', targetLink);
        return zone;
      }

      /** @param {{ debug?: any; customMacro?: any; zoneStyle: any; }} config */
      applyZones(config) {
        const results = this.detectLinks();
        if (!results) {
          if (config.debug) this.log('[link] 没有找到可见链接', 'DEBUG');
          return false;
        }
        this.#applyBeforeLinkZone(config);
        this.#applyAfterLinkZone(config);
        const MacroArray = Array.isArray(config.customMacro()) ? config.customMacro() : [];
        if (MacroArray?.length > 0) {
          MacroArray.forEach((/** @type {{ position: number; }} */zoneConfig) => {
            this.#applyCustomLinkZone(zoneConfig.position, config);
          });
        }
        return true;
      }

      /** @param {{ debug?: any; zoneStyle: any; }} config */
      #applyBeforeLinkZone(config) {
        if (!this.firstLink || !this.lineBreakBeforeFirstLink) return;
        const zone = this.#createZoneElement('beforeLinkZone', config);
        if (this.lineBreakBeforeFirstLink.nodeType === Node.TEXT_NODE) {
          const content = this.lineBreakBeforeFirstLink.textContent;
          const breakIndex = content.lastIndexOf('\n');
          if (breakIndex === -1) {
            this.lineBreakBeforeFirstLink.after(zone);
          } else {
            const beforeText = content.substring(0, breakIndex + 1);
            const afterText = content.substring(breakIndex + 1);
            this.lineBreakBeforeFirstLink.textContent = beforeText;
            this.lineBreakBeforeFirstLink.after(zone, document.createTextNode(afterText));
          }
        } else {
          this.lineBreakBeforeFirstLink.after(zone);
        }
        if (config.debug) this.log('应用链接前区域', 'DEBUG', zone);
      }

      /** @param {{ debug?: any; zoneStyle: any; }} config */
      #applyAfterLinkZone(config) {
        if (!this.lastLink) return;
        const zone = this.#createZoneElement('afterLinkZone', config);
        this.lastLink.after(zone);
        if (config.debug) this.log('应用链接后区域', 'DEBUG', zone);
      }
    }

    Object.defineProperties(LinkZoneManager, {
      apply:          { value: apply },
      add:            { value: addContentToZones },
      defaultConfig:  { get: () => defaultConfig },
      removeZones:    { value: () => {
        document.getElementById('beforeLinkZone')?.remove();
        document.getElementById('afterLinkZone')?.remove();
        document.querySelectorAll('[data-link-zone-position]').forEach(zone => zone.remove());
      } },
    });

    return LinkZoneManager
  })()

  // 其他系统工具 - 用于管理特质和地点配置
  class others {
    static get traitCategories() {
      return {
        "General Traits"   : "一般特质",
        "Medicinal Traits" : "医疗特质",
        "Special Traits"   : "特殊特质",
        "School Traits"    : "学校特质",
        "Trauma Traits"    : "创伤特质",
        "NPC Traits"       : "NPC特质",
        "Hypnosis Traits"  : "催眠特质",
        "Acceptance Traits": "接纳特质"
      };
    }

    /** @param {Object<string,string>} englishName */
    static getTraitCategory(englishName) {
      // @ts-ignore
      return this.traitCategories[englishName] || englishName;
    }

    /** @param {{ (message: string, level?: string, ...objects: any[]): void; (msg: string, level?: string, ...objs: any[]): void; }} logger */
    constructor(logger) {
      this.log = logger;
      /** @type {any[]} */
      this.traitsTitle = [];
      /** @type {{ title: any; name: any; colour: any; has: any; text: any; }[]} */
      this.traitsData = [];
      /** @type {any} */
      this.locationData = {};
      /** @type {any} */
      this.bodywritingData = {};
    }

    /** @param {any} data */
    #getTraits(data) {
      /** @type {any} */
      const titleMap = {};
      const traitLists = maplebirch.tool.clone(data);
      traitLists.forEach((/** @type {{ title: { [x: string]: string; }; }} */ category, /** @type {any} */ index) => {
        const mappedTitle = others.getTraitCategory(category.title);
        titleMap[mappedTitle] = index;
        if (!this.traitsTitle.includes(mappedTitle)) this.traitsTitle.push(mappedTitle);
      });
      return titleMap;
    }

    /** @param {any[]} data */
    addTraits(...data) {
      data.forEach(traits => {
        if (traits && traits.title && traits.name) {
          const mappedTitle = others.getTraitCategory(traits.title);
          const nameValue = typeof traits.name === 'function' ? traits.name() : traits.name;
          const existingIndex = this.traitsData.findIndex(t => t.title === mappedTitle && t.name === nameValue);
          if (existingIndex >= 0) {
            this.traitsData[existingIndex] = {
              title: mappedTitle,
              name: nameValue,
              colour: traits.colour,
              has: traits.has,
              text: traits.text
            };
          } else {
            this.traitsData.push({
              title: mappedTitle,
              name: nameValue,
              colour: traits.colour,
              has: traits.has,
              text: traits.text
            });
          }
        }
      });
    }

    /** @param {any} data */
    initTraits(data) {
      const titleMap = this.#getTraits(data);
      const result = maplebirch.tool.clone(data);
      this.traitsData.forEach(trait => {
        const title = trait.title;
        const colourValue = typeof trait.colour === 'function' ? trait.colour() : trait.colour || '';
        const hasValue = typeof trait.has === 'function' ? trait.has() : trait.has || false;
        const textValue = typeof trait.text === 'function' ? trait.text() : trait.text || '';
        if (titleMap[title] !== undefined) {
          result[titleMap[title]].traits.push({
            name: trait.name,
            colour: colourValue,
            has: hasValue,
            text: textValue
          });
        } else {
          result.push({
            title: title,
            traits: [{
              name: trait.name,
              colour: colourValue,
              has: hasValue,
              text: textValue
            }]
          });
          titleMap[title] = result.length - 1;
          if (!this.traitsTitle.includes(title)) this.traitsTitle.push(title);
        }
      });
      T.traitLists = result;
      return true;
    }

    /**
     * 地点配置方法（添加/更新）
     * @param {string} locationId - 地点ID
     * @param {object} config - 配置对象
     * @param {any} [config.customMapping] - 自定义映射
     * @param {object} [options] - 配置选项
     * @param {boolean} [options.overwrite=false] - 是否覆盖整个配置
     * @param {string} [options.layer] - 指定操作图层
     * @param {string} [options.element] - 指定操作元素
     */
    configureLocation(locationId, config, options = {}) {
      const { overwrite = false, layer, element } = options;
      if (!this.locationData[locationId]) {
        this.locationData[locationId] = {
          overwrite: false,
          config: {},
          customMapping: null
        };
      }
      const update = this.locationData[locationId];
      if (overwrite) {
        update.overwrite = true;
        update.config = maplebirch.tool.clone(config);
        update.customMapping = config.customMapping || null;
      } else if (layer && element) {
        if (!update.config[layer]) update.config[layer] = {};
        update.config[layer][element] = {
          ...(update.config[layer][element] || {}),
          ...config
        };
      } else {
        update.config = this.#deepMergeLocationConfig(update.config, config);
        if (config.customMapping) update.customMapping = config.customMapping;
      }
      return true;
    }

    applyLocation() {
      for (const [locationId, update] of Object.entries(this.locationData)) {
        const current = setup.LocationImages[locationId] || {};
        if (update.overwrite || !setup.LocationImages[locationId]) {
          setup.LocationImages[locationId] = {
            folder: update.config.folder || current.folder || 'default',
            base: update.config.base || current.base || {},
            emissive: update.config.emissive || current.emissive,
            reflective: update.config.reflective || current.reflective,
            layerTop: update.config.layerTop || current.layerTop
          };
        } else {
          setup.LocationImages[locationId] = this.#deepMergeLocationConfig(current, update.config);
        }
        if (update.customMapping) setup.Locations[locationId] = update.customMapping;
      }
      this.locationData = {};
      return true;
    }

    /** @param {any} target @param {any} source */
    #deepMergeLocationConfig(target, source) {
      const filterFn = (/** @type {string} */ key, /** @type {any} */ value, /** @type {number} */ depth) => {
        if (depth === 1) return key === "folder" || ['base', 'emissive', 'reflective', 'layerTop'].includes(key);
        return true;
      }
      return maplebirch.tool.merge(target, source, { mode: "merge", filterFn });
    }

    /**
     * 添加身体涂鸦配置
     * @param {string} key - 涂鸦的唯一标识符，将用作 setup.bodywriting 的键名
     * @param {object} config - 涂鸦配置对象
     * @param {string} [config.writing] - 英文涂鸦文本
     * @param {string} [config.writ_cn] - 中文涂鸦文本
     * @param {string} [config.type='text'] - 涂鸦类型(text文本/object图形)
     * @param {number} [config.arrow=0] - 是否有指向性箭头(0/1)
     * @param {string} [config.special='none'] - 类别暗示，如''none'-无,'rape'-强奸,'Robin'-罗宾
     * @param {string} [config.gender='n'] - 性别暗示，n=中性，f=女性，m=男性，h=双性
     * @param {number} [config.lewd=0] - 是否有淫秽暗示(0/1)
     * @param {number} [config.degree=0] - 金钱价值程度-1000=10￡
     * @param {boolean} [config.featSkip=true] - 是否跳过成就检查
     * @param {string[]} [config.sprites] - 精灵图身体部位
     */
    addBodywriting(key, config) {
      this.bodywritingData[key] = {
        operation: 'add',
        config: maplebirch.tool.clone(config)
      };
    }

    /** @param {string|number} key */
    delBodywriting(key) {
      this.bodywritingData[key] = { operation: 'del' };
    }

    applyBodywriting() {
      for (const [key, data] of Object.entries(this.bodywritingData)) {
        if (data.operation === 'del') {
          if (setup.bodywriting[key]) {
            const index = setup.bodywriting[key].index;
            delete setup.bodywriting[key];
            if (setup.bodywriting_namebyindex[index] === key) delete setup.bodywriting_namebyindex[index];
          }
        } else if (data.operation === 'add') {
          const config = data.config;
          if (config.index === undefined) {
            let maxIndex = 0;
            for (let writingKey in setup.bodywriting) {
              if (setup.bodywriting[writingKey].index > maxIndex) maxIndex = setup.bodywriting[writingKey].index;
            }
            config.index = maxIndex + 1;
          }
          const defaultConfig = { key: key, type: 'text', arrow: 0, special: 'none', gender: 'n', lewd: 0, degree: 0, featSkip: true };
          setup.bodywriting[key] = { ...defaultConfig, ...config };
          setup.bodywriting_namebyindex[config.index] = key;
        }
      }
      this.bodywritingData = {};
      return true;
    }
  }

  maplebirch.once(':tool-init', (/**@type {tools}*/data) => {
    migration.init(data.createLog);
    randSystem.init(data.createLog);
    Object.assign(data, {
      migration: Object.freeze(migration),
      rand: Object.freeze(randSystem),
      widget: new defineWidget(data.createLog('widget')),
      text: new htmlTools(data.createLog('text')),
      framework: new frameworks(data.createLog('framework')),
      linkzone: Object.freeze(applyLinkZone),
      other: new others(data.createLog('other')),
    });
  });
})();