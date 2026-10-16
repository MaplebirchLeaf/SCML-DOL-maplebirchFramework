import '../support/runtime';
import { expect, mock, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';

mock.module('../../src/core', () => ({ default: {} }));
const { macroTranslation, sourceText, labelText } = await import('../../src/macros/helpers');
const { default: sharedCore } = await import('../../src/core');

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

function labels(run: (state: { language: string; pronoun: string; calls: string[] }) => void) {
  const state = { language: 'EN', pronoun: 'him', calls: [] as string[] };
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const oldCore = Object.getOwnPropertyDescriptors(sharedCore);
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createDocumentFragment: () => ({ textContent: '', querySelector: () => null }) }
  });
  Object.assign(sharedCore, {
    meta: { Languages: ['EN', 'CN'] },
    services: {
      translator: {
        get language() {
          return state.language;
        },
        set language(value: string) {
          state.language = value;
        }
      }
    },
    host: {
      sugarcube: {
        require: () => ({
          Wikifier: class {
            constructor(output: { textContent: string; querySelector: () => unknown }, value: string, options: { profile: string }) {
              expect(options.profile).toBe('core');
              state.calls.push(value);
              output.textContent = value.replaceAll('<<him>>', state.pronoun);
              if (value.includes('<<missing>>')) output.querySelector = () => ({ textContent: 'missing macro' });
            }
          }
        })
      }
    },
    t: (key: string) => {
      if (key === 'mod:bad') throw new Error('translation failed');
      return key === 'mod:greet' ? (state.language === 'CN' ? '问候<<him>>' : 'Greet <<him>>') : `[${key}]`;
    },
    auto: (key: string) => (key === 'Auto <<him>>' ? (state.language === 'CN' ? '自动<<him>>' : key) : key)
  });
  try {
    run(state);
  } finally {
    for (const key of Object.keys(sharedCore)) if (!Object.hasOwn(oldCore, key)) Reflect.deleteProperty(sharedCore, key);
    Object.defineProperties(sharedCore, oldCore);
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
}

test('link labels resolve both languages once in the original NPC context', () =>
  labels(state => {
    const label = labelText(['Offer to teach <<him>>', '主动教 <<him>>'], null);
    expect(label()).toBe('Offer to teach him');
    state.pronoun = 'her';
    state.language = 'CN';
    expect(label()).toBe('主动教 him');
    state.language = 'EN';
    expect(label()).toBe('Offer to teach him');
    expect(state.calls).toEqual(['Offer to teach <<him>>', '主动教 <<him>>']);
  }));

test('dictionary labels snapshot their loaded translations too', () =>
  labels(state => {
    const label = labelText('mod:greet', null);
    expect(label()).toBe('Greet him');
    state.pronoun = 'her';
    state.language = 'CN';
    expect(label()).toBe('问候him');
    expect(state.calls).toHaveLength(2);
  }));

test('automatic translations share the original NPC snapshot and restore the lookup language', () =>
  labels(state => {
    state.language = 'CN';
    const label = labelText('Auto <<him>>', null);
    expect(state.language).toBe('CN');
    expect(label()).toBe('自动him');
    state.pronoun = 'her';
    state.language = 'EN';
    expect(label()).toBe('Auto him');
    expect(state.calls).toHaveLength(2);
    state.language = 'CN';
    expect(() => labelText('mod:bad', null)).toThrow('translation failed');
    expect(state.language).toBe('CN');
  }));

test('plain labels keep literal markup and require no Wikifier calls', () =>
  labels(state => {
    const label = labelText(['<b>Literal</b>', '$name'], null);
    expect(label()).toBe('<b>Literal</b>');
    state.language = 'CN';
    expect(label()).toBe('$name');
    expect(state.calls).toEqual([]);
  }));

test('duplicate labels share their snapshot and errors are reported at creation', () =>
  labels(state => {
    const label = labelText(['<<him>>', '<<him>>'], null);
    expect(label()).toBe('him');
    expect(state.calls).toEqual(['<<him>>']);
    expect(() => labelText(['<<missing>>', '错误'], null)).toThrow('missing macro');
  }));
