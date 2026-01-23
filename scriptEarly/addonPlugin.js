// @ts-check
/// <reference path='../maplebirch.d.ts' />
(async() => {
  'use strict';
  const logger = modUtils.getLogger();
  logger.log('[maplebirchMod] 开始执行');

  async function modifyOptionsDateFormat() {
    const oldSCdata = modSC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const passageData = SCdata.passageDataItems.map;
    const OptionsOverlayTwinePath = 'Options Overlay';
    const modify = passageData.get(OptionsOverlayTwinePath);
    const regex1 = /<label\s+class="en-GB">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"en-GB"\s*autocheck\s*>>\s*([^<]+)<\/label>/;
    const regex2 = /<label\s+class="en-US">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"en-US"\s*autocheck\s*>>\s*([^<]+)<\/label>/;
    const regex3 = /<label\s+class="zh-CN">\s*<<radiobutton\s*"\$options\.dateFormat"\s*"zh-CN"\s*autocheck\s*>>\s*([^<]+)<\/label>/;
    const text1 = modUtils.getMod('ModI18N') ? '英(日/月/年)' : 'GB(dd/mm/yyyy)';
    const text2 = modUtils.getMod('ModI18N') ? '美(月/日/年)' : 'US(mm/dd/yyyy)';
    const text3 = modUtils.getMod('ModI18N') ? '中(年/月/日)' : 'CN(yyyy/mm/dd)';
    if (regex1.test(modify.content)) modify.content = modify.content.replace(regex1, `<label class="en-GB"><<radiobutton "$options.dateFormat" "en-GB" autocheck>> ${text1}</label>`);
    if (regex2.test(modify.content)) modify.content = modify.content.replace(regex2, `<label class="en-US"><<radiobutton "$options.dateFormat" "en-US" autocheck>> ${text2}</label>`);
    if (regex3.test(modify.content)) modify.content = modify.content.replace(regex3, `<label class="zh-CN"><<radiobutton "$options.dateFormat" "zh-CN" autocheck>> ${text3}</label>`);
    passageData.set(OptionsOverlayTwinePath, modify);
    SCdata.passageDataItems.back2Array();
    addonTweeReplacer.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);  
  }

  class Process {
    /** @param {FrameworkAddon} addon */
    static async Language(addon) {
      if (addon.processed.language || addon.queue.language.length === 0) return;
      try {
        for (const task of addon.queue.language) {
          const { modName, config } = task;
          if (config === true) {
            await addon.core.lang.importAllLanguages(modName);
          } else if (Array.isArray(config)) {
            addon.core.log(`为${modName}导入指定语言: ${config.join(', ')}`, 'DEBUG');
            for (const lang of config) {
              const filePath = `translations/${lang.toLowerCase()}.json`;
              await addon.core.lang.loadTranslations(modName, lang.toUpperCase(), filePath);
            }
          } else if (typeof config === 'object' && config !== null) {
            addon.core.log(`为${modName}导入自定义语言配置`, 'DEBUG');
            for (const [lang, langConfig] of Object.entries(config)) {
              const filePath = langConfig.file || `translations/${lang.toLowerCase()}.json`;
              await addon.core.lang.loadTranslations(modName, lang.toUpperCase(), filePath);
            }
          }
        }
        addon.processed.language = true;
      } catch (/**@type {any}*/e) {
        addon.core.log(`语言配置处理失败: ${e.message}`, 'ERROR');
      }
    }

    /** @param {FrameworkAddon} addon */
    static async Audio(addon) {
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
      } catch (/**@type {any}*/e) {
        addon.core.log(`音频配置处理失败: ${e.message}`, 'ERROR');
      }
    }

    /** @param {FrameworkAddon} addon */
    static async Framework(addon) {
      if (addon.processed.framework || addon.queue.framework.length === 0) return;
      try {
        for (const task of addon.queue.framework) {
          const { modName, config } = task;
          const configs = Array.isArray(config) ? config : [config];
          for (const singleConfig of configs) {
            if (singleConfig.traits) {
              if (!singleConfig.traits || !Array.isArray(singleConfig.traits) || singleConfig.traits.length === 0) return;
              singleConfig.traits.forEach((/**@type {{ title: string | Function; name:string|Function;colour:string|Function; has: boolean|Function; text: string|Function; }}*/ trait) => Process.#addTrait(addon, trait));
            } else if (singleConfig.addto && singleConfig.widget) {
              Process.#addWidget(addon, modName, singleConfig.addto, singleConfig.widget);
            } else {
              addon.core.log(`模块 ${modName} 的框架配置格式无效: ${JSON.stringify(singleConfig)}`, 'WARN');
            }
          }
        }
        addon.processed.framework = true;
      } catch (/**@type {any}*/e) {
        addon.core.log(`框架配置处理失败: ${e.message}`, 'ERROR');
      }
    }

    /** @param {FrameworkAddon} addon @param {{ title: string|Function; name: string|Function; colour: string|Function; has: boolean|Function; text: string|Function; }} traitConfig */
    static #addTrait(addon, traitConfig) {
      const { title, name, colour, has, text } = traitConfig;
      if (!title || !name) { addon.core.log(`无效的特质配置: ${JSON.stringify(traitConfig)}`, 'WARN'); return;}
      let hasCond;
      if (typeof has === 'string') {
        try { hasCond = new Function(`return ${has};`); }
        catch (e) { addon.core.log(`无效的 has 条件表达式: ${has}`, 'ERROR'); hasCond = () => false; }
      } else {
        const hasValue = has ?? false;
        hasCond = () => hasValue;
      }
      const trait = { title: title, name: name, colour: colour ?? '', has: hasCond, text: text ?? '', };
      addon.core.tool.other.addTraits(trait);
    }

    /** @param {FrameworkAddon} addon @param {string} modName 模块名称 @param {string} zone 目标区域 @param {string|Object<string, {widget: string,exclude: string[], match: RegExp, passage: string[]}>} widget 部件配置 */
    static #addWidget(addon, modName, zone, widget) {
      if (typeof widget === 'string') {
        addon.core.log(`为Mod ${modName}添加部件到区域: ${zone} (${widget})`, 'DEBUG');
        addon.core.tool.framework.addTo(zone, widget);
      } else if (typeof widget === 'object' && widget.widget) {
        const widgetObj = { widget: widget.widget, exclude: widget.exclude, match: widget.match, passage: widget.passage };
        addon.core.tool.framework.addTo(zone, widgetObj);
      } else {
        addon.core.log(`无效的部件配置: ${JSON.stringify(widget)}`, 'WARN');
      }
    }

    /** @param {FrameworkAddon} addon */
    static async NPC(addon) {
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
      } catch (/**@type {any}*/e) {
        addon.core.log(`NPC 配置处理失败: ${e.message}`, 'ERROR');
      }
    }

    /** @param {FrameworkAddon} addon @param {string} modName @param {JSZip} modZip @param {string[]} imgPaths */
    static async #injectBSAImages(addon, modName, modZip, imgPaths) {
      try {
        const imgs = [];
        for (const imgPath of imgPaths) {
          try {
            if (typeof imgPath !== 'string') continue;
            const file = modZip.zip.file(imgPath);
            if (!file) { addon.core.log(`图片未找到: ${imgPath} (模组: ${modName})`, 'WARN'); continue; }
            const base64Data = await file.async('base64');
            const mimeType = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }[/** @type {string} */(imgPath.split('.').pop()?.toLowerCase())] || 'image/png';
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            imgs.push({ path: imgPath, getter: { getBase64Image: async () => dataUrl, invalid: false } });
          } catch (/**@type {any}*/e) {
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
      } catch (/**@type {any}*/e) { addon.core.log(`注册 ${modName} 的 NPC 侧边栏图片失败: ${e.message}`, 'ERROR'); }
    }

    /** @param {FrameworkAddon} addon */
    static async Shop(addon) {
      if (addon.processed.shop || addon.queue.shop.length === 0) return;
      try {
        for (const task of addon.queue.shop) {
          const { modName, config } = task;
          if (Array.isArray(config)) {
            for (const filePath of config) {
              addon.core.log(`为${modName}加载商店配置: ${filePath}`, 'DEBUG');
              await addon.core.shop.loadShopFromJson(modName, filePath);
            }
          } else { addon.logger.error(`无效的商店配置: ${JSON.stringify(config)}`); }
        }
        addon.processed.shop = true;
      } catch (/**@type {any}*/e) { addon.core.log(`商店配置处理失败: ${e.message}`, 'ERROR'); }
    }
  }

  class FrameworkAddon {
    /** @param {MaplebirchCore} core @param {modSC2DataManager} gSC2DataManager @param {modUtils} gModUtils */
    constructor(core, gSC2DataManager, gModUtils) {
      this.core = core;
      this.gSC2DataManager = gSC2DataManager;
      this.gModUtils = gModUtils;
      this.addonTweeReplacer = addonTweeReplacer;
      this.addonReplacePatcher = addonReplacePatcher;
      this.core.trigger(':beforePatch', this);
      this.info = new Map();
      this.logger = gModUtils.getLogger();
      this.gModUtils.getAddonPluginManager().registerAddonPlugin('maplebirch', 'maplebirchAddon', this);
      this.gSC2DataManager.getModLoadController().addLifeTimeCircleHook('maplebirchFramework', this);
      this.supportedConfigs = ['script', 'language', 'audio', 'framework', 'npc', 'shop'];
      /** @type {Object<any, {modName: string, mod: any, modZip: any}>} */
      this.queue = {};
      /** @type {Object<string, boolean>} */
      this.processed = {};
      /** @type {Array<{modName: string, filePath: string, content: string}>} */
      this.jsFiles = [];
      /** @type {Array<{modName: string, filePath: string, content: string}>} */
      this.moduleFiles = [];
      this.supportedConfigs.forEach(type => {
        this.queue[type] = [];
        this.processed[type] = false;
      });
      const theName = this.gModUtils.getNowRunningModName();
      if (!theName) { this.logger.error('[MaplebirchAddonPlugin] 初始化失败: 无法获取当前Mod名称'); return; }
      this.nowModName = theName;
      const modInfo = this.gModUtils.getMod(theName);
      if (!modInfo) { this.logger.error(`[MaplebirchAddonPlugin] 初始化失败: 无法获取当前Mod对象 [${theName}]`); return; }
      modInfo.modRef = this;
      this.logger.log(`[MaplebirchAddonPlugin] 初始化完成: 当前Mod对象 [${theName}]`);
    }

    async #dataReplace() {
      try { await modifyOptionsDateFormat(); } catch (e) { this.core.log('modifyOptionsDateFormat 出错', 'ERROR'); }
      try { await this.core.char.modifyPCModel(this); } catch (e) { this.core.log('modifyPCModel 出错', 'ERROR'); }
      try { await this.core.char.transformation.modifyEffect(this); } catch (e) { this.core.log('modifyEffect 出错', 'ERROR'); }
      try { await this.core.state.modifyWeather.modifyWeatherJavaScript(); } catch (e) { this.core.log('modifyWeatherJavaScript 出错', 'ERROR'); }
    }

    /** @param {string} addonName @param {{ name: string; bootJson: { addonPlugin: any[]; }; }} modInfo @param {JSZip} modZip */
    async registerMod(addonName, modInfo, modZip) {
      this.info.set(modInfo.name, { addonName: addonName, mod: modInfo, modZip: modZip });
      const config = modInfo.bootJson?.addonPlugin?.find(p => p.modName === 'maplebirch' && p.addonName === 'maplebirchAddon');
      if (config?.params) {
        if (Object.keys(config.params).length > 0 && !this.core.modList.includes(modInfo.name)) this.core.modList.push(modInfo.name);
        this.supportedConfigs.filter(type => type !== 'script').forEach(type => { if (config.params[type]) this.queue[type].push({modName: modInfo.name, modZip: modZip, config: config.params[type]}); });
      }
    }

    async afterInjectEarlyLoad() {
      await this.scriptFiles();
      await this.#executeScripts(this.moduleFiles, 'Module'); 
      if (this.core.modules.initPhase.allModuleRegisteredTriggered) await this.core.trigger(':allModule');
    }

    /** @param {string} modName @param {string} fileName */
    async InjectEarlyLoad_start(modName, fileName) {
      try { await this.#simpleFrameworkCheck(); } catch {};
    }

    async afterRegisterMod2Addon() {
      try { await this.core.char.faceStyleImagePaths(); } catch (/**@type {any}*/e) { this.core.log(`faceStyleImagePaths函数错误: ${e.message}`, 'ERROR') }
      await this.#executeScripts(this.jsFiles, 'Script');
      this.processed.script = true;
    }

    async afterPatchModToGame() {
      await this.core.tool.framework.patchModToGame('after');
    }

    async beforePatchModToGame() {
      await this.core.trigger(':import');
      await this.#dataReplace();
      await this.#processInit();
      try { await this.core.tool.framework.patchModToGame('before'); } catch (/**@type {any}*/e) { this.core.log(`框架数据修改失败: ${e.message}`, 'ERROR'); }
      try { await this.core.shop.beforePatchModToGame(); } catch (/**@type {any}*/e) { this.core.log(`商店数据注入失败: ${e.message}`, 'ERROR'); }
    }

    /** @param {string} modName @param {JSZip} modZip @param {string[]} files @param {boolean} isModule */
    async #loadFilesArray(modName, modZip, files, isModule) {
      for (const filePath of files) {
        const file = modZip.zip.file(filePath);
        if (!file) continue;
        const content = await file.async('string');
        if (isModule) { this.moduleFiles.push({ modName, filePath, content }); }
        else { this.jsFiles.push({ modName, filePath, content }); }
      }
    }

    async scriptFiles() {
      const modNames = this.gModUtils.getModListNameNoAlias();
      if (!Array.isArray(modNames) || modNames.length === 0) return;
      for (const modName of modNames) {
        try {
          const bootJson = this.gModUtils.getMod(modName).bootJson;
          const config = bootJson.addonPlugin?.find((/**@type {{ modName: string; addonName: string; }}*/p) => p.modName === 'maplebirch' && p.addonName === 'maplebirchAddon');
          const modZip = this.gModUtils.getModZip(modName);
          if (!config?.params || !modZip) continue;
          if (Array.isArray(config.params?.module)) await this.#loadFilesArray(modName, modZip, config.params.module, true);
          if (Array.isArray(config.params?.script)) await this.#loadFilesArray(modName, modZip, config.params.script, false);
        } catch (/**@type {any}*/e) {
          this.core.log(`[MaplebirchAddonPlugin] 加载模组脚本失败: ${modName} - ${e.message}`, 'ERROR');
        }
      }
    }

    /** @param {Array<{modName?: string, filePath?: string, content: string}>} files @param {string} type */
    async #executeScripts(files, type = 'Script') {
      if (files.length === 0) return;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const func = new Function(file.content);
          const result = func();
          if (result && typeof result.then === 'function') await result;
        } catch (/**@type {any}*/e) {
          this.core.log(`执行 ${type} 文件失败: ${file.filePath} (来自 ${file.modName}): ${e.message}`, 'ERROR');
        }
      }
      files.length = 0;
    }

    async #simpleFrameworkCheck() {
      const modLoadController = modUtils.getModLoadController();
      const [enabledMods, disabledMods] = await Promise.all([
        modLoadController.listModIndexDB(),
        modLoadController.loadHiddenModList()
      ]);
      const modName = 'Simple Frameworks';
      if (!enabledMods.includes(modName)) return false;
      enabledMods.splice(enabledMods.indexOf(modName), 1);
      if (!disabledMods.includes(modName)) disabledMods.push(modName);
      await Promise.all([
        modLoadController.overwriteModIndexDBModList(enabledMods),
        modLoadController.overwriteModIndexDBHiddenModList(disabledMods)
      ]);
      location.reload();
    }

    async #processInit() {
      try { await Process.Language(this); } catch (/**@type {any}*/e) { this.core.log(`语言处理过程失败: ${e.message}`, 'ERROR'); }
      try { await Process.Audio(this); } catch (/**@type {any}*/e) { this.core.log(`音频处理过程失败: ${e.message}`, 'ERROR'); }
      try { await Process.Framework(this); } catch (/**@type {any}*/e) { this.core.log(`框架处理过程失败: ${e.message}`, 'ERROR'); }
      try { await Process.NPC(this); } catch (/**@type {any}*/e) { this.core.log(`NPC处理过程失败: ${e.message}`, 'ERROR'); }
      try { await Process.Shop(this); } catch (/**@type {any}*/e) { this.core.log(`商店处理过程失败: ${e.message}`, 'ERROR'); }
    }
  }

  await maplebirch.register('addonPlugin', new FrameworkAddon(maplebirch, modSC2DataManager, modUtils), []);
})();