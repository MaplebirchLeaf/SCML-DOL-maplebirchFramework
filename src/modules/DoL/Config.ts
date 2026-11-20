import jsyaml from 'js-yaml';
import Diagnostics from '../../infra/Diagnostics';
import { compileBooleanExpression } from '../../utils/condition';
import type { MaplebirchCore } from '../../core';
import type { BootTask } from '../../services/AddonPlugin';
import type { ZonesManager, ZoneWidgetConfig } from '../Frameworks/ZonesManager';
import type { Patches } from './Patches';
import type { TraitConfig } from './Patches/Traits';
import type { BodywritingConfig } from './Patches/Bodywriting';
import type { FeatConfig } from './Patches/Feats';
import type { FeatBoostConfig } from './Patches/FeatBoosts';
import type { FoodstuffConfig } from './Patches/Foodstuff';
import type { AntiqueConfig } from './Patches/Antiques';
import type { FishConfig, FishingLocation } from './Patches/Fishing';
import { isKey, isRecord } from './Patches/config';

type ConfigFileSource = string | string[];

type KeyedSource<T> = Array<T & { key?: string }> | Record<string, T> | ConfigFileSource;

interface TraitBootConfig {
  title?: string;
  name?: string;
  colour?: string;
  has?: boolean | string;
  text?: string;
}

type FrameworkWidgetConfig = string | ZoneWidgetConfig | [number, string | ZoneWidgetConfig];

export interface FrameworkConfig {
  traits?: TraitBootConfig[] | ConfigFileSource;
  bodywriting?: KeyedSource<BodywritingConfig>;
  feats?: KeyedSource<FeatConfig>;
  featBoosts?: KeyedSource<FeatBoostConfig>;
  foodstuff?: KeyedSource<FoodstuffConfig>;
  antiques?: KeyedSource<AntiqueConfig>;
  tips?: Record<string, string[]> | ConfigFileSource;
  fish?: KeyedSource<FishConfig>;
  bait?: KeyedSource<FoodstuffConfig>;
  locations?: Partial<Record<FishingLocation, Record<string, number>>> | ConfigFileSource;
  addto?: string;
  widget?: FrameworkWidgetConfig;
}

type ConfigHandler = (modName: string, source: unknown) => void;

class Config {
  private readonly handlers: Readonly<Record<string, ConfigHandler>>;

  public constructor(
    private readonly core: MaplebirchCore,
    private readonly patch: Patches,
    private readonly zone: ZonesManager
  ) {
    const { bodywriting, feats, featBoosts, foodstuff, antiques, fishing } = patch;
    const keyed =
      <T extends object>(label: string, api: { add(key: string, config: T): void | boolean }): ConfigHandler =>
      (name, source) =>
        this.entries(name, label, source, api.add);
    this.handlers = {
      traits: (name, source) => {
        if (!Array.isArray(source)) throw new Error('traits 配置必须为数组');
        for (const trait of source) this.addTrait(name, trait);
      },
      bodywriting: keyed('bodywriting', bodywriting),
      feats: keyed('feats', feats),
      featBoosts: keyed('featBoosts', featBoosts),
      foodstuff: keyed('foodstuff', foodstuff),
      antiques: keyed('antiques', antiques),
      fish: keyed('fish', fishing),
      bait: (name, source) => this.entries(name, 'bait', source, fishing.addBait),
      locations: (name, source) => {
        if (!isRecord(source)) throw new Error('locations 配置必须为对象');
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
        for (const data of await this.read(task, source, key === 'tips')) {
          try {
            handler(task.modName, data);
          } catch (error) {
            this.core.log(`${task.modName} 的 ${key} 配置失败: ${Diagnostics.message(error)}`, 'ERROR');
          }
        }
      }
    }
  }

  private async read(task: BootTask, source: unknown, inlineStrings: boolean): Promise<unknown[]> {
    // 小贴士也可以直接写成字符串数组，有文件扩展名时才按路径数组读取。
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
        else if (/\.ya?ml$/i.test(filePath)) result.push(jsyaml.load(content));
        else this.core.log(`不支持的配置文件类型: ${filePath}`, 'WARN');
      } catch (error) {
        this.core.log(`解析配置文件失败: ${filePath} (${task.modName}) - ${Diagnostics.message(error)}`, 'ERROR');
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
        has = compileBooleanExpression(trait.has);
      } catch (error) {
        this.core.log(`无效的 has 条件表达式: ${trait.has}`, 'ERROR', error);
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

  private entries<T extends object>(modName: string, label: string, source: unknown, add: (key: string, config: T) => void | boolean): void {
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

export default Config;
