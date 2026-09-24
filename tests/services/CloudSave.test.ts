import { lodash } from './runtime';
import { expect, test } from 'bun:test';
import type { CloudSaveRecord } from '../../src/services/CloudSave';
import SugarCube from '../../src/host/SugarCube';
import Diagnostics from '../../src/infra/Diagnostics';
const { default: CloudSave } = await import('../../src/services/CloudSave');

function fixture() {
  const writes: unknown[][] = [];
  const state = { index: 0, history: [{ title: 'Start', variables: { player: { name: 'Example' } } }] };
  const sugarcube = new SugarCube();
  sugarcube.runtime = {
    Story: { domId: 'degrees-of-lewdity' },
    Config: { saves: { id: 'degrees-of-lewdity', version: 1 } },
    State: { qc: 0, deltaDecode: () => structuredClone(state.history), deltaEncode: (history: unknown) => ({ encoded: history }) }
  } as never;
  Object.assign(window, {
    idb: {
      async getItem() {
        return { data: state };
      },
      async getSaveDetails() {
        return [{ slot: 1, data: { title: 'Example', date: 1, idx: 3 } }];
      },
      async setItem(...args: unknown[]) {
        writes.push(args);
        return true;
      }
    }
  });
  return { service: new CloudSave(sugarcube, key => key, lodash, new Diagnostics()), state, writes };
}

test('cloud imports reject invalid target slots and malformed histories before writing', async () => {
  const { service, state, writes } = fixture();
  const record: CloudSaveRecord = { slot: 1, save: state, details: null, exportedAt: Date.now() };
  await expect(service.importSlot(record, -1)).rejects.toThrow('cloud.save.error.slot.range');
  await expect(service.importSlot({ ...record, save: { history: 'invalid' } } as unknown as CloudSaveRecord)).rejects.toThrow('valid SugarCube history');
  await expect(service.importSlot({ ...record, save: { history: [] } })).rejects.toThrow('valid SugarCube history');
  expect(writes).toHaveLength(0);
});

test('cloud import expands delta state without mutating the remote record', async () => {
  const { service, state, writes } = fixture();
  const record: CloudSaveRecord = { slot: 1, save: { index: 0, delta: ['encoded'] }, details: { title: 'Cloud', custom: 5 }, exportedAt: 1 };
  expect(await service.importSlot(record, 2)).toBe(true);
  expect(writes[0][0]).toBe(2);
  expect(writes[0][1]).toEqual(state);
  expect(writes[0][2]).toMatchObject({ title: 'Cloud', custom: 5 });
  expect(record.save).toEqual({ index: 0, delta: ['encoded'] });
});

test('slot code export uses delta encoding and retains the original local history', async () => {
  const { service, state } = fixture();
  const compressed: string[] = [];
  Object.assign(window, {
    LZString: {
      compressToBase64(text: string) {
        compressed.push(text);
        return 'encoded';
      }
    }
  });
  expect(await service.exportSlotCode(1)).toBe('encodedencoded');
  const save = JSON.parse(compressed[0]);
  expect(save.idx).toBe(3);
  expect(save.state.history).toBeUndefined();
  expect(save.state.delta).toEqual({ encoded: state.history });
  expect(state.history[0].title).toBe('Start');
});
