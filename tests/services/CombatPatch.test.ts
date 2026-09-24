import './runtime';
import { expect, mock, test } from 'bun:test';
import { applySourcePatch } from '../../src/host/ModLoader';

for (const name of ['TransformationMirror', 'NPCHairStyleOptions', 'Options', 'Cheats', 'CloudSave']) {
  mock.module(`@/twee/${name}.twee`, () => ({ default: '' }));
}

const { widgetPassage } = await import('../../src/modules/DoL/Replacements');

test('Ask modifications run after the vanilla table and refresh its values', () => {
  const patch = widgetPassage['Widgets Actions Speak'][0];
  const source = '<<set _askValues to Object.values(_askActions)>>';
  const result = applySourcePatch(source, patch);
  expect(result.status).toBe('applied');
  expect(result.content).toBe(`${source}<<run maplebirch.combat.CombatAction.patchOptions(_askActions, "ask")>><<set _askValues to Object.values(_askActions)>>`);
});
