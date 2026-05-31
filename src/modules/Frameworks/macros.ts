// .src/modules/Frameworks/macros.ts

import { createlog, type MaplebirchCore } from '../../core';
import type { MacroContext } from '../../SugarCubeMacros';
import ToolCollection from '../ToolCollection';

export type MacroFunction = (this: MacroContext, ...args: any[]) => any;
type SimpleMacroFunction = (this: MacroContext | null, ...args: any[]) => any;
type StatFunction = (...args: any[]) => DocumentFragment;
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

  public define(macroName: string, macroFunction: MacroFunction, tags?: MacroTags, skipArgs?: SkipArgs, isAsync = false): void {
    if (!macroName || typeof macroFunction !== 'function') {
      this.log(`宏定义无效: ${macroName}`, 'WARN');
      return;
    }
    if (this.Macro.has(macroName)) {
      this.Macro.delete(macroName);
      this.log(`已删除现有宏: ${macroName}`, 'DEBUG');
    }
    const log = this.log;
    this.Macro.add(macroName, {
      isAsync,
      isWidget: !isAsync,
      tags,
      skipArgs,
      handler() {
        try {
          const result = macroFunction.apply(this, this.args);
          if (isAsync && result && typeof result.then === 'function') return result.catch((error: any) => log(`宏执行错误: ${macroName}\n${error?.message || error}`, 'ERROR', error));
          return result;
        } catch (error: any) {
          log(`宏执行错误: ${macroName}\n${error?.message || error}`, 'ERROR', error);
        }
      }
    });
    if (!this.macros.includes(macroName)) this.macros.push(macroName);
    this.log(`已定义/更新宏: ${macroName}`, 'DEBUG');
  }

  public defineS(macroName: string, macroFunction: SimpleMacroFunction, tags?: MacroTags, skipArgs?: SkipArgs, maintainContext = false): void {
    this.define(
      macroName,
      function () {
        const result = macroFunction.apply(maintainContext ? this : null, this.args);
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
    if (V.settings.blindStatsEnabled || !condition()) return fragment;
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
    const playerRank = ranks.indexOf(V.temple_rank);
    const expected = expectedRank == null ? -1 : ranks.indexOf(expectedRank);
    if (!Number.isFinite(value) || value === 0) return document.createDocumentFragment();
    if (V.settings.blindStatsEnabled) return document.createDocumentFragment();
    if (playerRank === -1) return document.createDocumentFragment();
    if (expected > 1 && playerRank >= expected) return document.createDocumentFragment();
    return this.statChange('Grace', value, value > 0 ? 'green' : 'red');
  }

  public create(name: string, fn: StatFunction): void {
    if (!name || typeof fn !== 'function') {
      this.log(`状态显示函数无效: ${name}`, 'WARN');
      return;
    }
    if (this.statFunctions[name] || this.Macro.has(name)) {
      this.log(`已存在名为 '${name}' 的函数或宏`, 'WARN');
      return;
    }
    this.statFunctions[name] = fn;
    this.define(name, function () {
      this.output.append(fn(...this.args));
    });
    this.log(`已创建状态显示函数: ${name}`, 'DEBUG');
  }

  public callStatFunction(name: string, ...args: any[]): DocumentFragment {
    const fn = this.statFunctions[name];
    if (fn) return fn(...args);
    this.log(`未找到状态显示函数: ${name}`, 'ERROR');
    return document.createDocumentFragment();
  }
}

export default defineMacros;
