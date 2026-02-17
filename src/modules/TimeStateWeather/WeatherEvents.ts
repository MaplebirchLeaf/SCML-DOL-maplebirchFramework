// .src/modules/TimeStateWeather/WeatherEvents.ts

import maplebirch from '../../core';
import { merge } from '../../utils';
import AddonPlugin from '../AddonPlugin';
import DynamicManager from '../Dynamic';

export interface WeatherEventOptions {
  condition?: () => boolean;
  onEnter?: () => void;
  onExit?: () => void;
  once?: boolean;
  priority?: number;
  [key: string]: any;
}

export interface WeatherTypeConfig {
  name: string;
  iconType?: string | (() => string);
  value: number;
  probability: {
    summer: number;
    winter: number;
    spring: number;
    autumn: number;
  };
  cloudCount: {
    small: () => number;
    large: () => number;
  };
  tanningModifier: number;
  overcast: number | (() => number);
  precipitationIntensity: number;
  visibility: number;
}

export interface WeatherException {
  date: () => DateTime;
  duration: number;
  weatherType: string;
  temperature?: number;
}

interface ModificationConfig {
  patch: any;
  mode: 'replace' | 'merge';
}

class WeatherEvent {
  constructor(
    public readonly id: string,
    options: WeatherEventOptions = {}
  ) {
    this.condition = options.condition;
    this.onEnter = options.onEnter;
    this.onExit = options.onExit;
    this.once = !!options.once;
    this.priority = options.priority || 0;
    this.fields = {};
    for (const [key, value] of Object.entries(options)) if (!['condition', 'onEnter', 'onExit', 'once', 'priority'].includes(key)) this.fields[key] = value;
  }

  private condition?: () => boolean;
  private onEnter?: () => void;
  private onExit?: () => void;
  private once: boolean = false;
  priority: number = 0;
  private fields: Record<string, any> = {};

  tryMatch(): boolean {
    try {
      if (this.condition) return !!this.condition();
      return this._matchFields();
    } catch (e: any) {
      maplebirch.log(`[WeatherEvent:${this.id}] condition error:`, 'ERROR', e);
      return false;
    }
  }

  private _matchFields(): boolean {
    for (const [key, value] of Object.entries(this.fields)) if (!this._matchField(key, value)) return false;
    return true;
  }

  private _matchField(key: string, value: any): boolean {
    // prettier-ignore
    const builtIn: Record<string, () => any> = {
      weather:   () => Weather.name,
      temp:      () => Weather.temperature,
      precip:    () => Weather.precipitation,
      season:    () => Time.season,
      hour:      () => Time.hour,
      dayState:  () => Weather.dayState,
      bloodMoon: () => Weather.bloodMoon,
      freezing:  () => Weather.isFreezing,
      overcast:  () => Weather.overcast,
      fog:       () => Weather.fog
    };
    if (builtIn[key]) {
      const current = builtIn[key]();
      if (typeof value === 'object' && !Array.isArray(value)) {
        if (value.min != null && current < value.min) return false;
        if (value.max != null && current > value.max) return false;
        return true;
      }
      if (Array.isArray(value)) return value.includes(current);
      return current === value;
    }
    const paths: (() => any)[] = [() => V[key], () => T[key], () => Weather[key], () => Time[key]];
    for (const getter of paths) {
      try {
        const current = getter();
        if (current !== undefined) {
          if (Array.isArray(value)) return value.includes(current);
          if (typeof value === 'object') {
            if (value.min != null && current < value.min) return false;
            if (value.max != null && current > value.max) return false;
            return true;
          }
          return current === value;
        }
      } catch {}
    }
    return true;
  }

  executeEnter(): void {
    if (!this.onEnter) return;
    try {
      this.onEnter();
    } catch (e: any) {
      maplebirch.log(`[WeatherEvent:${this.id}] onEnter error:`, 'ERROR', e);
    }
  }

  executeExit(): void {
    if (!this.onExit) return;
    try {
      this.onExit();
    } catch (e: any) {
      maplebirch.log(`[WeatherEvent:${this.id}] onExit error:`, 'ERROR', e);
    }
  }

  shouldRemove(): boolean {
    return this.once;
  }
}

export class WeatherManager {
  private readonly weatherEvents: Map<string, WeatherEvent> = new Map();
  private readonly activeEvents: Set<string> = new Set();
  private sortedEventsCache: WeatherEvent[] | null = null;
  private readonly Exceptions: WeatherException[] = [];
  private readonly WeatherTypes: WeatherTypeConfig[] = [];
  private readonly layerModifications: Map<string, ModificationConfig[]> = new Map();
  private readonly effectModifications: Map<string, ModificationConfig[]> = new Map();
  private weatherTriggered: boolean = false;
  private readonly log: (message: string, level?: string, ...objects: any[]) => void;

  constructor(private readonly manager: DynamicManager) {
    this.log = manager.log;
    $(document).on(':onWeatherChange', () => this.manager.core.trigger(':onWeather'));
    this.manager.core.on(':onWeather', () => this._checkEvents(), 'weather change');
  }

  private _checkEvents(): void {
    if (!this.sortedEventsCache) this.sortedEventsCache = Array.from(this.weatherEvents.values()).sort((a, b) => b.priority - a.priority);
    const toRemove: string[] = [];
    for (const event of this.sortedEventsCache) {
      const wasActive = this.activeEvents.has(event.id);
      const isActive = event.tryMatch();
      if (isActive && !wasActive) {
        this.activeEvents.add(event.id);
        event.executeEnter();
        if (event.shouldRemove()) toRemove.push(event.id);
      } else if (!isActive && wasActive) {
        this.activeEvents.delete(event.id);
        event.executeExit();
      }
    }
    for (const eventId of toRemove) {
      this.weatherEvents.delete(eventId);
      this.activeEvents.delete(eventId);
      this.sortedEventsCache = null;
      this.log(`移除一次性天气事件: ${eventId}`, 'DEBUG');
    }
  }

  register(eventId: string, options: WeatherEventOptions): boolean {
    if (this.weatherEvents.has(eventId)) {
      this.log(`天气事件ID已存在: ${eventId}`, 'WARN');
      return false;
    }
    this.weatherEvents.set(eventId, new WeatherEvent(eventId, options));
    this.sortedEventsCache = null;
    this.log(`注册天气事件: ${eventId}`, 'DEBUG');
    return true;
  }

  unregister(eventId: string): boolean {
    if (this.weatherEvents.delete(eventId)) {
      this.activeEvents.delete(eventId);
      this.sortedEventsCache = null;
      this.log(`注销天气事件: ${eventId}`, 'DEBUG');
      return true;
    }
    this.log(`未找到天气事件: ${eventId}`, 'WARN');
    return false;
  }

  addLayerModification(layerName: string, patch: any, mode: 'replace' | 'merge' = 'replace'): this {
    if (!this.layerModifications.has(layerName)) this.layerModifications.set(layerName, []);
    this.layerModifications.get(layerName)!.push({ patch, mode });
    return this;
  }

  addEffectModification(effectName: string, patch: any, mode: 'replace' | 'merge' = 'replace'): this {
    if (!this.effectModifications.has(effectName)) this.effectModifications.set(effectName, []);
    this.effectModifications.get(effectName)!.push({ patch, mode });
    return this;
  }

  applyModifications(params: any): any {
    const layerName = params.name;
    if (!this.weatherTriggered) {
      void this.manager.core.trigger(':modifyWeather');
      this.weatherTriggered = true;
    }
    if (this.layerModifications.has(layerName)) {
      const modifications = this.layerModifications.get(layerName)!;
      for (const { patch, mode } of modifications) merge(params, patch, { mode });
      this.layerModifications.delete(layerName);
      this.log(`应用层修改 ${layerName}: ${modifications.length} 个修改`, 'DEBUG');
    }
    if (this.effectModifications.size > 0) {
      for (const [effectName, modifications] of this.effectModifications) {
        const effect = Weather.Renderer.Effects.effects.get(effectName);
        if (effect) {
          for (const { patch, mode } of modifications) merge(effect, patch, { mode });
          this.log(`应用效果修改 ${effectName}: ${modifications.length} 个修改`, 'DEBUG');
        }
      }
      this.effectModifications.clear();
    }
    return params;
  }

  addWeatherData(data: WeatherException | WeatherTypeConfig): boolean | void {
    if ('date' in data) {
      this.Exceptions.push(data as WeatherException);
      this.log(`暂存天气例外: ${(data as WeatherException).weatherType}`, 'DEBUG');
    } else {
      this.WeatherTypes.push(data as WeatherTypeConfig);
      this.log(`暂存天气类型: ${(data as WeatherTypeConfig).name}`, 'DEBUG');
      return true;
    }
  }

  init(): void {
    for (const exception of this.Exceptions) setup.WeatherExceptions.push(exception);
    this.Exceptions.length = 0;
    for (const weatherType of this.WeatherTypes) if (!setup.WeatherGeneration.weatherTypes.find((t: any) => t.name === weatherType.name)) setup.WeatherGeneration.weatherTypes.push(weatherType);
    this.WeatherTypes.length = 0;
    this.log('天气事件系统已激活', 'INFO');
  }

  async modifyWeatherJavaScript(manager: AddonPlugin): Promise<void> {
    const oldSCdata = manager.gSC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const file = SCdata.scriptFileItems.getByNameWithOrWithoutPath('00-layer-manager.js');
    const replacements: [RegExp, string][] = [
      [
        /const\s+layer\s*=\s*new\s+Weather\.Renderer\.Layer\(([^)]+)\);/,
        'maplebirch.dynamic.Weather.applyModifications(params);\n\t\tconst layer = new Weather.Renderer.Layer(params.name, params.blur, params.zIndex, params.animation);'
      ]
    ];
    file.content = manager.replace(file.content, replacements);
    manager.addonReplacePatcher.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
  }
}
