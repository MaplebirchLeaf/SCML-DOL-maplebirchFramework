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
    add: (name: string, definition: object) => registry.set(name, definition)
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
  const service = new defineMacros({ core } as ToolCollection);
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
  service.define('myMod:hello', function () {});
  expect(registry.has('myMod:hello')).toBe(false);
  ready();
  emit(':sugarcube');
  expect(registry.has('myMod:hello')).toBe(true);
});

test('restores a definition replaced by vanilla before story readiness', () => {
  const { service, registry, ready, emit } = harness();
  service.defineS('myMod:message', () => 'Hello');
  ready();
  emit(':sugarcube');
  const own = registry.get('myMod:message');
  registry.set('myMod:message', { handler() {} });
  emit(':storyready');
  expect(registry.get('myMod:message')).toBe(own);
});

test('defines immediately after SugarCube readiness and keeps an unchanged definition', () => {
  const { service, registry, ready, emit } = harness();
  ready();
  service.define('myMod:late', function () {});
  const own = registry.get('myMod:late');
  expect(own).toBeDefined();
  emit(':storyready');
  expect(registry.get('myMod:late')).toBe(own);
});
