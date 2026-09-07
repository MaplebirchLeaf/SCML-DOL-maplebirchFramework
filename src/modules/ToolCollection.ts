// ./src/modules/ToolCollection.ts

import maplebirch, { type MaplebirchCore, createlog } from '../core';
import type { BootTask } from './AddonPlugin';
import Console from './Frameworks/ConsoleCheat';
import migration from './Frameworks/migration';
import randSystem from './Frameworks/RandSystem';
import defineMacros from './Frameworks/macros';
import htmlTools from './Frameworks/HtmlTools';
import { zonesManager, type InitFunction, type ZoneWidgetConfig } from './Frameworks/ZonesManager';
import applyLinkZone from './Frameworks/ApplyLinkZone';
import Patch from './Frameworks/patch';
import type { TraitConfig } from './Frameworks/OtherTools/Traits';
import type { BodywritingConfig } from './Frameworks/OtherTools/Bodywriting';
import type { FoodstuffConfig } from './Frameworks/OtherTools/Foodstuff';
import type { AntiqueConfig } from './Frameworks/OtherTools/Antiques';

type ConfigFileSource = string | string[];

type KeyedConfig<T> = T & { key?: string };

interface TraitBootConfig {
  title?: string;
  name?: string;
  colour?: string;
  has?: boolean | string;
  text?: string;
}

type TraitConfigSource = TraitBootConfig[] | ConfigFileSource;
type BodywritingConfigSource = KeyedConfig<BodywritingConfig>[] | Record<string, BodywritingConfig> | ConfigFileSource;
type FoodstuffConfigSource = KeyedConfig<FoodstuffConfig>[] | Record<string, FoodstuffConfig> | ConfigFileSource;
type AntiquesConfigSource = KeyedConfig<AntiqueConfig>[] | Record<string, AntiqueConfig> | ConfigFileSource;
type FrameworkWidgetConfig = string | ZoneWidgetConfig | [number, string | ZoneWidgetConfig];
type FrameworkConfig =
  | { traits: TraitConfigSource }
  | { bodywriting: BodywritingConfigSource }
  | { foodstuff: FoodstuffConfigSource }
  | { antiques: AntiquesConfigSource }
  | { addto: string; widget: FrameworkWidgetConfig };

class ToolCollection {
  public readonly console: Console;
  public readonly migration: typeof migration;
  public readonly rand: typeof randSystem;
  public readonly macro: defineMacros;
  public readonly text: htmlTools;
  public readonly zone: zonesManager;
  public readonly link: typeof applyLinkZone;
  public readonly patch: typeof Patch;
  public readonly createlog: typeof createlog = createlog;

  public constructor(readonly core: MaplebirchCore) {
    this.console = Object.seal(new Console(this));
    this.migration = Object.freeze(migration);
    this.rand = Object.freeze(randSystem);
    this.macro = Object.freeze(new defineMacros(this));
    this.text = Object.seal(new htmlTools(this));
    this.zone = Object.seal(new zonesManager(this));
    this.link = Object.freeze(applyLinkZone);
    this.patch = Object.seal(Patch);
    this.core.addon.hook<FrameworkConfig | FrameworkConfig[]>('framework', task => this.config(task));
  }

  public onInit(...widgets: InitFunction[]): void {
    this.zone.onInit(...widgets);
  }

  public addTo(zone: string, ...widgets: (string | Function | ZoneWidgetConfig | [number, string | ZoneWidgetConfig])[]): void {
    this.zone.addTo(zone, ...widgets);
  }

  public preInit(): void {
    this.onInit(() => {
      this.patch.applyLocation();
      this.patch.applyBodywriting();
    });
  }

  private async config(task: BootTask<FrameworkConfig | FrameworkConfig[]>): Promise<void> {
    const configs = Array.isArray(task.config) ? task.config : [task.config];
    for (const config of configs) {
      if (!config || typeof config !== 'object') {
        this.core.log(`${task.modName} 的 framework 配置格式无效`, 'WARN');
        continue;
      }
      if ('traits' in config) {
        const data = await this.loadConfig(task, config.traits);
        if (!Array.isArray(data)) {
          this.core.log(`${task.modName} 的 traits 配置为空或无效`, 'WARN');
          continue;
        }
        for (const trait of data) this.addTrait(task.modName, trait);
        continue;
      }

      if ('bodywriting' in config) {
        await this.addKeyedConfig(task, 'bodywriting', config.bodywriting, this.patch.addBodywriting);
        continue;
      }

      if ('foodstuff' in config) {
        await this.addKeyedConfig(task, 'foodstuff', config.foodstuff, this.patch.addFoodstuff);
        continue;
      }

      if ('antiques' in config) {
        await this.addKeyedConfig(task, 'antiques', config.antiques, this.patch.addAntiques);
        continue;
      }

      if ('addto' in config && 'widget' in config) {
        this.zone.addTo(config.addto, config.widget);
        continue;
      }

      this.core.log(`${task.modName} 的 framework 配置格式无效`, 'WARN');
    }
  }

  private async loadConfig(task: BootTask, source: unknown): Promise<unknown> {
    const fileSource = typeof source === 'string' || (Array.isArray(source) && source.every(value => typeof value === 'string'));
    if (!fileSource) return source;
    const paths = typeof source === 'string' ? [source] : source;
    const result: unknown[] = [];
    for (const path of paths) {
      const filePath = path.trim().replace(/\\/g, '/');
      if (!filePath) continue;
      const file = task.modZip.zip.file(filePath);
      if (!file) {
        this.core.log(`配置文件未找到: ${filePath} (${task.modName})`, 'WARN');
        continue;
      }
      try {
        const content = await file.async('string');
        let data: unknown;
        if (/\.json$/i.test(filePath)) {
          data = JSON.parse(content);
        } else if (/\.ya?ml$/i.test(filePath)) {
          data = this.core.yaml.load(content);
        } else {
          this.core.log(`不支持的配置文件类型: ${filePath}`, 'WARN');
          continue;
        }
        result.push(data);
      } catch (error) {
        this.core.log(`解析配置文件失败: ${filePath} (${task.modName}) - ${this.error(error)}`, 'ERROR');
      }
    }
    if (result.length === 1) return result[0];
    if (result.every(Array.isArray)) return result.flat();
    if (result.every(value => value != null && typeof value === 'object' && !Array.isArray(value))) return Object.assign({}, ...result);
    return result.flatMap(value => (Array.isArray(value) ? value : [value]));
  }

  private addTrait(modName: string, source: unknown): void {
    if (!source || typeof source !== 'object') {
      this.core.log(`${modName} 的 trait 配置无效`, 'WARN');
      return;
    }
    const trait = source as TraitBootConfig;
    if (!trait.title || !trait.name) {
      this.core.log(`${modName} 的 trait 缺少 title 或 name`, 'WARN');
      return;
    }
    let has: boolean | (() => boolean) = false;
    if (typeof trait.has === 'string') {
      try {
        const fn = new Function(`return (${trait.has});`) as () => unknown;
        has = () => Boolean(fn());
      } catch {
        this.core.log(`无效的 has 条件表达式: ${trait.has}`, 'ERROR');
      }
    } else {
      has = trait.has ?? false;
    }
    const config: Partial<TraitConfig> = { title: trait.title, name: trait.name, colour: trait.colour ?? '', has, text: trait.text ?? '' };
    this.patch.addTraits(config);
  }

  private async addKeyedConfig<T>(task: BootTask, label: string, source: KeyedConfig<T>[] | Record<string, T> | ConfigFileSource, add: (key: string, config: T) => void): Promise<void> {
    const data = await this.loadConfig(task, source);
    let added = 0;
    if (Array.isArray(data)) {
      for (const item of data) {
        if (!item || typeof item !== 'object') continue;
        const config = item as KeyedConfig<T>;
        if (typeof config.key !== 'string' || !config.key) continue;
        add(config.key, config);
        added++;
      }
    } else if (data && typeof data === 'object') {
      for (const [key, config] of Object.entries(data)) {
        add(key, config as T);
        added++;
      }
    }
    if (!added) this.core.log(`${task.modName} 的 ${label} 配置为空或无效`, 'WARN');
  }

  private error(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

maplebirch.register('tool', Object.seal(new ToolCollection(maplebirch)), ['dynamic']);

export default ToolCollection;
