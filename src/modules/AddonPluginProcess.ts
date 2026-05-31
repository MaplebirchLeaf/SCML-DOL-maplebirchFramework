// ./src/modules/AddonPluginProcess.ts

import type AddonPlugin from './AddonPlugin';
import { Languages, type LanguageCode } from '../constants';
import type { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';
import type { TraitConfig } from './Frameworks/OtherTools/Traits';
import type { BodywritingConfig } from './Frameworks/OtherTools/Bodywriting';
import type { FoodstuffConfig } from './Frameworks/OtherTools/Foodstuff';
import type { AntiqueConfig } from './Frameworks/OtherTools/Antiques';
import type { ZoneWidgetConfig } from './Frameworks/zonesManager';

type ConfigFileSource = string | string[];
type KeyedConfig<T> = T & { key?: string };
type TraitConfigSource = TraitConfig[] | ConfigFileSource;
type BodywritingConfigSource = KeyedConfig<BodywritingConfig>[] | Record<string, BodywritingConfig> | ConfigFileSource;
type FoodstuffConfigSource = KeyedConfig<FoodstuffConfig>[] | Record<string, FoodstuffConfig> | ConfigFileSource;
type AntiquesConfigSource = KeyedConfig<AntiqueConfig>[] | Record<string, AntiqueConfig> | ConfigFileSource;
type FrameworkWidgetConfig = string | ZoneWidgetConfig | [number, string | ZoneWidgetConfig];

export type LanguageConfig = string[] | Partial<Record<string, string | { file: string }>>;
export type AudioConfig = string[];
export type FrameworkConfig =
  | { traits: TraitConfigSource }
  | { bodywriting: BodywritingConfigSource }
  | { foodstuff: FoodstuffConfigSource }
  | { antiques: AntiquesConfigSource }
  | { addto: string; widget: FrameworkWidgetConfig };

export interface Task<T = any> {
  modName: string;
  config: T;
  modZip?: ModZipReader;
}

class AddonPluginProcess {
  public static async Language(addon: AddonPlugin): Promise<void> {
    if (addon.processed.language || addon.queue.language.length === 0) return;
    try {
      for (const task of addon.queue.language as Task<LanguageConfig>[]) {
        const { modName, config } = task;
        if (Array.isArray(config)) {
          const languages = config.map(lang => (typeof lang === 'string' ? lang.toUpperCase() : '')).filter((lang): lang is LanguageCode => (Languages as readonly string[]).includes(lang));

          if (languages.length === 0) {
            addon.core.log(`${modName} 的语言配置为空或无效`, 'WARN');
            continue;
          }

          addon.core.log(`为 ${modName} 导入语言: ${languages.join(', ')}`, 'DEBUG');
          for await (const progress of addon.core.lang.import(modName, languages)) if (progress.type === 'error') addon.core.log(`导入失败: ${progress.language}`, 'ERROR');
          continue;
        }

        if (!config || typeof config !== 'object') {
          addon.core.log(`${modName} 的语言配置格式无效`, 'WARN');
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

  public static async Audio(addon: AddonPlugin): Promise<void> {
    if (addon.processed.audio || addon.queue.audio.length === 0) return;
    try {
      for (const task of addon.queue.audio as Task<AudioConfig>[]) {
        const { modName, config } = task;

        if (!Array.isArray(config) || config.length === 0) {
          addon.core.log(`${modName} 的音频配置为空或无效`, 'WARN');
          continue;
        }

        for (const rawFolder of config as unknown[]) {
          if (typeof rawFolder !== 'string' || !rawFolder.trim()) {
            addon.core.log(`${modName} 的音频目录无效: ${typeof rawFolder}`, 'WARN');
            continue;
          }

          const folder = rawFolder
            .trim()
            .replace(/\\/g, '/')
            .replace(/^\/+|\/+$/g, '');

          if (!folder) {
            addon.core.log(`${modName} 的音频目录为空`, 'WARN');
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

  public static async Framework(addon: AddonPlugin): Promise<void> {
    if (addon.processed.framework || addon.queue.framework.length === 0) return;
    try {
      for (const task of addon.queue.framework as Task<FrameworkConfig | FrameworkConfig[]>[]) {
        const { modName, config } = task;
        const configs = Array.isArray(config) ? config : [config];

        for (const item of configs) {
          if (!item || typeof item !== 'object') {
            addon.core.log(`${modName} 的框架配置格式无效: ${JSON.stringify(item)}`, 'WARN');
            continue;
          }

          if ('traits' in item) {
            const traits = await AddonPluginProcess.loadFrameworkConfig(addon, task, item.traits);
            if (!Array.isArray(traits) || traits.length === 0) {
              addon.core.log(`${modName} 的 traits 配置为空或无效`, 'WARN');
              continue;
            }
            for (const trait of traits) AddonPluginProcess.addTraitConfig(addon, trait);
            continue;
          }

          if ('bodywriting' in item) {
            await AddonPluginProcess.addKeyedFrameworkConfig(addon, task, 'bodywriting', item.bodywriting, addon.core.tool.patch.addBodywriting);
            continue;
          }

          if ('foodstuff' in item) {
            await AddonPluginProcess.addKeyedFrameworkConfig(addon, task, 'foodstuff', item.foodstuff, addon.core.tool.patch.addFoodstuff);
            continue;
          }

          if ('antiques' in item) {
            await AddonPluginProcess.addKeyedFrameworkConfig(addon, task, 'antiques', item.antiques, addon.core.tool.patch.addAntiques);
            continue;
          }

          if ('addto' in item && 'widget' in item) {
            AddonPluginProcess.addFrameworkWidget(addon, modName, item.addto, item.widget);
            continue;
          }

          addon.core.log(`${modName} 的框架配置格式无效: ${JSON.stringify(item)}`, 'WARN');
        }
      }
      addon.processed.framework = true;
    } catch (error: any) {
      addon.core.log(`框架配置处理失败: ${error?.message || error}`, 'ERROR');
    }
  }

  public static async NPC(addon: AddonPlugin): Promise<void> {
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
        if (imagePaths.length > 0) await AddonPluginProcess.injectBSAImages(addon, modName, modZip, imagePaths);
      }
      addon.processed.npc = true;
    } catch (error: any) {
      addon.core.log(`NPC 配置处理失败: ${error?.message || error}`, 'ERROR');
    }
  }

  private static async loadFrameworkConfig(addon: AddonPlugin, task: Task, source: unknown): Promise<any> {
    const isFileSource = typeof source === 'string' || (Array.isArray(source) && source.every(item => typeof item === 'string'));
    if (!isFileSource) return source;

    const files = Array.isArray(source) ? source : [source];
    const result: unknown[] = [];

    for (const Path of files) {
      const filePath = Path.trim().replace(/\\/g, '/');
      const file = task.modZip?.zip.file(filePath);
      if (!file) continue;

      try {
        const content = await file.async('string');
        let data: unknown = null;
        if (/\.json$/i.test(filePath)) {
          data = JSON.parse(content);
        } else if (/\.ya?ml$/i.test(filePath)) {
          data = addon.core.yaml.load(content);
        } else {
          addon.core.log(`不支持的配置文件类型: ${filePath}`, 'WARN');
          continue;
        }

        if (Array.isArray(data)) result.push(...data);
        else if (data && typeof data === 'object') result.push(data);
      } catch (error: any) {
        addon.core.log(`解析配置文件失败: ${filePath} (${task.modName}) - ${error?.message || error}`, 'ERROR');
      }
    }

    return files.length === 1 && result.length === 1 ? result[0] : result;
  }

  private static addTraitConfig(addon: AddonPlugin, trait: TraitConfig): void {
    const { title, name, colour, has, text } = trait;
    if (!title || !name) {
      addon.core.log(`无效的特质配置: ${JSON.stringify(trait)}`, 'WARN');
      return;
    }

    let value: boolean | (() => boolean);
    if (typeof has === 'string') {
      try {
        const fn = new Function(`return (${has});`);
        value = () => Boolean(fn());
      } catch {
        addon.core.log(`无效的 has 条件表达式: ${has}`, 'ERROR');
        value = false;
      }
    } else {
      value = has ?? false;
    }

    addon.core.tool.patch.addTraits({
      title,
      name,
      colour: colour ?? '',
      has: value,
      text: text ?? ''
    });
  }

  private static async addKeyedFrameworkConfig<T>(
    addon: AddonPlugin,
    task: Task,
    label: string,
    source: KeyedConfig<T>[] | Record<string, T> | ConfigFileSource,
    add: (key: string, config: T) => void
  ): Promise<void> {
    const data = await AddonPluginProcess.loadFrameworkConfig(addon, task, source);
    let added = 0;

    if (Array.isArray(data)) {
      for (const config of data as KeyedConfig<T>[]) {
        if (!config?.key) continue;
        add(config.key, config);
        added++;
      }
    } else if (data && typeof data === 'object') {
      for (const [key, config] of Object.entries(data as Record<string, T>)) {
        add(key, config);
        added++;
      }
    }

    if (added === 0) addon.core.log(`${task.modName} 的 ${label} 配置为空或无效`, 'WARN');
  }

  private static addFrameworkWidget(addon: AddonPlugin, modName: string, zone: string, widget: FrameworkWidgetConfig): void {
    if (!zone || typeof zone !== 'string') {
      addon.core.log(`${modName} 的区域配置无效: ${String(zone)}`, 'WARN');
      return;
    }

    if (typeof widget === 'string' || Array.isArray(widget) || (widget && typeof widget === 'object' && widget.widget)) {
      addon.core.log(`为 ${modName} 添加部件到区域: ${zone}`, 'DEBUG');
      addon.core.tool.zone.addTo(zone, widget);
      return;
    }

    addon.core.log(`${modName} 的部件配置无效: ${JSON.stringify(widget)}`, 'WARN');
  }

  private static async injectBSAImages(addon: AddonPlugin, modName: string, modZip: ModZipReader, imgPaths: string[]): Promise<void> {
    try {
      const imagePaths: string[] = [];
      for (const imgPath of imgPaths) {
        try {
          if (typeof imgPath !== 'string') continue;
          const file = modZip.zip.file(imgPath);
          if (!file) {
            addon.core.log(`图片未找到: ${imgPath} (模组: ${modName})`, 'WARN');
            continue;
          }
          imagePaths.push(imgPath);
        } catch (error: any) {
          addon.core.log(`加载图片失败: ${imgPath} - ${error?.message || error}`, 'WARN');
        }
      }
      if (imagePaths.length === 0) return;
      const modInfo = modZip.modInfo!;
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
      params.type = `npc-sidebar:${modName}`;
      params.imgFileList = imagePaths;
      plugin.params = params;
      await window.addonBeautySelectorAddon.registerMod('BeautySelectorAddon', modInfo, modZip);
      addon.core.log(`成功注册 ${modName} 的 ${imagePaths.length} 个 NPC 侧边栏图片`, 'DEBUG');
    } catch (error: any) {
      addon.core.log(`注册 ${modName} 的 NPC 侧边栏图片失败: ${error?.message || error}`, 'ERROR');
    }
  }
}

export function defineTwineAsset(type: 'script' | 'style', name: string, content: string) {
  const story = document.getElementsByTagName('tw-storydata')[0];
  if (!story) return;
  const node = story.getElementsByTagName(type)[0];
  if (!node) return;
  const text = node.textContent || '';
  if (text.includes(`"${name}"`)) return;
  const kind = type === 'script' ? 'twine-user-script' : 'twine-user-stylesheet';
  const re = new RegExp(`/\\* ${kind} #(\\d+): "([^'"]+)" \\*/`, 'g');
  let maxId = 0;
  for (const m of text.matchAll(re)) {
    const id = Number(m[1]);
    if (Number.isSafeInteger(id) && id > maxId) maxId = id;
  }
  node.textContent = `${text}\n/* ${kind} #${maxId + 1}: "${name}" */\n${content}`;
}

export default AddonPluginProcess;
