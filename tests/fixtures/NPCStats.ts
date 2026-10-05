import { strict as assert } from 'node:assert';
import { mock } from 'bun:test';
import '../services/runtime';
import type NPCManager from '../../src/modules/NamedNPC';

mock.module('../../src/core', () => ({ default: { services: { translator: { language: 'EN' } } } }));
Object.defineProperty(Array.prototype, 'either', {
  value: function () {
    return this[0];
  },
  configurable: true
});
const { NamedNPC, default: Manager } = await import('../../src/modules/NamedNPC');
const base = { nam: 'Robin', gender: 'm', pronoun: 'm', adult: 1, insecurity: 'skill', eyeColour: 'green', hairColour: 'blond', bottomsize: 0 };
const variables = {
  NPCName: [
    { ...base, conviction: 35, love: 80, init: 1, trial: 'passed' },
    { ...base, nam: 'Sydney', conviction: NaN, doubt: NaN, init: 1 }
  ]
} as Record<string, any>;
Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
Object.defineProperty(globalThis, 'setup', { value: { NPCNameList: ['Robin', 'Sydney'] }, configurable: true });
const initialized: string[] = [];
const manager = {
  data: new Map(),
  customStats: { conviction: { default: 0 }, doubt: { default: 0 }, respect: { default: 5 } },
  NamedNPC,
  core: { trigger: (_event: string, name: string) => initialized.push(name) },
  log() {}
} as unknown as NPCManager;

NamedNPC.convert(manager);
const [robin, sydney] = variables.NPCName;
assert.equal(robin.conviction, 35);
assert.equal(robin.doubt, 0);
assert.equal(robin.respect, 5);
assert.equal(robin.love, 80);
assert.equal(robin.init, 1);
assert.equal(robin.trial, 'passed');
assert.equal(sydney.conviction, 0);
assert.equal(sydney.doubt, 0);
assert.equal(robin instanceof NamedNPC, true);

robin.conviction = NaN;
robin.doubt = 21;
NamedNPC.convert(manager);
assert.equal(robin.conviction, 0);
assert.equal(robin.doubt, 21);
assert.equal(variables.NPCName[0], robin);

robin.conviction = Infinity;
Manager.prototype.vanillaInit.call(manager, 'Robin');
assert.equal(robin.conviction, 0);
assert.equal(robin.doubt, 21);
assert.deepEqual(initialized, ['Robin']);
