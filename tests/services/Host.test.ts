import { describe, expect, test } from 'bun:test';
import type { Gui } from '@scml/types/Mod_LoaderGui/Gui';
import type { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import type { TwineSugarCube } from '../../types/twine-sugarcube';
import { DoL } from '../../src/host/DoL';
import ModLoader from '../../src/host/ModLoader';
import SugarCube from '../../src/host/SugarCube';

describe('DoL host', () => {
  test('centralizes exact globals and keeps semantic accessors', () => {
    const scope = { V: { player: true }, T: { turn: 1 }, C: { robin: {} }, setup: { ready: true }, Renderer: { render() {} } };
    const dol = new DoL(scope as never);

    expect(dol.V as unknown).toBe(scope.V);
    expect(dol.T as unknown).toBe(scope.T);
    expect(dol.C as unknown).toBe(scope.C);
    expect(dol.setup as unknown).toBe(scope.setup);
    expect(dol.Renderer as unknown).toBe(scope.Renderer);
    expect(dol.variables as unknown).toBe(scope.V);
    expect(dol.renderer as unknown).toBe(scope.Renderer);
    expect(dol.has('V')).toBe(true);
    expect(dol.has('variables')).toBe(true);
  });

  test('reports a missing runtime value at the host boundary', () => {
    const dol = new DoL({} as never);
    expect(() => dol.V).toThrow('DoL host is not ready: V');
  });
});

describe('SugarCube host', () => {
  test('owns the mutable SugarCube runtime', () => {
    const host = new SugarCube();
    const runtime = { State: { passage: 'Start' } } as unknown as TwineSugarCube;

    expect(Object.hasOwn(host, 'runtime')).toBe(true);
    expect(host.runtime).toBeUndefined();
    expect(() => host.require()).toThrow('SugarCube runtime is not ready.');
    expect('current' in host).toBe(false);
    expect('ready' in host).toBe(false);
    host.runtime = runtime;
    expect(host.runtime).toBe(runtime);
    expect(host.require()).toBe(runtime);
  });

  test('owns SugarCube save snapshots and restores runtime variables after use', () => {
    const host = new SugarCube();
    const variables = { value: 1 };
    host.runtime = { State: { variables } } as unknown as TwineSugarCube;
    const save = host.save({ state: { history: [{ title: 'Example', variables: { value: 4 } }] } });

    expect(save.V).toEqual({ value: 4 });
    save.use(save.V, () => {
      expect(variables.value).toBe(4);
      variables.value = 5;
    });
    expect(save.V).toEqual({ value: 5 });
    expect(variables.value).toBe(1);
  });
});

describe('ModLoader host', () => {
  test('resolves lodash through the static host access point', () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const lodash = { isEqual: () => true };
    Object.defineProperty(globalThis, 'window', { value: { modSC2DataManager: { getModUtils: () => ({ getLodash: () => lodash }) } }, configurable: true });
    try {
      expect((ModLoader as unknown as { getLodash: () => unknown }).getLodash()).toBe(lodash);
    } finally {
      if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });

  test('owns normalized image resources and their cache', async () => {
    let requests = 0;
    const data = {
      getHtmlTagSrcHook: () => ({
        normalizePath: (path: string) => `normalized/${path}`,
        checkImageExist: () => true,
        requestImageBySrc: async (path: string) => {
          requests++;
          return path;
        }
      })
    } as unknown as SC2DataManager;
    const host = new ModLoader(data, {} as Gui);
    expect(host.resources.normalize('img\\portrait.png')).toBe('normalized/img/portrait.png');
    expect(await host.resources.load('img\\portrait.png')).toBe('normalized/img/portrait.png');
    expect(host.resources.load('img\\portrait.png')).toBe('normalized/img/portrait.png');
    expect(requests).toBe(1);
    host.resources.clear();
    expect(await host.resources.load('img\\portrait.png')).toBe('normalized/img/portrait.png');
    expect(requests).toBe(2);
  });

  test('centralizes ModLoader API access', () => {
    const modUtils = { name: 'utils' };
    const loader = { name: 'loader' };
    const loadController = { name: 'controller' };
    const dependence = { name: 'dependence' };
    const conflict = [{ name: 'conflict' }];
    const data = {
      getModUtils: () => modUtils,
      getModLoader: () => loader,
      getModLoadController: () => loadController,
      getDependenceChecker: () => dependence,
      getConflictResult: () => conflict
    } as unknown as SC2DataManager;
    const gui = { name: 'gui' } as unknown as Gui;
    const host = new ModLoader(data, gui);

    expect(host.modSC2DataManager).toBe(data);
    expect(host.modUtils).toBe(modUtils);
    expect(host.modLoader as unknown).toBe(loader);
    expect(host.modLoaderGui).toBe(gui);
    expect(host.loadController as unknown).toBe(loadController);
    expect(host.dependence as unknown).toBe(dependence);
    expect(host.conflict as unknown).toBe(conflict);
  });

  test('owns source patch diagnostics', () => {
    const host = new ModLoader({} as SC2DataManager, {} as Gui);
    host.diagnostics.reset();

    expect(host.replace('alpha beta', [[/beta/, 'gamma']], 'test source')).toBe('alpha gamma');
    expect(host.diagnostics.patches).toEqual([expect.objectContaining({ kind: 'source', target: 'test source', index: 1, matches: 1, applied: 1, status: 'applied' })]);
  });

  test('replaces a named Twine asset through the host', () => {
    const host = new ModLoader({} as SC2DataManager, {} as Gui);
    host.diagnostics.reset();
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const script = { textContent: '/* twine-user-script #3: "maplebirch\\foo.js" */\nold\n' };
    const story = { getElementsByTagName: (type: string) => (type === 'script' ? [script] : []) };
    Object.defineProperty(globalThis, 'document', { value: { getElementsByTagName: () => [story] }, configurable: true });
    try {
      host.defineTwineAsset('script', 'maplebirch/foo.js', 'new', 'replace');
      expect(script.textContent).toContain('new');
      expect(script.textContent).not.toContain('old');
      expect(host.diagnostics.patches).toEqual([expect.objectContaining({ kind: 'script', target: 'maplebirch/foo.js', status: 'applied' })]);
    } finally {
      if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
      else Reflect.deleteProperty(globalThis, 'document');
      host.diagnostics.reset();
    }
  });

  test('moves enabled mods into the hidden list', async () => {
    let enabled = ['one', 'two'];
    let hidden = ['old'];
    const controller = {
      listModIndexDB: async () => enabled,
      loadHiddenModList: async () => hidden,
      overwriteModIndexDBModList: async (names: string[]) => {
        enabled = names;
      },
      overwriteModIndexDBHiddenModList: async (names: string[]) => {
        hidden = names;
      }
    };
    const host = new ModLoader({ getModLoadController: () => controller } as unknown as SC2DataManager, {} as Gui);

    expect(await host.disabled(['two', 'missing'], false)).toBe(true);
    expect(enabled).toEqual(['one']);
    expect(hidden).toEqual(['old', 'two']);
    expect(await host.disabled('two', false)).toBe(false);
  });
});
