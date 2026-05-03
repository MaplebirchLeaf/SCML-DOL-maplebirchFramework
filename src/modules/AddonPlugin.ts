// ./src/modules/AddonPlugin.ts

import type { TypeOrderItem } from '@scml/types/AddonMod_BeautySelector/BeautySelectorAddonType';
import type { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';
import type { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import type { ModUtils } from '@scml/types/sugarcube-2-ModLoader/Utils';
import { Languages, type LanguageCode } from '../constants';
import maplebirch, { type MaplebirchCore, createlog } from '../core';
import { TraitConfig } from './Frameworks/otherTools';
import { ZoneWidgetConfig } from './Frameworks/zonesManager';

interface Task {
  modName: string;
  config: any;
  modZip?: ModZipReader;
}

interface AddonPluginConfig {
  params?: {
    [key: string]: any;
    language?: boolean | string[] | { [key: string]: { file: string } };
    script?: string[];
    module?: string[];
  };
}

interface ModInfo {
  name: string;
  bootJson?: {
    addonPlugin?: Array<{
      modName: string;
      addonName: string;
      modVersion?: string;
      params?: any;
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
      for (const task of addon.queue.language) {
        const { modName, config } = task as Task;
        if (Array.isArray(config)) {
          const languages = config.map(lang => String(lang).toUpperCase()).filter((lang): lang is LanguageCode => (Languages as readonly string[]).includes(lang));
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
        for (const [languageName, languageConfig] of Object.entries(config)) {
          const language = String(languageName).toUpperCase();
          if (!(Languages as readonly string[]).includes(language)) {
            addon.core.log(`跳过不支持的语言: ${languageName}`, 'WARN');
            continue;
          }
          const filePath = (languageConfig as any)?.file;
          if (typeof filePath !== 'string' || !filePath.trim()) {
            addon.core.log(`语言 ${language} 缺少有效的 file 配置`, 'WARN');
            continue;
          }
          for await (const progress of addon.core.lang.importFile(modName, language as LanguageCode, filePath))
            if (progress.type === 'error') addon.core.log(`导入失败: ${progress.language}`, 'ERROR');
        }
      }
      addon.processed.language = true;
    } catch (error: any) {
      addon.core.log(`语言配置处理失败: ${error.message}`, 'ERROR');
    }
  }

  static async Audio(addon: AddonPlugin): Promise<void> {
    if (addon.processed.audio || addon.queue.audio.length === 0) return;
    try {
      for (const task of addon.queue.audio) {
        const { modName, config } = task as Task;
        if (!Array.isArray(config) || config.length === 0) {
          addon.core.log(`模块 ${modName} 的音频配置为空或无效`, 'WARN');
          continue;
        }
        for (const folder of config) {
          if (typeof folder !== 'string' || !folder.trim()) {
            addon.core.log(`模块 ${modName} 的音频目录无效: ${String(folder)}`, 'WARN');
            continue;
          }
          addon.core.log(`为 ${modName} 导入音频目录: ${folder}`, 'DEBUG');
          await addon.core.audio.import(modName, folder);
        }
      }
      addon.processed.audio = true;
    } catch (error: any) {
      addon.core.log(`音频配置处理失败: ${error.message}`, 'ERROR');
    }
  }

  static async Framework(addon: AddonPlugin): Promise<void> {
    if (addon.processed.framework || addon.queue.framework.length === 0) return;
    try {
      for (const task of addon.queue.framework) {
        const { modName, config } = task;
        const configs = Array.isArray(config) ? config : [config];
        for (const singleConfig of configs) {
          if (!singleConfig || typeof singleConfig !== 'object') {
            addon.core.log(`模块 ${modName} 的框架配置格式无效: ${JSON.stringify(singleConfig)}`, 'WARN');
            continue;
          }
          if (singleConfig.traits) {
            if (!Array.isArray(singleConfig.traits) || singleConfig.traits.length === 0) continue;
            singleConfig.traits.forEach((trait: TraitConfig) => Process._addTrait(addon, trait));
            continue;
          }
          if (singleConfig.addto && singleConfig.widget) {
            Process._addMacro(addon, modName, singleConfig.addto, singleConfig.widget);
            continue;
          }
          addon.core.log(`模块 ${modName} 的框架配置格式无效: ${JSON.stringify(singleConfig)}`, 'WARN');
        }
      }
      addon.processed.framework = true;
    } catch (e: any) {
      addon.core.log(`框架配置处理失败: ${e.message}`, 'ERROR');
    }
  }

  private static _addTrait(addon: AddonPlugin, traitConfig: TraitConfig): void {
    const { title, name, colour, has, text } = traitConfig;
    if (!title || !name) {
      addon.core.log(`无效的特质配置: ${JSON.stringify(traitConfig)}`, 'WARN');
      return;
    }
    let hasCond: Function;
    if (typeof has === 'string') {
      try {
        hasCond = new Function(`return ${has as any};`);
      } catch {
        addon.core.log(`无效的 has 条件表达式: ${has as any}`, 'ERROR');
        hasCond = () => false;
      }
    } else {
      hasCond = () => has ?? false;
    }
    const trait = { title, name, colour: colour ?? '', has: hasCond, text: text ?? '' } as TraitConfig;
    addon.core.tool.other.addTraits(trait);
  }

  private static _addMacro(addon: AddonPlugin, modName: string, zone: string, widget: ZoneWidgetConfig): void {
    if (typeof widget === 'string') {
      addon.core.log(`为Mod ${modName}添加部件到区域: ${zone} (${widget as any})`, 'DEBUG');
      addon.core.tool.zone.addTo(zone, widget);
      return;
    }
    if (widget && typeof widget === 'object' && widget.widget) {
      const widgetObj = { widget: widget.widget, exclude: widget.exclude, match: widget.match, passage: widget.passage };
      addon.core.tool.zone.addTo(zone, widgetObj);
      return;
    }
    addon.core.log(`无效的部件配置: ${JSON.stringify(widget)}`, 'WARN');
  }

  static async NPC(addon: AddonPlugin): Promise<void> {
    if (addon.processed.npc || addon.queue.npc.length === 0) return;
    try {
      for (const task of addon.queue.npc) {
        const { modName, modZip, config } = task;
        if (!config || typeof config !== 'object') {
          addon.core.log(`NPC 配置格式无效，跳过处理`, 'WARN');
          continue;
        }
        if (Array.isArray(config.NamedNPC)) {
          for (const npcConfig of config.NamedNPC) {
            if (!npcConfig || typeof npcConfig !== 'object') continue;
            const [data, options, translations] = npcConfig;
            if (data && typeof data === 'object') addon.core.npc.add(data, options ?? {}, translations ?? {});
          }
        }
        if (config.Stats && typeof config.Stats === 'object') addon.core.npc.addStats(config.Stats);
        const sidebar = config.Sidebar;
        if (!sidebar || typeof sidebar !== 'object' || !modZip) continue;
        const allImagePaths: string[] = [];
        if (Array.isArray(sidebar.clothes)) for (const filePath of sidebar.clothes) await addon.core.npc.Clothes.load(modName, filePath);
        if (Array.isArray(sidebar.image)) {
          const imagePaths = addon.core.npc.Sidebar.loadFromMod(modZip, sidebar.image);
          if (imagePaths.length > 0) allImagePaths.push(...imagePaths);
        }
        if (Array.isArray(sidebar.config)) {
          const clothesImagePaths = await addon.core.npc.Clothes.import(modName, modZip, sidebar.config);
          if (clothesImagePaths.length > 0) allImagePaths.push(...clothesImagePaths);
        }
        if (allImagePaths.length > 0) await Process._injectBSAImages(addon, modName, modZip, allImagePaths);
      }
      addon.processed.npc = true;
    } catch (e: any) {
      addon.core.log(`NPC 配置处理失败: ${e.message}`, 'ERROR');
    }
  }

  private static async _injectBSAImages(addon: AddonPlugin, modName: string, modZip: ModZipReader, imgPaths: string[]): Promise<void> {
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
            { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }[imgPath.split('.').pop()?.toLowerCase()] || 'image/png';
          const dataUrl = `data:${mimeType};base64,${base64Data}`;
          imgs.push({ path: imgPath, getter: { getBase64Image: async () => dataUrl, invalid: false } });
        } catch (e: any) {
          addon.core.log(`加载图片失败: ${imgPath} - ${e.message}`, 'WARN');
        }
      }
      if (imgs.length === 0) return;
      const modInfo = modZip.modInfo;
      const plugins = modInfo.bootJson?.addonPlugin;
      if (!plugins) return;
      let plugin = plugins.find(p => p.modName === 'BeautySelectorAddon' && p.addonName === 'BeautySelectorAddon');
      if (!plugin) {
        plugin = { modName: 'BeautySelectorAddon', addonName: 'BeautySelectorAddon', modVersion: '^2.0.0', params: {} };
        plugins.push(plugin);
      }
      plugin.params = plugin.params || {};
      plugin.params['type'] = 'npc-sidebar';
      modInfo.imgs = imgs;
      await window.addonBeautySelectorAddon.registerMod('BeautySelectorAddon', modInfo, modZip as any);
      addon.core.log(`成功注册 ${modName} 的 ${imgs.length} 个 NPC 侧边栏图片`, 'DEBUG');
    } catch (e: any) {
      addon.core.log(`注册 ${modName} 的 NPC 侧边栏图片失败: ${e.message}`, 'ERROR');
    }
  }
}

class AddonPlugin {
  replace: (content: string, replacements: [RegExp, string][]) => string;
  readonly gSC2DataManager: SC2DataManager;
  readonly gModUtils: ModUtils;
  info: Map<string, { addonName: string; mod: ModInfo; modZip: ModZipReader }>;
  readonly log: ReturnType<typeof createlog>;
  nowModName: string;
  supportedConfigs: string[];
  queue: { [key: string]: any[] };
  processed: { [key: string]: boolean };
  jsFiles: FileItem[];
  moduleFiles: FileItem[];

  constructor(readonly core: MaplebirchCore) {
    this.replace = replace;
    this.gSC2DataManager = this.core.manager.modSC2DataManager;
    this.gModUtils = this.core.modUtils;
    this.info = new Map();
    this.log = createlog('addon');
    this.log('[AddonPlugin] 开始初始化', 'INFO');
    this.gModUtils.getAddonPluginManager().registerAddonPlugin('maplebirch', 'maplebirchAddon', this);
    this.gSC2DataManager.getModLoadController().addLifeTimeCircleHook('maplebirchFramework', this);
    this.supportedConfigs = ['script', 'language', 'audio', 'framework', 'npc'];
    this.queue = {};
    this.processed = {};
    this.jsFiles = [];
    this.moduleFiles = [];
    for (const type of this.supportedConfigs) {
      this.queue[type] = [];
      this.processed[type] = false;
    }
    const theName = this.gModUtils.getNowRunningModName();
    if (!theName) {
      this.log('初始化失败: 无法获取当前Mod名称', 'ERROR');
      return;
    }
    this.nowModName = theName as string;
    const modInfo = this.gModUtils.getMod(theName) as ModInfo;
    if (!modInfo) {
      this.log(`[AddonPlugin] 初始化失败: 无法获取当前Mod对象 [${theName}]`, 'ERROR');
      return;
    }
    modInfo.modRef = this;
    this.log(`[AddonPlugin] 初始化完成`);
  }

  async registerMod(addonName: string, modInfo: ModInfo, modZip: ModZipReader): Promise<void> {
    this.info.set(modInfo.name, { addonName, mod: modInfo, modZip });
    const config = modInfo.bootJson?.addonPlugin?.find((p: any) => p.modName === 'maplebirch' && p.addonName === 'maplebirchAddon') as AddonPluginConfig;
    if (!config?.params) return;
    if (Object.keys(config.params).length > 0 && !this.core.modList.includes(modInfo.name)) this.core.modList.push(modInfo.name);
    for (const type of this.supportedConfigs) if (type !== 'script' && config.params[type]) this.queue[type].push({ modName: modInfo.name, modZip, config: config.params[type] });
  }

  async ModLoaderLoadEnd(): Promise<void> {
    await this.core.gui.init();
    await this.core.trigger(':modLoaderEnd');
  }

  async afterInjectEarlyLoad(): Promise<void> {
    await this.core.disabled('Simple Frameworks');
    await this.scriptFiles();
    await this._executeScripts(this.moduleFiles, 'Module');
    await this.core.trigger(':allModule');
  }

  async afterRegisterMod2Addon(): Promise<void> {
    try {
      await this.core.char.faceStyleImagePaths();
    } catch (e: any) {
      this.core.log(`faceStyleImagePaths函数错误: ${e.message}`, 'ERROR');
    }
    await this._executeScripts(this.jsFiles, 'Script');
    this.processed.script = true;
  }

  async beforePatchModToGame(): Promise<void> {
    await this.core.trigger(':import');
    await this._dataReplace();
    await this._processInit();
    try {
      await this.core.tool.zone.patchModToGame(this, 'before');
    } catch (e: any) {
      this.log(`区域数据修改失败: ${e.message}`, 'ERROR');
    }
  }

  async afterPatchModToGame(): Promise<void> {
    await this.core.tool.zone.patchModToGame(this, 'after');
  }

  // prettier-ignore
  private async _dataReplace(): Promise<void> {
    try { await modifyOptionsDateFormat(this);                           } catch { this.log('modifyOptionsDateFormat 出错', 'ERROR'); }
    try { await this.core.dynamic.Weather.modifyWeatherJavaScript(this); } catch { this.log('modifyWeatherJavaScript 出错', 'ERROR'); }
    try { await this.core.char.modifyPCModel(this);                      } catch { this.log('modifyPCModel 出错', 'ERROR');           }
    try { await this.core.char.modifyFaceStyle(this);                    } catch { this.log('modifyFaceStyle 出错', 'ERROR');         }
    try { await this.core.char.transformation.modifyEffect(this);        } catch { this.log('modifyEffect 出错', 'ERROR');            }
  }

  private async _loadFilesArray(modName: string, modZip: ModZipReader, files: string[], type: 'Module' | 'Script'): Promise<void> {
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
      } catch (e: any) {
        this.log(`加载 ${type} 文件失败: ${filePath} (来自 ${modName}): ${e.message}`, 'ERROR');
      }
    }
  }

  async scriptFiles(): Promise<void> {
    const modNames = this.gModUtils.getModListNameNoAlias();
    if (!Array.isArray(modNames) || modNames.length === 0) return;
    for (const modName of modNames) {
      try {
        const mod = this.gModUtils.getMod(modName) as ModInfo;
        const modZip = this.gModUtils.getModZip(modName);
        const config = mod?.bootJson?.addonPlugin?.find(p => p.modName === 'maplebirch' && p.addonName === 'maplebirchAddon') as AddonPluginConfig;
        if (!config?.params || !modZip) continue;
        const { module, script } = config.params;
        if (Array.isArray(module)) await this._loadFilesArray(modName, modZip, module, 'Module');
        if (Array.isArray(script)) await this._loadFilesArray(modName, modZip, script, 'Script');
      } catch (e: any) {
        this.log(`加载模组脚本失败: ${modName} - ${e.message}`, 'ERROR');
      }
    }
  }

  private async _executeScripts(files: FileItem[], type: 'Script' | 'Module' = 'Script'): Promise<void> {
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
      } catch (e: any) {
        this.log(`执行 ${type} 文件失败: ${file.filePath} (来自 ${file.modName}): ${e.message}`, 'ERROR');
      } finally {
        file.content = '';
      }
    }
  }

  // prettier-ignore
  private async _processInit(): Promise<void> {
    try { await Process.Language(this); }  catch (e: any) { this.log(`语言处理过程失败: ${e.message}`, 'ERROR'); }
    try { await Process.Audio(this); }     catch (e: any) { this.log(`音频处理过程失败: ${e.message}`, 'ERROR'); }
    try { await Process.Framework(this); } catch (e: any) { this.log(`框架处理过程失败: ${e.message}`, 'ERROR'); }
    try { await Process.NPC(this); }       catch (e: any) { this.log(`NPC处理过程失败: ${e.message}`, 'ERROR'); }
  }
}

function replace(content: string, replacements: [RegExp, string][]): string {
  const unmatched: number[] = [];
  let result = content;
  replacements.forEach(([regex, replaceStr], i) => {
    if (regex.test(result)) {
      result = result.replace(regex, replaceStr);
    } else {
      unmatched.push(i + 1);
    }
  });
  if (unmatched.length) maplebirch.log(`以下正则未匹配到内容 - ${unmatched.join(',')}`, 'WARN');
  return result;
}

async function modifyOptionsDateFormat(manager: AddonPlugin): Promise<void> {
  const oldSCdata = manager.gSC2DataManager.getSC2DataInfoAfterPatch();
  const SCdata = oldSCdata.cloneSC2DataInfo();
  const passageData = SCdata.passageDataItems.map;
  const OptionsOverlayTwinePath = 'Options Overlay';
  const modify = passageData.get(OptionsOverlayTwinePath);
  const replacements: [RegExp, string][] = [
    [
      /<label\s+class="en-GB">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"en-GB"\s*autocheck\s*>>\s*([^<]+)<\/label>/,
      `<label class="en-GB"><<radiobutton "$options.dateFormat" "en-GB" autocheck>> ${manager.gModUtils.getMod('ModI18N') ? '英(日/月/年)' : 'GB(dd/mm/yyyy)'}</label>`
    ],
    [
      /<label\s+class="en-US">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"en-US"\s*autocheck\s*>>\s*([^<]+)<\/label>/,
      `<label class="en-US"><<radiobutton "$options.dateFormat" "en-US" autocheck>> ${manager.gModUtils.getMod('ModI18N') ? '美(月/日/年)' : 'US(mm/dd/yyyy)'}</label>`
    ],
    [
      /<label\s+class="zh-CN">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"zh-CN"\s*autocheck\s*>>\s*([^<]+)<\/label>/,
      `<label class="zh-CN"><<radiobutton "$options.dateFormat" "zh-CN" autocheck>> ${manager.gModUtils.getMod('ModI18N') ? '中(年/月/日)' : 'CN(yyyy/mm/dd)'}</label>`
    ]
  ];
  modify.content = replace(modify.content, replacements);
  passageData.set(OptionsOverlayTwinePath, modify);
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
    set(v: TypeOrderItem[]) {
      order = v;
      if (T?.modelclass) {
        Renderer.clearCaches(T.modelclass);
        $.wiki('<<updatesidebarimg>>');
      }
    }
  });
  maplebirch.register('addon', Object.seal(new AddonPlugin(maplebirch)), []);
})(maplebirch);

export default AddonPlugin;
