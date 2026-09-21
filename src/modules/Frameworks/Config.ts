// ./src/modules/Frameworks/Config.ts

import { errorMessage } from '../../utils/error';
import type { MaplebirchCore } from '../../core';
import type { BootTask } from '../AddonPlugin';
import type { zonesManager, ZoneWidgetConfig } from './ZonesManager';
import type { Patches } from './Patches';
import type { TraitConfig } from './Patches/Traits';
import type { BodywritingConfig } from './Patches/Bodywriting';
import type { FoodstuffConfig } from './Patches/Foodstuff';
import type { AntiqueConfig } from './Patches/Antiques';
import type { FishConfig, FishingLocation } from './Patches/Fishing';
import { isKey, isRecord } from './Patches/config';

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
type TipsConfigSource = string[] | Record<string, string[]> | ConfigFileSource;
type FrameworkWidgetConfig = string | ZoneWidgetConfig | [number, string | ZoneWidgetConfig];
export interface FrameworkConfig {
  traits?: TraitConfigSource;
  bodywriting?: BodywritingConfigSource;
  foodstuff?: FoodstuffConfigSource;
  antiques?: AntiquesConfigSource;
  tips?: TipsConfigSource;
  fish?: KeyedConfig<FishConfig>[] | Record<string, FishConfig> | ConfigFileSource;
  bait?: FoodstuffConfigSource;
  fishingLocations?: Partial<Record<FishingLocation, Record<string, number>>> | ConfigFileSource;
  addto?: string;
  widget?: FrameworkWidgetConfig;
}

type ConfigHandler = (modName: string, source: unknown) => void;

export default class FrameworkConfigLoader {
  private readonly handlers: Readonly<Record<string, ConfigHandler>>;

  public constructor(
    private readonly core: MaplebirchCore,
    private readonly patch: Patches,
    private readonly zone: zonesManager
  ) {
    const { bodywriting, foodstuff, antiques, fishing } = patch;
    this.handlers = {
      traits: (name, source) => {
        if (!Array.isArray(source)) throw new Error('traits 配置必须为数组');
        for (const trait of source) this.addTrait(name, trait);
      },
      bodywriting: (name, source) => this.addKeyedConfig(name, 'bodywriting', source, bodywriting.add),
      foodstuff: (name, source) => this.addKeyedConfig(name, 'foodstuff', source, foodstuff.add),
      antiques: (name, source) => this.addKeyedConfig(name, 'antiques', source, antiques.add),
      fish: (name, source) => this.addKeyedConfig(name, 'fish', source, fishing.add),
      bait: (name, source) => this.addKeyedConfig(name, 'bait', source, fishing.addBait),
      fishingLocations: (name, source) => {
        if (!isRecord(source)) throw new Error('fishingLocations 配置必须为对象');
        for (const [location, weights] of Object.entries(source)) {
          if (!isRecord(weights) || !Object.values(weights).every(weight => typeof weight === 'number') || !fishing.configure(location as FishingLocation, weights as Record<string, number>)) {
            this.core.log(`${name} 的钓点配置无效: ${location}`, 'WARN');
          }
        }
      },
      tips: (name, source) => this.addTips(name, source)
    };
  }

  public async apply(task: BootTask<FrameworkConfig | FrameworkConfig[]>): Promise<void> {
    const configs = Array.isArray(task.config) ? task.config : [task.config];
    for (const config of configs) {
      if (!isRecord(config)) {
        this.core.log(`${task.modName} 的 framework 配置格式无效`, 'WARN');
        continue;
      }
      if (typeof config.addto === 'string' && config.widget !== undefined) this.zone.addTo(config.addto, config.widget as FrameworkWidgetConfig);
      for (const [key, source] of Object.entries(config)) {
        if (key === 'addto' || key === 'widget') continue;
        const handler = Object.hasOwn(this.handlers, key) ? this.handlers[key] : undefined;
        if (!handler) {
          this.core.log(`${task.modName} 的 framework 配置类型未知: ${key}`, 'WARN');
          continue;
        }
        for (const data of await this.loadSources(task, source, key === 'tips')) {
          try {
            handler(task.modName, data);
          } catch (error) {
            this.core.log(`${task.modName} 的 ${key} 配置失败: ${errorMessage(error)}`, 'ERROR');
          }
        }
      }
    }
  }

  private async loadSources(task: BootTask, source: unknown, inlineStrings: boolean): Promise<unknown[]> {
    const fileArray = Array.isArray(source) && source.length > 0 && source.every(value => typeof value === 'string' && (!inlineStrings || /\.(?:json|ya?ml)$/i.test(value)));
    if (typeof source !== 'string' && !fileArray) return [source];
    const paths = typeof source === 'string' ? [source] : (source as string[]);
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
        if (/\.json$/i.test(filePath)) result.push(JSON.parse(content));
        else if (/\.ya?ml$/i.test(filePath)) result.push(this.core.yaml.load(content));
        else this.core.log(`不支持的配置文件类型: ${filePath}`, 'WARN');
      } catch (error) {
        this.core.log(`解析配置文件失败: ${filePath} (${task.modName}) - ${errorMessage(error)}`, 'ERROR');
      }
    }
    return result;
  }

  private addTrait(modName: string, source: unknown): void {
    if (!isRecord(source)) {
      this.core.log(`${modName} 的 trait 配置无效`, 'WARN');
      return;
    }
    const trait = source;
    if (typeof trait.title !== 'string' || !trait.title || typeof trait.name !== 'string' || !trait.name) {
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
      has = typeof trait.has === 'boolean' ? trait.has : false;
    }
    const config: Partial<TraitConfig> = {
      title: trait.title,
      name: trait.name,
      colour: typeof trait.colour === 'string' ? trait.colour : '',
      has,
      text: typeof trait.text === 'string' ? trait.text : ''
    };
    this.patch.traits.add(config);
  }

  private addKeyedConfig<T extends object>(modName: string, label: string, source: unknown, add: (key: string, config: T) => void | boolean): void {
    const entries: [unknown, unknown][] = Array.isArray(source) ? source.map(item => [isRecord(item) ? item.key : undefined, item]) : isRecord(source) ? Object.entries(source) : [];
    if (entries.length === 0) this.core.log(`${modName} 的 ${label} 配置为空或无效`, 'WARN');
    for (const [key, config] of entries) {
      if (!isKey(key) || !isRecord(config)) {
        this.core.log(`${modName} 的 ${label} 条目格式无效: ${String(key)}`, 'WARN');
        continue;
      }
      if (add(key, config as T) === false) this.core.log(`${modName} 的 ${label} 条目无效: ${key}`, 'WARN');
    }
  }

  private addTips(modName: string, source: unknown): void {
    let added = 0;
    if (Array.isArray(source)) {
      const tips = source.filter((tip): tip is string => typeof tip === 'string' && Boolean(tip.trim()));
      this.patch.tips.add('general', ...tips);
      added += tips.length;
    } else if (source && typeof source === 'object') {
      for (const [category, value] of Object.entries(source)) {
        if (!category.trim() || !Array.isArray(value)) continue;
        const tips = value.filter((tip): tip is string => typeof tip === 'string' && Boolean(tip.trim()));
        this.patch.tips.add(category, ...tips);
        added += tips.length;
      }
    }
    if (!added) this.core.log(`${modName} 的 tips 配置为空或无效`, 'WARN');
  }
}
