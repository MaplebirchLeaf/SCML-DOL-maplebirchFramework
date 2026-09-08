// ./src/modules/TimeStateWeather/Event.ts

import maplebirch from '../../core';

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
    options: EventOptions = {}
  ) {
    this.priority = options.priority ?? 0;
    this.once = !!options.once;
  }

  protected evaluate<T extends unknown[]>(label: string, callback: (...args: T) => boolean, ...args: T): boolean {
    try {
      return !!callback(...args);
    } catch (error) {
      maplebirch.log(`[${this.eventName}:${this.id}] ${label} error:`, 'ERROR', error);
      return false;
    }
  }

  protected invoke<T extends unknown[]>(label: string, callback: ((...args: T) => void) | undefined, ...args: T): void {
    if (!callback) return;
    try {
      callback(...args);
    } catch (error) {
      maplebirch.log(`[${this.eventName}:${this.id}] ${label} error:`, 'ERROR', error);
    }
  }
}

export default Event;
