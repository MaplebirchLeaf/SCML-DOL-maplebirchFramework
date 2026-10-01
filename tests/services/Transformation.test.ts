import './runtime';
import { expect, mock, test } from 'bun:test';
import type Character from '../../src/modules/Character';

mock.module('../../src/core', () => ({ default: {} }));
const { default: Transformation } = await import('../../src/modules/CharacterAddon/Transformation');

test('transformation layer factories wait for vanilla renderer initialization', () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'Renderer');
  const init: (() => void)[] = [];
  const calls: unknown[][] = [];
  const translations = new Map();
  const manager = {
    core: {
      once() {},
      tool: { define() {}, defineS() {}, onInit: (fn: () => void) => init.push(fn) },
      services: { translator: { set: (key: string, value: unknown) => translations.set(key, value) } }
    },
    use: (...args: unknown[]) => calls.push(args)
  } as unknown as Character;
  const transformation = new Transformation(manager);
  const pre = () => {};
  const post = () => {};
  const main = { raven: { src: 'raven-main.png' } };
  const combat = { raven: { src: 'raven-combat.png' } };
  let evaluated = 0;
  try {
    Object.defineProperty(window, 'Renderer', { value: undefined, configurable: true });
    expect(() =>
      transformation.add('raven', 'physical', {
        parts: [{ name: 'wings', tfRequired: 6 }],
        pre,
        layers: () => {
          evaluated++;
          return Reflect.get(window, 'Renderer').CanvasModels.main.layers;
        },
        combat: {
          post,
          layers: () => {
            evaluated++;
            return Reflect.get(window, 'Renderer').CanvasModels.combatMainPc.layers;
          }
        },
        chimeras: [{ name: 'angelraven', part: 'wings', sources: ['raven', 'angel'], label: 'Angel raven wings' }],
        translations: { raven: { EN: 'Raven', CN: '渡鸦' } }
      })
    ).not.toThrow();
    expect(evaluated).toBe(0);
    expect(transformation.chimeras).toHaveLength(1);
    expect(translations.has('raven')).toBe(true);
    expect(calls).toEqual([
      ['pre', pre, 'main'],
      ['post', post, 'combatMainPc']
    ]);
    Object.defineProperty(window, 'Renderer', { value: { CanvasModels: { main: { layers: main }, combatMainPc: { layers: combat } } }, configurable: true });
    for (const fn of init) fn();
    expect(evaluated).toBe(2);
    expect(calls.slice(2)).toEqual([
      [main, 'main', { pet: true }],
      [combat, 'combatMainPc', { pet: false }]
    ]);
  } finally {
    if (descriptor) Object.defineProperty(window, 'Renderer', descriptor);
    else Reflect.deleteProperty(window, 'Renderer');
  }
});

test('static transformation layers remain immediately available', () => {
  const calls: unknown[][] = [];
  const manager = {
    core: {
      once() {},
      tool: {
        define() {},
        defineS() {},
        onInit() {
          throw new Error('Static layers must not be deferred');
        }
      }
    },
    use: (...args: unknown[]) => calls.push(args)
  } as unknown as Character;
  const layers = { fish: { src: 'fish.png' } };
  new Transformation(manager).add('fish', 'physical', { parts: [], layers });
  expect(calls).toEqual([[layers, 'main', { pet: true }]]);
});
