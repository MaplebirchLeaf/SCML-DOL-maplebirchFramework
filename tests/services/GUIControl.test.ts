import './runtime';
import { expect, mock, test } from 'bun:test';
import type IndexedDB from '../../src/services/IndexedDB';
import type ModLoader from '../../src/host/ModLoader';
import type Emitter from '../../src/infra/Emitter';
import type Modules from '../../src/services/Modules';
import type Translator from '../../src/services/Translator';

mock.module('@/twee/Gui.twee', () => ({ default: '' }));

const { default: GUIControl } = await import('../../src/services/GUIControl');

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
    gui: new GUIControl(idb, modloader, events, modules, translator, () => undefined),
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
