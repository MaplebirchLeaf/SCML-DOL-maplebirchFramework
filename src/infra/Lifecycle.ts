// ./src/infra/Lifecycle.ts

import Catalog from './Catalog';
import Diagnostics from './Diagnostics';

export type LifecyclePhase = 'preInit' | 'Init' | 'loadInit' | 'postInit';

export interface LifecycleTarget {
  preInit?(): void | Promise<void>;
  Init?(): void;
  loadInit?(): void;
  postInit?(): void;
}

export interface LifecycleResult {
  called: boolean;
  ok: boolean;
  error?: unknown;
}

export class Lifecycle<Key = string, Target extends LifecycleTarget = LifecycleTarget> extends Catalog<Key, Target> {
  public preInit(): void | Promise<void> {}

  public Init(): void {}

  public loadInit(): void {}

  public postInit(): void {}

  public execute(target: Target, phase: 'preInit', scope?: string): Promise<LifecycleResult>;
  public execute(target: Target, phase: Exclude<LifecyclePhase, 'preInit'>, scope?: string): LifecycleResult;
  public execute(target: Target, phase: LifecyclePhase, scope?: string): LifecycleResult | Promise<LifecycleResult>;
  public execute(target: Target, phase: LifecyclePhase, scope = 'lifecycle'): LifecycleResult | Promise<LifecycleResult> {
    const hook = target[phase];
    if (typeof hook !== 'function') {
      const result: LifecycleResult = { called: false, ok: true };
      return phase === 'preInit' ? Promise.resolve(result) : result;
    }
    try {
      const result: unknown = hook.call(target);
      if (phase === 'preInit')
        return Promise.resolve(result).then(
          () => ({ called: true, ok: true }),
          error => this.failure(phase, scope, error)
        );
      if (result != null && typeof (result as PromiseLike<unknown>).then === 'function') {
        void Promise.resolve(result).catch(error => this.record(`${phase} asynchronous task failed: ${Diagnostics.message(error)}`, 'ERROR', scope, error));
        throw new Error(`${phase} 必须同步执行，不能返回 Promise`);
      }
      return { called: true, ok: true };
    } catch (error) {
      const result = this.failure(phase, scope, error);
      return phase === 'preInit' ? Promise.resolve(result) : result;
    }
  }

  private failure(phase: LifecyclePhase, scope: string, error: unknown): LifecycleResult {
    this.record(`${phase} failed: ${Diagnostics.message(error)}`, 'ERROR', scope, error);
    return { called: true, ok: false, error };
  }
}

export default Lifecycle;
