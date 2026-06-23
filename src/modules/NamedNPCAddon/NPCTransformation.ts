// ./src/modules/NamedNPCAddon/NPCTransformation.ts

import type NPCManager from '../NamedNPC';

export interface NPCTransformationState {
  build: number;
  level: number;
}

export interface NPCTransformationConfig {
  levels?: number[];
  type?: string;
  pregnancy?: string;
  body?: (bodydata: Record<string, any>, state: NPCTransformationState, npcName: string) => void;
  sidebar?: (nnpc: Record<string, any>, state: NPCTransformationState, npcName: string) => void;
  layers?: CanvasLayerMap;
}

function key(npcName: string) {
  return String(npcName || '').toLowerCase();
}

function stateLevel(build: number, levels: number[]) {
  let level = 0;
  for (const threshold of levels) if (build >= threshold) level++;
  return level;
}

const defaultLevels = [5, 10, 15, 20, 25, 30];

class NPCTransformation {
  private readonly configs = new Map<string, Required<Pick<NPCTransformationConfig, 'levels'>> & NPCTransformationConfig>();

  public constructor(private readonly manager: NPCManager) {}

  public add(type: string, config: NPCTransformationConfig = {}): this {
    const name = type.trim();
    if (!name) return this;
    this.configs.set(name, {
      ...config,
      levels: config.levels?.length ? config.levels : defaultLevels
    });
    if (config.layers) this.manager.core.char.use(config.layers, 'main');
    return this;
  }

  public ensure(npcName: string, type?: string): Record<string, NPCTransformationState> {
    V.maplebirch ??= {};
    V.maplebirch.npc ??= {};
    const npc = (V.maplebirch.npc[key(npcName)] ??= {});
    if (!npc.transformation || typeof npc.transformation !== 'object') npc.transformation = {};
    const types = type ? [type] : Object.keys(npc.transformation);
    for (const name of types) {
      const config = this.configs.get(name);
      const levels = config?.levels ?? defaultLevels;
      const current = npc.transformation[name];
      const source = current && typeof current === 'object' ? current : {};
      const build = Math.clamp(Math.round(Number(source.build) || 0), 0, levels.at(-1) ?? 100);
      const savedLevel = Number(source.level);
      npc.transformation[name] = {
        build,
        level: Math.clamp(Number.isFinite(savedLevel) ? Math.round(savedLevel) : stateLevel(build, levels), 0, levels.length)
      };
    }
    return npc.transformation;
  }

  public get(npcName: string, type: string): NPCTransformationState {
    return this.ensure(npcName, type)[type];
  }

  public build(npcName: string, type: string, value: number): NPCTransformationState {
    const config = this.configs.get(type);
    const state = this.get(npcName, type);
    state.build = Math.clamp(state.build + value, 0, config?.levels.at(-1) ?? 100);
    state.level = stateLevel(state.build, config?.levels ?? []);
    return state;
  }

  public set(npcName: string, type: string, level: number): NPCTransformationState {
    const config = this.configs.get(type);
    const levels = config?.levels ?? [];
    const state = this.get(npcName, type);
    state.level = Math.clamp(Math.round(level), 0, levels.length || 6);
    state.build = state.level > 0 ? (levels[state.level - 1] ?? Math.round((state.level / (levels.length || 6)) * 100)) : 0;
    return state;
  }

  public clear(npcName: string, type?: string): void {
    const data = this.ensure(npcName);
    if (type) delete data[type];
    else Object.keys(data).forEach(name => delete data[name]);
  }

  public level(npcName: string, type: string): number {
    return this.get(npcName, type)?.level ?? 0;
  }

  public type(npcName: string): string {
    return this.active(npcName)?.config.type ?? '';
  }

  public pregnancyType(npcName: string): string {
    return this.active(npcName)?.config.pregnancy ?? '';
  }

  public applyBody(nnpc: Record<string, any>, npcData: any): void {
    nnpc.bodydata = { ...npcData.bodydata };
    for (const [type, state] of Object.entries(this.ensure(nnpc.name))) {
      const config = this.configs.get(type);
      if (config && state.level > 0) config.body?.(nnpc.bodydata, state, nnpc.name);
    }
  }

  public applySidebar(nnpc: Record<string, any>): void {
    for (const [type, state] of Object.entries(this.ensure(nnpc.name))) {
      const config = this.configs.get(type);
      if (!config || state.level <= 0) continue;
      nnpc.show_tf = true;
      config.sidebar?.(nnpc, state, nnpc.name);
    }
  }

  private active(npcName: string) {
    let result: { type: string; state: NPCTransformationState; config: NPCTransformationConfig } | null = null;
    for (const [type, state] of Object.entries(this.ensure(npcName))) {
      const config = this.configs.get(type);
      if (!config || state.level <= 0) continue;
      if (!result || state.level > result.state.level || (state.level === result.state.level && state.build > result.state.build)) result = { type, state, config };
    }
    return result;
  }
}

export default NPCTransformation;
