import { mock } from 'bun:test';

// Keep browser bootstrap out of service tests; each test supplies its own host.
const noop = () => undefined;
const bootstrapCore = {
  register: () => true,
  once: () => true,
  on: () => true,
  log: noop,
  logger: { log: noop },
  addon: { hook: () => true },
  howler: { Howler: { mute: noop, volume: noop } }
};

type TestWindow = {
  modUtils?: Record<string, unknown>;
};

const testGlobal = globalThis as unknown as { window?: TestWindow };
const testWindow = testGlobal.window ?? {};
testWindow.modUtils = {
  ...testWindow.modUtils,
  getMod: () => ({ version: '4.3.0' })
};
testGlobal.window = testWindow;
Object.defineProperty(globalThis, 'navigator', { value: { language: 'en-US' }, configurable: true });

mock.module('../../src/core.ts', () => ({ default: bootstrapCore, MaplebirchCore: class {}, createlog: () => noop }));
mock.module('../../src/utils/shared.ts', () => ({ default: {} }));
mock.module('@/assets/translations/CN.yaml', () => ({ default: '' }));
mock.module('@/assets/translations/EN.yaml', () => ({ default: '' }));
mock.module('@/styles/PromptStyle.css', () => ({ default: '' }));
mock.module('@/twee/Gui.twee', () => ({ default: '' }));
