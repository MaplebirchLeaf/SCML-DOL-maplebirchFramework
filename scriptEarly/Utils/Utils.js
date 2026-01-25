// @ts-check
/// <reference path='../../maplebirch.d.ts' />
(async() => {
  'use strict';

  /**
   * 深度克隆对象
   * @param {any} source - 要克隆的对象
   * @param {Object} [opt={}] - 选项
   * @param {boolean} [opt.deep=true] - 是否深克隆
   * @param {boolean} [opt.proto=true] - 是否保留原型链
   * @param {WeakMap<object,any>} [map=new WeakMap()] - 内部使用(处理循环引用)
   * @returns {any} 克隆后的对象
   * @example clone({a:1, b:{c:2}}) // 深克隆对象
   * @example clone([1,[2,3]], {deep:false}) // 浅克隆数组
   * @example clone(new Date(), {proto:false}) // 克隆Date对象
   */
  function clone(source, opt = {}, map = new WeakMap()) {
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
      // @ts-ignore
      return new source.constructor(source.buffer.slice(0), source.byteOffset, source.length || source.byteLength);
    }
    if (source instanceof ArrayBuffer) return source.slice(0);
    if (typeof source === 'function') return source;
    if (Array.isArray(source)) {
      /** @type {any[]} */
      const copy = [];
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
   * @param {any} a - 第一个值
   * @param {any} b - 第二个值
   * @returns {boolean} 是否相等
   * @example equal(new Date(2023,0,1), new Date(2023,0,1)) // true
   * @example equal({a:[1,{b:2}]}, {a:[1,{b:2}]}) // true
   * @example equal(/abc/i, /abc/i) // true
   * @example equal({a:1}, {a:2}) // false
   */
  function equal(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== 'object' || typeof b !== 'object') return a === b;
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    if (a instanceof RegExp && b instanceof RegExp) return a.source === b.source && a.flags === b.flags;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!equal(a[i], b[i])) return false;
      return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!equal(a[key], b[key])) return false;
    }
    return true;
  }

  /**
   * 递归合并对象
   * @param {Object} target - 目标对象
   * @param {...Object} sources - 源对象
   * @param {Object} [opt] - 选项
   * @param {string} [opt.mode='replace'] - 数组合并策略: 'replace'|'concat'|'merge'
   * @param {Function} [opt.filterFn] - 属性过滤函数
   * @returns {Object} 合并后的对象
   * @example merge({a:1}, {b:2}) // {a:1, b:2}
   * @example merge({arr:[1,2]}, {arr:[3,4]}, {mode:'concat'}) // {arr:[1,2,3,4]}
   * @example merge({arr:[1,2]}, {arr:[3]}, {mode:'merge'}) // {arr:[3,2]}
   * @example merge({obj:{x:1}}, {obj:{y:2}}) // {obj:{x:1, y:2}}
   */
  function merge(target, ...sources) {
    if (sources.length === 0) return target;
    /** @type {Object<any,{mode:string,filterFn:Function}>} */
    let opt = {};
    const last = sources[sources.length - 1];
    if (sources.length > 1 && typeof last === 'object' && !Array.isArray(last) && last !== null) opt = sources.pop();
    const { mode = 'replace', filterFn = null } = opt;
    /** @param {any} t @param {any} s */
    const mergeRec = (t, s, depth = 1) => {
      if (s === null || typeof s !== 'object' || typeof s === 'function') return s;
      for (const key in s) {
        if (filterFn && !filterFn(key, s[key], depth)) continue;
        const sv = s[key];
        const tv = t[key];
        if (typeof sv === 'function') {
          t[key] = sv;
        } else if (Array.isArray(sv) && Array.isArray(tv)) {
          switch (mode) {
            case 'concat': t[key] = [...tv, ...sv]; break;
            case 'merge':
              const max = Math.max(tv.length, sv.length);
              t[key] = Array.from({ length: max }, (_, i) => {
                if (i < tv.length && i < sv.length) return mergeRec(tv[i], sv[i], depth + 1);
                else if (i < tv.length) return tv[i];
                else return sv[i];
              });
              break;
            default: t[key] = [...sv];
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
   * @param {Array<any>} arr - 目标数组
   * @param {any|Array<any>} value - 要查找的值或值数组
   * @param {string} [mode='all'] - 匹配模式: 'all'|'any'|'none'
   * @param {Object} [opt={}] - 选项
   * @param {boolean} [opt.case=true] - 字符串是否区分大小写
   * @param {Function} [opt.compare] - 自定义比较函数
   * @param {boolean} [opt.deep=false] - 是否深度比较
   * @returns {boolean} 检查结果
   * @example contains([1,2,3], [1,2]) // true (all模式)
   * @example contains([1,2,3], [1,5], 'any') // true
   * @example contains(['A','B'], 'a', 'all', {case:false}) // true
   * @example contains([{x:1}], {x:1}, 'all', {deep:true}) // true
   */
  function contains(arr, value, mode = 'all', opt = {}) {
    if (!Array.isArray(arr)) return false;
    const { case: cs = true, compare = null, deep = false } = opt;
    const match = (/**@type {unknown}*/item, /**@type {unknown}*/val) => {
      if (compare) return compare(item, val);
      if (deep) return equal(item, val);
      if (!cs && typeof val === 'string' && typeof item === 'string') return item.toLowerCase() === val.toLowerCase();
      if (Number.isNaN(val)) return Number.isNaN(item);
      return item === val;
    };
    if (!Array.isArray(value)) return arr.some(item => match(item, value));
    switch (mode) {
      case 'all': return value.every(v => arr.some(item => match(item, v)));
      case 'any': return value.some(v => arr.some(item => match(item, v)));
      case 'none': return value.every(v => !arr.some(item => match(item, v)));
      default: throw new Error(`Invalid mode: "${mode}". Expected "all", "any" or "none".`);
    }
  }

  /**
   * 生成随机数
   * @param {number|Object} [min] - 最小值或配置对象
   * @param {number} [max] - 最大值
   * @param {boolean} [float=false] - 是否生成浮点数
   * @returns {number} 随机数
   * @example random() // 0-1之间的浮点数
   * @example random(10) // 0-10的整数
   * @example random(5, 10) // 5-10的整数
   * @example random(5, 10, true) // 5-10的浮点数
   * @example random({min:5, max:10, float:true}) // 5-10的浮点数
   */
  function random(min, max, float = false) {
    if (min === undefined && max === undefined) return Math.random();
    if (max === undefined) {
      if (typeof min === 'object' && min !== null) {
        /** @type {Object<any,{min:number,max:number,float:boolean}>} */
        const { min: mn = 0, max: mx = 1, float: flt = false } = min;
        return flt ? Math.random() * (mx - mn) + mn : Math.floor(Math.random() * (mx - mn + 1)) + mn;
      }
      return Math.floor(Math.random() * (/** @type {number}*/(min) + 1));
    }
    return float ? 
      Math.random() * (/** @type {number}*/(max) - /** @type {number}*/(min)) + /** @type {number}*/(min) : 
      Math.floor(Math.random() * (/** @type {number}*/(max) - /** @type {number}*/(min) + 1)) + /** @type {number}*/(min);
  }

  /**
   * 从选项中随机选择一个
   * @param {Array<any>|any} itemsOrA - 选项数组或第一个选项
   * @param {...any} rest - 其他选项或配置
   * @param {Object} [opt] - 配置
   * @param {number[]} [opt.weights] - 权重数组
   * @param {boolean} [opt.null=false] - 是否允许返回null
   * @returns {any} 随机选择的选项
   * @example either(['a','b','c']) // 随机返回其中一个
   * @example either('a','b',{weights:[0.8,0.2]}) // 80%返回'a'，20%返回'b'
   * @example either(['a','b'],{null:true}) // 33%返回null，33%'a'，33%'b'
   */
  function either(itemsOrA, ...rest) {
    let opt = {};
    let items;
    if (Array.isArray(itemsOrA)) {
      items = itemsOrA;
      if (rest.length && typeof rest[rest.length - 1] === 'object') opt = rest.pop();
    } else {
      items = [itemsOrA, ...rest];
      if (typeof items[items.length - 1] === 'object' && !Array.isArray(items[items.length - 1])) opt = items.pop();
    }
    /** @type {Object<any,{weights:any,allowNull:boolean}>} */
    const { weights = null, null: allowNull = false } = opt;
    if (!items.length) return undefined;
    if (weights) {
      if (!Array.isArray(weights)) throw new TypeError('weights must be an array');
      if (weights.length !== items.length) throw new Error(`weights length (${weights.length}) must match items length (${items.length})`);
      if (weights.some(w => w < 0)) throw new Error('weights cannot contain negative values');
      const total = weights.reduce((s, w) => s + w, 0);
      if (total <= 0) return undefined;
      const r = random(0, 1, true);
      let cumulative = 0;
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i] / total;
        if (r <= cumulative) return items[i];
      }
      return items[items.length - 1];
    }
    if (allowNull && random(0, 1, true) < 1 / (items.length + 1)) return null;
    return items[random(0, items.length - 1)];
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
    constructor() {
      /** @type {{ type: string; condition: any; result: any; }[]} */
      this.cases = [];
      /** @type {any} */
      this.defaultResult = null;
      this.valueType = null;
      this.allowMixedTypes = false;
    }

    /** 精确匹配 @param {string|number} cond @param {SelectCase} result */
    case(cond, result) {
      if (typeof cond === 'function') {
        this.allowMixedTypes = true;
        this.cases.push({ type: 'predicate', condition: cond, result });
      } else {
        this.#validateType(cond);
        this.cases.push({ type: 'exact', condition: cond, result });
      }
      return this;
    }
    
    /** 自定义条件 @param {Function} fn @param {SelectCase} result */
    casePredicate(fn, result) {
      if (typeof fn !== 'function') throw new TypeError('predicate must be a function');
      this.allowMixedTypes = true;
      this.cases.push({ type: 'predicate', condition: fn, result });
      return this;
    }
    
    /** 数值范围匹配 @param {number} min @param {number} max @param {SelectCase} result */
    caseRange(min, max, result) {
      if (typeof min !== 'number' || typeof max !== 'number') throw new TypeError('range values must be numbers');
      this.#validateType(min);
      this.cases.push({ type: 'range', condition: [min, max], result });
      return this;
    }
    
    /** 集合包含匹配 @param {string|any[]} values @param {SelectCase} result */
    caseIn(values, result) {
      if (!Array.isArray(values)) throw new TypeError('set values must be an array');
      if (values.length === 0) return this;
      this.#validateType(values[0]);
      this.cases.push({ type: 'set', condition: values, result });
      return this;
    }
    
    /** 子字符串匹配 @param {string|string[]} subs @param {SelectCase} result */
    caseIncludes(subs, result) {
      if (!Array.isArray(subs)) subs = [subs];
      subs.forEach(s => { if (typeof s !== 'string') throw new TypeError('substrings must be strings'); });
      this.#validateType('string');
      this.cases.push({ type: 'substring', condition: subs, result });
      return this;
    }
    
    /** 正则匹配 @param {RegExp} regex @param {SelectCase} result */
    caseRegex(regex, result) {
      if (!(regex instanceof RegExp)) throw new TypeError('condition must be a RegExp');
      this.#validateType('string');
      this.cases.push({ type: 'regex', condition: regex, result });
      return this;
    }
    
    /** 数值比较 @param {string} op @param {number} val @param {SelectCase} result */
    caseCompare(op, val, result) {
      if (!['<','<=','>','>='].includes(op)) throw new Error(`Invalid comparator: ${op}`);
      if (typeof val !== 'number') throw new TypeError('comparison value must be a number');
      this.#validateType(val);
      this.cases.push({ type: 'comparison', condition: { comparator: op, value: val }, result });
      return this;
    }
    
    /** 设置默认值 @param {SelectCase} result */
    else(result) {
      this.defaultResult = result;
      return this;
    }
    
    /** 执行匹配 @param {string|number|any[]} input */
    match(input, meta = {}) {
      for (const { type, condition, result } of this.cases) {
        let matched = false;
        switch (type) {
          case 'exact': matched = (input === condition); break;
          case 'range': matched = (input >= condition[0] && input <= condition[1]); break;
          case 'set': matched = condition.includes(input); break;
          case 'substring': matched = typeof input === 'string' && condition.some((/**@type {string}*/sub) => input.includes(sub)); break;
          case 'regex': matched = typeof input === 'string' && condition.test(input); break;
          case 'comparison': 
            const { comparator, value } = condition;
            switch (comparator) {
              case '<': matched = (input < value); break;
              case '<=': matched = (input <= value); break;
              case '>': matched = (input > value); break;
              case '>=': matched = (input >= value); break;
            }
            break;
          case 'predicate': 
            try { matched = condition(input, meta); } catch (/**@type {any}*/e) { console.error(`SelectCase predicate error: ${e.message}`); }
            break;
        }
        if (matched) return typeof result === 'function' ? result(input, meta) : result;
      }
      return typeof this.defaultResult === 'function' ? this.defaultResult(input, meta) : this.defaultResult;
    }
    
    /** 验证类型一致性 @param {any} value */
    #validateType(value) {
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
   * @param {string} src - 图片路径
   * @returns {string|boolean|Promise<string|boolean>} 图片数据（base64）或原始路径
   * @example loadImage('character.png').then(data => img.src = data)
   * @example await loadImage('https://example.com/image.jpg')
   * @example const data = loadImage('character.png'); // 同步返回
   */
  function loadImage(src) {
    try {
      if (modImgLoaderHooker.maplebirchCheckImageExist(src)) return modUtils.getImage(src);
      return false;
    } catch (error) {
      return src;
    }
  }

  /**
   * 字符串格式转换
   * @param {string} str - 原始字符串
   * @param {string} [mode='lower'] - 转换模式
   * @param {Object} [opt={}] - 选项
   * @param {string} [opt.delimiter=' '] - 单词分隔符
   * @param {boolean} [opt.acronym=true] - 是否保留首字母缩略词
   * @returns {string} 转换后的字符串
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
  function convert(str, mode = 'lower', opt = {}) {
    if (typeof str !== 'string') return str;
    const { delimiter = ' ', acronym = true } = opt;
    const splitWords = (/**@type {string}*/s) => {
      if (s.includes(delimiter)) return s.split(delimiter);
      return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').split(' ');
    };
    const isUpper = (/**@type {string}*/s) => s === s.toUpperCase();
    const words = splitWords(str).filter(w => w.length > 0);
    if (words.length === 0) return '';
    switch (mode) {
      case 'upper': return str.toUpperCase();
      case 'lower': return str.toLowerCase();
      case 'capitalize': return words.map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
      case 'title': return words.map(w => acronym && isUpper(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      case 'camel': return words.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)).join('');
      case 'pascal': return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
      case 'snake': return words.map(w => w.toLowerCase()).join('_');
      case 'kebab': return words.map(w => w.toLowerCase()).join('-');
      case 'constant': return words.map(w => w.toUpperCase()).join('_');
      default: return str;
    }
  }

  modImgLoaderHooker.maplebirchCheckImageExist = function (/**@type {string}*/src) {
    var _a;
    if (this.imgLookupTable.has(src)) {
      const n = this.imgLookupTable.get(src);
      if (n && n.length > 0) {
        const r = (_a = n[0]) === null || _a === void 0 ? void 0 : _a.imgData.getter.invalid;
        if (!r) return true;
      }
    }
    let maybeExist = false;
    for (const hooker of this.sideHooker) {
      if (hooker.hookName === 'GameOriginalImagePackImageSideHook') continue;
      try {
        if (hooker.checkImageExist) {
          const c = hooker.checkImageExist(src);
          if (c === true) { return true; } else if (c === undefined) { maybeExist = true; continue; }
        }
      } catch (e) {}
    }
    return maybeExist ? undefined : false;
  }

  /** @type {any} */
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
  const toolNames = ['clone', 'merge', 'equal', 'contains', 'SelectCase','random','either','loadImage','convert'];
  toolNames.forEach(name => { if (!window.hasOwnProperty(name)) Object.defineProperty(window, name, { value: tools[name], enumerable: true}); });
  maplebirch.once(':tool-init', (/** @type {any} */data) => Object.assign(data, tools));
})();