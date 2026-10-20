import { strict as assert } from 'node:assert';
import { mock } from 'bun:test';
import '../support/runtime';
import type NPCManager from '../../src/modules/NamedNPC';

const translator = { language: 'EN', set() {} };
mock.module('../../src/core', () => ({
  default: { services: { translator }, host: { modLoader: { modUtils: { getModListNameNoAlias: () => [] } } } }
}));
Object.defineProperty(Array.prototype, 'either', {
  value() {
    return this[0];
  },
  configurable: true
});
const { NamedNPC, default: Manager } = await import('../../src/modules/NamedNPC');
const { Save } = await import('../../src/host/SugarCube');
const variables: Record<string, any> = { NPCName: [], maplebirch: { npc: {} } };
const setup = { NPCNameList: ['Robin', 'Sydney'] };
const characters: Record<string, any> = { npc: {} };
Object.defineProperties(globalThis, {
  V: { value: variables, configurable: true },
  C: { value: characters, configurable: true },
  setup: { value: setup, configurable: true }
});
const initialized: string[] = [];
const manager = {
  NamedNPC,
  data: new Map(),
  customStats: { conviction: { default: 0 }, doubt: { default: 0 } },
  type: { importantNPCs: [], specialNPCs: [], loveInterestNpcs: [] },
  romanceConditions: {},
  core: { trigger: (_event: string, name: string) => initialized.push(name) },
  Schedule: { location: {} },
  Clothes: { outfitSets: { recover() {} }, wardrobe: { worn: () => ({}) } },
  Transformation: { ensure() {} },
  fluids: { ensure() {} },
  Pregnancy: { inject() {} },
  log() {},
  injectModNPCs() {
    Manager.prototype.injectModNPCs.call(this);
  }
} as unknown as NPCManager;
for (const [nam, title] of [
  ['Tsukihan', 'shrine attendant'],
  ['Adrian', 'bank clerk'],
  ['Rowan', 'factory supervisor'],
  ['Marlow', 'pit boss'],
  ['Grant', 'detective']
]) {
  NamedNPC.add(manager, { nam, title, description: title, gender: 'm', pronoun: 'm', adult: 1, hairColour: 'black', eyeColour: 'red' });
}
// Native registration overrides remain supported without supplying constructor defaults.
NamedNPC.add(manager, { nam: 'Robin', hairColour: 'brown' });
// npcNamed creates placeholders for registered names before the first meeting.
variables.NPCName = [{ nam: 'Tsukihan', init: 0, adult: 0, teen: 1, title: undefined, description: 'Tsukihan', hairColour: 0 }];
Manager.prototype.loadInit.call(manager);
assert.equal(characters.npc.Tsukihan.description, 'shrine attendant');
assert.equal(characters.npc.Tsukihan.hairColour, 'black');
assert.equal(characters.npc.Tsukihan.adult, 1);
assert.equal(characters.npc.Tsukihan.init, 0);
variables.NPCName = ['Robin', 'Sydney', 'Adrian', 'Grant', 'Tsukihan', 'Rowan', 'Marlow'].map(nam => ({
  nam,
  init: 1,
  title: nam === 'Adrian' ? 'bank manager' : 'saved title',
  description: 'saved description',
  gender: 'f',
  pronoun: 'f',
  adult: 1,
  hairColour: 'blond',
  eyeColour: 'green',
  love: 80,
  dom: 64,
  lust: 42,
  conviction: 35,
  doubt: 7,
  state: 'active',
  virginity: { kiss: false },
  pregnancy: { enabled: true },
  progress: { stage: 3 }
}));
const savedOrder = variables.NPCName.map((npc: any) => npc.nam);
// Native initCNPC getters close over indices and cannot be redefined in place.
characters.npc = {};
for (let i = 0; i < setup.NPCNameList.length; i++) Object.defineProperty(characters.npc, setup.NPCNameList[i], { get: () => variables.NPCName[i] });
Manager.prototype.loadInit.call(manager);
assert.deepEqual(variables.NPCNameList, savedOrder);
assert.equal(characters.npc.Adrian.title, 'bank manager', 'loading must keep an earned promotion');
assert.equal(characters.npc.Tsukihan.title, 'saved title');
assert.equal(characters.npc.Tsukihan.hairColour, 'blond');
assert.equal(characters.npc.Robin.hairColour, 'brown', 'explicit native overrides still apply');
for (const npc of variables.NPCName) {
  assert.equal(npc instanceof NamedNPC, true);
  assert.equal(characters.npc[npc.nam], npc);
  assert.equal(npc.init, 1);
  assert.deepEqual([npc.love, npc.dom, npc.lust, npc.conviction, npc.doubt], [80, 64, 42, 35, 7]);
  assert.equal(npc.virginity.kiss, false);
  assert.equal(npc.pregnancy.enabled, true);
  assert.equal(npc.progress.stage, 3);
}
assert.deepEqual(initialized, [], 'restoring NPCs must not replay first-meeting callbacks');
// Saving/loading clones the records, so object-identity caches alone cannot protect progress.
const saveVariables = structuredClone(variables);
const save = new Save({ variables } as any, { state: { history: [{ title: 'Forest', variables: saveVariables }] } });
save.use(save.V, () => Manager.prototype.loadInit.call(manager));
assert.equal(saveVariables.NPCName.find((npc: any) => npc.nam === 'Adrian').title, 'bank manager');
assert.equal(characters.npc.Adrian.title, 'bank manager', 'C.npc returns to the current game after Save.use');
// Load another save with a different order, then add one NPC missing from that older save.
variables.NPCName = structuredClone(saveVariables.NPCName)
  .reverse()
  .filter((npc: any) => npc.nam !== 'Grant');
const otherOrder = variables.NPCName.map((npc: any) => npc.nam);
characters.npc.Tsukihan.love = 22;
delete characters.npc.Tsukihan.eyeColour;
Manager.prototype.loadInit.call(manager);
assert.deepEqual(variables.NPCNameList, [...otherOrder, 'Grant']);
assert.equal(characters.npc.Tsukihan.love, 22);
assert.equal(characters.npc.Tsukihan.eyeColour, 'red', 'registration supplies missing initial data');
assert.equal(characters.npc.Grant.init, 0, 'a new NPC still waits for the native first meeting');
assert.equal(characters.npc.Grant.conviction, 0);
assert.equal(characters.npc.Grant.doubt, 0);
const grantIndex = variables.NPCNameList.indexOf('Grant');
variables.NPCName[grantIndex].init = 1;
Manager.prototype.vanillaInit.call(manager, 'Grant');
assert.equal(characters.npc.Grant.init, 1);
assert.deepEqual(initialized, ['Grant']);
Manager.prototype.loadInit.call(manager);
assert.equal(variables.NPCName.filter((npc: any) => npc.nam === 'Grant').length, 1);
assert.deepEqual(initialized, ['Grant']);
assert.equal(variables.maplebirch.npc.tsukihan.bodydata.eyeColour, 'red');
