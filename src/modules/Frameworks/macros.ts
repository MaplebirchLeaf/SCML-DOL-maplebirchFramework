// .src/modules/Frameworks/macros.ts

import Diagnostics from '../../infra/Diagnostics';
import type { MaplebirchCore } from '../../core';
import type { ScopedLog } from '../../infra/Diagnostics';
import type { MacroContext } from '../../macros';
import type ToolCollection from '../ToolCollection';
import type { MacroDefinition } from 'twine-sugarcube';

export type MacroFunction<Args extends unknown[] = unknown[]> = (this: MacroContext, ...args: Args) => unknown;
export type SimpleMacroFunction<Args extends unknown[]> = (this: MacroContext | null, ...args: Args) => unknown;
type StatFunction<Args extends unknown[] = unknown[]> = (...args: Args) => DocumentFragment;
export type MacroTags = string[] | null | undefined;
export type SkipArgs = string[] | boolean | null | undefined;
export type MacroPhase = 'sugarcube' | 'storyready';

class defineMacros {
  public readonly log: ScopedLog;
  public readonly macros: string[] = [];
  public readonly statFunctions: Record<string, StatFunction> = {};
  private readonly definitions = new Map<string, { definition: MacroDefinition; phase: MacroPhase }>();
  private readonly ready = new Set<MacroPhase>();

  public constructor(readonly manager: ToolCollection) {
    this.log = manager.core.infra.diagnostics.scoped('macro');
    manager.core.once(':sugarcube', () => {
      this.ready.add('sugarcube');
      this.installAll('sugarcube');
    });
    manager.core.once(':storyready', () => {
      this.ready.add('storyready');
      this.installAll('storyready');
    });
  }

  public get Macro(): ReturnType<MaplebirchCore['host']['sugarcube']['require']>['Macro'] {
    return this.manager.core.host.sugarcube.require().Macro;
  }

  public define<Args extends unknown[]>(macroName: string, macroFunction: MacroFunction<Args>, tags?: MacroTags, skipArgs?: SkipArgs, isAsync = false, phase: MacroPhase = 'sugarcube'): void {
    if (!macroName || typeof macroFunction !== 'function') {
      this.log(`宏定义无效: ${macroName}`, 'WARN');
      return;
    }
    const log = this.log;
    const definition = {
      isAsync,
      isWidget: !isAsync,
      tags,
      skipArgs: skipArgs ?? undefined,
      handler(this: MacroContext) {
        try {
          const result = macroFunction.apply(this, this.args as Args);
          if (isAsync && result != null && (typeof result === 'object' || typeof result === 'function') && 'then' in result && typeof result.then === 'function')
            return Promise.resolve(result).catch((error: unknown) => log(`宏执行错误: ${macroName}\n${Diagnostics.message(error)}`, 'ERROR', error));
          return result;
        } catch (error) {
          log(`宏执行错误: ${macroName}\n${Diagnostics.message(error)}`, 'ERROR', error);
        }
      }
    };
    const registration = definition as unknown as MacroDefinition;
    this.definitions.set(macroName, { definition: registration, phase });
    if (!this.macros.includes(macroName)) this.macros.push(macroName);
    if (this.ready.has('storyready') || this.ready.has(phase)) this.install(macroName, registration);
  }

  private installAll(phase: MacroPhase): void {
    for (const [name, entry] of this.definitions) if (entry.phase === phase) this.install(name, entry.definition);
  }

  private install(name: string, definition: MacroDefinition): void {
    const macro = this.Macro;
    if (macro.has(name)) macro.delete(name);
    macro.add(name, definition);
  }

  public defineS<Args extends unknown[]>(
    macroName: string,
    macroFunction: SimpleMacroFunction<Args>,
    tags?: MacroTags,
    skipArgs?: SkipArgs,
    maintainContext = false,
    phase: MacroPhase = 'sugarcube'
  ): void {
    this.define(
      macroName,
      function () {
        const result = macroFunction.apply(maintainContext ? this : null, this.args as Args);
        if (result == null) return;
        if (result instanceof Node) return this.output.append(result);
        $(this.output).wiki(String(result));
      },
      tags,
      skipArgs,
      false,
      phase
    );
  }

  public create<Args extends unknown[]>(name: string, fn: StatFunction<Args>): void {
    if (!name || typeof fn !== 'function') {
      this.log(`状态显示函数无效: ${name}`, 'WARN');
      return;
    }
    if (this.statFunctions[name] || this.definitions.has(name) || this.manager.core.host.sugarcube.runtime?.Macro.has(name)) {
      this.log(`已存在名为 '${name}' 的函数或宏`, 'WARN');
      return;
    }
    this.statFunctions[name] = fn as StatFunction;
    this.define(name, function () {
      this.output.append(fn(...(this.args as Args)));
    });
  }

  public callStatFunction(name: string, ...args: unknown[]): DocumentFragment {
    const fn = this.statFunctions[name];
    if (fn) return fn(...args);
    this.log(`未找到状态显示函数: ${name}`, 'ERROR');
    return document.createDocumentFragment();
  }
}

export default defineMacros;
