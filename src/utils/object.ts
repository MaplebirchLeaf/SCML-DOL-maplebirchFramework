// ./src/utils/object.ts

import ModLoader from '../host/ModLoader';

type TypedArrayLike = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;
type ObjectData = Record<PropertyKey, unknown>;
type MergeMode = 'replace' | 'concat' | 'merge';

export type MergeFilterFn = (key: string, value: unknown, depth: number, targetValue: unknown) => boolean;

type MergeTuple<T extends readonly unknown[], S extends readonly unknown[]> = S extends readonly [infer Head, ...infer Rest]
  ? T extends readonly [infer Previous, ...infer Tail]
    ? [Merged<Previous, Head, 'merge'>, ...MergeTuple<Tail, Rest>]
    : [...S]
  : [...T];

type Merged<T, S, Mode extends MergeMode> = S extends readonly unknown[]
  ? T extends readonly unknown[]
    ? Mode extends 'replace'
      ? [...S]
      : Mode extends 'concat'
        ? [...T, ...S]
        : number extends T['length'] | S['length']
          ? (T[number] | S[number])[]
          : MergeTuple<T, S>
    : [...S]
  : S extends Record<string, unknown>
    ? Omit<T, keyof S> & { [Key in keyof S]: Key extends keyof T ? Merged<T[Key], S[Key], Mode> : S[Key] }
    : S;

export type MergeResult<T, Sources extends readonly unknown[], Mode extends MergeMode = 'merge'> = Sources extends readonly [infer Source, ...infer Rest]
  ? MergeResult<Merged<T, Source, Mode>, Rest, Mode>
  : T;

function setOwn(target: object, key: PropertyKey, value: unknown): void {
  Object.defineProperty(target, key, { value, enumerable: true, configurable: true, writable: true });
}

export function clone<T>(source: T, deep = true, proto = true, map = new WeakMap<object, unknown>()): T {
  return cloneValue(source, deep, proto, map) as T;
}

function cloneValue(source: unknown, deep: boolean, proto: boolean, map: WeakMap<object, unknown>): unknown {
  if (source === null || typeof source !== 'object') return source;
  if (map.has(source)) return map.get(source);

  let copy: object;
  if (source instanceof Date) {
    copy = new Date(source.getTime());
  } else if (source instanceof RegExp) {
    const regex = new RegExp(source.source, source.flags);
    regex.lastIndex = source.lastIndex;
    copy = regex;
  } else if (source instanceof ArrayBuffer) {
    copy = source.slice(0);
  } else if (source instanceof DataView) {
    copy = new DataView(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength));
  } else if (ArrayBuffer.isView(source)) {
    const array = source as TypedArrayLike;
    const Constructor = array.constructor as new (buffer: ArrayBufferLike, byteOffset: number, length: number) => TypedArrayLike;
    copy = new Constructor(array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength), 0, array.length);
  } else if (source instanceof Map) {
    const entries = new Map<unknown, unknown>();
    map.set(source, entries);
    source.forEach((value: unknown, key: unknown) => entries.set(deep ? cloneValue(key, deep, proto, map) : key, deep ? cloneValue(value, deep, proto, map) : value));
    return entries;
  } else if (source instanceof Set) {
    const entries = new Set<unknown>();
    map.set(source, entries);
    source.forEach((value: unknown) => entries.add(deep ? cloneValue(value, deep, proto, map) : value));
    return entries;
  } else {
    if (Array.isArray(source)) {
      const array: unknown[] = [];
      array.length = source.length;
      copy = array;
    } else {
      copy = Object.create(proto ? Object.getPrototypeOf(source) : Object.prototype);
    }
    map.set(source, copy);
    for (const key of Reflect.ownKeys(source)) {
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      const value = (source as ObjectData)[key];
      setOwn(copy, key, deep ? cloneValue(value, deep, proto, map) : value);
    }
    return copy;
  }
  map.set(source, copy);
  return copy;
}

export function equal(a: unknown, b: unknown): boolean {
  return ModLoader.getLodash().isEqual(a, b);
}

function isPlainObject(value: unknown): value is ObjectData {
  return ModLoader.getLodash().isPlainObject(value);
}

function mergeRecursive(target: unknown, source: unknown, mode: MergeMode, filter: MergeFilterFn | null, depth: number, seen: WeakMap<object, unknown>): unknown {
  if (source === null || typeof source !== 'object') return source;
  if (seen.has(source)) return seen.get(source);

  if (Array.isArray(source)) {
    const values: unknown[] = [...source];
    const result: unknown[] = Array.isArray(target) ? target : [];
    seen.set(source, result);
    const offset = mode === 'concat' ? result.length : 0;
    if (mode === 'replace') result.length = 0;
    for (let index = 0; index < values.length; index++) {
      const key = String(index);
      const previous = result[offset + index];
      if (filter && !filter(key, values[index], depth, previous)) continue;
      result[offset + index] = mergeRecursive(previous, values[index], mode, filter, depth + 1, seen);
    }
    return result;
  }

  if (!isPlainObject(source)) return source;
  const result: ObjectData = isPlainObject(target) || (depth === 1 && target !== null && typeof target === 'object') ? (target as ObjectData) : {};
  seen.set(source, result);
  for (const key of Object.keys(source)) {
    const value = source[key];
    const previous = Object.hasOwn(result, key) ? result[key] : undefined;
    if (filter && !filter(key, value, depth, previous)) continue;
    const merged = mergeRecursive(previous, value, mode, filter, depth + 1, seen);
    if (Object.hasOwn(result, key)) result[key] = merged;
    else setOwn(result, key, merged);
  }
  return result;
}

function mergeByMode(target: unknown, mode: MergeMode, filter: MergeFilterFn | null, sources: readonly unknown[]): unknown {
  for (const source of sources) target = mergeRecursive(target, source, mode, filter, 1, new WeakMap());
  return target;
}

export function merge<T, Sources extends unknown[]>(target: T, ...sources: Sources): MergeResult<T, Sources> {
  return mergeByMode(target, 'merge', null, sources) as MergeResult<T, Sources>;
}

export function append<T, Sources extends unknown[]>(target: T, ...sources: Sources): MergeResult<T, Sources, 'concat'> {
  return mergeByMode(target, 'concat', null, sources) as MergeResult<T, Sources, 'concat'>;
}

export function cover<T, Sources extends unknown[]>(target: T, ...sources: Sources): MergeResult<T, Sources, 'replace'> {
  return mergeByMode(target, 'replace', null, sources) as MergeResult<T, Sources, 'replace'>;
}

export function mergeFn<T, Sources extends unknown[]>(target: T, filter: MergeFilterFn | null, ...sources: Sources): MergeResult<T, Sources> {
  return mergeByMode(target, 'merge', filter, sources) as MergeResult<T, Sources>;
}

export function appendFn<T, Sources extends unknown[]>(target: T, filter: MergeFilterFn | null, ...sources: Sources): MergeResult<T, Sources, 'concat'> {
  return mergeByMode(target, 'concat', filter, sources) as MergeResult<T, Sources, 'concat'>;
}

export function coverFn<T, Sources extends unknown[]>(target: T, filter: MergeFilterFn | null, ...sources: Sources): MergeResult<T, Sources, 'replace'> {
  return mergeByMode(target, 'replace', filter, sources) as MergeResult<T, Sources, 'replace'>;
}
