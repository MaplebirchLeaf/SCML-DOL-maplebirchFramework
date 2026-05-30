// ./src/utils.ts

const _ = window.modSC2DataManager.getModUtils().getLodash();

type TypedArrayLike = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;

const isTypedArray = (source: any): source is TypedArrayLike => ArrayBuffer.isView(source) && !(source instanceof DataView);

type ContainsMode = 'all' | 'any' | 'none';

type ContainsOptions = {
  case?: boolean;
  compare?: (item: unknown, value: unknown) => boolean;
  deep?: boolean;
};

function clone(source: any, opt: { deep?: boolean; proto?: boolean } = {}, map = new WeakMap<object, any>()): any {
  const { deep = true, proto = true } = opt;
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
    source.forEach((v, k) => copy.set(deep ? clone(k, opt, map) : k, deep ? clone(v, opt, map) : v));
    return copy;
  }
  if (source instanceof Set) {
    const copy = new Set();
    map.set(source, copy);
    source.forEach(v => copy.add(deep ? clone(v, opt, map) : v));
    return copy;
  }
  if (Array.isArray(source)) {
    const copy: any[] = [];
    map.set(source, copy);
    for (let i = 0; i < source.length; i++) copy[i] = deep ? clone(source[i], opt, map) : source[i];
    return copy;
  }
  const copy = proto ? Object.create(Object.getPrototypeOf(source)) : {};
  map.set(source, copy);
  const keys = [...Object.getOwnPropertyNames(source), ...Object.getOwnPropertySymbols(source)];
  for (const key of keys) {
    const desc = Object.getOwnPropertyDescriptor(source, key);
    if (desc && !desc.enumerable) continue;
    copy[key] = deep ? clone(source[key], opt, map) : source[key];
  }
  return copy;
}

function equal(a: any, b: any): boolean {
  return _.isEqual(a, b);
}

function merge(target: any, ...sources: any[]): any {
  if (sources.length === 0) return target;
  const isMergeOption = (value: any): boolean => {
    if (!_.isPlainObject(value)) return false;
    return _.has(value, 'mode') || _.has(value, 'filterFn');
  };
  let opt: any = {};
  const last = sources[sources.length - 1];
  if (sources.length > 1 && isMergeOption(last)) opt = sources.pop();

  const { mode = 'replace', filterFn = null } = opt;
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

function random(min?: number | { min: number; max: number; float?: boolean }, max?: number, float = false): number {
  if (min == null && max == null) return _.random(0, 1, true);
  if (max == null) {
    if (typeof min === 'object' && min !== null) {
      const { min: mn = 0, max: mx = 1, float: flt = false } = min;
      return _.random(mn, mx, flt);
    }
    return _.random(0, min as number, false);
  }
  return _.random(min as number, max, float);
}

function either(itemsOrA: any, ...rest: any[]): any {
  const isEitherOption = (value: any): boolean => {
    if (!_.isPlainObject(value)) return false;
    return _.has(value, 'weights') || _.has(value, 'null');
  };
  let opt: any = {};
  let items: any[];
  if (Array.isArray(itemsOrA)) {
    items = itemsOrA;
    if (rest.length && isEitherOption(rest[rest.length - 1])) opt = rest.pop();
  } else {
    items = [itemsOrA, ...rest];
    if (items.length && isEitherOption(items[items.length - 1])) opt = items.pop();
  }
  const { weights = null, null: allowNull = false } = opt;
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

  case(cond: string | number, result: any): this;
  case(cond: (input: any, meta?: any) => boolean, result: any): this;
  case(cond: any, result: any): this {
    if (typeof cond === 'function') {
      this.allowMixedTypes = true;
      this.cases.push({ type: 'predicate', condition: cond, result });
    } else {
      this.validateType(cond);
      this.cases.push({ type: 'exact', condition: cond, result });
    }
    return this;
  }

  casePredicate(fn: (input: any, meta?: any) => boolean, result: any): this {
    if (typeof fn !== 'function') throw new TypeError('predicate must be a function');
    this.allowMixedTypes = true;
    this.cases.push({ type: 'predicate', condition: fn, result });
    return this;
  }

  caseRange(min: number, max: number, result: any): this {
    if (typeof min !== 'number' || typeof max !== 'number') throw new TypeError('range values must be numbers');
    this.validateType(min);
    this.cases.push({ type: 'range', condition: [min, max], result });
    return this;
  }

  caseIn(values: any[], result: any): this {
    if (!Array.isArray(values)) throw new TypeError('set values must be an array');
    if (values.length === 0) return this;
    this.validateType(values[0]);
    this.cases.push({ type: 'set', condition: values, result });
    return this;
  }

  caseIncludes(subs: string | string[], result: any): this {
    const values = Array.isArray(subs) ? subs : [subs];
    values.forEach((s: string) => {
      if (typeof s !== 'string') throw new TypeError('substrings must be strings');
    });
    this.validateType('string');
    this.cases.push({ type: 'substring', condition: values, result });
    return this;
  }

  caseRegex(regex: RegExp, result: any): this {
    if (!(regex instanceof RegExp)) throw new TypeError('condition must be a RegExp');
    this.validateType('string');
    this.cases.push({ type: 'regex', condition: regex, result });
    return this;
  }

  caseCompare(op: '<' | '<=' | '>' | '>=', val: number, result: any): this {
    if (!['<', '<=', '>', '>='].includes(op)) throw new Error(`Invalid comparator: ${op}`);
    if (typeof val !== 'number') throw new TypeError('comparison value must be a number');
    this.validateType(val);
    this.cases.push({ type: 'comparison', condition: { comparator: op, value: val }, result });
    return this;
  }

  else(result: any): this {
    this.defaultResult = result;
    return this;
  }

  match(input: any, meta: any = {}): any {
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

function convert(
  str: string,
  mode: 'lower' | 'upper' | 'capitalize' | 'title' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant' = 'lower',
  opt: { delimiter?: string; acronym?: boolean } = {}
): string {
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

function number(
  value: any,
  fallback = 0,
  min = -Infinity,
  max = Infinity,
  mode: 'none' | 'floor' | 'ceil' | 'round' | 'trunc' = 'none',
  opt: {
    step?: number;
    percent?: boolean;
    loop?: boolean;
  } = {}
): number {
  const { step = 0, percent = false, loop = false } = opt;

  let result = _.toNumber(value);
  if (!_.isFinite(result)) result = fallback;

  const hasRange = _.isFinite(min) && _.isFinite(max) && max >= min;
  const range = max - min;

  const clampValue = (num: number): number => _.clamp(num, min, max);
  const loopValue = (num: number): number => {
    if (!hasRange || range === 0) return min;
    return ((((num - min) % range) + range) % range) + min;
  };

  result = loop ? loopValue(result) : clampValue(result);

  if (_.isFinite(step) && step > 0) {
    const offset = (result - min) / step;
    switch (mode) {
      case 'floor':
        result = min + _.floor(offset) * step;
        break;
      case 'ceil':
        result = min + _.ceil(offset) * step;
        break;
      case 'trunc':
        result = min + Math.trunc(offset) * step;
        break;
      case 'round':
        result = min + _.round(offset) * step;
        break;
      default:
        result = min + offset * step;
        break;
    }
  } else {
    switch (mode) {
      case 'floor':
        result = _.floor(result);
        break;
      case 'ceil':
        result = _.ceil(result);
        break;
      case 'trunc':
        result = Math.trunc(result);
        break;
      case 'round':
        result = _.round(result);
        break;
    }
  }

  result = loop ? loopValue(result) : clampValue(result);

  if (percent) {
    if (!hasRange || range === 0) return 0;
    return _.clamp(((result - min) / range) * 100, 0, 100);
  }

  return result;
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

export { clone, equal, merge, contains, random, either, SelectCase, convert, number, loadImage, widgets };
