import '../support/runtime';
import { expect, mock, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';
import { applySourcePatch, type SourcePatch } from '../../src/host/ModLoader';

for (const name of ['TransformationMirror', 'NPCHairStyleOptions', 'Options', 'Cheats', 'CloudSave']) {
  mock.module(`@/twee/${name}.twee?raw`, () => ({ default: '' }));
}

const { default: DoLP } = await import('../../src/compat/DoLP');
const { widgetPassage } = await import('../../src/modules/DoL/Replacements');

test('DoLP detection via StartConfig version', () => {
  const savedStartConfig = Object.getOwnPropertyDescriptor(globalThis, 'StartConfig');

  try {
    Object.defineProperty(globalThis, 'StartConfig', {
      value: { version: '0.5.12.13 DoLP v0.778' },
      configurable: true
    });
    expect(DoLP.isDoLP).toBe(true);

    Object.defineProperty(globalThis, 'StartConfig', {
      value: { version: '0.5.12.13' },
      configurable: true
    });
    expect(DoLP.isDoLP).toBe(false);
  } finally {
    if (savedStartConfig) Object.defineProperty(globalThis, 'StartConfig', savedStartConfig);
    else Reflect.deleteProperty(globalThis, 'StartConfig');
  }
});

test('DoLP transformations metadata, merge and extend', () => {
  const animalTransforms = DoLP.Transformations.AnimalTransforms;
  expect(animalTransforms.some(tf => tf.name === 'waterdragon')).toBe(true);
  expect(animalTransforms.some(tf => tf.name === 'bear')).toBe(true);

  const animalMacros = DoLP.Transformations.AnimalMacros;
  expect(animalMacros).toHaveProperty('waterdragon');

  const historyTransforms = DoLP.Transformations.HistoryTransforms;
  expect(historyTransforms.some(h => h.name === 'waterdragon')).toBe(true);

  const valid = { names: new Set<string>(), traits: new Set<string>() };
  DoLP.Transformations.extend(valid);
  expect(valid.names.has('waterdragon')).toBe(true);
  expect(valid.names.has('kitsune')).toBe(true);
  expect(valid.traits.has('sharpEyes')).toBe(true);

  const merged = DoLP.Transformations.merge([{ name: 'wolf' }]);
  expect(merged.some(tf => tf.name === 'waterdragon')).toBe(true);
  expect(merged.some(tf => tf.name === 'kitsune')).toBe(true);
});

test('initializes DoLP variables immediately before Start invokes modupdate', () => {
  let beforePatch: (() => void) | undefined;
  let patches: SourcePatch[] = [];
  const core = {
    once: (name: string, callback: () => void) => {
      if (name === ':addon:beforePatch') beforePatch = callback;
    },
    services: { addonPlugin: { SC2DataManager: { getSC2DataInfoAfterPatch: () => ({ passageDataItems: { map: new Map([['Widgets modUpdate', { tags: ['widget'] }]]) } }) } } },
    tool: {
      inject: (database: { widgetPassage: Record<string, SourcePatch[]> }) => {
        patches = database.widgetPassage['Widgets modUpdate'];
      }
    }
  } as unknown as MaplebirchCore;
  DoLP.install(core);
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
    once: (_name: string, callback: () => void) => {
      beforePatch = callback;
    },
    services: { addonPlugin: { SC2DataManager: { getSC2DataInfoAfterPatch: () => ({ passageDataItems: { map: new Map() } }) } } },
    tool: {
      inject: () => {
        injected = true;
      }
    }
  } as unknown as MaplebirchCore;
  DoLP.install(core);
  beforePatch!();
  expect(injected).toBe(false);
});
