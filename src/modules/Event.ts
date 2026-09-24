// ./src/modules/Event.ts

import type { ScopedLog } from '../infra/Diagnostics';

export interface EventOptions {
  priority?: number;
  once?: boolean;
}

abstract class Event {
  public readonly priority: number;
  public readonly once: boolean;

  protected abstract readonly eventName: string;

  protected constructor(
    public readonly id: string,
    options: EventOptions,
    protected readonly log: ScopedLog
  ) {
    this.priority = options.priority ?? 0;
    this.once = !!options.once;
  }

  protected evaluate<T extends unknown[]>(label: string, callback: (...args: T) => boolean, ...args: T): boolean {
    try {
      return !!callback(...args);
    } catch (error) {
      this.log(`[${this.eventName}:${this.id}] ${label} error:`, 'ERROR', error);
      return false;
    }
  }

  protected invoke<T extends unknown[]>(label: string, callback: ((...args: T) => void) | undefined, ...args: T): void {
    if (!callback) return;
    try {
      callback(...args);
    } catch (error) {
      this.log(`[${this.eventName}:${this.id}] ${label} error:`, 'ERROR', error);
    }
  }
}

export default Event;
