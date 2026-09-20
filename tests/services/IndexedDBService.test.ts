import './runtime';
import { expect, mock, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';

let transaction: { done: Promise<void>; abort(): void };
mock.module('idb', () => ({
  async openDB() {
    return { objectStoreNames: { contains: () => true }, transaction: () => transaction, close() {} };
  },
  async deleteDB() {}
}));
const { default: IndexedDBService } = await import('../../src/services/IndexedDBService');
const core = { logger: { log() {} } } as unknown as MaplebirchCore;

test('transaction callback failures retain the original error and consume abort rejection', async () => {
  let abort!: (reason?: unknown) => void;
  transaction = {
    done: new Promise<void>((_resolve, reject) => {
      abort = reject;
    }),
    abort() {
      abort(new Error('transaction aborted'));
    }
  };
  const error = new Error('callback failed');
  const service = new IndexedDBService(core);
  await expect(
    service.withTransaction('settings', 'readwrite', () => {
      throw error;
    })
  ).rejects.toBe(error);
  await Bun.sleep(0);
});

test('a successful callback resolves only after its transaction commits', async () => {
  let commit!: () => void;
  transaction = {
    done: new Promise<void>(resolve => {
      commit = resolve;
    }),
    abort() {}
  };
  const service = new IndexedDBService(core);
  let settled = false;
  const operation = service
    .withTransaction('settings', 'readwrite', () => 7)
    .then(value => {
      settled = true;
      return value;
    });
  await Bun.sleep(0);
  expect(settled).toBe(false);
  commit();
  expect(await operation).toBe(7);
});
