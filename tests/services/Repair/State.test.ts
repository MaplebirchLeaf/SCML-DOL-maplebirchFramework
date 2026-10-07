import { expect, test } from 'bun:test';
import RepairState, { type JSONValue, type RepairStateChange, type RepairStatePolicy } from '../../../src/services/Repair/State';
import { NativeJSON } from '../../../src/services/Repair/Json';
import { RepairRecipeParser } from '../../../src/services/Repair/Recipe';

const policy: RepairStatePolicy = { modName: 'maplebirch', path: ['Example', 'progress'], scope: 'state' };
const statePolicy: RepairStatePolicy = { modName: 'maplebirch', path: ['world', 'progress'], scope: 'state' };
const change = (type: RepairStateChange['type'], name: string, extra: Pick<RepairStateChange, 'value' | 'to'> = {}): RepairStateChange => ({ type, path: [...policy.path, name], ...extra });
const content = (value: unknown): string => NativeJSON.stringify({ exists: true, value });
const result = (value: unknown, changes: RepairStateChange[]): unknown => (NativeJSON.parse(RepairState.validate(policy, content(value), changes)) as { value: unknown }).value;

test('policy validation detaches paths from the exact current binding', () => {
  const source = { ...policy, path: [...policy.path] };
  const trusted = RepairState.policy(source);
  source.path[0] = 'player';
  source.modName = 'changed';
  expect(trusted.modName).toBe(policy.modName);
  expect(trusted.path).toEqual(policy.path);
  expect(trusted.path).not.toBe(source.path);
  expect(trusted).not.toBe(source);
  expect(trusted).not.toHaveProperty('schema');
});

test('set repairs JSON types and new fields while rejecting unsafe non JSON state', () => {
  expect(result({ count: 'old wrong type' }, [change('set', 'count', { value: 7 })])).toEqual({ count: 7 });
  expect(result({ count: 'wrong' }, [change('set', 'enabled', { value: true })])).toEqual({ count: 'wrong', enabled: true });
  expect(result({ count: 1 }, [change('set', 'extra', { value: true })])).toEqual({ count: 1, extra: true });
  expect(() => result({ count: 1 }, [change('set', 'count', { value: Infinity })])).toThrow();
  expect(NativeJSON.parse(RepairState.validate(policy, content('old'), [{ type: 'set', path: policy.path, value: 9 }]))).toEqual({ exists: true, value: 9 });
});

test('delete, rename and copy simulate sequentially and require present sources and fresh destinations', () => {
  const before = { count: 1, obsolete: 'value', optional: null };
  const after = result(before, [change('rename', 'obsolete', { to: [...policy.path, 'renamed'] }), change('copy', 'renamed', { to: [...policy.path, 'copied'] }), change('delete', 'optional')]);
  expect(after).toEqual({ count: 1, renamed: 'value', copied: 'value' });
  expect(before).toEqual({ count: 1, obsolete: 'value', optional: null });
  expect(result({ count: 1 }, [change('delete', 'count')])).toEqual({});
  expect(() => result({}, [change('delete', 'count')])).toThrow('missing');
  expect(() => result({ count: 1, name: 'old', copied: 'occupied' }, [change('copy', 'name', { to: [...policy.path, 'copied'] })])).toThrow('exists');
  for (const to of [[...policy.path, 'nested'], [...policy.path, 'nested', 'first'], [...policy.path]]) expect(() => result({ count: 1, nested: {} }, [change('rename', 'nested', { to })])).toThrow();
});

test('merge accepts JSON fields while fill preserves false, zero and null', () => {
  const before = { count: 0, enabled: false, optional: null, nested: { first: 0 } };
  const fill: RepairStateChange = { type: 'fill', path: policy.path, value: { count: 9, enabled: true, optional: null, nested: { first: 9, second: 2 } } };
  expect(result(before, [fill])).toEqual({ count: 0, enabled: false, optional: null, nested: { first: 0, second: 2 } });
  expect(result(before, [{ ...fill, type: 'merge' }])).toEqual({ count: 9, enabled: true, optional: null, nested: { first: 9, second: 2 } });
  expect(result(before, [{ type: 'merge', path: policy.path, value: { newField: 1 } }])).toEqual({ ...before, newField: 1 });
  expect(result(before, [{ type: 'fill', path: [...policy.path, 'nested'], value: { newField: 1 } }])).toEqual({ ...before, nested: { first: 0, newField: 1 } });
  const root = { ...policy, path: ['Example'] };
  expect(NativeJSON.parse(RepairState.validate(root, '{"exists":false}', [{ type: 'fill', path: root.path, value: { count: 0 } }]))).toEqual({ exists: true, value: { count: 0 } });
  expect(NativeJSON.parse(RepairState.validate(root, content({ count: 0 }), [{ type: 'set', path: root.path, value: { count: 1 } }]))).toEqual({ exists: true, value: { count: 1 } });
  expect(() => result({ count: 1 }, [{ type: 'merge', path: policy.path, value: 1 }])).toThrow('object');
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
  expect(result({ count: null }, [change('fill', 'count', { value: 1 })])).toEqual({ count: null });
  expect(result({ count: 1 }, [change('fill', 'newField', { value: 1 })])).toEqual({ count: 1, newField: 1 });
  const root = { ...policy, path: ['Example'] };
  expect(NativeJSON.parse(RepairState.validate(root, '{"exists":false}', [{ type: 'fill', path: root.path, value: 1 }]))).toEqual({ exists: true, value: 1 });
  const nested = { ...policy, path: ['player', 'modFlag'] };
  expect(NativeJSON.parse(RepairState.validate(nested, '{"exists":false}', [{ type: 'fill', path: nested.path, value: false }]))).toEqual({ exists: true, value: false });
});

test('state bindings reject schema and obsolete scopes without adapting them', () => {
  for (const scope of ['mod', 'game', 'vanilla']) expect(() => RepairState.policy({ ...policy, scope, schema: { type: 'number' } })).toThrow();
  for (const schema of [
    { type: 'array', items: { type: 'string', enum: ['yes', 'no'] } },
    { type: 'object', properties: {}, required: ['missing'] },
    { type: 'number', enum: ['wrong'] },
    { type: 'number', additionalProperties: true }
  ])
    expect(() => RepairState.policy({ ...policy, schema })).toThrow();
  for (const modName of ['', ' ', 'x'.repeat(129), 1, null]) expect(() => RepairState.policy({ ...policy, modName })).toThrow();
  expect(NativeJSON.parse(RepairState.validate(policy, content(['old']), [{ type: 'set', path: policy.path, value: ['yes', 'arbitrary JSON'] }]))).toEqual({
    exists: true,
    value: ['yes', 'arbitrary JSON']
  });
});

test('policy paths reject dangerous roots, subtree escapes and unstructured changes', () => {
  for (const segment of ['__proto__', 'prototype', 'constructor', 'V', 'setup', 'window']) expect(() => RepairState.policy({ ...policy, path: ['Example', segment] })).toThrow();
  expect(() => RepairState.validate(policy, content({ count: 1 }), [{ type: 'set', path: ['Example', 'progressOther', 'count'], value: 2 }])).toThrow('escapes');
  expect(() => RepairState.changes([{ type: 'set', path: ['Example', 'x'], value: 1, arbitrary: true }])).toThrow();
  expect(() => RepairState.changes([{ type: 'delete', path: ['Example', 'x'], value: 1 }])).toThrow();
  expect(() => RepairState.changes([{ type: 'set', path: ['Example', 'x'], value: () => 1 }])).toThrow();
});

test('state bindings use exact paths without inferring restrictions from game-specific names', () => {
  for (const name of ['player', 'options', 'NPCList', 'timeStamp', 'world', 'inventory']) {
    const root = { ...policy, path: [name] };
    expect(RepairState.policy(root)).toEqual(root);
    for (const type of ['merge', 'set'] as const)
      expect(NativeJSON.parse(RepairState.validate(root, content({ count: 1 }), [{ type, path: root.path, value: { count: 2 } }]))).toEqual({ exists: true, value: { count: 2 } });
  }
});

test('obsolete scopes cannot grant any JSON migration permission', () => {
  for (const scope of ['mod', 'game', 'vanilla']) {
    const obsolete = NativeJSON.parse(NativeJSON.stringify({ ...policy, scope })) as RepairStatePolicy;
    for (const type of ['set', 'fill', 'merge', 'delete', 'rename', 'copy'] as const) {
      const migration: RepairStateChange = {
        type,
        path: [...policy.path, 'count'],
        ...(['set', 'fill', 'merge'].includes(type) ? { value: type === 'merge' ? {} : 2 } : {}),
        ...(['rename', 'copy'].includes(type) ? { to: [...policy.path, 'name'] } : {})
      };
      expect(() => RepairState.validate(obsolete, content({ count: 1 }), [migration])).toThrow();
    }
  }
});

test('automatic state bindings support every migration without fixing the existing JSON type', () => {
  const before = { count: 'legacy', name: 'move me', obsolete: true, enabled: false, optional: null, nested: { first: 0 } };
  const after = RepairState.validate(statePolicy, content(before), [
    { type: 'set', path: [...statePolicy.path, 'count'], value: { fixed: [1, null] } },
    { type: 'rename', path: [...statePolicy.path, 'name'], to: [...statePolicy.path, 'renamed'] },
    { type: 'copy', path: [...statePolicy.path, 'renamed'], to: [...statePolicy.path, 'copied'] },
    { type: 'delete', path: [...statePolicy.path, 'obsolete'] },
    { type: 'merge', path: statePolicy.path, value: { extra: { valid: true }, nested: { second: 2 } } },
    { type: 'fill', path: statePolicy.path, value: { count: 9, enabled: true, optional: 1, nested: { first: 9, third: 3 }, missing: 'new' } }
  ]);
  expect(NativeJSON.parse(after)).toEqual({
    exists: true,
    value: { count: { fixed: [1, null] }, renamed: 'move me', copied: 'move me', enabled: false, optional: null, nested: { first: 0, second: 2, third: 3 }, extra: { valid: true }, missing: 'new' }
  });
  expect(before).toEqual({ count: 'legacy', name: 'move me', obsolete: true, enabled: false, optional: null, nested: { first: 0 } });
  expect(NativeJSON.parse(RepairState.validate(statePolicy, content('wrong type'), [{ type: 'set', path: statePolicy.path, value: [0, false, null] }]))).toEqual({
    exists: true,
    value: [0, false, null]
  });
  expect(NativeJSON.parse(RepairState.validate(statePolicy, '{"exists":false}', [{ type: 'fill', path: statePolicy.path, value: false }]))).toEqual({ exists: true, value: false });
  expect(NativeJSON.parse(RepairState.validate(statePolicy, content(before), [{ type: 'delete', path: statePolicy.path }]))).toEqual({ exists: false });
  expect(
    NativeJSON.parse(
      RepairState.validate(statePolicy, content(before), [
        { type: 'delete', path: statePolicy.path },
        { type: 'set', path: statePolicy.path, value: 0 }
      ])
    )
  ).toEqual({ exists: true, value: 0 });
  const root = { ...statePolicy, path: ['player'] };
  expect(NativeJSON.parse(RepairState.validate(root, content({ old: true }), [{ type: 'set', path: root.path, value: 'fixed' }]))).toEqual({ exists: true, value: 'fixed' });
});

test('automatic state migrations remain inside their bound parent or leaf and require safe JSON', () => {
  const snapshot = content({ count: 1, name: 'source' });
  for (const path of [['world', 'progressOther', 'count'], ['world'], ['other', 'count']]) {
    expect(() => RepairState.validate(statePolicy, snapshot, [{ type: 'set', path, value: 2 }])).toThrow('escapes');
    for (const type of ['rename', 'copy'] as const) expect(() => RepairState.validate(statePolicy, snapshot, [{ type, path: [...statePolicy.path, 'name'], to: path }])).toThrow('escapes');
  }
  const leaf = { ...statePolicy, path: [...statePolicy.path, 'name'] };
  expect(() => RepairState.validate(leaf, content('source'), [{ type: 'rename', path: leaf.path, to: [...statePolicy.path, 'renamed'] }])).toThrow('escapes');
  for (const segment of ['__proto__', 'prototype', 'constructor', 'V', 'T', 'C', 'setup', 'window', 'globalThis', 'State', 'Story', 'Renderer']) {
    expect(() => RepairState.policy({ ...statePolicy, path: [segment] })).toThrow();
    expect(() => RepairState.validate(statePolicy, snapshot, [{ type: 'set', path: [...statePolicy.path, segment], value: 1 }])).toThrow();
  }
  for (const value of [Infinity, new Date(), new Map(), () => 1, { nested: undefined }, NativeJSON.parse('{"__proto__":{"polluted":true}}')])
    expect(() => RepairState.validate(statePolicy, snapshot, [{ type: 'set', path: statePolicy.path, value } as RepairStateChange])).toThrow();
  expect(() => RepairState.validate(statePolicy, snapshot, [{ type: 'set', path: statePolicy.path, value: '字'.repeat(6000) }])).toThrow('16 KiB');
  let deep: unknown = 0;
  for (let depth = 0; depth < 40; depth++) deep = { child: deep };
  expect(() => RepairState.validate(statePolicy, snapshot, [{ type: 'set', path: statePolicy.path, value: deep } as RepairStateChange])).toThrow('deep');
});

test('variable paths accept only supported roots and complete static member chains', () => {
  const source = `V.player.health; $Example["progress"][0].count; State.variables.world['progress'].flag; SugarCube.State.variables["inventory"][12].name; V["hyphen-root"]["hyphen-key"]; V._private.score; $_mod.flag;`;
  expect([...RepairState.paths(source)]).toEqual([
    ['player', 'health'],
    ['Example', 'progress', '0', 'count'],
    ['world', 'progress', 'flag'],
    ['inventory', '12', 'name'],
    ['hyphen-root', 'hyphen-key'],
    ['_private', 'score'],
    ['_mod', 'flag']
  ]);
  for (const source of [
    'V.player[index].name',
    '$Example[compute()].flag',
    'State.variables.world[1 + 1]',
    'SugarCube.State.variables.world[key]',
    'V.world[`progress`]',
    'V.world[`progress${index}`]',
    'someV.player.health',
    'object.V.player.health',
    'V.window.flag',
    '$constructor.value',
    'V.player.__proto__.flag'
  ])
    expect([...RepairState.paths(source)]).toEqual([]);
});

test('variable path offsets exclude strings and comments while retaining static quoted indexes', () => {
  const source = `"V.fake.flag"; /* $comment.fake */ V.world["progress"].count; // State.variables.comment.flag\nSugarCube.State.variables.list[2];`;
  expect([...RepairState.paths(source, RepairRecipeParser.codeOffsets(source))]).toEqual([
    ['world', 'progress', 'count'],
    ['list', '2']
  ]);
});

test('optional variable paths keep static members and reject dynamic or incomplete chains', () => {
  const source = `V?.player?.health; $Example?.["progress"]?.[0]?.count; State.variables?.["world"]?.flag; SugarCube.State.variables?.inventory?.[12]?.name;`;
  expect([...RepairState.paths(source)]).toEqual([
    ['player', 'health'],
    ['Example', 'progress', '0', 'count'],
    ['world', 'flag'],
    ['inventory', '12', 'name']
  ]);
  for (const source of [
    'V.player?.[index].name',
    '$Example?.[compute()].flag',
    'State.variables.world?.[1 + 1]',
    'SugarCube.State.variables.world?.[`dynamic${key}`]',
    'V.player.',
    'V.player?.',
    '$Example.progress.123',
    'V.player?.[',
    'V.player./* interrupted */health',
    'V.player// interrupted\n.health'
  ])
    expect([...RepairState.paths(source)]).toEqual([]);
});

test('variable roots reject aliases across whitespace and comments using code offsets', () => {
  for (const source of [
    'other . V.foo',
    'other?. State.variables.foo',
    'other . $Example.flag',
    'other . SugarCube.State.variables.foo',
    'other . /* ignored */ V.foo',
    'other?. /* ignored */ State.variables.foo',
    'other . // ignored\n V.foo',
    'other?. /* V.fake */ SugarCube.State.variables.foo'
  ])
    expect([...RepairState.paths(source, RepairRecipeParser.codeOffsets(source))]).toEqual([]);
  const source = 'other; /* comment ending with . */ V.foo; "other . V.fake"; $Example.flag;';
  expect([...RepairState.paths(source, RepairRecipeParser.codeOffsets(source))]).toEqual([['foo'], ['Example', 'flag']]);
});

test('target paths bind readable small parents and the first missing or noncontainer prefix', () => {
  const path = ['world', 'progress', 'count'];
  expect(RepairState.targetPath(path, { world: { progress: { count: 1, sibling: false } } })).toEqual(['world', 'progress']);
  expect(RepairState.targetPath(['world'], { world: { progress: {} } })).toEqual(['world']);
  expect(RepairState.targetPath(path, {})).toEqual(['world']);
  expect(RepairState.targetPath(path, { world: {} })).toEqual(['world', 'progress']);
  for (const progress of [null, 0, false, 'legacy']) expect(RepairState.targetPath(path, { world: { progress } })).toEqual(['world', 'progress']);
  expect(RepairState.targetPath(['items', '0', 'name'], { items: [] })).toEqual(['items', '0']);
  expect(RepairState.targetPath(['items', '0', 'name'], { items: [{ name: 'known', sibling: true }] })).toEqual(['items', '0']);
});

test('target paths fall back to the complete leaf when a parent is large or unsafe to serialize', () => {
  const path = ['world', 'progress', 'count'];
  const progress: Record<string, unknown> = { count: 1, large: '字'.repeat(6000) };
  expect(RepairState.targetPath(path, { world: { progress } })).toEqual(path);
  progress.large = () => 1;
  expect(RepairState.targetPath(path, { world: { progress } })).toEqual(path);
  progress.large = progress;
  expect(RepairState.targetPath(path, { world: { progress } })).toEqual(path);
  let reads = 0;
  Object.defineProperty(progress, 'large', {
    enumerable: true,
    configurable: true,
    get: () => {
      reads++;
      return 'unsafe';
    }
  });
  expect(RepairState.targetPath(path, { world: { progress } })).toEqual(path);
  expect(reads).toBe(0);
  Object.defineProperty(progress, 'count', {
    enumerable: true,
    configurable: true,
    get: () => {
      reads++;
      return 1;
    }
  });
  expect(() => RepairState.targetPath(path, { world: { progress } })).toThrow('accessors');
  expect(() => RepairState.targetPath(['world', 'constructor'], { world: {} })).toThrow('path');
  expect(() => RepairState.targetPath(['items', '2', 'name'], { items: [] })).toThrow('array index');
  expect(reads).toBe(0);
});

test('automatic bindings repair missing and null parents at the selected prefix and restore the original save', () => {
  for (const root of [{}, { world: { progress: null, unrelated: 'keep' } }, { world: { progress: false, unrelated: 'keep' } }]) {
    const before = structuredClone(root);
    const path = RepairState.targetPath(['world', 'progress', 'count'], root);
    const bound = { ...statePolicy, path };
    const handle = RepairState.handle(root, bound);
    const value: JSONValue = path.length === 1 ? { progress: { count: 1 } } : { count: 1 };
    handle.write(RepairState.validate(bound, handle.read(), [{ type: 'set', path, value }]));
    expect(RepairState.read(['world', 'progress'], root)).toBe(content({ count: 1 }));
    if (Object.hasOwn(before, 'world')) expect(RepairState.read(['world', 'unrelated'], root)).toBe(content('keep'));
    handle.restore();
    expect(root).toEqual(before);
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

test('automatic deletion restores descriptors and array parent snapshots while rejecting array leaf deletion', () => {
  const value = { count: 'old' };
  const progress = Object.defineProperty({}, 'progress', { value, enumerable: true, configurable: true, writable: false });
  const root = { world: progress };
  const descriptor = Object.getOwnPropertyDescriptor(progress, 'progress');
  const handle = RepairState.handle(root, statePolicy);
  handle.write('{"exists":false}');
  expect(handle.read()).toBe('{"exists":false}');
  expect(Object.hasOwn(progress, 'progress')).toBe(false);
  handle.restore();
  expect(Object.getOwnPropertyDescriptor(progress, 'progress')).toEqual(descriptor);
  expect(Reflect.get(progress, 'progress')).toBe(value);
  const first = { name: 'before' },
    selected = { name: 'selected' },
    last = { name: 'after' };
  const array = { items: [first, selected, last] };
  const original = array.items;
  const descriptors = Object.getOwnPropertyDescriptors(original);
  const item = RepairState.handle(array, { ...statePolicy, path: ['items', '1'] });
  expect(() => item.write('{"exists":false}')).toThrow('array');
  expect(array.items).toBe(original);
  expect(Object.getOwnPropertyDescriptors(original)).toEqual(descriptors);
  const parentPolicy = { ...statePolicy, path: ['items'] };
  const parent = RepairState.handle(array, parentPolicy);
  parent.write(RepairState.validate(parentPolicy, parent.read(), [{ type: 'delete', path: ['items', '1'] }]));
  expect(array.items).toEqual([first, last]);
  parent.restore();
  expect(array.items).toBe(original);
  expect(array.items).toEqual([first, selected, last]);
  expect(array.items[0]).toBe(first);
  expect(array.items[1]).toBe(selected);
  expect(array.items[2]).toBe(last);
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
  first.write('{"exists":false}');
  expect(Object.hasOwn(root.Example, 'progress')).toBe(false);
  expect(root.Example.locked).toEqual({ count: 1 });
  first.restore();
  expect(root.Example).toEqual({ progress: { count: 1 }, locked: { count: 1 } });
});

test('state snapshots, policies and changes have bounded JSON size and depth', () => {
  expect(() => result({ count: 1 }, [change('set', 'name', { value: '字'.repeat(6000) })])).toThrow('16 KiB');
  expect(() => RepairState.validate(policy, '{"exists":false,"value":0}', [change('set', 'count', { value: 1 })])).toThrow();
  let value: unknown = 0;
  for (let depth = 0; depth < 40; depth++) value = { child: value };
  expect(() => RepairState.read(policy.path, { Example: { progress: value } })).toThrow('deep');
  expect(() => RepairState.changes([{ type: 'set', path: ['Example', 'name'], value: 'x'.repeat(17000) }])).toThrow('16 KiB');
});
