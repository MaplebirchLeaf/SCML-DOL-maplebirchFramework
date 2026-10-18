import { strict as assert } from 'node:assert';
import { mock } from 'bun:test';
import '../support/runtime';
import type NPCManager from '../../src/modules/NamedNPC';

const translator = { language: 'EN' };
mock.module('../../src/core', () => ({
  default: { services: { translator }, host: { modLoader: { modUtils: { getModListNameNoAlias: () => [] } } } }
}));
Object.defineProperty(Array.prototype, 'either', {
  value: function () {
    return this[0];
  },
  configurable: true
});
const { NamedNPC } = await import('../../src/modules/NamedNPC');
const manager = { data: new Map(), customStats: {}, log() {} } as unknown as NPCManager;
const base = {
  nam: 'Robin',
  gender: 'm' as const,
  pronoun: 'm' as const,
  adult: 1,
  insecurity: 'skill',
  eyeColour: 'green',
  hairColour: 'blond',
  bottomsize: 0,
  penis: 'clothed',
  vagina: 'none',
  breastsize: 0,
  ballssize: 4
};
const variables = { NPCName: [] as InstanceType<typeof NamedNPC>[] };
Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
Object.defineProperty(globalThis, 'setup', { value: { NPCNameList: ['Robin'] }, configurable: true });

for (const language of ['EN', 'CN']) {
  translator.language = language;
  const native = language === 'EN' ? ['tiny penis', 'penis', 'thick cock', 'massive cock'] : ['细小阴茎', '阴茎', '厚重肉棒', '硕大肉棒'];
  for (let size = 1; size <= 7; size++) {
    const npc = new NamedNPC(manager, { ...base, penissize: size });
    assert.equal(npc.penisdesc, native[Math.min(size, 4) - 1], `${language}: size ${size}`);
    const anatomy = [npc.penis, npc.penissize, npc.vagina, npc.breastsize, npc.ballssize];
    npc.descCache[`penis_${language}_${size}`] = '';
    npc.penisdesc = '';
    npc.bodyPartdescription();
    assert.equal(npc.penisdesc, native[Math.min(size, 4) - 1]);
    variables.NPCName = [structuredClone(npc)];
    NamedNPC.convert(manager);
    const restored = variables.NPCName[0];
    translator.language = language === 'EN' ? 'CN' : 'EN';
    restored.bodyPartdescription();
    assert.ok(restored.penisdesc.length > 0);
    translator.language = language;
    restored.bodyPartdescription();
    NamedNPC.convert(manager);
    assert.equal(restored.penisdesc, native[Math.min(size, 4) - 1]);
    assert.deepEqual([restored.penis, restored.penissize, restored.vagina, restored.breastsize, restored.ballssize], anatomy);
    assert.equal(variables.NPCName[0], restored);
  }
  const exposed = new NamedNPC(manager, { ...base, penis: 'penis', penisdesc: '', penissize: 6 });
  assert.equal(exposed.penisdesc, native[3]);
  const custom = new NamedNPC(manager, { ...base, penis: 'penis', penisdesc: 'custom description', penissize: 6 });
  custom.bodyPartdescription();
  assert.equal(custom.penisdesc, 'custom description');
  const absent = new NamedNPC(manager, { ...base, gender: 'f', penis: 'none', penisdesc: 'none', penissize: 0 });
  absent.bodyPartdescription();
  assert.equal(absent.penisdesc, 'none');
}

// Generated labels follow the active language after exposure and save/load,
// while caller-owned descriptions and anatomy remain unchanged.
const breastLabels = {
  EN: ['nipple', 'small breast', 'large breast'],
  CN: ['乳头', '偏小的乳房', '硕大的乳房']
};
for (const language of ['EN', 'CN'] as const) {
  const other = language === 'EN' ? 'CN' : 'EN';
  for (const state of ['clothed', 'penis']) {
    translator.language = language;
    const npc = new NamedNPC(manager, { ...base, penis: state, penissize: 6 });
    const original = npc.penisdesc;
    const anatomy = [npc.penis, npc.penissize, npc.vagina, npc.breastsize, npc.ballssize];
    variables.NPCName = [JSON.parse(JSON.stringify(npc))];
    NamedNPC.convert(manager);
    const restored = variables.NPCName[0];
    translator.language = other;
    restored.bodyPartdescription();
    assert.equal(restored.penisdesc, other === 'EN' ? 'massive cock' : '硕大肉棒', 'generated exposed label changes language');
    translator.language = language;
    restored.bodyPartdescription();
    assert.equal(restored.penisdesc, original);
    assert.deepEqual([restored.penis, restored.penissize, restored.vagina, restored.breastsize, restored.ballssize], anatomy);
  }
  for (const state of ['clothed', 'vagina']) {
    for (const [index, size] of [1, 4, 8].entries()) {
      translator.language = language;
      const npc = new NamedNPC(manager, { ...base, gender: 'f', penis: 'none', penissize: 0, vagina: state, breastsize: size });
      assert.equal(npc.breastdesc, breastLabels[language][index], 'initial generated breast label keeps its size');
      const anatomy = [npc.penis, npc.penissize, npc.vagina, npc.breastsize, npc.ballssize];
      variables.NPCName = [JSON.parse(JSON.stringify(npc))];
      NamedNPC.convert(manager);
      const restored = variables.NPCName[0];
      for (const current of [other, language, other] as const) {
        translator.language = current;
        restored.bodyPartdescription();
        assert.equal(restored.breastdesc, breastLabels[current][index], 'exposure and language changes retain the generated size');
        const singular = breastLabels[current][index];
        assert.equal(restored.breastsdesc, current === 'CN' ? singular : singular + 's');
        assert.deepEqual([restored.penis, restored.penissize, restored.vagina, restored.breastsize, restored.ballssize], anatomy);
      }
    }
  }
  for (const state of ['clothed', 'penis']) {
    translator.language = language;
    const npc = new NamedNPC(manager, { ...base, penis: state, penissize: 6, penisdesc: 'custom description', breastsize: 8, breastdesc: 'custom singular' });
    npc.breastsdesc = 'custom plural';
    variables.NPCName = [JSON.parse(JSON.stringify(npc))];
    NamedNPC.convert(manager);
    const restored = variables.NPCName[0];
    for (const current of [language, other, language] as const) {
      translator.language = current;
      restored.bodyPartdescription();
      assert.equal(restored.penisdesc, 'custom description');
      assert.equal(restored.breastdesc, 'custom singular');
      assert.equal(restored.breastsdesc, 'custom plural');
      assert.equal(restored.penissize, 6);
      assert.equal(restored.breastsize, 8);
    }
  }
}
