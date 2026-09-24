// ./src/infra/Hooks.ts

import type ModLoader from '../host/ModLoader';
import Catalog from './Catalog';

export type HookCallback<Args extends unknown[] = unknown[], Result = unknown> = (...args: Args) => Result | Promise<Result>;
export type HookErrorPolicy = 'throw' | 'continue';

export class Hooks<Args extends unknown[] = unknown[], Result = unknown> extends Catalog<string, HookCallback<Args, Result>> {
  private readonly order = new Map<string, number>();

  public constructor(
    modloader?: ModLoader,
    private readonly onError: HookErrorPolicy = 'throw'
  ) {
    super(modloader);
  }

  public override add(name: string, callback: HookCallback<Args, Result>, order = 0): boolean {
    if (!super.add(name, callback)) return false;
    this.order.set(name, order);
    return true;
  }

  public override remove(name: string): boolean {
    this.order.delete(name);
    return super.remove(name);
  }

  public override clear(): void {
    super.clear();
    this.order.clear();
  }

  public execute(...args: Args): Result[] {
    const hooks = [...this.items.entries()].sort(([left], [right]) => (this.order.get(left) ?? 0) - (this.order.get(right) ?? 0));
    const results: Result[] = [];
    for (const [name, hook] of hooks) {
      try {
        const result = hook(...args);
        if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
          void Promise.resolve(result).catch(error => this.record(`Hook asynchronous failure: ${name}`, 'ERROR', 'hooks', error));
          throw new Error(`Hook must be synchronous: ${name}`);
        }
        results.push(result as Result);
      } catch (error) {
        this.record(`Hook execution failed: ${name}`, 'ERROR', 'hooks', error);
        if (this.onError === 'throw') throw error;
      }
    }
    return results;
  }

  public async call(name: string, ...args: Args): Promise<Awaited<Result> | undefined> {
    const hook = this.get(name);
    if (!hook) return undefined;
    try {
      return await hook(...args);
    } catch (error) {
      this.record(`Hook execution failed: ${name}`, 'ERROR', 'hooks', error);
      if (this.onError === 'throw') throw error;
      return undefined;
    }
  }
}

export default Hooks;
