import './runtime';
import { expect, mock, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';
import { applySourcePatch, type SourcePatch } from '../../src/host/ModLoader';

for (const name of ['TransformationMirror', 'NPCHairStyleOptions', 'Options', 'Cheats', 'CloudSave']) {
  mock.module(`@/twee/${name}.twee`, () => ({ default: '' }));
}

const { default: DoLPcompat } = await import('../../src/compat/DoLPcompat');
const { widgetPassage } = await import('../../src/modules/DoL/Replacements');

test('initializes DoLP variables immediately before Start invokes modupdate', () => {
  let beforePatch: (() => void) | undefined;
  let patches: SourcePatch[] = [];
  const core = {
    on: (name: string, callback: () => void) => {
      if (name === ':addon:beforePatch') beforePatch = callback;
    },
    services: { addonPlugin: { SC2DataManager: { getSC2DataInfoAfterPatch: () => ({ passageDataItems: { map: new Map([['Widgets modUpdate', { tags: ['widget'] }]]) } }) } } },
    tool: {
      inject: (database: { widgetPassage: Record<string, SourcePatch[]> }) => {
        patches = database.widgetPassage['Widgets modUpdate'];
      }
    }
  } as unknown as MaplebirchCore;
  DoLPcompat.install(core);
  expect(beforePatch).toBeDefined();
  beforePatch!();
  expect(patches).toHaveLength(1);
  const source = '<<widget "modupdate">>\n\t<<moddedtransformations>>\n\t<<clamp>>\n<</widget>>';
  const result = applySourcePatch(source, patches[0]);
  expect(result.status).toBe('applied');
  expect(result.content.indexOf("maplebirch.trigger(':variable')")).toBeGreaterThan(result.content.indexOf('<<widget "modupdate">>'));
  expect(result.content.indexOf("maplebirch.trigger(':variable')")).toBeLessThan(result.content.indexOf('<<moddedtransformations>>'));
  expect(result.content).toContain("maplebirch.passage.title === 'Start'");
  expect(result.content).toContain('<<clamp>>');
  expect(widgetPassage).not.toHaveProperty('gameStartOnly');
});

test('does not register the DoLP widget patch when the passage is absent', () => {
  let beforePatch: (() => void) | undefined;
  let injected = false;
  const core = {
    on: (_name: string, callback: () => void) => {
      beforePatch = callback;
    },
    services: { addonPlugin: { SC2DataManager: { getSC2DataInfoAfterPatch: () => ({ passageDataItems: { map: new Map() } }) } } },
    tool: {
      inject: () => {
        injected = true;
      }
    }
  } as unknown as MaplebirchCore;
  DoLPcompat.install(core);
  beforePatch!();
  expect(injected).toBe(false);
});
