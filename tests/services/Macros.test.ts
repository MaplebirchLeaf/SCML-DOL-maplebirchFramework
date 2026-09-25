import './runtime';
import { expect, mock, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';
import type ToolCollection from '../../src/modules/ToolCollection';

mock.module('../../src/core', () => ({ default: {} }));
const { default: defineMacros } = await import('../../src/modules/Frameworks/macros');

function harness() {
  const listeners = new Map<string, Array<() => void>>();
  const registry = new Map<string, object>();
  const macro = {
    has: (name: string) => registry.has(name),
    get: (name: string) => registry.get(name),
    delete: (name: string) => registry.delete(name),
    add: (name: string, definition: object) => {
      if (registry.has(name)) throw new Error(`cannot clobber existing macro <<${name}>>`);
      registry.set(name, { ...definition });
    }
  };
  let ready = false;
  const core = {
    infra: { diagnostics: { scoped: () => () => {} } },
    host: {
      sugarcube: {
        get runtime() {
          return ready ? { Macro: macro } : undefined;
        },
        require: () => ({ Macro: macro })
      }
    },
    once: (event: string, callback: () => void) => listeners.set(event, [...(listeners.get(event) ?? []), callback])
  } as unknown as MaplebirchCore;
  const service = Object.freeze(new defineMacros({ core } as ToolCollection));
  return {
    service,
    registry,
    ready: () => {
      ready = true;
    },
    emit: (event: string) => {
      for (const callback of listeners.get(event) ?? []) callback();
    }
  };
}

test('defines a new macro at SugarCube readiness without requiring the caller to subscribe', () => {
  const { service, registry, ready, emit } = harness();
  service.define('myModHello', function () {});
  expect(registry.has('myModHello')).toBe(false);
  ready();
  emit(':sugarcube');
  expect(registry.has('myModHello')).toBe(true);
});

test('does not occupy a vanilla widget name before story readiness', () => {
  const { service, registry, ready, emit } = harness();
  service.define('transform', function () {}, null, null, false, 'storyready');
  ready();
  emit(':sugarcube');
  expect(registry.has('transform')).toBe(false);
  const vanilla = { handler() {} };
  service.Macro.add('transform', vanilla);
  emit(':storyready');
  expect(registry.get('transform')).not.toEqual(vanilla);
  expect(registry.has('transform')).toBe(true);
});

test('does not reapply an early definition at story readiness', () => {
  const { service, registry, ready, emit } = harness();
  ready();
  emit(':sugarcube');
  service.define('myModEarly', function () {});
  const own = registry.get('myModEarly');
  expect(own).toBeDefined();
  emit(':storyready');
  expect(registry.get('myModEarly')).toBe(own);
});

test('replaces a vanilla macro immediately after story readiness', () => {
  const { service, registry, ready, emit } = harness();
  ready();
  emit(':sugarcube');
  service.Macro.add('transform', { handler() {} });
  emit(':storyready');
  const vanilla = registry.get('transform');
  service.defineS('transform', () => 'new', null, null, false, 'storyready');
  expect(registry.get('transform')).not.toEqual(vanilla);
});
