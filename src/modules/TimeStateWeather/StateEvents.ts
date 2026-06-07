// .src/modules/TimeStateWeather/StateEvents.ts

import maplebirch from '../../core';
import type DynamicManager from '../Dynamic';

export interface StateEventOptions {
  output?: string;
  action?: () => void;
  cond?: () => boolean;
  priority?: number;
  once?: boolean;
  forceExit?: boolean | (() => boolean);
  extra?: {
    passage?: string[];
    exclude?: string[];
    match?: RegExp;
  };
}

interface ExtraOptions {
  passage?: string[];
  exclude?: string[];
  match?: RegExp;
}

interface StateEventResult {
  hasOutput: boolean;
  remove: boolean;
}

class StateEvent {
  public output?: string;
  private action?: () => void;
  private cond: () => boolean;
  private once: boolean;
  private forceExit: () => boolean;
  private extra: ExtraOptions;
  public readonly priority: number;

  public constructor(
    public readonly id: string,
    public readonly type: string,
    options: StateEventOptions = {}
  ) {
    this.output = options.output;
    this.action = options.action;
    this.cond = options.cond || (() => true);
    this.priority = options.priority || 0;
    this.once = !!options.once;
    this.forceExit = typeof options.forceExit === 'function' ? options.forceExit : () => !!options.forceExit;
    this.extra = options.extra || {};
  }

  private checkPassage(passageName?: string): boolean {
    if (!passageName) return true;
    const { passage, exclude, match } = this.extra;
    if (passage?.length && !passage.includes(passageName)) return false;
    if (exclude?.length && exclude.includes(passageName)) return false;
    if (match && !match.test(passageName)) return false;
    return true;
  }

  public tryRun(passageName?: string): StateEventResult | null {
    if (!this.checkPassage(passageName)) return null;
    if (!this.match()) return null;
    this.runAction();
    return {
      hasOutput: !!this.output,
      remove: this.once
    };
  }

  private match(): boolean {
    try {
      return !!this.cond();
    } catch (e: any) {
      maplebirch.log(`[StateEvent:${this.id}] cond error:`, 'ERROR', e);
      return false;
    }
  }

  private runAction(): void {
    try {
      this.action?.();
    } catch (e: any) {
      maplebirch.log(`[StateEvent:${this.id}] action error:`, 'ERROR', e);
    }
  }

  public shouldForceExit(): boolean {
    try {
      return !!this.forceExit();
    } catch (e: any) {
      maplebirch.log(`[StateEvent:${this.id}] forceExit error:`, 'ERROR', e);
      return false;
    }
  }
}

export class StateManager {
  private readonly stateEvents: Record<string, Map<string, StateEvent>> = {};
  private readonly log: (message: string, level?: string, ...objects: any[]) => void;

  public constructor(private readonly manager: DynamicManager) {
    this.log = manager.log;
    const eventTypes = ['gate', 'append'];
    eventTypes.forEach(type => (this.stateEvents[type] = new Map()));
  }

  public trigger(type: 'gate' | 'append'): string {
    const passageName = this.manager.core.passage?.title;
    if (type === 'gate') return this.processGateEvents(passageName);
    if (type === 'append') return this.processAppendEvents(passageName);
    return '';
  }

  private processGateEvents(passageName?: string): string {
    const gateEvents = this.stateEvents['gate'];
    if (!gateEvents?.size) return '';
    const sortedEvents = Array.from(gateEvents.values()).sort((a, b) => b.priority - a.priority);
    for (const event of sortedEvents) {
      const result = event.tryRun(passageName);
      if (!result) continue;
      if (result.remove) this.unregister('gate', event.id);
      if (result.hasOutput && event.output) return event.shouldForceExit() ? `<<${event.output}>><<exitAll>>` : `<<${event.output}>>`;
    }
    return '';
  }

  private processAppendEvents(passageName?: string): string {
    const appendEvents = this.stateEvents['append'];
    if (!appendEvents?.size) return '';
    const outputs: string[] = [];
    const toRemove: string[] = [];
    const sortedEvents = Array.from(appendEvents.values()).sort((a, b) => b.priority - a.priority);
    for (const event of sortedEvents) {
      const result = event.tryRun(passageName);
      if (!result) continue;
      if (result.hasOutput && event.output) outputs.push(`<<${event.output}>>`);
      if (result.remove) toRemove.push(event.id);
    }
    for (const eventId of toRemove) this.unregister('append', eventId);
    return outputs.join('');
  }

  public register(type: string, eventId: string, options: StateEventOptions): boolean {
    if (!(type in this.stateEvents)) {
      this.log(`未知的状态事件类型: ${type}`, 'ERROR');
      return false;
    }
    if (this.stateEvents[type].has(eventId)) {
      this.log(`事件ID已存在: ${type}.${eventId}`, 'WARN');
      return false;
    }
    this.stateEvents[type].set(eventId, new StateEvent(eventId, type, options));
    this.log(`注册状态事件: ${type}.${eventId}`, 'DEBUG');
    return true;
  }

  public unregister(type: string, eventId: string): boolean {
    if (!this.stateEvents[type]) {
      this.log(`事件类型不存在: ${type}`, 'WARN');
      return false;
    }
    if (this.stateEvents[type].delete(eventId)) {
      this.log(`注销状态事件: ${type}.${eventId}`, 'DEBUG');
      return true;
    }
    this.log(`未找到事件: ${type}.${eventId}`, 'DEBUG');
    return false;
  }

  public init(): void {
    this.manager.core.on(':passagedisplay', () => new maplebirch.SugarCube.Wikifier(document.getElementById('append'), this.trigger('append')));
    this.log('状态事件系统已激活', 'INFO');
  }
}
