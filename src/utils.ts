// ./src/utils.ts

import maplebirch from './core';
const _ = maplebirch.lodash;

/**
 * 深度克隆对象
 * @example clone({a:1, b:{c:2}}) // 深克隆对象
 * @example clone([1,[2,3]], {deep:false}) // 浅克隆数组
 * @example clone(new Date(), {proto:false}) // 克隆Date对象
 */
function clone(source: any, opt: { deep?: boolean; proto?: boolean } = {}, map = new WeakMap<object, any>()): any {
  const { deep = true, proto = true } = opt;
  if (source === null || typeof source !== 'object') return source;
  if (map.has(source)) return map.get(source);
  if (source instanceof Date) return new Date(source.getTime());
  if (source instanceof RegExp) return new RegExp(source.source, source.flags);
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
  if (ArrayBuffer.isView(source)) {
    const Constructor = source.constructor as new (buffer: ArrayBufferLike, byteOffset?: number, length?: number) => any;
    return new Constructor(source.buffer.slice(0), source.byteOffset, source.byteLength);
  }
  if (source instanceof ArrayBuffer) return source.slice(0);
  if (typeof source === 'function') return source;
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

/**
 * 深度比较两个值
 * @example equal(new Date(2023,0,1), new Date(2023,0,1)) // true
 * @example equal({a:[1,{b:2}]}, {a:[1,{b:2}]}) // true
 * @example equal(/abc/i, /abc/i) // true
 * @example equal({a:1}, {a:2}) // false
 */
function equal(a: any, b: any): boolean {
  return _.isEqual(a, b);
}

/**
 * 递归合并对象
 * @example merge({a:1}, {b:2}) // {a:1, b:2}
 * @example merge({arr:[1,2]}, {arr:[3,4]}, {mode:'concat'}) // {arr:[1,2,3,4]}
 * @example merge({arr:[1,2]}, {arr:[3]}, {mode:'merge'}) // {arr:[3,2]}
 * @example merge({obj:{x:1}}, {obj:{y:2}}) // {obj:{x:1, y:2}}
 */
function merge(target: any, ...sources: any[]): any {
  if (sources.length === 0) return target;
  let opt: any = {};
  const last = sources[sources.length - 1];
  if (sources.length > 1 && typeof last === 'object' && !Array.isArray(last) && last !== null) opt = sources.pop();
  const { mode = 'replace', filterFn = null } = opt;
  const mergeRec = (t: any, s: any, depth = 1) => {
    if (s === null || typeof s !== 'object' || typeof s === 'function') return s;
    for (const key in s) {
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
          case 'merge':
            const max = Math.max(tv.length, sv.length);
            t[key] = Array.from({ length: max }, (_, i) => {
              if (i < tv.length && i < sv.length) return mergeRec(tv[i], sv[i], depth + 1);
              else if (i < tv.length) return tv[i];
              else return sv[i];
            });
            break;
          default:
            t[key] = [...sv];
        }
      } else if (typeof sv === 'object' && sv !== null && typeof tv === 'object' && tv !== null) {
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

/**
 * 检查数组是否包含指定元素
 * @example contains([1,2,3], [1,2]) // true (all模式)
 * @example contains([1,2,3], [1,5], 'any') // true
 * @example contains(['A','B'], 'a', 'all', {case:false}) // true
 * @example contains([{x:1}], {x:1}, 'all', {deep:true}) // true
 */
function contains(arr: any[], value: any, mode: 'all' | 'any' | 'none' = 'all', opt: { case?: boolean; compare?: Function; deep?: boolean } = {}): boolean {
  if (!Array.isArray(arr)) return false;
  const { case: cs = true, compare = null, deep = false } = opt;
  const match = (item: unknown, val: unknown) => {
    if (compare) return compare(item, val);
    if (deep) return _.isEqual(item, val);
    if (!cs && typeof val === 'string' && typeof item === 'string') return item.toLowerCase() === val.toLowerCase();
    if (Number.isNaN(val)) return Number.isNaN(item);
    return item === val;
  };
  if (!Array.isArray(value)) return _.some(arr, item => match(item, value));
  switch (mode) {
    case 'all':
      return _.every(value, v => _.some(arr, item => match(item, v)));
    case 'any':
      return _.some(value, v => _.some(arr, item => match(item, v)));
    case 'none':
      return _.every(value, v => !_.some(arr, item => match(item, v)));
    default:
      throw new Error(`Invalid mode: '${mode as string}'. Expected 'all', 'any' or 'none'.`);
  }
}

/**
 * 生成随机数
 * @example random() // 0-1之间的浮点数
 * @example random(10) // 0-10的整数
 * @example random(5, 10) // 5-10的整数
 * @example random(5, 10, true) // 5-10的浮点数
 * @example random({min:5, max:10, float:true}) // 5-10的浮点数
 */
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

/**
 * 从选项中随机选择一个
 * @example either(['a','b','c']) // 随机返回其中一个
 * @example either('a','b',{weights:[0.8,0.2]}) // 80%返回'a'，20%返回'b'
 * @example either(['a','b'],{null:true}) // 33%返回null，33%'a'，33%'b'
 */
function either(itemsOrA: any, ...rest: any[]): any {
  let opt: any = {};
  let items: any[];
  if (Array.isArray(itemsOrA)) {
    items = itemsOrA;
    if (rest.length && typeof rest[rest.length - 1] === 'object') opt = rest.pop();
  } else {
    items = [itemsOrA, ...rest];
    if (typeof items[items.length - 1] === 'object' && !Array.isArray(items[items.length - 1])) opt = items.pop();
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

/**
 * 条件选择器类
 * @example
 * new SelectCase()
 *   .case(1, 'One')
 *   .caseRange(3, 5, 'Three to Five')
 *   .else('Other')
 *   .match(3) // 返回'Three to Five'
 * @example
 * new SelectCase()
 *   .caseIncludes(['admin','root'], '管理员')
 *   .else('普通用户')
 *   .match('admin_user') // 返回'管理员'
 * @example
 * new SelectCase()
 *   .case(x => x > 10, '大于10')
 *   .else('小于等于10')
 *   .match(15) // 返回'大于10'
 */
class SelectCase {
  private cases: CaseItem[] = [];
  private defaultResult: any = null;
  private valueType: string | null = null;
  private allowMixedTypes = false;

  /** 精确匹配 */
  case(cond: string | number, result: any): this;
  case(cond: (input: any, meta?: any) => boolean, result: any): this;
  case(cond: any, result: any): this {
    if (typeof cond === 'function') {
      this.allowMixedTypes = true;
      this.cases.push({ type: 'predicate', condition: cond, result });
    } else {
      this.#validateType(cond);
      this.cases.push({ type: 'exact', condition: cond, result });
    }
    return this;
  }

  /** 自定义条件 */
  casePredicate(fn: (input: any, meta?: any) => boolean, result: any): this {
    if (typeof fn !== 'function') throw new TypeError('predicate must be a function');
    this.allowMixedTypes = true;
    this.cases.push({ type: 'predicate', condition: fn, result });
    return this;
  }

  /** 数值范围匹配 */
  caseRange(min: number, max: number, result: any): this {
    if (typeof min !== 'number' || typeof max !== 'number') throw new TypeError('range values must be numbers');
    this.#validateType(min);
    this.cases.push({ type: 'range', condition: [min, max], result });
    return this;
  }

  /** 集合包含匹配 */
  caseIn(values: any[], result: any): this {
    if (!Array.isArray(values)) throw new TypeError('set values must be an array');
    if (values.length === 0) return this;
    this.#validateType(values[0]);
    this.cases.push({ type: 'set', condition: values, result });
    return this;
  }

  /** 子字符串匹配 */
  caseIncludes(subs: string | string[], result: any): this {
    if (!Array.isArray(subs)) subs = [subs];
    _.each(subs, s => {
      if (typeof s !== 'string') throw new TypeError('substrings must be strings');
    });
    this.#validateType('string');
    this.cases.push({ type: 'substring', condition: subs, result });
    return this;
  }

  /** 正则匹配 */
  caseRegex(regex: RegExp, result: any): this {
    if (!(regex instanceof RegExp)) throw new TypeError('condition must be a RegExp');
    this.#validateType('string');
    this.cases.push({ type: 'regex', condition: regex, result });
    return this;
  }

  /** 数值比较 */
  caseCompare(op: '<' | '<=' | '>' | '>=', val: number, result: any): this {
    if (!['<', '<=', '>', '>='].includes(op)) throw new Error(`Invalid comparator: ${op}`);
    if (typeof val !== 'number') throw new TypeError('comparison value must be a number');
    this.#validateType(val);
    this.cases.push({ type: 'comparison', condition: { comparator: op, value: val }, result });
    return this;
  }

  /** 设置默认值 */
  else(result: any): this {
    this.defaultResult = result;
    return this;
  }

  /** 执行匹配 */
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
        case 'comparison':
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

  /** 验证类型一致性 */
  #validateType(value: any): void {
    if (this.allowMixedTypes) return;
    const valueType = typeof value;
    if (this.valueType === null) {
      this.valueType = valueType;
      return;
    }
    if (this.valueType !== valueType) throw new TypeError(`Cannot mix ${this.valueType} and ${valueType} type conditions`);
  }
}

/**
 * 加载图片（支持ModLoader）
 * @example loadImage('character.png').then(data => img.src = data)
 * @example await loadImage('https://example.com/image.jpg')
 * @example const data = loadImage('character.png'); // 同步返回
 */
function loadImage(src: string): string | boolean | Promise<string | boolean> {
  try {
    if ((window.modImgLoaderHooker as any).maplebirchCheckImageExist(src)) return maplebirch.modUtils.getImage(src);
    return false;
  } catch (error) {
    return src;
  }
}

/**
 * 字符串格式转换
 * @example convert('Hello World') // 'hello world' (默认lower)
 * @example convert('hello world', 'upper') // 'HELLO WORLD'
 * @example convert('Hello World', 'capitalize') // 'Hello world'
 * @example convert('hello world', 'title') // 'Hello World'
 * @example convert('hello world', 'camel') // 'helloWorld'
 * @example convert('hello world', 'pascal') // 'HelloWorld'
 * @example convert('hello world', 'snake') // 'hello_world'
 * @example convert('hello world', 'kebab') // 'hello-world'
 * @example convert('hello world', 'constant') // 'HELLO_WORLD'
 * @example convert('userProfile', 'camel') // 'userProfile' (保持不变)
 * @example convert('user_profile', 'camel', {delimiter:'_'}) // 'userProfile'
 * @example convert('HTTP API', 'title', {acronym:false}) // 'Http Api'
 * @example convert('HTTP API', 'title', {acronym:true}) // 'HTTP API'
 */
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
  const isUpper = (s: string) => s === s.toUpperCase();
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
      return _.startCase(_.toLower(str));
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

(window.modImgLoaderHooker as any).maplebirchCheckImageExist = function (src: string) {
  var _a: { imgData: { getter: { invalid: any } } };
  if (this.imgLookupTable.has(src)) {
    const n = this.imgLookupTable.get(src);
    if (n && n.length > 0) {
      const r = (_a = n[0]) === null || _a === void 0 ? void 0 : _a.imgData.getter.invalid;
      if (!r) return true;
    }
  }
  let maybeExist = false;
  for (const hooker of this.sideHooker) {
    if (hooker.hookName === 'GameOriginalImagePackImageSideHook') {
      const n = window.modGameOriginalImagePack.selfImg.get(src);
      if (!n) continue;
      try {
        if (!n.getter.invalid) return true;
      } catch (e) {
        maybeExist = true;
      }
      continue;
    }
    try {
      if (hooker.checkImageExist) {
        const c = hooker.checkImageExist(src);
        if (c === true) {
          return true;
        } else if (c == null) {
          maybeExist = true;
          continue;
        }
      }
    } catch (e) {}
  }
  return maybeExist ? (undefined as any) : false;
};

function widgets(...rawContents: string[]): string[] {
  return rawContents.map(content => {
    const widgetStart = content.indexOf('<<widget');
    return widgetStart >= 0 ? content.substring(widgetStart).trim() : content.trim();
  });
}

const tools = {
  clone: Object.freeze(clone),
  merge: Object.freeze(merge),
  equal: Object.freeze(equal),
  contains: Object.freeze(contains),
  SelectCase: Object.freeze(SelectCase),
  random: Object.freeze(random),
  either: Object.freeze(either),
  loadImage: Object.freeze(loadImage),
  convert: Object.freeze(convert)
};

const toolNames = ['clone', 'merge', 'equal', 'contains', 'SelectCase', 'random', 'either', 'loadImage', 'convert'];
_.each(toolNames, name => {
  if (!window.hasOwnProperty(name)) Object.defineProperty(window, name, { value: (tools as any)[name], enumerable: true });
});

export { clone, equal, merge, contains, random, either, SelectCase, loadImage, convert, widgets };
