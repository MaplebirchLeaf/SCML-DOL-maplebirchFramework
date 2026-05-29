// ./src/core.ts

import type { TwineSugarCube } from '../types/twine-sugarcube';
import type { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import type { ModUtils } from '@scml/types/sugarcube-2-ModLoader/Utils';
import type { Gui } from '@scml/types/Mod_LoaderGui/Gui';
import { author } from '../package.json';
import jsyaml from 'js-yaml';
import { Howl, Howler } from 'howler';
import * as marked from 'marked';
import { lastModifiedBy, lastUpdate } from '../package.json';
import { version, Languages } from './constants';
import * as utils from './utils';
import Logger from './services/Logger';
import EventEmitter from './services/EventEmitter';
import IndexedDBService from './services/IndexedDBService';
import CredentialVault from './services/CredentialVault';
import LanguageManager from './services/LanguageManager';
import ModuleSystem from './services/ModuleSystem';
import GUIControl from './services/GUIControl';
import type AddonPlugin from './modules/AddonPlugin';
import type DynamicManager from './modules/Dynamic';
import type ToolCollection from './modules/ToolCollection';
import type AudioManager from './modules/Audio';
import type Variables from './modules/Variables';
import type Character from './modules/Character';
import type NPCManager from './modules/NamedNPC';
import type CombatManager from './modules/Combat';

const renderer = new marked.Renderer();

renderer.link = function ({ href, title, tokens }: marked.Tokens.Link) {
  const linkText = marked.Parser.parseInline(tokens);
  return `<a href='${href}' target='_blank'>${linkText}</a>`;
};

renderer.heading = function (token: marked.Tokens.Heading) {
  const id = token.text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `<h${token.depth} id='${id}'>${token.text}</h${token.depth}>`;
};

marked.setOptions({
  renderer: renderer,
  gfm: true,
  breaks: true,
  pedantic: false
});

let jsSugarCube: TwineSugarCube;

interface Extensions {}

type Instance = MaplebirchCore & Extensions;

class MaplebirchCore {
  static meta = {
    name: 'maplebirch Frameworks' as const,
    author: author,
    version: version,
    modifiedby: lastModifiedBy,
    updateDate: lastUpdate,
    Languages: Languages,
    early: ['addon', 'dynamic', 'tool', 'char', 'npc'] as const,
    core: ['addon', 'dynamic', 'tool', 'audio', 'var', 'char', 'npc', 'combat'] as const,
    protected: ['addon', 'dynamic', 'tool', 'audio', 'var', 'char', 'npc', 'combat', 'internals'] as const
  };

  readonly meta: typeof MaplebirchCore.meta;
  modList: string[];
  readonly manager: { modSC2DataManager: SC2DataManager; modLoaderGui: Gui };
  passage: any;
  readonly yaml: typeof jsyaml;
  readonly howler: { Howl: typeof Howl; Howler: typeof Howler };
  readonly logger: Logger;
  readonly tracer: EventEmitter;
  readonly idb: IndexedDBService;
  readonly credential: CredentialVault;
  readonly lang: LanguageManager;
  readonly modules: ModuleSystem;
  readonly gui: GUIControl;
  declare readonly addon: AddonPlugin;
  declare readonly dynamic: DynamicManager;
  declare readonly tool: ToolCollection;
  declare readonly audio: AudioManager;
  declare readonly var: Variables;
  declare readonly char: Character;
  declare readonly npc: NPCManager;
  declare readonly combat: CombatManager;

  constructor(modSC2DataManager: SC2DataManager, modLoaderGui: Gui) {
    this.meta = { ...MaplebirchCore.meta };
    this.modList = [];
    this.manager = { modSC2DataManager, modLoaderGui };
    this.passage = null;
    this.yaml = Object.freeze(jsyaml);
    this.howler = Object.freeze({ Howl, Howler });
    this.logger = Object.seal(new Logger(this));
    this.tracer = Object.seal(new EventEmitter(this));
    this.idb = Object.seal(new IndexedDBService(this));
    this.lang = Object.seal(new LanguageManager(this));
    this.credential = Object.seal(new CredentialVault(this));
    this.modules = Object.seal(new ModuleSystem(this));
    this.gui = Object.seal(new GUIControl(this));
    this.log(`框架核心系统创建完成(v${MaplebirchCore.meta.version})`, 'INFO');
  }

  log(msg: string, level: string = 'INFO', ...objs: any[]): void {
    this.logger.log(msg, level, ...objs);
  }

  on(eventName: string, callback: (...args: any[]) => any, description: string = ''): boolean {
    return this.tracer.on(eventName, callback, description);
  }

  off(eventName: string, identifier: string | ((...args: any[]) => any)): boolean {
    return this.tracer.off(eventName, identifier);
  }

  once(eventName: string, callback: (...args: any[]) => any, description: string = ''): boolean {
    return this.tracer.once(eventName, callback, description);
  }

  after(eventName: string, callback: (...args: any[]) => any) {
    return this.tracer.after(eventName, callback);
  }

  async trigger(evt: string, ...args: any[]): Promise<void> {
    await this.tracer.trigger(evt, ...args);
  }

  register(name: string, module: any, dependencies: string[] = []): boolean {
    return this.modules.register(name, module, dependencies);
  }

  t(key: string, space: boolean = false): string {
    return this.lang.t(key, space);
  }

  auto(text: string): string {
    return this.lang.auto(text);
  }

  async disabled(modNames: string | string[], reload: boolean = true): Promise<boolean> {
    const modLoadController = this.modUtils.getModLoadController();
    const [enabledModsRaw = [], disabledModsRaw = []] = await Promise.all([modLoadController.listModIndexDB(), modLoadController.loadHiddenModList()]);
    const enabledMods = [...new Set(enabledModsRaw.map(name => name.trim()).filter(Boolean))];
    const disabledMods = [...new Set(disabledModsRaw.map(name => name.trim()).filter(Boolean))];
    const enabledSet = new Set(enabledMods);
    const disabledSet = new Set(disabledMods);
    const targets = new Set((Array.isArray(modNames) ? modNames : [modNames]).map(name => name.trim()).filter(name => name && enabledSet.has(name)));
    if (targets.size === 0) return false;
    const nextEnabledMods = enabledMods.filter(modName => !targets.has(modName));
    const nextDisabledMods = [...disabledMods, ...[...targets].filter(modName => !disabledSet.has(modName))];
    if (nextEnabledMods.length === enabledMods.length && nextDisabledMods.length === disabledMods.length) return false;
    await Promise.all([modLoadController.overwriteModIndexDBModList(nextEnabledMods), modLoadController.overwriteModIndexDBHiddenModList(nextDisabledMods)]);
    if (reload) location.reload();
    return true;
  }

  get lodash(): ReturnType<ModUtils['getLodash']> {
    return this.modUtils.getLodash();
  }

  get marked(): typeof marked {
    return marked;
  }

  set SugarCube(parts: TwineSugarCube) {
    jsSugarCube = parts;
  }

  get SugarCube(): TwineSugarCube {
    return jsSugarCube;
  }

  set Language(lang: string) {
    void this.lang.setLanguage(lang).then(() => this.trigger(':language'));
  }

  get Language(): string {
    return this.lang.language;
  }

  set LogLevel(level: string) {
    this.logger.LevelName = level;
  }

  get LogLevel(): string {
    return this.logger.LevelName;
  }

  get(name: string): any {
    return this.modules.registry.modules.get(name);
  }

  get dependencyGraph(): any {
    return this.modules.dependencyGraph;
  }

  get modLoader(): ReturnType<SC2DataManager['getModLoader']> {
    return this.manager.modSC2DataManager.getModLoader();
  }

  get modUtils(): ModUtils {
    return this.manager.modSC2DataManager.getModUtils();
  }

  get gameVersion(): string {
    return (StartConfig as any).version;
  }
}

var maplebirch = new MaplebirchCore(window.modSC2DataManager, window.modLoaderGui) as Instance;

for (const key of Object.keys(utils) as (keyof typeof utils)[]) Object.defineProperty(window, key, { value: utils[key], enumerable: true, writable: false, configurable: false });

function createlog(prefix: string) {
  return (message: string, level: string = 'INFO', ...objects: any[]) => maplebirch.log(`[${prefix}] ${message}`, level, ...objects);
}

export { MaplebirchCore, type Extensions, createlog };
export default maplebirch;
