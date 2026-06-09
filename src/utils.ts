// ./src/utils.ts

const _ = window.modSC2DataManager.getModUtils().getLodash();
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type TypedArrayLike = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;

const isTypedArray = (source: any): source is TypedArrayLike => ArrayBuffer.isView(source) && !(source instanceof DataView);

type ContainsMode = 'all' | 'any' | 'none';

type ContainsOptions = {
  case?: boolean;
  compare?: (item: unknown, value: unknown) => boolean;
  deep?: boolean;
};

type CloneOptions = { deep?: boolean; proto?: boolean };
type MergeMode = 'replace' | 'concat' | 'merge';
type MergeFilterFn = (key: string, value: any, depth: number, targetValue: any) => boolean;
type ConvertMode = 'lower' | 'upper' | 'capitalize' | 'title' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant';

declare global {
  interface ObjectConstructor {
    merge<T extends object = any>(...sources: any[]): T;
    append<T extends object = any>(...sources: any[]): T;
    cover<T extends object = any>(...sources: any[]): T;
    mergefn<T extends object = any>(filterFn: MergeFilterFn | null, ...sources: any[]): T;
    appendfn<T extends object = any>(filterFn: MergeFilterFn | null, ...sources: any[]): T;
    coverfn<T extends object = any>(filterFn: MergeFilterFn | null, ...sources: any[]): T;
  }

  interface Object {
    clone(deep?: boolean, proto?: boolean): any;
    equal(value: any): boolean;
    merge(...sources: any[]): any;
    append(...sources: any[]): any;
    cover(...sources: any[]): any;
    mergefn(filterFn: MergeFilterFn | null, ...sources: any[]): any;
    appendfn(filterFn: MergeFilterFn | null, ...sources: any[]): any;
    coverfn(filterFn: MergeFilterFn | null, ...sources: any[]): any;
    contains(value: unknown, mode?: ContainsMode, opt?: ContainsOptions): boolean;
  }

  interface Array<T> {
    contains(value: unknown, mode?: ContainsMode, opt?: ContainsOptions): boolean;
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
    contains(value: unknown, mode?: ContainsMode, opt?: ContainsOptions): boolean;
    random(): T | undefined;
    either(weights?: number[], allowNull?: boolean): T | null | undefined;
  }

  interface String {
    contains(value: string, opt?: { case?: boolean }): boolean;
    convert(mode?: ConvertMode, opt?: { delimiter?: string; acronym?: boolean }): string;
  }

  interface Math {
    random(): number;
    random(max: number): number;
    random(min: number, max: number, float?: boolean): number;
    clamp(value: any, min: number, max: number, fallback?: number): number;
  }
}

function clone(source: any, deep = true, proto = true, map = new WeakMap<object, any>()): any {
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
    source.forEach((v, k) => copy.set(deep ? clone(k, deep, proto, map) : k, deep ? clone(v, deep, proto, map) : v));
    return copy;
  }
  if (source instanceof Set) {
    const copy = new Set();
    map.set(source, copy);
    source.forEach(v => copy.add(deep ? clone(v, deep, proto, map) : v));
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
    const desc = Object.getOwnPropertyDescriptor(source, key);
    if (desc && !desc.enumerable) continue;
    copy[key] = deep ? clone(source[key], deep, proto, map) : source[key];
  }
  return copy;
}

function equal(a: any, b: any): boolean {
  return _.isEqual(a, b);
}

function clamp(value: any, min: number, max: number, fallback?: number): number {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const result = _.toNumber(value);
  return _.clamp(_.isFinite(result) ? result : (fallback ?? low), low, high);
}

function mergeByMode(target: any, mode: MergeMode, filterFn: MergeFilterFn | null, sources: any[]): any {
  if (sources.length === 0) return target;
  const mergeRec = (t: any, s: any, depth = 1) => {
    if (s === null || typeof s !== 'object' || typeof s === 'function') return s;
    for (const key of Object.keys(s)) {
      const sv = s[key];
      const tv = t[key];
      if (filterFn && !filterFn(key, sv, depth, tv)) continue;
      if (typeof sv === 'function') {
        t[key] = sv;
      } else if (Array.isArray(sv) && Array.isArray(tv)) {
        switch (mode) {
          case 'concat':
            t[key] = [...tv, ...sv];
            break;
          case 'merge': {
            const max = Math.max(tv.length, sv.length);
            t[key] = Array.from({ length: max }, (_, i) => {
              if (i < tv.length && i < sv.length) return mergeRec(tv[i], sv[i], depth + 1);
              if (i < tv.length) return tv[i];
              return sv[i];
            });
            break;
          }
          default:
            t[key] = [...sv];
            break;
        }
      } else if (_.isPlainObject(sv) && _.isPlainObject(tv)) {
        t[key] = mergeRec(tv, sv, depth + 1);
      } else {
        t[key] = sv;
      }
    }
    return t;
  };
  for (const source of sources) target = mergeRec(target, source);
  return target;
}

function merge(target: any, ...sources: any[]): any {
  return mergeByMode(target, 'merge', null, sources);
}

function append(target: any, ...sources: any[]): any {
  return mergeByMode(target, 'concat', null, sources);
}

function cover(target: any, ...sources: any[]): any {
  return mergeByMode(target, 'replace', null, sources);
}

function mergeFn(target: any, filterFn: MergeFilterFn | null, ...sources: any[]): any {
  return mergeByMode(target, 'merge', filterFn, sources);
}

function appendFn(target: any, filterFn: MergeFilterFn | null, ...sources: any[]): any {
  return mergeByMode(target, 'concat', filterFn, sources);
}

function coverFn(target: any, filterFn: MergeFilterFn | null, ...sources: any[]): any {
  return mergeByMode(target, 'replace', filterFn, sources);
}

function contains(arr: unknown[], value: unknown, mode: ContainsMode = 'all', opt: ContainsOptions = {}): boolean {
  if (!Array.isArray(arr)) return false;
  const { case: cs = true, compare, deep = false } = opt;
  const match = (item: unknown, val: unknown): boolean => {
    if (compare) return compare(item, val);
    if (deep) return _.isEqual(item, val);
    if (!cs && typeof val === 'string' && typeof item === 'string') return item.toLowerCase() === val.toLowerCase();
    if (Number.isNaN(val)) return Number.isNaN(item);
    return item === val;
  };
  const values: unknown[] = Array.isArray(value) ? value : [value];
  switch (mode) {
    case 'all':
      return _.every(values, (v: unknown) => _.some(arr, (item: unknown) => match(item, v)));
    case 'any':
      return _.some(values, (v: unknown) => _.some(arr, (item: unknown) => match(item, v)));
    case 'none':
      return _.every(values, (v: unknown) => !_.some(arr, (item: unknown) => match(item, v)));
    default:
      throw new Error(`Invalid mode: '${mode as string}'. Expected 'all', 'any' or 'none'.`);
  }
}

function random(min?: number, max?: number, float = false): number {
  if (min == null && max == null) return _.random(0, 1, true);
  if (max == null) {
    return _.random(0, min, false);
  }
  return _.random(min, max, float);
}

function either(items: any[], weights: number[] | null = null, allowNull = false): any {
  if (!items.length) return undefined;
  if (weights) {
    if (!Array.isArray(weights)) throw new TypeError('weights must be an array');
    if (weights.length !== items.length) throw new Error(`weights length (${weights.length}) must match items length (${items.length})`);
    if (weights.some(w => w < 0)) throw new Error('weights cannot contain negative values');
    const total = _.sum(weights);
    if (total <= 0) return undefined;
    const r = _.random(0, 1, true);
    let cumulative = 0;
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i] / total;
      if (r <= cumulative) return items[i];
    }
    return items[items.length - 1];
  }
  if (allowNull && _.random(0, 1, true) < 1 / (items.length + 1)) return null;
  return _.sample(items);
}

interface CaseItem {
  type: string;
  condition: any;
  result: any;
}

class SelectCase {
  private cases: CaseItem[] = [];
  private defaultResult: any = null;
  private valueType: string | null = null;
  private allowMixedTypes = false;

  public case(cond: string | number, result: any): this;
  public case(cond: (input: any, meta?: any) => boolean, result: any): this;
  public case(cond: any, result: any): this {
    if (typeof cond === 'function') {
      this.allowMixedTypes = true;
      this.cases.push({ type: 'predicate', condition: cond, result });
    } else {
      this.validateType(cond);
      this.cases.push({ type: 'exact', condition: cond, result });
    }
    return this;
  }

  public casePredicate(fn: (input: any, meta?: any) => boolean, result: any): this {
    if (typeof fn !== 'function') throw new TypeError('predicate must be a function');
    this.allowMixedTypes = true;
    this.cases.push({ type: 'predicate', condition: fn, result });
    return this;
  }

  public caseRange(min: number, max: number, result: any): this {
    if (typeof min !== 'number' || typeof max !== 'number') throw new TypeError('range values must be numbers');
    this.validateType(min);
    this.cases.push({ type: 'range', condition: [min, max], result });
    return this;
  }

  public caseIn(values: any[], result: any): this {
    if (!Array.isArray(values)) throw new TypeError('set values must be an array');
    if (values.length === 0) return this;
    this.validateType(values[0]);
    this.cases.push({ type: 'set', condition: values, result });
    return this;
  }

  public caseIncludes(subs: string | string[], result: any): this {
    const values = Array.isArray(subs) ? subs : [subs];
    values.forEach((s: string) => {
      if (typeof s !== 'string') throw new TypeError('substrings must be strings');
    });
    this.validateType('string');
    this.cases.push({ type: 'substring', condition: values, result });
    return this;
  }

  public caseRegex(regex: RegExp, result: any): this {
    if (!(regex instanceof RegExp)) throw new TypeError('condition must be a RegExp');
    this.validateType('string');
    this.cases.push({ type: 'regex', condition: regex, result });
    return this;
  }

  public caseCompare(op: '<' | '<=' | '>' | '>=', val: number, result: any): this {
    if (!['<', '<=', '>', '>='].includes(op)) throw new Error(`Invalid comparator: ${op}`);
    if (typeof val !== 'number') throw new TypeError('comparison value must be a number');
    this.validateType(val);
    this.cases.push({ type: 'comparison', condition: { comparator: op, value: val }, result });
    return this;
  }

  public else(result: any): this {
    this.defaultResult = result;
    return this;
  }

  public match(input: any, meta: any = {}): any {
    for (const { type, condition, result } of this.cases) {
      let matched = false;
      switch (type) {
        case 'exact':
          matched = input === condition;
          break;
        case 'range':
          matched = input >= condition[0] && input <= condition[1];
          break;
        case 'set':
          matched = _.includes(condition, input);
          break;
        case 'substring':
          matched = typeof input === 'string' && _.some(condition, (sub: string) => _.includes(input, sub));
          break;
        case 'regex':
          matched = typeof input === 'string' && condition.test(input);
          break;
        case 'comparison': {
          const { comparator, value } = condition;
          switch (comparator) {
            case '<':
              matched = input < value;
              break;
            case '<=':
              matched = input <= value;
              break;
            case '>':
              matched = input > value;
              break;
            case '>=':
              matched = input >= value;
              break;
          }
          break;
        }
        case 'predicate':
          try {
            matched = condition(input, meta);
          } catch (e: any) {
            console.error(`SelectCase predicate error: ${_.get(e, 'message', '未知错误')}`);
          }
          break;
      }
      if (matched) return typeof result === 'function' ? result(input, meta) : result;
    }
    return typeof this.defaultResult === 'function' ? this.defaultResult(input, meta) : this.defaultResult;
  }

  private validateType(value: any): void {
    if (this.allowMixedTypes) return;
    const valueType = typeof value;
    if (this.valueType === null) {
      this.valueType = valueType;
      return;
    }
    if (this.valueType !== valueType) throw new TypeError(`Cannot mix ${this.valueType} and ${valueType} type conditions`);
  }
}

function convert(str: string, mode: ConvertMode = 'lower', opt: { delimiter?: string; acronym?: boolean } = {}): string {
  if (typeof str !== 'string') return str;
  const { delimiter = ' ', acronym = true } = opt;
  const splitWords = (s: string) => {
    if (s.includes(delimiter)) return s.split(delimiter);
    return s
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(' ');
  };
  const words = splitWords(str).filter(w => w.length > 0);
  if (words.length === 0) return '';
  switch (mode) {
    case 'upper':
      return _.toUpper(str);
    case 'lower':
      return _.toLower(str);
    case 'capitalize':
      return _.capitalize(_.toLower(str));
    case 'title':
      if (!acronym) return _.startCase(_.toLower(str));
      return words
        .map(word => {
          if (/^[A-Z0-9]+$/.test(word) && word.length > 1) return word;
          return _.upperFirst(_.toLower(word));
        })
        .join(' ');
    case 'camel':
      return _.camelCase(str);
    case 'pascal':
      return _.upperFirst(_.camelCase(str));
    case 'snake':
      return _.snakeCase(str);
    case 'kebab':
      return _.kebabCase(str);
    case 'constant':
      return _.snakeCase(str).toUpperCase();
    default:
      return str;
  }
}

function definePrototype<T extends object>(target: T, name: string, value: Function, override = false): void {
  if (!override && Object.prototype.hasOwnProperty.call(target, name)) return;
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
  definePrototype(Object.prototype, 'clone', function (this: any, deep = true, proto = true) {
    return clone(this.valueOf(), deep, proto);
  });
  definePrototype(Object.prototype, 'equal', function (this: any, value: any) {
    return equal(this.valueOf(), value);
  });
  for (const [name, fn] of mergeMethods) {
    definePrototype(Object.prototype, name, function (this: any, ...sources: any[]) {
      return fn(this.valueOf(), ...sources);
    });
    definePrototype(Object, name, function (...sources: any[]) {
      return fn({}, ...sources);
    });
    definePrototype(Array, name, function (...sources: any[]) {
      return fn([], ...sources);
    });
  }
  for (const [name, fn] of mergeFnMethods) {
    definePrototype(Object.prototype, name, function (this: any, filterFn: MergeFilterFn | null, ...sources: any[]) {
      return fn(this.valueOf(), filterFn, ...sources);
    });
    definePrototype(Object, name, function (filterFn: MergeFilterFn | null, ...sources: any[]) {
      return fn({}, filterFn, ...sources);
    });
    definePrototype(Array, name, function (filterFn: MergeFilterFn | null, ...sources: any[]) {
      return fn([], filterFn, ...sources);
    });
  }
  definePrototype(Object.prototype, 'contains', function (this: any, value: unknown, mode: ContainsMode = 'any', opt: ContainsOptions = {}) {
    const source = this.valueOf();
    if (Array.isArray(source)) return contains(source, value, mode, opt);
    if (source instanceof Set) return contains([...source], value, mode, opt);
    if (source instanceof Map) return contains([...source.values()], value, mode, opt);
    if (source && typeof source === 'object') return contains(Object.values(source), value, mode, opt);
    return false;
  });
  definePrototype(Array.prototype, 'contains', function (this: unknown[], value: unknown, mode: ContainsMode = 'any', opt: ContainsOptions = {}) {
    return contains(this, value, mode, opt);
  });
  definePrototype(Array.prototype, 'random', function (this: unknown[]) {
    return _.sample(this);
  });
  definePrototype(Array.prototype, 'either', function (this: unknown[], weights?: number[], allowNull = false) {
    return either(this, weights, allowNull);
  });
  definePrototype(String.prototype, 'contains', function (this: string, value: string, opt: { case?: boolean } = {}) {
    const source = String(this);
    const target = String(value);
    return opt.case === false ? source.toLowerCase().includes(target.toLowerCase()) : source.includes(target);
  });
  definePrototype(String.prototype, 'convert', function (this: string, mode: ConvertMode = 'lower', opt: { delimiter?: string; acronym?: boolean } = {}) {
    return convert(String(this), mode, opt);
  });
  definePrototype(
    Math,
    'random',
    function (min?: number, max?: number, float = false) {
      if (min == null && max == null) return nativeMathRandom();
      return random(min, max, float);
    },
    true
  );
  definePrototype(Math, 'clamp', function (value: any, min: number, max: number, fallback?: number) {
    return clamp(value, min, max, fallback);
  });
}

const imageCache = new Map<string, boolean>();
const imagePending = new Map<string, Promise<boolean>>();

let sidebarRefreshTimer: ReturnType<typeof setTimeout> | null = null;

function queueSidebarRefresh(delay = 100) {
  if (sidebarRefreshTimer) return;
  sidebarRefreshTimer = setTimeout(() => {
    sidebarRefreshTimer = null;
    try {
      Errors.Reporter.hide(true);
      Renderer.clearCaches(T.modelclass);
      $.wiki('<<updatesidebarimg>>');
    } catch {}
  }, delay);
}

function checkImageExist(src: string): boolean | Promise<boolean> {
  if (imageCache.has(src)) return imageCache.get(src)!;
  if (imagePending.has(src)) return imagePending.get(src)!;
  if (!src) {
    imageCache.set(src, false);
    return false;
  }
  const pending = new Promise<boolean>(resolve => {
    const img = new Image();
    img.onload = () => {
      img.onload = null;
      img.onerror = null;
      imageCache.set(src, true);
      resolve(true);
    };
    img.onerror = () => {
      img.onload = null;
      img.onerror = null;
      imageCache.set(src, false);
      resolve(false);
      queueSidebarRefresh(100);
    };
    img.src = src;
  }).finally(() => {
    imagePending.delete(src);
  });
  imagePending.set(src, pending);
  return pending;
}

function loadImage(src: string): string | boolean | Promise<string | boolean> {
  try {
    if (!src) return false;
    return window.modUtils.getImage(src).then(value => {
      if (value) {
        imageCache.set(src, true);
        return value;
      }
      const checkResult = checkImageExist(src);
      return checkResult instanceof Promise ? checkResult.then(exists => (exists ? src : false)) : checkResult ? src : false;
    });
  } catch {
    return src;
  }
}

function widgets(content: string): string;
function widgets(...contents: string[]): string[];
function widgets(...rawContents: string[]): string | string[] {
  const parse = (content: string): string =>
    String(content ?? '')
      .replace(/^\uFEFF/, '')
      .replace(/\r\n?/g, '\n')
      .replace(/^::[^\n]*(?:\n[ \t]*)*/, '')
      .trim();
  const result = rawContents.map(parse);
  return result.length === 1 ? result[0] : result;
}

function textToBytes(value: string): Uint8Array {
  return textEncoder.encode(value);
}

function bytesToText(bytes: Uint8Array | ArrayBuffer): string {
  return textDecoder.decode(bytes);
}

function jsonToBytes(value: unknown): Uint8Array {
  return textToBytes(JSON.stringify(value));
}

function bytesToJson<T = any>(bytes: Uint8Array | ArrayBuffer): T {
  return JSON.parse(bytesToText(bytes)) as T;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function normalizeBase64(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(normalizeBase64(base64));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return toArrayBuffer(base64ToBytes(base64));
}

function basicAuth(username: string, password: string): string {
  return bytesToBase64(textToBytes(`${username}:${password}`));
}

function trimSlashes(value: string): string {
  return String(value ?? '').replace(/^\/+|\/+$/g, '');
}

function joinPath(...parts: string[]): string {
  return parts.map(trimSlashes).filter(Boolean).join('/');
}

function joinEncodedPath(...parts: string[]): string {
  return parts
    .map(part => encodeURIComponent(trimSlashes(part)))
    .filter(Boolean)
    .join('/');
}

function escapeHtmlText(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const publicUtils = Object.freeze({
  clone,
  equal,
  merge,
  append,
  cover,
  mergefn: mergeFn,
  appendfn: appendFn,
  coverfn: coverFn,
  contains,
  random,
  either,
  SelectCase,
  convert,
  clamp,
  loadImage
});

type PublicUtils = typeof publicUtils;

export {
  clone,
  equal,
  merge,
  append,
  cover,
  mergeFn as mergefn,
  appendFn as appendfn,
  coverFn as coverfn,
  contains,
  random,
  either,
  SelectCase,
  convert,
  clamp,
  prototypeUtils,
  loadImage,
  widgets,
  textToBytes,
  bytesToText,
  jsonToBytes,
  bytesToJson,
  toArrayBuffer,
  normalizeBase64,
  bytesToBase64,
  base64ToBytes,
  base64ToArrayBuffer,
  basicAuth,
  trimSlashes,
  joinPath,
  joinEncodedPath,
  escapeHtmlText,
  publicUtils
};
export type { CloneOptions, ContainsMode, ContainsOptions, ConvertMode, MergeMode, MergeFilterFn, PublicUtils };
