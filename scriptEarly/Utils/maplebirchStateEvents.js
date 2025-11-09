// @ts-expect-error
/// <reference path='../../maplebirch.d.ts' />
(async() => {
  'use strict';
  const maplebirch = window.maplebirch;

  /**
   * 状态事件
   * @param {string} id - 事件唯一标识符
   * @param {string} type - 事件类型（'interrupt', 'overlay'）
   * @param {Object} [options={}] - 事件配置选项
   */
  class StateEvent {
    constructor(id, type, options = {}) {
      this.id = id;
      this.type = type;
      this.output = options.output;             // 事件触发时输出的文本内容
      this.action = options.action;             // 事件触发时执行的回调函数
      this.cond = options.cond || (() => true); // 事件触发条件检查函数
      this.priority = options.priority || 0;    // 事件优先级（数值越大优先级越高）
      this.once = !!options.once;               // 是否一次性事件
      this.forceExit = !!options.forceExit;     // 是否强制中断（添加<<exitAll>>）
      this.extra = options.extra || {};         // 段落过滤配置
    }

    #checkPassage(passageName) {
      if (!passageName) return true;
      const { passage, exclude, match } = this.extra;
      if (passage && Array.isArray(passage) && passage.length > 0) if (!passage.includes(passageName)) return false;
      if (exclude && Array.isArray(exclude) && exclude.length > 0) if (exclude.includes(passageName)) return false;
      if (match && match instanceof RegExp) if (!match.test(passageName)) return false;
      return true;
    }

    tryRun() {
      if (!this.#checkPassage(passageName)) return null;
      if (!!this.cond()) return [!!this.output, !!this.action, this.#check()];
      return null
    }

    #check() {
      let ok = false;
      try { ok = !!this.cond();}
      catch (e) {
        maplebirch.log(`[StateEvent:${this.id}] cond error:`, 'ERROR', e);
        return false;
      }
      if (!ok) return false;
      if (this.action) {
        try { this.action(); }
        catch (e) { maplebirch.log(`[StateEvent:${this.id}] action error:`, 'ERROR', e); }
      }
      return !!this.once;
    }
  }

  class StateManager {
    static StateEvent = StateEvent;

    constructor(manager) {
      this.manager = manager;
      this.log = manager.log;

      this.eventTypes = [
        'interrupt', // 页首
        'overlay',   // 页尾
      ];

      this.stateEvents = {};
      this.eventTypes.forEach(type => this.stateEvents[type] = new Map());
    }

    trigger(type) {
      const passageName = this.manager.Passage;
      if (type === 'interrupt') return this.#processInterruptEvents(passageName);
      if (type === 'overlay') return this.#processOverlayEvents(passageName);
      return false;
    }

    #processInterruptEvents(passageName) {
      const interruptEvents = this.stateEvents['interrupt'];
      if (!interruptEvents || interruptEvents.size === 0) return '';
      const sortedEvents = Array.from(interruptEvents.values()).sort((a, b) => b.priority - a.priority);
      for (const event of sortedEvents) {
        const result = event.tryRun(passageName);
        if (result) {
          const [hasOutput, hasAction, shouldRemove] = result;
          if (hasOutput && event.output) {
            if (shouldRemove) this.unregister('interrupt', event.id);
            if (event.forceExit) { return `<<${event.output}>><<exitAll>>`; }
            else { return `<<${event.output}>>`; }
          }
        }
      }
      return '';
    }

    #processOverlayEvents(passageName) {
      const overlayEvents = this.stateEvents['overlay'];
      if (!overlayEvents || overlayEvents.size === 0) return '';
      const outputs = [];
      const toRemove = [];
      const sortedEvents = Array.from(overlayEvents.values()).sort((a, b) => b.priority - a.priority);
      for (const event of sortedEvents) {
        const result = event.tryRun(passageName);
        if (result) {
          const [hasOutput, hasAction, shouldRemove] = result;
          if (hasOutput && event.output) outputs.push(`<<${event.output}>>`);
          if (shouldRemove) toRemove.push(event.id);
        }
      }
      for (const eventId of toRemove) this.unregister('overlay', eventId);
      return outputs.length > 0 ? outputs.join('') : '';
    }

    register(type, eventId, options) {
      if (!this.eventTypes.includes(type)) { this.log(`未知的状态事件类型: ${type}`, 'ERROR'); return false; }
      if (this.stateEvents[type].has(eventId)) { this.log(`事件ID已存在: ${type}.${eventId}`, 'WARN'); return false; }
      this.stateEvents[type].set(eventId, new StateEvent(eventId, type, options));
      this.log(`注册状态事件: ${type}.${eventId}`, 'DEBUG');
      return true;
    }

    unregister(type, eventId) {
      if (!this.stateEvents[type]) { this.log(`事件类型不存在: ${type}`, 'WARN'); return false; }
      if (this.stateEvents[type].delete(eventId)) { this.log(`注销时间事件: ${type}.${eventId}`, 'DEBUG'); return true; }
      this.log(`未找到事件: ${type}.${eventId}`, 'DEBUG');
      return false;
    }

    _makeMacroHandler() {
      const self = this;
      return function () {
        const type = this.args && this.args.length ? this.args[0] : null;
        if (!type) { this.error('宏调用缺少类型参数'); return; }
        const macroString = self.trigger(type);
        if (macroString) {
          if (typeof $.wiki === 'function') {
            $(this.output).wiki(macroString);
          } else if (typeof Wikifier !== 'undefined') {
            new Wikifier(this.output, macroString);
          } else {
            this.output.innerHTML += macroString;
          }
          self.log(`渲染宏内容: ${macroString}`, 'DEBUG');
        }
      };
    }

    initialize() {
      maplebirch.once(':definewidget', () => {
        maplebirch.tool.widget.defineMacro('maplebirchMonitor', this._makeMacroHandler());
      });
    }
  }

  maplebirch.once(':state-init', (data) => Object.assign(data.constructor, { StateManager: Object.freeze(StateManager) }));
})();