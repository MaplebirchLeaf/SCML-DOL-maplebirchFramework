// ./src/modules/NamedNPCAddon/NPCTransformation.ts

import type NPCManager from '../NamedNPC';
import type { NPCBodyData, NPCSidebarState } from './NPCSidebarConfig/types';
import { transformationDefaults } from './NPCSidebarConfig/transformation_layers';

export interface NPCTransformationState {
  build: number;
  level: number;
}

export type NPCTransformationPart = {
  [Key in keyof typeof transformationDefaults]: Key extends `${infer Part}_type` ? Part : never;
}[keyof typeof transformationDefaults];

export interface NPCTransformationPartConfig {
  level?: number;
  style?: string;
  filter?: { blend?: string; blendMode?: string; brightness?: number; contrast?: number; desaturate?: boolean };
}

export interface NPCTransformationConfig {
  levels?: readonly number[];
  type?: string;
  parts?: Partial<Record<NPCTransformationPart, NPCTransformationPartConfig>>;
  body?: (bodydata: NPCBodyData, state: Readonly<NPCTransformationState>, npcName: string) => void;
  sidebar?: (nnpc: Partial<NPCSidebarState>, state: Readonly<NPCTransformationState>, npcName: string) => void;
  layers?: CanvasLayerMap;
}

type TransformationConfig = Omit<NPCTransformationConfig, 'levels' | 'parts'> & {
  levels: readonly number[];
  parts: Partial<Record<NPCTransformationPart, Required<Pick<NPCTransformationPartConfig, 'level' | 'style'>> & Pick<NPCTransformationPartConfig, 'filter'>>>;
};
const defaultLevels = [5, 10, 15, 20, 25, 30] as const;
const parts = new Set(
  Object.keys(transformationDefaults)
    .filter(key => key.endsWith('_type'))
    .map(key => key.slice(0, -5))
);

function key(value: string): string {
  const name = value.trim();
  if (!name || ['__proto__', 'prototype', 'constructor'].includes(name)) throw new Error(`Invalid NPC transformation key: ${value}`);
  return name;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stateLevel(build: number, levels: readonly number[]): number {
  return levels.filter(threshold => build >= threshold).length;
}

function stateValues(value: unknown, levels: readonly number[]): NPCTransformationState {
  const source = record(value) ? value : {};
  const savedBuild = source.build == null ? NaN : Number(source.build);
  const savedLevel = Number(source.level);
  const fallback = Number.isFinite(savedLevel) ? (levels[Math.clamp(Math.round(savedLevel), 0, levels.length) - 1] ?? 0) : 0;
  const build = Math.clamp(Number.isFinite(savedBuild) ? savedBuild : fallback, 0, levels.at(-1)!);
  return { build, level: stateLevel(build, levels) };
}

class NPCTransformation {
  private readonly configs = new Map<string, Map<string, TransformationConfig>>();

  public constructor(private readonly manager: NPCManager) {}

  public add(npcName: string, type: string, config: NPCTransformationConfig = {}): this {
    const npc = key(npcName).toLowerCase();
    const name = key(type);
    if (config.levels !== undefined && !Array.isArray(config.levels)) throw new Error(`Invalid transformation levels: ${name}`);
    if ([config.body, config.sidebar].some(callback => callback !== undefined && typeof callback !== 'function')) throw new Error(`Invalid transformation callback: ${name}`);
    const levels = [...(config.levels ?? defaultLevels)];
    if (!levels.length || levels.some((value, i) => !Number.isFinite(value) || value <= (levels[i - 1] ?? 0))) throw new Error(`Invalid transformation levels: ${name}`);
    const configuredParts: TransformationConfig['parts'] = {};
    for (const [part, options] of Object.entries(config.parts ?? {})) {
      if (!parts.has(part) || !options || typeof options !== 'object' || Array.isArray(options)) throw new Error(`Invalid transformation part: ${part}`);
      const { level = 1, style = 'default', filter } = options;
      if (!Number.isInteger(level) || level < 1 || level > levels.length || typeof style !== 'string' || !style.trim()) throw new Error(`Invalid transformation part options: ${part}`);
      if (
        filter !== undefined &&
        (!record(filter) ||
          [filter.brightness, filter.contrast].some(value => value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) ||
          [filter.blend, filter.blendMode].some(value => value !== undefined && typeof value !== 'string') ||
          (filter.desaturate !== undefined && typeof filter.desaturate !== 'boolean'))
      )
        throw new Error(`Invalid transformation filter: ${part}`);
      configuredParts[part as NPCTransformationPart] = { level, style, ...(filter ? { filter: { ...filter } } : {}) };
    }
    const configs = this.configs.get(npc) ?? new Map<string, TransformationConfig>();
    configs.set(name, { ...config, levels, parts: configuredParts });
    this.configs.set(npc, configs);
    if (config.layers) this.manager.core.char.use(config.layers, 'main');
    return this;
  }

  public ensure(npcName: string, type?: string): Record<string, NPCTransformationState> {
    const name = key(npcName).toLowerCase();
    const requested = type === undefined ? undefined : key(type);
    V.maplebirch ??= {};
    V.maplebirch.npc ??= {};
    const npc = (V.maplebirch.npc[name] ??= {});
    if (!record(npc.transformation)) npc.transformation = {};
    const data: Record<string, unknown> = npc.transformation;
    for (const type of requested ? [requested] : Object.keys(data)) {
      const levels = this.config(name, type)?.levels ?? defaultLevels;
      const source = record(data[type]) ? data[type] : {};
      data[type] = Object.assign(source, stateValues(source, levels));
    }
    return data as Record<string, NPCTransformationState>;
  }

  public get(npcName: string, type: string): NPCTransformationState {
    return this.ensure(npcName, type)[key(type)];
  }

  public build(npcName: string, type: string, value: number): NPCTransformationState {
    if (!Number.isFinite(value)) throw new Error('Transformation growth must be finite');
    const levels = this.config(npcName, type)?.levels ?? defaultLevels;
    const state = this.get(npcName, type);
    state.build = Math.clamp(state.build + value, 0, levels.at(-1)!);
    state.level = stateLevel(state.build, levels);
    return state;
  }

  public set(npcName: string, type: string, level: number): NPCTransformationState {
    if (!Number.isFinite(level)) throw new Error('Transformation level must be finite');
    const levels = this.config(npcName, type)?.levels ?? defaultLevels;
    const state = this.get(npcName, type);
    state.level = Math.clamp(Math.round(level), 0, levels.length);
    state.build = levels[state.level - 1] ?? 0;
    return state;
  }

  public clear(npcName: string, type?: string): void {
    const data = this.read(npcName);
    if (!data) return;
    if (type !== undefined) delete data[key(type)];
    else for (const name of Object.keys(data)) delete data[name];
  }

  public level(npcName: string, type: string): number {
    const name = key(type);
    return stateValues(this.read(npcName)?.[name], this.config(npcName, name)?.levels ?? defaultLevels).level;
  }

  public type(npcName: string): string {
    return this.active(npcName)?.config.type ?? '';
  }

  public applyBody(nnpc: Partial<NPCSidebarState>, npcData: { bodydata?: NPCBodyData }): void {
    nnpc.bodydata = { ...npcData.bodydata };
    if (!nnpc.name) return;
    for (const { config, state } of this.entries(nnpc.name)) config.body?.(nnpc.bodydata, state, nnpc.name);
  }

  public applySidebar(nnpc: Partial<NPCSidebarState>): void {
    nnpc.tf_filters = {};
    if (!nnpc.name) return;
    for (const { config, state } of this.entries(nnpc.name)) {
      nnpc.show_tf = true;
      for (const [part, options] of Object.entries(config.parts)) {
        if (state.level < options.level) continue;
        nnpc[`${part}_type`] = options.style;
        if (options.filter) nnpc.tf_filters[part] = { ...options.filter };
        else delete nnpc.tf_filters[part];
      }
      config.sidebar?.(nnpc, state, nnpc.name);
    }
  }

  private read(npcName: string): Record<string, unknown> | undefined {
    const data: unknown = V.maplebirch?.npc?.[key(npcName).toLowerCase()]?.transformation;
    return record(data) ? data : undefined;
  }

  private *entries(npcName: string) {
    const configs = this.configs.get(key(npcName).toLowerCase());
    for (const [type, value] of Object.entries(this.read(npcName) ?? {})) {
      const config = configs?.get(type);
      if (!config) continue;
      const state = stateValues(value, config.levels);
      if (state.level > 0) yield { type, state, config };
    }
  }

  private config(npcName: string, type: string): TransformationConfig | undefined {
    return this.configs.get(key(npcName).toLowerCase())?.get(key(type));
  }

  private active(npcName: string) {
    let result: { type: string; state: NPCTransformationState; config: TransformationConfig } | undefined;
    for (const entry of this.entries(npcName)) {
      if (!result || entry.state.level > result.state.level || (entry.state.level === result.state.level && entry.state.build > result.state.build)) result = entry;
    }
    return result;
  }
}

export default NPCTransformation;
