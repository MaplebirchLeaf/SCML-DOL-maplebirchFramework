// .src/modules/Frameworks/macros.ts

import { errorMessage } from '../../utils/error';
import { createlog, type MaplebirchCore } from '../../core';
import type { MacroContext } from '../../SugarCubeMacros';
import type ToolCollection from '../ToolCollection';
import dol from '../../host/Adapter';

export type MacroFunction<Args extends unknown[] = unknown[]> = (this: MacroContext, ...args: Args) => unknown;
type SimpleMacroFunction<Args extends unknown[]> = (this: MacroContext | null, ...args: Args) => unknown;
type StatFunction<Args extends unknown[] = unknown[]> = (...args: Args) => DocumentFragment;
type MacroTags = string[] | null | undefined;
type SkipArgs = string[] | boolean | null | undefined;

class defineMacros {
  public readonly log: ReturnType<typeof createlog>;
  public readonly macros: string[] = [];
  public readonly statFunctions: Record<string, StatFunction> = {};

  public constructor(readonly manager: ToolCollection) {
    this.log = createlog('macro');
  }

  public get Macro(): MaplebirchCore['SugarCube']['Macro'] {
    return this.manager.core.SugarCube.Macro;
  }

  public define<Args extends unknown[]>(macroName: string, macroFunction: MacroFunction<Args>, tags?: MacroTags, skipArgs?: SkipArgs, isAsync = false): void {
    if (!macroName || typeof macroFunction !== 'function') {
      this.log(`宏定义无效: ${macroName}`, 'WARN');
      return;
    }
    if (this.Macro.has(macroName)) {
      this.Macro.delete(macroName);
    }
    const log = this.log;
    this.Macro.add(macroName, {
      isAsync,
      isWidget: !isAsync,
      tags,
      skipArgs: skipArgs ?? undefined,
      handler(this: MacroContext) {
        try {
          const result = macroFunction.apply(this, this.args as Args);
          if (isAsync && result != null && (typeof result === 'object' || typeof result === 'function') && 'then' in result && typeof result.then === 'function')
            return Promise.resolve(result).catch((error: unknown) => log(`宏执行错误: ${macroName}\n${errorMessage(error)}`, 'ERROR', error));
          return result;
        } catch (error) {
          log(`宏执行错误: ${macroName}\n${errorMessage(error)}`, 'ERROR', error);
        }
      }
    });
    if (!this.macros.includes(macroName)) this.macros.push(macroName);
  }

  public defineS<Args extends unknown[]>(macroName: string, macroFunction: SimpleMacroFunction<Args>, tags?: MacroTags, skipArgs?: SkipArgs, maintainContext = false): void {
    this.define(
      macroName,
      function () {
        const result = macroFunction.apply(maintainContext ? this : null, this.args as Args);
        if (result == null) return;
        if (result instanceof Node) return this.output.append(result);
        $(this.output).wiki(String(result));
      },
      tags,
      skipArgs
    );
  }

  public statChange(statType: string, amount: number, colorClass: string, condition: () => boolean = () => true): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const value = Math.trunc(Number(amount));
    if (!Number.isFinite(value) || value === 0) return fragment;
    if (dol.variables.settings.blindStatsEnabled || !condition()) return fragment;
    const span = document.createElement('span');
    span.className = colorClass;
    span.textContent = `${value < 0 ? '- ' : '+ '}`.repeat(Math.abs(value)) + statType;
    fragment.appendChild(document.createTextNode(' | '));
    fragment.appendChild(span);
    return fragment;
  }

  public grace(amount: number, expectedRank?: string): DocumentFragment {
    const value = Math.trunc(Number(amount));
    const ranks = ['prospective', 'initiate', 'monk', 'priest', 'bishop'];
    const playerRank = ranks.indexOf(dol.variables.temple_rank);
    const expected = expectedRank == null ? -1 : ranks.indexOf(expectedRank);
    if (!Number.isFinite(value) || value === 0) return document.createDocumentFragment();
    if (dol.variables.settings.blindStatsEnabled) return document.createDocumentFragment();
    if (playerRank === -1) return document.createDocumentFragment();
    if (expected > 1 && playerRank >= expected) return document.createDocumentFragment();
    return this.statChange('Grace', value, value > 0 ? 'green' : 'red');
  }

  public create<Args extends unknown[]>(name: string, fn: StatFunction<Args>): void {
    if (!name || typeof fn !== 'function') {
      this.log(`状态显示函数无效: ${name}`, 'WARN');
      return;
    }
    if (this.statFunctions[name] || this.Macro.has(name)) {
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
