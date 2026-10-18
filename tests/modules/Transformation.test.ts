import '../support/runtime';
import { expect, mock, test } from 'bun:test';
import type Character from '../../src/modules/Character';
import dol from '../../src/host/DoL';
import DoLP from '../../src/compat/DoLP';
import NewWorld from '../../src/compat/NewWorld';

mock.module('../../src/core', () => ({ default: {} }));
const { default: Transformation } = await import('../../src/modules/CharacterAddon/Transformation');

test('refresh and load preserve native and foreign transformation parts and traits', () => {
  const saved = ['V', 'setup', 'StartConfig'].map(key => ({ key, descriptor: Object.getOwnPropertyDescriptor(globalThis, key) }));
  const parts = {
    cat: { ears: 'hidden', tail: 'classic' },
    waterdragon: { ears: 'default', horns: 'curved', tail: 'hidden' },
    traits: { native: 'default', foreign: 'hidden' }
  };
  const variables = { maplebirch: { transformation: {} }, transformationParts: structuredClone(parts) };
  const setup = { transformations: [{ name: 'cat', traits: [{ name: 'native' }] }] };
  const manager = { core: { once() {}, tool: { define() {}, defineS() {} } } } as unknown as Character;
  try {
    Object.defineProperty(globalThis, 'StartConfig', { value: { version: '0.5.12.13 New World 0.1.9.17' }, configurable: true });
    Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
    Object.defineProperty(globalThis, 'setup', { value: setup, configurable: true });
    const transformation = new Transformation(manager);
    transformation.inject();
    transformation.state();
    expect(variables.transformationParts).toEqual(parts);
    setup.transformations = [];
    transformation.state();
    expect(variables.transformationParts).toEqual(parts);
  } finally {
    for (const { key, descriptor } of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test('registered transformations retain saved choices before the native table is ready', () => {
  const saved = ['V', 'setup', 'StartConfig'].map(key => ({ key, descriptor: Object.getOwnPropertyDescriptor(globalThis, key) }));
  const variables: {
    maplebirch: { transformation: Record<string, { level: number; build: number }> };
    transformationParts: Record<string, Record<string, string>>;
  } = {
    maplebirch: { transformation: { raven: { level: 6, build: 150 }, retired: { level: 3, build: 50 } } },
    transformationParts: { raven: { wings: 'hidden', tail: 'custom' }, traits: { feathered: 'hidden' } }
  };
  const manager = { core: { once() {}, tool: { define() {}, defineS() {} } } } as unknown as Character;
  try {
    Object.defineProperty(globalThis, 'StartConfig', { value: { version: '0.5.12.13' }, configurable: true });
    Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
    Object.defineProperty(globalThis, 'setup', { value: { transformations: [] }, configurable: true });
    const transformation = new Transformation(manager);
    transformation.add('raven', 'physical', {
      parts: [
        { name: 'wings', tfRequired: 6 },
        { name: 'tail', tfRequired: 4 },
        { name: 'ears', tfRequired: 2 }
      ],
      traits: [{ name: 'feathered', tfRequired: 3 }]
    });
    transformation.state();
    transformation.state();
    expect(variables.maplebirch.transformation).toEqual({ raven: { level: 6, build: 150 } });
    expect(variables.transformationParts).toEqual({ raven: { wings: 'hidden', tail: 'custom', ears: 'disabled' }, traits: { feathered: 'hidden' } });
  } finally {
    for (const { key, descriptor } of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test('DoLP compatibility retains legacy state, native parts and trait choices across loads', () => {
  const saved = ['V', 'setup', 'StartConfig'].map(key => ({ key, descriptor: Object.getOwnPropertyDescriptor(globalThis, key) }));
  const parts = {
    waterdragon: { ears: 'hidden', horns: 'curved', tail: 'default' },
    kitsune: { tail: 'hidden' },
    traits: { sharpEyes: 'hidden', aquatic: 'default', activeTF: 'hidden' }
  };
  const legacy = { level: 6, build: 100 };
  const variables = { maplebirch: { transformation: { waterdragon: legacy } }, transformationParts: structuredClone(parts), waterdragon: 6, waterdragonbuild: 100 };
  const manager = { core: { once() {}, tool: { define() {}, defineS() {} } } } as unknown as Character;
  try {
    Object.defineProperty(globalThis, 'StartConfig', { value: { version: '0.5.12.13 DoLP v0.778' }, configurable: true });
    Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
    Object.defineProperty(globalThis, 'setup', { value: { transformations: [] }, configurable: true });
    const transformation = new Transformation(manager);
    DoLP.Transformations.install(transformation);
    transformation.state();
    expect(variables.maplebirch.transformation.waterdragon).toBe(legacy);
    transformation.inject();
    transformation.state();
    expect(variables.transformationParts).toEqual(parts);
    expect(dol.setup.transformations.some((tf: { name: string }) => tf.name === 'waterdragon')).toBe(true);
    expect(variables.waterdragon).toBe(6);
    expect(variables.waterdragonbuild).toBe(100);
  } finally {
    for (const { key, descriptor } of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test('NewWorld compatibility injects animal and history transforms', () => {
  const saved = ['V', 'setup', 'StartConfig', 'Transformations'].map(key => ({ key, descriptor: Object.getOwnPropertyDescriptor(globalThis, key) }));
  const variables = { maplebirch: {}, transformationParts: {} };
  const manager = { core: { once() {}, tool: { define() {}, defineS() {} } } } as unknown as Character;
  try {
    Object.defineProperty(globalThis, 'StartConfig', { value: { version: '0.5.12.13 New World 0.1.9.17' }, configurable: true });
    Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
    Object.defineProperty(globalThis, 'setup', { value: { transformations: [] }, configurable: true });
    const transformation = new Transformation(manager);
    NewWorld.Transformations.install(transformation);
    transformation.inject();
    expect(dol.setup.transformations.some((tf: { name: string }) => tf.name === 'dragon')).toBe(true);
    expect(dol.setup.transformations.some((tf: { name: string }) => tf.name === 'bee')).toBe(true);
  } finally {
    for (const { key, descriptor } of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test('DoLP ritual growth uses registered native build updaters and compatibility conditions', () => {
  const saved = [
    [globalThis, 'StartConfig'],
    [globalThis, 'V'],
    [Math, 'clamp']
  ].map(([target, key]) => ({ target: target as object, key: key as string, descriptor: Object.getOwnPropertyDescriptor(target, key as string) }));
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
    Object.defineProperty(Math, 'clamp', { value: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)), configurable: true });
    const manager = { core: { once() {}, tool: { define() {}, defineS() {} } } } as unknown as Character;
    const transformation = new Transformation(manager);
    DoLP.Transformations.install(transformation);
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

test('coexistence grows every animal independently and leaves default selection unchanged', () => {
  const saved = ['V', 'setup', 'StartConfig'].map(key => ({ key, descriptor: Object.getOwnPropertyDescriptor(globalThis, key) }));
  const variables = {
    settings: { transformDivineEnabled: false, transformAnimalEnabled: true },
    wolfgirl: 0,
    cat: 0,
    cow: 0,
    harpy: 0,
    fox: 0,
    wolfbuild: 10,
    catbuild: 10,
    cowbuild: 10,
    birdbuild: 10,
    foxbuild: 10,
    maplebirch: { transformation: { raven: { level: 0, build: 5 }, horse: { level: 0, build: 0 } } },
    transformationParts: {},
    timeMessages: []
  };
  try {
    Object.defineProperty(globalThis, 'StartConfig', { value: { version: '0.5.12.13' }, configurable: true });
    Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
    Object.defineProperty(globalThis, 'setup', { value: { transformations: [] }, configurable: true });
    const transformation = new Transformation({ core: { once() {}, tool: { define() {}, defineS() {} } } } as unknown as Character);
    transformation.add('raven', 'physical', { parts: [], update: [5, 20], level: 2 });
    transformation.add('horse', 'physical', { parts: [], update: [5, 20], level: 2 });
    const calls: string[] = [];
    transformation.wikifier = ((name: string) => {
      calls.push(name);
    }) as typeof transformation.wikifier;
    transformation._transformationAlteration();
    expect(calls).toEqual([]); // Tied growth without an existing form does not select a winner.
    let enabled = true;
    transformation.coexistConditions.push(() => enabled);
    transformation._transformationAlteration();
    expect(calls).toEqual(['wolfTransform', 'catTransform', 'cowTransform', 'harpyTransform', 'foxTransform']);
    expect(variables.maplebirch.transformation.raven.level).toBe(1);
    expect(variables.maplebirch.transformation.horse.level).toBe(0);
    transformation._transformationAlteration();
    expect(variables.maplebirch.transformation.raven.level).toBe(1); // The next threshold still applies.
    enabled = false;
    variables.wolfgirl = 2;
    calls.length = 0;
    transformation._transformationAlteration();
    expect(calls).toEqual(['wolfTransform']);
    variables.settings.transformAnimalEnabled = false;
    enabled = true;
    calls.length = 0;
    transformation._transformationAlteration();
    expect(calls).toEqual([]);
  } finally {
    for (const { key, descriptor } of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test('coexistence protects growth from suppression and decay but not explicit loss', () => {
  const saved = ['V', 'setup', 'StartConfig'].map(key => ({ key, descriptor: Object.getOwnPropertyDescriptor(globalThis, key) }));
  const variables = {
    settings: { transformAnimalEnabled: false, transformDivineEnabled: false },
    worn: { neck: { name: 'naked', cursed: 0 } },
    wolfgirl: 0,
    cat: 0,
    cow: 0,
    harpy: 0,
    fox: 0,
    angel: 0,
    fallenangel: 0,
    demon: 0,
    wolfbuild: 10,
    catbuild: 10,
    cowbuild: 0,
    birdbuild: 0,
    foxbuild: 0,
    maplebirch: { transformation: {} },
    transformationParts: {},
    specialTransform: 0
  };
  try {
    Object.defineProperty(globalThis, 'StartConfig', { value: { version: '0.5.12.13' }, configurable: true });
    Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
    Object.defineProperty(globalThis, 'setup', { value: { transformations: [] }, configurable: true });
    const transformation = new Transformation({ core: { once() {}, tool: { define() {}, defineS() {} } } } as unknown as Character);
    for (const key of Object.keys(transformation.suppressConditions)) delete transformation.suppressConditions[key];
    for (const key of Object.keys(transformation.decayConditions)) delete transformation.decayConditions[key];
    transformation.suppressConditions.wolf = [() => true];
    transformation.suppressConditions.cat = [() => true];
    transformation.decayConditions.cat = [() => true];
    transformation.buildUpdaters.wolf = change => {
      variables.wolfbuild += change;
    };
    transformation.buildUpdaters.cat = change => {
      variables.catbuild += change;
    };
    let enabled = true;
    transformation.coexistConditions.push(() => enabled);
    transformation._transform('wolf', 2);
    expect(variables.catbuild).toBe(10);
    transformation._transformationStateUpdate();
    expect(variables.catbuild).toBe(10);
    transformation._transform('cat', -2);
    expect(variables.catbuild).toBe(8);
    enabled = false;
    transformation._transform('wolf', 2);
    expect(variables.catbuild).toBe(6);
    transformation._transformationStateUpdate();
    expect(variables.catbuild).toBe(5);
    variables.worn.neck = { name: 'familiar collar', cursed: 1 };
    transformation._transform('wolf', 2);
    transformation._transformationStateUpdate();
    expect(variables.catbuild).toBe(5);
  } finally {
    for (const { key, descriptor } of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
