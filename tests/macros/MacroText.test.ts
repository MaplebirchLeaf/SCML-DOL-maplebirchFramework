import '../support/runtime';
import { expect, mock, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';
import type { MacroContext } from '../../src/macros/helpers';

mock.module('../../src/core', () => ({ default: {} }));
const { macroTranslation, sourceText, labelText } = await import('../../src/macros/helpers');
const { default: sharedCore } = await import('../../src/core');
const { _languageLink } = await import('../../src/macros/lanLink');

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

interface LinkElement {
  tag: string;
  attributes: Record<string, string>;
  children: Array<LinkElement | { data: string }>;
  click?: () => void;
}

function navigation(
  options: { target?: string | null; content?: string; variables?: Record<string, unknown> | null; temporary?: object | null; sidebar?: boolean; scrollingElement?: boolean },
  run: (state: {
    variables: Record<string, unknown>;
    body: (() => void) | undefined;
    bodyCount: number;
    ironmanDuringBody: unknown;
    played: Array<{ passage: string; queued: unknown; intended: unknown }>;
    errors: string[];
    click(): void;
    label(): string;
    language(code: string): void;
  }) => void
): void {
  const globals = ['V', 'T', 'setup', 'document', 'jQuery'].map(key => ({ key, descriptor: Object.getOwnPropertyDescriptor(globalThis, key) }));
  const windowKeys = ['ironmanFlag', 'scrollUIBar', 'scrollMain'].map(key => ({ key, descriptor: Object.getOwnPropertyDescriptor(window, key) }));
  const originalCore = Object.getOwnPropertyDescriptors(sharedCore);
  const updates: Array<() => void> = [];
  const translator = { language: 'EN' };
  const elements: LinkElement[] = [];
  const variables = options.variables ?? {};
  const state = {
    variables,
    body: undefined as (() => void) | undefined,
    bodyCount: 0,
    ironmanDuringBody: undefined as unknown,
    played: [] as Array<{ passage: string; queued: unknown; intended: unknown }>,
    errors: [] as string[],
    click: () => elements.find(element => element.tag === 'a')?.click?.(),
    label: () => (elements.find(element => element.tag === 'a')?.children[0] as { data: string } | undefined)?.data ?? '',
    language: (code: string) => {
      translator.language = code;
      updates.forEach(update => update());
    }
  };
  class Query {
    public readonly 0: LinkElement;
    public constructor(element: LinkElement) {
      this[0] = element;
    }
    public addClass(): this {
      return this;
    }
    public attr(name: string, value: string): this {
      this[0].attributes[name] = value;
      return this;
    }
    public removeAttr(name: string): this {
      delete this[0].attributes[name];
      return this;
    }
    public append(child: Query | { data: string }): this {
      this[0].children.push(child instanceof Query ? child[0] : child);
      return this;
    }
    public appendTo(): this {
      return this;
    }
    public ariaClick(options: { one: boolean }, click: () => void): this {
      let used = false;
      this[0].click = () => {
        if (options.one && used) return;
        used = true;
        click();
      };
      return this;
    }
  }
  for (const [key, value] of Object.entries({
    V: options.variables === null ? undefined : variables,
    T: options.temporary === null ? undefined : (options.temporary ?? {}),
    setup: { maplebirch: { language: { add: (_key: string, update: () => void) => updates.push(update) } } },
    document: {
      createElement: (tag: string) => {
        const element = { tag, attributes: {}, children: [] };
        elements.push(element);
        return element;
      },
      createTextNode: (data: string) => ({ data }),
      querySelector: () => (options.sidebar === false ? null : { scrollTop: 19 }),
      scrollingElement: options.scrollingElement === false ? null : { scrollTop: 87 }
    },
    jQuery: (element: LinkElement) => new Query(element)
  }))
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  Object.assign(sharedCore, {
    meta: { Languages: ['EN', 'CN'] },
    services: { translator },
    t: (key: string) => key,
    auto: (key: string) => key,
    log: () => {},
    host: {
      sugarcube: {
        require: () => ({
          Story: { has: () => true },
          Config: { addVisitedLinkClass: false },
          State: { hasPlayed: () => false },
          Wikifier: {
            wikifyEval: () => {
              state.bodyCount++;
              state.ironmanDuringBody = Reflect.get(window, 'ironmanFlag');
              state.body?.();
            }
          },
          Engine: {
            play: (passage: string) => state.played.push({ passage, queued: variables.nextPassage, intended: variables.nextPassageIntended })
          }
        })
      }
    }
  });
  try {
    const target = options.target === undefined ? 'Orphanage' : options.target;
    _languageLink.call({
      args: target === null ? [['Continue', '继续']] : [['Continue', '继续'], target],
      payload: [{ contents: options.content ?? '<<payload>>' }],
      error: (message: string) => state.errors.push(message),
      createShadowWrapper: (body?: () => void, done?: () => void) => () => {
        body?.();
        done?.();
      }
    } as unknown as MacroContext);
    run(state);
  } finally {
    for (const key of Object.keys(sharedCore)) if (!Object.hasOwn(originalCore, key)) Reflect.deleteProperty(sharedCore, key);
    Object.defineProperties(sharedCore, originalCore);
    for (const { key, descriptor } of globals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    for (const { key, descriptor } of windowKeys) {
      if (descriptor) Object.defineProperty(window, key, descriptor);
      else Reflect.deleteProperty(window, key);
    }
  }
}

for (const menu of [false, true])
  for (const queuedBefore of [false, true])
    for (const queuedDuring of [false, true]) {
      test(`lanLink ${menu ? 'menu' : 'target'} handles queue before=${queuedBefore} during=${queuedDuring} like vanilla`, () => {
        navigation({ target: menu ? null : 'Orphanage', variables: {} }, state => {
          // Queues are read when clicked, rather than when the link is rendered.
          if (queuedBefore) state.variables.nextPassage = 'Forced Before';
          state.body = () => {
            state.variables.actionRan = true;
            if (queuedDuring) state.variables.nextPassage = 'Forced During';
          };
          state.language('CN');
          expect(state.label()).toBe('继续');
          state.click();
          const ran = menu || !queuedBefore;
          expect(state.bodyCount).toBe(Number(ran));
          expect(state.variables.actionRan).toBe(ran ? true : undefined);
          expect(state.ironmanDuringBody).toBe(ran ? true : undefined);
          expect(Reflect.get(window, 'ironmanFlag')).toBeUndefined();
          if (menu) {
            expect(state.played).toEqual([]);
            expect(state.variables.nextPassage).toBe(queuedDuring ? 'Forced During' : queuedBefore ? 'Forced Before' : undefined);
            expect(state.variables.nextPassageIntended).toBeUndefined();
          } else {
            const redirected = queuedBefore || queuedDuring;
            expect(state.played).toEqual([
              { passage: queuedBefore ? 'Forced Before' : queuedDuring ? 'Forced During' : 'Orphanage', queued: undefined, intended: redirected ? 'Orphanage' : undefined }
            ]);
            expect(state.variables.nextPassage).toBeUndefined();
            expect(Reflect.get(window, 'scrollUIBar')).toBe(19);
            expect(Reflect.get(window, 'scrollMain')).toBe(87);
          }
          expect(state.errors).toEqual([]);
        });
      });
    }

test('lanLink menus remain repeatable without V while target clicks require the active DoL state', () => {
  navigation({ target: null, variables: null }, state => {
    state.click();
    state.click();
    expect(state.bodyCount).toBe(2);
    expect(state.played).toEqual([]);
    expect(state.errors).toEqual([]);
  });
  navigation({ variables: null }, state => {
    expect(state.errors).toEqual([]);
    expect(() => state.click()).toThrow('DoL host is not ready: V');
    expect(state.bodyCount).toBe(0);
    expect(state.played).toEqual([]);
  });
});

test('lanLink reports missing temporary state at render and always clears its body write permission', () => {
  navigation({ temporary: null }, state => {
    expect(state.errors).toEqual(['<<lanLink>> error: DoL host is not ready: T']);
    expect(state.bodyCount).toBe(0);
    expect(state.played).toEqual([]);
  });
  navigation({}, state => {
    state.body = () => {
      throw new Error('payload failed');
    };
    expect(() => state.click()).toThrow('payload failed');
    expect(Reflect.get(window, 'ironmanFlag')).toBeUndefined();
    expect(state.played).toEqual([]);
  });
});

test('lanLink navigation tolerates an absent sidebar and scrolling element', () => {
  navigation({ sidebar: false, scrollingElement: false }, state => {
    state.click();
    expect(state.played).toEqual([{ passage: 'Orphanage', queued: undefined, intended: undefined }]);
    expect(Reflect.get(window, 'scrollUIBar')).toBeNull();
    expect(Reflect.get(window, 'scrollMain')).toBe(0);
  });
});

test('lanLink consumes queued navigation even when its payload is empty', () => {
  navigation({ content: '', variables: { nextPassage: 'Forced' } }, state => {
    state.click();
    expect(state.bodyCount).toBe(0);
    expect(state.played).toEqual([{ passage: 'Forced', queued: undefined, intended: 'Orphanage' }]);
  });
});

test('lanLink uses the active V when its payload replaces the state', () => {
  navigation({}, state => {
    const loaded: Record<string, unknown> = { nextPassage: 'Loaded Event' };
    state.body = () => Object.defineProperty(globalThis, 'V', { value: loaded, configurable: true });
    state.click();
    expect(state.played.map(item => item.passage)).toEqual(['Loaded Event']);
    expect(loaded).toEqual({ nextPassageIntended: 'Orphanage' });
    expect(state.variables.nextPassageIntended).toBeUndefined();
  });
});
