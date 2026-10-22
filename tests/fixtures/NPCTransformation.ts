import { strict as assert } from 'node:assert';
import { mock } from 'bun:test';
import '../support/runtime';
import type NPCManager from '../../src/modules/NamedNPC';
import type { NPCSidebarState } from '../../src/modules/NamedNPCAddon/NPCSidebarConfig/types';

mock.module('../../src/core', () => ({ default: {} }));
const { default: NPCTransformation } = await import('../../src/modules/NamedNPCAddon/NPCTransformation');
Object.defineProperty(Math, 'clamp', { value: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)), configurable: true });
const variables = { maplebirch: { npc: {} } } as Record<string, any>;
Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
const manager = { core: { char: { use() {} } } } as unknown as NPCManager;
const transformation = new NPCTransformation(manager);

// Registering and rendering must not create save data or change the native body.
transformation.add('Zephyr', 'undead', {
  levels: [1],
  max: 100,
  type: 'undead',
  body: body => (body.hairColour = 'white'),
  parts: { cat_ears: { filter: { blend: '#123456' } } }
});
assert.equal(transformation.level('Zephyr', 'undead'), 0);
assert.equal(transformation.type('Zephyr'), '');
assert.deepEqual(variables.maplebirch.npc, {});
assert.deepEqual(transformation.build('Zephyr', 'undead', 75), { build: 75, level: 1 });
const state = transformation.get('Zephyr', 'undead');
const foreign = { build: 600, level: 8, owner: 'temporarily disabled mod' };
variables.maplebirch.npc.zephyr.transformation.foreign = foreign;
for (let load = 0; load < 2; load++) {
  transformation.ensure('Zephyr');
  assert.equal(transformation.get('zephyr', 'undead'), state);
  assert.deepEqual(state, { build: 75, level: 1 });
  assert.equal(variables.maplebirch.npc.zephyr.transformation.foreign, foreign);
  assert.deepEqual(foreign, { build: 600, level: 8, owner: 'temporarily disabled mod' });
}
assert.deepEqual(transformation.build('Zephyr', 'undead', 50), { build: 100, level: 1 });
assert.deepEqual(transformation.build('Zephyr', 'undead', -99), { build: 1, level: 1 });
assert.equal(transformation.type('Zephyr'), 'undead');
const body = { hairColour: 'black' };
const sidebar: Partial<NPCSidebarState> = { name: 'Zephyr' };
transformation.applyBody(sidebar, { bodydata: body });
transformation.applySidebar(sidebar);
assert.equal(body.hairColour, 'black');
assert.equal(sidebar.bodydata?.hairColour, 'white');
assert.deepEqual(sidebar.tf_filters?.cat_ears, { blend: '#123456' });
sidebar.tf_filters!.cat_ears.blend = '#ffffff';
transformation.applySidebar(sidebar);
assert.equal(sidebar.tf_filters?.cat_ears.blend, '#123456');
assert.deepEqual(transformation.set('Zephyr', 'undead', 0), { build: 0, level: 0 });
assert.equal(transformation.type('Zephyr'), '');
const restored: Partial<NPCSidebarState> = { name: 'Zephyr' };
transformation.applyBody(restored, { bodydata: body });
transformation.applySidebar(restored);
assert.equal(restored.bodydata?.hairColour, 'black');
assert.equal(restored.show_tf, undefined);
assert.deepEqual(restored.tf_filters, {});

// Native defaults still cap at the last level, and saves missing build recover it.
transformation.add('Robin', 'wolf');
assert.deepEqual(transformation.build('Robin', 'wolf', 200), { build: 30, level: 6 });
variables.maplebirch.npc.robin.transformation.wolf = { level: 3 };
assert.deepEqual(transformation.get('Robin', 'wolf'), { build: 15, level: 3 });
transformation.add('Robin', 'slow', { levels: [5, 10], max: 100 });
assert.deepEqual(transformation.build('Robin', 'slow', 90), { build: 90, level: 2 });
assert.deepEqual(transformation.set('Robin', 'slow', 1), { build: 5, level: 1 });
for (const max of [0, 9, NaN, Infinity]) assert.throws(() => transformation.add('Robin', 'invalid', { levels: [5, 10], max }));
transformation.clear('Zephyr', 'undead');
assert.equal(transformation.level('Zephyr', 'undead'), 0);
assert.equal(variables.maplebirch.npc.zephyr.transformation.undead, undefined);
assert.equal(variables.maplebirch.npc.zephyr.transformation.foreign, foreign);
