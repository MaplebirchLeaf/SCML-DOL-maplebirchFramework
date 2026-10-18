import '../support/runtime';
import { strict as assert } from 'node:assert';
import { mock } from 'bun:test';
import Emitter from '../../src/infra/Emitter';
import { clone, mergeFn } from '../../src/utils/object';

let state: Record<string, any> = { options: {} };
const errors: string[] = [];
const events = new Emitter({ modUtils: { getLogger: () => ({ error: (message: string) => errors.push(message) }) } } as any);
const core: any = {
  host: {
    modLoader: {
      lodash: { isPlainObject: (value: unknown) => value !== null && typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value)) },
      modUtils: { getModListNameNoAlias: () => [] }
    },
    sugarcube: { require: () => ({ Macro: { get: () => undefined } }) }
  },
  once: events.once.bind(events),
  on: events.on.bind(events),
  tool: {
    migration: class {
      add() {}
    }
  },
  char: { use() {} },
  dynamic: { regTimeEvent() {} }
};
Object.defineProperties(globalThis, {
  V: { configurable: true, get: () => state },
  setup: { configurable: true, value: {} },
  Renderer: { configurable: true, value: { RenderingPipeline: [{ name: 'mask' }] } },
  localStorage: { configurable: true, value: { getItem: () => null } }
});
Object.defineProperty(String.prototype, 'convert', {
  configurable: true,
  value() {
    return String(this);
  }
});
mock.module('../../src/core', () => ({ default: core }));
mock.module('../../src/utils', () => ({ clone, mergefn: mergeFn }));
const { default: Variables } = await import('../../src/modules/Variables');
const { default: NPCSidebar } = await import('../../src/modules/NamedNPCAddon/NPCSidebar');
core.var = new Variables(core);
Object.assign(core.var, { log() {} });
const manager: any = { core, NPCNameList: ['Robin', 'Tsukihan'] };

if (process.argv[2] === 'late') {
  await events.trigger(':storyready');
  state = { options: { sidebarAnimations: false } };
  NPCSidebar.init(manager);
} else {
  events.once(':storyready', () => {
    state = {
      options: {
        sidebarAnimations: false,
        maplebirch: { npcsidebar: { show: true, model: false, dxfn: 0, display: { Robin: 'custom' } } }
      }
    };
  });
  NPCSidebar.init(manager);
  await events.trigger(':storyready');
}

assert.deepEqual(errors, []);
const sidebar = state.options.maplebirch.npcsidebar;
assert.equal(state.options.sidebarAnimations, false);
assert.equal(sidebar.display.Tsukihan, 'none');
assert.equal(sidebar.pet.scale, 1);
assert.equal(NPCSidebar.display.has('Robin'), true);
assert.equal(NPCSidebar.display.has('Tsukihan'), true);
assert.equal(Renderer.RenderingPipeline.filter((step: { name: string }) => step.name === 'npc-drip-mask').length, 1);
if (process.argv[2] !== 'late') {
  assert.equal(sidebar.show, true);
  assert.equal(sidebar.model, false);
  assert.equal(sidebar.dxfn, 0);
  assert.equal(sidebar.display.Robin, 'custom');
}
