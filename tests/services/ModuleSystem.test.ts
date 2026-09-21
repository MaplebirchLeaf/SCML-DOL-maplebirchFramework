import './runtime';
import { describe, expect, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';

const [{ default: ModuleSystem }, { ModuleState }] = await Promise.all([import('../../src/services/ModuleSystem'), import('../../src/constants')]);

function fixture(disabled: string[] = []) {
  const logs: Array<{ message: string; level: string }> = [];
  const core = {
    meta: { core: [], early: [], protected: [] },
    logger: {
      log(message: string, level: string) {
        logs.push({ message, level });
      }
    },
    idb: {
      async withTransaction(_stores: string[], _mode: IDBTransactionMode, callback: (transaction: { objectStore(): { get(): Promise<unknown> } }) => unknown) {
        return callback({ objectStore: () => ({ get: async () => ({ value: { disabled: disabled.map(name => ({ name })) } }) }) });
      }
    }
  } as unknown as MaplebirchCore;
  return { modules: new ModuleSystem(core), logs };
}

describe('ModuleSystem', () => {
  test('runs dependencies in order through synchronous lifecycle phases', async () => {
    const { modules } = fixture();
    const calls: string[] = [];
    modules.register('base', {
      preInit: () => void calls.push('base pre'),
      Init: () => void calls.push('base init'),
      loadInit: () => void calls.push('base load'),
      postInit: () => void calls.push('base post')
    });
    modules.register(
      'feature',
      {
        preInit: () => void calls.push('feature pre'),
        Init: () => void calls.push('feature init'),
        loadInit: () => void calls.push('feature load'),
        postInit: () => void calls.push('feature post')
      },
      ['base']
    );

    await modules.run('pre');
    modules.run('init');
    expect(calls).toEqual(['base pre', 'feature pre', 'base init', 'feature init', 'base post', 'feature post']);
    expect(modules.registry.states.get('base')).toBe(ModuleState.MOUNTED);
    expect(modules.registry.states.get('feature')).toBe(ModuleState.MOUNTED);

    modules.run('load');
    expect(calls.slice(-4)).toEqual(['base load', 'feature load', 'base post', 'feature post']);
  });

  test('keeps disabled modules registered but hides them from public lookup', async () => {
    const { modules } = fixture(['base']);
    const base = { Init() {} };
    const dependent = { Init() {} };
    modules.register('base', base);
    modules.register('dependent', dependent, ['base']);

    await modules.run('pre');

    expect(modules.registry.modules.get('base')).toBe(base);
    expect(modules.registry.modules.get('dependent')).toBe(dependent);
    expect(modules.get('base')).toBeUndefined();
    expect(modules.get('dependent')).toBeUndefined();
    expect(modules.registry.states.get('base')).toBe(ModuleState.DISABLED);
    expect(modules.registry.states.get('dependent')).toBe(ModuleState.DISABLED);
  });

  test('pre-initializes a late module before with resolves', async () => {
    const { modules } = fixture();
    const calls: string[] = [];
    await modules.run('pre');

    await modules.with('example-mod', () => {
      modules.register('late', {
        preInit: () => void calls.push('late pre'),
        Init: () => void calls.push('late init')
      });
    });

    expect(calls).toEqual(['late pre']);
    expect(modules.dependencyGraph.late.source).toBe('example-mod');
    modules.run('init');
    expect(calls).toEqual(['late pre', 'late init']);
  });

  test('marks modules that return promises from synchronous phases as errors', async () => {
    const { modules, logs } = fixture();
    modules.register('invalid', { Init: async () => undefined });
    await modules.run('pre');

    modules.run('init');

    expect(modules.registry.states.get('invalid')).toBe(ModuleState.ERROR);
    expect(logs.some(({ message, level }) => level === 'ERROR' && message.includes('必须同步执行'))).toBe(true);
  });
});
