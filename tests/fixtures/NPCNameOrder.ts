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
const characters = { npc: {} as Record<string, any> };
Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
Object.defineProperty(globalThis, 'setup', { value: setup, configurable: true });
Object.defineProperty(globalThis, 'C', { value: characters, configurable: true });

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

// Registered names without records must not occupy saved indices.
variables.NPCName = [{ nam: 'Robin', init: 1, love: 50 }];
NamedNPC.get(manager);
assert.deepEqual(variables.NPCNameList, ['Robin']);
assert.deepEqual(manager.NPCNameList, ['Robin', 'Tsukihan', 'Adrian'], 'missing records must not remove registered NPCs from the catalog');
variables.NPCName.push({ nam: 'Marlow', init: 1, love: 12 });
NamedNPC.get(manager);
assert.deepEqual(variables.NPCNameList, ['Robin', 'Marlow']);
assert.equal(variables.NPCName[variables.NPCNameList.indexOf('Marlow')].nam, 'Marlow');
assert.deepEqual(setup.NPCNameList, ['Robin', 'Tsukihan', 'Adrian']);

// C.npc can still supply an absent registered NPC through its named setter.
NamedNPC.proxy(manager);
assert.equal(Object.hasOwn(characters.npc, 'Tsukihan'), true);
assert.equal(characters.npc.Tsukihan, undefined);
characters.npc.Tsukihan = { init: 0, love: 0 };
assert.deepEqual(variables.NPCNameList, ['Robin', 'Marlow', 'Tsukihan']);
assert.equal(characters.npc.Tsukihan, variables.NPCName[2]);
assert.equal(characters.npc.Marlow.love, 12);

// An unavailable native record must remain eligible for newNamedNpc.
setup.NPCNameList.push('Poppy');
NamedNPC.get(manager);
assert.equal(variables.NPCNameList.includes('Poppy'), false);
if (!variables.NPCNameList.includes('Poppy')) {
  variables.NPCName.push({ nam: 'Poppy', init: 0, love: 0 });
  variables.NPCNameList.push('Poppy');
}
NamedNPC.proxy(manager);
assert.equal(characters.npc.Poppy, variables.NPCName[3]);
assert.deepEqual(
  variables.NPCNameList,
  variables.NPCName.map(npc => npc.nam)
);

// Irregular rows must not shift later indices or become catalog entries.
const irregular = [{ nam: 'Robin', init: 1, love: 50 }, null, { nam: 'Robin', init: 1, love: 10 }, { nam: 'Marlow', init: 1, love: 12 }, {}, { nam: ' Tsukihan ', init: 0, love: 0 }];
Reflect.set(variables, 'NPCName', irregular);
const before = structuredClone(irregular);
assert.doesNotThrow(() => NamedNPC.get(manager));
assert.deepEqual(variables.NPCNameList, ['Robin', undefined, 'Robin', 'Marlow', undefined, ' Tsukihan ']);
assert.equal(variables.NPCName[variables.NPCNameList.indexOf('Marlow')].nam, 'Marlow');
assert.equal(manager.NPCNameList.includes(' Tsukihan '), true, 'saved names are identities, not text to normalize');
assert.equal(
  manager.NPCNameList.every(name => typeof name === 'string' && name.trim() !== ''),
  true
);
assert.equal(variables.NPCName, irregular);
assert.deepEqual(irregular, before);

for (const unavailable of [undefined, null, { length: 1 }, []]) {
  Reflect.set(variables, 'NPCName', unavailable);
  assert.doesNotThrow(() => NamedNPC.get(manager));
  assert.deepEqual(variables.NPCNameList, setup.NPCNameList);
  assert.notEqual(variables.NPCNameList, setup.NPCNameList);
  assert.equal(Reflect.get(variables, 'NPCName'), unavailable);
}
