// ./src/compat/Prototype.ts

import { merge, append, cover, mergeFn, appendFn, coverFn } from '../utils/object';

import type { MergeFilterFn } from '../utils/object';

import { contains, randomNumber, randomPick, clamp } from '../utils/array';

import type { ContainsMode, ContainsOptions } from '../utils/array';

import { convert } from '../utils/string';

import type { ConvertMode } from '../utils/string';

declare global {
  interface ObjectConstructor {
    merge<T extends object = Record<string, unknown>>(...sources: unknown[]): T;
    append<T extends object = Record<string, unknown>>(...sources: unknown[]): T;
    cover<T extends object = Record<string, unknown>>(...sources: unknown[]): T;
    mergefn<T extends object = Record<string, unknown>>(filterFn: MergeFilterFn | null, ...sources: unknown[]): T;
    appendfn<T extends object = Record<string, unknown>>(filterFn: MergeFilterFn | null, ...sources: unknown[]): T;
    coverfn<T extends object = Record<string, unknown>>(filterFn: MergeFilterFn | null, ...sources: unknown[]): T;
  }

  interface Array<T> {
    contains(value: unknown, mode?: ContainsMode, options?: ContainsOptions): boolean;
    either(weights?: number[], allowNull?: boolean): T | null | undefined;
  }

  interface ArrayConstructor {
    merge<T>(...sources: readonly T[][]): T[];
    append<T>(...sources: readonly T[][]): T[];
    cover<T>(...sources: readonly T[][]): T[];
  }

  interface ReadonlyArray<T> {
    contains(value: unknown, mode?: ContainsMode, options?: ContainsOptions): boolean;
    either(weights?: number[], allowNull?: boolean): T | null | undefined;
  }

  interface String {
    contains(value: string, options?: { case?: boolean }): boolean;
    convert(mode?: ConvertMode, options?: { delimiter?: string; acronym?: boolean }): string;
  }

  interface Math {
    random(): number;
    random(max: number): number;
    random(min: number, max: number, float?: boolean): number;
    clamp(value: unknown, min: number, max: number, fallback?: number): number;
  }
}

function definePrototype<T extends object>(target: T, name: string, value: (...args: never[]) => unknown, override = false): void {
  if (!override && Object.prototype.hasOwnProperty.call(target, name)) {
    return;
  }

  Object.defineProperty(target, name, {
    value,
    enumerable: false,
    writable: true,
    configurable: true
  });
}

const nativeMathRandom = Math.random.bind(Math);

const mergeMethods = [
  ['merge', merge],
  ['append', append],
  ['cover', cover]
] as const;

const mergeFnMethods = [
  ['mergefn', mergeFn],
  ['appendfn', appendFn],
  ['coverfn', coverFn]
] as const;

function prototypeUtils(): void {
  for (const [name, fn] of mergeMethods) {
    definePrototype(Object, name, function (...sources: unknown[]) {
      return fn({}, ...sources);
    });

    definePrototype(Array, name, function (...sources: unknown[]) {
      return fn([], ...sources);
    });
  }

  for (const [name, fn] of mergeFnMethods) {
    definePrototype(Object, name, function (filterFn: MergeFilterFn | null, ...sources: unknown[]) {
      return fn({}, filterFn, ...sources);
    });
  }

  definePrototype(Array.prototype, 'contains', function (this: unknown[], value: unknown, mode: ContainsMode = 'any', options: ContainsOptions = {}) {
    return contains(this, value, mode, options);
  });

  definePrototype(Array.prototype, 'either', function (this: unknown[], weights?: number[], allowNull = false) {
    return randomPick(this, weights, allowNull);
  });

  definePrototype(
    String.prototype,
    'contains',
    function (
      this: string,
      value: string,
      options: {
        case?: boolean;
      } = {}
    ) {
      const source = String(this);
      const target = String(value);
      return options.case === false ? source.toLowerCase().includes(target.toLowerCase()) : source.includes(target);
    }
  );

  definePrototype(String.prototype, 'convert', function (this: string, mode: ConvertMode = 'lower', options: { delimiter?: string; acronym?: boolean } = {}) {
    return convert(String(this), mode, options);
  });

  definePrototype(
    Math,
    'random',
    function (min?: number, max?: number, float = false) {
      if (min == null && max == null) return nativeMathRandom();
      return randomNumber(min, max, float);
    },
    true
  );

  definePrototype(Math, 'clamp', function (value: unknown, min: number, max: number, fallback?: number) {
    return clamp(value, min, max, fallback);
  });
}

export default prototypeUtils;
