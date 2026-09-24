import type { MaplebirchCore } from '../core';
import dol from '../host/DoL';
import { actionTypes, type ActionType } from '../modules/CombatAddon/CombatAction';
import { _language, _languageSwitch, _languageButton, _languageLink, _languageListbox, _radiobuttonsfrom, _overlayReplace } from '.';

type Updater = () => void;

interface LanguageMacroRegistry {
  managers: Record<string, Set<Updater>>;
  add(macroType: string, updater: Updater, root?: Node): void;
  remove(macroType: string, updater: Updater): void;
}

interface ModInfo {
  name: string;
  nickName?: string | Record<string, string>;
  version: string;
  bootJson?: { dependenceInfo?: Array<{ modName: string }> };
}

class Macros {
  private installed = false;

  public constructor(private readonly core: MaplebirchCore) {}

  public install(): void {
    if (this.installed) return;
    this.installed = true;
    const managers: Record<string, Set<Updater>> = Object.fromEntries(['language', 'lanSwitch', 'lanButton', 'lanLink', 'lanListbox', 'radiobuttonsfrom'].map(name => [name, new Set<Updater>()]));
    const roots = new WeakMap<Updater, Node>();
    const connected = (updater: Updater) => roots.get(updater)?.isConnected ?? true;
    const cleanup = () => {
      for (const updaters of Object.values(managers)) for (const updater of updaters) if (!connected(updater)) updaters.delete(updater);
    };
    this.core.on(
      ':language',
      () => {
        cleanup();
        const pending = Object.entries(managers).map(([macroType, updaters]) => [macroType, [...updaters]] as const);
        for (const [macroType, updaters] of pending) {
          for (const updater of updaters) {
            if (!managers[macroType].has(updater) || !connected(updater)) continue;
            try {
              updater();
            } catch (error) {
              this.core.infra.diagnostics.write(`Language update error for ${macroType}`, 'ERROR', 'language-macros', error);
            }
          }
        }
        cleanup();
      },
      'language macro manager'
    );
    this.core.on(':passageend', cleanup, 'language macro cleanup');
    dol.setup.maplebirch.language = {
      managers,
      add(macroType, updater, root) {
        managers[macroType] ??= new Set();
        managers[macroType].add(updater);
        if (root) roots.set(updater, root);
      },
      remove(macroType, updater) {
        managers[macroType]?.delete(updater);
        roots.delete(updater);
      }
    } as LanguageMacroRegistry;
  }

  private modDisplayName(modinfo: ModInfo): string | false {
    const translator = this.core.services.translator;
    if (!modinfo.nickName) return translator.auto(modinfo.name);
    if (typeof modinfo.nickName === 'string') return translator.auto(modinfo.nickName);
    const translations: Record<string, string> = {};
    for (const [language, text] of Object.entries(modinfo.nickName)) translations[language.toUpperCase()] = text;
    const key = `modList_${modinfo.name}`;
    if (!translator.has(key)) translator.set(key, translations);
    return translator.t(key);
  }

  private collectFrameworkMods(): void {
    const addon = this.core.services.addonPlugin;
    for (const modName of this.core.modUtils.getModListName()) {
      const modinfo = this.core.modUtils.getMod(modName) as ModInfo | undefined;
      if (!modinfo?.bootJson?.dependenceInfo?.some(dep => dep.modName === 'maplebirch')) continue;
      if (!addon.modList.includes(modinfo.name)) addon.modList.push(modinfo.name);
    }
  }

  private showFrameworkInfo(): string {
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
    for (const modId of this.core.services.addonPlugin.modList) {
      const modinfo = this.core.modUtils.getMod(modId) as ModInfo | undefined;
      if (!modinfo) continue;
      const name = this.modDisplayName(modinfo);
      if (name) mods.push(`<div class='modinfo'>・${name}：v${modinfo.version}</div>`);
    }
    return mods.length ? info + `<div class='p-2 text-align-center'><h3><<lanSwitch 'Framework Mod List' '框架模组列表'>></h3><div id='modlist'>${mods.join('')}</div></div>` : info;
  }

  private showFrameworkNotice(): string {
    const titleSource = "<<lanSwitch 'Welcome to' '欢迎使用'>>[[<<lanSwitch 'Maplebirch Framework' '秋枫白桦框架'>>|https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchframework]]";
    const title = $('<div>').wiki(titleSource).html() || titleSource;
    const t = (key: string) => this.core.t(key);
    dol.temporary.maplebirchNoticeLinksEnabled = Links.enabled;
    dol.temporary.maplebirchNoticeVerify = false;
    Links.enabled = false;
    $('#story').addClass('gateBlur');
    $('#ui-bar').addClass('gateBlur');
    return `
    <<dialog ${JSON.stringify(title)} 'class' true>>
      ${t('framework.notice.desc')}<br><br>
      <b>${t('framework.notice.issue.title')}</b><br>
      <ol><li>${t('framework.notice.issue.mod')}</li><li>${t('framework.notice.issue.framework')}</li><li>${t('framework.notice.issue.report')}</li></ol>
      <div class='text-align-center'>
        <label><<checkbox '_maplebirchNoticeVerify' false true autocheck>>${t('framework.notice.verify')}</label><br>
        <div class='m-2'>
          <<button ${JSON.stringify(t('framework.notice.confirm'))}>>
            <<if _maplebirchNoticeVerify>>
              <<set Links.enabled to _maplebirchNoticeLinksEnabled>>
              <<run $('#story').removeClass('gateBlur')>>
              <<run $('#ui-bar').removeClass('gateBlur')>>
              <<run localStorage.setItem('maplebirchFrameworkNotice', 'true')>>
              <<dialogclose>>
            <</if>>
          <</button>>
        </div>
      </div>
    <</dialog>>
  `;
  }

  public notice(): void {
    this.core.dynamic.regStateEvent('gate', 'notice', {
      output: 'maplebirchFrameworkNotice',
      priority: 1000,
      once: false,
      cond: () => localStorage.getItem('verifiedAge') === 'true' && !localStorage.getItem('maplebirchFrameworkNotice'),
      extra: { passage: ['Start'] }
    });
  }

  public register(): void {
    const core = this.core;
    const macro = core.tool.macro;
    macro.define('language', _language, ['option'], false, false);
    macro.define('lanSwitch', _languageSwitch);
    macro.define('lanButton', _languageButton, null, false, true);
    macro.define('lanLink', _languageLink, null, false, true);
    macro.define('lanListbox', _languageListbox, ['option', 'optionsfrom'], ['optionsfrom'], true);
    macro.define('radiobuttonsfrom', _radiobuttonsfrom, null, false, true);
    macro.define('maplebirchReplace', (name: string, type: string) => _overlayReplace(name, type));
    macro.define('maplebirchTextOutput', core.tool.text.makeTextOutput());
    macro.define('maplebirchCombatAction', function () {
      if (!this.args.every((arg): arg is ActionType => (actionTypes as readonly unknown[]).includes(arg))) return this.error('Invalid combat action type.');
      const effects = core.combat?.CombatAction?.effect?.(...this.args);
      if (effects) this.output.append(core.host.sugarcube.require().Wikifier.wikifyEval(effects));
    });
    macro.defineS('maplebirchFrameworkVersions', () => `<div id='modversions'>Maplebirch Framework v${core.meta.version}|${core.services.addonPlugin.modList.length}</div>`);
    macro.defineS('maplebirchFrameworkInfo', () => this.showFrameworkInfo());
    macro.defineS('maplebirchFrameworkNotice', () => this.showFrameworkNotice());
    macro.defineS('maplebirchTimeTravel', () => core.tool.console.timeTravel.fragment());
  }
}

export default Macros;
