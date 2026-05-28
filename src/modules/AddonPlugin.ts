// ./src/modules/AddonPlugin.ts

import type { Passage } from '@scml/types/sugarcube-2-ModLoader/SugarCube2';
import type { ModBootJson, ModInfo } from '@scml/types/sugarcube-2-ModLoader/ModLoader';
import type { JSZipLikeReadOnlyInterface } from '@scml/types/sugarcube-2-ModLoader/JSZipLikeReadOnlyInterface';
import type { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';
import type { TypeOrderItem } from '@scml/types/AddonMod_BeautySelector/BeautySelectorAddonType';
import type { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import type { ModUtils } from '@scml/types/sugarcube-2-ModLoader/Utils';
import type { CryptOptions } from '../services/CredentialVault';
import MaplebrichStyles from '@/styles/MaplebrichStyles.css?raw';
import maplebirch, { type MaplebirchCore, createlog } from '../core';
import AddonPluginProcess, { type Task, type LanguageConfig, type AudioConfig, type FrameworkConfig, defineTwineAsset } from './AddonPluginProcess';

type ConfigType = 'language' | 'audio' | 'framework' | 'npc';
type FileType = 'Module' | 'Script';

interface AddonPluginConfig {
  params?: {
    language?: LanguageConfig;
    audio?: AudioConfig;
    framework?: FrameworkConfig | FrameworkConfig[];
    npc?: any;
    module?: string[];
    script?: string[];
    [key: string]: any;
  };
}

interface FileItem {
  modName: string;
  filePath: string;
  content: string;
}

class AddonPlugin {
  public onLoad: boolean = false;
  private onSaveLoadTracer: boolean = false;
  private disabledMods: Array<string> = [];
  readonly replace = replace;
  readonly SC2DataManager: SC2DataManager;
  readonly modUtils: ModUtils;
  readonly info = new Map<string, { addonName: string; mod: ModInfo; modZip: ModZipReader }>();
  readonly log: ReturnType<typeof createlog> = createlog('addon');
  readonly supportedConfigs: ConfigType[] = ['language', 'audio', 'framework', 'npc'];
  queue: Record<ConfigType, Task[]> = {
    language: [],
    audio: [],
    framework: [],
    npc: []
  };
  processed: Record<ConfigType | 'script', boolean> = {
    language: false,
    audio: false,
    framework: false,
    npc: false,
    script: false
  };
  jsFiles: FileItem[] = [];
  moduleFiles: FileItem[] = [];

  constructor(readonly core: MaplebirchCore) {
    this.SC2DataManager = this.core.manager.modSC2DataManager;
    this.modUtils = this.core.modUtils;
    this.log('框架开始初始化流程', 'INFO');
    this.modUtils.getAddonPluginManager().registerAddonPlugin('maplebirch', 'maplebirchAddon', this);
    this.SC2DataManager.getModLoadController().addLifeTimeCircleHook('maplebirchFramework', this);
    const modName = this.modUtils.getNowRunningModName();
    const modInfo = this.modUtils.getMod(modName) as ModInfo;
    if (!modName || !modInfo) return;
    modInfo.modRef = this;
    this.log('框架初始化流程结束');
  }

  async canLoadThisMod(bootJson: ModBootJson, zip: JSZipLikeReadOnlyInterface): Promise<boolean> {
    if (bootJson.name === 'Simple Frameworks') {
      this.disabledMods.push('Simple Frameworks');
      return false;
    }
    return true;
  }

  async afterInjectEarlyLoad(): Promise<void> {
    if (!this.disabledMods.includes('Simple Frameworks')) await this.core.disabled('Simple Frameworks');
    await this.scriptFiles();
    await this.executeScripts(this.moduleFiles, 'Module');
    this.log('所有模块注册完成，开始预初始化', 'INFO');
    await this.core.trigger(':indexedDB');
    await this.core.idb.init();
    await this.core.idb.checkStore();
    await this.core.logger.fromIDB();
    await this.core.trigger(':idbReady');
    await this.core.lang.preload();
    for await (const p of this.core.lang.import('maplebirch')) if (p.type === 'error') this.log(`导入失败: ${p.language}`, 'ERROR');
    await this.core.modules.init('pre');
  }

  async ModLoaderLoadEnd(): Promise<void> {
    await this.core.gui.init();
    await this.core.trigger(':modLoaderEnd');
  }

  async afterEarlyLoad(): Promise<any> {}

  async registerMod(addonName: string, modInfo: ModInfo, modZip: ModZipReader): Promise<void> {
    this.info.set(modInfo.name, { addonName, mod: modInfo, modZip });
    const config = modInfo.bootJson?.addonPlugin?.find(plugin => plugin.modName === 'maplebirch' && plugin.addonName === 'maplebirchAddon') as AddonPluginConfig | undefined;
    if (!config?.params) return;
    if (Object.keys(config.params).length > 0 && !this.core.modList.includes(modInfo.name)) this.core.modList.push(modInfo.name);
    for (const type of this.supportedConfigs) {
      const value = config.params[type];
      if (value == null) continue;
      this.queue[type].push({ modName: modInfo.name, modZip, config: value });
    }
  }

  async afterRegisterMod2Addon(): Promise<void> {
    await this.executeScripts(this.jsFiles, 'Script');
    await this.core.char.faceStyleImagePaths();
    this.processed.script = true;
  }

  async beforePatchModToGame(): Promise<void> {
    await this.core.trigger(':import');
    await this.dataReplace();
    await this.processInit();
    this.core.tool.zone.patchModToGame(this, 'before');
  }

  async PatchModToGame_start(): Promise<any> {
    defineTwineAsset(
      'script',
      'maplebirch/sugarcube-bridge.js',
      `(function(maplebirch){'use strict';maplebirch.SugarCube={Browser,Config,Dialog,Engine,Fullscreen,Has,L10n,Macro,Passage,Save,Scripting,Setting,SimpleAudio,State,Story,UI,UIBar,DebugBar,Util,Visibility,Wikifier,session,settings,setup,storage,version};void maplebirch.trigger(':sugarcube');})(window.maplebirch);`
    );
    defineTwineAsset('style', 'maplebirch-styles.css', MaplebrichStyles);
  }

  async afterPatchModToGame(): Promise<void> {
    this.core.tool.zone.patchModToGame(this, 'after');
  }

  async afterPreload(): Promise<any> {}

  async whenSC2StoryReady(): Promise<any> {
    await this.core.trigger(':storyready');
    if (this.onSaveLoadTracer) return;
    this.onSaveLoadTracer = true;
    this.core.SugarCube.Save.onSave.add(async () => this.core.trigger(':onSave'));
    this.core.SugarCube.Save.onLoad.add(async () => {
      await this.core.trigger(':onLoad').then(() => (this.onLoad = true));
      this.core.modules.initPhase.loadInitExecuted = false;
    });
  }

  async whenSC2PassageInit(passage: Passage): Promise<any> {
    this.core.passage = passage;
    if (!!this.core.passage && !this.core.passage.tags.includes('widget')) this.log(`处理段落: ${this.core.passage.title}`, 'INFO');
    await this.core.trigger(':passageinit', passage);
  }

  async whenSC2PassageStart(passage: Passage, content: HTMLDivElement): Promise<any> {
    if (!this.core.passage || this.core.passage.title === 'Start' || this.core.passage.title === 'Downgrade Waiting Room') return;
    this.core.modules.initPhase.postInitExecuted = false;
    await this.core.modules.init('init');
    if (!this.onLoad) {
      await this.core.modules.init('post');
      return;
    }
    await this.core.modules.init('load');
    void this.core.trigger(':onLoadSave').then(async () => await this.core.modules.init('post'));
    this.onLoad = false;
    await this.core.trigger(':passagestart', passage, content);
  }

  async whenSC2PassageRender(passage: Passage, content: HTMLDivElement): Promise<any> {
    await this.core.trigger(':passagerender', passage, content);
  }

  async whenSC2PassageDisplay(passage: Passage, content: HTMLDivElement): Promise<any> {
    await this.core.trigger(':passagedisplay', passage, content);
  }

  async whenSC2PassageEnd(passage: Passage, content: HTMLDivElement): Promise<any> {
    await this.core.trigger(':passageend', passage, content);
  }

  async loadCrypt(options: CryptOptions): Promise<boolean> {
    return await this.core.credential.loadCrypt(options);
  }

  private async scriptFiles(): Promise<void> {
    const modNames = this.modUtils.getModListNameNoAlias();
    if (!Array.isArray(modNames) || modNames.length === 0) return;
    for (const modName of modNames) {
      try {
        const mod = this.modUtils.getMod(modName) as ModInfo;
        const modZip = this.modUtils.getModZip(modName);
        const config = mod?.bootJson?.addonPlugin?.find(plugin => plugin.modName === 'maplebirch' && plugin.addonName === 'maplebirchAddon') as AddonPluginConfig | undefined;
        if (!config?.params || !modZip) continue;
        if (Array.isArray(config.params.module)) await this.loadFiles(modName, modZip, config.params.module, 'Module');
        if (Array.isArray(config.params.script)) await this.loadFiles(modName, modZip, config.params.script, 'Script');
      } catch (error: any) {
        this.log(`加载模组脚本失败: ${modName} - ${error?.message || error}`, 'ERROR');
      }
    }
  }

  // prettier-ignore
  private async dataReplace(): Promise<void> {
    try { await modifyOptionsDateFormat(this);                           } catch { this.log('modifyOptionsDateFormat 出错', 'ERROR'); }
    try { await this.core.dynamic.Weather.modifyWeatherJavaScript(this); } catch { this.log('modifyWeatherJavaScript 出错', 'ERROR'); }
    try { await this.core.char.modifyPCModel(this);                      } catch { this.log('modifyPCModel 出错', 'ERROR');           }
    try { await this.core.char.modifyFaceStyle(this);                    } catch { this.log('modifyFaceStyle 出错', 'ERROR');         }
    try { await this.core.char.transformation.modifyEffect(this);        } catch { this.log('modifyEffect 出错', 'ERROR');            }
  }

  private async loadFiles(modName: string, modZip: ModZipReader, files: string[], type: FileType): Promise<void> {
    const target = type === 'Module' ? this.moduleFiles : this.jsFiles;
    for (const filePath of files) {
      try {
        const key = `[${modName}]:${filePath}`;
        if (target.some(file => `[${file.modName}]:${file.filePath}` === key)) continue;
        const file = modZip.zip.file(filePath);
        if (!file) {
          this.log(`${type} 文件未找到: ${filePath} (来自 ${modName})`, 'WARN');
          continue;
        }
        target.push({ modName, filePath, content: await file.async('string') });
      } catch (error: any) {
        this.log(`加载 ${type} 文件失败: ${filePath} (来自 ${modName}): ${error?.message || error}`, 'ERROR');
      }
    }
  }

  private async executeScripts(files: FileItem[], type: FileType = 'Script'): Promise<void> {
    if (files.length === 0) return;
    const disabled = type === 'Script' ? new Set(this.core.gui.disabledScripts) : new Set<string>();
    for (const file of files) {
      const scriptKey = `[${file.modName}]:${file.filePath}`;
      if (type === 'Script' && disabled.has(scriptKey)) {
        file.content = '';
        continue;
      }
      const execute = async () => {
        const func = new Function(file.content);
        const result = func();
        if (result && typeof result.then === 'function') await result;
      };
      try {
        if (type === 'Script') {
          await execute();
          continue;
        }
        await this.core.modules.runWithSource(file.modName, execute);
      } catch (error: any) {
        this.log(`执行 ${type} 文件失败: ${file.filePath} (来自 ${file.modName}): ${error?.message || error}`, 'ERROR');
      } finally {
        file.content = '';
      }
    }
  }

  // prettier-ignore
  private async processInit(): Promise<void> {
    try { await AddonPluginProcess.Language(this); }  catch (error: any) { this.log(`语言处理过程失败: ${error?.message || error}`, 'ERROR'); }
    try { await AddonPluginProcess.Audio(this); }     catch (error: any) { this.log(`音频处理过程失败: ${error?.message || error}`, 'ERROR'); }
    try { await AddonPluginProcess.Framework(this); } catch (error: any) { this.log(`框架处理过程失败: ${error?.message || error}`, 'ERROR'); }
    try { await AddonPluginProcess.NPC(this); }       catch (error: any) { this.log(`NPC处理过程失败: ${error?.message || error}`, 'ERROR'); }
  }
}

function replace(content: string, replacements: [RegExp, string][]): string {
  const unmatched: number[] = [];
  let result = content;
  replacements.forEach(([regex, replacement], index) => {
    regex.lastIndex = 0;
    if (regex.test(result)) {
      regex.lastIndex = 0;
      result = result.replace(regex, replacement);
    } else {
      unmatched.push(index + 1);
    }
  });
  if (unmatched.length) maplebirch.log(`以下正则未匹配到内容 - ${unmatched.join(',')}`, 'WARN');
  return result;
}

async function modifyOptionsDateFormat(manager: AddonPlugin): Promise<void> {
  const oldSCdata = manager.SC2DataManager.getSC2DataInfoAfterPatch();
  const SCdata = oldSCdata.cloneSC2DataInfo();
  const passageData = SCdata.passageDataItems.map;
  const passageTitle = 'Options Overlay';
  const passage = passageData.get(passageTitle);
  const replacements: [RegExp, string][] = [
    [
      /<label\s+class="en-GB">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"en-GB"\s*autocheck\s*>>\s*([^<]+)<\/label>/,
      `<label class="en-GB"><<radiobutton "$options.dateFormat" "en-GB" autocheck>> ${manager.modUtils.getModListNameNoAlias().includes('ModI18N') ? '英(日/月/年)' : 'GB(dd/mm/yyyy)'}</label>`
    ],
    [
      /<label\s+class="en-US">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"en-US"\s*autocheck\s*>>\s*([^<]+)<\/label>/,
      `<label class="en-US"><<radiobutton "$options.dateFormat" "en-US" autocheck>> ${manager.modUtils.getModListNameNoAlias().includes('ModI18N') ? '美(月/日/年)' : 'US(mm/dd/yyyy)'}</label>`
    ],
    [
      /<label\s+class="zh-CN">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"zh-CN"\s*autocheck\s*>>\s*([^<]+)<\/label>/,
      `<label class="zh-CN"><<radiobutton "$options.dateFormat" "zh-CN" autocheck>> ${manager.modUtils.getModListNameNoAlias().includes('ModI18N') ? '中(年/月/日)' : 'CN(yyyy/mm/dd)'}</label>`
    ]
  ];
  passage.content = replace(passage.content, replacements);
  passageData.set(passageTitle, passage);
  SCdata.passageDataItems.back2Array();
  manager.modUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
}

(function (maplebirch: MaplebirchCore): void {
  'use strict';
  let order: TypeOrderItem[] = window.addonBeautySelectorAddon.typeOrderUsed;
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
})(maplebirch);

export default AddonPlugin;
