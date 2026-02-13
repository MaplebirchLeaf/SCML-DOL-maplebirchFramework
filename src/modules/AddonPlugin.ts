// ./src/modules/AddonPlugin.ts

import { TypeOrderItem } from '../../types/BeautySelectorAddon/BeautySelectorAddonType';
import { ModZipReader } from '../../types/ml/ModZipReader';
import { SC2DataManager } from '../../types/ml/SC2DataManager';
import { ModUtils } from '../../types/ml/Utils';
import { ReplacePatcher } from '../../types/ReplacePatch/ReplacePatcher';
import { TweeReplacer } from '../../types/TweeReplacer/TweeReplacer';
import maplebirch, { MaplebirchCore, createlog } from '../core';
import { TraitConfig } from './Frameworks/otherTools';
import { ZoneWidgetConfig } from './Frameworks/zonesManager';

interface Task {
  modName: string;
  config: any;
  modZip?: JSZip;
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
  bootJson?: { addonPlugin?: Array<{ modName: string; addonName: string; params?: any; }>; };
  modRef?: any;
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
        if (config === true) {
          for await (const p of addon.core.lang.importAll(modName)) if (p.error) addon.core.log(`导入失败: ${p.lang}`, 'ERROR');
        } else if (Array.isArray(config)) {
          addon.core.log(`为${modName}导入指定语言: ${config.join(', ')}`, 'DEBUG');
          for (const lang of config) {
            const filePath = `translations/${lang.toLowerCase()}.json`;
            for await (const p of addon.core.lang.load(modName, lang.toUpperCase(), filePath)) if (p.type === 'error') addon.core.log(`导入失败: ${p.lang}`, 'ERROR');
          }
        } else if (typeof config === 'object') {
          addon.core.log(`为${modName}导入自定义语言配置`, 'DEBUG');
          for (const [lang, langConfig] of Object.entries(config)) {
            const filePath = (langConfig as any).file || `translations/${lang.toLowerCase()}.json`;
            for await (const p of addon.core.lang.load(modName, lang.toUpperCase(), filePath)) if (p.type === 'error') addon.core.log(`导入失败: ${p.lang}`, 'ERROR');
          }
        }
      }
      addon.processed.language = true;
    } catch (e: any) {
      addon.core.log(`语言配置处理失败: ${e.message}`, 'ERROR');
    }
  }

  static async Audio(addon: AddonPlugin) {
    if (addon.processed.audio || addon.queue.audio.length === 0) return;
    try {
      for (const task of addon.queue.audio) {
        const { modName, config } = task;
        if (config === true) {
          addon.core.log(`为${modName}导入音频（默认路径）`, 'DEBUG');
          await addon.core.audio.importAllAudio(modName);
        } else if (Array.isArray(config)) {
          for (const path of config) {
            addon.core.log(`为${modName}导入音频（路径: ${path}）`, 'DEBUG');
            await addon.core.audio.importAllAudio(modName, path);
          }
        }
      }
      addon.processed.audio = true;
    } catch (e: any) {
      addon.core.log(`音频配置处理失败: ${e.message}`, 'ERROR');
    }
  }

  static async Framework(addon: AddonPlugin) {
    if (addon.processed.framework || addon.queue.framework.length === 0) return;
    try {
      for (const task of addon.queue.framework) {
        const { modName, config } = task;
        const configs = Array.isArray(config) ? config : [config];
        for (const singleConfig of configs) {
          if (singleConfig.traits) {
            if (!singleConfig.traits || !Array.isArray(singleConfig.traits) || singleConfig.traits.length === 0) return;
            singleConfig.traits.forEach((trait: TraitConfig) => Process._addTrait(addon, trait));
          } else if (singleConfig.addto && singleConfig.widget) {
            Process._addMacro(addon, modName, singleConfig.addto, singleConfig.widget);
          } else {
            addon.core.log(`模块 ${modName} 的框架配置格式无效: ${JSON.stringify(singleConfig)}`, 'WARN');
          }
        }
      }
      addon.processed.framework = true;
    } catch (e: any) {
      addon.core.log(`框架配置处理失败: ${e.message}`, 'ERROR');
    }
  }

  private static _addTrait(addon: AddonPlugin, traitConfig: TraitConfig) {
    const { title, name, colour, has, text } = traitConfig;
    if (!title || !name) { addon.core.log(`无效的特质配置: ${JSON.stringify(traitConfig)}`, 'WARN'); return; }
    let hasCond: Function;
    if (typeof has === 'string') {
      try { hasCond = new Function(`return ${has};`); }
      catch (e) { addon.core.log(`无效的 has 条件表达式: ${has}`, 'ERROR'); hasCond = () => false; }
    } else {
      hasCond = () => has ?? false;
    }
    const trait = { title: title, name: name, colour: colour ?? '', has: hasCond, text: text ?? '', } as TraitConfig;
    addon.core.tool.other.addTraits(trait);
  }

  private static _addMacro(addon: AddonPlugin, modName: string, zone: string, widget: ZoneWidgetConfig) {
    if (typeof widget === 'string') {
      addon.core.log(`为Mod ${modName}添加部件到区域: ${zone} (${widget})`, 'DEBUG');
      addon.core.tool.zone.addTo(zone, widget);
    } else if (typeof widget === 'object' && widget.widget) {
      const widgetObj = { widget: widget.widget, exclude: widget.exclude, match: widget.match, passage: widget.passage };
      addon.core.tool.zone.addTo(zone, widgetObj);
    } else {
      addon.core.log(`无效的部件配置: ${JSON.stringify(widget)}`, 'WARN');
    }
  }

  static async NPC(addon: AddonPlugin) {
    if (addon.processed.npc || addon.queue.npc.length === 0) return;
    try {
      for (const task of addon.queue.npc) {
        const { modName, modZip, config } = task;
        if (typeof config !== 'object' || config === null) { addon.core.log(`NPC 配置格式无效，跳过处理`, 'WARN'); continue; }
        if (config.NamedNPC && Array.isArray(config.NamedNPC)) {
          for (const npcConfig of config.NamedNPC) {
            if (typeof npcConfig !== 'object' || !npcConfig) continue;
            const [data, options, translations] = npcConfig;
            if (data && typeof data === 'object') addon.core.npc.add(data, options ?? {}, translations ?? {});
          }
        }
        if (config.Stats && typeof config.Stats === 'object') addon.core.npc.addStats(config.Stats);
        if (config.Sidebar && typeof config.Sidebar === 'object') {
          const allImagePaths = [];
          if (Array.isArray(config.Sidebar.clothes)) for (const filePath of config.Sidebar.clothes) await addon.core.npc.Clothes.load(modName, filePath);
          if (Array.isArray(config.Sidebar.image)) {
            const imagePaths = addon.core.npc.Sidebar.loadFromMod(modZip, config.Sidebar.image);
            if (imagePaths.length > 0) allImagePaths.push(...imagePaths);
          }
          if (Array.isArray(config.Sidebar.config)) {
            const clothesImagePaths = await addon.core.npc.Clothes.import(modName, modZip, config.Sidebar.config);
            if (clothesImagePaths.length > 0) allImagePaths.push(...clothesImagePaths);
          }
          if (allImagePaths.length > 0) await Process.#injectBSAImages(addon, modName, modZip, allImagePaths);
        }
      }
      addon.processed.npc = true;
    } catch (e: any) {
      addon.core.log(`NPC 配置处理失败: ${e.message}`, 'ERROR');
    }
  }

  static async #injectBSAImages(addon: AddonPlugin, modName: string, modZip: JSZip, imgPaths: string[]) {
    try {
      const imgs = [];
      for (const imgPath of imgPaths) {
        try {
          if (typeof imgPath !== 'string') continue;
          const file = modZip.zip.file(imgPath);
          if (!file) { addon.core.log(`图片未找到: ${imgPath} (模组: ${modName})`, 'WARN'); continue; }
          const base64Data = await file.async('base64');
          const mimeType = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }[/** @type {string} */(imgPath.split('.').pop()?.toLowerCase())] || 'image/png';
          const dataUrl = `data:${mimeType};base64,${base64Data}`;
          imgs.push({ path: imgPath, getter: { getBase64Image: async () => dataUrl, invalid: false } });
        } catch (e: any) {
          addon.core.log(`加载图片失败: ${imgPath} - ${e.message}`, 'WARN');
        }
      }
      if (imgs.length === 0) return;
      await addonBeautySelectorAddon.registerMod(
        'BeautySelectorAddon',
        { name: 'maplebirch', bootJson: { addonPlugin: [{ modName: 'BeautySelectorAddon', addonName: 'BeautySelectorAddon', params: { type: `npc-sidebar-[${modName}]` } }] }, imgs: imgs },
        modZip
      );
      addon.core.log(`成功注册 ${modName} 的 ${imgs.length} 个 NPC 侧边栏图片`, 'DEBUG');
    } catch (e: any) { addon.core.log(`注册 ${modName} 的 NPC 侧边栏图片失败: ${e.message}`, 'ERROR'); }
  }
}

class AddonPlugin {
  replace: (content: string, replacements: (string|RegExp)[][]) => string;
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

  constructor(readonly core: MaplebirchCore, readonly addonTweeReplacer: TweeReplacer, readonly addonReplacePatcher: ReplacePatcher) {
    this.replace = replace;
    this.gSC2DataManager = this.core.manager.modSC2DataManager;
    this.gModUtils = this.core.modUtils;
    this.addonTweeReplacer = addonTweeReplacer;
    this.addonReplacePatcher = addonReplacePatcher;
    this.core.trigger(':beforePatch', this);
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
    this.core.lodash.forEach(this.supportedConfigs, (type) => {
      this.queue[type] = [];
      this.processed[type] = false;
    });
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
    const config = modInfo.bootJson?.addonPlugin?.find(
      (p: any) => p.modName === 'maplebirch' && p.addonName === 'maplebirchAddon'
    ) as AddonPluginConfig;
    if (config?.params) {
      if (Object.keys(config.params).length > 0 && !this.core.lodash.includes(this.core.modList, modInfo.name)) this.core.modList.push(modInfo.name);
      const typesToProcess = this.core.lodash.filter(this.supportedConfigs, type => type !== 'script');
      this.core.lodash.forEach(typesToProcess, (type) => { if (config.params![type]) this.queue[type].push({ modName: modInfo.name, modZip, config: config.params![type] }); });
    }
  }

  async InjectEarlyLoad_start(_modName: string, _fileName: string): Promise<void> {
    try { await this.core.disabled('Simple Frameworks'); } catch {}
  }

  async ModLoaderLoadEnd(): Promise<void> {
    await this.core.gui.init();
    await this.core.trigger(':modLoaderEnd');
  }

  async afterInjectEarlyLoad(): Promise<void> {
    await this.scriptFiles();
    await this._executeScripts(this.moduleFiles, 'Module'); 
    if (this.core.modules.initPhase.allRegisteredTriggered) await this.core.trigger(':allModule');
  }

  async afterRegisterMod2Addon(): Promise<void> {
    await this._executeScripts(this.jsFiles, 'Script');
    this.processed.script = true;
  }

  async beforePatchModToGame(): Promise<void> {
    await this.core.trigger(':import');
    await this._dataReplace();
    await this._processInit();
    try { await this.core.tool.zone.patchModToGame(this, 'before'); } catch (e: any) { this.log(`区域数据修改失败: ${e.message}`, 'ERROR'); }
  }

  async afterPatchModToGame(): Promise<void> {
    await this.core.tool.zone.patchModToGame(this, 'after');
  }

  private async _dataReplace(): Promise<void> {
    try { await modifyOptionsDateFormat(this); } catch (e: any) { this.log('modifyOptionsDateFormat 出错', 'ERROR'); }
    try { await this.core.dynamic.Weather.modifyWeatherJavaScript(this); } catch (e) { this.log('modifyWeatherJavaScript 出错', 'ERROR'); }
    try { await this.core.char.modifyPCModel(this); } catch (e) { this.log('modifyPCModel 出错', 'ERROR'); }
    try { await this.core.char.modifyFaceStyle(this); } catch (e) { this.log('modifyFaceStyle 出错', 'ERROR'); }
    try { await this.core.char.transformation.modifyEffect(this); } catch (e) { this.log('modifyEffect 出错', 'ERROR'); }
  }

  private async _loadFilesArray(modName: string, modZip: ModZipReader, files: string[], isModule: boolean): Promise<void> {
    for (const filePath of files) {
      const file = modZip.zip.file(filePath);
      if (!file) continue;
      const content = await file.async('string');
      if (isModule) { this.moduleFiles.push({ modName, filePath, content }); }
      else { this.jsFiles.push({ modName, filePath, content }); }
    }
  }

  async scriptFiles(): Promise<void> {
    const modNames = this.gModUtils.getModListNameNoAlias();
    if (!Array.isArray(modNames) || modNames.length === 0) return;
    for (const modName of modNames) {
      try {
        const bootJson = (this.gModUtils.getMod(modName) as ModInfo).bootJson;
        const config = bootJson?.addonPlugin?.find((p) => p.modName === 'maplebirch' && p.addonName === 'maplebirchAddon') as AddonPluginConfig;
        const modZip = this.gModUtils.getModZip(modName);
        if (!config?.params || !modZip) continue;
        if (Array.isArray(config.params?.module)) await this._loadFilesArray(modName, modZip, config.params.module, true);
        if (Array.isArray(config.params?.script)) await this._loadFilesArray(modName, modZip, config.params.script, false);
      } catch (e: any) {
        this.log(`加载模组脚本失败: ${modName} - ${e.message}`, 'ERROR');
      }
    }
  }

  private async _executeScripts(files: FileItem[], type: 'Script' | 'Module' = 'Script'): Promise<void> {
    if (files.length === 0) return;
    const disabled = type === 'Script' ? this.core.gui.disabledScripts : [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (type === 'Script') {
        const scriptKey = `[${file.modName}]:${file.filePath}`;
        if (disabled.includes(scriptKey)) { 
          file.content = ''; 
          continue; 
        }
      }
      const content = file.content;
      try {
        const func = new Function(content);
        const result = func();
        if (result && typeof result.then === 'function') await result;
      } catch (e: any) {
        this.log(`执行 ${type} 文件失败: ${file.filePath} (来自 ${file.modName}): ${e.message}`, 'ERROR');
      } finally {
        file.content = '';
      }
    }
  }

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
  maplebirch.lodash.forEach(replacements, ([regex, replaceStr], i) => {
    if (regex.test(result)) { result = result.replace(regex, replaceStr); }
    else { unmatched.push(i + 1); }
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
  manager.addonTweeReplacer.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
}

(async function(maplebirch: MaplebirchCore, addonTweeReplacer: TweeReplacer, addonReplacePatcher: ReplacePatcher) {
  'use strict';
  let order:TypeOrderItem[] = window.addonBeautySelectorAddon.typeOrderUsed;
  Object.defineProperty(window.addonBeautySelectorAddon, 'typeOrderUsed', {
    get() { return order; },
    set(v:TypeOrderItem[]) { 
      order = v; 
      if (T?.modelclass) { 
        Renderer.clearCaches(T.modelclass); 
        $.wiki('<<updatesidebarimg>>'); 
      } 
    }
  });
  await maplebirch.register('addon', Object.seal(new AddonPlugin(maplebirch, addonTweeReplacer, addonReplacePatcher)), []);
})(maplebirch, addonTweeReplacer, addonReplacePatcher)

export default AddonPlugin