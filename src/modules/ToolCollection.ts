// ./src/modules/ToolCollection.ts

import maplebirch, { MaplebirchCore } from '../core';
import * as utils from '../utils';
import migration from './Frameworks/migration';
import randSystem from './Frameworks/randSystem';
import defineMacros from './Frameworks/macros';
import htmlTools from './Frameworks/htmlTools';
import { zonesManager, InitFunction, ZoneWidgetConfig } from './Frameworks/zonesManager';
import applyLinkZone from './Frameworks/applyLinkZone';
import otherTools from './Frameworks/otherTools';

class ToolCollection {
  readonly utils: typeof utils;
  readonly migration: typeof migration;
  readonly rand: typeof randSystem;
  readonly macro: defineMacros;
  readonly text: htmlTools;
  readonly zone: zonesManager;
  readonly link: typeof applyLinkZone;
  readonly other: typeof otherTools;

  constructor (readonly core: MaplebirchCore) {
    this.utils = Object.freeze(utils);
    this.migration = Object.freeze(migration);
    this.rand = Object.freeze(randSystem);
    this.macro = Object.freeze(new defineMacros(this));
    this.text = Object.freeze(new htmlTools(this));
    this.zone = Object.seal(new zonesManager(this));
    this.link = Object.freeze(applyLinkZone);
    this.other = Object.freeze(otherTools);
  }

  onInit(...widgets: (InitFunction[])) {
    return this.zone.onInit(...widgets);
  }

  addTo(zone: string, ...widgets: (string | Function | ZoneWidgetConfig | [number, string | ZoneWidgetConfig])[]) {
    return this.zone.addTo(zone, ...widgets);
  }

  preInit() {
    this.onInit(() => {
      this.other.applyLocation();
      this.other.applyBodywriting();
    });
  }
}

(async function(maplebirch) {
  'use strict';
  await maplebirch.register('tool', Object.seal(new ToolCollection(maplebirch)), ['dynamic']);
})(maplebirch)

export default ToolCollection