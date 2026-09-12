import './helpers/runtime';
import { describe, expect, test } from 'bun:test';
import type { CryptContext, CryptOptions } from '../src/services/CredentialVault';
import type { MaplebirchCore } from '../src/core';

const { default: CredentialVault } = await import('../src/services/CredentialVault');

interface VaultFixture {
  vault: InstanceType<typeof CredentialVault>;
  indexedDbHook: () => unknown;
  registrations: unknown[][];
  loadedData: unknown[];
}

function createFixture(runningModName = 'RunningMod'): VaultFixture {
  let indexedDbHook: () => unknown = () => undefined;
  const registrations: unknown[][] = [];
  const loadedData: unknown[] = [];
  const core = {
    once: (eventName: string, callback: () => unknown): boolean => {
      if (eventName === ':indexedDB') indexedDbHook = callback;
      return true;
    },
    idb: {
      register: (...args: unknown[]): void => {
        registrations.push(args);
      }
    },
    modUtils: {
      getNowRunningModName: (): string => runningModName,
      lazyRegisterNewModZipData: async (data: unknown): Promise<boolean> => {
        loadedData.push(data);
        return true;
      }
    },
    t: (key: string): string => key,
    log: (): void => undefined,
    disabled: async (): Promise<void> => undefined
  } as unknown as MaplebirchCore;

  return { vault: new CredentialVault(core), indexedDbHook: () => indexedDbHook(), registrations, loadedData };
}

describe('CredentialVault public loading boundary', () => {
  test('registers its IndexedDB store when the database hook fires', () => {
    const fixture = createFixture();
    fixture.indexedDbHook();

    expect(fixture.registrations).toHaveLength(1);
    expect(fixture.registrations[0][0]).toBe('credentials');
    expect(fixture.registrations[0][1]).toEqual({ keyPath: ['bucket', 'id'] });
  });

  test('decrypts a supplied password and loads the returned mod data', async () => {
    const fixture = createFixture();
    const contexts: CryptContext[] = [];
    const options: CryptOptions = {
      password: 'secret',
      decrypt: async (password: string, context: CryptContext) => {
        expect(password).toBe('secret');
        contexts.push(context);
        return new Uint8Array([1, 2, 3]);
      }
    };

    expect(await fixture.vault.loadCrypt(options)).toBeTrue();
    expect(contexts).toEqual([{ modName: 'RunningMod' }]);
    expect(fixture.loadedData).toEqual([new Uint8Array([1, 2, 3])]);
  });

  test('prefers the explicit mod name and forwards lazy-loading options', async () => {
    const fixture = createFixture('ImplicitMod');
    const received: CryptContext[] = [];
    const options: CryptOptions = {
      modName: 'ExplicitMod',
      password: 'secret',
      lazyOptions: { preload: true },
      decrypt: async (_password: string, context: CryptContext) => {
        received.push(context);
        return { data: 'zip-data' };
      }
    };

    expect(await fixture.vault.loadCrypt(options)).toBeTrue();
    expect(received[0].modName).toBe('ExplicitMod');
    expect(fixture.loadedData).toEqual(['zip-data']);
  });

  test('rejects loading when no mod identity is available', async () => {
    const fixture = createFixture('');
    const options: CryptOptions = {
      password: 'secret',
      decrypt: async () => ({ data: 'unused' })
    };

    await expect(fixture.vault.loadCrypt(options)).rejects.toThrow('无法获取当前模组名');
  });
});
