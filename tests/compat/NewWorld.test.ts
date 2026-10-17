import '../support/runtime';
import { expect, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';
import NewWorld from '../../src/compat/NewWorld';

test('NewWorld detection and canvasmodel guard', () => {
  const saved = ['V', 'StartConfig', 'Transformations'].map(key => ({
    key,
    descriptor: Object.getOwnPropertyDescriptor(globalThis, key)
  }));

  try {
    Object.defineProperty(globalThis, 'StartConfig', {
      value: { version: '0.5.12.13 New World 0.1.9.17' },
      configurable: true
    });
    expect(NewWorld.isNewWorld).toBe(true);

    const variables = { transformationParts: {} as Record<string, unknown> };
    Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });

    NewWorld.guard();

    const parts = variables.transformationParts as Record<string, { wings_colour?: unknown; tail_colour?: unknown; horns_colour?: unknown }>;
    expect(parts.demon?.wings_colour).toEqual({ h: 275, s: 100, l: 30 });
    expect(parts.demon?.tail_colour).toEqual({ h: 275, s: 100, l: 30 });
    expect(parts.demon?.horns_colour).toEqual({ h: 275, s: 100, l: 30 });
    expect(parts.fae?.wings_colour).toEqual({ h: 275, s: 100, l: 30 });
    expect(parts.dragon?.wings_colour).toEqual({ h: 275, s: 100, l: 30 });
    expect(parts.ghost).toBeDefined();
    expect(parts.slime).toBeDefined();
    expect(parts.mushroom).toBeDefined();
    expect(parts.eldritch).toBeDefined();
    expect(parts.zombie).toBeDefined();
    expect(parts.doll).toBeDefined();
    expect(parts.bunny).toBeDefined();
    expect(parts.fox ?? parts.dog).toBeDefined();

    const valid = { names: new Set<string>(), traits: new Set<string>() };
    NewWorld.Transformations.extend(valid);
    expect(valid.names.has('dragon')).toBe(true);
    expect(valid.names.has('bee')).toBe(true);
    expect(valid.traits.has('dragonEyes')).toBe(true);

    const merged = NewWorld.Transformations.merge([{ name: 'wolf' }]);
    expect(merged.length).toBe(15);
    expect(merged.some(tf => tf.name === 'dragon')).toBe(true);
  } finally {
    for (const { key, descriptor } of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test('NewWorld detection via window.Transformations', () => {
  const savedStartConfig = Object.getOwnPropertyDescriptor(globalThis, 'StartConfig');
  const savedTransformations = Object.getOwnPropertyDescriptor(globalThis, 'Transformations');

  try {
    Object.defineProperty(globalThis, 'StartConfig', {
      value: { version: '0.5.12.13' },
      configurable: true
    });
    const win = window as unknown as { Transformations?: unknown };
    delete win.Transformations;
    expect(NewWorld.isNewWorld).toBe(false);

    window.Transformations = {
      defaults: {
        demon: { colour: { h: 275, s: 100, l: 30 } },
        fae: { colour: { h: 275, s: 100, l: 30 } },
        dragon: { colour: { h: 275, s: 100, l: 30 } }
      }
    };
    expect(NewWorld.isNewWorld).toBe(true);
  } finally {
    if (savedStartConfig) Object.defineProperty(globalThis, 'StartConfig', savedStartConfig);
    else Reflect.deleteProperty(globalThis, 'StartConfig');

    if (savedTransformations) Object.defineProperty(globalThis, 'Transformations', savedTransformations);
    else {
      Reflect.deleteProperty(globalThis, 'Transformations');
      delete window.Transformations;
    }
  }
});

test('NewWorld install registers variable event and before hook', () => {
  const savedStartConfig = Object.getOwnPropertyDescriptor(globalThis, 'StartConfig');
  try {
    Object.defineProperty(globalThis, 'StartConfig', {
      value: { version: '0.5.12.13 New World 0.1.9.17' },
      configurable: true
    });

    const events: string[] = [];
    const charHooks: string[] = [];
    const core = {
      on: (event: string) => events.push(event),
      char: {
        use: (type: string) => {
          charHooks.push(type);
        }
      }
    } as unknown as MaplebirchCore;

    NewWorld.install(core);
    expect(events).toContain(':variable');
    expect(charHooks).toContain('before');
  } finally {
    if (savedStartConfig) Object.defineProperty(globalThis, 'StartConfig', savedStartConfig);
    else Reflect.deleteProperty(globalThis, 'StartConfig');
  }
});
