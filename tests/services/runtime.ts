import { mock } from 'bun:test';

export const lodash = {
  isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object') return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || prototype === Object.prototype;
  },
  isInteger: Number.isInteger,
  isFinite: Number.isFinite,
  inRange: (value: number, start: number, end: number) => value >= start && value < end
};

mock.module('../../src/utils/shared', () => ({ default: lodash }));
mock.module('@/styles/PromptStyle.css', () => ({ default: '' }));
mock.module('../../src/constants', () => ({
  Languages: ['EN', 'CN'],
  Translations: {},
  version: '4.3.6',
  ModuleState: { REGISTERED: 0, MOUNTED: 1, ERROR: 2, EXPOSED: 3, DISABLED: 4, 0: 'REGISTERED', 1: 'MOUNTED', 2: 'ERROR', 3: 'EXPOSED', 4: 'DISABLED' }
}));

if (!('window' in globalThis)) Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });

if (typeof navigator.language !== 'string') Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
