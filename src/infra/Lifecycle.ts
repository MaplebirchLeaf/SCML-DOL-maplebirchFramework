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

  public async execute(target: Target, phase: LifecyclePhase, scope = 'lifecycle'): Promise<LifecycleResult> {
    const hook = target[phase];
    if (typeof hook !== 'function') return { called: false, ok: true };
    try {
      await hook.call(target);
      return { called: true, ok: true };
    } catch (error) {
      this.record(`${phase} failed: ${Diagnostics.message(error)}`, 'ERROR', scope, error);
      return { called: true, ok: false, error };
    }
  }

  public executeSync(target: Target, phase: Exclude<LifecyclePhase, 'preInit'>, scope = 'lifecycle'): LifecycleResult {
    const hook = target[phase];
    if (typeof hook !== 'function') return { called: false, ok: true };
    try {
      const result: unknown = hook.call(target);
      if (result != null && typeof (result as PromiseLike<unknown>).then === 'function') {
        void Promise.resolve(result).catch(error => this.record(`${phase} asynchronous task failed: ${Diagnostics.message(error)}`, 'ERROR', scope, error));
        throw new Error(`${phase} 必须同步执行，不能返回 Promise`);
      }
      return { called: true, ok: true };
    } catch (error) {
      this.record(`${phase} failed: ${Diagnostics.message(error)}`, 'ERROR', scope, error);
      return { called: true, ok: false, error };
    }
  }
}

export default Lifecycle;
