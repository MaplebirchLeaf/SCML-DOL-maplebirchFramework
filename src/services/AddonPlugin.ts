// ./src/services/AddonPlugin.ts

import type { Passage } from '@scml/types/sugarcube-2-ModLoader/SugarCube2';
import type { ModBootJson, ModInfo } from '@scml/types/sugarcube-2-ModLoader/ModLoader';
import type { JSZipLikeReadOnlyInterface } from '@scml/types/sugarcube-2-ModLoader/JSZipLikeReadOnlyInterface';
import type { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';
import type { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import type { ModUtils } from '@scml/types/sugarcube-2-ModLoader/Utils';
import type { CryptOptions } from '../services/CredentialVault';
import MaplebrichStyles from '@/styles/MaplebrichStyles.css';
import type ModLoader from '../host/ModLoader';
import type Resources from '../host/Resources';
import type SugarCube from '../host/SugarCube';
import type Emitter from '../infra/Emitter';
import Catalog from '../infra/Catalog';
import Hooks from '../infra/Hooks';
import Diagnostics from '../infra/Diagnostics';
import type { Replacement } from '../host/ModLoader';
import type CredentialVault from './CredentialVault';
import type GUIControl from './GUIControl';
import type IndexedDB from './IndexedDB';
import type Modules from './Modules';
import type Translator from './Translator';

type FileType = 'Module' | 'Script';

interface AddonParams {
  module?: unknown;
  script?: unknown;
  [name: string]: unknown;
}

interface AddonPluginConfig {
  params?: AddonParams;
}

interface FileItem {
  modName: string;
  filePath: string;
  content: string;
}

export interface BootTask<T = unknown> {
  modName: string;
  modInfo: ModInfo;
  modZip: ModZipReader;
  config: T;
}

export type BootHandler<T = unknown> = (task: BootTask<T>) => void | Promise<void>;

export interface AddonServices {
  translator(): Translator;
  gui(): GUIControl;
  credential(): CredentialVault;
}

export class AddonPlugin extends Hooks<[BootTask], void> {
  public onStart = false;
  public get resources(): Resources {
    return this.modloader!.resources;
  }

  public replace(content: string, replacements: Replacement[], label = 'replace'): string {
    return this.modloader!.replace(content, replacements, label);
  }
  public readonly info: Catalog<string, { addonName: string; mod: ModInfo; modZip: ModZipReader }>;
  public readonly modList: string[] = [];
  public readonly jsFiles: FileItem[] = [];
  public readonly moduleFiles: FileItem[] = [];
  private readonly disabledMods = new Set<string>();
  public readonly blockedPassages = new Set(['Start']);
  public readonly excludedMods = new Set<string>();
  private readonly bootQueue = new Map<string, BootTask[]>();

  private onSaveLoadTracer = false;
  private moduleFilesExecuted = false;
  private scriptFilesExecuted = false;
  private bootReady = false;

  public constructor(
    modloader: ModLoader,
    readonly sugarcube: SugarCube,
    readonly events: Emitter,
    readonly idb: IndexedDB,
    readonly modules: Modules,
    private readonly services: AddonServices
  ) {
    super(modloader, 'continue');
    this.info = new Catalog(modloader);
    this.log('框架开始初始化流程', 'INFO');
    this.modUtils.getAddonPluginManager().registerAddonPlugin('maplebirch', 'maplebirchAddon', this);
    this.SC2DataManager.getModLoadController().addLifeTimeCircleHook('maplebirchFramework', this);
    const modName = this.modUtils.getNowRunningModName();
    if (!modName) return;
    const modInfo = this.modUtils.getMod(modName) as ModInfo | undefined;
    if (!modInfo) return;
    modInfo.modRef = this;
    this.log('框架初始化流程结束', 'INFO');
  }

  public get SC2DataManager(): SC2DataManager {
    return this.modloader!.modSC2DataManager;
  }

  public get modUtils(): ModUtils {
    return this.modloader!.modUtils;
  }

  public hook<T>(name: string, handler: BootHandler<T>): boolean {
    if (!this.add(name, handler as BootHandler)) {
      this.log(`Boot 配置处理器已注册: ${name}`, 'WARN');
      return false;
    }
    if (this.bootReady) void this.flush(name);
    return true;
  }

  public async canLoadThisMod(bootJson: ModBootJson, _zip: JSZipLikeReadOnlyInterface): Promise<boolean> {
    if (this.excludedMods.has(bootJson.name)) {
      this.disabledMods.add(bootJson.name);
      return false;
    }
    return true;
  }

  public async afterInjectEarlyLoad(): Promise<void> {
    for (const name of this.excludedMods) if (!this.disabledMods.has(name)) await this.modloader!.disabled(name);
    await this.scriptFiles();
    await this.executeScripts(this.moduleFiles, 'Module');
    this.moduleFilesExecuted = true;
    this.log('所有模块注册完成，开始预初始化', 'INFO');
    await this.events.trigger(':indexedDB');
    await this.idb.init();
    this.LevelName = (await this.idb.loadLogLevel()) === true ? 'DEBUG' : 'INFO';
    await this.events.trigger(':idbReady');
    await this.services.translator().preload();
    await this.modules.run('pre');
  }

  public async ModLoaderLoadEnd(): Promise<void> {
    await this.services.gui().init();
    await this.events.trigger(':modLoaderEnd');
  }

  public async afterEarlyLoad(): Promise<void> {
    this.modloader!.resources.clear();
    await this.events.trigger(':addon:afterEarlyLoad', this);
  }

  public async registerMod(addonName: string, modInfo: ModInfo, modZip: ModZipReader): Promise<void> {
    this.info.remove(modInfo.name);
    this.info.add(modInfo.name, { addonName, mod: modInfo, modZip });
    const params = this.config(modInfo)?.params;
    if (!params) return;
    if (Object.keys(params).length && !this.modList.includes(modInfo.name)) this.modList.push(modInfo.name);
    for (const [name, config] of Object.entries(params)) {
      if (name === 'module' || name === 'script' || config == null) continue;
      const task: BootTask = { modName: modInfo.name, modInfo, modZip, config };
      if (this.bootReady) {
        await this.run(name, task);
      } else {
        this.queue(name, task);
      }
    }

    if (this.moduleFilesExecuted && Array.isArray(params.module)) {
      const start = this.moduleFiles.length;
      await this.loadFiles(modInfo.name, modZip, params.module, 'Module');
      const modules = this.moduleFiles.slice(start);
      if (modules.length) await this.executeScripts(modules, 'Module');
    }

    if (this.moduleFilesExecuted && Array.isArray(params.script)) {
      const start = this.jsFiles.length;
      await this.loadFiles(modInfo.name, modZip, params.script, 'Script');
      if (this.scriptFilesExecuted) {
        const scripts = this.jsFiles.slice(start);
        if (scripts.length) await this.executeScripts(scripts, 'Script');
      }
    }
  }

  public async afterRegisterMod2Addon(): Promise<void> {
    await this.executeScripts(this.jsFiles, 'Script');
    this.scriptFilesExecuted = true;
  }

  public async beforePatchModToGame(): Promise<void> {
    await this.events.trigger(':addon:preparePatch', this);
    await this.process();
    await this.events.trigger(':import');
    await this.events.trigger(':addon:beforePatch', this);
  }

  public async PatchModToGame_start(): Promise<void> {
    await this.events.trigger(':addon:patchStart', this);
    this.modloader!.defineTwineAsset(
      'script',
      'maplebirch/sugarcube-bridge.js',
      `(function(maplebirch){'use strict';maplebirch.host.sugarcube.runtime={Browser,Config,Dialog,Engine,Fullscreen,Has,L10n,Macro,Passage,Save,Scripting,Setting,SimpleAudio,State,Story,UI,UIBar,DebugBar,Util,Visibility,Wikifier,session,settings,setup,storage,version};void maplebirch.trigger(':sugarcube');})(window.maplebirch);`
    );
    this.modloader!.defineTwineAsset('style', 'maplebirch-styles.css', MaplebrichStyles);
  }

  public async afterPatchModToGame(): Promise<void> {
    await this.events.trigger(':addon:afterPatch', this);
  }

  public async afterPreload(): Promise<void> {
    await this.events.trigger(':addon:afterPreload', this);
  }

  public async whenSC2StoryReady(): Promise<void> {
    await this.events.trigger(':storyready');
    if (this.onSaveLoadTracer) return;
    this.onSaveLoadTracer = true;
    const runtime = this.sugarcube.require();
    runtime.Save.onSave.add((saveObj, details) => void this.events.trigger(':onSave', this.sugarcube.save(saveObj, details)));
    runtime.Save.onLoad.add(saveObj => {
      const save = this.sugarcube.save(saveObj);
      void this.events.trigger(':onLoad', save);
      save.use(save.V, () => this.modules.run('load'));
      if (!this.sugarcube.passage || this.blockedPassages.has(this.sugarcube.passage.title)) this.onStart = true;
    });
  }

  public async whenSC2PassageInit(passage: Passage): Promise<void> {
    this.sugarcube.passage = passage;
    await this.events.trigger(':passageinit', passage);
  }

  public async whenSC2PassageStart(passage: Passage, content: HTMLDivElement): Promise<void> {
    if (!this.sugarcube.passage || this.blockedPassages.has(this.sugarcube.passage.title)) return;
    this.modules.run('init');
    await this.events.trigger(':passagestart', passage, content);
    if (this.onStart) {
      const runtime = this.sugarcube.require();
      runtime.Engine.show(runtime.State.passage);
      this.onStart = false;
    }
  }

  public async whenSC2PassageRender(passage: Passage, content: HTMLDivElement): Promise<void> {
    await this.events.trigger(':passagerender', passage, content);
  }

  public async whenSC2PassageDisplay(passage: Passage, content: HTMLDivElement): Promise<void> {
    await this.events.trigger(':passagedisplay', passage, content);
  }

  public async whenSC2PassageEnd(passage: Passage, content: HTMLDivElement): Promise<void> {
    await this.events.trigger(':passageend', passage, content);
  }

  public loadCrypt(options: CryptOptions): Promise<boolean> {
    return this.services.credential().loadCrypt(options);
  }

  private async scriptFiles(): Promise<void> {
    for (const modName of this.modUtils.getModListNameNoAlias()) {
      try {
        const mod = this.modUtils.getMod(modName) as ModInfo | undefined;
        const modZip = this.modUtils.getModZip(modName);
        if (!mod || !modZip) continue;
        const params = this.config(mod)?.params;
        if (!params) continue;
        if (Array.isArray(params.module)) await this.loadFiles(modName, modZip, params.module, 'Module');
        if (Array.isArray(params.script)) await this.loadFiles(modName, modZip, params.script, 'Script');
      } catch (error) {
        this.log(`加载模组脚本失败: ${modName} - ${Diagnostics.message(error)}`, 'ERROR', error);
      }
    }
  }

  private async loadFiles(modName: string, modZip: ModZipReader, files: unknown[], type: FileType): Promise<void> {
    const target = type === 'Module' ? this.moduleFiles : this.jsFiles;
    for (const value of files) {
      if (typeof value !== 'string') {
        this.log(`${type} 文件路径无效: ${String(value)} (来自 ${modName})`, 'WARN');
        continue;
      }
      const filePath = value;
      try {
        const key = `[${modName}]:${filePath}`;
        if (target.some(file => `[${file.modName}]:${file.filePath}` === key)) continue;
        const file = modZip.zip.file(filePath);
        if (!file) {
          this.log(`${type} 文件未找到: ${filePath} (来自 ${modName})`, 'WARN');
          continue;
        }
        target.push({ modName, filePath, content: await file.async('string') });
      } catch (error) {
        this.log(`加载 ${type} 文件失败: ${filePath} (来自 ${modName}): ${Diagnostics.message(error)}`, 'ERROR', error);
      }
    }
  }

  private async executeScripts(files: FileItem[], type: FileType = 'Script'): Promise<void> {
    if (!files.length) return;
    const disabled = type === 'Script' ? new Set(this.services.gui().disabledScripts) : null;
    for (const file of files) {
      const key = `[${file.modName}]:${file.filePath}`;
      if (disabled?.has(key)) {
        file.content = '';
        continue;
      }
      const execute = async () => {
        const func = new Function(file.content);
        const result: unknown = func();
        if (result != null && typeof (result as PromiseLike<unknown>).then === 'function') await result;
      };
      try {
        if (type === 'Module') {
          await this.modules.with(file.modName, execute);
        } else {
          await execute();
        }
      } catch (error) {
        this.log(`执行 ${type} 文件失败: ${file.filePath} (来自 ${file.modName}): ${Diagnostics.message(error)}`, 'ERROR', error);
      } finally {
        file.content = '';
      }
    }
  }

  private async process(): Promise<void> {
    this.bootReady = true;
    for (const name of this.bootQueue.keys()) {
      if (!this.has(name)) {
        this.log(`Boot 配置等待处理器: ${name}`, 'DEBUG');
        continue;
      }
      await this.flush(name);
    }
  }

  private queue(name: string, task: BootTask): void {
    const tasks = this.bootQueue.get(name);
    if (tasks) {
      tasks.push(task);
    } else {
      this.bootQueue.set(name, [task]);
    }
  }

  private async flush(name: string): Promise<void> {
    const handler = this.get(name);
    const tasks = this.bootQueue.get(name);
    if (!handler || !tasks?.length) return;
    this.bootQueue.delete(name);
    for (const task of tasks) await this.run(name, task, handler);
  }

  private async run(name: string, task: BootTask, handler = this.get(name)): Promise<void> {
    if (!handler) {
      this.queue(name, task);
      return;
    }
    await this.call(name, task);
  }

  private config(modInfo: ModInfo): AddonPluginConfig | undefined {
    return modInfo.bootJson?.addonPlugin?.find(plugin => plugin.modName === 'maplebirch' && plugin.addonName === 'maplebirchAddon') as AddonPluginConfig | undefined;
  }
}
export default AddonPlugin;
