import type { TypeOrderItem } from '@scml/types/AddonMod_BeautySelector/BeautySelectorAddonType';
import type { MaplebirchCore } from '../../core';
import dol from '../../host/DoL';
import type { Replacement } from '../../host/ModLoader';
import type AddonPlugin from '../../services/AddonPlugin';
import { patchTimeConstantsAsset, patchDateTimeAsset } from '../TimeStateWeather/DateTime';
import { patchTimeAsset } from '../TimeStateWeather/Time';
import ImageLoader from '../Frameworks/ImageLoader';

export default class DoLIntegration {
  public constructor(private readonly core: MaplebirchCore) {}

  public install(): void {
    Object.defineProperty(window, 'loadImage', { value: ImageLoader.load, enumerable: true, writable: false, configurable: false });
    const addon = this.core.services.addonPlugin;
    addon.excludedMods.add('Simple Frameworks');
    addon.blockedPassages.add('Downgrade Waiting Room');
    this.configureBeautySelector();
    const events = this.core.infra.events;
    events.on(':addon:afterEarlyLoad', () => this.filterOriginalImagePack());
    events.on(':addon:preparePatch', () => this.preparePatch(addon));
    events.on(':addon:beforePatch', () => this.core.tool.zone.patchModToGame(addon, 'before'));
    events.on(':addon:patchStart', () => this.patchTimeScripts());
    events.on(':addon:afterPatch', () => this.core.tool.zone.patchModToGame(addon, 'after'));
    events.on(':addon:afterPreload', () => this.preloadFaceStyles());
  }

  private filterOriginalImagePack(): void {
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

  private preparePatch(addon: AddonPlugin): void {
    const tasks: Array<[string, () => void]> = [
      ['modifyOptionsDateFormat', () => this.modifyOptionsDateFormat(addon)],
      ['modifyWeatherJavaScript', () => this.core.dynamic.Weather.modifyWeatherJavaScript(addon)],
      ['modifyCanvasModel', () => this.core.char.modifyCanvasModel(addon)],
      ['modifyFaceStyle', () => this.core.char.modifyFaceStyle(addon)],
      ['modifyEffect', () => this.core.char.transformation.modifyEffect(addon)]
    ];
    for (const [name, task] of tasks) {
      try {
        task();
      } catch (error) {
        addon.write(`${name} 出错`, 'ERROR', 'dol', error);
      }
    }
  }

  private patchTimeScripts(): void {
    const loader = this.core.host.modLoader;
    loader.defineTwineAsset('script', 'game\\00-framework-tools\\10-time\\00-time-constants.js', patchTimeConstantsAsset, 'patch');
    loader.defineTwineAsset('script', 'game\\00-framework-tools\\10-time\\datetime.js', patchDateTimeAsset, 'patch');
    loader.defineTwineAsset('script', 'game\\03-JavaScript\\time.js', patchTimeAsset, 'patch');
  }

  private preloadFaceStyles(): void {
    const modUtils = this.core.modUtils;
    for (const modName of modUtils.getModListNameNoAlias()) {
      if (modName === 'ModI18N') continue;
      try {
        const files = modUtils.getModZip(modName)?.zip?.files;
        if (files) this.core.char.faceStyleImagePaths(files);
      } catch (error) {
        this.core.log(`读取 ${modName} 的人像文件失败`, 'WARN', error);
        continue;
      }
    }
  }

  private configureBeautySelector(): void {
    const selector = window.addonBeautySelectorAddon;
    if (!selector) return;
    let order: TypeOrderItem[] = selector.typeOrderUsed!;
    Object.defineProperty(selector, 'typeOrderUsed', {
      get() {
        return order;
      },
      set(value: TypeOrderItem[]) {
        order = value;
        if (dol.temporary?.modelclass) {
          dol.renderer.clearCaches(dol.temporary.modelclass);
          $.wiki('<<updatesidebarimg>>');
        }
      }
    });
  }

  private modifyOptionsDateFormat(addon: AddonPlugin): void {
    const modUtils = this.core.modUtils;
    const oldSCdata = this.core.host.modLoader.modSC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const passageData = SCdata.passageDataItems.map;
    const passageTitle = 'Options Overlay';
    const passage = passageData.get(passageTitle);
    if (!passage) {
      addon.recordPatch({ kind: 'passage', target: passageTitle, index: 0, pattern: 'dateFormat', matches: 0, applied: 0, status: 'missing' });
      addon.log(`日期格式补丁目标不存在: ${passageTitle}`, 'WARN');
      return;
    }
    const hasI18N = modUtils.getModListNameNoAlias().includes('ModI18N');
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
    passage.content = addon.replace(passage.content, replacements, 'Options Overlay dateFormat');
    passageData.set(passageTitle, passage);
    SCdata.passageDataItems.back2Array();
    modUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
  }
}
