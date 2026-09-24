import './runtime';
import { expect, mock, test } from 'bun:test';
import Emitter from '../../src/infra/Emitter';

mock.module('@/styles/MaplebrichStyles.css', () => ({ default: '' }));
const { default: AddonPlugin } = await import('../../src/services/AddonPlugin');

test('generic addon patch phase lets game adapters run before the SugarCube bridge', async () => {
  const calls: string[] = [];
  const events = new Emitter();
  events.on(':addon:patchStart', () => calls.push('game patches'));
  const addon = Object.assign(Object.create(AddonPlugin.prototype), {
    events,
    modloader: { defineTwineAsset: (_kind: string, name: string) => calls.push(name) }
  }) as InstanceType<typeof AddonPlugin>;

  await addon.PatchModToGame_start();

  expect(calls).toEqual(['game patches', 'maplebirch/sugarcube-bridge.js', 'maplebirch-styles.css']);
});

test('early initialization milestone is logged before the IndexedDB log level is restored', async () => {
  const calls: string[] = [];
  const addon = Object.assign(Object.create(AddonPlugin.prototype), {
    excludedMods: new Set<string>(),
    disabledMods: new Set<string>(),
    moduleFiles: [],
    scriptFiles: async () => {},
    executeScripts: async () => {},
    log: (message: string, level: string) => calls.push(`${level}:${message}`),
    events: { trigger: async () => {} },
    idb: {
      init: async () => {},
      loadLogLevel: async () => {
        calls.push('loadLogLevel');
        return false;
      }
    },
    services: { translator: () => ({ preload: async () => {} }) },
    modules: { run: async () => {} }
  }) as InstanceType<typeof AddonPlugin>;

  await addon.afterInjectEarlyLoad();

  expect(calls[0]).toBe('INFO:所有模块注册完成，开始预初始化');
  expect(calls[1]).toBe('loadLogLevel');
});
