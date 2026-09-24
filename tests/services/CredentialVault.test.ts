import './runtime';
import { expect, test } from 'bun:test';
import type ModLoader from '../../src/host/ModLoader';
import Diagnostics from '../../src/infra/Diagnostics';
import type Emitter from '../../src/infra/Emitter';
import type IndexedDB from '../../src/services/IndexedDB';
const { default: CredentialVault } = await import('../../src/services/CredentialVault');

test('cache read and write failures cannot turn a loaded encrypted mod into a failed load', async () => {
  let loads = 0;
  const warnings: string[] = [];
  const modloader = {
    async disabled() {
      throw new Error('A successfully loaded mod must stay enabled');
    },
    modUtils: {
      getLogger: () => ({ warn: (message: string) => warnings.push(message) }),
      async lazyRegisterNewModZipData() {
        loads++;
        return true;
      }
    }
  } as unknown as ModLoader;
  const idb = {
    async with() {
      throw new Error('storage unavailable');
    }
  } as unknown as IndexedDB;
  const events = { once() {} } as unknown as Emitter;
  const result = await new CredentialVault(idb, modloader, events, new Diagnostics(modloader), key => key).loadCrypt({
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
