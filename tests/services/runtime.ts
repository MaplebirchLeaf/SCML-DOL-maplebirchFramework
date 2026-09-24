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

mock.module('@/styles/PromptStyle.css', () => ({ default: '' }));
mock.module('@/styles/MaplebrichStyles.css', () => ({ default: '' }));
mock.module('../../src/constants', () => ({
  Languages: ['EN', 'CN'],
  Config: {},
  Translations: {},
  version: '4.3.6',
  TimeConstants: { MIN_DATE: { timeStamp: -1000000 }, MAX_DATE: { timeStamp: 1000000 }, secondsPerMinute: 60, secondsPerHour: 3600, secondsPerDay: 86400 },
  ModuleState: { REGISTERED: 0, MOUNTED: 1, ERROR: 2, EXPOSED: 3, DISABLED: 4, 0: 'REGISTERED', 1: 'MOUNTED', 2: 'ERROR', 3: 'EXPOSED', 4: 'DISABLED' }
}));

if (!('window' in globalThis)) Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
Object.assign(window, { modSC2DataManager: { getModUtils: () => ({ getLodash: () => lodash }) } });

if (typeof navigator.language !== 'string') Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
