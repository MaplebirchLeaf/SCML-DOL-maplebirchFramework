// ./src/modules/Internals.ts

import maplebirch, { type MaplebirchCore, createlog } from '../core';
import { _language, _languageSwitch, _languageButton, _languageLink, _languageListbox, _radiobuttonsfrom, _overlayReplace } from '../database/SugarCubeMacros';

type Updater = () => void;
type DynamicTask = (...args: any[]) => any;
type TextItem = string | number | boolean | null | undefined;

interface LanguageManager {
  managers: Record<string, Set<Updater>>;
  add(macroType: string, updater: Updater): void;
  remove(macroType: string, updater: Updater): void;
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

  private relationTimer: ReturnType<typeof setTimeout> | null = null;
  private modI18NPatched = false;

  constructor(readonly core: MaplebirchCore) {
    this.log = createlog('internals');

    this.core.once(':sugarcube', () => {
      const macro = this.core.tool.macro;
      macro.define('language', _language, ['option'], false, false);
      macro.define('lanSwitch', _languageSwitch);
      macro.define('lanButton', _languageButton, null, false, true);
      macro.define('lanLink', _languageLink, null, false, true);
      macro.define('lanListbox', _languageListbox, ['option', 'optionsfrom'], ['optionsfrom'], true);
      macro.define('radiobuttonsfrom', _radiobuttonsfrom, null, false, true);
      macro.define('maplebirchReplace', (name: string, type: string) => _overlayReplace(name, type));
      macro.define('maplebirchTextOutput', this.core.tool.text.makeTextOutput());
      macro.defineS('maplebirchFrameworkVersions', this.showModVersions.bind(this));
      macro.defineS('maplebirchFrameworkInfo', () => this.showFrameworkInfo());
    });
  }

  languageManager(): void {
    const managers: Record<string, Set<Updater>> = {
      language: new Set(),
      lanSwitch: new Set(),
      lanButton: new Set(),
      lanLink: new Set(),
      lanListbox: new Set(),
      radiobuttonsfrom: new Set()
    };

    this.core.on(
      ':language',
      () => {
        for (const [macroType, updaters] of Object.entries(managers)) {
          for (const updater of updaters) {
            try {
              updater();
            } catch (error) {
              maplebirch.log(`Language update error for ${macroType}`, 'ERROR', error);
            }
          }
        }
      },
      'language macro manager'
    );

    this.core.once(':passagestart', () => Object.values(managers).forEach(manager => manager.clear()));
    setup.maplebirch ??= {};
    setup.maplebirch.language = {
      managers,
      add(macroType: string, updater: Updater) {
        managers[macroType] ??= new Set();
        managers[macroType].add(updater);
      },
      remove(macroType: string, updater: Updater) {
        managers[macroType]?.delete(updater);
      }
    } as LanguageManager;
  }

  fixDynamicTask(fn: DynamicTask, name: string): DynamicTask {
    const task = (...args: any[]) => {
      try {
        return fn.apply(this, args);
      } catch (error) {
        console.error(`[Dynamic.task] Error in task '${name}':`, error);
        return null;
      }
    };
    Object.defineProperty(task, 'toString', {
      value: () => name,
      writable: true,
      configurable: true
    });
    if ((Dynamic as any).stage === (Dynamic as any).Stage.Settled) {
      try {
        task();
      } catch (error) {
        console.warn('Encountered an unexpected critical error while performing a dynamic render task', name, error);
      }
    } else {
      (Dynamic as any).tasks.push(task);
    }
    return task;
  }

  private modDisplayName(modinfo: ModInfo): string | false {
    if (!modinfo.nickName) return this.core.lang.auto(modinfo.name);
    if (typeof modinfo.nickName === 'string') return this.core.lang.auto(modinfo.nickName);
    if (!modinfo.nickName || typeof modinfo.nickName !== 'object') return false;
    const translations: Record<string, string> = {};
    for (const [language, text] of Object.entries(modinfo.nickName)) translations[language.toUpperCase()] = text;
    const key = `modList_${modinfo.name}`;
    if (!this.core.lang.has(key)) this.core.lang.set(key, translations);
    return this.core.lang.t(key);
  }

  private collectFrameworkMods(): void {
    const modList = this.core.modUtils.getModListName();
    for (const modName of modList) {
      const modinfo = this.core.modUtils.getMod(modName) as ModInfo | undefined;
      if (!modinfo?.bootJson?.dependenceInfo) continue;
      const dependsOnMaplebirch = modinfo.bootJson.dependenceInfo.some(dep => dep.modName === 'maplebirch');
      if (dependsOnMaplebirch && !this.core.modList.includes(modinfo.name)) this.core.modList.push(modinfo.name);
    }
  }

  showModVersions(): string {
    return `<div id='modversions'>Maplebirch Framework v${this.core.meta.version}|${this.core.modList.length}</div>`;
  }

  showFrameworkInfo(): string {
    this.collectFrameworkMods();
    const info = `
      <div class='p-2 text-align-center'>
        <h3>[[<<lanSwitch 'Maplebirch Framework' '秋枫白桦框架'>>|'https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchframework']]</h3>
        <div class='m-2'><span class='gold'><<lanSwitch 'Version: ' '版本：'>></span>${this.core.meta.version}<br></div>
        <div class='m-2'><span class='gold'><<lanSwitch 'Author: ' '作者：'>></span>${this.core.meta.author}<br></div>
        <div class='m-2'><span class='gold'><<lanSwitch 'Last Update: ' '最后更新：'>></span>${this.core.meta.updateDate}<br></div>
        <div class='m-2'><span class='gold'><<lanSwitch 'Last Modified By: ' '最后修改者：'>></span>${this.core.meta.modifiedby}<br></div>
      </div>`;
    const mods: string[] = [];
    for (const modId of this.core.modList) {
      const modinfo = this.core.modUtils.getMod(modId) as ModInfo | undefined;
      if (!modinfo) continue;
      const name = this.modDisplayName(modinfo);
      if (!name) continue;
      mods.push(`<div class='modinfo'>・${name}：v${modinfo.version}</div>`);
    }
    if (mods.length === 0) return info;
    return info + `<div class='p-2 text-align-center'><h3><<lanSwitch 'Framework Mod List' '框架模组列表'>></h3><div id='modlist'>${mods.join('')}</div></div>`;
  }

  compatibleModI18N(): void {
    if (this.modI18NPatched) return;
    const originalName = setup.NPC_CN_NAME;
    const originalTitle = setup.NPC_CN_TITLE;
    if (typeof originalName === 'function') {
      setup.NPC_CN_NAME = (text: string) => {
        if (!text || typeof text !== 'string') return text;
        const result = originalName(text);
        if (result !== text) return result;
        if (this.core.lang.has(text)) return this.core.auto(text);
        return text;
      };
    }
    if (typeof originalTitle === 'function') {
      setup.NPC_CN_TITLE = (text: string) => {
        if (!text || typeof text !== 'string') return text;
        const result = originalTitle(text);
        if (result !== text) return result;
        if (this.core.lang.has(text)) return this.core.auto(text);
        return text;
      };
    }
    this.modI18NPatched = true;
  }

  preInit(): void {
    (window as any).lanSwitch = Object.freeze(_languageSwitch);

    this.core.tool.onInit(() => {
      setup.maplebirch ??= {};
      this.languageManager();
      setup.maplebirch.hint = this.uniqueTextStore();
      setup.maplebirch.content = this.uniqueTextStore();
    });

    this.core.tool.other.configureLocation(
      'lake_ruin',
      {
        condition: () => Weather.bloodMoon && !Weather.isSnow
      },
      { layer: 'base', element: 'bloodmoon' }
    );

    this.core.tool.other.configureLocation(
      'lake_ruin',
      {
        condition: () => Weather.bloodMoon && Weather.isSnow
      },
      { layer: 'base', element: 'bloodmoon_snow' }
    );

    this.optionOverlayEvents();
    this.relationStyleEvent();
  }

  Init(): void {
    Dynamic.task = (fn: DynamicTask, name: string) => this.fixDynamicTask(fn, name);
    if (this.core.modUtils.getMod('ModI18N')) this.compatibleModI18N();
  }

  private uniqueTextStore(): { push: (...args: TextItem[]) => void; readonly play: string } {
    const items: TextItem[] = [];
    return {
      push(...args: TextItem[]) {
        for (const item of args) if (!items.includes(item)) items.push(item);
      },
      get play() {
        return items.map(item => (item == null ? '' : typeof item === 'string' ? item : item.toString())).join('');
      }
    };
  }

  private optionOverlayEvents(): void {
    const refreshOptions = () => {
      if (!maplebirch.modules.initPhase.preInitCompleted) return;
      try {
        $.wiki('<<replace #customOverlayContent>><<maplebirchOptions>><</replace>>');
      } catch (error) {
        this.log('选项界面刷新错误:', 'ERROR', error);
      }
    };

    const updateSidebar = () => {
      if (!maplebirch.modules.initPhase.preInitCompleted) return;
      try {
        $.wiki('<<updatesidebarimg>>');
      } catch (error) {
        this.log('侧边栏图片更新错误:', 'ERROR', error);
      }
    };

    $(document).on('change', 'select[name="lanListbox-optionsmaplebirchnpcsidebarnnpc"]', refreshOptions);
    $(document).on('change', 'select[name="lanListbox-optionsmaplebirchcharactercharartselect"]', refreshOptions);
    $(document).on('change', 'select[name="lanListbox-optionsmaplebirchcharactercloseupselect"]', refreshOptions);
    $(document).on('change', 'select[name="lanListbox-optionsmaplebirchnpcsidebarfacevariant"]', updateSidebar);
  }

  private relationStyleEvent(): void {
    $(document).on('click', '.link-internal.macro-button', () => {
      if (!maplebirch.modules.initPhase.preInitCompleted) return;
      if (this.relationTimer) clearTimeout(this.relationTimer);
      this.relationTimer = setTimeout(() => {
        try {
          const count = (V.options.maplebirch?.relationcount ?? 4) - 2;
          document.querySelectorAll('.relation-stat-list').forEach(list => (list as HTMLElement).style.setProperty('--maplebirch-relation-count', count.toString()));
        } catch (error) {
          this.log('关系数量样式刷新错误:', 'ERROR', error);
        }
      }, 100);
    });
  }
}

(function (maplebirch): void {
  'use strict';
  maplebirch.register('internals', Object.seal(new Internals(maplebirch)), ['tool']);
})(maplebirch);

export default Internals;
