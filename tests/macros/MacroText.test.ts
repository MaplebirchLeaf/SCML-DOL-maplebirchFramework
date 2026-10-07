import '../support/runtime';
import { expect, mock, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';

mock.module('../../src/core', () => ({ default: {} }));
const { macroTranslation, sourceText } = await import('../../src/macros/helpers');

function harness() {
  const translator = { language: 'EN' };
  let lookups = 0;
  const core = {
    services: { translator },
    t: (key: string) => {
      lookups++;
      return key === 'myMod:play' ? 'Play' : `[${key}]`;
    },
    auto: (key: string) => key
  } as unknown as MaplebirchCore;
  return { core, translator, lookups: () => lookups };
}

test('inline bilingual text changes language without dictionary lookups', () => {
  const { core, translator, lookups } = harness();
  const label = ['Follow the choir (0:20)', '跟随合唱 (0:20)'];
  expect(macroTranslation(label, core)).toBe(label[0]);
  translator.language = 'CN';
  expect(macroTranslation(label, core)).toBe(label[1]);
  expect(lookups()).toBe(0);
  expect(sourceText(label)).toBe(label[0]);
});

test('empty bilingual entries fall back and invalid segment arrays are rejected', () => {
  const { core, translator } = harness();
  expect(macroTranslation(['', '中文'], core)).toBe('中文');
  translator.language = 'CN';
  expect(macroTranslation(['English', ''], core)).toBe('English');
  expect(macroTranslation(['', ''], core)).toBe('');
  expect(() => macroTranslation(['one', 'two', 'three'], core)).toThrow('exactly two');
  expect(() => sourceText(['one'])).toThrow('exactly two');
});

test('string translation keys and literal song titles retain their behavior', () => {
  const { core } = harness();
  expect(macroTranslation('myMod:play', core)).toBe('Play');
  expect(macroTranslation('Song title', core)).toBe('Song title');
});
