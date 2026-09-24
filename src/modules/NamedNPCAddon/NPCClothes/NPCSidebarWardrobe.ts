// ./src/modules/NamedNPCAddon/NPCClothes/NPCSidebarWardrobe.ts

import jsyaml from 'js-yaml';
import Diagnostics from '../../../infra/Diagnostics';
import builtinWardrobe from '../../../assets/npc-clothes.yaml';
import { evaluate, type Condition } from './Condition';
import type NPCManager from '../../NamedNPC';
import { clone } from '../../../utils';
import type { NPCClothesSlot, NPCSidebarClothing } from '../NPCSidebarConfig/types';

type WardrobeClothing = Partial<NPCSidebarClothing>;
type WardrobeItem = Partial<Record<NPCClothesSlot, WardrobeClothing>>;

type WardrobeWetness = 'dry' | 'damp' | 'wet' | 'soaked';
type WardrobeWetnessResolver = WardrobeWetness | (() => WardrobeWetness);

interface WardrobeWearOptions {
  when?: Condition;
  wetness?: WardrobeWetnessResolver;
}

type WardrobeWeightedChoice = readonly [key: string, weight: number];
type WardrobeChoice = string | readonly WardrobeWeightedChoice[];
type WardrobeLayerResolver = string | (() => string);

interface WearRule {
  choice: WardrobeChoice;
  cond?: Condition;
  wetness?: WardrobeWetnessResolver;
}

interface CurrentWearRule {
  key: string;
  wetness?: WardrobeWetnessResolver;
}

interface WetnessRule {
  wetness: WardrobeWetnessResolver;
  cond?: Condition;
}

interface WardrobeProfile {
  locations: Map<string, WearRule[]>;
  global: WearRule[];
  wetness: WetnessRule[];
  baseModifiers: WardrobeModifier[];
  modifiers: WardrobeModifier[];
  active?: WearRule;
  current?: CurrentWearRule;
}

interface WardrobeContext {
  npcName: string;
  location: string;
  key: string;
  wetness: WardrobeWetness;
}

type WardrobeModifier = (clothes: WardrobeItem, context: WardrobeContext) => void;

const alpha: Record<WardrobeWetness, number> = {
  dry: 1,
  damp: 0.9,
  wet: 0.7,
  soaked: 0.5
};

const slots = ['upper', 'lower', 'under_upper', 'under_lower'] as const;

class NPCSidebarWardrobe {
  private readonly templates: Record<string, WardrobeItem> = {};
  private readonly profiles = new Map<string, WardrobeProfile>();

  public constructor(private readonly manager: NPCManager) {}

  public init(): void {
    try {
      const data = jsyaml.load(builtinWardrobe);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('无法解析内置衣柜配置');
      this.add(data as Record<string, WardrobeItem>);
    } catch (e) {
      this.manager.log(`NPCSidebarWardrobe 初始化失败: ${Diagnostics.message(e)}`, 'ERROR');
    }
  }

  public async load(modName: string, filePath: string): Promise<void> {
    try {
      const modZip = this.manager.core.host.modLoader.modUtils.getModZip(modName);
      if (!modZip) throw new Error(`未找到模组: ${modName}`);
      const file = modZip.zip.file(filePath);
      if (!file) throw new Error(`未找到文件: ${filePath}`);
      const content = await file.async('string');
      let data: unknown;
      if (filePath.endsWith('.json')) {
        data = JSON.parse(content);
      } else if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
        data = jsyaml.load(content);
      } else {
        throw new Error(`不支持的文件格式: ${filePath}`);
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('无法解析衣柜配置');
      this.add(data as Record<string, WardrobeItem>);
    } catch (e) {
      this.manager.log(`加载侧边栏衣柜配置失败: ${Diagnostics.message(e)}`, 'ERROR');
    }
  }

  public get(key: string): WardrobeItem | undefined {
    const template = this.templates[key];
    return template ? clone(template) : undefined;
  }

  public set(key: string, template: WardrobeItem): void {
    this.templates[key] = clone(template);
  }

  public has(key: string): boolean {
    return Object.hasOwn(this.templates, key);
  }

  public wear(npcName: string, location: string | readonly string[], choice: WardrobeChoice, options?: Condition | WardrobeWearOptions): void {
    if (typeof choice === 'string') {
      if (choice !== 'naked' && !this.has(choice)) {
        this.manager.log(`侧边栏服装配置 ${choice} 不存在`, 'WARN');
        return;
      }
    } else {
      choice = choice.filter(([key, weight]) => {
        if (!this.has(key)) {
          this.manager.log(`侧边栏服装配置 ${key} 不存在`, 'WARN');
          return false;
        }
        if (!Number.isFinite(weight) || weight <= 0) {
          this.manager.log(`侧边栏服装配置 ${key} 的随机权重无效`, 'WARN');
          return false;
        }
        return true;
      });
      if (choice.length === 0) return;
    }
    const profile = this.profile(npcName);
    const locations = typeof location === 'string' ? [location] : location;
    const rule: WearRule = options != null && typeof options === 'object' && !Array.isArray(options) ? { choice, cond: options.when, wetness: options.wetness } : { choice, cond: options };
    for (const item of locations) {
      const rules = item === '*' ? profile.global : this.location(profile, item);
      rules.push(rule);
    }
  }

  public wet(npcName: string, wetness: WardrobeWetnessResolver, cond?: Condition): void {
    this.profile(npcName).wetness.push({ wetness, cond });
  }

  public layer(npcName: string, source: WardrobeLayerResolver, cond?: Condition): void {
    if (typeof source === 'string' && !this.has(source)) {
      this.manager.log(`侧边栏服装配置 ${source} 不存在`, 'WARN');
      return;
    }
    this.base(npcName, clothes => {
      if (!evaluate(this.manager.core, cond)) return;
      this.put(clothes, typeof source === 'function' ? source() : source);
    });
  }

  public put(clothes: WardrobeItem, key: string): void {
    const template = this.templates[key];
    if (!template) {
      this.manager.log(`侧边栏服装配置 ${key} 不存在`, 'WARN');
      return;
    }
    this.merge(clothes, template);
  }

  public strip(clothes: WardrobeItem, slot: NPCClothesSlot | readonly NPCClothesSlot[]): void {
    const naked = this.templates.naked ?? {};
    for (const key of typeof slot === 'string' ? [slot] : slot) {
      if (naked[key] != null) clothes[key] = clone(naked[key]);
    }
  }

  public base(npcName: string, modifier: WardrobeModifier): void {
    this.profile(npcName).baseModifiers.push(modifier);
  }

  public modify(npcName: string, modifier: WardrobeModifier): void {
    this.profile(npcName).modifiers.push(modifier);
  }

  public worn(npcName: string): WardrobeItem {
    const profile = this.profile(npcName);
    const location = this.manager.Schedule.location[npcName] ?? '';
    const selected = this.select(profile, location);
    if (selected !== profile.active) {
      profile.active = selected;
      if (selected) profile.current = { key: this.choose(selected.choice), wetness: selected.wetness };
    }
    const rule = profile.current ?? { key: 'naked' };
    const wetness = this.resolveWet(this.findWet(profile) ?? rule.wetness);
    const context: WardrobeContext = {
      npcName,
      location,
      key: rule.key,
      wetness
    };
    const clothes = clone(this.templates.naked ?? {});
    this.run(profile.baseModifiers, clothes, context, '基层服装配置');
    if (rule.key !== 'naked') this.merge(clothes, this.templates[rule.key] ?? {});
    this.run(profile.modifiers, clothes, context, '动态服装修改');
    this.applyWet(clothes, wetness);
    return clothes;
  }

  private run(modifiers: WardrobeModifier[], clothes: WardrobeItem, context: WardrobeContext, label: string): void {
    for (const modifier of modifiers) {
      try {
        modifier(clothes, context);
      } catch (e) {
        this.manager.log(`${context.npcName} ${label}失败: ${Diagnostics.message(e)}`, 'WARN');
      }
    }
  }

  private add(data: Record<string, WardrobeItem>): void {
    for (const [key, template] of Object.entries(data)) this.set(key, template);
  }

  private merge(clothes: WardrobeItem, layer: WardrobeItem): void {
    for (const [part, value] of Object.entries(layer)) if (value != null) clothes[part as NPCClothesSlot] = clone(value);
  }

  private select(profile: WardrobeProfile, location: string): WearRule | undefined {
    return this.find(profile.locations.get(location)) ?? this.find(profile.global);
  }

  private find(rules?: WearRule[]): WearRule | undefined {
    if (!rules) return;
    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i];
      if (evaluate(this.manager.core, rule.cond)) return rule;
    }
  }

  private choose(choice: WardrobeChoice): string {
    if (typeof choice === 'string') return choice;
    const total = choice.reduce((sum, [, weight]) => sum + weight, 0);
    let target = Math.random() * total;
    for (const [key, weight] of choice) {
      target -= weight;
      if (target < 0) return key;
    }
    return choice[choice.length - 1][0];
  }

  private findWet(profile: WardrobeProfile): WardrobeWetnessResolver | undefined {
    for (let i = profile.wetness.length - 1; i >= 0; i--) {
      const rule = profile.wetness[i];
      if (evaluate(this.manager.core, rule.cond)) return rule.wetness;
    }
  }

  private resolveWet(source?: WardrobeWetnessResolver): WardrobeWetness {
    try {
      const wetness: unknown = typeof source === 'function' ? source() : (source ?? 'dry');
      if (typeof wetness === 'string' && Object.hasOwn(alpha, wetness)) return wetness as WardrobeWetness;
      this.manager.log(`无效的 NPC 服装湿度: ${String(wetness)}`, 'WARN');
    } catch (e) {
      this.manager.log(`NPC 服装湿度计算失败: ${Diagnostics.message(e)}`, 'WARN');
    }
    return 'dry';
  }

  private applyWet(clothes: WardrobeItem, wetness: WardrobeWetness): void {
    if (wetness === 'dry') return;
    const wetAlpha = alpha[wetness];
    for (const slot of slots) {
      const item = clothes[slot];
      if (!item || item.index === 0 || item.type?.includes('naked')) continue;
      item.alpha = Math.min(typeof item.alpha === 'number' ? item.alpha : 1, wetAlpha);
    }
  }

  private profile(npcName: string): WardrobeProfile {
    let profile = this.profiles.get(npcName);
    if (!profile) {
      profile = {
        locations: new Map(),
        global: [],
        wetness: [],
        baseModifiers: [],
        modifiers: []
      };
      this.profiles.set(npcName, profile);
    }
    return profile;
  }

  private location(profile: WardrobeProfile, location: string): WearRule[] {
    let rules = profile.locations.get(location);
    if (!rules) {
      rules = [];
      profile.locations.set(location, rules);
    }
    return rules;
  }
}

export default NPCSidebarWardrobe;
