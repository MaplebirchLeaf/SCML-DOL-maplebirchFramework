import type { MaplebirchCore } from '../core';
import type { ScopedLog } from '../infra/Diagnostics';
import Console from './Frameworks/ConsoleCheat';
import migration from './Frameworks/migration';
import randSystem from './Frameworks/RandSystem';
import defineMacros, { type MacroFunction, type SimpleMacroFunction, type MacroTags, type SkipArgs } from './Frameworks/macros';
import htmlTools from './Frameworks/HtmlTools';
import { zonesManager, type InitFunction, type ZoneWidget } from './Frameworks/ZonesManager';
import applyLinkZone from './Frameworks/ApplyLinkZone';
import Patch from './Frameworks/Patch';
import Diagnostics from '../infra/Diagnostics';

type ToolConstructors = {
  console?: new (manager: ToolCollection) => Console;
  macro?: new (manager: ToolCollection) => defineMacros;
};

class ToolCollection {
  public readonly log!: ScopedLog;
  public readonly console: Console;
  public readonly migration: typeof migration = Object.freeze(migration);
  public readonly rand: typeof randSystem = Object.freeze(randSystem);
  public readonly macro: defineMacros;
  public readonly text: htmlTools;
  public readonly zone: zonesManager;
  public readonly link: typeof applyLinkZone = Object.freeze(applyLinkZone);
  public readonly patch: Patch;

  public constructor(
    readonly core: MaplebirchCore,
    constructors: ToolConstructors = {}
  ) {
    this.console = Object.seal(new (constructors.console ?? Console)(this));
    this.macro = Object.freeze(new (constructors.macro ?? defineMacros)(this)) as defineMacros;
    this.text = Object.seal(new htmlTools(core));
    this.zone = Object.seal(new zonesManager(core));
    this.patch = new Patch((name, error) => core.infra.diagnostics.record(`Patch ${name}: ${Diagnostics.message(error)}`, 'ERROR', 'patch', error));
  }

  public onInit(...widgets: InitFunction[]): void {
    this.zone.onInit(...widgets);
  }

  public define<Args extends unknown[]>(name: string, fn: MacroFunction<Args>, tags?: MacroTags, skipArgs?: SkipArgs, isAsync = false): void {
    this.macro.define(name, fn, tags, skipArgs, isAsync);
  }

  public defineS<Args extends unknown[]>(name: string, fn: SimpleMacroFunction<Args>, tags?: MacroTags, skipArgs?: SkipArgs, maintainContext = false): void {
    this.macro.defineS(name, fn, tags, skipArgs, maintainContext);
  }

  public addTo(zone: string, ...widgets: ZoneWidget[]): void {
    this.zone.addTo(zone, ...widgets);
  }

  public inject(...databases: Parameters<zonesManager['inject']>): void {
    this.zone.inject(...databases);
  }
}

export default ToolCollection;
