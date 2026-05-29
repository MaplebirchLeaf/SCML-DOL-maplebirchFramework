// ./src/modules/ToolCollection.ts

import maplebirch, { MaplebirchCore, createlog } from '../core';
import * as utils from '../utils';
import Console from './Frameworks/consoleCheat';
import migration from './Frameworks/migration';
import randSystem from './Frameworks/randSystem';
import defineMacros from './Frameworks/macros';
import htmlTools from './Frameworks/htmlTools';
import { zonesManager, type InitFunction, type ZoneWidgetConfig } from './Frameworks/zonesManager';
import applyLinkZone from './Frameworks/applyLinkZone';
import Patch from './Frameworks/patch';

class ToolCollection {
  readonly console: Console;
  readonly migration: typeof migration;
  readonly rand: typeof randSystem;
  readonly macro: defineMacros;
  readonly text: htmlTools;
  readonly zone: zonesManager;
  readonly link: typeof applyLinkZone;
  readonly patch: typeof Patch;
  readonly createlog: typeof createlog = createlog;

  constructor(readonly core: MaplebirchCore) {
    this.console = Object.seal(new Console(this));
    this.migration = Object.freeze(migration);
    this.rand = Object.freeze(randSystem);
    this.macro = Object.freeze(new defineMacros(this));
    this.text = Object.seal(new htmlTools(this));
    this.zone = Object.seal(new zonesManager(this));
    this.link = Object.freeze(applyLinkZone);
    this.patch = Object.seal(Patch);
  }

  public onInit(...widgets: InitFunction[]) {
    return this.zone.onInit(...widgets);
  }

  public addTo(zone: string, ...widgets: (string | Function | ZoneWidgetConfig | [number, string | ZoneWidgetConfig])[]) {
    return this.zone.addTo(zone, ...widgets);
  }

  public preInit() {
    this.onInit(() => {
      this.patch.applyLocation();
      this.patch.applyBodywriting();
    });
  }

  public get utils(): typeof utils {
    return utils;
  }
}

(function (maplebirch): void {
  'use strict';
  maplebirch.register('tool', Object.seal(new ToolCollection(maplebirch)), ['dynamic']);
})(maplebirch);

export default ToolCollection;
