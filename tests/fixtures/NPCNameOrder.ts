import { strict as assert } from 'node:assert';
import { mock } from 'bun:test';
import '../support/runtime';
import type NPCManager from '../../src/modules/NamedNPC';

mock.module('../../src/core', () => ({
  default: { services: { translator: { language: 'EN' } }, host: { modLoader: { modUtils: { getModListNameNoAlias: () => [] } } } }
}));

const { NamedNPC } = await import('../../src/modules/NamedNPC');
const manager = {
  data: new Map([
    ['Tsukihan', {}],
    ['Adrian', {}]
  ]),
  customStats: {},
  log() {}
} as unknown as NPCManager;
const variables = { NPCName: [] as { nam: string; init: number; love: number }[], NPCNameList: [] as string[] };
const setup = { NPCNameList: ['Robin', 'Tsukihan', 'Adrian'] };
Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
Object.defineProperty(globalThis, 'setup', { value: setup, configurable: true });

assert.deepEqual(NamedNPC.get(manager), setup.NPCNameList, 'a fresh game keeps the registered catalog');
assert.deepEqual(variables.NPCName, []);

for (const names of [
  ['Robin', 'Adrian', 'Tsukihan'],
  ['Robin', 'Tsukihan', 'Adrian'],
  ['Adrian', 'Robin', 'Tsukihan']
]) {
  variables.NPCName = names.map(nam => ({ nam, init: nam === 'Tsukihan' ? 0 : 1, love: 27 }));
  const before = structuredClone(variables.NPCName);
  const data = variables.NPCName;
  assert.deepEqual(NamedNPC.get(manager), names);
  assert.deepEqual(variables.NPCNameList, names);
  assert.equal(variables.NPCName, data);
  assert.deepEqual(variables.NPCName, before);
  assert.deepEqual(setup.NPCNameList, ['Robin', 'Tsukihan', 'Adrian'], 'new-game registration order stays independent of saved indices');

  // The native initnpc widget selects its record through this index.
  const index = variables.NPCNameList.indexOf('Tsukihan');
  variables.NPCName[index].init = 1;
  assert.equal(variables.NPCName.find(npc => npc.nam === 'Tsukihan')!.init, 1);
  assert.equal(variables.NPCName.find(npc => npc.nam === 'Adrian')!.love, 27);
  NamedNPC.get(manager);
  assert.equal(variables.NPCNameList.indexOf('Tsukihan'), index);
}

// Appending a newly registered NPC and loading another save rebuild the index.
variables.NPCName = [{ nam: 'Robin', init: 1, love: 50 }];
NamedNPC.get(manager);
variables.NPCName.push({ nam: 'Adrian', init: 1, love: 15 }, { nam: 'Tsukihan', init: 0, love: 0 });
NamedNPC.get(manager);
assert.deepEqual(variables.NPCNameList, ['Robin', 'Adrian', 'Tsukihan']);
variables.NPCName = [
  { nam: 'Robin', init: 1, love: 5 },
  { nam: 'Tsukihan', init: 0, love: 0 },
  { nam: 'Adrian', init: 1, love: 20 }
];
NamedNPC.get(manager);
assert.deepEqual(variables.NPCNameList, ['Robin', 'Tsukihan', 'Adrian']);
