import { strict as assert } from 'node:assert';
import { mock } from 'bun:test';
import { lodash } from '../services/runtime';

const logs: Array<{ message: string; level: string }> = [];
const diagnostics = { write: (message: string, level: string) => logs.push({ message, level }), export: () => '' };
class Service {}

mock.module('../../src/compat/Prototype', () => ({ default: () => {} }));
mock.module('../../src/host/ModLoader', () => ({
  default: class {
    static getLodash() {
      return lodash;
    }
    diagnostics = diagnostics;
  }
}));
mock.module('../../src/host/SugarCube', () => ({ default: Service }));
mock.module('../../src/infra/Emitter', () => ({ default: Service }));
mock.module('../../src/services/IndexedDB', () => ({ default: Service }));
mock.module('../../src/services/Modules', () => ({ default: Service }));
mock.module('../../src/services/AddonPlugin', () => ({
  default: class {
    readonly modList: string[] = [];
  }
}));
mock.module('../../src/services/Translator', () => ({ default: Service }));
mock.module('../../src/services/CredentialVault', () => ({ default: Service }));
mock.module('../../src/services/CloudSave', () => ({ default: Service }));
mock.module('../../src/services/GUIControl', () => ({ default: Service }));

const hostClamp = () => 7;
Object.defineProperty(window, 'clamp', { value: hostClamp, configurable: false });
const { default: maplebirch } = await import('../../src/core');
assert.equal(Object.getOwnPropertyDescriptor(window, 'clamp')?.value, hostClamp);
assert.equal(maplebirch.modList, maplebirch.services.addonPlugin.modList);
maplebirch.modList.push('cheatExtended');
assert.deepEqual(maplebirch.services.addonPlugin.modList, ['cheatExtended']);
const cloneDescriptor = Object.getOwnPropertyDescriptor(window, 'clone');
assert.equal(cloneDescriptor?.configurable, false);
assert.equal(cloneDescriptor?.writable, false);
assert.throws(() => Object.defineProperty(window, 'clone', { value: () => 'custom' }), TypeError);

assert.deepEqual(
  logs.filter(({ message }) => message.startsWith('框架核心系统创建完成')),
  [{ message: `框架核心系统创建完成(v${maplebirch.meta.version})`, level: 'INFO' }]
);
assert.equal('wikify' in maplebirch, false);
