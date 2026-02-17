// ./src/core.ts

import jsyaml from 'js-yaml';
import { Howl, Howler } from 'howler';
import { SugarCubeObject } from 'twine-sugarcube';
import { SC2DataManager } from '@scml/sc2-modloader/SC2DataManager';
import { Gui } from '@scml/mod-loader-gui/Gui';
import * as lodash from 'lodash-es';
import { version, lastModifiedBy, lastUpdate, Languages } from './constants';
import Logger from './services/Logger';
import EventEmitter from './services/EventEmitter';
import IndexedDBService from './services/IndexedDBService';
import LanguageManager from './services/LanguageManager';
import ModuleSystem from './services/ModuleSystem';
import GUIControl from './services/GUIControl';
import AddonPlugin from './modules/AddonPlugin';
import DynamicManager from './modules/Dynamic';
import ToolCollection from './modules/ToolCollection';
import AudioManager from './modules/Audio';
import Variables from './modules/Variables';
import Character from './modules/Character';
import NPCManager from './modules/NamedNPC';
import CombatManager from './modules/Combat';

let jsSugarCube: SugarCubeObject;

class MaplebirchCore {
  static meta = {
    name: 'maplebirch Frameworks' as const,
    author: '楓樺葉' as const,
    version: version,
    modifiedby: lastModifiedBy,
    updateDate: lastUpdate,
    Languages: Languages,
    early: ['addon', 'dynamic', 'tool'] as const,
    core: ['addon', 'dynamic', 'tool', 'audio', 'var', 'char', 'npc', 'combat'] as const
  };

  readonly meta: typeof MaplebirchCore.meta;
  modList: string[];
  readonly manager: { modSC2DataManager: SC2DataManager; modLoaderGui: Gui };
  passage: any;
  onLoad: boolean;
  readonly yaml: typeof jsyaml;
  readonly howler: { Howl: typeof Howl; Howler: typeof Howler };
  readonly logger: Logger;
  readonly tracer: EventEmitter;
  readonly idb: IndexedDBService;
  readonly lang: LanguageManager;
  readonly modules: ModuleSystem;
  readonly gui: GUIControl;
  readonly addon: AddonPlugin;
  readonly dynamic: DynamicManager;
  readonly tool: ToolCollection;
  readonly audio: AudioManager;
  readonly var: Variables;
  readonly char: Character;
  readonly npc: NPCManager;
  readonly combat: CombatManager;

  constructor(modSC2DataManager: SC2DataManager, modLoaderGui: Gui) {
    this.meta = { ...MaplebirchCore.meta };
    this.modList = [];
    this.manager = { modSC2DataManager, modLoaderGui };
    this.passage = null;
    this.onLoad = false;
    this.yaml = Object.freeze(jsyaml);
    this.howler = Object.freeze({ Howl, Howler });
    this.logger = Object.seal(new Logger(this));
    this.tracer = Object.seal(new EventEmitter(this));
    this.idb = Object.seal(new IndexedDBService(this));
    this.lang = Object.seal(new LanguageManager(this));
    this.modules = Object.seal(new ModuleSystem(this));
    this.gui = Object.seal(new GUIControl(this));

    void this.logger.fromIDB();
    this.log(`开始设置初始化流程\n核心系统创建完成(v${MaplebirchCore.meta.version})`, 'INFO');
    const events = [':passageinit', ':passagestart', ':passagerender', ':passagedisplay', ':passageend', ':storyready'];
    events.forEach(event => $(document).on(event, (ev: any) => this.trigger(event, ev)));

    this.once(':import', async () => {
      await this.lang.preload();
      for await (const p of this.lang.importAll('maplebirch')) if (p.error) this.log(`导入失败: ${p.lang}`, 'ERROR');
    });

    this.once(':allModule', async () => {
      this.log('所有模块注册完成，开始预初始化', 'INFO');
      try {
        await this.trigger(':IndexedDB').then(async () => await this.idb.init().then(async () => await this.idb.checkStore()));
      } catch {
        this.log(':IndexedDB注册错误', 'ERROR');
      }
      await this.pre();
    });

    this.on(
      ':passageinit',
      async (ev: any) => {
        this.passage = ev.passage;
        if (!!this.passage && !this.passage.tags.includes('widget')) this.log(`处理段落: ${this.passage.title}`, 'INFO');
      },
      'collect passages'
    );

    this.on(
      ':passagestart',
      async () => {
        if (this.passage.title == 'Start' || this.passage.title == 'Downgrade Waiting Room') return;
        this.modules.initPhase.postInitExecuted = false;
        await this.init();
        if (this.onLoad)
          await this.load().then(() => {
            void this.trigger(':onLoadSave');
            this.onLoad = false;
          });
      },
      'loadInit'
    );

    this.on(
      ':passagerender',
      async () => {
        let retryCount = 0;
        const tryPostInit = async () => {
          if (this.modules.initPhase.loadInitExecuted) {
            await this.post();
          } else if (this.modules.initPhase.mainInitCompleted) {
            if (this.onLoad) return;
            await this.post();
          } else if (retryCount < 10) {
            retryCount++;
            setTimeout(tryPostInit, 5);
          }
        };
        await tryPostInit();
      },
      'postInit'
    );

    this.once(':storyready', async () => {
      this.SugarCube.Save.onSave.add(async () => this.trigger(':onSave'));
      this.SugarCube.Save.onLoad.add(async () => {
        await this.trigger(':onLoad').then(() => (this.onLoad = true));
        this.modules.initPhase.loadInitExecuted = false;
      });
    });

    this.ExModCount = 9;
    this.log('初始化流程设置结束', 'INFO');
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

  async register(name: string, module: any, dependencies: string[] = [], source?: string): Promise<boolean> {
    return this.modules.register(name, module, dependencies, source);
  }

  async pre(): Promise<void> {
    return await this.modules.preInit();
  }

  async init(): Promise<void> {
    return await this.modules.init();
  }

  async load(): Promise<void> {
    return await this.modules.loadInit();
  }

  async post(): Promise<void> {
    return await this.modules.postInit();
  }

  t(key: string, space: boolean = false): string {
    return this.lang.t(key, space);
  }

  auto(text: string): string {
    return this.lang.auto(text);
  }

  async disabled(modName: string): Promise<boolean> {
    const modLoadController = this.modUtils.getModLoadController();
    const [enabledMods, disabledMods] = await Promise.all([modLoadController.listModIndexDB(), modLoadController.loadHiddenModList()]);
    if (!enabledMods.includes(modName)) return false;
    enabledMods.splice(enabledMods.indexOf(modName), 1);
    if (!disabledMods.includes(modName)) disabledMods.push(modName);
    await Promise.all([modLoadController.overwriteModIndexDBModList(enabledMods), modLoadController.overwriteModIndexDBHiddenModList(disabledMods)]);
    location.reload();
    return true;
  }

  get lodash(): typeof lodash {
    return lodash;
  }

  set SugarCube(parts: SugarCubeObject) {
    jsSugarCube = parts;
  }

  get SugarCube(): SugarCubeObject {
    return jsSugarCube;
  }

  set Language(lang: string) {
    this.lang.setLanguage(lang);
    void this.trigger(':language');
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

  set ExModCount(count: number) {
    this.logger.log(`设置预期模块数量: ${count}`, 'DEBUG');
    (this.modules as any).ExpectedModuleCount = count;
  }

  getModule(name: string): any {
    return (this.modules as any).registry.modules.get(name);
  }

  get expected(): number {
    return (this.modules as any).initPhase.expectedCount;
  }

  get registered(): number {
    return (this.modules as any).initPhase.registeredCount;
  }

  get dependencyGraph(): any {
    return (this.modules as any).dependencyGraph;
  }

  get modLoader(): any {
    return this.manager.modSC2DataManager?.getModLoader();
  }

  get modUtils(): any {
    return this.manager.modSC2DataManager?.getModUtils();
  }

  get gameVersion(): string {
    return (StartConfig as any).version;
  }
}

var maplebirch = new MaplebirchCore(window.modSC2DataManager, window.modLoaderGui);

function createlog(prefix: string) {
  return (message: string, level: string = 'INFO', ...objects: any[]) => maplebirch.log(`[${prefix}] ${message}`, level, ...objects);
}

export { MaplebirchCore, createlog };
export default maplebirch;
