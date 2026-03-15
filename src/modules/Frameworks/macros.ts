// .src/modules/Frameworks/macros.ts

import { createlog, MaplebirchCore } from '../../core';
import ToolCollection from '../ToolCollection';

class defineMacros {
  readonly log: ReturnType<typeof createlog>;
  readonly macros: string[];
  readonly statFunctions: { [x: string]: Function };

  constructor(readonly manager: ToolCollection) {
    this.log = createlog('macro');
    this.macros = [];
    this.statFunctions = {};
  }

  get Macro(): MaplebirchCore['SugarCube']['Macro'] {
    return this.manager.core.SugarCube.Macro;
  }

  define(macroName: string, macroFunction: Function, tags?: string[], skipArgs?: string[] | boolean, isAsync: boolean = false) {
    if (this.Macro.has(macroName)) {
      this.Macro.delete(macroName);
      this.log(`已删除现有宏: ${macroName}`, 'DEBUG');
    }
    const log = this.log;
    this.Macro.add(macroName, {
      isAsync: isAsync ? true : false,
      isWidget: isAsync ? false : true,
      tags,
      skipArgs,
      handler() {
        try {
          macroFunction.apply(this, this.args);
        } catch (error) {
          log(`宏执行错误: ${macroName}\n${error}`, 'ERROR');
        }
      }
    });
    const index = this.macros.indexOf(macroName);
    if (index === -1) {
      this.macros.push(macroName);
    } else {
      this.macros[index] = macroName;
    }
    this.log(`已定义/更新宏: ${macroName}`, 'DEBUG');
  }

  defineS(macroName: string, macroFunction: Function, tags?: string[], skipArgs?: string[] | boolean, maintainContext?: boolean) {
    this.define(
      macroName,
      function () {
        $(this.output).wiki(macroFunction.apply(maintainContext ? this : null, this.args));
      },
      tags,
      skipArgs
    );
  }

  statChange(statType: string, amount: number, colorClass: string, condition: () => boolean = () => true): DocumentFragment {
    const fragment = document.createDocumentFragment();
    amount = Math.trunc(Number(amount));
    if (!Number.isFinite(amount) || amount === 0) return fragment;
    if (V.settings.blindStatsEnabled || !condition()) return fragment;
    const span = document.createElement('span');
    span.className = colorClass;
    const prefix = amount < 0 ? '- ' : '+ ';
    span.textContent = `${prefix.repeat(Math.abs(amount))}${statType}`;
    fragment.appendChild(document.createTextNode(' | '));
    fragment.appendChild(span);
    return fragment;
  }

  grace(amount: number, expectedRank?: string): DocumentFragment {
    const fragment = document.createDocumentFragment();
    amount = Math.trunc(Number(amount));
    if (!Number.isFinite(amount) || amount === 0) return fragment;
    if (V.settings.blindStatsEnabled) return fragment;
    let displayGrace = true;
    const ranks = ['prospective', 'initiate', 'monk', 'priest', 'bishop'];
    const playerRankValue = ranks.indexOf(V.temple_rank);
    const expectedRankValue = expectedRank == null ? -1 : ranks.indexOf(expectedRank);
    if (playerRankValue === -1) displayGrace = false;
    if (expectedRankValue > 1) if (playerRankValue >= expectedRankValue) displayGrace = false;
    if (!displayGrace) return fragment;
    return this.statChange('Grace', amount, amount > 0 ? 'green' : 'red');
  }

  create(name: string, fn: Function) {
    if (!this.statFunctions[name] && !this.Macro.get(name)) {
      this.define(name, function () {
        this.output.append(fn(...this.args));
      });
      this.statFunctions[name] = fn;
      this.log(`已创建状态显示函数: ${name}`, 'DEBUG');
    } else {
      this.log(`已存在名为'${name}'的函数`, 'WARN');
    }
  }

  callStatFunction(name: string, ...args: any[]): DocumentFragment {
    if (this.statFunctions[name]) return this.statFunctions[name](...args);
    this.log(`未找到状态显示函数: ${name}`, 'ERROR');
    return document.createDocumentFragment();
  }
}

export default defineMacros;
