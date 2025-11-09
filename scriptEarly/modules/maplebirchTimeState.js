// @ts-check
/// <reference path='../../maplebirch.d.ts' />
(async() => {
  'use strict';
  if (!window.maplebirch) {
    console.log('%c[maplebirch] 错误: 核心系统未初始化', 'color: #C62828; font-weight: bold;');
    return;
  }

  const maplebirch = window.maplebirch;
  
  class TimeStateManager {
    constructor() {
      this.logger = maplebirch.logger;
      this.log = (/** @type {any} */message, level = 'DEBUG', /** @type {any} */...objects) => { this.logger.log(`[state] ${message}`, level, ...objects); };
      maplebirch.trigger(':state-init', this);
      const constructor = 
      /** @type {typeof TimeStateManager & {TimeManager: new (manager: TimeStateManager) => any; StateManager: new (manager: TimeStateManager) => any; solarEclipse: new (manager: TimeStateManager, data: any) => any;}} */
      (this.constructor);
      this.TimeManager = new constructor.TimeManager(this);
      this.StateManager = new constructor.StateManager(this);

      this.passage = null;
      this.savedata = {};
      maplebirch.once(':tool-init', (/** @type {any} */data) => this.solarEclipse = new constructor.solarEclipse(this, data));
    }

    /** @param {{ saveId?: number|string; }} variables */
    receiveVariables(variables) {
      this.savedata = variables;
      this.log(`接收存档数据: ${variables.saveId || 'default'}`, 'DEBUG');
    }

    /** @param {{ tags: string|string[]; }} passage */
    #shouldCollectPassage(passage) {
      return passage && !passage.tags.includes('widget');
    }

    get Passage() {
      return this.passage;
    }

    /** @param {string} type @param {string} eventId @param {any} options */
    regTimeEvent(type, eventId, options) {
      this.TimeManager.register(type, eventId, options);
    }

    /** @param {string} type @param {string} eventId */
    delTimeEvent(type, eventId) {
      this.TimeManager.unregister(type, eventId);
    }

    timeTravel(options = {}) {
      this.TimeManager.timeTravel(options = {});
    }

    get TimeEvents() {
      return this.TimeManager.timeEvents;
    }

    /** @param {string} type @param {string} eventId @param {any} options */
    regStateEvent(type, eventId, options) {
      this.StateManager.register(type, eventId, options);
    }

    /** @param {string} type @param {string} eventId */
    delStateEvent(type, eventId) {
      this.StateManager.unregister(type, eventId);
    }

    get StateEvents() {
      return this.StateManager.stateEvents;
    }

    async preInit() {
      maplebirch.on(':passageinit', (/** @type {{ passage: any; }} */ev) => {
        this.passage = ev.passage;
        if (this.#shouldCollectPassage(this.passage)) this.log(`处理段落: ${this.passage.title}`, 'INFO');
      });
      maplebirch.on(':loadSaveData', (/** @type {{ variables: { saveId?: number|string; }; }} */ State) => this.receiveVariables(State.variables));
      maplebirch.on(':onSave', (/** @type {{ variables: { saveId?: number|string; }; }} */ State) => this.receiveVariables(State.variables));
      maplebirch.on(':storyready', (/** @type {{ variables: { saveId?: number|string; }; }} */ State) => this.receiveVariables(State.variables));
      this.TimeManager.initialize();
      this.StateManager.initialize();
    }

    Init() {
      
    }
  }

  await maplebirch.register('state', new TimeStateManager(), []);
})();