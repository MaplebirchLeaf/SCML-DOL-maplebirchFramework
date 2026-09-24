import { strict as assert } from 'node:assert';
import { mock } from 'bun:test';

const calls: string[] = [];
const dol = { variables: {} as Record<string, unknown> };

mock.module('../../src/core', () => ({ default: {} }));
mock.module('../../src/host/DoL', () => ({ default: dol }));
mock.module('../../src/constants', () => ({ version: 'test' }));
mock.module('../../src/modules/Frameworks/migration', () => ({ default: class {} }));
mock.module('../../src/utils', () => ({ clone: structuredClone }));

const { default: Variables } = await import('../../src/modules/Variables');
const variables = Object.create(Variables.prototype) as InstanceType<typeof Variables>;
const fragment = {};
Object.assign(variables, {
  core: {
    host: {
      sugarcube: {
        passage: { title: 'Home' },
        require: () => ({
          Wikifier: class {
            constructor(_target: unknown, text: string) {
              calls.push(`render:${text}`);
            }
          }
        })
      }
    },
    trigger: (name: string) => void calls.push(`event:${name}`)
  },
  tool: {
    core: { host: { sugarcube: { passage: { title: 'Home' } } } },
    patch: { apply: (phase: string) => calls.push(`patch:${phase}`) },
    zone: {
      play: (zone: string) => {
        calls.push(`zone:${zone}`);
        return '<<customState>>';
      }
    }
  },
  migration: { run: () => calls.push('migration') },
  version: 'test',
  check: () => calls.push('check'),
  log: () => {}
});
Object.defineProperty(globalThis, 'document', { value: { createDocumentFragment: () => fragment }, configurable: true });
Object.defineProperty(globalThis, '$', { value: { wiki: () => calls.push('legacyWiki') }, configurable: true });

variables.Init();
assert.deepEqual(calls, ['migration', 'patch:state', 'event::variable', 'zone:State', 'render:<<customState>>']);

calls.length = 0;
variables.loadInit();
assert.deepEqual(calls, ['check', 'migration', 'patch:state', 'event::variable', 'zone:State', 'render:<<customState>>']);
