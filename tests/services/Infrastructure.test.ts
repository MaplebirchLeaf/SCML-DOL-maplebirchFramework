import './runtime';
import { describe, expect, test } from 'bun:test';
import type ModLoader from '../../src/host/ModLoader';

const [
  { default: Catalog },
  { default: Diagnostics },
  { default: Emitter },
  { default: Hooks },
  { default: Lifecycle },
  { default: Logger },
  { default: IndexedDB },
  { default: Modules },
  { default: Translator }
] = await Promise.all([
  import('../../src/infra/Catalog'),
  import('../../src/infra/Diagnostics'),
  import('../../src/infra/Emitter'),
  import('../../src/infra/Hooks'),
  import('../../src/infra/Lifecycle'),
  import('../../src/infra/Logger'),
  import('../../src/services/IndexedDB'),
  import('../../src/services/Modules'),
  import('../../src/services/Translator')
]);

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
    first.reset();

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

  test('collects scoped and patch failures while exporting conflict snapshots', () => {
    const { modloader } = fixture();
    const host = Object.assign(modloader, {
      conflict: [
        {
          mod: { dataSource: 'first' },
          result: { dataSource: 'second', passageDataItems: { conflict: new Set(['Intro']) }, scriptFileItems: { conflict: new Set() }, styleFileItems: { conflict: new Set() } }
        }
      ]
    }) as unknown as ModLoader;
    const diagnostics = new Diagnostics(host);
    diagnostics.reset();
    diagnostics.scoped('module:test')('module failed', 'ERROR');
    diagnostics.recordPatch({ kind: 'passage', target: 'Intro', index: 1, pattern: 'missing', matches: 0, applied: 0, status: 'unmatched' });
    expect(new Diagnostics().history.map(record => record.scope)).toEqual(expect.arrayContaining(['module:test', 'patch']));
    expect(JSON.parse(diagnostics.export()).conflicts).toEqual([expect.objectContaining({ source: 'first', dataSource: 'second' })]);
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

  test('clears only its registrations while diagnostics remain global', () => {
    const { modloader } = fixture();
    const diagnostics = new Diagnostics(modloader);
    diagnostics.reset();
    const catalog = new Catalog<string, number>(modloader);
    catalog.add('one', 1);
    diagnostics.record('shared', 'ERROR', 'test');
    catalog.clear();
    expect(catalog.list()).toEqual([]);
    expect(diagnostics.errors).toHaveLength(1);
    catalog.add('two', 2);
    diagnostics.reset();
    expect(catalog.get('two')).toBe(2);
    expect(diagnostics.history).toEqual([]);
  });
});

describe('Hooks', () => {
  test('executes hooks synchronously by order and keeps registration order for ties', () => {
    const { modloader } = fixture();
    const hooks = new Hooks<[number], number>(modloader);
    const calls: string[] = [];
    hooks.add(
      'late',
      value => {
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

    expect(hooks.execute(4)).toEqual([4, 5, 6]);
    expect(calls).toEqual(['early', 'also early', 'late']);
  });

  test('dispatches one named hook through the shared hook implementation', async () => {
    const { modloader } = fixture();
    const hooks = new Hooks<[number], number>(modloader);
    hooks.add('double', async value => value * 2);
    expect(await hooks.call('double', 4)).toBe(8);
    expect(await hooks.call('missing', 4)).toBeUndefined();
  });

  test('uses explicit failure handling for named and ordered execution', async () => {
    const { modloader } = fixture();
    const throwing = new Hooks<[], number>(modloader);
    const continuing = new Hooks<[], number>(modloader, 'continue');
    for (const hooks of [throwing, continuing]) {
      hooks.add('failed', () => {
        throw new Error('boom');
      });
      hooks.add('healthy', () => 7);
    }
    expect(throwing.call('failed')).rejects.toThrow('boom');
    expect(() => throwing.execute()).toThrow('boom');
    expect(await continuing.call('failed')).toBeUndefined();
    expect(continuing.execute()).toEqual([7]);
    expect(continuing.errors).toEqual(expect.arrayContaining([expect.objectContaining({ scope: 'hooks' })]));
  });

  test('rejects an asynchronous callback in ordered synchronous execution', () => {
    const { modloader } = fixture();
    const hooks = new Hooks<[], void>(modloader);
    hooks.add('async', async () => undefined);
    expect(() => hooks.execute()).toThrow('Hook must be synchronous: async');
  });
});

describe('Lifecycle', () => {
  test('owns asynchronous and synchronous lifecycle error handling', async () => {
    const { modloader } = fixture();
    const lifecycle = new Lifecycle(modloader);
    lifecycle.reset();
    expect((await lifecycle.execute({ preInit: async () => undefined }, 'preInit')).ok).toBe(true);
    expect(lifecycle.execute({ Init: () => undefined }, 'Init')).toEqual({ called: true, ok: true });
    const result = lifecycle.execute({ Init: async () => undefined }, 'Init', 'module:test');
    expect(result.ok).toBe(false);
    expect(lifecycle.errors.at(-1)?.scope).toBe('module:test');
    expect(lifecycle.errors.at(-1)?.message).toContain('必须同步执行');
  });

  test('records a rejected preInit through the same execute method', async () => {
    const { modloader } = fixture();
    const lifecycle = new Lifecycle(modloader);
    lifecycle.reset();
    const result = await lifecycle.execute(
      {
        preInit: async () => {
          throw new Error('pre failed');
        }
      },
      'preInit',
      'module:pre'
    );
    expect(result).toMatchObject({ called: true, ok: false });
    expect(lifecycle.errors.at(-1)).toMatchObject({ scope: 'module:pre', message: 'preInit failed: pre failed' });
  });

  test('inherits Catalog.clear without erasing global diagnostics', () => {
    const { modloader } = fixture();
    const lifecycle = new Lifecycle<string, { Init(): void }>(modloader);
    lifecycle.reset();
    lifecycle.add('feature', { Init() {} });
    lifecycle.record('failure', 'ERROR', 'lifecycle');
    lifecycle.clear();
    expect(lifecycle.has('feature')).toBe(false);
    expect(new Diagnostics(modloader).errors).toHaveLength(1);
  });
});
