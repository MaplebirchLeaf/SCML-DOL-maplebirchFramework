import Diagnostics from '../../infra/Diagnostics';
import type { MaplebirchCore } from '../../core';
import type { ScopedLog } from '../../infra/Diagnostics';
import type { MacroContext } from '../../macros';
import type ToolCollection from '../ToolCollection';
import type { MacroDefinition, MacroContext as NativeMacroContext } from 'twine-sugarcube';

export type MacroFunction<Args extends unknown[] = unknown[]> = (this: MacroContext, ...args: Args) => unknown;
export type SimpleMacroFunction<Args extends unknown[]> = (this: MacroContext | null, ...args: Args) => unknown;
export type MacroWrapper = (this: NativeMacroContext, next: () => unknown) => unknown;
export interface MacroBranchFallback {
  when(control: NativeMacroContext): boolean;
  default?: string;
  fallback(this: NativeMacroContext): string | undefined;
}
type StatFunction<Args extends unknown[] = unknown[]> = (...args: Args) => DocumentFragment;
export type MacroTags = string[] | null | undefined;
export type SkipArgs = string[] | boolean | null | undefined;
export type MacroPhase = 'sugarcube' | 'storyinit' | 'storyready';

class defineMacros {
  public readonly log: ScopedLog;
  public readonly macros: string[] = [];
  public readonly statFunctions: Record<string, StatFunction> = {};
  private readonly definitions = new Map<string, { definition: MacroDefinition; phase: MacroPhase }>();
  private readonly wrappers = new Map<MacroPhase, Array<[string, MacroWrapper]>>();
  private readonly ready = new Set<MacroPhase>();
  private readonly branches = { active: new Map<NativeMacroContext, MacroBranchFallback[]>(), installed: false };

  public constructor(readonly manager: ToolCollection) {
    this.log = manager.core.infra.diagnostics.scoped('macro');
    manager.core.once(':sugarcube', () => {
      this.ready.add('sugarcube');
      this.installAll('sugarcube');
    });
    manager.onInit(() => {
      this.ready.add('storyinit');
      this.installAll('storyinit');
    });
    manager.core.once(':storyready', () => {
      this.ready.add('storyready');
      this.installAll('storyready');
    });
  }

  public get Macro(): MaplebirchCore['SugarCube']['Macro'] {
    return this.manager.core.SugarCube.Macro;
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
    if (this.ready.has(phase)) this.install(macroName, registration);
  }

  private installAll(phase: MacroPhase): void {
    for (const [name, entry] of this.definitions) if (entry.phase === phase) this.install(name, entry.definition);
    const wrappers = this.wrappers.get(phase) ?? [];
    this.wrappers.delete(phase);
    for (const [name, wrapper] of wrappers) {
      const original = this.Macro.get(name) as MacroDefinition | undefined;
      if (!original || typeof original.handler !== 'function') {
        this.log(`待包装的宏不存在: ${name}`, 'WARN');
        continue;
      }
      this.install(name, {
        ...original,
        handler(this: NativeMacroContext) {
          return wrapper.call(this, () => original.handler.call(this));
        }
      });
    }
  }

  public wrap(name: string, wrapper: MacroWrapper | MacroBranchFallback, phase: MacroPhase = 'storyready'): void {
    if (!name || (typeof wrapper !== 'function' && (typeof wrapper?.when !== 'function' || typeof wrapper?.fallback !== 'function'))) {
      this.log(`宏包装无效: ${name}`, 'WARN');
      return;
    }
    const handler = typeof wrapper === 'function' ? wrapper : this.branch(wrapper);
    const wrappers = this.wrappers.get(phase) ?? [];
    wrappers.push([name, handler]);
    this.wrappers.set(phase, wrappers);
    if (this.ready.has(phase)) this.installAll(phase);
  }

  private branch(fallback: MacroBranchFallback): MacroWrapper {
    if (!this.branches.installed) {
      this.branches.installed = true;
      this.wrap('switch', this.control('default'), 'sugarcube');
      this.wrap('if', this.control('else'), 'sugarcube');
    }
    const scopes = this.branches.active;
    return function (next) {
      const stack = scopes.get(this) ?? [];
      stack.push(fallback);
      scopes.set(this, stack);
      try {
        return next();
      } finally {
        stack.pop();
        if (stack.length === 0) scopes.delete(this);
      }
    };
  }

  private control(tag: 'default' | 'else'): MacroWrapper {
    const scopes = this.branches.active;
    return function (next) {
      if (scopes.size === 0) return next();

      let owner = this.parent as NativeMacroContext | null;
      let rules: MacroBranchFallback[] | undefined;
      for (; owner; owner = owner.parent as NativeMacroContext | null) {
        rules = scopes.get(owner);
        if (rules) break;
        if ('isWidget' in owner.self && owner.self.isWidget === true) return next();
      }
      if (!owner || !rules) return next();

      const { payload } = this;
      const last = payload?.at(-1);
      if (!last || (tag === 'default' && payload.length === 1)) return next();
      const existing = last.name === tag ? last : undefined;
      const body = existing?.contents ?? '';
      const original = body.trim();
      const matches = rules.filter(rule => (!existing || rule.default === original) && rule.when(this));
      if (matches.length === 0) return next();

      const clause = {
        ...last,
        name: tag,
        args: existing?.args ?? Object.assign([], { raw: '', full: '' }),
        source: `<<${tag}>>`,
        get contents() {
          for (const rule of matches) {
            const output = rule.fallback.call(owner);
            if (typeof output === 'string') return body + output;
          }
          return body;
        }
      };
      const index = existing ? payload.length - 1 : payload.length;
      payload[index] = clause;
      try {
        return next();
      } finally {
        if (existing) payload[index] = existing;
        else payload.splice(index, 1);
      }
    };
  }

  private install(name: string, definition: MacroDefinition): void {
    const macro = this.Macro;
    if (macro.has(name)) macro.delete(name);
    macro.add(name, definition);
    if (this.definitions.get(name)?.definition === definition) this.definitions.delete(name);
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
    if (this.statFunctions[name] || this.macros.includes(name) || this.manager.core.host.sugarcube.runtime?.Macro.has(name)) {
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
