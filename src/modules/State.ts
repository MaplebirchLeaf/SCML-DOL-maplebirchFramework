// ./src/modules/State.ts

import type Dynamic from './Dynamic';
import Catalog from '../infra/Catalog';
import Event, { type EventOptions } from './Event';

export interface StateEventOptions extends EventOptions {
  output?: string;
  action?: () => void;
  cond?: () => boolean;
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

class StateEvent extends Event {
  protected override readonly eventName = 'StateEvent';
  public output?: string;
  private action?: () => void;
  private cond: () => boolean;
  private forceExit: () => boolean;
  private extra: ExtraOptions;

  public constructor(
    id: string,
    public readonly type: 'gate' | 'append',
    options: StateEventOptions,
    log: Dynamic['log']
  ) {
    super(id, options, log);
    this.output = options.output;
    this.action = options.action;
    this.cond = options.cond ?? (() => true);
    this.forceExit = typeof options.forceExit === 'function' ? options.forceExit : () => !!options.forceExit;
    this.extra = options.extra ?? {};
  }

  private checkPassage(passageName?: string): boolean {
    if (!passageName) return true;
    const { passage, exclude, match } = this.extra;
    if (passage?.length && !passage.includes(passageName)) return false;
    if (exclude?.length && exclude.includes(passageName)) return false;
    if (match) {
      const previousIndex = match.lastIndex;
      match.lastIndex = 0;
      const matched = match.test(passageName);
      match.lastIndex = previousIndex;
      if (!matched) return false;
    }
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
    return this.evaluate('cond', this.cond);
  }

  private runAction(): void {
    this.invoke('action', this.action);
  }

  public shouldForceExit(): boolean {
    return this.evaluate('forceExit', this.forceExit);
  }
}

export class StateManager {
  private readonly stateEvents = { gate: new Catalog<string, StateEvent>(), append: new Catalog<string, StateEvent>() };
  private readonly log: Dynamic['log'];

  public constructor(private readonly manager: Dynamic) {
    this.log = (...args) => manager.log(...args);
  }

  public get events(): Readonly<Record<'gate' | 'append', ReadonlyMap<string, StateEvent>>> {
    return { gate: this.stateEvents.gate.entries, append: this.stateEvents.append.entries };
  }

  public trigger(type: 'gate' | 'append'): string {
    const passageName = this.manager.core.host.sugarcube.passage?.title;
    if (type === 'gate') return this.processGateEvents(passageName);
    if (type === 'append') return this.processAppendEvents(passageName);
    return '';
  }

  private processGateEvents(passageName?: string): string {
    const gateEvents = this.stateEvents['gate'];
    const sortedEvents = gateEvents.list().sort((a, b) => b.priority - a.priority);
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
    if (!appendEvents.entries.size) return '';
    const outputs: string[] = [];
    const toRemove: string[] = [];
    const sortedEvents = appendEvents.list().sort((a, b) => b.priority - a.priority);
    for (const event of sortedEvents) {
      const result = event.tryRun(passageName);
      if (!result) continue;
      if (result.hasOutput && event.output) outputs.push(`<<${event.output}>>`);
      if (result.remove) toRemove.push(event.id);
    }
    for (const eventId of toRemove) this.unregister('append', eventId);
    return outputs.join('');
  }

  public register(type: 'gate' | 'append', eventId: string, options: StateEventOptions): boolean {
    if (!(type in this.stateEvents)) {
      this.log(`未知的状态事件类型: ${type}`, 'ERROR');
      return false;
    }
    if (!this.stateEvents[type].add(eventId, new StateEvent(eventId, type, options, this.log))) {
      this.log(`事件ID已存在: ${type}.${eventId}`, 'WARN');
      return false;
    }
    this.log(`注册状态事件: ${type}.${eventId}`, 'DEBUG');
    return true;
  }

  public unregister(type: 'gate' | 'append', eventId: string): boolean {
    if (!this.stateEvents[type]) {
      this.log(`事件类型不存在: ${type}`, 'WARN');
      return false;
    }
    if (this.stateEvents[type].remove(eventId)) {
      this.log(`注销状态事件: ${type}.${eventId}`, 'DEBUG');
      return true;
    }
    this.log(`未找到事件: ${type}.${eventId}`, 'DEBUG');
    return false;
  }

  public Init(): void {
    this.manager.core.on(':passagedisplay', () => new (this.manager.core.host.sugarcube.require().Wikifier)(document.getElementById('append')!, this.trigger('append')));
    this.log('状态事件系统已激活', 'DEBUG');
  }
}
