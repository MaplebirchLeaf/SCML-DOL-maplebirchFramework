import './runtime';
import { describe, expect, test } from 'bun:test';
import type ModLoader from '../../src/host/ModLoader';
import type IndexedDB from '../../src/services/IndexedDB';

const [{ default: Modules }, { ModuleState }] = await Promise.all([import('../../src/services/Modules'), import('../../src/constants')]);

function fixture(disabled: string[] = []) {
  const logs: Array<{ message: string; level: string }> = [];
  const owner: Record<string, unknown> = {};
  const meta: { core: string[]; protected: string[] } = { core: [], protected: [] };
  const idb = {
    async with(_stores: string[], _mode: IDBTransactionMode, callback: (transaction: { objectStore(): { get(): Promise<unknown> } }) => unknown) {
      return callback({ objectStore: () => ({ get: async () => ({ value: { disabled: disabled.map(name => ({ name })) } }) }) });
    }
  } as unknown as IndexedDB;
  const modloader = {
    modUtils: {
      getLogger: () => ({
        warn: (message: string) => logs.push({ message, level: 'WARN' }),
        error: (message: string) => logs.push({ message, level: 'ERROR' })
      })
    }
  } as unknown as ModLoader;
  return { modules: new Modules(owner, meta, idb, modloader), owner, meta, logs };
}

describe('Modules', () => {
  test('gives registered modules a scoped log backed by global diagnostics', () => {
    const { modules, meta } = fixture();
    meta.core.push('named');
    const module = { log: undefined as undefined | ((message: string, level?: string, ...data: unknown[]) => void) };
    expect(modules.register('named', module)).toBe(true);
    expect(typeof module.log).toBe('function');
    expect(Object.isSealed(module)).toBe(true);
    module.log?.('failed', 'ERROR', { code: 7 });
    expect(modules.errors).toEqual(expect.arrayContaining([expect.objectContaining({ scope: 'modules:named', message: 'failed', data: { code: 7 } })]));
  });

  test('replaces an existing module logger with its registered name', () => {
    const { modules } = fixture();
    const previous: string[] = [];
    const module = { log: (message: string, _level?: string) => previous.push(message) };
    expect(modules.register('renamed', module)).toBe(true);
    module.log('registered', 'ERROR');
    expect(previous).toEqual([]);
    expect(modules.errors).toEqual(expect.arrayContaining([expect.objectContaining({ scope: 'modules:renamed', message: 'registered' })]));
  });

  test('mounts every core module during registration in dependency order', () => {
    const { modules, owner, meta } = fixture();
    meta.core.push('first', 'second');
    const first = { Init() {} };
    const second = { Init() {} };
    modules.register('second', second, ['first']);
    expect(owner.second).toBeUndefined();
    modules.register('first', first);
    expect(owner.first).toBe(first);
    expect(owner.second).toBe(second);
    expect(modules.dependencyGraph.second.mounted).toBe(true);
  });

  test('gives sealed modules with a log slot scoped diagnostics in the global history', () => {
    const { modules } = fixture();
    const module = Object.seal({ log: undefined as undefined | ((message: string, level?: string) => void), Init() {} });
    modules.register('sealed', module);
    module.log?.('module failure', 'ERROR');
    expect(modules.errors).toEqual(expect.arrayContaining([expect.objectContaining({ scope: 'modules:sealed', message: 'module failure' })]));
    expect(modules.registry.modules.get('sealed')).toBe(module);
  });

  test('rejects a sealed module without a log slot before mounting it', () => {
    const { modules, owner } = fixture();
    const module = Object.seal({ exposed: true });
    expect(modules.register('sealedWithoutLog', module)).toBe(false);
    expect(modules.has('sealedWithoutLog')).toBe(false);
    expect(owner.sealedWithoutLog).toBeUndefined();
  });

  test('mounts only explicitly exposed modules on window and unmounts disabled ones', async () => {
    const { modules } = fixture(['disabled']);
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const scope: Record<string, unknown> = { occupied: 'existing' };
    const calls: string[] = [];
    Object.defineProperty(globalThis, 'window', { value: scope, configurable: true });
    try {
      const visible = { exposed: 'window' as const, Init: () => void calls.push('visible init') };
      const disabled = { exposed: 'window' as const };
      expect(modules.register('visible', visible)).toBe(true);
      expect(modules.register('disabled', disabled)).toBe(true);
      expect(modules.register('occupied', { exposed: 'window' })).toBe(false);
      expect(scope.visible).toBe(visible);
      expect(scope.disabled).toBe(disabled);
      expect(scope.occupied).toBe('existing');
      await modules.run('pre');
      modules.run('init');
      expect(scope.disabled).toBeUndefined();
      expect(scope.visible).toBe(visible);
      expect(calls).toEqual(['visible init']);
    } finally {
      if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });

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
