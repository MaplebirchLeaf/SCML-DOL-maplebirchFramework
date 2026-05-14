// ./src/modules/AddonPlugin.ts

import type { TypeOrderItem } from '@scml/types/AddonMod_BeautySelector/BeautySelectorAddonType';
import type { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';
import type { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import type { ModUtils } from '@scml/types/sugarcube-2-ModLoader/Utils';
import type { CryptOptions } from '../services/CredentialVault';
import type { TraitConfig } from './Frameworks/otherTools';
import type { ZoneWidgetConfig } from './Frameworks/zonesManager';
import { Languages, type LanguageCode } from '../constants';
import maplebirch, { type MaplebirchCore, createlog } from '../core';

type ConfigType = 'language' | 'audio' | 'framework' | 'npc';
type FileType = 'Module' | 'Script';

type LanguageConfig = string[] | Partial<Record<string, string | { file: string }>>;
type AudioConfig = string[];
type RawTraitConfig = {
  title?: string;
  name?: string | (() => string);
  colour?: string | (() => string);
  has?: boolean | string | (() => boolean);
  text?: string | (() => string);
};

type FrameworkConfig = { traits: RawTraitConfig[] } | { addto: string; widget: string | ZoneWidgetConfig | [number, string | ZoneWidgetConfig] };

interface Task<T = any> {
  modName: string;
  config: T;
  modZip?: ModZipReader;
}

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

interface ModInfo {
  name: string;
  bootJson?: {
    addonPlugin?: Array<{
      modName: string;
      addonName: string;
      modVersion?: string;
      params?: AddonPluginConfig['params'];
    }>;
  };
  modRef?: any;
  imgs?: any[];
}

interface FileItem {
  modName: string;
  filePath: string;
  content: string;
}

class Process {
  static async Language(addon: AddonPlugin): Promise<void> {
    if (addon.processed.language || addon.queue.language.length === 0) return;
    try {
      for (const task of addon.queue.language as Task<LanguageConfig>[]) {
        const { modName, config } = task;
        if (Array.isArray(config)) {
          const languages = config.map(lang => (typeof lang === 'string' ? lang.toUpperCase() : '')).filter((lang): lang is LanguageCode => (Languages as readonly string[]).includes(lang));
          if (languages.length === 0) {
            addon.core.log(`模块 ${modName} 的语言配置为空或无效`, 'WARN');
            continue;
          }
          addon.core.log(`为 ${modName} 导入语言: ${languages.join(', ')}`, 'DEBUG');
          for await (const progress of addon.core.lang.import(modName, languages)) if (progress.type === 'error') addon.core.log(`导入失败: ${progress.language}`, 'ERROR');
          continue;
        }
        if (!config || typeof config !== 'object') {
          addon.core.log(`模块 ${modName} 的语言配置格式无效`, 'WARN');
          continue;
        }
        addon.core.log(`为 ${modName} 导入自定义语言文件`, 'DEBUG');
        for (const [rawLanguage, rawFile] of Object.entries(config)) {
          const language = rawLanguage.toUpperCase();
          if (!(Languages as readonly string[]).includes(language)) {
            addon.core.log(`跳过不支持的语言: ${rawLanguage}`, 'WARN');
            continue;
          }
          const filePath = typeof rawFile === 'string' ? rawFile : rawFile?.file;
          if (typeof filePath !== 'string' || !filePath.trim()) {
            addon.core.log(`语言 ${language} 缺少有效的 file 配置`, 'WARN');
            continue;
          }
          for await (const progress of addon.core.lang.importFile(modName, language as LanguageCode, filePath.trim()))
            if (progress.type === 'error') addon.core.log(`导入失败: ${progress.language}`, 'ERROR');
        }
      }
      addon.processed.language = true;
    } catch (error: any) {
      addon.core.log(`语言配置处理失败: ${error?.message || error}`, 'ERROR');
    }
  }

  static async Audio(addon: AddonPlugin): Promise<void> {
    if (addon.processed.audio || addon.queue.audio.length === 0) return;
    try {
      for (const task of addon.queue.audio as Task<AudioConfig>[]) {
        const { modName, config } = task;
        if (!Array.isArray(config) || config.length === 0) {
          addon.core.log(`模块 ${modName} 的音频配置为空或无效`, 'WARN');
          continue;
        }
        for (const rawFolder of config as unknown[]) {
          if (typeof rawFolder !== 'string' || !rawFolder.trim()) {
            addon.core.log(`模块 ${modName} 的音频目录无效: ${typeof rawFolder}`, 'WARN');
            continue;
          }
          const folder = rawFolder
            .trim()
            .replace(/\\/g, '/')
            .replace(/^\/+|\/+$/g, '');
          if (!folder) {
            addon.core.log(`模块 ${modName} 的音频目录为空`, 'WARN');
            continue;
          }
          addon.core.log(`为 ${modName} 导入音频目录: ${folder}`, 'DEBUG');
          await addon.core.audio.import(modName, folder);
        }
      }
      addon.processed.audio = true;
    } catch (error: any) {
      addon.core.log(`音频配置处理失败: ${error?.message || error}`, 'ERROR');
    }
  }

  static async Framework(addon: AddonPlugin): Promise<void> {
    if (addon.processed.framework || addon.queue.framework.length === 0) return;
    try {
      for (const task of addon.queue.framework as Task<FrameworkConfig | FrameworkConfig[]>[]) {
        const { modName, config } = task;
        const configs = Array.isArray(config) ? config : [config];
        for (const item of configs) {
          if (!item || typeof item !== 'object') {
            addon.core.log(`模块 ${modName} 的框架配置格式无效: ${JSON.stringify(item)}`, 'WARN');
            continue;
          }
          if ('traits' in item) {
            if (!Array.isArray(item.traits) || item.traits.length === 0) {
              addon.core.log(`模块 ${modName} 的 traits 配置为空或无效`, 'WARN');
              continue;
            }
            for (const trait of item.traits) Process.addTrait(addon, trait);
            continue;
          }
          if ('addto' in item && 'widget' in item) {
            Process.addWidget(addon, modName, item.addto, item.widget);
            continue;
          }
          addon.core.log(`模块 ${modName} 的框架配置格式无效: ${JSON.stringify(item)}`, 'WARN');
        }
      }
      addon.processed.framework = true;
    } catch (error: any) {
      addon.core.log(`框架配置处理失败: ${error?.message || error}`, 'ERROR');
    }
  }

  static async NPC(addon: AddonPlugin): Promise<void> {
    if (addon.processed.npc || addon.queue.npc.length === 0) return;
    try {
      for (const task of addon.queue.npc) {
        const { modName, modZip, config } = task;
        if (!config || typeof config !== 'object') {
          addon.core.log('NPC 配置格式无效，跳过处理', 'WARN');
          continue;
        }
        if (Array.isArray(config.NamedNPC)) {
          for (const npcConfig of config.NamedNPC) {
            if (!Array.isArray(npcConfig)) continue;
            const [data, options, translations] = npcConfig;
            if (data && typeof data === 'object') addon.core.npc.add(data, options ?? {}, translations ?? {});
          }
        }
        if (config.Stats && typeof config.Stats === 'object') addon.core.npc.addStats(config.Stats);
        const sidebar = config.Sidebar;
        if (!sidebar || typeof sidebar !== 'object' || !modZip) continue;
        const imagePaths: string[] = [];
        if (Array.isArray(sidebar.clothes)) for (const filePath of sidebar.clothes) await addon.core.npc.Clothes.loadWardrobe(modName, filePath);
        if (Array.isArray(sidebar.image)) imagePaths.push(...addon.core.npc.Sidebar.loadFromMod(modZip, sidebar.image));
        if (Array.isArray(sidebar.config)) imagePaths.push(...(await addon.core.npc.Clothes.importArt(modName, modZip, sidebar.config)));
        if (imagePaths.length > 0) await Process.injectBSAImages(addon, modName, modZip, imagePaths);
      }
      addon.processed.npc = true;
    } catch (error: any) {
      addon.core.log(`NPC 配置处理失败: ${error?.message || error}`, 'ERROR');
    }
  }

  private static addTrait(addon: AddonPlugin, traitConfig: RawTraitConfig): void {
    const { title, name, colour, has, text } = traitConfig;
    if (!title || !name) {
      addon.core.log(`无效的特质配置: ${JSON.stringify(traitConfig)}`, 'WARN');
      return;
    }
    let hasValue: boolean | (() => boolean);
    if (typeof has === 'string') {
      try {
        const fn = new Function(`return (${has});`);
        hasValue = () => Boolean(fn());
      } catch {
        addon.core.log(`无效的 has 条件表达式: ${has}`, 'ERROR');
        hasValue = false;
      }
    } else {
      hasValue = has ?? false;
    }
    addon.core.tool.other.addTraits({
      title,
      name,
      colour: colour ?? '',
      has: hasValue,
      text: text ?? ''
    } as TraitConfig);
  }

  private static addWidget(addon: AddonPlugin, modName: string, zone: string, widget: string | ZoneWidgetConfig | [number, string | ZoneWidgetConfig]): void {
    if (!zone || typeof zone !== 'string') {
      addon.core.log(`模块 ${modName} 的区域配置无效: ${String(zone)}`, 'WARN');
      return;
    }

    if (typeof widget === 'string' || Array.isArray(widget)) {
      addon.core.log(`为 ${modName} 添加部件到区域: ${zone}`, 'DEBUG');
      addon.core.tool.zone.addTo(zone, widget);
      return;
    }

    if (widget && typeof widget === 'object' && widget.widget) {
      addon.core.log(`为 ${modName} 添加部件到区域: ${zone}`, 'DEBUG');
      addon.core.tool.zone.addTo(zone, widget);
      return;
    }

    addon.core.log(`模块 ${modName} 的部件配置无效: ${JSON.stringify(widget)}`, 'WARN');
  }

  private static async injectBSAImages(addon: AddonPlugin, modName: string, modZip: ModZipReader, imgPaths: string[]): Promise<void> {
    try {
      const imgs = [];
      for (const imgPath of imgPaths) {
        try {
          if (typeof imgPath !== 'string') continue;
          const file = modZip.zip.file(imgPath);
          if (!file) {
            addon.core.log(`图片未找到: ${imgPath} (模组: ${modName})`, 'WARN');
            continue;
          }
          const base64Data = await file.async('base64');
          const mimeType =
            {
              png: 'image/png',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              gif: 'image/gif',
              webp: 'image/webp',
              svg: 'image/svg+xml'
            }[imgPath.split('.').pop()?.toLowerCase() || ''] || 'image/png';
          const dataUrl = `data:${mimeType};base64,${base64Data}`;
          imgs.push({
            path: imgPath,
            getter: {
              getBase64Image: async () => dataUrl,
              invalid: false
            }
          });
        } catch (error: any) {
          addon.core.log(`加载图片失败: ${imgPath} - ${error?.message || error}`, 'WARN');
        }
      }
      if (imgs.length === 0) return;
      const modInfo = modZip.modInfo;
      const plugins = modInfo.bootJson?.addonPlugin;
      if (!plugins) return;
      let plugin = plugins.find(item => item.modName === 'BeautySelectorAddon' && item.addonName === 'BeautySelectorAddon');
      if (!plugin) {
        plugin = {
          modName: 'BeautySelectorAddon',
          addonName: 'BeautySelectorAddon',
          modVersion: '^2.0.0',
          params: {}
        };
        plugins.push(plugin);
      }
      const params: Record<string, any> = !plugin.params || Array.isArray(plugin.params) || typeof plugin.params !== 'object' ? {} : (plugin.params as Record<string, any>);
      params.type = 'npc-sidebar';
      plugin.params = params;
      modInfo.imgs = imgs;
      await window.addonBeautySelectorAddon.registerMod('BeautySelectorAddon', modInfo, modZip as any);
      addon.core.log(`成功注册 ${modName} 的 ${imgs.length} 个 NPC 侧边栏图片`, 'DEBUG');
    } catch (error: any) {
      addon.core.log(`注册 ${modName} 的 NPC 侧边栏图片失败: ${error?.message || error}`, 'ERROR');
    }
  }
}

class AddonPlugin {
  readonly replace = replace;
  readonly gSC2DataManager: SC2DataManager;
  readonly gModUtils: ModUtils;
  readonly info = new Map<string, { addonName: string; mod: ModInfo; modZip: ModZipReader }>();
  readonly log: ReturnType<typeof createlog>;
  readonly supportedConfigs: ConfigType[] = ['language', 'audio', 'framework', 'npc'];
  nowModName = '';
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
    this.gSC2DataManager = this.core.manager.modSC2DataManager;
    this.gModUtils = this.core.modUtils;
    this.log = createlog('addon');
    this.log('[AddonPlugin] 开始初始化', 'INFO');
    this.gModUtils.getAddonPluginManager().registerAddonPlugin('maplebirch', 'maplebirchAddon', this);
    this.gSC2DataManager.getModLoadController().addLifeTimeCircleHook('maplebirchFramework', this);
    const modName = this.gModUtils.getNowRunningModName();
    if (!modName) {
      this.log('初始化失败: 无法获取当前Mod名称', 'ERROR');
      return;
    }
    this.nowModName = modName;
    const modInfo = this.gModUtils.getMod(modName) as ModInfo;
    if (!modInfo) {
      this.log(`[AddonPlugin] 初始化失败: 无法获取当前Mod对象 [${modName}]`, 'ERROR');
      return;
    }
    modInfo.modRef = this;
    this.log('[AddonPlugin] 初始化完成');
  }

  async registerMod(addonName: string, modInfo: ModInfo, modZip: ModZipReader): Promise<void> {
    this.info.set(modInfo.name, { addonName, mod: modInfo, modZip });
    const config = modInfo.bootJson?.addonPlugin?.find(plugin => plugin.modName === 'maplebirch' && plugin.addonName === 'maplebirchAddon') as AddonPluginConfig | undefined;
    if (!config?.params) return;
    if (Object.keys(config.params).length > 0 && !this.core.modList.includes(modInfo.name)) this.core.modList.push(modInfo.name);
    for (const type of this.supportedConfigs) {
      const value = config.params[type];
      if (value == null) continue;
      this.queue[type].push({
        modName: modInfo.name,
        modZip,
        config: value
      });
    }
  }

  async ModLoaderLoadEnd(): Promise<void> {
    await this.core.gui.init();
    await this.core.trigger(':modLoaderEnd');
  }

  async afterInjectEarlyLoad(): Promise<void> {
    await this.core.disabled('Simple Frameworks');
    await this.scriptFiles();
    await this.executeScripts(this.moduleFiles, 'Module');
    await this.core.trigger(':allModule');
  }

  async afterRegisterMod2Addon(): Promise<void> {
    try {
      await this.core.char.faceStyleImagePaths();
    } catch (error: any) {
      this.core.log(`faceStyleImagePaths函数错误: ${error?.message || error}`, 'ERROR');
    }
    await this.executeScripts(this.jsFiles, 'Script');
    this.processed.script = true;
  }

  async loadCrypt(options: CryptOptions): Promise<boolean> {
    return await this.core.credential.loadCrypt(options);
  }

  async beforePatchModToGame(): Promise<void> {
    await this.core.trigger(':import');
    await this.dataReplace();
    await this.processInit();
    await this.core.tool.zone.patchModToGame(this, 'before');
  }

  async afterPatchModToGame(): Promise<void> {
    await this.core.tool.zone.patchModToGame(this, 'after');
  }

  async scriptFiles(): Promise<void> {
    const modNames = this.gModUtils.getModListNameNoAlias();
    if (!Array.isArray(modNames) || modNames.length === 0) return;
    for (const modName of modNames) {
      try {
        const mod = this.gModUtils.getMod(modName) as ModInfo;
        const modZip = this.gModUtils.getModZip(modName);
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
        target.push({
          modName,
          filePath,
          content: await file.async('string')
        });
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
    try { await Process.Language(this); }  catch (error: any) { this.log(`语言处理过程失败: ${error?.message || error}`, 'ERROR'); }
    try { await Process.Audio(this); }     catch (error: any) { this.log(`音频处理过程失败: ${error?.message || error}`, 'ERROR'); }
    try { await Process.Framework(this); } catch (error: any) { this.log(`框架处理过程失败: ${error?.message || error}`, 'ERROR'); }
    try { await Process.NPC(this); }       catch (error: any) { this.log(`NPC处理过程失败: ${error?.message || error}`, 'ERROR'); }
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
  const oldSCdata = manager.gSC2DataManager.getSC2DataInfoAfterPatch();
  const SCdata = oldSCdata.cloneSC2DataInfo();
  const passageData = SCdata.passageDataItems.map;
  const passageTitle = 'Options Overlay';
  const passage = passageData.get(passageTitle);
  const replacements: [RegExp, string][] = [
    [
      /<label\s+class="en-GB">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"en-GB"\s*autocheck\s*>>\s*([^<]+)<\/label>/,
      `<label class="en-GB"><<radiobutton "$options.dateFormat" "en-GB" autocheck>> ${manager.gModUtils.getModListNameNoAlias().includes('ModI18N') ? '英(日/月/年)' : 'GB(dd/mm/yyyy)'}</label>`
    ],
    [
      /<label\s+class="en-US">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"en-US"\s*autocheck\s*>>\s*([^<]+)<\/label>/,
      `<label class="en-US"><<radiobutton "$options.dateFormat" "en-US" autocheck>> ${manager.gModUtils.getModListNameNoAlias().includes('ModI18N') ? '美(月/日/年)' : 'US(mm/dd/yyyy)'}</label>`
    ],
    [
      /<label\s+class="zh-CN">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"zh-CN"\s*autocheck\s*>>\s*([^<]+)<\/label>/,
      `<label class="zh-CN"><<radiobutton "$options.dateFormat" "zh-CN" autocheck>> ${manager.gModUtils.getModListNameNoAlias().includes('ModI18N') ? '中(年/月/日)' : 'CN(yyyy/mm/dd)'}</label>`
    ]
  ];
  passage.content = replace(passage.content, replacements);
  passageData.set(passageTitle, passage);
  SCdata.passageDataItems.back2Array();
  manager.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
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
