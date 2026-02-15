// ./src/modules/Internals.ts

import maplebirch, { MaplebirchCore, createlog } from '../core';
import { _language, _languageSwitch, _languageButton, _languageLink, _languageListbox, _radiobuttonsfrom, _overlayReplace } from '../database/SugarCubeMacros';

interface LanguageManager {
  managers: {
    language: Map<Function, Function>;
    lanSwitch: Map<Function, Function>;
    lanButton: Map<Function, Function>;
    lanLink: Map<Function, Function>;
    lanListbox: Map<Function, Function>;
    radiobuttonsfrom: Map<Function, Function>;
    [key: string]: Map<Function, Function>;
  };
  initialized?: boolean;
  core?: MaplebirchCore;
  init(this: LanguageManager): void;
  add(this: LanguageManager, macroType: string, updater: Function): void;
  remove(this: LanguageManager, macroType: string, updater: Function): void;
}

interface ModInfo {
  name: string;
  nickName?: string | Record<string, string>;
  version: string;
  bootJson?: {
    dependenceInfo?: Array<{ modName: string }>;
  };
}

class Internals {
  readonly log: ReturnType<typeof createlog>;
  updateTimer: any;
  private readonly _: typeof maplebirch.lodash;

  constructor(readonly core: MaplebirchCore) {
    this.log = createlog('internals');
    this.updateTimer = null;
    this._ = core.lodash;
  }

  languageManager() {
    const languageManager: LanguageManager = {
      managers: { language: new Map(), lanSwitch: new Map(), lanButton: new Map(), lanLink: new Map(), lanListbox: new Map(), radiobuttonsfrom: new Map(), },
      core: this.core,
      init(this: LanguageManager) {
        if (this.initialized) return;
        this.core!.on(':language', () => {
          for (const [macroType, manager] of Object.entries(this.managers)) {
            manager.forEach((updater: Function) => {
              try { updater(); }
              catch (e) { maplebirch.log(`Language update error for ${macroType}`, 'ERROR', e); }
            });
          }
        });
        this.core!.once(':passagestart', () => Object.values(this.managers).forEach((manager: Map<Function, Function>) => manager.clear()));
        this.initialized = true;
      },
      add(this: LanguageManager, macroType: string, updater: Function) {
        if (!this.managers[macroType]) this.managers[macroType] = new Map();
        this.managers[macroType].set(updater, updater);
        this.init();
      },
      remove(this: LanguageManager, macroType: string, updater: Function) {
        this.managers[macroType]?.delete(updater);
      }
    };
    (setup as any).maplebirch.language = languageManager;
  }

  _fixDynamicTask(fn: Function, name: string): Function {
    const taskFn = (...args: any[]) => {
      try {
        return fn.apply(this, args);
      } catch (error) {
        console.error(`[Dynamic.task] Error in task '${name}':`, error);
        return null;
      }
    };
    Object.defineProperty(taskFn, 'toString', { value: () => name, writable: true, configurable: true });
    if ((Dynamic as any).stage === (Dynamic as any).Stage.Settled) {
      try { taskFn(); }
      catch (e) { console.warn(`Encountered an unexpected critical error while performing a dynamic render task`, name, e); }
    } else {
      (Dynamic as any).tasks.push(taskFn);
    }
    return taskFn;
  }

  #getModName(modinfo: ModInfo): string | false {
    if (!modinfo.nickName) return this.core.lang.auto(modinfo.name);
    if (this._.isString(modinfo.nickName)) return this.core.lang.auto(modinfo.nickName as string);
    if (this._.isObject(modinfo.nickName)) {
      const translationsObj = this._.chain(modinfo.nickName)
        .toPairs()
        .reduce((acc: Record<string, string>, [lang, text]: [string, string]) => {
          acc[lang.toUpperCase()] = text;
          return acc;
        }, {})
        .value();
      const mapKey = `modList_${modinfo.name}`;
      if (!this.core.lang.translations.has(mapKey)) this.core.lang.translations.set(mapKey, translationsObj);
      return this.core.lang.t(mapKey);
    }
    return false;
  }

  #getModDependenceInfo() {
    const modList = this.core.modUtils.getModListName();
    for (let i = 0; i < modList.length; i++) {
      const modName = modList[i];
      const modinfo = this.core.modUtils.getMod(modName);
      if (!modinfo) continue;
      if (!modinfo.bootJson.dependenceInfo) continue;
      if (modinfo.bootJson.dependenceInfo.some((dep: any) => dep.modName === 'maplebirch') && !this.core.modList.includes(modinfo.name)) this.core.modList.push(modinfo.name);
    }
  }

  _showModVersions(): string {
    const html = `<div id='modversions'>Maplebirch Framework v${maplebirch.meta.version}|${maplebirch.modList.length}</div>`;
    return html;
  }

  _showFrameworkInfo(): string {
    let html_1 = `
      <div class='p-2 text-align-center'>
        <h3>[[<<lanSwitch 'Maplebirch Framework' '秋枫白桦框架'>>|'https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchframework']]</h3>
        <div class='m-2'><span class='gold'><<lanSwitch 'Version: ' '版本：'>></span>${this.core.meta.version}<br></div>
        <div class='m-2'><span class='gold'><<lanSwitch 'Author: ' '作者：'>></span>${this.core.meta.author}<br></div>
        <div class='m-2'><span class='gold'><<lanSwitch 'Last Modified By: ' '最后修改者：'>></span>${this.core.meta.modifiedby}<br></div>
      </div>`;
    this.#getModDependenceInfo();
    const modlist = this.core.modList;
    const html: string[] = [];
    for (let i = 0; i < modlist.length; i++) {
      const modId = modlist[i];
      const modinfo = this.core.modUtils.getMod(modId);
      if (!modinfo) continue;
      const modname = this.#getModName(modinfo);
      const modversion = modinfo.version;
      const text = `<div class='modinfo'>・${modname}：v${modversion}</div>`;
      html.push(text);
    }
    if (html.length > 0) html_1 += `<div class='p-2 text-align-center'><h3><<lanSwitch 'Framework Mod List' '框架模组列表'>></h3><div id='modlist'>${html.join('')}</div></div>`;
    return html_1;
  }

  compatibleModI18N() {
    const originalName = setup.NPC_CN_NAME;
    setup.NPC_CN_NAME = (args: string) => {
      if (!args || !this._.isString(args)) return args;
      const originalResult = originalName(args);
      if (originalResult !== args) return originalResult;
      if (this.core.lang.translations.has(args)) return this.core.auto(args);
      return args;
    };
    const originalTitle = setup.NPC_CN_TITLE;
    setup.NPC_CN_TITLE = (str: string) => {
      if (!str || !this._.isString(str)) return str;
      const originalResult = originalTitle(str);
      if (originalResult !== str) return originalResult;
      if (this.core.lang.translations.has(str)) return this.core.auto(str);
      return str;
    };
  }

  preInit() {
    window.lanSwitch = Object.freeze(_languageSwitch);

    this.core.tool.onInit(() => {
      setup.maplebirch = {};
      this.languageManager();
      setup.maplebirch.hint = (() => {
        const hint: any[] = [];
        function push(...args: any[]) { args.forEach(item => { if (!hint.includes(item)) hint.push(item); }); }
        return { push, get play() { return hint.map(item => `${item}`).join(''); } };
      })();
      setup.maplebirch.content = (() => {
        const content: any[] = [];
        function push(...args: any[]) { args.forEach(item => { if (!content.includes(item)) content.push(item); }); }
        return { push, get play() { return content.map(item => `${item}`).join(''); } };
      })();
    });

    this.core.once(':sugarcube', () => {
      this.core.tool.macro.define('language', _language, ['option'], false, false);
      this.core.tool.macro.define('lanSwitch', _languageSwitch);
      this.core.tool.macro.define('lanButton', _languageButton, null, false, true);
      this.core.tool.macro.define('lanLink', _languageLink, null, false, true);
      this.core.tool.macro.define('lanListbox', _languageListbox, ['option', 'optionsfrom'], ['optionsfrom'], true);
      this.core.tool.macro.define('radiobuttonsfrom', _radiobuttonsfrom, null, false, true);
      this.core.tool.macro.define('maplebirchReplace', (name: string, type: string) => _overlayReplace(name, type));
      this.core.tool.macro.define('maplebirchTextOutput', this.core.tool.text.makeTextOutput());
      this.core.tool.macro.defineS('maplebirchFrameworkVersions', this._showModVersions);
      this.core.tool.macro.defineS('maplebirchFrameworkInfo', () => this._showFrameworkInfo());
    });

    this.core.tool.other.configureLocation('lake_ruin', {
      condition: () => Weather.bloodMoon && !Weather.isSnow
    }, { layer: 'base', element: 'bloodmoon' });

    this.core.tool.other.configureLocation('lake_ruin', {
      condition: () => Weather.bloodMoon && Weather.isSnow
    }, { layer: 'base', element: 'bloodmoon_snow' });

    $(document).on('change', 'select[name="lanListbox-optionsmaplebirchnpcsidebarnnpc"]', () => {
      if (!maplebirch.modules.initPhase.preInitCompleted) return;
      try { $.wiki('<<replace #customOverlayContent>><<maplebirchOptions>><</replace>>'); } catch (error) { this.log('图形选择错误:', 'ERROR', error); }
    });

    $(document).on('change', 'select[name="lanListbox-optionsmaplebirchnpcsidebarfacevariant"]', () => {
      if (!maplebirch.modules.initPhase.preInitCompleted) return;
      try { $.wiki('<<updatesidebarimg>>'); } catch (error) { this.log('姿态更新错误:', 'ERROR', error); }
    });

    $(document).on('change', 'select[name="lanListbox-optionsmaplebirchcharactercharartselect"]', () => {
      if (!maplebirch.modules.initPhase.preInitCompleted) return;
      try { $.wiki('<<replace #customOverlayContent>><<maplebirchOptions>><</replace>>'); } catch (error) { this.log('渐变调整错误:', 'ERROR', error); }
    });

    $(document).on('change', 'select[name="lanListbox-optionsmaplebirchcharactercloseupselect"]', () => {
      if (!maplebirch.modules.initPhase.preInitCompleted) return;
      try { $.wiki('<<replace #customOverlayContent>><<maplebirchOptions>><</replace>>'); } catch (error) { this.log('渐变调整错误:', 'ERROR', error); }
    });

    $(document).on('click', '.link-internal.macro-button', () => {
      if (!maplebirch.modules.initPhase.preInitCompleted) return;
      if (this.updateTimer) clearTimeout(this.updateTimer);
      try {
        this.updateTimer = setTimeout(() => {
          const count = ((V.options.maplebirch?.relationcount ?? 4) - 2);
          document.querySelectorAll('.relation-stat-list').forEach((list: Element) => (list as HTMLElement).style.setProperty('--maplebirch-relation-count', count.toString()));
        }, 100);
      } catch {}
    });
  }

  Init() {
    Dynamic.task = (fn: Function, name: string) => this._fixDynamicTask(fn, name);
    if (this.core.modUtils.getMod('ModI18N')) this.compatibleModI18N();
  }
}

(async function(maplebirch) {
  'use strict';
  await maplebirch.register('Internals', Object.freeze(new Internals(maplebirch)), ['tool']);
})(maplebirch)