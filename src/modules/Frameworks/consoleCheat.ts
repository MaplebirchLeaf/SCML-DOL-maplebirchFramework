// ./src/modules/Frameworks/ConsoleCheat.ts

import { createlog, type MaplebirchCore } from '../../core';
import ToolCollection from '../ToolCollection';
import TimeTravelCheat from './TimeTravelCheat';

interface JSExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  message: string;
  globals?: Record<string, any>;
}

interface TwineExecutionResult {
  success: boolean;
  error?: string;
  message: string;
  hasNavigation?: boolean;
  parsedContent?: string;
}

interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  message: string;
  globals?: Record<string, any>;
  hasNavigation?: boolean;
  parsedContent?: string;
}

class CheatConsole {
  private readonly log: ReturnType<typeof createlog>;
  private readonly core: MaplebirchCore;
  private readonly globals: Record<string, any> = {};
  public readonly timeTravel: TimeTravelCheat;

  private readonly jsStatus = '#js-cheat-console-status';
  private readonly twineStatus = '#twine-cheat-console-status';
  private readonly twineOutputs = ['#twine-cheat-console-output', '#your-output-container'];

  public constructor(readonly manager: ToolCollection) {
    this.log = createlog('console');
    this.core = manager.core;
    this.timeTravel = new TimeTravelCheat(this.core);
  }

  public executeJS(code: string = ''): JSExecutionResult {
    $(this.jsStatus).empty().removeClass('success error visible');
    if (typeof code !== 'string' || code.trim() === '') {
      const error = lanSwitch('Please enter valid JavaScript code.', '请输入有效的 JavaScript 代码。');
      const message = lanSwitch('Execution failed: Please enter valid JavaScript code.', '执行失败：请输入有效的 JavaScript 代码。');
      this.showStatus(this.jsStatus, message, false);
      return {
        success: false,
        error,
        message
      };
    }
    try {
      const result = this.runJavaScript(code);
      if (result instanceof Error) throw result;
      const hasReturn = /\breturn\b\s*[^;]*;?$|return;/.test(code);
      const message = hasReturn ? lanSwitch('Execution successful → ', '执行成功 → ') + this.format(result) : lanSwitch('Code executed.', '代码已执行。');
      this.showStatus(this.jsStatus, message, true);
      return {
        success: true,
        result,
        message,
        globals: this.globals
      };
    } catch (error: any) {
      const errorText = error?.message || lanSwitch('Unknown error', '未知错误');
      const message = lanSwitch('Execution error → ', '执行错误 → ') + errorText;
      this.showStatus(this.jsStatus, message, false);
      return {
        success: false,
        error: errorText,
        message
      };
    }
  }

  public executeTwine(code: string = ''): TwineExecutionResult {
    $(this.twineStatus).empty().removeClass('success error visible');
    if (typeof code !== 'string' || code.trim() === '') {
      const error = lanSwitch('Please enter valid Twine code.', '请输入有效的 Twine 代码。');
      const message = lanSwitch('Execution failed: Please enter valid Twine code.', '执行失败：请输入有效的 Twine 代码。');
      this.showStatus(this.twineStatus, message, false);
      return {
        success: false,
        error,
        message
      };
    }
    try {
      const fragment = document.createDocumentFragment();
      const hasOutputMacro = /<<(?:link|goto|display)\b/i.test(code);
      try {
        new this.core.SugarCube.Wikifier(fragment, code);
        if (hasOutputMacro) {
          const target = this.linkTarget(code);
          if (target) {
            this.showStatus(this.twineStatus, lanSwitch('Execution successful, redirecting...', '执行成功，即将跳转...'), true);
            setTimeout(() => this.core.SugarCube.Engine.play(target), 300);
            return {
              success: true,
              message: lanSwitch('Code executed successfully.', '代码执行成功。'),
              hasNavigation: true
            };
          }
          const output = this.twineOutputs.map(selector => document.querySelector(selector)).find(Boolean);
          if (output) output.appendChild(fragment.cloneNode(true));
          this.showStatus(this.twineStatus, lanSwitch('Execution successful', '执行成功'), true);
          return {
            success: true,
            message: lanSwitch('Code executed successfully.', '代码执行成功。'),
            hasNavigation: true,
            parsedContent: this.html(fragment)
          };
        }
        this.showStatus(this.twineStatus, lanSwitch('Execution successful', '执行成功'), true);
        return {
          success: true,
          message: lanSwitch('Code executed successfully.', '代码执行成功。'),
          parsedContent: this.html(fragment)
        };
      } catch (error: any) {
        const errorText = error?.message || lanSwitch('Wikifier parsing error', 'Wikifier 解析错误');
        const message = lanSwitch('Parsing error: ', '解析错误: ') + errorText;
        this.showStatus(this.twineStatus, message, false);
        this.log('Twine代码解析失败', 'ERROR', error);
        return {
          success: false,
          error: errorText,
          message
        };
      }
    } catch (error: any) {
      const errorText = error?.message || lanSwitch('Unknown error', '未知错误');
      const message = lanSwitch('Execution error: ', '执行错误: ') + errorText;
      this.showStatus(this.twineStatus, message, false);
      return {
        success: false,
        error: errorText,
        message
      };
    }
  }

  public execute(type: 'javascript' | 'twine', code?: string): ExecutionResult {
    if (type === 'javascript') return this.executeJS(code) as ExecutionResult;
    if (type === 'twine') return this.executeTwine(code) as ExecutionResult;
    const message = lanSwitch('Unknown execution type: ', '未知执行类型: ') + type;
    this.log(`未知执行类型: ${type as any}`, 'ERROR');
    return {
      success: false,
      error: message,
      message
    };
  }

  private runJavaScript(code: string): any {
    const scope: Record<string, any> = {
      C: window.C,
      V: window.V,
      T: window.T,
      global: this.globals
    };

    const scoped = new Proxy(scope, {
      has: () => true,

      get: (target: Record<string, any>, key: string | symbol) => {
        if (key === Symbol.unscopables) return undefined;
        if (typeof key === 'symbol') return undefined;
        if (key in target) return target[key];
        return (window as any)[key];
      },

      set: (target: Record<string, any>, key: string | symbol, value: any) => {
        if (typeof key === 'symbol') return false;
        if (key === 'C' || key === 'V' || key === 'T') {
          (window as any)[key] = value;
          target[key] = value;
          return true;
        }
        if (key === 'global') throw new Error(lanSwitch('Cannot override global', '不能覆盖 global'));
        if (key in window) {
          (window as any)[key] = value;
          return true;
        }
        this.globals[key] = value;
        return true;
      }
    });

    const body = `"use strict"; try { ${code} } catch(error) { return error; }`;

    try {
      const executor = new Function('scope', `with(scope) { return (function() { ${body} })(); }`);
      return executor(scoped);
    } catch (error) {
      return error;
    }
  }

  private linkTarget(code: string): string | null {
    const match = code.match(/<<link\s+(?:['"]([^'"]+)['"]\s*['"]([^'"]+)['"]|\[\[([^\]]+)\|([^\]]+)\]\]).*?>>/i);
    return match ? match[2] || match[4] || null : null;
  }

  private html(fragment: DocumentFragment): string {
    const container = document.createElement('div');
    container.appendChild(fragment.cloneNode(true));
    return container.innerHTML;
  }

  private format(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'function') return 'function';
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private showStatus(selector: string, message: string, success: boolean): void {
    const status = $(selector);
    status.text(message);
    status.removeClass('success error visible');
    status.addClass(success ? 'success visible' : 'error visible');
  }
}

export default CheatConsole;
