// .src/modules/Frameworks/macros.ts

import { createlog } from '../../core';
import ToolCollection from '../ToolCollection';

class defineMacros {
  readonly log: ReturnType<typeof createlog>;
  readonly macros: string[]
  readonly statFunctions: { [x: string]: Function };

  constructor(readonly manager: ToolCollection) {
    this.log = createlog('macro');
    this.macros = [];
    this.statFunctions = {};
  }

  get Macro() {
    return this.manager.core.SugarCube.Macro as typeof Macro;
  }

  define(macroName: string, macroFunction: Function, tags?: string[], skipArgs?: string[]|boolean, isAsync: boolean = false) {
    if (this.Macro.has(macroName)) { this.Macro.delete(macroName); this.log(`已删除现有宏: ${macroName}`, 'DEBUG'); }
    const log = this.log;
    this.Macro.add(macroName, {
      isAsync: isAsync ? true : false,
      isWidget: isAsync ? false : true,
      tags,
      skipArgs,
      handler() { try { macroFunction.apply(this, this.args); } catch (error) { log(`宏执行错误: ${macroName}\n${error}`, 'ERROR'); } },
    });
    const index = this.macros.indexOf(macroName);
    if (index === -1) { this.macros.push(macroName); }
    else { this.macros[index] = macroName; }
    this.log(`已定义/更新宏: ${macroName}`, 'DEBUG');
  }

  defineS(macroName: string, macroFunction: Function, tags?: string[], skipArgs?: string[]|boolean, maintainContext?: boolean) {
    this.define(
      macroName,
      function () { $(this.output).wiki(macroFunction.apply(maintainContext ? this : null, this.args)); },
      tags,
      skipArgs
    );
  }

  statChange(statType: string, amount: number, colorClass: string, condition: () => boolean = () => true): DocumentFragment {
    amount = Number(amount);
    if (V.settings.blindStatsEnabled || !condition()) return document.createDocumentFragment();
    const fragment = document.createDocumentFragment();
    const span = document.createElement('span');
    span.className = colorClass;
    const prefix = amount < 0 ? '- ' : '+ ';
    span.textContent = `${prefix.repeat(Math.abs(amount))}${statType}`;
    fragment.appendChild(document.createTextNode(' | '));
    fragment.appendChild(span);
    return fragment;
  }

  create(name: string, fn: Function) {
    if (!this.statFunctions[name] && !this.Macro.get(name)) {
      this.define(name, function() { this.output.append(fn(...this.args)); });
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

export default defineMacros