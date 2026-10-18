import { strict as assert } from 'node:assert';
import { mock } from 'bun:test';
import '../support/runtime';
import type NPCManager from '../../src/modules/NamedNPC';

mock.module('../../src/core', () => ({ default: { services: { translator: { language: 'EN' } } } }));
Object.defineProperty(Array.prototype, 'either', {
  value: function () {
    return this[0];
  },
  configurable: true
});
const { NamedNPC, default: Manager } = await import('../../src/modules/NamedNPC');
const { Translator } = await import('../../src/services/Translator');
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

// Native Social requests a new config on every redraw; language changes must not
// mutate a registration or localize unrelated native NPCs.
const translator = new Translator(undefined as any, undefined as any, { once() {} } as any, () => undefined);
translator.set('wilfulness', { EN: 'Wilfulness', CN: '任性' });
const registered = { dom: { name: 'Wilfulness', maxValue: 100 }, loveAlias: () => 'affection', loveInterest: true, romance: [() => true] };
const native = { Robin: { dom: { name: 'Confidence', maxValue: 100 } }, Tsukihan: { love: { maxValue: 100 } } };
const displayManager = {
  data: new Map([['Tsukihan', { Config: registered }]]),
  core: { services: { translator } },
  type: { importantNPCs: [], specialNPCs: [] },
  log() {}
} as unknown as NPCManager;
Object.defineProperty(globalThis, 'T', { value: {}, configurable: true });
for (const [language, name] of [
  ['CN', '任性'],
  ['EN', 'Wilfulness'],
  ['CN', '任性']
] as const) {
  translator.language = language;
  const result = Manager.prototype.vanillaNPCConfig.call(displayManager, native) as Record<string, any>;
  assert.equal(result.Tsukihan.dom.name, name);
  assert.equal(result.Robin.dom.name, 'Confidence');
  assert.equal(result.Tsukihan.dom.maxValue, 100);
  assert.equal(result.Tsukihan.love.maxValue, 100);
  assert.equal(result.Tsukihan.loveAlias, undefined);
  assert.equal(result.Tsukihan.loveInterest, undefined);
  assert.equal(result.Tsukihan.romance, undefined);
  assert.equal(registered.dom.name, 'Wilfulness');
  assert.equal(native.Robin.dom.name, 'Confidence');
  assert.equal('dom' in native.Tsukihan, false);
  assert.notEqual(result, native);
  assert.notEqual(result.Tsukihan.dom, registered.dom);
}
