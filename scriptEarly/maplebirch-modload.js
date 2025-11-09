// @ts-check
/// <reference path='../maplebirch.d.ts' />
(async() => {
  'use strict';
  if (!window.maplebirch) return;
  const modUtils = window.modUtils;
  const logger = modUtils.getLogger();
  const modSC2DataManager = window.modSC2DataManager;
  const addonBeautySelectorAddon = window.addonBeautySelectorAddon;
  const addonTweeReplacer = window.addonTweeReplacer; // Twee
  const addonReplacePatcher = window.addonReplacePatcher; // JavaScript
  const maplebirch = window.maplebirch;
  logger.log('[maplebirchMod] 开始执行');

  /*async function fixDolGlitch() {
    const Widget_Named_NPCsPassagePath = 'Widgets Named Npcs';
    const passage1 = modUtils.getPassageData(Widget_Named_NPCsPassagePath);
    if (modUtils.getMod('ModI18N')) {
    modUtils.updatePassageData(
      passage1.name,
      passage1.content.replace(/rank: "见习教徒",/, 'rank: "initiate",'),
      passage1.tags,
      passage1.id);
    }
  }*/

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

  async function modifyJournalTime() {
    const oldSCdata = modSC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const passageData = SCdata.passageDataItems.map;
    const JournalTwinePath = 'Widgets Journal';
    const modify = passageData.get(JournalTwinePath);
    const regex = /<<print\s*("It is "\s*\+\s*getFormattedDate\(Time\.date\)\s*\+\s*",\s*"\s*\+\s*Time\.year\s*\+\s*"\."|"今天是"\s*\+\s*Time\.year\s*\+\s*"年"\s*\+\s*getFormattedDate\(Time\.date\)\s*\+\s*"。"|ordinalSuffixOf\(Time\.monthDay\)\s*\+\s*"\s*"\s*\+\s*Time\.monthName\.slice\(0,3\)|Time\.month\s*\+\s*"月"\s*\+\s*ordinalSuffixOf\(Time\.monthDay\)\s*\+\s*"日")\s*>>/;
    if (regex.test(modify.content)) modify.content = modify.content.replace(regex,`<<= maplebirch.state.TimeManager.updateTimeLanguage('JournalTime')>>`);
    passageData.set(JournalTwinePath, modify);
    SCdata.passageDataItems.back2Array();
    addonTweeReplacer.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);  
  }

  async function joinNPCSidebar() {
    const oldSCdata = modSC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const passageData = SCdata.passageDataItems.map;
    const ImgTwinePath = 'Widgets Img';
    const modify = passageData.get(ImgTwinePath);
    const regex = /<div\s+id\s*=\s*"img"\s*>/;
    if (regex.test(modify.content)) modify.content = modify.content.replace(regex,`<<maplebirch-npc-model>>\n\t<div id="img">`);
    passageData.set(ImgTwinePath, modify);
    SCdata.passageDataItems.back2Array();
    addonTweeReplacer.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);  
  }

  class MaplebirchFrameworkAddon {
    /** @param {maplebirch} core @param {modSC2DataManager} gSC2DataManager @param {modUtils} gModUtils */
    constructor(core, gSC2DataManager, gModUtils) {
      this.core = core;
      this.gSC2DataManager = gSC2DataManager;
      this.gModUtils = gModUtils;
      this.addonTweeReplacer = addonTweeReplacer;
      this.addonReplacePatcher = addonReplacePatcher;
      /** @type {{ modifyWeatherJavaScript: () => any; }} */
      this.modifyWeather;
      maplebirch.trigger(':beforePatch', this);
      this.info = new Map();
      this.logger = gModUtils.getLogger();
      this.gModUtils.getAddonPluginManager().registerAddonPlugin('maplebirch', 'maplebirchAddon', this);
      this.supportedConfigs = ['language', 'audio', 'framework', 'npc', 'shop', 'npcSidebar'];
      /** @type {Object<any, {modName: string, mod: any, modZip: any}>} */
      this.queue = {};
      /** @type {Object<string, boolean>} */
      this.processed = {};
      this.supportedConfigs.forEach(type => {
        this.queue[type] = [];
        this.processed[type] = false;
      });
      const theName = this.gModUtils.getNowRunningModName();
      if (!theName) { this.logger.error('[MaplebirchAddonPlugin] 初始化失败: 无法获取当前Mod名称'); return;}
      this.nowModName = theName;
      const mod = this.gModUtils.getMod(theName);
      if (!mod) { this.logger.error(`[MaplebirchAddonPlugin] 初始化失败: 无法获取当前Mod对象 [${theName}]`); return;}
      mod.modRef = this;
      this.core.log(`[MaplebirchAddonPlugin] 初始化完成, 当前Mod: ${theName}`, 'DEBUG');
      this.logger.log(`[MaplebirchAddonPlugin] 初始化完成, 当前Mod: ${theName}`);
    }

    async #vanillaDataReplace() {
      this.core.log('开始执行正则替换', 'DEBUG');
      try { await modifyOptionsDateFormat(); } catch (e) { this.core.log('modifyOptionsDateFormat 出错', 'ERROR'); }
      try { await modifyJournalTime(); } catch (e) { this.core.log('modifyJournalTime 出错', 'ERROR'); }
      try { await joinNPCSidebar(); } catch (e) { this.core.log('joinNPCSidebar 出错', 'ERROR'); }
      try { await this.modifyWeather.modifyWeatherJavaScript(); } catch (e) { this.core.log('modifyWeatherJavaScript 出错', 'ERROR'); }
    }

    /** @param {{ bootJson: { addonPlugin: any[]; }; }} modInfo */
    #getModConfig(modInfo) {
      const pluginConfig = modInfo.bootJson.addonPlugin?.find(p => p.modName === 'maplebirch' && p.addonName === 'maplebirchAddon');
      return pluginConfig || {};
    }

    /** @param {string} addonName @param {{ name?: string; bootJson: { addonPlugin: any[]; }; }} mod @param {any} modZip */
    async registerMod(addonName, mod, modZip) {
      this.info.set(mod.name, {
        addonName: addonName,
        mod: mod,
        modZip: modZip
      });
      const config = this.#getModConfig(mod);
      if (Object.keys(config.params || {}).length > 0) if (!this.core.modList.includes(mod.name)) this.core.modList.push(mod.name);
      this.supportedConfigs.forEach(type => {
        if (config.params?.[type]) {
          this.queue[type].push({
            modName: mod.name,
            modZip: modZip,
            config: config.params[type]
          });
        }
      });
      this.core.log(`[MaplebirchAddonPlugin] 注册Mod: ${mod.name}`, 'DEBUG');
      this.logger.log(`[MaplebirchAddonPlugin] 注册Mod: ${mod.name}`);
    }

    async afterPatchModToGame() {
      await this.core.tool.framework.afterPatchModToGame();
    }

    async beforePatchModToGame() {
      await this.#vanillaDataReplace();
      await this.#processInit();
      await this.core.shop.beforePatchModToGame();
    }

    async #processInit() {
      try { await this.#processShop(); } catch (/** @type {any} */e) { this.core.log(`商店处理过程失败: ${e.message}`, 'ERROR'); }
      try { await this.#processLanguage(); } catch (/** @type {any} */e) { this.core.log(`语言处理过程失败: ${e.message}`, 'ERROR'); }
      try { await this.#processAudio(); } catch (/** @type {any} */e) { this.core.log(`音频处理过程失败: ${e.message}`, 'ERROR'); }
      try { await this.#processFramework(); } catch (/** @type {any} */e) { this.core.log(`框架处理过程失败: ${e.message}`, 'ERROR'); }
      try { await this.#processNpc(); } catch (/** @type {any} */e) { this.core.log(`NPC处理过程失败: ${e.message}`, 'ERROR'); }
      try { await this.#processNpcSidebar(); } catch (/** @type {any} */e) { this.core.log(`NPC侧边栏处理过程失败: ${e.message}`, 'ERROR'); }
    }

    async #processLanguage() {
      if (this.processed.language || this.queue.language.length === 0) return;
      try {
        for (const task of this.queue.language) {
          const { modName, modZip, config } = task;
          if (config === true) {
            await this.core.lang.importAllLanguages(modName);
          } else if (Array.isArray(config)) {
            this.core.log(`为${modName}导入指定语言: ${config.join(', ')}`, 'DEBUG');
            for (const lang of config) {
              const filePath = `translations/${lang.toLowerCase()}.json`;
              await this.core.lang.loadTranslations(modName, lang.toUpperCase(), filePath);
            }
          } else if (typeof config === 'object' && config !== null) {
            this.core.log(`为${modName}导入自定义语言配置`, 'DEBUG');
            for (const [lang, langConfig] of Object.entries(config)) {
              const filePath = langConfig.file || `translations/${lang.toLowerCase()}.json`;
              await this.core.lang.loadTranslations(modName, lang.toUpperCase(), filePath);
            }
          }
        }
        this.processed.language = true;
      } catch (/** @type {any} */e) {
        this.core.log(`语言配置处理失败: ${e.message}`, 'ERROR');
      }
    }

    async #processAudio() {
      if (this.processed.audio || this.queue.audio.length === 0) return;
      try {
        for (const task of this.queue.audio) {
          const { modName, modZip, config } = task;
          if (config === true) {
            this.core.log(`为${modName}导入音频（默认路径）`, 'DEBUG');
            await this.core.audio.importAllAudio(modName);
          } else if (Array.isArray(config)) {
            for (const path of config) {
              this.core.log(`为${modName}导入音频（路径: ${path}）`, 'DEBUG');
              await this.core.audio.importAllAudio(modName, path);
            }
          }
        }
        this.processed.audio = true;
      } catch (/** @type {any} */e) {
        this.core.log(`音频配置处理失败: ${e.message}`, 'ERROR');
      }
    }

    async #processFramework() {
      if (this.processed.framework || this.queue.framework.length === 0) return;
      try {
        for (const task of this.queue.framework) {
          const { modName, config } = task;
          const configs = Array.isArray(config) ? config : [config];
          for (const singleConfig of configs) {
            if (singleConfig.traits) {
              this.#handleTraits(modName, singleConfig.traits);
            } else if (singleConfig.addto && singleConfig.widget) {
              this.#addWidgetWithConditions(modName, singleConfig.addto, singleConfig.widget);
            } else {
              this.core.log(`模块 ${modName} 的框架配置格式无效: ${JSON.stringify(singleConfig)}`, 'WARN');
            }
          }
        }
        this.processed.framework = true;
      } catch (/** @type {any} */e) {
        this.core.log(`框架配置处理失败: ${e.message}`, 'ERROR');
      }
    }

    /** @param {string} modName 模块名称 @param {string|object} zone 目标区域 @param {string|Object<string, {widget: string,exclude: string[], match: RegExp, passage: string[]}>} widget 部件配置 */
    #addWidgetWithConditions(modName, zone, widget) {
      if (typeof widget === 'string') {
        this.core.log(`为Mod ${modName}添加部件到区域: ${zone} (${widget})`, 'DEBUG');
        this.core.tool.framework.addTo(zone, widget);
      } else if (typeof widget === 'object' && widget.widget) {
        const widgetObj = {
          widget: widget.widget,
          exclude: widget.exclude,
          match: widget.match,
          passage: widget.passage
        };
        this.core.tool.framework.addTo(zone, widgetObj);
      } else {
        this.core.log(`无效的部件配置: ${JSON.stringify(widget)}`, 'WARN');
      }
    }

    /** 
     * 处理特质配置
     * @param {string} modName 模块名称
     * @param {Array<any>} traitsConfig 特质配置数组
     */
    #handleTraits(modName, traitsConfig) {
      if (!traitsConfig || !Array.isArray(traitsConfig) || traitsConfig.length === 0) {
        this.core.log(`模块 ${modName} 的特质配置无效或为空`, 'DEBUG');
        return;
      }
      traitsConfig.forEach(trait => this.#addTrait(trait));
    }

    /** @param {{ title: string|Function; name: string|Function; colour: string|Function; has: boolean|Function; text: string|Function; }} traitConfig */
    #addTrait(traitConfig) {
      const { title, name, colour, has, text } = traitConfig;
      if (!title || !name) { this.core.log(`无效的特质配置: ${JSON.stringify(traitConfig)}`, 'WARN'); return;}
      let hasCondition;
      if (typeof has === 'string') {
        try {
          hasCondition = new Function(`return ${has};`);
        } catch (e) {
          this.core.log(`无效的 has 条件表达式: ${has}`, 'ERROR');
          hasCondition = () => false;
        }
      } else {
        const hasValue = has || false;
        hasCondition = () => hasValue;
      }
      const trait = {
        title: title,
        name: name,
        colour: colour || '',
        has: hasCondition,
        text: text || ''
      };
      this.core.tool.other.addTraits(trait);
    }

    async #processNpc() {
      if (this.processed.npc || this.queue.npc.length === 0) return;
      try {
        for (const task of this.queue.npc) {
          const { config } = task;
          if (!Array.isArray(config)) {
            this.core.log(`NPC 配置必须为数组格式，跳过处理`, 'WARN');
            continue;
          }
          config.forEach(npcConfig => {
            if (!npcConfig || typeof npcConfig !== 'object') return;
            if (npcConfig.data) this.core.npc.add(npcConfig.data);
            if (npcConfig.state) this.core.npc.addStats(npcConfig.state);
          });
        }
        this.processed.npc = true;
      } catch (/** @type {any} */e) {
        this.core.log(`NPC 配置处理失败: ${e.message}`, 'ERROR');
      }
    }

    async #processShop() {
      if (this.processed.shop || this.queue.shop.length === 0) return;
      try {
        for (const task of this.queue.shop) {
          const { modName, modZip, config } = task;
          if (Array.isArray(config)) {
            for (const filePath of config) {
              this.core.log(`为${modName}加载商店配置: ${filePath}`, 'DEBUG');
              await this.core.shop.loadShopFromJson(modName, filePath);
            }
          } else {
            this.logger.error(`无效的商店配置: ${JSON.stringify(config)}`);
          }
        }
        this.processed.shop = true;
      } catch (/** @type {any} */e) {
        this.core.log(`商店配置处理失败: ${e.message}`, 'ERROR');
      }
    }

    async #processNpcSidebar() {
      if (this.processed.npcSidebar || this.queue.npcSidebar.length === 0) return;
      try {
        /** @type {Object<string,Set<string>>} */
        const npcDisplay = {};
        for (const task of this.queue.npcSidebar) {
          const { modName, modZip, config } = task;
          if (!Array.isArray(config)) continue;
          /** @type {string[]} */
          const modImages = [];
          config.forEach(npcSidebar => {
            const npcName = this.core.tool.convert(npcSidebar.name, 'capitalize');
            if (!npcName) return;
            if (!npcDisplay[npcName]) npcDisplay[npcName] = new Set();
            npcSidebar.imgFile.forEach((/** @type {string} */imgPath) => {
              const extractFileName = (/** @type {string} */path) => {
                if (!path) return null;
                const baseName = /** @type {string} */(path.split('/').pop());
                return baseName.split('.')[0];
              };
              const fileName = extractFileName(imgPath);
              if (fileName) {
                npcDisplay[npcName].add(fileName);
                modImages.push(imgPath);
              }
            });
          });
          if (modImages.length > 0) await this.#injectBSAImages(modName, modZip, modImages);
        }
        this.core.npc.Sidebar.display = npcDisplay;
        this.processed.npcSidebar = true;
      } catch (/** @type {any} */e) {
        this.core.log(`npcSidebar 处理失败: ${e.message}`, 'ERROR');
      }
    }

    /** @param {string} modName @param {any} modZip @param {string[]} imgPaths */
    async #injectBSAImages(modName, modZip, imgPaths) {
      try {
        const imgs = [];
        for (const imgPath of imgPaths) {
          try {
            if (typeof imgPath !== 'string') continue;
            const file = modZip.zip.file(imgPath);
            if (!file) { this.core.log(`图片未找到: ${imgPath} (模组: ${modName})`, 'WARN'); continue; }
            const base64Data = await file.async('base64');
            const mimeType = {
              png: 'image/png',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              gif: 'image/gif',
              webp: 'image/webp',
              svg: 'image/svg+xml'
            }[/** @type {string} */(imgPath.split('.').pop()?.toLowerCase())] || 'image/png';
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            imgs.push({ path: imgPath, getter: { getBase64Image: async () => dataUrl, invalid: false } });
          } catch (/** @type {any} */e) {
            this.core.log(`加载图片失败: ${imgPath} - ${e.message}`, 'WARN');
          }
        }
        if (imgs.length === 0) return;
        await addonBeautySelectorAddon.registerMod(
          'BeautySelectorAddon',
          {
            name: 'maplebirch',
            bootJson: {
              addonPlugin: [
                {
                  modName: 'BeautySelectorAddon',
                  addonName: 'BeautySelectorAddon',
                  params: { type: `npc-sidebar-[${modName}]` }
                }
              ]
            },
            imgs: imgs
          },
          modZip
        );
        this.core.log(`成功注册 ${modName} 的 ${imgs.length} 个 NPC 侧边栏图片`, 'DEBUG');
      } catch (/** @type {any} */e) {
        this.core.log(`注册 ${modName} 的 NPC 侧边栏图片失败: ${e.message}`, 'ERROR');
      }
    }
  }

  maplebirch.addonPlugin = new MaplebirchFrameworkAddon(maplebirch, modSC2DataManager, modUtils);
})();