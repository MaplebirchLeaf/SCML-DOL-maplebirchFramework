import '../support/runtime';
import { strict as assert } from 'node:assert';
import { mock } from 'bun:test';
import { clone, mergeFn } from '../../src/utils/object';

let state: Record<string, any> = { options: { maplebirch: {} }, maplebirch: {} };
const calls: string[] = [];
const listeners = new Map<string, () => void>();
const storage = new Map<string, string>();
const core: any = {
  host: {
    modLoader: { lodash: { isPlainObject: (value: unknown) => value !== null && typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value)) } },
    sugarcube: { passage: { title: 'Home' } }
  },
  on: (name: string, callback: () => void) => listeners.set(name, callback),
  once: (name: string, callback: () => void) => listeners.set(name, callback),
  trigger: (name: string) => {
    assert.equal(state.options.maplebirch.Example.effectsEnabled, true);
    calls.push(name);
  }
};
core.tool = {
  core,
  migration: class {
    add() {}
    run(data: Record<string, unknown>, version: string) {
      assert.equal(state.options.maplebirch.Example.effectsEnabled, true);
      data.version = version;
      calls.push('migration');
    }
  },
  patch: { apply: (phase: string) => calls.push(phase) },
  zone: { play: () => '' }
};

Object.defineProperty(globalThis, 'V', { configurable: true, get: () => state });
Object.defineProperty(globalThis, 'setup', { configurable: true, value: {} });
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key)
  }
});
mock.module('../../src/core', () => ({ default: core }));
mock.module('../../src/modules/Frameworks/migration', () => ({ default: class {} }));
mock.module('../../src/utils', () => ({ clone, mergefn: mergeFn }));
const { default: Variables } = await import('../../src/modules/Variables');
const variables = new Variables(core);
Object.assign(variables, {
  log: (message: string) => {
    throw new Error(message);
  }
});
const defaults = { enabled: true, volume: 0.5, effectsEnabled: true, nested: { enabled: true, hint: true, optional: 'auto' }, choices: ['a', 'b'] };
variables.options.define('Example', defaults);
const options = () => state.options.maplebirch;
const oldState = () => ({
  maplebirch: { version: variables.version },
  options: { maplebirch: { Example: { enabled: false, volume: 0, custom: 'saved', nested: { enabled: false, optional: null }, choices: [] } } }
});

switch (process.argv[2]) {
  case 'registration': {
    state.options.maplebirch = { selected: null, zero: 0, off: false };
    assert.equal(variables.options.define('zero', 5), 0);
    assert.equal(variables.options.define('off', true), false);
    variables.options.define('selected', { selected: 'default' });
    assert.equal(options().selected, null);
    variables.options.define('One', 'Two', { nested: { hint: true }, choices: ['a', 'b'] });
    options().One.nested.hint = false;
    options().One.choices.pop();
    assert.equal(options().Two.nested.hint, true);
    assert.deepEqual(options().Two.choices, ['a', 'b']);
    variables.options.define({ top: { newer: true } });
    assert.equal(options().top.newer, true);
    break;
  }
  case 'settings': {
    const ready = listeners.get(':storyready');
    assert.equal(typeof ready, 'function');
    state = { options: { sidebarStats: 'all' } };
    ready!();
    assert.equal(options().relationcount, 4);
    assert.equal(options().character.pet.scale, 1);
    assert.equal(options().character.mask, 0);
    assert.equal(options().npcsidebar.pet.mask, 25);
    assert.equal(options().Example.effectsEnabled, true);
    assert.equal(state.options.sidebarStats, 'all');
    state = oldState();
    ready!();
    assert.equal(options().Example.enabled, false);
    assert.equal(options().Example.volume, 0);
    assert.equal(options().Example.nested.hint, true);
    const existing = options();
    ready!();
    assert.equal(options(), existing);
    break;
  }
  case 'startup': {
    state = oldState();
    variables.Init();
    assert.deepEqual(calls, ['migration', 'state', ':variable']);
    assert.equal(options().Example.nested.hint, true);
    assert.equal(listeners.has(':passageend'), false);
    break;
  }
  case 'load': {
    state = oldState();
    variables.loadInit();
    assert.deepEqual(calls, ['migration', 'state', ':variable']);
    assert.equal(options().Example.enabled, false);
    assert.equal(options().Example.volume, 0);
    assert.equal(options().Example.custom, 'saved');
    assert.equal(options().Example.nested.optional, null);
    assert.equal(options().Example.nested.hint, true);
    assert.deepEqual(options().Example.choices, []);
    break;
  }
  case 'history': {
    for (const history of [oldState(), oldState()]) {
      state = history;
      const root = options();
      const example = root.Example;
      variables.postInit();
      variables.postInit();
      assert.equal(options(), root);
      assert.equal(options().Example, example);
      assert.equal(example.effectsEnabled, true);
      assert.equal(example.enabled, false);
    }
    assert.deepEqual(calls, []);
    break;
  }
  case 'missing': {
    state = oldState();
    Object.assign(options().Example, { effectsEnabled: undefined, choices: ['custom'], version: undefined });
    variables.options.define('Example', { version: 2 });
    variables.check();
    assert.equal(options().Example.effectsEnabled, true);
    assert.equal(options().Example.version, 2);
    assert.deepEqual(options().Example.choices, ['custom']);
    assert.equal(options().Example.nested.enabled, false);
    break;
  }
  case 'isolation': {
    defaults.nested.hint = false;
    defaults.choices.push('changed after registration');
    options().Example.choices.length = 0;
    state = { options: { maplebirch: {} }, maplebirch: {} };
    variables.check();
    assert.equal(options().Example.nested.hint, true);
    assert.deepEqual(options().Example.choices, ['a', 'b']);
    variables.options.define('Example', { extra: true, nested: { later: true } });
    assert.equal(options().Example.extra, true);
    assert.equal(options().Example.nested.later, true);
    break;
  }
  case 'storage': {
    state = oldState();
    variables.optionsStorage('save');
    state = { maplebirch: {} };
    variables.optionsStorage('restore');
    assert.equal(options().Example.enabled, false);
    assert.equal(options().Example.volume, 0);
    assert.equal(options().Example.effectsEnabled, true);
    assert.deepEqual(options().Example.choices, []);
    state = { maplebirch: {} };
    variables.check();
    assert.equal(options().Example.enabled, false);
    variables.optionsStorage('reset');
    assert.equal(options().Example.enabled, true);
    assert.equal(storage.size, 0);
    options().Example.volume = 0;
    listeners.get(':rest-options')!();
    assert.equal(options().Example.volume, 0);
    break;
  }
  default:
    throw new Error('Unknown options scenario');
}
