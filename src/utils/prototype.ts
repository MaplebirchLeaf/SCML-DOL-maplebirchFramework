// ./src/utils/prototype.ts

import { merge, append, cover, mergeFn, appendFn, coverFn } from './object';

import type { MergeFilterFn } from './object';

import { contains, randomNumber, randomPick, clamp } from './array';

import type { ContainsMode, ContainsOptions } from './array';

import { convert } from './string';

import type { ConvertMode } from './string';

declare global {
  interface ObjectConstructor {
    merge<T extends object = any>(...sources: any[]): T;
    append<T extends object = any>(...sources: any[]): T;
    cover<T extends object = any>(...sources: any[]): T;
    mergefn<T extends object = any>(filterFn: MergeFilterFn | null, ...sources: any[]): T;
    appendfn<T extends object = any>(filterFn: MergeFilterFn | null, ...sources: any[]): T;
    coverfn<T extends object = any>(filterFn: MergeFilterFn | null, ...sources: any[]): T;
  }

  interface Array<T> {
    contains(value: unknown, mode?: ContainsMode, options?: ContainsOptions): boolean;
    random(): T | undefined;
    either(weights?: number[], allowNull?: boolean): T | null | undefined;
  }

  interface ArrayConstructor {
    merge<T = any>(...sources: any[]): T[];
    append<T = any>(...sources: any[]): T[];
    cover<T = any>(...sources: any[]): T[];
    mergefn<T = any>(filterFn: MergeFilterFn | null, ...sources: any[]): T[];
    appendfn<T = any>(filterFn: MergeFilterFn | null, ...sources: any[]): T[];
    coverfn<T = any>(filterFn: MergeFilterFn | null, ...sources: any[]): T[];
  }

  interface ReadonlyArray<T> {
    contains(value: unknown, mode?: ContainsMode, options?: ContainsOptions): boolean;
    random(): T | undefined;
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
    clamp(value: any, min: number, max: number, fallback?: number): number;
  }
}

function definePrototype<T extends object>(target: T, name: string, value: Function, override = false): void {
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

export function prototypeUtils(): void {
  for (const [name, fn] of mergeMethods) {
    definePrototype(Object, name, function (...sources: any[]) {
      return fn({}, ...sources);
    });

    definePrototype(Array, name, function (...sources: any[]) {
      return fn([], ...sources);
    });
  }

  for (const [name, fn] of mergeFnMethods) {
    definePrototype(Object, name, function (filterFn: any, ...sources: any[]) {
      return fn({}, filterFn, ...sources);
    });

    definePrototype(Array, name, function (filterFn: any, ...sources: any[]) {
      return fn([], filterFn, ...sources);
    });
  }

  definePrototype(Array.prototype, 'contains', function (this: unknown[], value: unknown, mode: ContainsMode = 'any', options: ContainsOptions = {}) {
    return contains(this, value, mode, options);
  });

  definePrototype(Array.prototype, 'random', function (this: unknown[]) {
    return randomPick(this);
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
      if (min == null && max == null) {
        return nativeMathRandom();
      }

      return randomNumber(min, max, float);
    },
    true
  );

  definePrototype(Math, 'clamp', function (value: any, min: number, max: number, fallback?: number) {
    return clamp(value, min, max, fallback);
  });
}
