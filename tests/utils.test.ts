import { afterEach, describe, expect, mock, test } from 'bun:test';

let randomValue: number = 0.5;

function words(value: string): string[] {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

const lodash = {
  every: <T>(values: readonly T[], predicate: (value: T) => boolean): boolean => values.every(predicate),
  some: <T>(values: readonly T[], predicate: (value: T) => boolean): boolean => values.some(predicate),
  isEqual: (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right),
  sum: (values: readonly number[]): number => values.reduce((total: number, value: number) => total + value, 0),
  random: (min: number, max: number, floating = false): number => (floating ? min + (max - min) * randomValue : Math.floor(min + (max - min + 1) * randomValue)),
  sample: <T>(values: readonly T[]): T | undefined => values[0],
  isPlainObject: (value: unknown): boolean => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype,
  toUpper: (value: string): string => value.toUpperCase(),
  toLower: (value: string): string => value.toLowerCase(),
  capitalize: (value: string): string => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
  startCase: (value: string): string =>
    words(value)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
  upperFirst: (value: string): string => value.charAt(0).toUpperCase() + value.slice(1),
  camelCase: (value: string): string => {
    const parts = words(value).map(word => word.toLowerCase());
    return parts.map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))).join('');
  },
  snakeCase: (value: string): string =>
    words(value)
      .map(word => word.toLowerCase())
      .join('_'),
  kebabCase: (value: string): string =>
    words(value)
      .map(word => word.toLowerCase())
      .join('-'),
  includes: (collection: string | readonly unknown[], value: unknown): boolean => collection.includes(value as never),
  get: (value: unknown, key: string, fallback: unknown): unknown => (value !== null && typeof value === 'object' && key in value ? (value as Record<string, unknown>)[key] : fallback)
};

mock.module('../src/utils/shared', () => ({ default: lodash }));

const { clamp, contains, randomNumber, randomPick } = await import('../src/utils/array');
const { base64ToArrayBuffer, base64ToBytes, basicAuth, bytesToBase64, bytesToJson, jsonToBytes, textToBytes, toArrayBuffer } = await import('../src/utils/binary');
const { append, appendFn, clone, cover, coverFn, equal, merge, mergeFn } = await import('../src/utils/object');
const { joinEncodedPath } = await import('../src/utils/path');
const { SelectCase } = await import('../src/utils/selector');
const { convert, escapeHtmlText, widgets } = await import('../src/utils/string');

let imageShouldLoad: boolean = true;
let imageConstructions: number = 0;
let imageRequestId: number = 0;

function uniqueImageUrl(name: string): string {
  return `https://example.test/${name}-${imageRequestId++}.png`;
}

class TestImage {
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;

  public constructor() {
    imageConstructions++;
  }

  public set src(_value: string) {
    queueMicrotask(() => (imageShouldLoad ? this.onload?.() : this.onerror?.()));
  }
}

type TestWindow = {
  modUtils?: Record<string, unknown>;
};

const testGlobal = globalThis as unknown as { Image?: typeof TestImage; window?: TestWindow };
const testWindow = testGlobal.window ?? {};
testWindow.modUtils = {
  ...testWindow.modUtils,
  getImage: async (_src: string): Promise<string> => ''
};
testGlobal.Image = TestImage;
testGlobal.window = testWindow;

const { loadImage } = await import('../src/utils/image');
const { prototypeUtils } = await import('../src/utils/prototype');

const prototypeDescriptors: Array<[object, string, PropertyDescriptor | undefined]> = [
  [Object, 'merge', Object.getOwnPropertyDescriptor(Object, 'merge')],
  [Object, 'append', Object.getOwnPropertyDescriptor(Object, 'append')],
  [Object, 'cover', Object.getOwnPropertyDescriptor(Object, 'cover')],
  [Object, 'mergefn', Object.getOwnPropertyDescriptor(Object, 'mergefn')],
  [Object, 'appendfn', Object.getOwnPropertyDescriptor(Object, 'appendfn')],
  [Object, 'coverfn', Object.getOwnPropertyDescriptor(Object, 'coverfn')],
  [Array, 'merge', Object.getOwnPropertyDescriptor(Array, 'merge')],
  [Array, 'append', Object.getOwnPropertyDescriptor(Array, 'append')],
  [Array, 'cover', Object.getOwnPropertyDescriptor(Array, 'cover')],
  [Array.prototype, 'contains', Object.getOwnPropertyDescriptor(Array.prototype, 'contains')],
  [Array.prototype, 'either', Object.getOwnPropertyDescriptor(Array.prototype, 'either')],
  [String.prototype, 'contains', Object.getOwnPropertyDescriptor(String.prototype, 'contains')],
  [String.prototype, 'convert', Object.getOwnPropertyDescriptor(String.prototype, 'convert')],
  [Math, 'random', Object.getOwnPropertyDescriptor(Math, 'random')],
  [Math, 'clamp', Object.getOwnPropertyDescriptor(Math, 'clamp')]
];

afterEach(() => {
  for (const [target, name, descriptor] of prototypeDescriptors) {
    if (descriptor) Object.defineProperty(target, name, descriptor);
    else delete (target as Record<string, unknown>)[name];
  }
});

describe('array utilities', () => {
  test('supports all containment modes and comparison options', () => {
    expect(contains(['Alpha', 'beta', Number.NaN], ['alpha', Number.NaN], 'all', { case: false })).toBeTrue();
    expect(contains([{ id: 1 }], { id: 1 }, 'any', { deep: true })).toBeTrue();
    expect(contains([1, 2], [2, 3], 'any')).toBeTrue();
    expect(contains([1, 2], [3, 4], 'none')).toBeTrue();
    expect(contains([1], 2, 'all', { compare: (item: unknown, value: unknown) => Number(item) + 1 === value })).toBeTrue();
    expect(() => contains([], 1, 'invalid' as 'all')).toThrow("Invalid mode: 'invalid'");
  });

  test('selects random numbers and values across supported modes', () => {
    randomValue = 0.5;
    expect(randomNumber()).toBe(0.5);
    expect(randomNumber(4)).toBe(2);
    expect(randomNumber(2, 4)).toBe(3);
    expect(randomNumber(2, 4, true)).toBe(3);
    expect(randomPick([])).toBeUndefined();
    expect(randomPick(['first', 'second'])).toBe('first');
    expect(randomPick(['first', 'second'], [0, 1])).toBe('second');
    expect(randomPick(['first'], [0])).toBeUndefined();
    expect(() => randomPick(['first'], [1, 2])).toThrow('weights length');
    expect(() => randomPick(['first'], [-1])).toThrow('negative');

    randomValue = 0;
    expect(randomPick(['first'], null, true)).toBeNull();
  });

  test('clamps converted values and handles reversed bounds and fallbacks', () => {
    expect(clamp('7', 0, 5)).toBe(5);
    expect(clamp(-2, 5, 1)).toBe(1);
    expect(clamp('invalid', 2, 8, 6)).toBe(6);
    expect(clamp('invalid', 2, 8)).toBe(2);
  });
});

describe('binary utilities', () => {
  test('round-trips Unicode text, JSON, and base64url', () => {
    const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(textToBytes('枫🍁'));
    expect(new TextDecoder().decode(bytes)).toBe('枫🍁');
    expect(bytesToJson<{ name: string }>(jsonToBytes({ name: '白桦' }))).toEqual({ name: '白桦' });

    const base64 = bytesToBase64(bytes);
    expect(base64ToBytes(base64)).toEqual(bytes);
    expect(base64ToBytes(base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''))).toEqual(bytes);
    expect(new Uint8Array(base64ToArrayBuffer(base64))).toEqual(bytes);
  });

  test('copies only the visible byte range and creates basic auth payloads', () => {
    const source = new Uint8Array([1, 2, 3, 4]).subarray(1, 3);
    const copy = new Uint8Array(toArrayBuffer(source));
    source[0] = 9;

    expect(copy).toEqual(new Uint8Array([2, 3]));
    expect(basicAuth('user', '密码')).toBe(bytesToBase64(textToBytes('user:密码')));
  });
});

describe('object utilities', () => {
  test('deep-clones supported structures, prototypes, and cycles', () => {
    const symbol = Symbol('value');
    const source: Record<PropertyKey, unknown> = { date: new Date(10), regex: /a/gi, bytes: new Uint16Array([1, 2]) };
    source[symbol] = { nested: true };
    source.self = source;

    const copy = clone(source) as typeof source;
    expect(copy).not.toBe(source);
    expect(copy.self).toBe(copy);
    expect(copy.date).toEqual(source.date);
    expect(copy.regex).toEqual(source.regex);
    expect(copy.bytes).toEqual(source.bytes);
    expect(copy[symbol]).toEqual({ nested: true });
    expect(clone(source, false).self).toBe(source);
    expect(Object.getPrototypeOf(clone(Object.create(null), true, false))).toBe(Object.prototype);
  });

  test('clones maps, sets, buffers, views, arrays, and preserves functions', () => {
    const fn = (): boolean => true;
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    const value = { map: new Map([[{ key: 1 }, { value: 2 }]]), set: new Set([{ value: 3 }]), buffer, view: new DataView(buffer, 1, 1), array: [{ value: 4 }], fn };
    const copy = clone(value) as typeof value;

    expect(copy.map).not.toBe(value.map);
    expect(copy.set).not.toBe(value.set);
    expect(copy.buffer).not.toBe(value.buffer);
    expect(copy.view.getUint8(0)).toBe(2);
    expect(copy.array[0]).not.toBe(value.array[0]);
    expect(copy.fn).toBe(fn);
  });

  test('merges arrays using merge, append, and cover semantics', () => {
    expect(merge({ list: [{ a: 1 }, 2] }, { list: [{ b: 2 }, 3, 4] })).toEqual({ list: [{ a: 1, b: 2 }, 3, 4] });
    expect(append({ list: [1] }, { list: [2] })).toEqual({ list: [1, 2] });
    expect(cover({ list: [1] }, { list: [2] })).toEqual({ list: [2] });
    expect(equal({ nested: [1] }, { nested: [1] })).toBeTrue();
  });

  test('filters merge operations with key, value, depth, and target value', () => {
    const seen: Array<[string, unknown, number, unknown]> = [];
    const filter = (key: string, value: unknown, depth: number, targetValue: unknown): boolean => {
      seen.push([key, value, depth, targetValue]);
      return key !== 'skip';
    };

    expect(mergeFn({ nested: { keep: 1 } }, filter, { nested: { keep: 2, skip: 3 } })).toEqual({ nested: { keep: 2 } });
    expect(appendFn({ list: [1] }, null, { list: [2] })).toEqual({ list: [1, 2] });
    expect(coverFn({ list: [1] }, null, { list: [2] })).toEqual({ list: [2] });
    expect(seen.some((entry: [string, unknown, number, unknown]) => entry[0] === 'keep' && entry[2] === 2 && entry[3] === 1)).toBeTrue();
  });
});

describe('path and string utilities', () => {
  test('joins trimmed path segments with per-segment URL encoding', () => {
    expect(joinEncodedPath('/mods/', '', '/秋 枫/', 'file#.json')).toBe('mods/%E7%A7%8B%20%E6%9E%AB/file%23.json');
    expect(joinEncodedPath('/', '')).toBe('');
  });

  test('converts common naming styles and preserves acronyms in titles', () => {
    expect(convert('helloWorld', 'upper')).toBe('HELLOWORLD');
    expect(convert('HELLO WORLD', 'lower')).toBe('hello world');
    expect(convert('hELLO', 'capitalize')).toBe('Hello');
    expect(convert('SCML api', 'title')).toBe('SCML Api');
    expect(convert('SCML api', 'title', { acronym: false })).toBe('Scml Api');
    expect(convert('hello world', 'camel')).toBe('helloWorld');
    expect(convert('hello world', 'pascal')).toBe('HelloWorld');
    expect(convert('hello world', 'snake')).toBe('hello_world');
    expect(convert('hello world', 'kebab')).toBe('hello-world');
    expect(convert('hello world', 'constant')).toBe('HELLO_WORLD');
    expect(convert('', 'title')).toBe('');
    expect(convert('unchanged', 'invalid' as 'lower')).toBe('unchanged');
  });

  test('escapes HTML text and normalizes Twee widget sources', () => {
    expect(escapeHtmlText(`<a title="x">Tom & 'Maple'</a>`)).toBe('&lt;a title=&quot;x&quot;&gt;Tom &amp; &#39;Maple&#39;&lt;/a&gt;');
    expect(widgets('\uFEFF:: Widget [widget]\r\n  body  ')).toBe('body');
    expect(widgets(':: One\nA', ':: Two\r\nB')).toEqual(['A', 'B']);
  });
});

describe('SelectCase', () => {
  test('matches exact, range, set, substring, regex, comparison, and predicate cases', () => {
    expect(new SelectCase().case('ready', 'exact').else('fallback').match('ready')).toBe('exact');
    expect(new SelectCase().caseRange(2, 4, 'range').match(3)).toBe('range');
    expect(new SelectCase().caseIn(['a', 'b'], 'set').match('b')).toBe('set');
    expect(new SelectCase().caseIncludes(['leaf', 'birch'], 'substring').match('maplebirch')).toBe('substring');
    expect(new SelectCase().caseRegex(/^maple/i, 'regex').match('Maple')).toBe('regex');
    expect(new SelectCase().caseCompare('>=', 5, 'comparison').match(5)).toBe('comparison');
    expect(new SelectCase().casePredicate((value: number, meta?: { enabled: boolean }) => value === 7 && meta?.enabled === true, 'predicate').match(7, { enabled: true })).toBe('predicate');
  });

  test('evaluates result factories and fallback factories with input metadata', () => {
    const selector = new SelectCase()
      .case(1, (value: number, meta: { suffix: string }) => `${value}${meta.suffix}`)
      .else((value: number, meta: { suffix: string }) => `fallback:${value}${meta.suffix}`);

    expect(selector.match(1, { suffix: '!' })).toBe('1!');
    expect(selector.match(2, { suffix: '?' })).toBe('fallback:2?');
  });

  test('validates condition types and ignores empty sets', () => {
    expect(() => new SelectCase().case(1, 'number').case('1', 'string')).toThrow('Cannot mix number and string');
    expect(() => new SelectCase().caseRange('1' as unknown as number, 2, 'range')).toThrow('range values must be numbers');
    expect(() => new SelectCase().caseIn('value' as unknown as unknown[], 'set')).toThrow('set values must be an array');
    expect(() => new SelectCase().caseIncludes(['valid', 2 as unknown as string], 'substring')).toThrow('substrings must be strings');
    expect(() => new SelectCase().caseRegex('value' as unknown as RegExp, 'regex')).toThrow('condition must be a RegExp');
    expect(() => new SelectCase().caseCompare('=' as '<', 1, 'comparison')).toThrow('Invalid comparator');
    expect(new SelectCase().caseIn([], 'never').else('fallback').match('anything')).toBe('fallback');
  });

  test('continues after a predicate throws', () => {
    const selector = new SelectCase()
      .casePredicate(() => {
        throw new Error('predicate failure');
      }, 'never')
      .case('ready', 'exact')
      .else('fallback');

    expect(selector.match('ready')).toBe('exact');
  });
});

describe('image utilities', () => {
  test('returns resolved mod resources without probing the network', async () => {
    imageConstructions = 0;
    window.modUtils.getImage = async (): Promise<string> => 'blob:resolved-image';

    expect(await loadImage('mods/image.png')).toBe('blob:resolved-image');
    expect(imageConstructions).toBe(0);
  });

  test('probes, caches, and shares fallback image checks', async () => {
    imageConstructions = 0;
    imageShouldLoad = true;
    window.modUtils.getImage = async (): Promise<string> => '';
    const url = uniqueImageUrl('shared');

    const first = loadImage(url);
    const second = loadImage(url);

    expect(await first).toBe(url);
    expect(await second).toBe(url);
    expect(loadImage(url)).toBe(url);
    expect(imageConstructions).toBe(1);
  });

  test('caches failed probes and handles empty or synchronous host failures', async () => {
    imageShouldLoad = false;
    window.modUtils.getImage = async (): Promise<string> => '';
    const url = uniqueImageUrl('missing');

    expect(await loadImage(url)).toBeFalse();
    expect(loadImage(url)).toBeFalse();
    expect(loadImage('')).toBeFalse();

    window.modUtils.getImage = (): Promise<string> => {
      throw new Error('host unavailable');
    };
    expect(loadImage('fallback.png')).toBe('fallback.png');
  });
});

describe('prototype utilities', () => {
  test('installs non-enumerable object, array, string, and math helpers', () => {
    randomValue = 0.5;
    prototypeUtils();

    expect(Object.merge({ nested: { a: 1 } }, { nested: { b: 2 } })).toEqual({ nested: { a: 1, b: 2 } });
    expect(Array.append([1], [2])).toEqual([2]);
    expect(['Alpha'].contains('alpha', 'any', { case: false })).toBeTrue();
    expect(['first'].either()).toBe('first');
    expect('MapleBirch'.contains('birch', { case: false })).toBeTrue();
    expect('hello world'.convert('pascal')).toBe('HelloWorld');
    expect(Math.random(4)).toBe(2);
    expect(Math.clamp(7, 0, 5)).toBe(5);
    expect(Object.getOwnPropertyDescriptor(Array.prototype, 'contains')?.enumerable).toBeFalse();
  });

  test('does not replace an existing helper unless explicitly designed to override it', () => {
    const existing = (): boolean => true;
    Object.defineProperty(Array.prototype, 'contains', { value: existing, configurable: true });

    prototypeUtils();

    expect(Array.prototype.contains).toBe(existing);
    expect(Math.random).not.toBe(prototypeDescriptors.find(([target, name]) => target === Math && name === 'random')?.[2]?.value);
  });
});
