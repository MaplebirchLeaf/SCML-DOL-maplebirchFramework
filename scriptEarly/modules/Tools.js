// @ts-check
/// <reference path='../../maplebirch.d.ts' />
(async() => {
  'use strict';

  /** @param {string} prefix */
  function createLog(prefix) {
    return (/**@type {any}*/message, level = 'INFO', /**@type {any}*/...objects) => {maplebirch.log(`[${prefix}] ${message}`, level, ...objects); };
  }

  // 控制台系统 - 用于执行JS和Twine代码
  class consoleTools {
    /** @param {{ (message: string, level?: string, ...objects: any[]): void; (msg: string, level?: string, ...objs: any[]): void; }} logger */
    constructor(logger) {
      this.log = logger;
      this.globalNamespace = {};
    }

    #executeJS() {
      let result;
      const code = T.maplebirchJSCheatConsole;
      const statusElement = $('#js-cheat-console-status');
      statusElement.empty().removeClass('success error visible');
      if (typeof code !== 'string' || code.trim() === '') {
        this.#updateJSStatus(`${lanSwitch('Execution failed: Please enter valid JavaScript code.', '执行失败：请输入有效的 JavaScript 代码。')}`, false);
        return { success: false, error: lanSwitch('Please enter valid JavaScript code.', '请输入有效的 JavaScript 代码。') };
      }
      try {
        result = this.#executeJSCode(code);
        if (result instanceof Error) throw result;
        const hasExplicitReturn = /\breturn\b\s*[^;]*;?$|return;/.test(code);
        const message = hasExplicitReturn ? lanSwitch('Execution successful → ', '执行成功 → ') + this.#formatResult(result) : lanSwitch('Code executed.', '代码已执行。');
        this.#updateJSStatus(message, true);
        return { 
          success: true, 
          result: result,
          message: message,
          globals: this.globalNamespace
        };
      } catch (/**@type {any}*/error) {
        const errorMsg = error.message || lanSwitch('Unknown error', '未知错误');
        const message = lanSwitch('Execution error → ', '执行错误 → ') + errorMsg;
        this.#updateJSStatus(message, false);
        return {
          success: false,
          error: errorMsg,
          message: message
        };
      }
    }

    /** @param {string} message @param {any} isSuccess */
    #updateJSStatus(message, isSuccess) {
      const statusElement = $('#js-cheat-console-status');
      statusElement.text(message);
      statusElement.removeClass('success error visible');
      statusElement.addClass(isSuccess ? 'success visible' : 'error visible');
    }
    
    /** @param {any} code */
    #executeJSCode(code) {
      const sandbox = {
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
      // @ts-ignore
      builtins.forEach(name => { if (window[name]) sandbox[name] = Object.freeze(window[name]); });
      Object.freeze(Object.prototype);
      Object.freeze(Array.prototype);
      Object.freeze(Function.prototype);
      Object.freeze(Number.prototype);
      Object.freeze(String.prototype);
      Object.freeze(Date.prototype);
      Object.freeze(Boolean.prototype);
      Object.freeze(RegExp.prototype);
      Object.freeze(Error.prototype);
      Object.freeze(Promise.prototype);
      Object.freeze(Map.prototype);
      Object.freeze(Set.prototype);
      const sandboxProxy = new Proxy(sandbox, {
        has: () => true,
        get: (/**@type {any}*/target, /**@type {any}*/prop) => {
          if (prop === Symbol.unscopables) return undefined;
          if (prop in target) return target[prop];
          if (prop in window) return window[prop];
          return undefined;
        },
        set: (target, prop, value) => {
          if (prop in target) throw new Error(lanSwitch(`Cannot modify built-in object: ${String(prop)}`, `不能修改内置对象: ${String(prop)}`));
          if (prop === 'global') throw new Error(lanSwitch('Cannot override global namespace', '不能覆盖 global 命名空间'));
          if (prop in window) {
            const descriptor = Object.getOwnPropertyDescriptor(window, prop);
            if (descriptor && descriptor.writable === false) throw new Error(lanSwitch(`Cannot modify read-only property: ${String(prop)}`, `不能修改只读属性: ${String(prop)}`));
            // @ts-ignore
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

    /** @param {null | undefined} result */
    #formatResult(result) {
      if (result === null) return 'null';
      if (result === undefined) return 'undefined';
      if (typeof result === 'function') return 'function';
      try {
        return JSON.stringify(result, null, 2);
      } catch {
        return String(result);
      }
    }

    #executeTwine() {
      const code = T.maplebirchTwineCheatConsole;
      const statusElement = $('#twine-cheat-console-status');
      statusElement.empty().removeClass('success error visible');
      if (typeof code !== 'string' || code.trim() === '') {
        this.#updateTwineStatus(lanSwitch('Execution failed: Please enter valid Twine code.', '执行失败：请输入有效的 Twine 代码。'), false);
        return { success: false, error: lanSwitch('Please enter valid Twine code.', '请输入有效的 Twine 代码。') };
      }
      try {
        const fragment = document.createDocumentFragment();
        const hasNavigation = /<<(?:link|goto|display)\b/i.test(code);
        try {
          new maplebirch.SugarCube.Wikifier(fragment, code);
          if (hasNavigation) {
            if (code.includes('<<link')) {
              const match = code.match(/<<link\s+(?:['"]([^'"]+)['"]\s*['"]([^'"]+)['"]|\[\[([^\]]+)\|([^\]]+)\]\]).*?>>/i);
              if (match) {
                let target = match[2] || match[4];
                if (target) {
                  this.#updateTwineStatus(lanSwitch('Execution successful, redirecting...', '执行成功，即将跳转...'), true);
                  setTimeout(() => maplebirch.SugarCube.Engine.play(target), 300);
                  return {
                    success: true,
                    message: lanSwitch('Code executed successfully.', '代码执行成功。'),
                    hasNavigation: true
                  };
                }
              }
            }
            this.#updateTwineStatus(lanSwitch('Execution successful, redirecting...', '执行成功，即将跳转...'), true);
            setTimeout(() => { if (fragment.children.length > 0) document.getElementById('your-output-container')?.appendChild(fragment); }, 300);
            return {
              success: true,
              message: lanSwitch('Code executed successfully.', '代码执行成功。'),
              hasNavigation: true
            };
          } else {
            this.#updateTwineStatus(lanSwitch('Execution successful', '执行成功'), true);
            return {
              success: true,
              message: lanSwitch('Code executed successfully.', '代码执行成功。'),
              // @ts-ignore
              parsedContent: fragment.innerHTML
            };
          }
        } catch (/**@type {any}*/wikifyError) {
          const errorMsg = wikifyError.message || lanSwitch('Wikifier parsing error', 'Wikifier 解析错误');
          this.#updateTwineStatus(lanSwitch('Parsing error: ', '解析错误: ') + errorMsg, false);
          this.log('Twine代码解析失败', 'ERROR', wikifyError);
          return {
            success: false,
            error: errorMsg,
            message: `解析错误: ${errorMsg}`
          };
        }
      } catch (/**@type {any}*/error) {
        const errorMsg = error.message || lanSwitch('Unknown error', '未知错误');
        this.#updateTwineStatus(lanSwitch('Execution error: ', '执行错误: ') + errorMsg, false);
        return {
          success: false,
          error: errorMsg,
          message: lanSwitch('Execution error: ', '执行错误: ') + errorMsg
        };
      }
    }

    /** @param {string} message @param {any} isSuccess */
    #updateTwineStatus(message, isSuccess) {
      const statusElement = $('#twine-cheat-console-status');
      statusElement.text(message);
      statusElement.removeClass('success error visible');
      statusElement.addClass(isSuccess ? 'success visible' : 'error visible');
    }
    
    /** @param {string} type */
    execute(type) {
      if (type === 'javascript') {
        return this.#executeJS();
      } else if (type === 'twine') {
        return this.#executeTwine();
      } else {
        this.log(`未知执行类型: ${type}`, 'ERROR');
        return { success: false, error: lanSwitch('Unknown execution type: ', '未知执行类型: ') + type };
      }
    }
  }

  class tools {
    createLog = createLog;

    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.core = core;
      this.console = new consoleTools(createLog('console'));
      core.trigger(':tool-init', this);
    }

    async preInit() {
      // @ts-ignore
      this.core.once(':finally', () => { this.linkzone.removeZones(); this.linkzone.apply({ debug: true }); });
      // @ts-ignore
      this.core.on(':passagedisplay', () => this.linkzone.apply(), 'applylinkzone');
    }

    Init() {
      // @ts-ignore
      this.other.applyLocation();
      // @ts-ignore
      this.other.applyBodywriting();
    }

    postInit() {

    }
  }

  await maplebirch.register('tool', new tools(maplebirch), ['state']);
})();