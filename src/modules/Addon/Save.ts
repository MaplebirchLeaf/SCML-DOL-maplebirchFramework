import type { DolStateAPI, DolStateMoment } from '../../../types/twine-sugarcube';
import { clone } from '../../utils/object';

export interface SaveObject {
  state: { history: DolStateMoment[]; index?: number; [key: string]: unknown };
  [key: string]: unknown;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function replace(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(target)) delete target[key];
  for (const [key, value] of Object.entries(source)) Object.defineProperty(target, key, { value, writable: true, configurable: true, enumerable: true });
}

export default class Save {
  public readonly saveObj: SaveObject;

  public constructor(
    private readonly state: DolStateAPI,
    saveObj: unknown,
    public readonly details?: unknown
  ) {
    if (
      !record(saveObj) ||
      !record(saveObj.state) ||
      !Array.isArray(saveObj.state.history) ||
      !saveObj.state.history.length ||
      !saveObj.state.history.every((moment: unknown) => record(moment) && typeof moment.title === 'string' && record(moment.variables))
    ) {
      throw new Error('Save history is missing or invalid');
    }
    this.saveObj = saveObj as SaveObject;
  }

  public get V(): Record<string, unknown> {
    const { history, index } = this.saveObj.state;
    return history[index ?? history.length - 1]?.variables ?? history[history.length - 1].variables;
  }

  public use<T>(variables: Record<string, unknown>, callback: () => T): T {
    if (!record(variables)) throw new Error('Save variables must be an object');
    const runtime = this.state.variables;
    const backup = { ...runtime };
    let completed = false;
    try {
      replace(runtime, clone(variables));
      const result = callback();
      if (result != null && (typeof result === 'object' || typeof result === 'function') && 'then' in result && typeof result.then === 'function') {
        void Promise.resolve(result).catch(() => {});
        throw new Error('Save.use callback must be synchronous');
      }
      replace(variables, clone(runtime));
      completed = true;
      return result;
    } finally {
      if (variables !== runtime || !completed) replace(runtime, backup);
    }
  }
}
