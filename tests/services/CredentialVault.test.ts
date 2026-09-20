import './runtime';
import { expect, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';
const { default: CredentialVault } = await import('../../src/services/CredentialVault');

test('cache read and write failures cannot turn a loaded encrypted mod into a failed load', async () => {
  let loads = 0;
  const warnings: string[] = [];
  const core = {
    once() {},
    log(message: string, level: string) {
      if (level === 'WARN') warnings.push(message);
    },
    t: (key: string) => key,
    modUtils: {
      async lazyRegisterNewModZipData() {
        loads++;
        return true;
      }
    },
    idb: {
      async withTransaction() {
        throw new Error('storage unavailable');
      }
    },
    async disabled() {
      throw new Error('A successfully loaded mod must stay enabled');
    }
  } as unknown as MaplebirchCore;
  const result = await new CredentialVault(core).loadCrypt({
    modName: 'example',
    cache: { subject: 'example', key: 'license' },
    password: 'provided password',
    async decrypt() {
      return new Uint8Array([1, 2, 3]);
    }
  });
  expect(result).toBe(true);
  expect(loads).toBe(1);
  expect(warnings).toHaveLength(2);
  expect(warnings[0]).toContain('读取失败');
  expect(warnings[1]).toContain('写入失败');
});
