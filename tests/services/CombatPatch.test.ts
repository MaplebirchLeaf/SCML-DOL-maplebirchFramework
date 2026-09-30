import './runtime';
import { expect, mock, test } from 'bun:test';
import { applySourcePatch } from '../../src/host/ModLoader';

for (const name of ['TransformationMirror', 'NPCHairStyleOptions', 'Options', 'Cheats', 'CloudSave']) {
  mock.module(`@/twee/${name}.twee?raw`, () => ({ default: '' }));
}

const { widgetPassage } = await import('../../src/modules/DoL/Replacements');

test('Ask modifications run after the vanilla table and refresh its values', () => {
  const patch = widgetPassage['Widgets Actions Speak'][0];
  const source = '<<set _askValues to Object.values(_askActions)>>';
  const result = applySourcePatch(source, patch);
  expect(result.status).toBe('applied');
  expect(result.content).toBe(`${source}\n\t\t<<set _askValues = Object.values(maplebirch.combat.CombatAction.patchOptions(_askActions, "ask"))>>`);
  expect(result.content.split(source)).toHaveLength(2);
});

test('mixed encounters dispatch tentacle actions before resolving each tentacle', () => {
  const source = '<<widget "effectsabomination">>\n\t<<effectsman>>\n\t<<for _i to 0; _i lt $tentacles.max; _i++>>\n\t\t<<effectstentacleadv $tentacles[_i]>>\n\t<</for>>\n<</widget>>';
  const patch = widgetPassage['Widgets Abomination'][0];
  const result = applySourcePatch(source, patch);
  expect(result.status).toBe('applied');
  expect(result.content.match(/<<maplebirchCombatAction "Tentacle"/g)).toHaveLength(1);
  const dispatch = result.content.indexOf('<<maplebirchCombatAction "Tentacle"');
  expect(dispatch).toBeGreaterThan(result.content.indexOf('<<effectsman>>'));
  expect(dispatch).toBeLessThan(result.content.indexOf('<<effectstentacleadv'));
  expect(result.content).toContain('"leftaction" "rightaction"');
  expect(result.content).toContain('<<effectstentacleadv $tentacles[_i]>>');
});

test('NPC gender option works with and without the vanilla debug guard', () => {
  const patch = widgetPassage['Widgets Settings'][5];
  const option = '<label><<radiobutton "$NPCName[_npcId].gender" "h" autocheck>> Both</label>';
  for (const source of [`<<if $debug is 1>>| ${option}<</if>>`, `| ${option}`]) {
    const result = applySourcePatch(source, patch);
    expect(result.status).toBe('applied');
    expect(result.content).toContain('"n" autocheck');
    expect(result.content).toContain(option);
    expect(result.content).not.toContain('<<if $debug is 1>>');
  }
});
