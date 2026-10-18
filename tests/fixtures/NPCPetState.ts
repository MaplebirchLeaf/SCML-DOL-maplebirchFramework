import '../support/runtime';
import { strict as assert } from 'node:assert';
import { mock } from 'bun:test';

let state: Record<string, any>;
let rendererReads = 0;
let fullChecks = 0;
let nextFrame = 0;
const frames = new Map<number, FrameRequestCallback>();
const rendered: Array<{ slot: number; source: any; options: any }> = [];
const unmounted: number[] = [];
const masks: Array<[number, number]> = [];
const core = {
  var: { check: () => fullChecks++ },
  char: { mask: (mask: number, rotation: number) => (masks.push([mask, rotation]), '') }
};
const sidebar = {
  options: { filters: {}, maplebirch: { nnpc: { name: 'Old NPC' } } }
};
Object.defineProperties(globalThis, {
  V: { configurable: true, get: () => state },
  setup: { configurable: true, value: { NPCNameList: ['Robin', 'Tsukihan'] } },
  Renderer: {
    configurable: true,
    get: () => {
      rendererReads++;
      return { CanvasModelCaches: { main: { sidebar } } };
    }
  },
  requestAnimationFrame: {
    configurable: true,
    value: (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    }
  },
  cancelAnimationFrame: { configurable: true, value: (frame: number) => frames.delete(frame) }
});
mock.module('../../src/core', () => ({ default: core }));
const { default: NPCSidebar } = await import('../../src/modules/NamedNPCAddon/NPCSidebar');
const pet = NPCSidebar.pet;
const slots = (pet as unknown as { pets: Array<{ render(source: any, options: any): boolean; unmount(): void }> }).pets;
for (const [slot, target] of slots.entries()) {
  target.render = (source, options) => {
    rendered.push({ slot, source, options });
    return true;
  };
  target.unmount = () => unmounted.push(slot);
}

function enabled(): Record<string, any> {
  return {
    npc: ['Robin', 'Tsukihan'],
    options: {
      sidebarAnimations: true,
      maplebirch: {
        petLocked: false,
        npcsidebar: { primary_npc: 'Robin', second_model: false, show: true, model: false, mask: 30, rotation: 0, pet: { enabled: true, mask: 25, rotation: 0, scale: 1 } }
      }
    }
  };
}

function flush(): void {
  for (const [id, callback] of frames) {
    frames.delete(id);
    callback(0);
  }
}

switch (process.argv[2]) {
  case 'missing': {
    for (const initial of [{}, { options: {} }, { options: { maplebirch: {} } }, { options: { maplebirch: { npcsidebar: {} } } }]) {
      state = initial;
      assert.equal(pet.sync(), false);
      assert.equal(frames.size, 0);
    }
    assert.equal(unmounted.length, 8);
    assert.equal(rendererReads, 0);
    break;
  }
  case 'state-switch': {
    state = enabled();
    assert.equal(pet.sync(), true);
    assert.equal(frames.size, 1);
    state = { options: {} };
    flush();
    assert.deepEqual(unmounted, [0, 1]);
    assert.equal(rendererReads, 0);
    break;
  }
  case 'disabled': {
    state = enabled();
    assert.equal(pet.sync(), true);
    state.options.maplebirch.npcsidebar.pet.enabled = false;
    flush();
    assert.deepEqual(unmounted, [0, 1]);
    assert.equal(rendererReads, 0);
    break;
  }
  case 'current-options': {
    state = enabled();
    assert.equal(pet.sync(), true);
    state = enabled();
    state.options.sidebarAnimations = false;
    state.options.maplebirch.petLocked = true;
    Object.assign(state.options.maplebirch.npcsidebar, { primary_npc: 'Tsukihan', secondary_npc: 'Robin', second_model: true, mask: 45, rotation: -10 });
    Object.assign(state.options.maplebirch.npcsidebar.pet, { mask: 40, rotation: -20, scale: 0.6 });
    flush();
    assert.equal(rendered.length, 2);
    assert.deepEqual(unmounted, []);
    for (const item of rendered) assert.deepEqual(item.options, { enabled: true, mask: 40, rotation: -20, scale: 0.6, locked: true, animated: false, floating: true });
    assert.equal(rendered[0].source.maplebirch.nnpc.name, 'Tsukihan');
    assert.equal(rendered[1].source.maplebirch.previous.name, 'Robin');
    assert.deepEqual(masks, [[45, -10]]);
    assert.equal(sidebar.options.maplebirch.nnpc.name, 'Old NPC');
    break;
  }
  case 'cancel': {
    state = enabled();
    assert.equal(pet.sync(), true);
    state = { options: {} };
    assert.equal(pet.sync(), false);
    assert.equal(frames.size, 0);
    flush();
    assert.deepEqual(unmounted, [0, 1]);
    assert.equal(rendererReads, 0);
    break;
  }
  default:
    throw new Error(`Unknown NPC pet scenario: ${process.argv[2]}`);
}

if (process.argv[2] !== 'current-options') assert.deepEqual(rendered, []);
assert.equal(fullChecks, 0);
