// ./src/modules/AddonPlugin.ts

import type { Passage } from '@scml/types/sugarcube-2-ModLoader/SugarCube2';
import type { ModBootJson, ModInfo } from '@scml/types/sugarcube-2-ModLoader/ModLoader';
import type { JSZipLikeReadOnlyInterface } from '@scml/types/sugarcube-2-ModLoader/JSZipLikeReadOnlyInterface';
import type { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';
import type { TypeOrderItem } from '@scml/types/AddonMod_BeautySelector/BeautySelectorAddonType';
import type { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import type { ModUtils } from '@scml/types/sugarcube-2-ModLoader/Utils';
import type { CryptOptions } from '../services/CredentialVault';
import MaplebrichStyles from '@/styles/MaplebrichStyles.css';
import maplebirch, { type MaplebirchCore, createlog } from '../core';
import { clone } from '../utils';
import { defineTwineAsset, replace, type Replacement } from '../utils/twine';
import { patchTimeConstantsAsset, patchDateTimeAsset } from './TimeStateWeather/DateTime';
import { patchTimeAsset } from './TimeStateWeather/Time';

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

class AddonPlugin {
  public onStart = false;
  public readonly replace = replace;
  public readonly SC2DataManager: SC2DataManager;
  public readonly modUtils: ModUtils;
  public readonly info = new Map<string, { addonName: string; mod: ModInfo; modZip: ModZipReader }>();
  public readonly log: ReturnType<typeof createlog> = createlog('addon');
  public readonly jsFiles: FileItem[] = [];
  public readonly moduleFiles: FileItem[] = [];
  private readonly disabledMods = new Set<string>();
  private readonly blockedPassages = new Set(['Start', 'Downgrade Waiting Room']);
  private readonly bootHooks = new Map<string, BootHandler>();
  private readonly bootQueue = new Map<string, BootTask[]>();

  private onSaveLoadTracer = false;
  private moduleFilesExecuted = false;
  private scriptFilesExecuted = false;
  private bootReady = false;

  public constructor(readonly core: MaplebirchCore) {
    this.SC2DataManager = this.core.manager.modSC2DataManager;
    this.modUtils = this.core.modUtils;
    this.log('框架开始初始化流程', 'DEBUG');
    this.modUtils.getAddonPluginManager().registerAddonPlugin('maplebirch', 'maplebirchAddon', this);
    this.SC2DataManager.getModLoadController().addLifeTimeCircleHook('maplebirchFramework', this);
    const modName = this.modUtils.getNowRunningModName();
    if (!modName) return;
    const modInfo = this.modUtils.getMod(modName) as ModInfo | undefined;
    if (!modInfo) return;
    modInfo.modRef = this;
    this.log('框架初始化流程结束', 'DEBUG');
  }

  public hook<T>(name: string, handler: BootHandler<T>): boolean {
    if (this.bootHooks.has(name)) {
      this.log(`Boot 配置处理器已注册: ${name}`, 'WARN');
      return false;
    }
    this.bootHooks.set(name, handler as BootHandler);
    if (this.bootReady) void this.flush(name);
    return true;
  }

  public async canLoadThisMod(bootJson: ModBootJson, _zip: JSZipLikeReadOnlyInterface): Promise<boolean> {
    if (bootJson.name === 'Simple Frameworks') {
      this.disabledMods.add('Simple Frameworks');
      return false;
    }
    return true;
  }

  public async afterInjectEarlyLoad(): Promise<void> {
    if (!this.disabledMods.has('Simple Frameworks')) await this.core.disabled('Simple Frameworks');
    await this.scriptFiles();
    await this.executeScripts(this.moduleFiles, 'Module');
    this.moduleFilesExecuted = true;
    this.log('所有模块注册完成，开始预初始化', 'DEBUG');
    await this.core.trigger(':indexedDB');
    await this.core.idb.init();
    await this.core.logger.fromIDB();
    await this.core.trigger(':idbReady');
    await this.core.lang.preload();
    await this.core.modules.run('pre');
  }

  public async ModLoaderLoadEnd(): Promise<void> {
    await this.core.gui.init();
    await this.core.trigger(':modLoaderEnd');
  }

  public async afterEarlyLoad(): Promise<void> {
    const imagePack = window.modGameOriginalImagePack;
    if (!imagePack) return;
    const hasImage = (src: string) => imagePack.selfIgnoreImagePath.has(src) || imagePack.selfImg.has(src);
    const checkImageExist = imagePack.checkImageExist.bind(imagePack);
    const imageGetter = imagePack.imageGetter.bind(imagePack);
    const imgLoaderHooker = imagePack.imgLoaderHooker.bind(imagePack);
    imagePack.checkImageExist = src => (hasImage(src) ? checkImageExist(src) : false);
    imagePack.imageGetter = async src => (hasImage(src) ? imageGetter(src) : undefined);
    imagePack.imgLoaderHooker = async (src, ...args) => (hasImage(src) ? imgLoaderHooker(src, ...args) : false);
  }

  public async registerMod(addonName: string, modInfo: ModInfo, modZip: ModZipReader): Promise<void> {
    this.info.set(modInfo.name, { addonName, mod: modInfo, modZip });
    const params = this.config(modInfo)?.params;
    if (!params) return;
    if (Object.keys(params).length && !this.core.modList.includes(modInfo.name)) this.core.modList.push(modInfo.name);
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
    this.dataReplace();
    await this.process();
    await this.core.trigger(':import');
    this.core.tool.zone.patchModToGame(this, 'before');
  }

  public async PatchModToGame_start(): Promise<void> {
    defineTwineAsset('script', 'game\\00-framework-tools\\10-time\\00-time-constants.js', patchTimeConstantsAsset, 'patch');
    defineTwineAsset('script', 'game\\00-framework-tools\\10-time\\datetime.js', patchDateTimeAsset, 'patch');
    defineTwineAsset('script', 'game\\03-JavaScript\\time.js', patchTimeAsset, 'patch');
    defineTwineAsset(
      'script',
      'maplebirch/sugarcube-bridge.js',
      `(function(maplebirch){'use strict';maplebirch.SugarCube={Browser,Config,Dialog,Engine,Fullscreen,Has,L10n,Macro,Passage,Save,Scripting,Setting,SimpleAudio,State,Story,UI,UIBar,DebugBar,Util,Visibility,Wikifier,session,settings,setup,storage,version};void maplebirch.trigger(':sugarcube');})(window.maplebirch);`
    );
    defineTwineAsset('style', 'maplebirch-styles.css', MaplebrichStyles);
  }

  public async afterPatchModToGame(): Promise<void> {
    this.core.tool.zone.patchModToGame(this, 'after');
  }

  public async afterPreload(): Promise<void> {
    for (const modName of this.core.modUtils.getModListNameNoAlias()) {
      if (modName === 'ModI18N') continue;
      try {
        const files = this.core.modUtils.getModZip(modName)?.zip?.files;
        if (!files) continue;
        this.core.char.faceStyleImagePaths(files);
      } catch {
        continue;
      }
    }
  }

  public async whenSC2StoryReady(): Promise<void> {
    await this.core.trigger(':storyready');
    if (this.onSaveLoadTracer) return;
    this.onSaveLoadTracer = true;
    this.core.SugarCube.Save.onSave.add((saveObj: any, details?: any) => void this.core.trigger(':onSave', this.saveHandle(saveObj, details)));
    this.core.SugarCube.Save.onLoad.add((saveObj: any) => {
      const save = this.saveHandle(saveObj);
      void this.core.trigger(':onLoad', save);
      save.use(save.V, () => this.core.modules.run('load'));
      if (!this.core.passage || this.blockedPassages.has(this.core.passage.title)) this.onStart = true;
    });
  }

  public async whenSC2PassageInit(passage: Passage): Promise<void> {
    this.core.passage = passage;
    await this.core.trigger(':passageinit', passage);
  }

  public async whenSC2PassageStart(passage: Passage, content: HTMLDivElement): Promise<void> {
    if (!this.core.passage || this.blockedPassages.has(this.core.passage.title)) return;
    this.core.modules.run('init');
    await this.core.trigger(':passagestart', passage, content);
    if (this.onStart) {
      this.core.SugarCube.Engine.show(this.core.SugarCube.State.passage);
      this.onStart = false;
    }
  }

  public async whenSC2PassageRender(passage: Passage, content: HTMLDivElement): Promise<void> {
    await this.core.trigger(':passagerender', passage, content);
  }

  public async whenSC2PassageDisplay(passage: Passage, content: HTMLDivElement): Promise<void> {
    await this.core.trigger(':passagedisplay', passage, content);
  }

  public async whenSC2PassageEnd(passage: Passage, content: HTMLDivElement): Promise<void> {
    await this.core.trigger(':passageend', passage, content);
  }

  public loadCrypt(options: CryptOptions): Promise<boolean> {
    return this.core.credential.loadCrypt(options);
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
        this.log(`加载模组脚本失败: ${modName} - ${this.error(error)}`, 'ERROR');
      }
    }
  }

  // prettier-ignore
  private dataReplace(): void {
    try { this.modifyOptionsDateFormat();                          } catch { this.log('modifyOptionsDateFormat 出错', 'ERROR'); }
    try { this.core.dynamic.Weather.modifyWeatherJavaScript(this); } catch { this.log('modifyWeatherJavaScript 出错', 'ERROR'); }
    try { this.core.char.modifyCanvasModel(this);                  } catch { this.log('modifyCanvasModel 出错', 'ERROR');       }
    try { this.core.char.modifyFaceStyle(this);                    } catch { this.log('modifyFaceStyle 出错', 'ERROR');         }
    try { this.core.char.transformation.modifyEffect(this);        } catch { this.log('modifyEffect 出错', 'ERROR');            }
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
        this.log(`加载 ${type} 文件失败: ${filePath} (来自 ${modName}): ${this.error(error)}`, 'ERROR');
      }
    }
  }

  private async executeScripts(files: FileItem[], type: FileType = 'Script'): Promise<void> {
    if (!files.length) return;
    const disabled = type === 'Script' ? new Set(this.core.gui.disabledScripts) : null;
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
          await this.core.modules.with(file.modName, execute);
        } else {
          await execute();
        }
      } catch (error) {
        this.log(`执行 ${type} 文件失败: ${file.filePath} (来自 ${file.modName}): ${this.error(error)}`, 'ERROR');
      } finally {
        file.content = '';
      }
    }
  }

  private async process(): Promise<void> {
    this.bootReady = true;
    for (const name of this.bootQueue.keys()) {
      if (!this.bootHooks.has(name)) {
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
    const handler = this.bootHooks.get(name);
    const tasks = this.bootQueue.get(name);
    if (!handler || !tasks?.length) return;
    this.bootQueue.delete(name);
    for (const task of tasks) await this.run(name, task, handler);
  }

  private async run(name: string, task: BootTask, handler = this.bootHooks.get(name)): Promise<void> {
    if (!handler) {
      this.queue(name, task);
      return;
    }
    try {
      await handler(task);
    } catch (error) {
      this.log(`${task.modName} 的 ${name} 配置处理失败: ${this.error(error)}`, 'ERROR');
    }
  }

  private config(modInfo: ModInfo): AddonPluginConfig | undefined {
    return modInfo.bootJson?.addonPlugin?.find(plugin => plugin.modName === 'maplebirch' && plugin.addonName === 'maplebirchAddon') as AddonPluginConfig | undefined;
  }

  private modifyOptionsDateFormat(): void {
    const oldSCdata = this.SC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const passageData = SCdata.passageDataItems.map;
    const passageTitle = 'Options Overlay';
    const passage = passageData.get(passageTitle)!;
    const hasI18N = this.modUtils.getModListNameNoAlias().includes('ModI18N');
    const replacements: Replacement[] = [
      [
        /<label\s+class="en-GB">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"en-GB"\s*autocheck\s*>>\s*([^<]+)<\/label>/,
        `<label class="en-GB"><<radiobutton "$options.dateFormat" "en-GB" autocheck>> ${hasI18N ? '英(日/月/年)' : 'GB(dd/mm/yyyy)'}</label>`
      ],
      [
        /<label\s+class="en-US">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"en-US"\s*autocheck\s*>>\s*([^<]+)<\/label>/,
        `<label class="en-US"><<radiobutton "$options.dateFormat" "en-US" autocheck>> ${hasI18N ? '美(月/日/年)' : 'US(mm/dd/yyyy)'}</label>`
      ],
      [
        /<label\s+class="zh-CN">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"zh-CN"\s*autocheck\s*>>\s*([^<]+)<\/label>/,
        `<label class="zh-CN"><<radiobutton "$options.dateFormat" "zh-CN" autocheck>> ${hasI18N ? '中(年/月/日)' : 'CN(yyyy/mm/dd)'}</label>`
      ]
    ];
    passage.content = this.replace(passage.content, replacements, 'Options Overlay dateFormat');
    passageData.set(passageTitle, passage);
    SCdata.passageDataItems.back2Array();
    this.modUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
  }

  private saveHandle(saveObj: any, details?: any) {
    const State = this.core.SugarCube.State;
    const history: any[] = Array.isArray(saveObj?.state?.history) ? saveObj.state.history : [];
    const replaceObject = (target: any, source: any) => {
      for (const key of Object.keys(target)) delete target[key];
      Object.assign(target, source);
      return target;
    };

    const use = <T>(variables: any, fn: () => T): T => {
      const runtime = State.variables;
      const backup = clone(runtime);
      replaceObject(runtime, clone(variables));
      try {
        const result = fn();
        replaceObject(variables, clone(runtime));
        return result;
      } finally {
        replaceObject(runtime, backup);
      }
    };

    return {
      saveObj,
      details,
      get V() {
        const index = saveObj?.state?.index;
        return history[index]?.variables ?? history[history.length - 1]?.variables;
      },
      use
    };
  }

  private error(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

let order: TypeOrderItem[] = window.addonBeautySelectorAddon.typeOrderUsed!;
Object.defineProperty(window.addonBeautySelectorAddon, 'typeOrderUsed', {
  get() {
    return order;
  },
  set(value: TypeOrderItem[]) {
    order = value;
    if (T?.modelclass) {
      Renderer.clearCaches(T.modelclass);
      $.wiki('<<updatesidebarimg>>');
    }
  }
});
maplebirch.register('addon', Object.seal(new AddonPlugin(maplebirch)), []);

export default AddonPlugin;
