// ./src/services/EventEmitter.ts

import type { MaplebirchCore } from '../core';

type EventCallback = (...args: any[]) => unknown;

interface EventListener {
  callback: EventCallback;
  description: string;
}

interface Catchable {
  catch(onRejected: (error: unknown) => unknown): unknown;
}

class EventEmitter {
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
  private readonly stickyEvents = new Set([':sugarcube', ':idbReady', ':storyready', ':modLoaderEnd', ':language']);
  private readonly stickyArgs = new Map<string, unknown[]>();
  public constructor(readonly core: MaplebirchCore) {}

  public on(eventName: string, callback: EventCallback, description = ''): boolean {
    let listeners = this.events.get(eventName);
    if (!listeners) {
      listeners = [];
      this.events.set(eventName, listeners);
      this.core.logger.log(`创建新事件类型: ${eventName}`, 'DEBUG');
    }
    if (listeners.some(listener => listener.callback === callback)) {
      this.core.logger.log(`回调函数已注册: ${eventName} (跳过重复)`, 'DEBUG');
      return false;
    }

    listeners.push({
      callback,
      description
    });

    this.core.logger.log(`注册事件监听器: ${eventName}` + (description ? ` (描述: ${description})` : '') + ` (当前: ${listeners.length})`, 'DEBUG');
    this.callSticky(eventName, callback);
    return true;
  }

  public off(eventName: string, identifier: EventCallback | string): boolean {
    const listeners = this.events.get(eventName);
    if (!listeners) {
      this.core.logger.log(`无效事件名: ${eventName}`, 'WARN');
      return false;
    }

    const byCallback = typeof identifier === 'function';
    const remaining = listeners.filter(listener => (byCallback ? listener.callback !== identifier : listener.description !== identifier));

    if (remaining.length === listeners.length) {
      this.core.logger.log(`未找到匹配的监听器: ${eventName} (标识符: ${byCallback ? '函数引用' : identifier})`, 'DEBUG');
      return false;
    }

    this.events.set(eventName, remaining);
    this.core.logger.log(`移除事件监听器: ${eventName}${byCallback ? ' (函数引用)' : ` (描述: ${identifier})`}`, 'DEBUG');

    return true;
  }

  public once(eventName: string, callback: EventCallback, description = ''): boolean {
    if (this.stickyArgs.has(eventName)) {
      this.callSticky(eventName, callback);
      return true;
    }

    const wrapper: EventCallback = (...args) => {
      this.off(eventName, wrapper);
      try {
        const result = callback(...args);
        const pending = result as Catchable | null | undefined;
        if (typeof pending?.catch === 'function') return pending.catch((error: unknown) => this.core.logger.log(`${eventName}事件once回调错误: ${this.error(error)}`, 'ERROR'));
        return result;
      } catch (error) {
        this.core.logger.log(`${eventName}事件once回调错误: ${this.error(error)}`, 'ERROR');
      }
    };

    return this.on(eventName, wrapper, description);
  }

  public async trigger(eventName: string, ...args: any[]): Promise<void> {
    if (this.stickyEvents.has(eventName)) this.stickyArgs.set(eventName, args);
    const listeners = this.events.get(eventName);
    if (listeners?.length) {
      for (let i = 0, length = listeners.length; i < length; i++) {
        try {
          const result = listeners[i].callback(...args);
          const pending = result as PromiseLike<unknown> | null | undefined;
          if (typeof pending?.then === 'function') await pending;
        } catch (error) {
          this.core.logger.log(`${eventName}事件处理错误: ${this.error(error)}`, 'ERROR');
        }
      }
    }

    const callbacks = this.afters.get(eventName);
    if (!callbacks?.length) return;
    this.afters.delete(eventName);
    for (const callback of callbacks) {
      try {
        const result = callback(...args);
        const pending = result as PromiseLike<unknown> | null | undefined;
        if (typeof pending?.then === 'function') await pending;
      } catch (error) {
        this.core.logger.log(`${eventName}事件after回调错误: ${this.error(error)}`, 'ERROR');
      }
    }
  }

  public after(eventName: string, callback: EventCallback): void {
    if (this.stickyArgs.has(eventName)) {
      this.callSticky(eventName, callback, 'after');
      return;
    }
    const callbacks = this.afters.get(eventName) ?? [];
    callbacks.push(callback);
    this.afters.set(eventName, callbacks);
  }

  private callSticky(eventName: string, callback: EventCallback, type: 'listener' | 'after' = 'listener'): void {
    const args = this.stickyArgs.get(eventName);
    if (!args) return;
    try {
      const result = callback(...args);
      const pending = result as Catchable | null | undefined;
      if (typeof pending?.catch === 'function') pending.catch((error: unknown) => this.core.logger.log(`${eventName} sticky ${type} error: ${this.error(error)}`, 'ERROR'));
    } catch (error) {
      this.core.logger.log(`${eventName} sticky ${type} error: ${this.error(error)}`, 'ERROR');
    }
  }

  private error(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

export default EventEmitter;
