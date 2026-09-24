import { strict as assert } from 'node:assert';
import { mock } from 'bun:test';
import { lodash } from '../services/runtime';

let receivedName: string | undefined;
let receivedCallbacks: object | undefined;
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
    wikify(name: string, callbacks: object): void {
      receivedName = name;
      receivedCallbacks = callbacks;
    }
  }
}));
mock.module('../../src/services/Translator', () => ({ default: Service }));
mock.module('../../src/services/CredentialVault', () => ({ default: Service }));
mock.module('../../src/services/CloudSave', () => ({ default: Service }));
mock.module('../../src/services/GUIControl', () => ({ default: Service }));

const { default: maplebirch } = await import('../../src/core');
const callbacks = { beforeWikify: (text: string) => text };

assert.deepEqual(
  logs.filter(({ message }) => message.startsWith('框架核心系统创建完成')),
  [{ message: `框架核心系统创建完成(v${maplebirch.meta.version})`, level: 'INFO' }]
);
maplebirch.wikify('myMod:render', callbacks);
assert.equal(receivedName, 'myMod:render');
assert.equal(receivedCallbacks, callbacks);
