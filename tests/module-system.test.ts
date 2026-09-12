import './helpers/runtime';
import { describe, expect, test } from 'bun:test';
import type { MaplebirchCore } from '../src/core';
const { ModuleState } = await import('../src/constants');
const { default: ModuleSystem } = await import('../src/services/ModuleSystem');

function createCore(disabled: string[] = [], protectedNames: string[] = []) {
  return {
    logger: { log: () => undefined },
    meta: { core: [], early: [], protected: protectedNames },
    idb: { withTransaction: async () => ({ value: { disabled: disabled.map(name => ({ name })) } }) }
  } as unknown as MaplebirchCore & Record<string, unknown>;
}

describe('ModuleSystem.get', () => {
  test('does not expose a module disabled by saved settings', async () => {
    const core = {
      logger: { log: () => undefined },
      meta: { core: [], early: [], protected: [] },
      idb: {
        withTransaction: async () => ({ value: { disabled: [{ name: 'DR' }] } })
      }
    } as any;
    const modules = new ModuleSystem(core);
    const dr = {};

    expect(modules.register('DR', dr)).toBe(true);
    await modules.run('pre');

    expect(modules.registry.states.get('DR')).toBe(ModuleState.DISABLED);
    expect(modules.get('DR')).toBeUndefined();
  });

  test('returns a module that is not disabled', () => {
    const core = {
      logger: { log: () => undefined },
      meta: { core: [], early: [], protected: [] }
    } as any;
    const modules = new ModuleSystem(core);
    const dr = {};

    expect(modules.register('DR', dr)).toBe(true);

    expect(modules.get('DR')).toBe(dr);
  });
});

describe('module lifecycle', () => {
  test('disables transitive dependents, including exposed APIs, and keeps registry metadata', async () => {
    const core = createCore(['A']);
    const modules = new ModuleSystem(core);
    const hooks: string[] = [];
    modules.register('A', {
      preInit() {
        hooks.push('A');
      }
    });
    modules.register(
      'B',
      {
        Init() {
          hooks.push('B');
        }
      },
      ['A']
    );
    modules.register(
      'C',
      {
        exposed: true,
        postInit() {
          hooks.push('C');
        }
      },
      ['B']
    );
    modules.register('API', { exposed: true }, ['C']);
    modules.register('Independent', {
      Init() {
        hooks.push('Independent');
      }
    });
    await modules.run('pre');
    modules.run('init');
    modules.run('load');
    for (const name of ['A', 'B', 'C', 'API']) {
      expect(modules.get(name)).toBeUndefined();
      expect(core[name]).toBeUndefined();
      expect(modules.dependencyGraph[name].state).toBe('DISABLED');
      expect(modules.registry.modules.has(name)).toBe(true);
    }
    expect(hooks).toEqual(['Independent']);
  });

  test('applies saved disable settings even when dependencies are missing', async () => {
    const modules = new ModuleSystem(createCore(['DR']));
    modules.register('DR', {}, ['Missing']);
    await modules.run('pre');
    expect(modules.get('DR')).toBeUndefined();
    expect(modules.dependencyGraph.DR.state).toBe('DISABLED');
  });

  test('does not disable protected roots or their dependents', async () => {
    const modules = new ModuleSystem(createCore(['Core'], ['Core']));
    modules.register('Core', {});
    modules.register('Child', {}, ['Core']);
    await modules.run('pre');
    modules.run('init');
    expect(modules.dependencyGraph.Core.state).toBe('MOUNTED');
    expect(modules.dependencyGraph.Child.state).toBe('MOUNTED');
  });

  test('immediately hides late dependents of disabled modules', async () => {
    const core = createCore(['A']);
    const modules = new ModuleSystem(core);
    modules.register('A', {});
    await modules.run('pre');
    await modules.with('LateMod', () => {
      modules.register('API', { exposed: true }, ['A']);
      expect(modules.get('API')).toBeUndefined();
      expect(core.API).toBeUndefined();
    });
    expect(modules.dependencyGraph.API.source).toBe('LateMod');
  });

  test('orders every phase correctly with mixed exposed and lifecycle dependencies', async () => {
    const modules = new ModuleSystem(createCore());
    const hooks: string[] = [];
    const hooksFor = (name: string) => ({
      preInit() {
        hooks.push(`${name}.pre`);
      },
      Init() {
        hooks.push(`${name}.init`);
      },
      postInit() {
        hooks.push(`${name}.post`);
      },
      loadInit() {
        hooks.push(`${name}.load`);
      }
    });
    modules.register('E', { exposed: true });
    modules.register('Root', hooksFor('Root'));
    modules.register('D', hooksFor('D'), ['Root']);
    modules.register('A', hooksFor('A'), ['E', 'D']);
    await modules.run('pre');
    modules.run('init');
    modules.run('load');
    expect(hooks).toEqual(['Root.pre', 'D.pre', 'A.pre', 'Root.init', 'D.init', 'A.init', 'Root.post', 'D.post', 'A.post', 'Root.load', 'D.load', 'A.load', 'Root.post', 'D.post', 'A.post']);
  });

  test('completes nested late registration without waiting on its own preInit', async () => {
    const modules = new ModuleSystem(createCore());
    const hooks: string[] = [];
    await modules.run('pre');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        modules.with('Outer', () =>
          modules.register('Late', {
            async preInit() {
              hooks.push('Late.start');
              await modules.with('Nested', () =>
                modules.register(
                  'Child',
                  {
                    preInit() {
                      hooks.push('Child');
                    }
                  },
                  ['Late']
                )
              );
              hooks.push('Late.end');
            }
          })
        ),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('late preInit did not finish')), 200);
        })
      ]);
    } finally {
      clearTimeout(timeout);
    }
    expect(hooks).toEqual(['Late.start', 'Late.end', 'Child']);
    expect(modules.dependencyGraph.Child.source).toBe('Nested');
    modules.run('init');
    expect(modules.dependencyGraph.Child.state).toBe('MOUNTED');
  });

  test('drains an async registration scope that outlives an active preInit', async () => {
    const modules = new ModuleSystem(createCore());
    const hooks: string[] = [];
    const preparation = Promise.withResolvers<void>();
    const started = Promise.withResolvers<void>();
    const outsideGate = Promise.withResolvers<void>();
    await modules.run('pre');
    const first = modules.with('FirstMod', () =>
      modules.register('First', {
        async preInit() {
          started.resolve();
          await preparation.promise;
          hooks.push('First');
        }
      })
    );
    await started.promise;
    const outside = modules.with('OutsideMod', async () => {
      await outsideGate.promise;
      modules.register('Second', {
        preInit() {
          hooks.push('Second');
        }
      });
    });
    preparation.resolve();
    await first;
    outsideGate.resolve();
    await outside;
    modules.run('init');
    expect(hooks).toEqual(['First', 'Second']);
    expect(modules.dependencyGraph.Second.state).toBe('MOUNTED');
  });
});
