import './runtime';
import { expect, mock, test } from 'bun:test';
import type Character from '../../src/modules/Character';
import dol from '../../src/host/DoL';

mock.module('../../src/core', () => ({ default: {} }));
const { default: Transformation } = await import('../../src/modules/CharacterAddon/Transformation');

test('DoLP ritual growth registers native build updaters and compatibility conditions', () => {
  const saved = [
    [globalThis, 'StartConfig'],
    [globalThis, 'V'],
    [Object, 'cover'],
    [Math, 'clamp']
  ].map(([target, key]) => ({ target: target as object, key: key as string, descriptor: Object.getOwnPropertyDescriptor(target, key as string) }));
  const ready: (() => void)[] = [];
  const variables = {
    bunnybuild: 0,
    bearbuild: 0,
    waterdragonbuild: 0,
    featsBoosts: { upgrades: { adaptiveGenes: 0 } },
    worn: { neck: { name: 'familiar collar', cursed: 1 } }
  };
  try {
    Object.defineProperty(globalThis, 'StartConfig', { value: { version: '0.5.12.11 DoLP v0.778' }, configurable: true });
    Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
    Object.defineProperty(Object, 'cover', { value: (...sources: object[]) => Object.assign({}, ...sources), configurable: true });
    Object.defineProperty(Math, 'clamp', { value: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)), configurable: true });
    const manager = { core: { once: (_event: string, callback: () => void) => ready.push(callback), tool: { define() {}, defineS() {} } } } as unknown as Character;
    const transformation = new Transformation(manager);
    for (const callback of ready) callback();
    for (const name of ['bunny', 'bear', 'waterdragon'] as const) {
      expect(typeof transformation.buildUpdaters[name]).toBe('function');
      expect(transformation.decayConditions[name].length).toBeGreaterThan(0);
      expect(transformation.suppressConditions[name].length).toBeGreaterThan(0);
      transformation._transform(name, 1);
      expect(variables[`${name}build`]).toBe(1);
      transformation._transform(name, -1);
      expect(variables[`${name}build`]).toBe(0);
    }
    variables.featsBoosts.upgrades.adaptiveGenes = 5;
    transformation._transform('waterdragon', 5);
    expect(variables.waterdragonbuild).toBe(5.5);
    expect(typeof transformation.buildUpdaters.wolf).toBe('function');
  } finally {
    for (const { target, key, descriptor } of saved) {
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else Reflect.deleteProperty(target, key);
    }
  }
});

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
    const variablesDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'V');
    Object.defineProperty(globalThis, 'V', { value: { transformationParts: {} }, configurable: true });
    const originalParts = dol.variables.transformationParts;
    try {
      dol.variables.transformationParts = { raven: { wings: 'default' }, angel: { wings: 'default' } } as typeof originalParts;
      expect(transformation.chimeraOptions.angelraven_wings).toBe(true);
      for (const value of ['hidden', 'disabled']) {
        dol.variables.transformationParts.angel.wings = value;
        expect(transformation.chimeraOptions.angelraven_wings).toBe(false);
      }
      dol.variables.transformationParts = {} as typeof originalParts;
      expect(transformation.chimeraOptions.angelraven_wings).toBe(false);
    } finally {
      dol.variables.transformationParts = originalParts;
      if (variablesDescriptor) Object.defineProperty(globalThis, 'V', variablesDescriptor);
      else Reflect.deleteProperty(globalThis, 'V');
    }
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
