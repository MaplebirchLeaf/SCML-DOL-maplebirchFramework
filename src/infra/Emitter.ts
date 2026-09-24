// ./src/infra/Emitter.ts

import Diagnostics from './Diagnostics';

export type EventCallback<Args extends unknown[] = unknown[]> = (...args: Args) => unknown;

interface EventListener {
  callback: EventCallback;
  description: string;
}

interface Catchable {
  catch(onRejected: (error: unknown) => unknown): unknown;
}

export class Emitter extends Diagnostics {
  // prettier-ignore
  private readonly events = new Map<string, EventListener[]>([
    [':indexedDB'      , []], // IDB数据库
    [':idbReady'       , []], // IDB数据库可读写
    [':import'         , []], // 数据导入
    [':variable'       , []], // V变量可注入时机
    [':onSave'         , []], // 存档
    [':onLoad'         , []], // 读档
    [':language'       , []], // 语言切换
    [':storyready'     , []], // 游戏准备
    [':passageinit'    , []], // 段落注入
    [':passagestart'   , []], // 段落开始
    [':passagerender'  , []], // 段落渲染
    [':passagedisplay' , []], // 段落显示
    [':passageend'     , []], // 段落结束
    [':sugarcube'      , []], // 获取SugarCube
    [':modLoaderEnd'   , []], // 模组加载器结束
  ]);

  private readonly afters = new Map<string, EventCallback[]>();
  private readonly triggering = new Map<string, number>();
  private readonly stickyEvents = new Set([':sugarcube', ':idbReady', ':storyready', ':modLoaderEnd', ':language']);
  private readonly stickyArgs = new Map<string, unknown[]>();
  private readonly synchronousEvents = new Set([':onSave', ':onLoad', ':variable']);
  public on<Args extends unknown[]>(eventName: string, callback: EventCallback<Args>, description = ''): boolean {
    let listeners = this.events.get(eventName);
    if (!listeners) {
      listeners = [];
      this.events.set(eventName, listeners);
      this.write(`创建新事件类型: ${eventName}`, 'DEBUG', 'events');
    }
    if (listeners.some(listener => listener.callback === callback)) {
      this.write(`回调函数已注册: ${eventName} (跳过重复)`, 'DEBUG', 'events');
      return false;
    }

    listeners.push({
      callback: callback as EventCallback,
      description
    });

    this.write(`注册事件监听器: ${eventName}` + (description ? ` (描述: ${description})` : '') + ` (当前: ${listeners.length})`, 'DEBUG', 'events');
    this.callSticky(eventName, callback);
    return true;
  }

  public off<Args extends unknown[]>(eventName: string, identifier: EventCallback<Args> | string): boolean {
    const listeners = this.events.get(eventName);
    if (!listeners) {
      this.write(`无效事件名: ${eventName}`, 'WARN', 'events');
      return false;
    }

    const byCallback = typeof identifier === 'function';
    const remaining = listeners.filter(listener => (byCallback ? listener.callback !== identifier : listener.description !== identifier));

    if (remaining.length === listeners.length) {
      this.write(`未找到匹配的监听器: ${eventName} (标识符: ${byCallback ? '函数引用' : identifier})`, 'DEBUG', 'events');
      return false;
    }

    this.events.set(eventName, remaining);
    this.write(`移除事件监听器: ${eventName}${byCallback ? ' (函数引用)' : ` (描述: ${identifier})`}`, 'DEBUG', 'events');

    return true;
  }

  public once<Args extends unknown[]>(eventName: string, callback: EventCallback<Args>, description = ''): boolean {
    if (this.stickyArgs.has(eventName)) {
      this.callSticky(eventName, callback);
      return true;
    }

    let consumed = false;
    const wrapper: EventCallback<Args> = (...args) => {
      if (consumed) return;
      consumed = true;
      this.off(eventName, wrapper);
      try {
        const result = callback(...args);
        const pending = result as Catchable | null | undefined;
        if (typeof pending?.catch === 'function') return pending.catch((error: unknown) => this.record(`${eventName}事件once回调错误: ${Diagnostics.message(error)}`, 'ERROR', 'events', error));
        return result;
      } catch (error) {
        this.record(`${eventName}事件once回调错误: ${Diagnostics.message(error)}`, 'ERROR', 'events', error);
      }
    };

    return this.on(eventName, wrapper, description);
  }

  public async trigger(eventName: string, ...args: unknown[]): Promise<void> {
    if (this.stickyEvents.has(eventName)) this.stickyArgs.set(eventName, args);
    this.triggering.set(eventName, (this.triggering.get(eventName) ?? 0) + 1);
    try {
      const listeners = this.events.get(eventName);
      if (listeners?.length) {
        for (let i = 0, length = listeners.length; i < length; i++) {
          try {
            const result = listeners[i].callback(...args);
            const pending = this.pending(eventName, result);
            if (pending) await pending;
          } catch (error) {
            this.record(`${eventName}事件处理错误: ${Diagnostics.message(error)}`, 'ERROR', 'events', error);
          }
        }
      }
    } finally {
      const active = this.triggering.get(eventName)! - 1;
      if (active) this.triggering.set(eventName, active);
      else this.triggering.delete(eventName);
    }
    if (this.triggering.has(eventName)) return;
    const callbacks = this.afters.get(eventName);
    if (!callbacks?.length) return;
    this.afters.delete(eventName);
    for (const callback of callbacks) {
      try {
        const result = callback(...args);
        const pending = this.pending(eventName, result);
        if (pending) await pending;
      } catch (error) {
        this.record(`${eventName}事件after回调错误: ${Diagnostics.message(error)}`, 'ERROR', 'events', error);
      }
    }
  }

  public after<Args extends unknown[]>(eventName: string, callback: EventCallback<Args>): void {
    if (this.stickyArgs.has(eventName) && !this.triggering.has(eventName)) {
      this.callSticky(eventName, callback, 'after');
      return;
    }
    const callbacks = this.afters.get(eventName) ?? [];
    callbacks.push(callback as EventCallback);
    this.afters.set(eventName, callbacks);
  }

  private pending(eventName: string, result: unknown): PromiseLike<unknown> | undefined {
    const pending = result as PromiseLike<unknown> | null | undefined;
    if (typeof pending?.then !== 'function') return;
    if (!this.synchronousEvents.has(eventName)) return pending;
    this.record(`${eventName}事件回调必须同步执行`, 'ERROR', 'events');
    void Promise.resolve(pending).catch((error: unknown) => this.record(`${eventName}事件处理错误: ${Diagnostics.message(error)}`, 'ERROR', 'events', error));
  }

  private callSticky<Args extends unknown[]>(eventName: string, callback: EventCallback<Args>, type: 'listener' | 'after' = 'listener'): void {
    const args = this.stickyArgs.get(eventName);
    if (!args) return;
    try {
      const result = callback(...(args as Args));
      const pending = result as Catchable | null | undefined;
      if (typeof pending?.catch === 'function') pending.catch((error: unknown) => this.record(`${eventName} sticky ${type} error: ${Diagnostics.message(error)}`, 'ERROR', 'events', error));
    } catch (error) {
      this.record(`${eventName} sticky ${type} error: ${Diagnostics.message(error)}`, 'ERROR', 'events', error);
    }
  }
}

export default Emitter;
