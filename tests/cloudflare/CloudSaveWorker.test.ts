import { expect, test } from 'bun:test';

// Worker 由 tsconfig.worker.json 独立检查，避免其全局类型混入浏览器与 Bun 环境。
const workerSource = '../../cloudflare/worker';
const { default: worker } = (await import(workerSource)) as { default: { fetch(request: Request, env: unknown): Promise<Response> } };

test('Worker lists save descriptions from metadata across pages without reading save bodies', async () => {
  const requests: unknown[] = [];
  const env = {
    MAPLEBIRCH_TOKEN: 'test-token',
    SAVE_BUCKET: {
      async list(options: { cursor?: string }) {
        requests.push(options);
        return options.cursor
          ? { objects: [{ key: 'slots/1.json', uploaded: new Date(1000), customMetadata: {} }], truncated: false }
          : {
              objects: [
                { key: 'slots/3.json', uploaded: new Date(2000), customMetadata: { saveName: 'Example', saveTitle: 'Temple', saveDate: '1000' } },
                { key: 'slots/201.json', uploaded: new Date(2000), customMetadata: {} }
              ],
              truncated: true,
              cursor: 'next-page'
            };
      },
      async get() {
        throw new Error('Listing must not download a game state');
      }
    }
  };
  const response = await worker.fetch(new Request('https://test.invalid/saves', { headers: { Authorization: 'Bearer test-token' } }), env);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([
    { slot: 1, updatedAt: 1000, details: {} },
    { slot: 3, updatedAt: 2000, details: { title: 'Temple', date: 1000, metadata: { saveName: 'Example' } } }
  ]);
  expect(requests).toEqual([
    { prefix: 'slots/', include: ['customMetadata'], cursor: undefined },
    { prefix: 'slots/', include: ['customMetadata'], cursor: 'next-page' }
  ]);
});

test('Worker uploads retain the full record but index only bounded native display fields', async () => {
  const writes: unknown[][] = [];
  const details = { title: 'Temple', date: 1000, metadata: { saveName: '长'.repeat(500), saveId: 13029, other: 'not part of the listing' }, idx: 10 };
  const payload = { slot: 3, details, save: { history: [{ title: 'Temple', variables: { player: { name: 'Example' } } }] }, exportedAt: 1500 };
  const env = {
    MAPLEBIRCH_TOKEN: 'test-token',
    SAVE_BUCKET: {
      async put(...args: unknown[]) {
        writes.push(args);
      }
    }
  };
  const request = new Request('https://test.invalid/saves/3', {
    method: 'PUT',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot: 3, updatedAt: 2000, payload })
  });
  const response = await worker.fetch(request, env);
  expect(response.status).toBe(200);
  expect(writes[0][0]).toBe('slots/3.json');
  expect(JSON.parse(writes[0][1] as string).payload).toEqual(payload);
  expect(writes[0][2]).toEqual({ customMetadata: { saveTitle: 'Temple', saveName: '长'.repeat(256), saveId: '13029', saveDate: '1000' } });
  expect(await response.json()).toEqual({ slot: 3, updatedAt: 2000, details: { title: 'Temple', date: 1000, metadata: { saveName: '长'.repeat(256), saveId: '13029' } } });
});

test('missing or invalid metadata dates do not invent a saved time', async () => {
  const env = {
    MAPLEBIRCH_TOKEN: 'test-token',
    SAVE_BUCKET: {
      async list() {
        return {
          objects: [undefined, '', ' ', 'not-a-date'].map((saveDate, slot) => ({ key: `slots/${slot}.json`, uploaded: new Date(2000), customMetadata: { saveName: 'Example', saveDate } })),
          truncated: false
        };
      }
    }
  };
  const response = await worker.fetch(new Request('https://test.invalid/saves', { headers: { Authorization: 'Bearer test-token' } }), env);
  expect(await response.json()).toEqual([0, 1, 2, 3].map(slot => ({ slot, updatedAt: 2000, details: { metadata: { saveName: 'Example' } } })));
});
