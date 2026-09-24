import { describe, expect, test } from 'bun:test';
import type ModLoader from '../../src/host/ModLoader';
import Catalog from '../../src/infra/Catalog';
import Diagnostics from '../../src/infra/Diagnostics';
import Emitter from '../../src/infra/Emitter';
import Hooks from '../../src/infra/Hooks';
import Lifecycle from '../../src/infra/Lifecycle';
import Logger from '../../src/infra/Logger';
import IndexedDB from '../../src/services/IndexedDB';
import Modules from '../../src/services/Modules';
import Translator from '../../src/services/Translator';

function fixture() {
  const logs: Array<{ message: string; level: string }> = [];
  const modloader = {
    modUtils: {
      getLogger: () => ({
        log: (message: string) => logs.push({ message, level: 'INFO' }),
        warn: (message: string) => logs.push({ message, level: 'WARN' }),
        error: (message: string) => logs.push({ message, level: 'ERROR' })
      })
    }
  } as unknown as ModLoader;
  return { modloader, logs };
}

describe('infrastructure inheritance', () => {
  test('keeps the hierarchy shallow and explicit', () => {
    const { modloader } = fixture();
    expect(new Diagnostics(modloader)).toBeInstanceOf(Logger);
    expect(new Catalog<string, number>(modloader)).toBeInstanceOf(Diagnostics);
    expect(new Hooks<[number], number>(modloader)).toBeInstanceOf(Catalog);
    expect(new Lifecycle(modloader)).toBeInstanceOf(Catalog);
    expect(new Emitter(modloader)).toBeInstanceOf(Diagnostics);
    expect(IndexedDB.prototype).toBeInstanceOf(Catalog);
    expect(Modules.prototype).toBeInstanceOf(Lifecycle);
    expect(Translator.prototype).toBeInstanceOf(Catalog);
  });
});

describe('Diagnostics', () => {
  test('normalizes thrown values without a separate utility function', () => {
    expect(Diagnostics.message(new Error('boom'))).toBe('boom');
    expect(Diagnostics.message('failed')).toBe('failed');
  });

  test('shares records and collected errors across every instance', () => {
    const { modloader, logs } = fixture();
    const first = new Diagnostics(modloader);
    const second = new Diagnostics(modloader);
    first.clear();

    first.record('ready', 'INFO', 'first', { service: 'first' });
    second.record('failed', 'ERROR', 'second', new Error('boom'));

    expect(first.history).toEqual(second.history);
    expect(second.history).toHaveLength(2);
    expect(first.errors).toHaveLength(1);
    expect(first.errors[0].message).toBe('failed');
    expect(first.history[0].scope).toBe('first');
    expect(logs).toEqual([{ message: '[second] failed', level: 'ERROR' }]);
    const exported = JSON.parse(second.export());
    expect(exported.history[0]).toEqual(first.history[0]);
    expect(exported.history[1].data).toEqual({ name: 'Error', message: 'boom' });
  });
});

describe('Catalog', () => {
  test('provides stable add, remove, get, has and list operations', () => {
    const { modloader } = fixture();
    const catalog = new Catalog<string, number>(modloader);

    expect(catalog.add('first', 1)).toBe(true);
    expect(catalog.add('first', 2)).toBe(false);
    expect(catalog.has('first')).toBe(true);
    expect(catalog.get('first')).toBe(1);
    expect(catalog.list()).toEqual([1]);
    expect(catalog.remove('first')).toBe(true);
    expect(catalog.remove('first')).toBe(false);
  });
});

describe('Hooks', () => {
  test('executes hooks sequentially by order and keeps registration order for ties', async () => {
    const { modloader } = fixture();
    const hooks = new Hooks<[number], number>(modloader);
    const calls: string[] = [];
    hooks.add(
      'late',
      async value => {
        await Promise.resolve();
        calls.push('late');
        return value + 2;
      },
      20
    );
    hooks.add(
      'early',
      value => {
        calls.push('early');
        return value;
      },
      10
    );
    hooks.add(
      'also early',
      value => {
        calls.push('also early');
        return value + 1;
      },
      10
    );

    expect(await hooks.execute(4)).toEqual([4, 5, 6]);
    expect(calls).toEqual(['early', 'also early', 'late']);
  });

  test('dispatches one named hook through the shared hook implementation', async () => {
    const { modloader } = fixture();
    const hooks = new Hooks<[number], number>(modloader);
    hooks.add('double', value => value * 2);
    expect(await hooks.call('double', 4)).toBe(8);
    expect(await hooks.call('missing', 4)).toBeUndefined();
  });
});

describe('Lifecycle', () => {
  test('owns asynchronous and synchronous lifecycle error handling', async () => {
    const { modloader } = fixture();
    const lifecycle = new Lifecycle(modloader);
    lifecycle.clear();
    expect((await lifecycle.execute({ preInit: async () => undefined }, 'preInit')).ok).toBe(true);
    const result = lifecycle.executeSync({ Init: async () => undefined }, 'Init', 'module:test');
    expect(result.ok).toBe(false);
    expect(lifecycle.errors.at(-1)?.scope).toBe('module:test');
    expect(lifecycle.errors.at(-1)?.message).toContain('必须同步执行');
  });
});
