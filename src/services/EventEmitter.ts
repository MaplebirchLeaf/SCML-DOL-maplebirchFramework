// ./src/services/EventEmitter.ts

import type { MaplebirchCore } from '../core';

type EventCallback = (...args: any[]) => any;

type EventListener = {
  callback: EventCallback;
  description: string;
  internalId: string;
};

class EventEmitter {
  private readonly events: Map<string, EventListener[]>;
  private readonly afters: Map<string, EventCallback[]>;
  private readonly stickyEvents = new Set([':sugarcube', ':idbReady', ':storyready', ':modLoaderEnd', ':language']);
  private readonly stickyArgs = new Map<string, any[]>();

  public constructor(readonly core: MaplebirchCore) {
    // prettier-ignore
    this.events = new Map([
      [':indexedDB'      , []], // IDB数据库
      [':idbReady'       , []], // IDB数据库可读写
      [':import'         , []], // 数据导入
      [':variable'       , []], // V变量可注入时机
      [':onSave'         , []], // 存档
      [':onLoad'         , []], // 读档
      [':onLoadSave'     , []], // 加载存档
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
    this.afters = new Map();
  }

  public on(eventName: string, callback: EventCallback, description: string = ''): boolean {
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
    const internalId = description || `evt_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
    listeners.push({ callback, description, internalId });
    this.core.logger.log(`注册事件监听器: ${eventName}${description ? ` (描述: ${description})` : ''} (当前: ${listeners.length})`, 'DEBUG');
    this.callSticky(eventName, callback);
    return true;
  }

  public off(eventName: string, identifier: EventCallback | string): boolean {
    const listeners = this.events.get(eventName);
    if (!listeners) {
      this.core.logger.log(`无效事件名: ${eventName}`, 'WARN');
      return false;
    }
    const isFunc = typeof identifier === 'function';
    const length = listeners.length;
    for (let i = listeners.length - 1; i >= 0; i--) {
      const listener = listeners[i];
      if (isFunc ? listener.callback === identifier : listener.description === identifier || listener.internalId === identifier) listeners.splice(i, 1);
    }
    if (length === listeners.length) {
      this.core.logger.log(`未找到匹配的监听器: ${eventName} (标识符: ${isFunc ? '函数引用' : identifier})`, 'DEBUG');
      return false;
    }
    this.core.logger.log(`移除事件监听器: ${eventName}${isFunc ? ' (函数引用)' : ` (描述: ${identifier})`}`, 'DEBUG');
    return true;
  }

  public once(eventName: string, callback: EventCallback, description: string = ''): boolean {
    if (this.stickyArgs.has(eventName)) {
      this.callSticky(eventName, callback);
      return true;
    }
    let fired = false;
    const onceWrapper: EventCallback = async (...args) => {
      if (fired) return;
      fired = true;
      this.off(eventName, onceWrapper);
      try {
        return await callback(...args);
      } catch (error: any) {
        this.core.logger.log(`${eventName}事件once回调错误: ${error?.message || error}`, 'ERROR');
      }
    };
    return this.on(eventName, onceWrapper, description);
  }

  public async trigger(eventName: string, ...args: any[]): Promise<void> {
    if (this.stickyEvents.has(eventName)) this.stickyArgs.set(eventName, args);
    const listeners = this.events.get(eventName);
    if (listeners?.length) {
      const snapshot = [...listeners];
      for (let i = 0; i < snapshot.length; i++) {
        try {
          await snapshot[i].callback(...args);
        } catch (error: any) {
          this.core.logger.log(`${eventName}事件处理错误: ${error?.message || error}`, 'ERROR');
        }
      }
    }

    const callbacks = this.afters.get(eventName);
    if (callbacks?.length) {
      this.afters.delete(eventName);
      const snapshot = [...callbacks];
      for (let i = 0; i < snapshot.length; i++) {
        try {
          await snapshot[i](...args);
        } catch (error: any) {
          this.core.logger.log(`${eventName}事件after回调错误: ${error?.message || error}`, 'ERROR');
        }
      }
    }
  }

  public after(eventName: string, callback: EventCallback): void {
    if (this.stickyArgs.has(eventName)) {
      this.callSticky(eventName, callback, 'after');
      return;
    }
    let callbacks = this.afters.get(eventName);
    if (!callbacks) {
      callbacks = [];
      this.afters.set(eventName, callbacks);
    }
    callbacks.push(callback);
  }

  private callSticky(eventName: string, callback: EventCallback, type: 'listener' | 'after' = 'listener'): void {
    if (!this.stickyArgs.has(eventName)) return;
    try {
      const result = callback(...(this.stickyArgs.get(eventName) ?? []));
      if (result && typeof result.catch === 'function') result.catch((error: any) => this.core.logger.log(`${eventName} sticky ${type} error: ${error?.message || error}`, 'ERROR'));
    } catch (error: any) {
      this.core.logger.log(`${eventName} sticky ${type} error: ${error?.message || error}`, 'ERROR');
    }
  }
}

export default EventEmitter;
