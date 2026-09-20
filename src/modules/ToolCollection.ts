// ./src/modules/ToolCollection.ts

import maplebirch, { type MaplebirchCore, createlog } from '../core';
import Console from './Frameworks/ConsoleCheat';
import migration from './Frameworks/migration';
import randSystem from './Frameworks/RandSystem';
import defineMacros from './Frameworks/macros';
import htmlTools from './Frameworks/HtmlTools';
import { zonesManager, type InitFunction, type ZoneWidget } from './Frameworks/ZonesManager';
import applyLinkZone from './Frameworks/ApplyLinkZone';
import create, { type Patches } from './Frameworks/Patches';
import FrameworkConfigLoader, { type FrameworkConfig } from './Frameworks/Config';

class ToolCollection {
  public readonly console: Console;
  public readonly migration: typeof migration;
  public readonly rand: typeof randSystem;
  public readonly macro: defineMacros;
  public readonly text: htmlTools;
  public readonly zone: zonesManager;
  public readonly link: typeof applyLinkZone;
  public readonly patch: Patches;
  public readonly createlog: typeof createlog = createlog;

  public constructor(readonly core: MaplebirchCore) {
    this.console = Object.seal(new Console(this));
    this.migration = Object.freeze(migration);
    this.rand = Object.freeze(randSystem);
    this.macro = Object.freeze(new defineMacros(this));
    this.text = Object.seal(new htmlTools(core));
    this.zone = Object.seal(new zonesManager(this));
    this.link = Object.freeze(applyLinkZone);
    this.patch = create(core);
    const config = new FrameworkConfigLoader(core, this.patch, this.zone);
    this.core.addon.hook<FrameworkConfig | FrameworkConfig[]>('framework', task => config.apply(task));
  }

  public onInit(...widgets: InitFunction[]): void {
    this.zone.onInit(...widgets);
  }

  public addTo(zone: string, ...widgets: ZoneWidget[]): void {
    this.zone.addTo(zone, ...widgets);
  }

  public preInit(): void {
    this.core.addon.wikify('patches', {
      beforeWidget: (text, name) => this.patch.beforeWidget(name, text),
      afterWidget: (_text, name, _title, _passage, node) => this.patch.afterWidget(name, node)
    });
    this.onInit(() => this.patch.apply('init'));
  }
}

maplebirch.register('tool', Object.seal(new ToolCollection(maplebirch)), ['dynamic']);

export default ToolCollection;
