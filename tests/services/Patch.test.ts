import './runtime';
import { expect, mock, test } from 'bun:test';
import Patch from '../../src/modules/Frameworks/Patch';
import { applySourcePatch } from '../../src/host/ModLoader';

for (const name of ['TransformationMirror', 'NPCHairStyleOptions', 'Options', 'Cheats', 'CloudSave']) {
  mock.module(`@/twee/${name}.twee`, () => ({ default: '' }));
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
