// ./src/services/EventEmitter.ts

import { MaplebirchCore } from '../core';

type EventCallback = (...args: any[]) => any;

type EventListener = {
  callback: EventCallback;
  description: string;
  internalId: string;
};

class EventEmitter {
  private readonly events: Map<string, EventListener[]>;
  private readonly afters: Map<string, EventCallback[]>;

  constructor(readonly core: MaplebirchCore) {
    this.events = new Map([
      [':IndexedDB'      , []], // IDB数据库
      [':import'         , []], // 数据导入
      [':allModule'      , []], // 所有模块注册
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

  on(eventName: string, callback: EventCallback, description: string = ''): boolean {
    let listeners = this.events.get(eventName);
    if (!listeners) {
      listeners = [];
      this.events.set(eventName, listeners);
      this.core.logger.log(`创建新事件类型: ${eventName}`, 'DEBUG');
    }
    if (this.core.lodash.some(listeners, listener => listener.callback === callback)) {
      this.core.logger.log(`回调函数已注册: ${eventName} (跳过重复)`, 'DEBUG');
      return false;
    }
    const internalId = description || `evt_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
    listeners.push({ callback, description, internalId });
    this.core.logger.log(
      `注册事件监听器: ${eventName}${description ? ` (描述: ${description})` : ''} (当前: ${listeners.length})`, 
      'DEBUG'
    );
    return true;
  }

  off(eventName: string, identifier: EventCallback | string): boolean {
    const listeners = this.events.get(eventName);
    if (!listeners) {
      this.core.logger.log(`无效事件名: ${eventName}`, 'WARN');
      return false;
    }
    const isFunc = this.core.lodash.isFunction(identifier);
    const Length = listeners.length;
    this.core.lodash.remove(listeners, listener => isFunc ? listener.callback === identifier : (listener.description === identifier || listener.internalId === identifier));
    const removed = Length !== listeners.length;
    if (removed) {
      this.core.logger.log(`移除事件监听器: ${eventName}${isFunc ? ' (函数引用)' : ` (描述: ${identifier})`}`, 'DEBUG');
      return true;
    }
    this.core.logger.log(`未找到匹配的监听器: ${eventName} (标识符: ${isFunc ? '函数引用' : identifier})`, 'DEBUG');
    return false;
  }

  once(eventName: string, callback: EventCallback, description: string = ''): boolean {
    const onceWrapper: EventCallback = (...args) => {
      try { 
        const result = callback(...args);
        if (result instanceof Promise) { result.finally(() => this.off(eventName, onceWrapper)); }
        else { this.off(eventName, onceWrapper); }
      } catch (error: any) {
        this.core.logger.log(`${eventName}事件once回调错误: ${error.message}`, 'ERROR');
        this.off(eventName, onceWrapper);
      }
    };
    return this.on(eventName, onceWrapper, description);
  }

  async trigger(eventName: string, ...args: any[]): Promise<void> {
    const listeners = this.events.get(eventName);
    if (listeners && listeners.length > 0) {
      const snapshot = this.core.lodash.clone(listeners);
      for (let i = 0; i < snapshot.length; i++) {
        const listener = snapshot[i];
        try {
          const result = listener.callback(...args);
          if (result instanceof Promise) await result;
        } catch (error: any) {
          this.core.logger.log(`${eventName}事件处理错误: ${error.message}`, 'ERROR');
        }
      }
    }

    const callbacks = this.afters.get(eventName);
    if (callbacks) {
      for (let i = 0; i < callbacks.length; i++) {
        try {
          const result = callbacks[i](...args);
          if (result instanceof Promise) await result;
        } catch (error: any) {
          this.core.logger.log(`${eventName}事件after回调错误: ${error.message}`, 'ERROR');
        }
      }
      this.afters.delete(eventName);
    }
  }

  after(eventName: string, callback: EventCallback): void {
    let callbacks = this.afters.get(eventName);
    if (!callbacks) {
      callbacks = [];
      this.afters.set(eventName, callbacks);
    }
    callbacks.push(callback);
  }
}

export default EventEmitter