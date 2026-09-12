import './helpers/runtime';
import { expect, test } from 'bun:test';
import type { MaplebirchCore } from '../src/core';

const { default: GUIControl } = await import('../src/services/GUIControl');
type ModuleInfo = Parameters<InstanceType<typeof GUIControl>['saveModules']>[0][number];

function createModule(name: string, dependencies: string[] = []): ModuleInfo {
  return { name, dependencies, type: 'module', source: 'Example', protected: false, lifecycle: true };
}

function createCore(graph: Record<string, unknown> = {}, initialDisabled: string[] = []) {
  let disabled = initialDisabled;
  const store = {
    get: async (key: string) => (key === 'Modules' ? { key, value: { disabled: disabled.map(name => ({ name, source: 'Example' })) } } : undefined),
    put: async (record: { key: string; value: { disabled: Array<{ name: string }> } }) => {
      disabled = record.value.disabled.map(item => item.name);
    }
  };
  return {
    once: () => true,
    dependencyGraph: graph,
    manager: { modLoaderGui: { getModSubUiAngularJsService: () => ({ addLifeTimeCallback() {} }) } },
    modUtils: { getModLoadController: () => ({ listModIndexDB: async () => ['Example'], loadHiddenModList: async () => [] }) },
    idb: { withTransaction: async (_stores: unknown, _mode: unknown, callback: (tx: { objectStore: () => typeof store }) => unknown) => callback({ objectStore: () => store }) }
  } as unknown as MaplebirchCore;
}

test('enables a transitive dependency chain without revisiting nodes', () => {
  const gui = new GUIControl(createCore());
  let visits = 0;
  const disabled = Array.from({ length: 20 }, (_, index) => ({
    ...createModule(`M${index}`),
    get dependencies() {
      visits++;
      return Array.from({ length: index }, (_, dependency) => `M${dependency}`);
    }
  }));
  expect(new Set(gui.cascadeModules('enable', 'M19', { enabled: [], disabled })).size).toBe(20);
  expect(visits).toBeLessThanOrEqual(20);
});

test('disables dependents without touching unrelated or protected modules', () => {
  const gui = new GUIControl(createCore());
  const enabled = [createModule('A'), createModule('B', ['A']), createModule('C', ['A', 'B']), createModule('Other'), { ...createModule('Core'), protected: true }];
  expect(new Set(gui.cascadeModules('disable', 'A', { enabled, disabled: [] }))).toEqual(new Set(['A', 'B', 'C']));
  expect(gui.cascadeModules('disable', 'Core', { enabled, disabled: [] })).toEqual([]);
});

test('projects saved disabled roots through dependencies and reflects pending re-enable settings', async () => {
  const graph = {
    A: { source: 'Example', lifecycle: true, dependencies: [], allDependencies: [], state: 'DISABLED' },
    B: { source: 'Example', lifecycle: true, dependencies: ['A'], allDependencies: ['A'], state: 'DISABLED' },
    C: { source: 'Example', lifecycle: true, dependencies: ['B'], allDependencies: ['A', 'B'], state: 'DISABLED' }
  };
  const gui = new GUIControl(createCore(graph, ['A']));
  await gui.init();
  expect(gui.disabledModules.map(module => module.name)).toEqual(['A', 'B', 'C']);
  expect(gui.enabledModules).toEqual([]);
  await gui.saveModules(gui.disabledModules, []);
  expect(gui.disabledModules).toEqual([]);
  expect(gui.enabledModules.map(module => module.name)).toEqual(['A', 'B', 'C']);
});

test('uses the same protected boundary as the runtime while retaining hidden exposed bridges', async () => {
  const graph = {
    A: { source: 'Example', dependencies: [], allDependencies: [] },
    Core: { protected: true, dependencies: ['A'], allDependencies: ['A'] },
    Child: { source: 'Example', lifecycle: true, dependencies: ['Core'], allDependencies: ['Core', 'A'] },
    API: { source: 'Example', exposed: true, dependencies: ['A'], allDependencies: ['A'] },
    Consumer: { source: 'Example', lifecycle: true, dependencies: ['API'], allDependencies: ['API', 'A'] }
  };
  const gui = new GUIControl(createCore(graph, ['A']));
  await gui.init();
  expect(gui.disabledModules.map(module => module.name)).toEqual(['A', 'API', 'Consumer']);
  const visible = gui.disabledModules.filter(module => module.type !== 'exposed');
  expect(new Set(gui.cascadeModules('enable', 'Consumer', { enabled: [], disabled: visible }))).toEqual(new Set(['Consumer', 'A']));
});
