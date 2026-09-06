// ./src/utils/object.ts

import _ from './shared';

type TypedArrayLike = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;

export type MergeFilterFn = (key: string, value: any, depth: number, targetValue: any) => boolean;

type MergeMode = 'replace' | 'concat' | 'merge';

function isTypedArray(source: any): source is TypedArrayLike {
  return ArrayBuffer.isView(source) && !(source instanceof DataView);
}

export function clone(source: any, deep = true, proto = true, map = new WeakMap<object, any>()): any {
  if (source === null || typeof source !== 'object') return source;

  if (map.has(source)) return map.get(source);

  if (source instanceof Date) return new Date(source.getTime());

  if (source instanceof RegExp) return new RegExp(source.source, source.flags);

  if (typeof source === 'function') return source;

  if (source instanceof ArrayBuffer) return source.slice(0);

  if (source instanceof DataView) {
    const buffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    return new DataView(buffer);
  }

  if (isTypedArray(source)) {
    const Constructor = source.constructor as new (buffer: ArrayBufferLike, byteOffset?: number, length?: number) => any;
    const buffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    return new Constructor(buffer, 0, source.length);
  }

  if (source instanceof Map) {
    const copy = new Map();
    map.set(source, copy);
    source.forEach((value, key) => {
      copy.set(deep ? clone(key, deep, proto, map) : key, deep ? clone(value, deep, proto, map) : value);
    });
    return copy;
  }

  if (source instanceof Set) {
    const copy = new Set();
    map.set(source, copy);
    source.forEach(value => copy.add(deep ? clone(value, deep, proto, map) : value));
    return copy;
  }

  if (Array.isArray(source)) {
    const copy: any[] = [];
    map.set(source, copy);
    for (let i = 0; i < source.length; i++) copy[i] = deep ? clone(source[i], deep, proto, map) : source[i];
    return copy;
  }

  const copy = proto ? Object.create(Object.getPrototypeOf(source)) : {};

  map.set(source, copy);

  const keys = [...Object.getOwnPropertyNames(source), ...Object.getOwnPropertySymbols(source)];

  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor && !descriptor.enumerable) continue;
    copy[key] = deep ? clone(source[key], deep, proto, map) : source[key];
  }

  return copy;
}

export function equal(a: any, b: any): boolean {
  return _.isEqual(a, b);
}

function mergeRecursive(target: any, source: any, mode: MergeMode, filterFn: MergeFilterFn | null, depth = 1): any {
  if (source === null || typeof source !== 'object' || typeof source === 'function') return source;

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (filterFn && !filterFn(key, sourceValue, depth, targetValue)) continue;

    if (typeof sourceValue === 'function') {
      target[key] = sourceValue;
    } else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      switch (mode) {
        case 'concat':
          target[key] = [...targetValue, ...sourceValue];

          break;

        case 'merge':
          {
            const max = Math.max(targetValue.length, sourceValue.length);
            target[key] = Array.from(
              {
                length: max
              },
              (_, i) => {
                if (i < targetValue.length && i < sourceValue.length) return mergeRecursive(targetValue[i], sourceValue[i], mode, filterFn, depth + 1);

                if (i < targetValue.length) return targetValue[i];

                return sourceValue[i];
              }
            );
          }

          break;

        default:
          target[key] = [...sourceValue];

          break;
      }
    } else if (_.isPlainObject(sourceValue) && _.isPlainObject(targetValue)) {
      target[key] = mergeRecursive(targetValue, sourceValue, mode, filterFn, depth + 1);
    } else {
      target[key] = sourceValue;
    }
  }

  return target;
}

function mergeByMode(target: any, mode: MergeMode, filterFn: MergeFilterFn | null, sources: any[]): any {
  for (const source of sources) target = mergeRecursive(target, source, mode, filterFn);
  return target;
}

export function merge(target: any, ...sources: any[]): any {
  return mergeByMode(target, 'merge', null, sources);
}

export function append(target: any, ...sources: any[]): any {
  return mergeByMode(target, 'concat', null, sources);
}

export function cover(target: any, ...sources: any[]): any {
  return mergeByMode(target, 'replace', null, sources);
}

export function mergeFn(target: any, filterFn: MergeFilterFn | null, ...sources: any[]): any {
  return mergeByMode(target, 'merge', filterFn, sources);
}

export function appendFn(target: any, filterFn: MergeFilterFn | null, ...sources: any[]): any {
  return mergeByMode(target, 'concat', filterFn, sources);
}

export function coverFn(target: any, filterFn: MergeFilterFn | null, ...sources: any[]): any {
  return mergeByMode(target, 'replace', filterFn, sources);
}
