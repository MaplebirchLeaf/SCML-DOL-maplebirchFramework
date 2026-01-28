// @ts-check
/// <reference path='../../maplebirch.d.ts' />
(async() => {
  'use strict';

  class TimeStateManager {
    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.log = (/** @type {any} */message, level = 'DEBUG', /** @type {any} */...objects) => { core.logger.log(`[state] ${message}`, level, ...objects); };
      core.trigger(':state-init', this);
      this.passage = null;
      core.on(':passageinit', (/** @type {{ passage: any; }} */ev) => { this.passage = ev.passage; if (this.#shouldCollectPassage(this.passage)) this.log(`处理段落: ${this.passage.title}`, 'INFO'); });
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
      // @ts-ignore
      this.TimeManager.register(type, eventId, options);
    }

    /** @param {string} type @param {string} eventId */
    delTimeEvent(type, eventId) {
      // @ts-ignore
      this.TimeManager.unregister(type, eventId);
    }

    timeTravel(options = {}) {
      // @ts-ignore
      this.TimeManager.timeTravel(options);
    }

    get TimeEvents() {
      // @ts-ignore
      return this.TimeManager.timeEvents;
    }

    /** @param {string} type @param {string} eventId @param {any} options */
    regStateEvent(type, eventId, options) {
      // @ts-ignore
      this.StateManager.register(type, eventId, options);
    }

    /** @param {string} type @param {string} eventId */
    delStateEvent(type, eventId) {
      // @ts-ignore
      this.StateManager.unregister(type, eventId);
    }

    get StateEvents() {
      // @ts-ignore
      return this.StateManager.stateEvents;
    }

    async preInit() {
      // @ts-ignore
      this.TimeManager.initialize();
      // @ts-ignore
      this.StateManager.initialize();
    }
  }

  await maplebirch.register('state', new TimeStateManager(maplebirch), ['addon']);
})();