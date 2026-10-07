import { expect, test } from 'bun:test';
import RepairState, { type RepairStateChange, type RepairStatePolicy, type RepairStateSchema } from '../../src/services/Repair/State';
import { NativeJSON } from '../../src/services/Repair/Json';

const schema: RepairStateSchema = {
  type: 'object',
  properties: {
    count: { type: 'number' },
    enabled: { type: 'boolean' },
    name: { type: 'string' },
    renamed: { type: 'string' },
    copied: { type: 'string' },
    optional: { type: 'null' },
    nested: { type: 'object', properties: { first: { type: 'number' }, second: { type: 'number' } } },
    list: { type: 'array', items: { type: 'number' } }
  },
  required: ['count']
};
const policy: RepairStatePolicy = { modName: 'example', path: ['Example', 'progress'], schema, scope: 'mod' };
const change = (type: RepairStateChange['type'], name: string, extra: Pick<RepairStateChange, 'value' | 'to'> = {}): RepairStateChange => ({ type, path: [...policy.path, name], ...extra });
const content = (value: unknown): string => NativeJSON.stringify({ exists: true, value });
const result = (value: unknown, changes: RepairStateChange[]): unknown => (NativeJSON.parse(RepairState.validate(policy, content(value), changes)) as { value: unknown }).value;

test('state registration binds detached immutable policies to their exact paths', () => {
  const state = new RepairState();
  const source = { ...policy, path: [...policy.path], schema: { type: 'number' as const } };
  expect(state.register(source)).toBe(true);
  source.path[0] = 'player';
  source.schema.type = 'number';
  const trusted = state.get(NativeJSON.stringify(policy.path))!;
  expect(trusted.path).toEqual(policy.path);
  expect(Object.isFrozen(trusted.schema)).toBe(true);
  expect(state.register({ ...policy, schema: { type: 'number' } })).toBe(false);
});

test('set fixes an existing schema violation while unsafe non JSON state remains rejected', () => {
  expect(result({ count: 'old wrong type' }, [change('set', 'count', { value: 7 })])).toEqual({ count: 7 });
  expect(() => result({ count: 'wrong' }, [change('set', 'enabled', { value: true })])).toThrow('schema');
  expect(() => result({ count: 1 }, [change('set', 'extra', { value: true })])).toThrow('Unknown');
  expect(() => result({ count: 1 }, [change('set', 'count', { value: Infinity })])).toThrow();
  const repairObject = { ...policy, schema: { type: 'number' as const } };
  expect(NativeJSON.parse(RepairState.validate(repairObject, content('old'), [{ type: 'set', path: policy.path, value: 9 }]))).toEqual({ exists: true, value: 9 });
});

test('delete, rename and copy simulate sequentially and enforce required fields and fresh destinations', () => {
  const before = { count: 1, legacy: 'value', optional: null };
  const after = result(before, [change('rename', 'legacy', { to: [...policy.path, 'renamed'] }), change('copy', 'renamed', { to: [...policy.path, 'copied'] }), change('delete', 'optional')]);
  expect(after).toEqual({ count: 1, renamed: 'value', copied: 'value' });
  expect(before).toEqual({ count: 1, legacy: 'value', optional: null });
  expect(() => result({ count: 1 }, [change('delete', 'count')])).toThrow('Required');
  expect(() => result({ count: 1, name: 'old', copied: 'occupied' }, [change('copy', 'name', { to: [...policy.path, 'copied'] })])).toThrow('exists');
  for (const to of [[...policy.path, 'nested'], [...policy.path, 'nested', 'first'], [...policy.path]]) expect(() => result({ count: 1, nested: {} }, [change('rename', 'nested', { to })])).toThrow();
});

test('merge overwrites declared fields while fill preserves false, zero and null', () => {
  const before = { count: 0, enabled: false, optional: null, nested: { first: 0 } };
  const fill: RepairStateChange = { type: 'fill', path: policy.path, value: { count: 9, enabled: true, optional: null, nested: { first: 9, second: 2 } } };
  expect(result(before, [fill])).toEqual({ count: 0, enabled: false, optional: null, nested: { first: 0, second: 2 } });
  expect(result(before, [{ ...fill, type: 'merge' }])).toEqual({ count: 9, enabled: true, optional: null, nested: { first: 9, second: 2 } });
  expect(() => result(before, [{ type: 'merge', path: policy.path, value: { unknown: 1 } }])).toThrow('Unknown');
  expect(() => result(before, [{ type: 'fill', path: [...policy.path, 'nested'], value: { unknown: 1 } }])).toThrow('Unknown');
  const modRoot = { ...policy, path: ['Example'] };
  expect(NativeJSON.parse(RepairState.validate(modRoot, '{"exists":false}', [{ type: 'fill', path: ['Example'], value: { count: 0 } }]))).toEqual({ exists: true, value: { count: 0 } });
  expect(() => RepairState.validate(modRoot, content({ count: 0 }), [{ type: 'set', path: ['Example'], value: { count: 1 } }])).toThrow('complete mod root');
});

test('fill supplements missing scalar and array fields while preserving existing values', () => {
  expect(
    result({ count: 0, enabled: false, optional: null }, [
      change('fill', 'count', { value: 9 }),
      change('fill', 'enabled', { value: true }),
      change('fill', 'optional', { value: 5 }),
      change('fill', 'name', { value: 'new' }),
      change('fill', 'list', { value: [1, 2] })
    ])
  ).toEqual({ count: 0, enabled: false, optional: null, name: 'new', list: [1, 2] });
  expect(result({}, [change('fill', 'count', { value: 0 })])).toEqual({ count: 0 });
  expect(result({ count: 1, list: [3] }, [change('fill', 'list', { value: [1, 2] })])).toEqual({ count: 1, list: [3] });
  expect(() => result({ count: null }, [change('fill', 'count', { value: 1 })])).toThrow('schema');
  expect(() => result({ count: 1 }, [change('fill', 'unknown', { value: 1 })])).toThrow('Unknown');
  const modRoot = { ...policy, path: ['Example'], schema: { type: 'number' as const } };
  expect(() => RepairState.validate(modRoot, '{"exists":false}', [{ type: 'fill', path: ['Example'], value: 1 }])).toThrow('complete mod root');
  const vanilla = { ...policy, path: ['player', 'modFlag'], scope: 'vanilla' as const, schema: { type: 'boolean' as const } };
  expect(NativeJSON.parse(RepairState.validate(vanilla, '{"exists":false}', [{ type: 'fill', path: vanilla.path, value: false }]))).toEqual({ exists: true, value: false });
});

test('schema accepts only declared structures, types and enum values', () => {
  const list = { ...policy, schema: { type: 'array' as const, items: { type: 'string' as const, enum: ['yes', 'no'] } } };
  expect(NativeJSON.parse(RepairState.validate(list, content(['old']), [{ type: 'set', path: policy.path, value: ['yes'] }]))).toEqual({ exists: true, value: ['yes'] });
  expect(() => RepairState.validate(list, content([]), [{ type: 'set', path: policy.path, value: ['wrong'] }])).toThrow('schema');
  expect(() => RepairState.policy({ ...policy, schema: { type: 'array' } })).toThrow();
  expect(() => RepairState.policy({ ...policy, schema: { type: 'object', properties: {}, required: ['missing'] } })).toThrow();
  expect(() => RepairState.policy({ ...policy, schema: { type: 'number', enum: ['wrong'] } })).toThrow();
  expect(() => RepairState.policy({ ...policy, schema: { type: 'number', additionalProperties: true } })).toThrow();
});

test('policy paths reject dangerous roots, subtree escapes and unstructured changes', () => {
  for (const segment of ['__proto__', 'prototype', 'constructor', 'V', 'setup', 'window']) expect(() => RepairState.policy({ ...policy, path: ['Example', segment] })).toThrow();
  expect(() => RepairState.validate(policy, content({ count: 1 }), [{ type: 'set', path: ['Example', 'progressOther', 'count'], value: 2 }])).toThrow('escapes');
  expect(() => RepairState.changes([{ type: 'set', path: ['Example', 'x'], value: 1, arbitrary: true }])).toThrow();
  expect(() => RepairState.changes([{ type: 'delete', path: ['Example', 'x'], value: 1 }])).toThrow();
  expect(() => RepairState.changes([{ type: 'set', path: ['Example', 'x'], value: () => 1 }])).toThrow();
});

test('state permissions use explicit scopes without inferring ownership from game-specific names', () => {
  for (const root of ['player', 'options', 'NPCList', 'timeStamp', 'world', 'inventory']) {
    const mod = { ...policy, path: [root] };
    expect(RepairState.policy(mod)).toEqual(mod);
    expect(NativeJSON.parse(RepairState.validate(mod, content({ count: 1 }), [{ type: 'merge', path: mod.path, value: { count: 2 } }]))).toEqual({ exists: true, value: { count: 2 } });
    expect(() => RepairState.validate(mod, content({ count: 1 }), [{ type: 'set', path: mod.path, value: { count: 2 } }])).toThrow('complete mod root');
  }
});

test('game scope and legacy vanilla permissions allow set and fill only inside a nested authorization', () => {
  for (const scope of ['game', 'vanilla'] as const) {
    const game = { ...policy, path: ['world', 'progress'], scope };
    expect(() => RepairState.policy({ ...game, path: ['world'] })).toThrow();
    expect(RepairState.policy(game).scope).toBe(scope);
    expect(NativeJSON.parse(RepairState.validate(game, content({ count: 1 }), [{ type: 'set', path: [...game.path, 'count'], value: 2 }]))).toEqual({ exists: true, value: { count: 2 } });
    for (const type of ['merge', 'delete', 'rename', 'copy'] as const) {
      const migration: RepairStateChange = {
        type,
        path: [...game.path, 'count'],
        ...(type === 'merge' ? { value: {} } : {}),
        ...(['rename', 'copy'].includes(type) ? { to: [...game.path, 'name'] } : {})
      };
      expect(() => RepairState.validate(game, content({ count: 1 }), [migration])).toThrow('only set and fill');
    }
  }
});

test('read refuses getters, functions, cycles and custom prototypes without touching other V data', () => {
  let getterCalls = 0;
  const root = { Example: { progress: { count: 1 } } };
  Object.defineProperty(root, 'unrelated', {
    get: () => {
      getterCalls++;
      return {};
    }
  });
  expect(RepairState.read(policy.path, root)).toBe(content({ count: 1 }));
  Object.defineProperty(root.Example, 'progress', {
    get: () => {
      getterCalls++;
      return { count: 1 };
    }
  });
  expect(() => RepairState.read(policy.path, root)).toThrow('accessors');
  expect(getterCalls).toBe(0);
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  for (const value of [new Date(), new Map(), { fn: () => 0 }, cycle, { count: NaN }, Object.assign([1], { extra: 'must not be lost' })])
    expect(() => RepairState.read(policy.path, { Example: { progress: value } })).toThrow();
  expect(() => RepairState.read(policy.path, { Example: Object.create({ progress: { count: 1 } }) })).toThrow('plain data');
  expect(RepairState.read(policy.path, {})).toBe('{"exists":false}');
  const path = ['Example', 'progress'];
  Object.defineProperty(path, '0', {
    get: () => {
      getterCalls++;
      return 'Example';
    }
  });
  expect(() => RepairState.read(path, {})).toThrow('path');
  expect(getterCalls).toBe(0);
});

test('handles restore original descriptors, missing parents and appended array length', () => {
  const value = { count: 'wrong' };
  const progress = Object.defineProperty({}, 'progress', { value, enumerable: true, configurable: true, writable: false });
  const root = { Example: progress };
  const before = Object.getOwnPropertyDescriptor(progress, 'progress');
  const handle = RepairState.handle(root, policy);
  handle.write(content({ count: 2 }));
  expect(handle.read()).toBe(content({ count: 2 }));
  handle.restore();
  expect(Object.getOwnPropertyDescriptor(progress, 'progress')).toEqual(before);
  expect(Reflect.get(progress, 'progress')).toBe(value);
  const missing = {};
  const fresh = RepairState.handle(missing, policy);
  fresh.write(content({ count: 1 }));
  fresh.restore();
  expect(missing).toEqual({});
  const array = { Example: [] as unknown[] };
  const itemPolicy = { ...policy, path: ['Example', '0'] };
  const append = RepairState.handle(array, itemPolicy);
  append.write(content({ count: 3 }));
  append.restore();
  expect(array.Example).toEqual([]);
});

test('rollback rejects identical save data with new object identities before touching any slot', () => {
  const root: Record<string, unknown> = {};
  const handle = RepairState.handle(root, policy);
  handle.write(content({ count: 1 }));
  const written = root.Example;
  const backup = { progress: { count: 1 }, unrelated: 'active save data' };
  root.Example = backup;
  expect(handle.read()).toBe(content({ count: 1 }));
  expect(() => handle.restore()).toThrow('rollback rejected');
  expect(root.Example).toBe(backup);
  expect(root.Example).toEqual({ progress: { count: 1 }, unrelated: 'active save data' });
  expect(written).toEqual({ progress: { count: 1 } });

  const existing = { Example: { progress: { count: 0 } } };
  const leaf = RepairState.handle(existing, policy);
  leaf.write(content({ count: 1 }));
  const replacement = { count: 1 };
  existing.Example.progress = replacement;
  expect(() => leaf.restore()).toThrow('rollback rejected');
  expect(existing.Example.progress).toBe(replacement);

  const attributes = RepairState.handle(existing, policy);
  attributes.write(content({ count: 2 }));
  Object.defineProperty(existing.Example, 'progress', { enumerable: false });
  expect(() => attributes.restore()).toThrow('rollback rejected');
  expect(existing.Example.progress).toEqual({ count: 2 });
});

test('failed writes leave immutable state intact and callers can roll back an earlier target', () => {
  const root = { Example: { progress: { count: 1 }, locked: { count: 1 } } };
  Object.defineProperty(root.Example, 'locked', { value: root.Example.locked, enumerable: true, configurable: false, writable: false });
  const first = RepairState.handle(root, policy);
  const second = RepairState.handle(root, { ...policy, path: ['Example', 'locked'] });
  first.write(content({ count: 2 }));
  expect(() => second.write(content({ count: 2 }))).toThrow();
  first.restore();
  expect(root.Example).toEqual({ progress: { count: 1 }, locked: { count: 1 } });
  expect(() => first.write('{"exists":false}')).toThrow('policy root');
});

test('state snapshots, policies and changes have bounded JSON size and depth', () => {
  expect(() => result({ count: 1 }, [change('set', 'name', { value: '字'.repeat(6000) })])).toThrow('16 KiB');
  expect(() => RepairState.validate(policy, '{"exists":false,"value":0}', [change('set', 'count', { value: 1 })])).toThrow();
  let value: unknown = 0;
  for (let depth = 0; depth < 40; depth++) value = { child: value };
  expect(() => RepairState.read(policy.path, { Example: { progress: value } })).toThrow('deep');
  expect(() => RepairState.changes([{ type: 'set', path: ['Example', 'name'], value: 'x'.repeat(17000) }])).toThrow('16 KiB');
});
