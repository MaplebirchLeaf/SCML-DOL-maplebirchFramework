import './runtime';
import { expect, mock, spyOn, test } from 'bun:test';
import type IndexedDB from '../../src/services/IndexedDB';
import type ModLoader from '../../src/host/ModLoader';
import type Emitter from '../../src/infra/Emitter';
import type Modules from '../../src/services/Modules';
import type Translator from '../../src/services/Translator';
import type Repair from '../../src/services/Repair';
import type RepairGUI from '../../src/services/Repair/GUI';
import type { RepairOverlay } from '../../src/services/Repair/Engine';
import type { RepairRecipe } from '../../src/services/Repair/Recipe';

mock.module('@/twee/Gui.twee?raw', () => ({ default: '' }));
mock.module('@/twee/RepairGui.twee?raw', () => ({ default: '' }));

const { default: GUIControl } = await import('../../src/services/GUIControl');
const { default: RepairGUIClass } = await import('../../src/services/Repair/GUI');
const { Config } = await import('../../src/constants');

function fixture(dependencies: Record<string, string[]> = {}) {
  let disabled = [{ name: 'other', source: '' }];
  const writes: string[][] = [];
  const graph = Object.fromEntries(
    ['first', 'second', 'other'].map(name => [
      name,
      {
        protected: false,
        exposed: false,
        mounted: false,
        lifecycle: true,
        dependencies: dependencies[name] ?? [],
        dependents: [],
        allDependencies: [],
        state: 'REGISTERED',
        source: ''
      }
    ])
  );
  const idb = {
    async with(_stores: string[], _mode: IDBTransactionMode, callback: (tx: { objectStore: () => { get(key: string): Promise<unknown>; put(value: unknown): Promise<void> } }) => unknown) {
      return callback({
        objectStore: () => ({
          get: async (key: string) => (key === 'Modules' ? { key, value: { disabled } } : undefined),
          put: async (record: unknown) => {
            disabled = (record as { value: { disabled: typeof disabled } }).value.disabled;
            writes.push(disabled.map(item => item.name));
          }
        })
      });
    }
  } as unknown as IndexedDB;
  const modloader = {
    modLoaderGui: { getModSubUiAngularJsService: () => ({}) },
    loadController: { listModIndexDB: async () => [], loadHiddenModList: async () => [] }
  } as unknown as ModLoader;
  const events = { once() {} } as unknown as Emitter;
  const modules = { dependencyGraph: graph } as unknown as Modules;
  const translator = { language: 'EN' } as Translator;
  return {
    gui: new GUIControl(idb, modloader, events, modules, translator, () => undefined, {} as Repair),
    writes,
    get disabled() {
      return disabled;
    }
  };
}

test('GUI updates only named module states and retains unrelated disabled entries', async () => {
  const state = fixture();
  expect(await state.gui.setModuleStates({ first: false, second: false })).toBe(true);
  expect(state.disabled.map(item => item.name)).toEqual(['other', 'first', 'second']);
  expect(await state.gui.setModuleStates({ first: true })).toBe(true);
  expect(state.disabled.map(item => item.name)).toEqual(['other', 'second']);
  expect(await state.gui.setModuleStates({ second: false })).toBe(false);
  expect(state.writes).toHaveLength(2);
});

test('GUI rejects updates that would change an unselected dependent module', async () => {
  const state = fixture({ second: ['first'] });
  await expect(state.gui.setModuleStates({ first: false })).rejects.toThrow('未指定模块: second');
  expect(state.disabled.map(item => item.name)).toEqual(['other']);
  expect(state.writes).toHaveLength(0);
});

test('GUI rejects unknown module names', async () => {
  const state = fixture();
  await expect(state.gui.setModuleStates({ missing: false })).rejects.toThrow('不可修改: missing');
  expect(state.writes).toHaveLength(0);
});

Object.assign(Config, {
  RepairStatus: {
    analyzing: ['Analyzing'],
    completed: ['Done'],
    preflight: ['Repair validation failed'],
    analysisTimeout: ['Analysis timed out (300s).'],
    loadingModels: ['Loading models'],
    cancelled: ['Cancelled']
  }
});

function repairFixture() {
  const recipe: RepairRecipe = { requestId: 'request', outcome: 'repair', summary: 'Repair', evidence: [], operations: [] };
  let complete!: (response: Awaited<ReturnType<Repair['analyze']>>) => void;
  const response = new Promise<Awaited<ReturnType<Repair['analyze']>>>(resolve => (complete = resolve));
  const analyze = mock(() => response);
  const fetchModels = mock(async () => ({ result: 'success', models: ['model'] }));
  const write = mock();
  const refresh = mock(() => {});
  const repair = {
    connection: { apiType: 'openai', apiUrl: 'https://example.test/v1', apiKey: 'test-key', model: 'model' },
    analyze,
    fetchModels,
    write
  } as unknown as Repair;
  return {
    gui: new RepairGUIClass(repair, { language: 'EN' } as Translator, refresh),
    analyze,
    fetchModels,
    write,
    refresh,
    complete: (response: Awaited<ReturnType<Repair['analyze']>> = { result: 'success', recipe }) => complete(response),
    recipe
  };
}

test('Repair GUI runs without a Debug Mode dependency and accepts completed results', async () => {
  const state = repairFixture();
  await state.gui.fetchModels();
  expect(state.fetchModels).toHaveBeenCalledTimes(1);
  expect(state.gui.models).toEqual(['model']);

  const pending = state.gui.analyze();
  await state.gui.analyze();
  expect(state.analyze).toHaveBeenCalledTimes(1);
  expect(state.gui.busy).toBe(true);
  state.complete();
  await pending;
  expect(state.gui.proposal).toBe(state.recipe);
  expect(state.gui.status).toEqual(Config.RepairStatus.completed);
  expect(state.gui.busy).toBe(false);
});

test('Repair GUI retains a partial success reason together with its executable preview', async () => {
  const state = repairFixture();
  const overlays: RepairOverlay[] = [
    {
      target: { id: 'target-1', modName: 'example', kind: 'css', path: 'style.css', fingerprint: 'a'.repeat(64) },
      before: 'a { color: reed; }',
      after: 'a { color: red; }',
      fingerprint: 'b'.repeat(64)
    }
  ];
  const reason = 'Skipped target-2: Repair search match count: target-2 (found 0, expected 1)';
  const pending = state.gui.analyze();
  state.complete({ result: 'success', recipe: state.recipe, overlays, reason });
  await pending;

  expect(state.gui.proposal).toBe(state.recipe);
  expect(state.gui.overlays).toBe(overlays);
  expect(state.gui.reason).toBe(reason);
  expect(state.gui.status).toEqual(Config.RepairStatus.completed);
  expect(state.gui.busy).toBe(false);
  expect(state.write).not.toHaveBeenCalled();
});

test('Repair GUI closing cancels a request and discards its late result', async () => {
  const state = repairFixture();
  state.gui.reason = 'Previous validation failure';
  const pending = state.gui.analyze();
  state.gui.close();
  state.complete({ result: 'preflight', reason: 'Late validation failure' });
  await pending;
  expect(state.gui.proposal).toBeUndefined();
  expect(state.gui.status).toEqual(Config.RepairStatus.cancelled);
  expect(state.gui.reason).toBe('');
  expect(state.gui.busy).toBe(false);
});

test('Repair GUI allows 300 seconds for analysis and retains the 20-second model timeout', async () => {
  const state = repairFixture();
  const timer = spyOn(globalThis, 'setTimeout');
  let pending: Promise<void> | undefined;
  try {
    await state.gui.fetchModels();
    expect(timer.mock.calls[0]?.[1]).toBe(20000);
    timer.mockClear();
    state.gui.reason = 'Previous validation failure';
    pending = state.gui.analyze();
    const [expire, delay] = timer.mock.calls[0];
    expect(delay).toBe(300000);
    if (typeof expire !== 'function') throw new Error('Expected a timer callback');
    expire();
    state.complete({ result: 'preflight', reason: 'Late validation failure' });
    await pending;
    expect(state.gui.status).toEqual(Config.RepairStatus.analysisTimeout);
    expect(state.gui.proposal).toBeUndefined();
    expect(state.gui.reason).toBe('');
    expect(state.gui.busy).toBe(false);
  } finally {
    state.complete();
    await pending;
    timer.mockRestore();
  }
});

test('Repair GUI exposes validation reasons and clears them before the next analysis', async () => {
  const state = repairFixture();
  state.complete({ result: 'preflight', reason: 'Replacement does not match supplied content' });
  await state.gui.analyze();
  expect(state.gui.reason).toBe('Replacement does not match supplied content');
  expect(state.gui.status).toEqual(Config.RepairStatus.preflight);
  expect(state.gui.proposal).toBeUndefined();
  expect(state.gui.overlays).toEqual([]);

  let complete!: (response: Awaited<ReturnType<Repair['analyze']>>) => void;
  state.analyze.mockReturnValueOnce(new Promise(resolve => (complete = resolve)));
  const pending = state.gui.analyze();
  expect(state.gui.reason).toBe('');
  complete({ result: 'success', recipe: state.recipe });
  await pending;
  expect(state.gui.reason).toBe('');
  expect(state.gui.proposal).toBe(state.recipe);

  state.gui.reason = 'Previous validation failure';
  state.gui.changeApi();
  expect(state.gui.reason).toBe('');
  expect(state.gui.proposal).toBeUndefined();
});

test('Repair GUI records unexpected failures without exposing exception text', async () => {
  const state = repairFixture();
  const secret = 'private-api-key-and-source';
  state.analyze.mockRejectedValueOnce(new Error(secret));
  await expect(state.gui.analyze()).resolves.toBeUndefined();
  expect(state.gui.status).toEqual(Config.RepairStatus.preflight);
  expect(state.gui.reason).toBe('Repair analysis failed');
  expect(state.gui.proposal).toBeUndefined();
  expect(state.gui.overlays).toEqual([]);
  expect(state.write.mock.calls).toEqual([['Repair GUI action failed: analyzing', 'WARN']]);
  expect(JSON.stringify(state.write.mock.calls)).not.toContain(secret);
  expect(state.gui.busy).toBe(false);
});

test('Repair GUI destruction discards late results and prevents further requests or refreshes', async () => {
  const state = repairFixture();
  const pending = state.gui.analyze();
  state.gui.destroy();
  state.complete();
  await pending;
  await state.gui.fetchModels();
  expect(state.gui.proposal).toBeUndefined();
  expect(state.fetchModels).not.toHaveBeenCalled();
  expect(state.refresh).not.toHaveBeenCalled();
});

test('disabling framework Debug Mode does not close Repair GUI', async () => {
  const state = fixture();
  const changes: Array<{ action: string; level: string }> = [];
  type Scope = {
    $ctrl: { repair: RepairGUI; data: { onChange(action: string, data: { level: string }): Promise<void> } };
    $applyAsync(): void;
    $on(): void;
    EnableDisableItem(action: string): void;
  };
  type Controller = (this: Scope['$ctrl'], scope: Scope) => void;
  let controller!: Controller;
  const ref = {
    registryComponentModGuiConfig(register: (module: { component(name: string, options: { controller: [string, Controller] }): void }) => unknown) {
      register({ component: (_name, options) => (controller = options.controller[1]) });
    },
    addComponentModGuiConfig() {}
  };
  await (state.gui as unknown as { whenCreate(value: typeof ref): Promise<void> }).whenCreate(ref);
  const scope = {
    $ctrl: {
      data: {
        onChange: async (action: string, data: { level: string }) => {
          changes.push({ action, level: data.level });
        }
      }
    },
    $applyAsync() {},
    $on() {}
  } as unknown as Scope;
  controller.call(scope.$ctrl, scope);
  const close = (scope.$ctrl.repair.close = mock(() => {}));
  scope.EnableDisableItem('disable');
  expect(changes).toEqual([{ action: 'DEBUG', level: 'INFO' }]);
  expect(close).not.toHaveBeenCalled();
});
