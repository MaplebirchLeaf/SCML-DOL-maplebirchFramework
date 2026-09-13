// ./src/modules/NamedNPCAddon/NPCClothes/NPCSidebarWardrobe.ts

import builtinWardrobe from '@/assets/npc-clothes.yaml';
import { evaluate, type Condition } from './Condition';
import type NPCManager from '../../NamedNPC';

export interface WardrobeItem {
  [part: string]: any;
}

interface WearRule {
  key: string;
  cond?: Condition;
}

interface WardrobeProfile {
  locations: Map<string, WearRule[]>;
  global: WearRule[];
  baseModifiers: WardrobeModifier[];
  modifiers: WardrobeModifier[];
}

export interface WardrobeContext {
  npcName: string;
  location: string;
  key: string;
}

export type WardrobeModifier = (clothes: WardrobeItem, context: WardrobeContext) => void;

class NPCSidebarWardrobe {
  private readonly templates: Record<string, WardrobeItem> = {};
  private readonly profiles = new Map<string, WardrobeProfile>();

  public constructor(private readonly manager: NPCManager) {}

  public init(): void {
    try {
      const data = this.manager.core.yaml.load(builtinWardrobe);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('无法解析内置衣柜配置');
      this.add(data as Record<string, WardrobeItem>);
    } catch (e: any) {
      this.manager.log(`NPCSidebarWardrobe 初始化失败: ${e.message}`, 'ERROR');
    }
  }

  public async load(modName: string, filePath: string): Promise<void> {
    try {
      const modZip = this.manager.core.modUtils.getModZip(modName);
      if (!modZip) throw new Error(`未找到模组: ${modName}`);
      const file = modZip.zip.file(filePath);
      if (!file) throw new Error(`未找到文件: ${filePath}`);
      const content = await file.async('string');
      let data: unknown;
      if (filePath.endsWith('.json')) {
        data = JSON.parse(content);
      } else if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
        data = this.manager.core.yaml.load(content);
      } else {
        throw new Error(`不支持的文件格式: ${filePath}`);
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('无法解析衣柜配置');
      this.add(data as Record<string, WardrobeItem>);
    } catch (e: any) {
      this.manager.log(`加载侧边栏衣柜配置失败: ${e.message}`, 'ERROR');
    }
  }

  public wear(npcName: string, location: string, key: string, cond?: Condition): void {
    if (!(key in this.templates)) {
      this.manager.log(`侧边栏服装配置 ${key} 不存在`, 'WARN');
      return;
    }
    const profile = this.profile(npcName);
    const rules = location === '*' ? profile.global : this.location(profile, location);
    rules.push({
      key,
      cond
    });
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
    const key = this.select(profile, location);
    const context: WardrobeContext = {
      npcName,
      location,
      key
    };
    const clothes = structuredClone(this.templates.naked ?? {});
    this.applyModifiers(profile.baseModifiers, clothes, context, '基层服装配置');
    if (key !== 'naked') this.mergeClothes(clothes, this.templates[key] ?? {});
    this.applyModifiers(profile.modifiers, clothes, context, '动态服装修改');
    return clothes;
  }

  private applyModifiers(modifiers: WardrobeModifier[], clothes: WardrobeItem, context: WardrobeContext, label: string): void {
    for (const modifier of modifiers) {
      try {
        modifier(clothes, context);
      } catch (e: any) {
        this.manager.log(`${context.npcName} ${label}失败: ${e.message}`, 'WARN');
      }
    }
  }

  private add(data: Record<string, WardrobeItem>): void {
    Object.assign(this.templates, data);
  }

  private mergeClothes(clothes: WardrobeItem, layer: WardrobeItem): void {
    for (const [part, value] of Object.entries(layer)) if (value != null) clothes[part] = structuredClone(value);
  }

  private select(profile: WardrobeProfile, location: string): string {
    return this.find(profile.locations.get(location)) ?? this.find(profile.global) ?? 'naked';
  }

  private find(rules?: WearRule[]): string | undefined {
    if (!rules) return;
    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i];
      if (evaluate(this.manager.core, rule.cond)) return rule.key;
    }
  }

  private profile(npcName: string): WardrobeProfile {
    let profile = this.profiles.get(npcName);
    if (!profile) {
      profile = {
        locations: new Map(),
        global: [],
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
