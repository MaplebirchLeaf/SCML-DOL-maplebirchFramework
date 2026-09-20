// ./src/core.ts

import type { TwineSugarCube } from '../types/twine-sugarcube';
import type { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import type { ModUtils } from '@scml/types/sugarcube-2-ModLoader/Utils';
import type { Gui } from '@scml/types/Mod_LoaderGui/Gui';
import type { Passage } from '@scml/types/sugarcube-2-ModLoader/SugarCube2';
import { author } from '../package.json';
import jsyaml from 'js-yaml';
import { Howl, Howler } from 'howler';
import * as marked from 'marked';
import { lastModifiedBy, lastUpdate } from '../package.json';
import { version, Languages } from './constants';
import * as utils from './utils';
import Logger from './services/Logger';
import EventEmitter, { type EventCallback } from './services/EventEmitter';
import IndexedDBService from './services/IndexedDBService';
import CredentialVault from './services/CredentialVault';
import CloudSaveService from './services/CloudSaveService';
import LanguageManager from './services/LanguageManager';
import ModuleSystem, { type Module, type DependencyGraph } from './services/ModuleSystem';
import GUIControl from './services/GUIControl';
import type AddonPlugin from './modules/AddonPlugin';
import type Save from './modules/Addon/Save';
import type DynamicManager from './modules/Dynamic';
import type ToolCollection from './modules/ToolCollection';
import type AudioManager from './modules/Audio';
import type Variables from './modules/Variables';
import type Character from './modules/Character';
import type NPCManager from './modules/NamedNPC';
import type CombatManager from './modules/Combat';

const renderer = new marked.Renderer();

renderer.link = function ({ href, title, tokens }: marked.Tokens.Link) {
  const linkText = this.parser.parseInline(tokens);
  const titleAttribute = title ? ` title="${utils.escapeHtmlText(title)}"` : '';
  return `<a href="${utils.escapeHtmlText(href)}"${titleAttribute} target="_blank" rel="noopener noreferrer">${linkText}</a>`;
};

renderer.heading = function (token: marked.Tokens.Heading) {
  const id = token.text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `<h${token.depth} id="${id}">${this.parser.parseInline(token.tokens)}</h${token.depth}>`;
};

marked.setOptions({
  renderer: renderer,
  gfm: true,
  breaks: true,
  pedantic: false
});

let jsSugarCube: TwineSugarCube;

interface Extensions {}

interface CoreModules {
  readonly addon: AddonPlugin;
  readonly dynamic: DynamicManager;
  readonly tool: ToolCollection;
  readonly audio: AudioManager;
  readonly var: Variables;
  readonly char: Character;
  readonly npc: NPCManager;
  readonly combat: CombatManager;
}

interface CoreEvents {
  ':indexedDB': [];
  ':idbReady': [];
  ':import': [];
  ':variable': [];
  ':onSave': [save: Save];
  ':onLoad': [save: Save];
  ':language': [];
  ':storyready': [];
  ':passageinit': [passage: Passage];
  ':passagestart': [passage: Passage, content: HTMLDivElement];
  ':passagerender': [passage: Passage, content: HTMLDivElement];
  ':passagedisplay': [passage: Passage, content: HTMLDivElement];
  ':passageend': [passage: Passage, content: HTMLDivElement];
  ':sugarcube': [];
  ':modLoaderEnd': [];
}

type Instance = MaplebirchCore & Extensions;

class MaplebirchCore {
  public static meta: {
    name: 'maplebirch Frameworks';
    author: string;
    version: string;
    modifiedby: string;
    updateDate: string;
    Languages: typeof Languages;
    early: readonly string[];
    core: readonly string[];
    protected: readonly string[];
  } = {
    name: 'maplebirch Frameworks',
    author,
    version,
    modifiedby: lastModifiedBy,
    updateDate: lastUpdate,
    Languages,
    early: ['addon', 'dynamic', 'tool', 'char', 'npc'],
    core: ['addon', 'dynamic', 'tool', 'audio', 'var', 'char', 'npc', 'combat'],
    protected: ['addon', 'dynamic', 'tool', 'audio', 'var', 'char', 'npc', 'combat', 'internals']
  };

  public readonly meta: typeof MaplebirchCore.meta;
  public readonly utils = utils.publicUtils;
  public readonly modList: string[];
  public readonly manager: { modSC2DataManager: SC2DataManager; modLoaderGui: Gui };
  public passage: Passage | null;
  public readonly yaml: typeof jsyaml;
  public readonly howler: { Howl: typeof Howl; Howler: typeof Howler };
  public readonly logger: Logger;
  public readonly tracer: EventEmitter;
  public readonly idb: IndexedDBService;
  public readonly credential: CredentialVault;
  public readonly cloudSave: CloudSaveService;
  public readonly lang: LanguageManager;
  public readonly modules: ModuleSystem;
  public readonly gui: GUIControl;

  declare public readonly addon: CoreModules['addon'];
  declare public readonly dynamic: CoreModules['dynamic'];
  declare public readonly tool: CoreModules['tool'];
  declare public readonly audio: CoreModules['audio'];
  declare public readonly var: CoreModules['var'];
  declare public readonly char: CoreModules['char'];
  declare public readonly npc: CoreModules['npc'];
  declare public readonly combat: CoreModules['combat'];

  public constructor(modSC2DataManager: SC2DataManager, modLoaderGui: Gui) {
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
    this.cloudSave = Object.seal(new CloudSaveService(this));
    this.modules = Object.seal(new ModuleSystem(this));
    this.gui = Object.seal(new GUIControl(this));
    this.log(`框架核心系统创建完成(v${MaplebirchCore.meta.version})`, 'DEBUG');
  }

  public log(msg: string, level: string = 'INFO', ...objs: unknown[]): void {
    this.logger.log(msg, level, ...objs);
  }

  public on<Name extends keyof CoreEvents>(eventName: Name, callback: EventCallback<CoreEvents[Name]>, description?: string): boolean;
  public on<Name extends string, Args extends unknown[]>(eventName: Name extends keyof CoreEvents ? never : Name, callback: EventCallback<Args>, description?: string): boolean;
  public on<Args extends unknown[]>(eventName: string, callback: EventCallback<Args>, description: string = ''): boolean {
    return this.tracer.on(eventName, callback, description);
  }

  public off<Args extends unknown[]>(eventName: string, identifier: string | EventCallback<Args>): boolean {
    return this.tracer.off(eventName, identifier);
  }

  public once<Name extends keyof CoreEvents>(eventName: Name, callback: EventCallback<CoreEvents[Name]>, description?: string): boolean;
  public once<Name extends string, Args extends unknown[]>(eventName: Name extends keyof CoreEvents ? never : Name, callback: EventCallback<Args>, description?: string): boolean;
  public once<Args extends unknown[]>(eventName: string, callback: EventCallback<Args>, description: string = ''): boolean {
    return this.tracer.once(eventName, callback, description);
  }

  public after<Name extends keyof CoreEvents>(eventName: Name, callback: EventCallback<CoreEvents[Name]>): void;
  public after<Name extends string, Args extends unknown[]>(eventName: Name extends keyof CoreEvents ? never : Name, callback: EventCallback<Args>): void;
  public after<Args extends unknown[]>(eventName: string, callback: EventCallback<Args>): void {
    return this.tracer.after(eventName, callback);
  }

  public trigger<Name extends keyof CoreEvents>(eventName: Name, ...args: CoreEvents[Name]): Promise<void>;
  public trigger<Name extends string>(eventName: Name extends keyof CoreEvents ? never : Name, ...args: unknown[]): Promise<void>;
  public async trigger(evt: string, ...args: unknown[]): Promise<void> {
    await this.tracer.trigger(evt, ...args);
  }

  public register<T extends object>(name: string, module: T & Module, dependencies: string[] = []): boolean {
    return this.modules.register(name, module, dependencies);
  }

  public t(key: string, space: boolean = false): string {
    return this.lang.t(key, space);
  }

  public auto(text: string): string {
    return this.lang.auto(text);
  }

  public async disabled(modNames: string | string[], reload: boolean = true): Promise<boolean> {
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

  public get lodash(): ReturnType<ModUtils['getLodash']> {
    return this.modUtils.getLodash();
  }

  public get marked(): typeof marked {
    return marked;
  }

  public set SugarCube(parts: TwineSugarCube) {
    jsSugarCube = parts;
  }

  public get SugarCube(): TwineSugarCube {
    return jsSugarCube;
  }

  public set Language(lang: string) {
    void this.lang.setLanguage(lang).then(() => this.trigger(':language'));
  }

  public get Language(): string {
    return this.lang.language;
  }

  public set LogLevel(level: string) {
    this.logger.LevelName = level;
  }

  public get LogLevel(): string {
    return this.logger.LevelName;
  }

  public get<K extends keyof (CoreModules & Extensions)>(name: K): (CoreModules & Extensions)[K] | undefined;
  public get(name: string): Module | undefined;
  public get(name: string): object | undefined {
    return this.modules.get(name);
  }

  public get dependencyGraph(): DependencyGraph {
    return this.modules.dependencyGraph;
  }

  public get modLoader(): ReturnType<SC2DataManager['getModLoader']> {
    return this.manager.modSC2DataManager.getModLoader();
  }

  public get modUtils(): ModUtils {
    return this.manager.modSC2DataManager.getModUtils();
  }

  public get gameVersion(): string {
    return StartConfig.version;
  }
}

var maplebirch = new MaplebirchCore(window.modSC2DataManager, window.modLoaderGui) as Instance;

utils.prototypeUtils();
for (const [key, value] of Object.entries(utils.publicUtils)) Object.defineProperty(window, key, { value, enumerable: true, writable: false, configurable: false });

function createlog(prefix: string) {
  return (message: string, level: string = 'INFO', ...objects: unknown[]) => maplebirch.log(`[${prefix}] ${message}`, level, ...objects);
}

export { MaplebirchCore, type CoreModules, type CoreEvents, type Extensions, createlog };
export default maplebirch;
