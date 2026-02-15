// .src/modules/Frameworks/console.ts

import { createlog, MaplebirchCore } from '../../core';
import ToolCollection from '../ToolCollection';

interface ExecuteJSResult {
  success: boolean;
  result?: any;
  error?: string;
  message: string;
  globals?: Record<string, any>;
}

interface ExecuteTwineResult {
  success: boolean;
  error?: string;
  message: string;
  hasNavigation?: boolean;
  parsedContent?: string;
}

interface ExecuteResult {
  success: boolean;
  result?: any;
  error?: string;
  message: string;
  globals?: Record<string, any>;
  hasNavigation?: boolean;
  parsedContent?: string;
}

class Console {
  private readonly log: (...args: any[]) => void;
  private readonly core: MaplebirchCore;
  private readonly globalNamespace: Record<string, any> = {};

  constructor(readonly manager: ToolCollection) {
    this.log = createlog('console');
    this.core = manager.core;
  }

  executeJS(): ExecuteJSResult {
    let result: any;
    const code = T?.maplebirchJSCheatConsole as string;
    const statusElement = $('#js-cheat-console-status');
    statusElement.empty().removeClass('success error visible');

    if (typeof code !== 'string' || code.trim() === '') {
      this._updateJSStatus(lanSwitch('Execution failed: Please enter valid JavaScript code.', '执行失败：请输入有效的 JavaScript 代码。'), false);
      return {
        success: false,
        error: lanSwitch('Please enter valid JavaScript code.', '请输入有效的 JavaScript 代码。'),
        message: lanSwitch('Execution failed: Please enter valid JavaScript code.', '执行失败：请输入有效的 JavaScript 代码。')
      };
    }

    try {
      result = this._executeJSCode(code);
      if (result instanceof Error) throw result;
      const hasExplicitReturn = /\breturn\b\s*[^;]*;?$|return;/.test(code);
      const message = hasExplicitReturn ? lanSwitch('Execution successful → ', '执行成功 → ') + this._formatResult(result) : lanSwitch('Code executed.', '代码已执行。');
      this._updateJSStatus(message, true);
      return {
        success: true,
        result: result,
        message: message,
        globals: this.globalNamespace
      };
    } catch (error: any) {
      const errorMsg = error.message || lanSwitch('Unknown error', '未知错误');
      const message = lanSwitch('Execution error → ', '执行错误 → ') + errorMsg;
      this._updateJSStatus(message, false);
      return {
        success: false,
        error: errorMsg,
        message: message
      };
    }
  }

  private _updateJSStatus(message: string, isSuccess: boolean): void {
    const statusElement = $('#js-cheat-console-status');
    statusElement.text(message);
    statusElement.removeClass('success error visible');
    statusElement.addClass(isSuccess ? 'success visible' : 'error visible');
  }

  private _executeJSCode(code: string): any {
    const sandbox: Record<string, any> = {
      Math: Object.freeze(Math),
      JSON: Object.freeze(JSON),
      Date: Object.freeze(Date),
      String: Object.freeze(String),
      Number: Object.freeze(Number),
      Array: Object.freeze(Array),
      Object: Object.freeze(Object),
      global: this.globalNamespace,
    };

    const builtins = [
      'Boolean', 'RegExp', 'Error', 'EvalError', 'RangeError',
      'ReferenceError', 'SyntaxError', 'TypeError', 'URIError',
      'Function', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet',
      'Symbol', 'Proxy', 'Reflect', 'Intl', 'ArrayBuffer',
      'SharedArrayBuffer', 'DataView', 'Float32Array', 'Float64Array',
      'Int8Array', 'Int16Array', 'Int32Array', 'Uint8Array',
      'Uint8ClampedArray', 'Uint16Array', 'Uint32Array',
      'BigInt', 'BigInt64Array', 'BigUint64Array'
    ];

    builtins.forEach(name => {
      if (window[name]) sandbox[name] = Object.freeze(window[name]);
    });

    [Object, Array, Function, Number, String, Date, Boolean,
      RegExp, Error, Promise, Map, Set].forEach(ctor => {
        if (ctor && ctor.prototype) Object.freeze(ctor.prototype);
      });

    const sandboxProxy = new Proxy(sandbox, {
      has: () => true,
      get: (target: any, prop: string | symbol) => {
        if (prop === Symbol.unscopables) return undefined;
        if (prop in target) return target[prop];
        if (prop in window) return window[prop];
        return undefined;
      },
      set: (target: any, prop: string | symbol, value: any) => {
        if (prop in target)
          throw new Error(lanSwitch(`Cannot modify built-in object: ${String(prop)}`, `不能修改内置对象: ${String(prop)}`));
        if (prop === 'global')
          throw new Error(lanSwitch('Cannot override global namespace', '不能覆盖 global 命名空间'));
        if (prop in window) {
          const descriptor = Object.getOwnPropertyDescriptor(window, prop);
          if (descriptor && descriptor.writable === false) throw new Error(lanSwitch(`Cannot modify read-only property: ${String(prop)}`, `不能修改只读属性: ${String(prop)}`));
          window[prop] = value;
          return true;
        }
        target.global[prop] = value;
        return true;
      }
    });

    const wrappedCode = `"use strict";try {${code}} catch(e) {return e;}`;
    try {
      const executor = new Function('sandbox', `with(sandbox) {return (function() {${wrappedCode}})();}`);
      return executor(sandboxProxy);
    } catch (error) {
      return error;
    }
  }

  private _formatResult(result: any): string {
    if (result === null) return 'null';
    if (result === undefined) return 'undefined';
    if (typeof result === 'function') return 'function';
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return String(result);
    }
  }

  executeTwine(): ExecuteTwineResult {
    const code = T?.maplebirchTwineCheatConsole as string;
    const statusElement = $('#twine-cheat-console-status');
    statusElement.empty().removeClass('success error visible');

    if (typeof code !== 'string' || code.trim() === '') {
      this._updateTwineStatus(lanSwitch('Execution failed: Please enter valid Twine code.', '执行失败：请输入有效的 Twine 代码。'), false);
      return {
        success: false,
        error: lanSwitch('Please enter valid Twine code.', '请输入有效的 Twine 代码。'),
        message: lanSwitch('Execution failed: Please enter valid Twine code.', '执行失败：请输入有效的 Twine 代码。')
      };
    }

    try {
      const fragment = document.createDocumentFragment();
      const hasNavigation = /<<(?:link|goto|display)\b/i.test(code);

      try {
        new this.core.SugarCube.Wikifier(fragment, code);

        if (hasNavigation) {
          if (code.includes('<<link')) {
            const match = code.match(/<<link\s+(?:['"]([^'"]+)['"]\s*['"]([^'"]+)['"]|\[\[([^\]]+)\|([^\]]+)\]\]).*?>>/i);
            if (match) {
              const target = match[2] || match[4];
              if (target) {
                this._updateTwineStatus(lanSwitch('Execution successful, redirecting...', '执行成功，即将跳转...'), true);
                setTimeout(() => this.core.SugarCube.Engine.play(target), 300);
                return {
                  success: true,
                  message: lanSwitch('Code executed successfully.', '代码执行成功。'),
                  hasNavigation: true
                };
              }
            }
          }

          this._updateTwineStatus(lanSwitch('Execution successful, redirecting...', '执行成功，即将跳转...'), true);
          setTimeout(() => { if (fragment.children.length > 0) document.getElementById('your-output-container')?.appendChild(fragment); }, 300);

          return {
            success: true,
            message: lanSwitch('Code executed successfully.', '代码执行成功。'),
            hasNavigation: true
          };
        } else {
          this._updateTwineStatus(lanSwitch('Execution successful', '执行成功'), true);
          return {
            success: true,
            message: lanSwitch('Code executed successfully.', '代码执行成功。'),
            parsedContent: (fragment as any as HTMLElement).innerHTML
          };
        }
      } catch (wikifyError: any) {
        const errorMsg = wikifyError.message || lanSwitch('Wikifier parsing error', 'Wikifier 解析错误');
        this._updateTwineStatus(lanSwitch('Parsing error: ', '解析错误: ') + errorMsg, false);
        this.log('Twine代码解析失败', 'ERROR', wikifyError);
        return {
          success: false,
          error: errorMsg,
          message: `解析错误: ${errorMsg}`
        };
      }
    } catch (error: any) {
      const errorMsg = error.message || lanSwitch('Unknown error', '未知错误');
      this._updateTwineStatus(lanSwitch('Execution error: ', '执行错误: ') + errorMsg, false);
      return {
        success: false,
        error: errorMsg,
        message: lanSwitch('Execution error: ', '执行错误: ') + errorMsg
      };
    }
  }

  private _updateTwineStatus(message: string, isSuccess: boolean): void {
    const statusElement = $('#twine-cheat-console-status');
    statusElement.text(message);
    statusElement.removeClass('success error visible');
    statusElement.addClass(isSuccess ? 'success visible' : 'error visible');
  }

  public execute(type: 'javascript' | 'twine'): ExecuteResult {
    if (type === 'javascript') {
      return this.executeJS() as ExecuteResult;
    } else if (type === 'twine') {
      return this.executeTwine() as ExecuteResult;
    } else {
      this.log(`未知执行类型: ${type}`, 'ERROR');
      return {
        success: false,
        error: lanSwitch('Unknown execution type: ', '未知执行类型: ') + type,
        message: lanSwitch('Unknown execution type: ', '未知执行类型: ') + type
      };
    }
  }
}

export default Console