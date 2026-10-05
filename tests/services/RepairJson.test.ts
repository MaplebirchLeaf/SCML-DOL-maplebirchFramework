import { expect, test } from 'bun:test';
import { NativeJSON } from '../../src/services/Repair/Json';

test('native JSON remains independent of later SugarCube wrappers and revival markers', () => {
  const parse = JSON.parse;
  const stringify = JSON.stringify;
  let calls = 0;
  try {
    JSON.parse = () => {
      calls++;
      throw new Error('reviver');
    };
    JSON.stringify = () => {
      calls++;
      return 'wrapped';
    };
    expect(NativeJSON.parse('["(revive:eval)","danger()"]')).toEqual(['(revive:eval)', 'danger()']);
    expect(NativeJSON.stringify({ operations: [{ targetId: '1' }], optional: undefined })).toBe('{"operations":[{"targetId":"1"}]}');
    const sparse = [undefined, undefined, 'value'];
    Reflect.deleteProperty(sparse, '1');
    expect(NativeJSON.stringify(sparse)).toBe('[null,null,"value"]');
    expect(calls).toBe(0);
  } finally {
    JSON.parse = parse;
    JSON.stringify = stringify;
  }
});

test('serialization bypasses inherited toJSON without invoking user callbacks', () => {
  const arrayDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, 'toJSON');
  const objectDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, 'toJSON');
  let calls = 0;
  try {
    const descriptor = {
      configurable: true,
      value: () => {
        calls++;
        return ['(revive:eval)', 'danger()'];
      }
    };
    Object.defineProperty(Array.prototype, 'toJSON', descriptor);
    Object.defineProperty(Object.prototype, 'toJSON', descriptor);
    expect(NativeJSON.stringify({ list: ['safe'] })).toBe('{"list":["safe"]}');
    expect(calls).toBe(0);
    expect(() =>
      NativeJSON.stringify({
        toJSON: () => {
          calls++;
        }
      })
    ).toThrow();
    const accessor = Object.defineProperty({}, 'secret', {
      enumerable: true,
      get: () => {
        calls++;
        return 'value';
      }
    });
    expect(() => NativeJSON.stringify(accessor)).toThrow('accessors');
    expect(calls).toBe(0);
  } finally {
    if (arrayDescriptor) Object.defineProperty(Array.prototype, 'toJSON', arrayDescriptor);
    else Reflect.deleteProperty(Array.prototype, 'toJSON');
    if (objectDescriptor) Object.defineProperty(Object.prototype, 'toJSON', objectDescriptor);
    else Reflect.deleteProperty(Object.prototype, 'toJSON');
  }
});

test('rejects cycles and non JSON values', () => {
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  for (const value of [cycle, { fn: () => null }, new Map(), new Date(), { number: NaN }, { number: Infinity }, { bigint: 1n }]) expect(() => NativeJSON.stringify(value)).toThrow();
  expect(NativeJSON.parse('{"__proto__":{"polluted":true}}')).toEqual({ ['__proto__']: { polluted: true } });
  expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
});
