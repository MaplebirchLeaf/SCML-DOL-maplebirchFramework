import '../support/runtime';
import { expect, mock, test } from 'bun:test';
import Patch from '../../src/modules/Frameworks/Patch';
import { applySourcePatch } from '../../src/host/ModLoader';
import Antiques from '../../src/modules/DoL/Patches/Antiques';
import Traits, { traitsData } from '../../src/modules/DoL/Patches/Traits';

for (const name of ['TransformationMirror', 'NPCHairStyleOptions', 'Options', 'Cheats', 'CloudSave']) {
  mock.module(`@/twee/${name}.twee?raw`, () => ({ default: '' }));
}

const { widgetPassage } = await import('../../src/modules/DoL/Replacements');

test('generic patch registrar starts empty and runs registered state handlers in order', () => {
  const calls: string[] = [];
  const patch = new Patch((name, error) => calls.push(`${name}: ${String(error)}`));

  expect(patch.names()).toEqual([]);
  patch.add('first', { api: { id: 1 }, state: () => calls.push('first') });
  patch.add('second', { api: { id: 2 }, state: () => calls.push('second') });
  patch.apply('state');

  expect(patch.names()).toEqual(['first', 'second']);
  expect(patch.require<{ id: number }>('first').id).toBe(1);
  expect(() => patch.add('first', { api: { id: 3 } })).toThrow('Patch already registered');
  expect(calls.at(-1)).toContain('first: Error: Patch already registered');
  expect(patch.names()).toEqual(['first', 'second']);
  expect(calls.slice(0, 2)).toEqual(['first', 'second']);
});

test('vanilla antique and tip widget extensions are applied as source patches', () => {
  const cases = [
    ['MuseumAntiques', '<<widget "museumAntiqueText">>\n\t<<set _museumAntiqueText to {}>>\n<</widget>>\n\n<<widget "museumPaintingText">>', 'antiques.inject(_museumAntiqueText)'],
    ['Widgets Museum', '<<widget "museumdonate">>\n\t<<museumAntiqueStatus "antiquebox" "talk">>\n<</widget>>\n\n<<widget "museumtalk">>', 'museumAntiqueStatus _maplebirchAntique "talk"'],
    ['Widgets Tips', '<<widget "generateTipsList">>\n\t<<set setup.tipsList to setup.tips.general>>\n<</widget>>\n\n<<widget "printTipsList">>', 'tips.inject(setup.tipsList)']
  ] as const;

  for (const [title, source, insertion] of cases) {
    const patches = widgetPassage[title as keyof typeof widgetPassage];
    let content: string = source;
    for (const patch of patches) {
      const result = applySourcePatch(content, patch);
      expect(result.status).toBe('applied');
      content = result.content;
    }
    expect(content).toContain(insertion);
    expect(content.indexOf(insertion)).toBeLessThan(content.indexOf('<</widget>>'));
  }
});

test('NPC attitude text uses the registration map and requires the corresponding macro', () => {
  const patch = widgetPassage['Widgets Named Npcs'][0];
  for (const source of ['\t\t\t_npc', '\t\t\t<<NPC_CN_NAME _npc>>']) {
    const result = applySourcePatch(source, patch);
    expect(result.status).toBe('applied');
    const condition = result.content.match(/<<if (.*?)>>/)?.[1];
    expect(condition).toBeDefined();
    const matches = new Function('maplebirch', '_npc', `return ${condition}`) as (core: unknown, npc: string) => boolean;
    const macros = new Set(['Ellisrelationshiptext', 'Unregisteredrelationshiptext']);
    const core = {
      npc: {
        data: new Map([
          ['Ellis', {}],
          ['NoMacro', {}]
        ])
      },
      host: { sugarcube: { require: () => ({ Macro: { has: (name: string) => macros.has(name) } }) } }
    };
    expect(matches(core, 'Ellis')).toBe(true);
    expect(matches(core, 'NoMacro')).toBe(false);
    expect(matches(core, 'Unregistered')).toBe(false);
    expect(result.content).toContain('<<= "<<"+_npc+"relationshiptext>>">>');
    expect(result.content).toContain('<<else>>\n\t\t\t<<= maplebirch.auto(_npc)>>');
  }
});

test('missing antiques are archived with hints and restored without changing historical counters', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'V');
  const native = { name: 'Native antique', hint: '', museum: '', journal: '', icon: '' };
  try {
    for (const status of ['notFound', 'found', 'talk', 'museum', 'stolen', 'recovered']) {
      const variables = {
        maplebirch: {} as Record<string, any>,
        museumAntiques: { antiques: { native: 'museum', removed: status } as Record<string, string>, museumCount: 8, stolenCount: 5, recoveredCount: 4, maxCount: 2 },
        museumAntiqueJournalHints: ['native', 'removed'],
        winterHint: 'removed'
      };
      Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
      const donated = ['museum', 'stolen', 'recovered'].includes(status) ? 1 : 0;
      Antiques.inject({ native });
      expect(variables.museumAntiques.antiques).toEqual({ native: 'museum' });
      expect(variables.maplebirch.inactiveAntiques).toEqual({ removed: { status, hint: true } });
      expect(variables.museumAntiqueJournalHints).toEqual(['native']);
      expect(variables.winterHint).toBe('notGiven');
      expect(variables.museumAntiques).toMatchObject({ maxCount: 1, museumCount: 8 - donated, stolenCount: 5, recoveredCount: 4 });
      Antiques.inject({ native });
      expect(variables.museumAntiques.museumCount).toBe(8 - donated);
      Antiques.inject({ native, removed: { ...native, name: 'Reinstalled antique' } });
      expect(variables.museumAntiques.antiques.removed).toBe(status);
      expect(variables.museumAntiqueJournalHints).toEqual(['native', 'removed']);
      expect(variables.museumAntiques).toMatchObject({ maxCount: 2, museumCount: 8, stolenCount: 5, recoveredCount: 4 });
      expect(variables.maplebirch.inactiveAntiques).toBeUndefined();
      Antiques.inject({ native, removed: native });
      expect(variables.museumAntiques.museumCount).toBe(8);
    }
  } finally {
    if (original) Object.defineProperty(globalThis, 'V', original);
    else Reflect.deleteProperty(globalThis, 'V');
  }
});

test('antique restoration preserves newer active progress and antiques registered by other mods', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'V');
  const metadata = { name: 'Active antique', hint: '', museum: '', journal: '', icon: '' };
  const variables = {
    maplebirch: { inactiveAntiques: { active: { status: 'found', hint: true }, absent: { status: 'talk', hint: false } } } as Record<string, any>,
    museumAntiques: { antiques: { active: 'museum', other: 'found' }, museumCount: 7, maxCount: 2 }
  };
  Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
  try {
    Antiques.inject({ active: metadata, other: metadata });
    expect(variables.museumAntiques).toEqual({ antiques: { active: 'museum', other: 'found' }, museumCount: 7, maxCount: 2 });
    expect(variables.maplebirch.inactiveAntiques).toEqual({ absent: { status: 'talk', hint: false } });
    expect((variables as any).museumAntiqueJournalHints).toEqual(['active']);
  } finally {
    if (original) Object.defineProperty(globalThis, 'V', original);
    else Reflect.deleteProperty(globalThis, 'V');
  }
});

test('trait replacement keeps its native position, resolves dynamic fields and preserves unrelated categories', () => {
  const temporary = Object.getOwnPropertyDescriptor(globalThis, 'T');
  Object.defineProperty(globalThis, 'T', { value: {}, configurable: true });
  const saved = traitsData.splice(0);
  let language = 'EN';
  let broken = false;
  const translate = (text: string) => (language === 'CN' && text === 'General Traits' ? '一般特质' : text);
  const original = () => (language === 'CN' ? '承诺仪式：<<= setup.NPC_CN_NAME($templePromised)>>' : 'Rite of Promise: $templePromised');
  try {
    Traits.add({
      title: 'General Traits',
      replace: /^(?:Rite of Promise:|承诺仪式：)/g,
      name: () => (language === 'CN' ? '承诺仪式：两者如一' : 'Rite of Promise: As Two, As One'),
      colour: () => (broken ? 'red' : 'blue'),
      has: () => !broken,
      text: 'Promise description'
    });
    for (language of ['EN', 'CN']) {
      const native = { name: original(), colour: 'blue', has: true, text: 'Native description' };
      const untouched = { name: 'Other trait', colour: 'green', has: true, text: '' };
      const input = [
        { title: 'General Traits', traits: [untouched, native, untouched] },
        { title: 'Special Traits', traits: [native] }
      ];
      const result = Traits.inject(input, translate);
      expect(result[0].traits).toHaveLength(3);
      expect(result[0].traits[1]).toEqual({ name: language === 'CN' ? '承诺仪式：两者如一' : 'Rite of Promise: As Two, As One', colour: 'blue', has: true, text: 'Promise description' });
      expect(result[1].traits).toEqual([native]);
      expect(input[0].traits[1]).toEqual(native);
      expect(Traits.inject(result, translate)[0].traits).toEqual(result[0].traits);
    }
    broken = true;
    expect(Traits.inject([{ title: 'General Traits', traits: [] }], translate)[0].traits[0]).toMatchObject({ colour: 'red', has: false });
  } finally {
    traitsData.splice(0, traitsData.length, ...saved);
    if (temporary) Object.defineProperty(globalThis, 'T', temporary);
    else Reflect.deleteProperty(globalThis, 'T');
  }
});

test('promise replacements accept native function names and keep unrelated mod traits intact', () => {
  const temporary = Object.getOwnPropertyDescriptor(globalThis, 'T');
  Object.defineProperty(globalThis, 'T', { value: {}, configurable: true });
  const saved = traitsData.splice(0);
  let language = 'EN';
  let partner = 'Sydney';
  let broken = false;
  const prefix = (isBroken: boolean) => (language === 'CN' ? (isBroken ? '破碎的承诺：' : '承诺仪式：') : isBroken ? 'Broken Promise: ' : 'Rite of Promise: ');
  const label = () => (partner === 'dual' ? (language === 'CN' ? '两者如一' : 'As Two, As One') : partner);
  const translate = (text: string) => (language === 'CN' && text === 'General Traits' ? '一般特质' : text);
  try {
    Traits.add(
      ...[false, true].map(isBroken => ({
        title: 'General Traits',
        replace: isBroken ? /^(?:Broken Promise:|破碎的承诺：)/ : /^(?:Rite of Promise:|承诺仪式：)/,
        name: () => prefix(isBroken) + label(),
        colour: isBroken ? 'red' : 'blue',
        has: () => Boolean(partner) && (isBroken ? broken : !broken),
        text: () => `${label()}: ${broken ? 'Broken' : 'Promised'}`
      }))
    );
    const cases = [
      ['EN', 'Sydney', false],
      ['CN', 'Sydney', true],
      ['CN', 'Robin', false],
      ['EN', 'Robin', true],
      ['EN', 'dual', false],
      ['CN', 'dual', true]
    ] as const;
    for (const [nextLanguage, nextPartner, nextBroken] of cases) {
      language = nextLanguage;
      partner = nextPartner;
      broken = nextBroken;
      const unrelated = { name: () => 'X-change trait', colour: 'green', has: true, text: '', meter: { min: 0, max: 10 }, owner: 'x-change' };
      const native = (isBroken: boolean) => ({
        name: isBroken === broken ? () => prefix(isBroken) + '$templePromised' : prefix(isBroken) + '$templePromised',
        colour: isBroken ? 'red' : 'blue',
        has: isBroken ? broken : !broken,
        text: 'Native description'
      });
      const input = [{ title: 'General Traits', traits: [unrelated, native(false), native(true)] }];
      const original = input.map(category => ({ ...category, traits: category.traits.map(trait => ({ ...trait })) }));
      const result = Traits.inject(input, translate);

      expect(result[0].traits).toHaveLength(3);
      expect(result[0].traits[0]).toEqual(unrelated);
      expect(result[0].traits[0].name).toBe(unrelated.name);
      expect(result[0].traits.slice(1).filter(trait => trait.has)).toEqual([
        { name: prefix(broken) + label(), colour: broken ? 'red' : 'blue', has: true, text: `${label()}: ${broken ? 'Broken' : 'Promised'}` }
      ]);
      expect(result[0].traits.slice(1).map(trait => trait.name)).toEqual([prefix(false) + label(), prefix(true) + label()]);
      expect(input).toEqual(original);
      expect(Traits.inject(result, translate)[0].traits).toEqual(result[0].traits);
    }
  } finally {
    traitsData.splice(0, traitsData.length, ...saved);
    if (temporary) Object.defineProperty(globalThis, 'T', temporary);
    else Reflect.deleteProperty(globalThis, 'T');
  }
});

test('string replacement and default matching resolve native function names without adding duplicates', () => {
  const temporary = Object.getOwnPropertyDescriptor(globalThis, 'T');
  Object.defineProperty(globalThis, 'T', { value: {}, configurable: true });
  const saved = traitsData.splice(0);
  try {
    Traits.add(
      { title: 'General Traits', replace: 'Legacy trait', name: 'Replacement trait', has: true, text: 'Replaced' },
      { title: 'General Traits', name: 'Existing trait', has: true, text: 'Updated' }
    );
    const unrelated = { name: () => 'Other trait', colour: 'green', has: true, text: '', owner: 'other-mod' };
    const native = (label: string) => ({
      label,
      name() {
        return this.label;
      },
      colour: '',
      has: true,
      text: ''
    });
    const input = [{ title: 'General Traits', traits: [unrelated, native('Legacy trait'), native('Existing trait')] }];
    const result = Traits.inject(input, text => text);
    expect(result[0].traits).toEqual([unrelated, { name: 'Replacement trait', colour: '', has: true, text: 'Replaced' }, { name: 'Existing trait', colour: '', has: true, text: 'Updated' }]);
    expect(Traits.inject(result, text => text)[0].traits).toEqual(result[0].traits);
    expect(input[0].traits[1].name()).toBe('Legacy trait');
    expect(input[0].traits[2].name()).toBe('Existing trait');
  } finally {
    traitsData.splice(0, traitsData.length, ...saved);
    if (temporary) Object.defineProperty(globalThis, 'T', temporary);
    else Reflect.deleteProperty(globalThis, 'T');
  }
});

test('trait matching leaves hidden function names unevaluated until their data is ready', () => {
  const temporary = Object.getOwnPropertyDescriptor(globalThis, 'T');
  Object.defineProperty(globalThis, 'T', { value: {}, configurable: true });
  const saved = traitsData.splice(0);
  const state: { active?: { name: string } } = {};
  const hidden = { name: () => state.active!.name, colour: '', has: false, text: '' };
  try {
    Traits.add(
      { title: 'General Traits', replace: /^Native promise:/, name: 'Replacement promise', has: true },
      { title: 'General Traits', replace: 'Native trait', name: 'Replacement trait', has: true },
      { title: 'General Traits', name: 'Added trait', has: true }
    );
    const input = [{ title: 'General Traits', traits: [hidden] }];
    const result = Traits.inject(input, text => text);
    expect(result[0].traits).toHaveLength(4);
    expect(result[0].traits[0]).toEqual(hidden);
    expect(input[0].traits).toEqual([hidden]);
    expect(Traits.inject(result, text => text)[0].traits).toEqual(result[0].traits);
    state.active = { name: 'Ready trait' };
    const name = result[0].traits[0].name;
    expect(typeof name === 'function' ? name() : name).toBe('Ready trait');
  } finally {
    traitsData.splice(0, traitsData.length, ...saved);
    if (temporary) Object.defineProperty(globalThis, 'T', temporary);
    else Reflect.deleteProperty(globalThis, 'T');
  }
});
