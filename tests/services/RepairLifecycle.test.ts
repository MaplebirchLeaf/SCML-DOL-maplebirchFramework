import './runtime';
import { expect, mock, spyOn, test } from 'bun:test';
import Emitter from '../../src/infra/Emitter';
import Cipher from '../../src/infra/Cipher';
import type { PatchResult } from '../../src/infra/Diagnostics';
import type IndexedDB from '../../src/services/IndexedDB';
import type ModLoader from '../../src/host/ModLoader';
import Repair, { type RepairMemory } from '../../src/services/Repair';
import { RepairRecipeParser, type RepairContext, type RepairRecipe } from '../../src/services/Repair/Recipe';
import { NativeJSON } from '../../src/services/Repair/Json';
import Diagnostics from '../../src/infra/Diagnostics';
import { RepairTargets, type RepairZone } from '../../src/services/Repair/Targets';
import { applySourcePatch } from '../../src/host/ModLoader';
import { ZonesManager } from '../../src/modules/Frameworks/ZonesManager';

interface StoredConnection {
  id: 'connection';
  connection: Repair['connection'];
  secret?: { key: CryptoKey; iv: string; data: string };
}

mock.module('@/styles/MaplebrichStyles.css?raw', () => ({ default: '' }));
const { default: AddonPlugin } = await import('../../src/services/AddonPlugin');

test('repair replay completes before preparation, queued config and patch consumers', async () => {
  const calls: string[] = [];
  const events = new Emitter();
  let anchor = 'old';
  events.on(':addon:repair', async () => {
    calls.push('repair');
    await Promise.resolve();
    anchor = 'repaired';
  });
  events.on(':addon:preparePatch', () => calls.push(`prepare:${anchor}`));
  events.on(':import', () => calls.push(`import:${anchor}`));
  events.on(':addon:beforePatch', () => calls.push(`patch:${anchor}`));
  const addon = Object.assign(Object.create(AddonPlugin.prototype), {
    events,
    process: async () => calls.push(`config:${anchor}`)
  }) as InstanceType<typeof AddonPlugin>;

  await addon.beforePatchModToGame();

  expect(calls).toEqual(['repair', 'prepare:repaired', 'config:repaired', 'import:repaired', 'patch:repaired']);
});

test('failed repair listener cannot prevent normal patch preparation', async () => {
  const calls: string[] = [];
  const events = new Emitter();
  events.on(':addon:repair', async () => {
    throw new Error('Repair storage unavailable');
  });
  events.on(':addon:preparePatch', () => calls.push('prepare'));
  events.on(':addon:beforePatch', () => calls.push('patch'));
  const addon = Object.assign(Object.create(AddonPlugin.prototype), {
    events,
    process: async () => calls.push('config')
  }) as InstanceType<typeof AddonPlugin>;

  await expect(addon.beforePatchModToGame()).resolves.toBeUndefined();

  expect(calls).toEqual(['prepare', 'config', 'patch']);
});

test('repair verification reads merged output before framework passage wrappers', async () => {
  const events = new Emitter();
  const calls: string[] = [];
  let content = 'repaired passage';
  events.on(':addon:verify', async () => {
    await Promise.resolve();
    calls.push(content);
  });
  events.on(':addon:afterPatch', () => {
    content = `<div>${content}</div>`;
    calls.push(content);
  });
  const addon = Object.assign(Object.create(AddonPlugin.prototype), { events }) as InstanceType<typeof AddonPlugin>;

  await addon.afterPatchModToGame();

  expect(calls).toEqual(['repaired passage', '<div>repaired passage</div>']);
});

function repairFixture(rows = new Map<string, unknown>(), zone?: RepairZone) {
  const events = new Emitter();
  const storeNames: string[] = [];
  const failedWrites = new Set<string>();
  const idb = {
    define: (name: string) => {
      storeNames.push(name);
      return true;
    },
    has: () => false,
    with: async (_store: string, _mode: IDBTransactionMode, callback: (tx: { objectStore: () => unknown }) => unknown) =>
      callback({
        objectStore: () => ({
          get: async (id: string) => structuredClone(rows.get(id)),
          getAll: async () => structuredClone([...rows.values()]),
          put: async (row: { id: string }) => {
            if (failedWrites.has(row.id)) throw new Error('Repair status write failed');
            rows.set(row.id, structuredClone(row));
          },
          delete: async (id: string) => {
            rows.delete(id);
          }
        })
      })
  } as unknown as IndexedDB;
  const record = (items: Array<{ id: number; name: string; content: string }>) => ({
    items,
    map: new Map(items.map(item => [item.name, item])),
    fillMap() {
      this.map = new Map(this.items.map(item => [item.name, item]));
    }
  });
  const emptyCache = () => ({ passageDataItems: record([]), scriptFileItems: record([]), styleFileItems: record([]) });
  const source = { id: 0, name: 'style.css', content: 'a { color: reed; }' };
  const mod = { name: 'example', version: '1', cache: { ...emptyCache(), styleFileItems: record([source]) }, replacePatcher: [] };
  const framework = { name: 'maplebirch', version: '1', cache: emptyCache(), replacePatcher: [] };
  const final = {
    ...emptyCache(),
    styleFileItems: record([{ ...source }])
  };
  const writes: string[] = [];
  const diagnostics = {
    LevelName: 'DEBUG',
    history: [] as Array<{ at: string; level: 'WARN' | 'ERROR'; message: string }>,
    patches: [] as PatchResult[],
    write: (message: string) => writes.push(message)
  };
  const host = {
    diagnostics,
    modLoaderGui: { gLoadingProgress: { logList: [] } },
    modUtils: {
      getLogger: () => ({ warn: (message: string) => writes.push(message.replace(/^\[repair\] /, '')) }),
      version: '1',
      getModListNameNoAlias: () => [mod.name, framework.name],
      getMod: (name: string) => (name === mod.name ? mod : name === framework.name ? framework : undefined),
      getModZip: () => {
        throw new Error('Installed packages must remain untouched');
      }
    },
    modSC2DataManager: { getSC2DataInfoAfterPatch: () => final, getSC2DataInfoCache: emptyCache }
  } as unknown as ModLoader;
  const repair = new Repair(idb, host, events, () => zone);
  return { repair, events, rows, source, final, storeNames, writes, mod, idb, host, diagnostics, failedWrites };
}

async function seedRepair(rows: Map<string, unknown>): Promise<RepairMemory> {
  const context: RepairContext = {
    requestId: 'repair-1',
    mods: ['example'],
    diagnostics: [],
    modLoaderLogs: [],
    patches: [],
    conflicts: [],
    targets: [{ id: 'css-1', modName: 'example', kind: 'css', path: 'style.css', content: 'a { color: reed; }', fingerprint: await RepairRecipeParser.fingerprint('a { color: reed; }') }]
  };
  const recipe: RepairRecipe = {
    requestId: context.requestId,
    outcome: 'repair',
    summary: 'Correct the colour',
    evidence: [],
    operations: [{ targetId: 'css-1', find: 'reed', replace: 'red', expectedMatches: 1, reason: 'Existing declaration has a typo' }]
  };
  const memory: RepairMemory = { id: 'memory:1', summary: recipe.summary, state: 'pending', enabled: true, createdAt: '2026-10-05T00:00:00.000Z', recipe, context };
  rows.set(memory.id, structuredClone(memory));
  return memory;
}

test('pending repair verifies as a trial, user confirms memory and reload replays without an API', async () => {
  const fixture = repairFixture();
  const memory = await seedRepair(fixture.rows);
  let requests = 0;
  const fetch = globalThis.fetch;
  globalThis.fetch = Object.assign(
    async () => {
      requests++;
      throw new Error('A repair replay must not request AI');
    },
    { preconnect: fetch.preconnect }
  );
  try {
    await fixture.events.trigger(':indexedDB');
    await fixture.events.trigger(':idbReady');
    await expect(fixture.repair.confirm(memory.id)).rejects.toThrow();
    await fixture.events.trigger(':addon:repair');
    expect(fixture.source.content).toBe('a { color: red; }');
    // 原生加载器序列化每个样式表时会追加换行。
    fixture.final.styleFileItems.map.get('style.css')!.content = fixture.source.content + '\n';
    await fixture.events.trigger(':addon:verify');
    expect((await fixture.repair.list())[0].state).toBe('pending');
    await expect(fixture.repair.confirm(memory.id)).rejects.toThrow();
    await fixture.events.trigger(':modLoaderEnd');
    expect((await fixture.repair.list())[0].state).toBe('trial');
    await fixture.repair.confirm(memory.id);
    expect((await fixture.repair.list())[0].state).toBe('active');
    expect((await fixture.repair.list())[0].verifiedAt).toBeString();

    const reload = repairFixture(fixture.rows);
    // 即使模组元数据变化，仍由内容和匹配校验判断修复是否适用。
    reload.mod.version = '2';
    await reload.events.trigger(':indexedDB');
    await reload.events.trigger(':idbReady');
    await reload.events.trigger(':addon:repair');
    expect(reload.source.content).toBe('a { color: red; }');
    reload.final.styleFileItems.map.get('style.css')!.content = reload.source.content + '\n';
    await reload.events.trigger(':addon:verify');
    await reload.events.trigger(':modLoaderEnd');
    expect((await reload.repair.list())[0].state).toBe('active');
    expect(requests).toBe(0);
    expect(fixture.storeNames).toEqual(['repair']);
  } finally {
    globalThis.fetch = fetch;
  }
});

test('disabled or stale repair memory never changes the source, and deletion only removes its own record', async () => {
  const fixture = repairFixture();
  const memory = await seedRepair(fixture.rows);
  fixture.rows.set('connection', { id: 'connection', connection: { apiType: 'openai', apiUrl: 'https://example.test/v1', apiKey: 'private-key', model: 'model' } });
  await fixture.repair.setEnabled(memory.id, false);
  await fixture.events.trigger(':addon:repair');
  expect(fixture.source.content).toBe('a { color: reed; }');

  await fixture.repair.setEnabled(memory.id, true);
  const reload = repairFixture(fixture.rows);
  reload.source.content = 'a { color: blue; }';
  await reload.events.trigger(':addon:repair');
  expect(reload.source.content).toBe('a { color: blue; }');
  expect((await reload.repair.list())[0].state).toBe('stale');
  expect((await reload.repair.list())[0].enabled).toBe(false);

  await reload.repair.remove(memory.id);
  expect(await reload.repair.list()).toEqual([]);
  expect(fixture.rows.has('connection')).toBe(true);
});

test('API configuration encrypts the key in its single repair record and decrypts it after reload', async () => {
  const fixture = repairFixture();
  Object.assign(fixture.repair.connection, { apiType: 'openai', apiUrl: 'https://example.test/v1', apiKey: '  private-key  ', model: 'model' });
  await fixture.events.trigger(':indexedDB');
  await fixture.repair.saveConnection();
  expect(fixture.repair.connection.apiKey).toBe('private-key');
  const saved = fixture.rows.get('connection') as StoredConnection;
  expect(saved.connection).toEqual({ ...fixture.repair.connection, apiKey: '' });
  expect(saved.secret).toBeDefined();
  const algorithm = saved.secret!.key.algorithm as AesKeyAlgorithm;
  expect(algorithm.name).toBe('AES-GCM');
  expect(algorithm.length).toBe(256);
  expect(saved.secret!.key.extractable).toBe(false);
  expect(saved.secret!.key.usages).toEqual(['encrypt', 'decrypt']);
  await expect(crypto.subtle.exportKey('raw', saved.secret!.key)).rejects.toThrow();
  expect(saved.secret!.data).not.toContain('private-key');
  expect(fixture.storeNames).toEqual(['repair']);
  const reload = repairFixture(fixture.rows);
  await reload.events.trigger(':idbReady');
  expect(reload.repair.connection).toEqual(fixture.repair.connection);
  expect(reload.rows.get('connection')).toBe(saved);
  expect([...fixture.rows.keys()]).toEqual(['connection']);
  reload.repair.connection.apiKey = '';
  await reload.repair.saveConnection();
  expect((reload.rows.get('connection') as StoredConnection).secret).toBeUndefined();
  expect((reload.rows.get('connection') as StoredConnection).connection.apiKey).toBe('');
  expect(reload.writes.join(' ')).not.toContain('private-key');
});

test('saving an API key twice uses distinct random IVs', async () => {
  const state = repairFixture();
  Object.assign(state.repair.connection, { apiUrl: 'https://example.test/v1', apiKey: 'private-key', model: 'model' });
  await state.repair.saveConnection();
  const first = state.rows.get('connection') as StoredConnection;
  await state.repair.saveConnection();
  const second = state.rows.get('connection') as StoredConnection;
  expect(first.secret).toBeDefined();
  expect(second.secret).toBeDefined();
  expect(Buffer.from(first.secret!.iv, 'base64')).toHaveLength(12);
  expect(Buffer.from(second.secret!.iv, 'base64')).toHaveLength(12);
  expect(second.secret!.iv).not.toBe(first.secret!.iv);
  expect(second.secret!.data).not.toBe(first.secret!.data);
  expect(second.connection.apiKey).toBe('');
});

test('legacy plaintext repair keys migrate to encrypted records during loading', async () => {
  const state = repairFixture();
  const connection = { apiType: 'openai' as const, apiUrl: 'https://example.test/v1', apiKey: 'private-key', model: 'model' };
  state.rows.set('connection', { id: 'connection', connection });
  await state.events.trigger(':idbReady');
  expect(state.repair.connection).toEqual(connection);
  expect(state.repair.connectionSaved).toBe(true);
  const saved = state.rows.get('connection') as StoredConnection;
  expect(saved.connection).toEqual({ ...connection, apiKey: '' });
  expect(saved.secret).toBeDefined();
  expect([...state.rows.keys()]).toEqual(['connection']);
  const reload = repairFixture(state.rows);
  await reload.events.trigger(':idbReady');
  expect(reload.repair.connection.apiKey).toBe('private-key');
});

test('new connections retain plaintext compatibility when WebCrypto is unavailable', async () => {
  const available = Object.getOwnPropertyDescriptor(Cipher, 'available')!;
  Object.defineProperty(Cipher, 'available', { ...available, get: () => false });
  try {
    const state = repairFixture();
    Object.assign(state.repair.connection, { apiUrl: 'https://example.test/v1', apiKey: 'private-key', model: 'model' });
    await state.repair.saveConnection();
    const saved = state.rows.get('connection') as StoredConnection;
    expect(saved.connection).toEqual(state.repair.connection);
    expect(saved.secret).toBeUndefined();
    const reload = repairFixture(state.rows);
    await reload.events.trigger(':idbReady');
    expect(reload.repair.connection).toEqual(state.repair.connection);
    expect(reload.repair.storageError).toBeUndefined();
  } finally {
    Object.defineProperty(Cipher, 'available', available);
  }
});

test('encrypted connection loading without WebCrypto preserves the record and normal repair replay', async () => {
  const state = repairFixture();
  Object.assign(state.repair.connection, { apiUrl: 'https://example.test/v1', apiKey: 'private-key', model: 'model' });
  await state.repair.saveConnection();
  const saved = state.rows.get('connection');
  await seedRepair(state.rows);
  const available = Object.getOwnPropertyDescriptor(Cipher, 'available')!;
  Object.defineProperty(Cipher, 'available', { ...available, get: () => false });
  const fetch = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('An unreadable encrypted key must not be sent'));
  try {
    const reload = repairFixture(state.rows);
    await expect(reload.events.trigger(':idbReady')).resolves.toBeUndefined();
    expect(reload.rows.get('connection')).toBe(saved);
    expect(reload.repair.storageError).toBeString();
    expect(reload.repair.connectionSaved).toBe(false);
    expect(reload.repair.connection.apiKey).toBe('');
    Object.assign(reload.repair.connection, { apiUrl: 'https://example.test/v1', model: 'model' });
    await expect(reload.repair.test(new AbortController().signal)).rejects.toThrow('Encrypted repair key unavailable');
    await expect(reload.repair.fetchModels(new AbortController().signal)).rejects.toThrow('Encrypted repair key unavailable');
    expect(reload.rows.get('connection')).toBe(saved);
    expect(fetch).not.toHaveBeenCalled();
    await expect(reload.events.trigger(':addon:repair')).resolves.toBeUndefined();
    expect(reload.source.content).toBe('a { color: red; }');
    expect(reload.writes.join(' ')).not.toContain('private-key');
  } finally {
    fetch.mockRestore();
    Object.defineProperty(Cipher, 'available', available);
  }
});

test('an encrypted session cannot downgrade its key when WebCrypto becomes unavailable', async () => {
  const state = repairFixture();
  Object.assign(state.repair.connection, { apiUrl: 'https://example.test/v1', apiKey: 'private-key', model: 'model' });
  await state.repair.saveConnection();
  const saved = state.rows.get('connection');
  const available = Object.getOwnPropertyDescriptor(Cipher, 'available')!;
  Object.defineProperty(Cipher, 'available', { ...available, get: () => false });
  try {
    await expect(state.repair.saveConnection()).rejects.toThrow('Encrypted repair key unavailable');
    expect(state.rows.get('connection')).toBe(saved);
    expect((state.rows.get('connection') as StoredConnection).connection.apiKey).toBe('');
    expect((state.rows.get('connection') as StoredConnection).secret).toBeDefined();
  } finally {
    Object.defineProperty(Cipher, 'available', available);
  }
});

test('damaged ciphertext is isolated without overwriting the connection or blocking replay', async () => {
  const state = repairFixture();
  Object.assign(state.repair.connection, { apiUrl: 'https://example.test/v1', apiKey: 'private-key', model: 'model' });
  await state.repair.saveConnection();
  const damaged = structuredClone(state.rows.get('connection')) as StoredConnection;
  const data = damaged.secret!.data;
  damaged.secret!.data = (data[0] === 'A' ? 'B' : 'A') + data.slice(1);
  state.rows.set('connection', damaged);
  await seedRepair(state.rows);
  const reload = repairFixture(state.rows);
  const fetch = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('A damaged encrypted key must not be sent'));
  try {
    await expect(reload.events.trigger(':idbReady')).resolves.toBeUndefined();
    expect(reload.rows.get('connection')).toBe(damaged);
    expect(reload.repair.storageError).toBeString();
    expect(reload.repair.connectionSaved).toBe(false);
    expect(reload.repair.connection.apiKey).toBe('');
    Object.assign(reload.repair.connection, { apiUrl: 'https://example.test/v1', model: 'model' });
    await expect(reload.repair.test(new AbortController().signal)).rejects.toThrow('Encrypted repair key unavailable');
    await expect(reload.repair.fetchModels(new AbortController().signal)).rejects.toThrow('Encrypted repair key unavailable');
    expect(reload.rows.get('connection')).toBe(damaged);
    expect(fetch).not.toHaveBeenCalled();
    reload.repair.connection.apiKey = 'new-key';
    await reload.repair.saveConnection();
    const recovered = reload.rows.get('connection') as StoredConnection;
    expect(recovered).not.toBe(damaged);
    expect(recovered.connection.apiKey).toBe('');
    expect(recovered.secret).toBeDefined();
    expect(reload.repair.storageError).toBeUndefined();
    const fresh = repairFixture(reload.rows);
    await fresh.events.trigger(':idbReady');
    expect(fresh.repair.connection.apiKey).toBe('new-key');
    await expect(reload.events.trigger(':addon:repair')).resolves.toBeUndefined();
    expect(reload.source.content).toBe('a { color: red; }');
    expect(reload.writes.join(' ')).not.toContain('private-key');
  } finally {
    fetch.mockRestore();
  }
});

test('encryption failure cannot fall back to plaintext or send API requests', async () => {
  const state = repairFixture();
  Object.assign(state.repair.connection, { apiUrl: 'https://example.test/v1', apiKey: 'old-key', model: 'model' });
  await state.repair.saveConnection();
  const saved = state.rows.get('connection');
  state.repair.connection.apiKey = 'new-key';
  const encrypt = spyOn(Cipher, 'encrypt').mockRejectedValue(new Error('Encryption failed'));
  const fetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = Object.assign(
    async () => {
      requests++;
      throw new Error('An unencrypted key must not be sent');
    },
    { preconnect: fetch.preconnect }
  );
  try {
    await expect(state.repair.saveConnection()).rejects.toThrow('Encryption failed');
    await expect(state.repair.fetchModels(new AbortController().signal)).rejects.toThrow('Encryption failed');
    await expect(state.repair.test(new AbortController().signal)).rejects.toThrow('Encryption failed');
    await expect(state.repair.analyze(new AbortController().signal)).rejects.toThrow('Encryption failed');
    expect(requests).toBe(0);
    expect(state.rows.get('connection')).toBe(saved);
    expect(state.repair.storageError).toBe('Encryption failed');
    expect(state.repair.connectionSaved).toBe(false);
    expect(state.writes.join(' ')).not.toContain('new-key');
  } finally {
    encrypt.mockRestore();
    globalThis.fetch = fetch;
  }
});

test('fetching models persists the connection before requesting and saves the selected model', async () => {
  const state = repairFixture();
  Object.assign(state.repair.connection, { apiType: 'openai', apiUrl: 'https://example.test/v1', apiKey: 'private-key', model: '' });
  const fetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = Object.assign(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      requests++;
      const saved = state.rows.get('connection') as StoredConnection;
      expect(saved.connection).toEqual({ ...state.repair.connection, apiKey: '' });
      expect(saved.connection.model).toBe('');
      expect(saved.secret).toBeDefined();
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer private-key');
      return new Response(NativeJSON.stringify({ data: [{ id: 'second-model' }, { id: 'first-model' }] }), { headers: { 'Content-Type': 'application/json' } });
    },
    { preconnect: fetch.preconnect }
  );
  try {
    expect((await state.repair.fetchModels(new AbortController().signal)).result).toBe('success');
    expect(requests).toBe(1);
    expect(state.repair.connection.model).toBe('first-model');
    expect(state.repair.connectionSaved).toBe(true);
    const reload = repairFixture(state.rows);
    await reload.events.trigger(':idbReady');
    expect(reload.repair.connection).toEqual(state.repair.connection);
    expect(reload.repair.connectionSaved).toBe(true);
    state.repair.connection.model = 'manual-model';
    expect(state.repair.connectionSaved).toBe(false);
    expect(await state.repair.list()).toEqual([]);
    expect(state.writes.join(' ')).not.toContain('private-key');
  } finally {
    globalThis.fetch = fetch;
  }
});

test('insufficient-context analysis saves API settings without creating repair memory', async () => {
  const state = repairFixture();
  Object.assign(state.repair.connection, { apiType: 'openai', apiUrl: 'https://example.test/v1', apiKey: 'private-key', model: 'model' });
  const fetch = globalThis.fetch;
  globalThis.fetch = Object.assign(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(state.rows.has('connection')).toBe(true);
      const request = NativeJSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
      const context = NativeJSON.parse(request.messages.find(message => message.role === 'user')!.content) as RepairContext;
      const recipe: RepairRecipe = {
        requestId: context.requestId,
        outcome: 'insufficient-context',
        summary: 'No matching source was provided',
        evidence: ['The logs do not identify an executable repair'],
        operations: []
      };
      return new Response(NativeJSON.stringify({ choices: [{ message: { content: NativeJSON.stringify(recipe) } }] }), { headers: { 'Content-Type': 'application/json' } });
    },
    { preconnect: fetch.preconnect }
  );
  try {
    const result = await state.repair.analyze(new AbortController().signal);
    expect(result.result).toBe('success');
    expect(result.recipe?.outcome).toBe('insufficient-context');
    expect(result.overlays).toEqual([]);
    expect(await state.repair.list()).toEqual([]);
    await expect(state.repair.stage()).rejects.toThrow('No executable repair proposal');
    expect([...state.rows.keys()]).toEqual(['connection']);
    expect(state.repair.connectionSaved).toBe(true);
    expect(state.source.content).toBe('a { color: reed; }');
  } finally {
    globalThis.fetch = fetch;
  }
});

test('mixed analysis saves and replays only validated repairs while retaining the rejected reason', async () => {
  const state = repairFixture();
  const rejectedSource = { id: 1, name: 'broken.css', content: 'b { color: blu; }' };
  state.mod.cache.styleFileItems.items.push(rejectedSource);
  state.mod.cache.styleFileItems.fillMap();
  state.final.styleFileItems.items.push({ ...rejectedSource });
  state.final.styleFileItems.fillMap();
  state.diagnostics.history.push({ at: 'fixture-time', level: 'WARN', message: 'example style.css and broken.css have invalid colours' });
  Object.assign(state.repair.connection, { apiUrl: 'https://example.test/v1', model: 'model' });
  let rejectedId = '';
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const request = NativeJSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
        const context = NativeJSON.parse(request.messages.find(message => message.role === 'user')!.content) as RepairContext;
        expect(context.targets).toHaveLength(2);
        const valid = context.targets.find(target => target.path === 'style.css')!;
        const invalid = context.targets.find(target => target.path === 'broken.css')!;
        rejectedId = invalid.id;
        const recipe: RepairRecipe = {
          requestId: context.requestId,
          outcome: 'repair',
          summary: 'Correct the colours',
          evidence: [],
          operations: [
            { targetId: invalid.id, find: 'missing', replace: 'blue', expectedMatches: 1, reason: 'Correct the other colour' },
            { targetId: valid.id, find: 'reed', replace: 'red', expectedMatches: 1, reason: 'Correct the colour' }
          ]
        };
        return Response.json({ choices: [{ message: { content: NativeJSON.stringify(recipe) } }] });
      },
      { preconnect: globalThis.fetch.preconnect }
    )
  );
  try {
    const result = await state.repair.analyze(new AbortController().signal);
    expect(result.result).toBe('success');
    expect(result.reason).toContain(rejectedId);
    expect(result.reason).toContain('found 0, expected 1');
    expect(result.recipe?.operations).toHaveLength(1);
    expect(result.overlays).toHaveLength(1);
    expect(result.overlays?.[0]).toMatchObject({ target: { path: 'style.css' }, before: state.source.content, after: 'a { color: red; }' });
    expect(state.source.content).toBe('a { color: reed; }');
    expect(rejectedSource.content).toBe('b { color: blu; }');

    await state.repair.stage();
    const [memory] = await state.repair.list();
    expect(memory.recipe).toEqual(result.recipe!);
    expect(memory.recipe.operations).toHaveLength(1);
    expect(memory.context.targets).toHaveLength(1);
    expect(memory.context.targets[0].path).toBe('style.css');
    expect(memory.context.targets.some(target => target.id === rejectedId)).toBe(false);
    expect(RepairRecipeParser.parse(NativeJSON.stringify(memory.recipe), memory.context)).toEqual(memory.recipe);
    expect(state.source.content).toBe('a { color: reed; }');
    expect(rejectedSource.content).toBe('b { color: blu; }');

    fetch.mockRejectedValue(new Error('Replay must not request AI'));
    const reload = repairFixture(state.rows);
    await reload.events.trigger(':addon:repair');
    expect(reload.source.content).toBe('a { color: red; }');
    reload.final.styleFileItems.map.get('style.css')!.content = reload.source.content + '\n';
    await reload.events.trigger(':modLoaderEnd');
    expect((await reload.repair.list())[0].state).toBe('trial');
    expect(fetch).toHaveBeenCalledTimes(1);

    const corrupted = structuredClone(memory);
    corrupted.recipe.operations.push({ targetId: rejectedId, find: 'missing', replace: 'blue', expectedMatches: 1, reason: 'Unvalidated operation' });
    const strict = repairFixture(new Map([[corrupted.id, corrupted]]));
    await strict.events.trigger(':addon:repair');
    expect(strict.source.content).toBe('a { color: reed; }');
    expect((await strict.repair.list())[0]).toMatchObject({ state: 'stale', enabled: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  } finally {
    fetch.mockRestore();
  }
});

test('failed settings storage aborts API requests while normal repair loading continues', async () => {
  const state = repairFixture();
  await seedRepair(state.rows);
  state.failedWrites.add('connection');
  Object.assign(state.repair.connection, { apiType: 'openai', apiUrl: 'https://example.test/v1', apiKey: 'private-key', model: 'model' });
  const fetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = Object.assign(
    async () => {
      requests++;
      throw new Error('An unsaved configuration must not be sent');
    },
    { preconnect: fetch.preconnect }
  );
  try {
    await expect(state.repair.fetchModels(new AbortController().signal)).rejects.toThrow('Repair status write failed');
    await expect(state.repair.test(new AbortController().signal)).rejects.toThrow('Repair status write failed');
    await expect(state.repair.analyze(new AbortController().signal)).rejects.toThrow('Repair status write failed');
    expect(requests).toBe(0);
    expect(state.repair.connectionSaved).toBe(false);
    await expect(state.events.trigger(':idbReady')).resolves.toBeUndefined();
    await expect(state.events.trigger(':addon:repair')).resolves.toBeUndefined();
    expect(state.source.content).toBe('a { color: red; }');
    state.final.styleFileItems.map.get('style.css')!.content = state.source.content + '\n';
    await state.events.trigger(':addon:verify');
    await state.events.trigger(':modLoaderEnd');
    expect((await state.repair.list())[0].state).toBe('trial');
    expect(state.writes.join(' ')).not.toContain('private-key');
  } finally {
    globalThis.fetch = fetch;
  }
});

test('repair IndexedDB failure is isolated from loading and normal patch phases', async () => {
  const events = new Emitter();
  const writes: string[] = [];
  const idb = {
    define: () => true,
    with: async () => {
      throw new Error('IDB unavailable');
    }
  } as unknown as IndexedDB;
  const host = {
    diagnostics: { LevelName: 'DEBUG', write: (message: string) => writes.push(message) },
    modUtils: { getLogger: () => ({ warn: (message: string) => writes.push(message.replace(/^\[repair\] /, '')) }) }
  } as unknown as ModLoader;
  const repair = new Repair(idb, host, events);
  await expect(events.trigger(':indexedDB')).resolves.toBeUndefined();
  await expect(events.trigger(':idbReady')).resolves.toBeUndefined();
  await expect(events.trigger(':addon:repair')).resolves.toBeUndefined();
  expect(repair.storageError).toBe('IDB unavailable');
  expect(writes).toContain('Repair settings unavailable; continuing normal loading');
  expect(writes).toContain('Repair replay unavailable; continuing normal loading');
});

test('overwriting an applied memory preserves local steps for the original package on reload', async () => {
  const state = repairFixture();
  const previous = await seedRepair(state.rows);
  await state.events.trigger(':addon:repair');
  state.final.styleFileItems.map.get('style.css')!.content = state.source.content + '\n';
  await state.events.trigger(':addon:verify');
  await state.events.trigger(':modLoaderEnd');
  await state.repair.confirm(previous.id);
  state.diagnostics.history.push({ at: '2026-10-05T00:00:00.000Z', level: 'WARN', message: 'style.css needs another colour correction' });
  Object.assign(state.repair.connection, { apiUrl: 'https://example.test/v1', model: 'model' });
  let requests = 0;
  const fetch = globalThis.fetch;
  globalThis.fetch = Object.assign(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      requests++;
      const request = NativeJSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
      const context = NativeJSON.parse(request.messages.find(message => message.role === 'user')!.content) as RepairContext;
      const target = context.targets.find(target => target.kind === 'css')!;
      const recipe: RepairRecipe = {
        requestId: context.requestId,
        outcome: 'repair',
        summary: 'Adjust the colour again',
        evidence: [],
        operations: [{ targetId: target.id, find: 'red', replace: 'blue', expectedMatches: 1, reason: 'Correct the selected value' }]
      };
      expect(context.mods).toEqual(['example', 'maplebirch']);
      expect(Object.hasOwn(context, 'environment')).toBe(false);
      expect(Object.hasOwn(target, 'modVersion')).toBe(false);
      return new Response(NativeJSON.stringify({ choices: [{ message: { content: NativeJSON.stringify(recipe) } }] }), { headers: { 'Content-Type': 'application/json' } });
    },
    { preconnect: fetch.preconnect }
  );
  try {
    expect((await state.repair.analyze(new AbortController().signal)).result).toBe('success');
    await state.repair.stage();
    const records = await state.repair.list();
    expect(records).toHaveLength(1);
    expect(records[0].id).not.toBe(previous.id);
    expect(records[0].steps).toHaveLength(1);
    const reload = repairFixture(state.rows);
    await reload.events.trigger(':addon:repair');
    expect(reload.source.content).toBe('a { color: blue; }');
    reload.final.styleFileItems.map.get('style.css')!.content = reload.source.content + '\n';
    await reload.events.trigger(':addon:verify');
    await reload.events.trigger(':modLoaderEnd');
    expect((await reload.repair.list())[0].state).toBe('trial');
    expect(requests).toBe(1);
  } finally {
    globalThis.fetch = fetch;
  }
});

async function anchorFixture(source: string) {
  const state = repairFixture();
  const rule = { from: 'old anchor', to: 'replacement', fileName: 'source.twee', passageName: 'Target' };
  type Patcher = NonNullable<import('../../src/services/Repair/Targets').RepairHandle['patcher']>;
  const patcher = {
    patchFileName: 'patch.json',
    patchInfo: { twee: [rule] },
    patchInfoMap: { js: new Map(), css: new Map(), twee: new Map([['Target', [rule]]]) },
    applyReplacePatcher(this: Patcher, data: Parameters<Patcher['applyReplacePatcher']>[0]) {
      for (const item of data.passageDataItems.items) for (const patch of this.patchInfoMap.twee.get(item.name) || []) item.content = item.content.replace(patch.from, () => patch.to);
    }
  } as unknown as Patcher;
  Object.assign(state.mod, { replacePatcher: [patcher] });
  state.final.passageDataItems.items.push({ id: 0, name: 'Target', content: source });
  state.final.passageDataItems.fillMap();
  const context: RepairContext = {
    requestId: 'anchor-1',
    mods: ['example'],
    diagnostics: [],
    modLoaderLogs: [],
    patches: [],
    conflicts: [],
    targets: [
      {
        id: 'anchor-1',
        modName: 'example',
        kind: 'replace-patcher',
        path: 'replace|patch.json|twee|0|from',
        content: rule.from,
        fingerprint: await RepairRecipeParser.fingerprint(rule.from),
        signature: NativeJSON.stringify({ to: rule.to, fileName: rule.fileName, passageName: rule.passageName })
      }
    ]
  };
  const recipe: RepairRecipe = {
    requestId: context.requestId,
    outcome: 'repair',
    summary: 'Update the existing search anchor',
    evidence: [],
    operations: [{ targetId: 'anchor-1', find: 'old anchor', replace: 'new anchor', expectedMatches: 1, reason: 'Source anchor moved' }]
  };
  const memory: RepairMemory = { id: 'memory:anchor', state: 'pending', enabled: true, summary: recipe.summary, createdAt: '2026-10-05T00:00:00.000Z', recipe, context };
  state.rows.set(memory.id, memory);
  return { ...state, rule, patcher };
}

test('ReplacePatcher memory verifies its actual rule application and restores the existing patcher', async () => {
  const state = await anchorFixture('new anchor');
  const original = state.patcher.applyReplacePatcher;
  await state.events.trigger(':addon:repair');
  expect(state.rule.from).toBe('new anchor');
  state.patcher.applyReplacePatcher(state.final as unknown as Parameters<typeof original>[0]);
  expect(state.final.passageDataItems.map.get('Target')!.content).toBe('replacement');
  expect(state.patcher.applyReplacePatcher).toBe(original);
  await state.events.trigger(':addon:verify');
  await state.events.trigger(':modLoaderEnd');
  expect((await state.repair.list())[0].state).toBe('trial');
});

test('a later mod repairs its search anchor while preserving an earlier mod and disables memory when that input changes', async () => {
  const rows = new Map<string, unknown>();
  const create = async (replacement = 'A content new anchor') => {
    const state = await anchorFixture('old anchor');
    const previousRule = { from: 'old anchor', to: replacement, fileName: 'source.twee', passageName: 'Target' };
    const previousPatcher = {
      ...state.patcher,
      applyReplacePatcher: state.patcher.applyReplacePatcher,
      patchFileName: 'earlier.json',
      patchInfo: { twee: [previousRule] },
      patchInfoMap: { js: new Map(), css: new Map(), twee: new Map([['Target', [previousRule]]]) }
    };
    const previousMod = { ...state.mod, name: 'earlier', replacePatcher: [previousPatcher] };
    const getMod = state.host.modUtils.getMod;
    Object.assign(state.host.modUtils, {
      getModListNameNoAlias: () => ['earlier', 'example', 'maplebirch'],
      getMod: (name: string) => (name === previousMod.name ? previousMod : getMod(name))
    });
    if (rows.size) {
      state.rows.clear();
      for (const [id, value] of rows) state.rows.set(id, structuredClone(value));
    }
    return { ...state, previousRule, previousPatcher };
  };
  const state = await create();
  const original = state.patcher.applyReplacePatcher;
  const previousOriginal = state.previousPatcher.applyReplacePatcher;
  const data = state.final as unknown as Parameters<typeof original>[0];
  const passage = state.final.passageDataItems.map.get('Target')!;
  const previousRule = structuredClone(state.previousRule);
  // 按原生顺序先执行 A，B 的旧搜索文本已不存在。
  state.previousPatcher.applyReplacePatcher(data);
  state.patcher.applyReplacePatcher(data);
  expect(passage.content).toBe('A content new anchor');
  passage.content = 'old anchor';
  const fetch = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Repair replay must not request AI'));
  try {
    await state.events.trigger(':addon:repair');
    expect(state.rule.from).toBe('new anchor');
    state.previousPatcher.applyReplacePatcher(data);
    state.patcher.applyReplacePatcher(data);
    expect(passage.content).toBe('A content replacement');
    expect(state.previousRule).toEqual(previousRule);
    expect(state.rule.to).toBe('replacement');
    expect(state.previousPatcher.applyReplacePatcher).toBe(previousOriginal);
    expect(state.patcher.applyReplacePatcher).toBe(original);
    await state.events.trigger(':addon:verify');
    await state.events.trigger(':modLoaderEnd');
    expect((await state.repair.list())[0].state).toBe('trial');
    await state.repair.confirm('memory:anchor');
    for (const [id, value] of state.rows) rows.set(id, structuredClone(value));

    const reload = await create('A content changed anchor');
    const reloadedOriginal = reload.patcher.applyReplacePatcher;
    await reload.events.trigger(':addon:repair');
    expect(reload.rule.from).toBe('new anchor');
    const reloadedData = reload.final as unknown as Parameters<typeof reloadedOriginal>[0];
    reload.previousPatcher.applyReplacePatcher(reloadedData);
    reload.patcher.applyReplacePatcher(reloadedData);
    expect(reload.final.passageDataItems.map.get('Target')!.content).toBe('A content changed anchor');
    expect(reload.rule.to).toBe('replacement');
    await reload.events.trigger(':addon:verify');
    await reload.events.trigger(':modLoaderEnd');
    expect((await reload.repair.list())[0].state).toBe('failed');
    expect((await reload.repair.list())[0].enabled).toBe(false);
    expect(reload.patcher.applyReplacePatcher).toBe(reloadedOriginal);
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    fetch.mockRestore();
  }
});

test('two repaired patchers in one memory verify their sequential output on the same passage', async () => {
  const state = await anchorFixture('new anchor second new anchor');
  const secondRule = { from: 'old second', to: 'final', fileName: 'source.twee', passageName: 'Target' };
  const secondPatcher = {
    ...state.patcher,
    applyReplacePatcher: state.patcher.applyReplacePatcher,
    patchFileName: 'second.json',
    patchInfo: { twee: [secondRule] },
    patchInfoMap: { js: new Map(), css: new Map(), twee: new Map([['Target', [secondRule]]]) }
  };
  Object.assign(state.mod, { replacePatcher: [state.patcher, secondPatcher] });
  const memory = state.rows.get('memory:anchor') as RepairMemory;
  memory.context.targets.push({
    id: 'anchor-2',
    modName: 'example',
    kind: 'replace-patcher',
    path: 'replace|second.json|twee|0|from',
    content: secondRule.from,
    fingerprint: await RepairRecipeParser.fingerprint(secondRule.from),
    signature: NativeJSON.stringify({ to: secondRule.to, fileName: secondRule.fileName, passageName: secondRule.passageName })
  });
  memory.recipe.operations.push({ targetId: 'anchor-2', find: 'old second', replace: 'second new anchor', expectedMatches: 1, reason: 'The later source anchor also moved' });
  const firstOriginal = state.patcher.applyReplacePatcher;
  const secondOriginal = secondPatcher.applyReplacePatcher;
  await state.events.trigger(':addon:repair');
  expect(state.rule.from).toBe('new anchor');
  expect(secondRule.from).toBe('second new anchor');
  const data = state.final as unknown as Parameters<typeof firstOriginal>[0];
  state.patcher.applyReplacePatcher(data);
  secondPatcher.applyReplacePatcher(data);
  expect(state.final.passageDataItems.map.get('Target')!.content).toBe('replacement final');
  expect(state.patcher.applyReplacePatcher).toBe(firstOriginal);
  expect(secondPatcher.applyReplacePatcher).toBe(secondOriginal);
  await state.events.trigger(':addon:verify');
  await state.events.trigger(':modLoaderEnd');
  expect((await state.repair.list())[0].state).toBe('trial');
});

test('ReplacePatcher memory fails when the output preexists but its repaired anchor never matches', async () => {
  const state = await anchorFixture('replacement');
  const original = state.patcher.applyReplacePatcher;
  await state.events.trigger(':addon:repair');
  state.patcher.applyReplacePatcher(state.final as unknown as Parameters<typeof original>[0]);
  await state.events.trigger(':addon:verify');
  await state.events.trigger(':modLoaderEnd');
  expect((await state.repair.list())[0].state).toBe('failed');
  expect((await state.repair.list())[0].enabled).toBe(false);
  expect(state.patcher.applyReplacePatcher).toBe(original);
});

async function frameworkAnchorFixture(source = 'new anchor') {
  const descriptor = { src: 'old anchor', to: 'replacement' };
  const zone: RepairZone = { locationPassage: { Target: [descriptor] }, widgetPassage: {} };
  const state = repairFixture(new Map(), zone);
  state.final.passageDataItems.items.push({ id: 0, name: 'Target', content: source });
  state.final.passageDataItems.fillMap();
  const context: RepairContext = {
    requestId: 'framework-anchor-1',
    mods: ['maplebirch'],
    diagnostics: [],
    modLoaderLogs: [],
    patches: [],
    conflicts: [],
    targets: [
      {
        id: 'anchor-1',
        modName: 'maplebirch',
        kind: 'patch-anchor',
        path: 'zone|locationPassage|Target|0|src',
        content: descriptor.src,
        fingerprint: await RepairRecipeParser.fingerprint(descriptor.src),
        signature: RepairTargets.anchorSignature(descriptor)
      }
    ]
  };
  const recipe: RepairRecipe = {
    requestId: context.requestId,
    outcome: 'repair',
    summary: 'Update the framework search anchor',
    evidence: [],
    operations: [{ targetId: 'anchor-1', find: 'old anchor', replace: 'new anchor', expectedMatches: 1, reason: 'Source anchor moved' }]
  };
  const memory: RepairMemory = { id: 'memory:framework-anchor', state: 'pending', enabled: true, summary: recipe.summary, createdAt: '2026-10-05T00:00:00.000Z', recipe, context };
  state.rows.set(memory.id, memory);
  state.events.on(':addon:beforePatch', () => {
    const passage = state.final.passageDataItems.map.get('Target')!;
    const { content, ...report } = applySourcePatch(passage.content, descriptor);
    passage.content = content;
    state.diagnostics.patches.push({ kind: 'passage', target: 'Target', index: 1, ...report });
    // 框架打补丁后会清理已消费的锚点表。
    delete zone.locationPassage.Target;
  });
  return state;
}

test('framework anchor verification survives consumed configuration cleanup', async () => {
  const state = await frameworkAnchorFixture();
  await state.events.trigger(':addon:repair');
  await state.events.trigger(':addon:beforePatch');
  await state.events.trigger(':addon:verify');
  await state.events.trigger(':modLoaderEnd');
  expect((await state.repair.list())[0].state).toBe('trial');
});

test('an early verified CSS repair fails when a late module overwrites the stylesheet', async () => {
  const state = repairFixture();
  const memory = await seedRepair(state.rows);
  await state.events.trigger(':addon:repair');
  state.final.styleFileItems.map.get('style.css')!.content = state.source.content + '\n';
  await state.events.trigger(':addon:verify');
  expect((await state.repair.list())[0].state).toBe('pending');
  await expect(state.repair.confirm(memory.id)).rejects.toThrow();
  state.final.styleFileItems.map.get('style.css')!.content = 'a { color: blue; }';
  await state.events.trigger(':modLoaderEnd');
  expect((await state.repair.list())[0].state).toBe('failed');
  expect((await state.repair.list())[0].enabled).toBe(false);
  expect(state.source.content).toBe('a { color: red; }');
});

test('a framework passage wrapper can retain the complete early verified output until loading ends', async () => {
  const state = await frameworkAnchorFixture('prefix new anchor suffix');
  await state.events.trigger(':addon:repair');
  await state.events.trigger(':addon:beforePatch');
  const passage = state.final.passageDataItems.map.get('Target')!;
  expect(passage.content).toBe('prefix replacement suffix');
  await state.events.trigger(':addon:verify');
  expect((await state.repair.list())[0].state).toBe('pending');
  passage.content = ZonesManager.wrapSpecialPassage(passage.content, passage.name);
  await state.events.trigger(':modLoaderEnd');
  expect((await state.repair.list())[0].state).toBe('trial');
  expect((await state.repair.list())[0].enabled).toBe(true);
});

test('Twee content hidden by a conditional or comment is not a surviving repair', async () => {
  for (const hide of [(content: string) => `<<if false>>${content}<</if>>`, (content: string) => `<!--${content}-->other implementation`]) {
    const state = await frameworkAnchorFixture('prefix new anchor suffix');
    await state.events.trigger(':addon:repair');
    await state.events.trigger(':addon:beforePatch');
    await state.events.trigger(':addon:verify');
    const passage = state.final.passageDataItems.map.get('Target')!;
    passage.content = hide(passage.content);
    await state.events.trigger(':modLoaderEnd');
    expect((await state.repair.list())[0].state).toBe('failed');
    expect((await state.repair.list())[0].enabled).toBe(false);
  }
});

test('an applied framework anchor is not successful when the loader later overwrites its passage', async () => {
  const state = await frameworkAnchorFixture();
  await state.events.trigger(':addon:repair');
  await state.events.trigger(':addon:beforePatch');
  state.final.passageDataItems.map.get('Target')!.content = 'another mod replaced this passage';
  await state.events.trigger(':addon:verify');
  await state.events.trigger(':modLoaderEnd');
  expect((await state.repair.list())[0].state).toBe('failed');
  expect((await state.repair.list())[0].enabled).toBe(false);
});

test('malformed stored records cannot prevent valid repair memory replay', async () => {
  const state = repairFixture();
  const valid = await seedRepair(state.rows);
  state.rows.set('memory:malformed', { id: 'memory:malformed', enabled: true, state: 'pending', createdAt: 7 });
  state.rows.set('memory:missing-context', { id: 'memory:missing-context', summary: 'Broken record', enabled: true, state: 'pending', createdAt: '2026-10-04' });
  await state.events.trigger(':addon:repair');
  expect(state.source.content).toBe('a { color: red; }');
  expect((await state.repair.list()).map(record => record.id)).toEqual([valid.id]);
});

test('a stale record status write failure cannot block the next valid repair', async () => {
  const state = repairFixture();
  const valid = await seedRepair(state.rows);
  valid.createdAt = '2026-10-05T00:00:01.000Z';
  state.rows.set(valid.id, structuredClone(valid));
  const stale = structuredClone(valid);
  stale.id = 'memory:stale';
  stale.createdAt = '2026-10-05T00:00:00.000Z';
  stale.context.targets[0].path = 'missing.css';
  state.rows.set(stale.id, stale);
  state.failedWrites.add(stale.id);
  await state.events.trigger(':addon:repair');
  expect(state.source.content).toBe('a { color: red; }');
  expect(state.writes).toContain(`Repair disabled: ${stale.id}`);
  expect(state.repair.history).toContainEqual(expect.objectContaining({ scope: 'repair', level: 'WARN', message: `Repair disabled status could not be saved: ${stale.id}`, data: expect.any(Error) }));
  state.final.styleFileItems.map.get('style.css')!.content = state.source.content + '\n';
  await state.events.trigger(':addon:verify');
  await state.events.trigger(':modLoaderEnd');
  expect((await state.repair.list()).find(record => record.id === valid.id)?.state).toBe('trial');
});

test('explicit repair operations do not require Debug Mode', async () => {
  const state = repairFixture();
  state.diagnostics.LevelName = 'INFO';
  state.diagnostics.history.push({ at: 'fixture-time', level: 'WARN', message: 'example style.css invalid colour' });
  Object.assign(state.repair.connection, { apiType: 'openai', apiUrl: 'https://example.test/v1', apiKey: '', model: 'model' });
  const fetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = Object.assign(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      requests++;
      if (init?.method === 'GET') return Response.json({ data: [{ id: 'model' }] });
      const request = NativeJSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
      if (!request.messages.some(message => message.role === 'system')) return Response.json({ choices: [{ message: { content: 'OK' } }] });
      const context = NativeJSON.parse(request.messages.find(message => message.role === 'user')!.content) as RepairContext;
      const recipe: RepairRecipe = {
        requestId: context.requestId,
        outcome: 'repair',
        summary: 'Correct the colour',
        evidence: [],
        operations: [{ targetId: context.targets[0].id, find: 'reed', replace: 'red', expectedMatches: 1, reason: 'Invalid colour value' }]
      };
      return Response.json({ choices: [{ message: { content: NativeJSON.stringify(recipe) } }] });
    },
    { preconnect: fetch.preconnect }
  );
  try {
    expect(state.repair).toBeInstanceOf(Diagnostics);
    await state.repair.saveConnection();
    expect(await state.repair.test(new AbortController().signal)).toBe('success');
    expect((await state.repair.fetchModels(new AbortController().signal)).result).toBe('success');
    expect((await state.repair.analyze(new AbortController().signal)).overlays).toHaveLength(1);
    await state.repair.stage();
    await state.events.trigger(':addon:repair');
    state.final.styleFileItems.map.get('style.css')!.content = state.source.content + '\n';
    await state.events.trigger(':modLoaderEnd');
    const [memory] = await state.repair.list();
    await state.repair.confirm(memory.id);
    expect((await state.repair.list())[0].state).toBe('active');
    expect(requests).toBe(3);
  } finally {
    globalThis.fetch = fetch;
  }
});

test('failure status storage errors remain visible without rejecting loading', async () => {
  const state = repairFixture();
  const memory = await seedRepair(state.rows);
  await state.events.trigger(':addon:repair');
  state.failedWrites.add(memory.id);
  state.final.styleFileItems.map.get('style.css')!.content = 'a { color: blue; }';

  await expect(state.events.trigger(':modLoaderEnd')).resolves.toBeUndefined();
  const entry = [...state.repair.history].reverse().find(record => record.message === `Repair failed status could not be saved: ${memory.id}`);
  expect(entry).toMatchObject({ scope: 'repair', level: 'WARN' });
  expect(entry?.data).toBeInstanceOf(Error);
  expect(new Diagnostics().history).toContainEqual(entry!);
});

test('staging stores executable targets without transient JS trace evidence', async () => {
  const state = repairFixture();
  Object.assign(state.repair.connection, { apiUrl: 'https://example.test/v1', model: 'model' });
  const proposal = await seedRepair(new Map());
  proposal.context.scripts = [{ name: 'colours.js', symbols: ['getSkinRgb'], excerpts: [{ line: 10, content: 'Object.getSkinRgb = function () { return skin_options.light.rgb; };' }] }];
  const { RepairAgent } = await import('../../src/services/Repair/Agent');
  const contextSpy = spyOn(RepairAgent, 'context').mockResolvedValue(proposal.context);
  const analyzeSpy = spyOn(RepairAgent, 'analyze').mockResolvedValue({ result: 'success', recipe: proposal.recipe });
  try {
    expect((await state.repair.analyze(new AbortController().signal)).overlays).toHaveLength(1);
    await state.repair.stage();
    const [memory] = await state.repair.list();
    expect(memory.context).not.toHaveProperty('scripts');
    expect(memory.context.targets[0].id).toBe('css-1');
    expect(memory.recipe.operations[0].targetId).toBe('css-1');
    expect(proposal.context.scripts[0].name).toBe('colours.js');
  } finally {
    contextSpy.mockRestore();
    analyzeSpy.mockRestore();
  }
});

test('analysis retains validation reasons and discards an earlier executable proposal', async () => {
  const state = repairFixture();
  Object.assign(state.repair.connection, { apiUrl: 'https://example.test/v1', model: 'model' });
  const proposal = await seedRepair(new Map());
  const { RepairAgent } = await import('../../src/services/Repair/Agent');
  const contextSpy = spyOn(RepairAgent, 'context').mockResolvedValue(proposal.context);
  const analyzeSpy = spyOn(RepairAgent, 'analyze').mockResolvedValue({ result: 'success', recipe: proposal.recipe });
  try {
    expect((await state.repair.analyze(new AbortController().signal)).overlays).toHaveLength(1);
    analyzeSpy.mockResolvedValue({ result: 'preflight', reason: 'Replacement does not match supplied content' });
    const result = await state.repair.analyze(new AbortController().signal);
    expect(result).toEqual({ result: 'preflight', reason: 'Replacement does not match supplied content' });
    await expect(state.repair.stage()).rejects.toThrow('No executable repair proposal');
    expect(await state.repair.list()).toEqual([]);
    expect([...state.rows.keys()]).toEqual(['connection']);
    expect(state.source.content).toBe('a { color: reed; }');
  } finally {
    contextSpy.mockRestore();
    analyzeSpy.mockRestore();
  }
});

test('preparation failures expose only fixed reasons and never persist executable repairs', async () => {
  const state = repairFixture();
  Object.assign(state.repair.connection, { apiUrl: 'https://example.test/v1', model: 'model' });
  const proposal = await seedRepair(new Map());
  const { RepairAgent } = await import('../../src/services/Repair/Agent');
  const { RepairEngine } = await import('../../src/services/Repair/Engine');
  const contextSpy = spyOn(RepairAgent, 'context').mockResolvedValue(proposal.context);
  const analyzeSpy = spyOn(RepairAgent, 'analyze').mockResolvedValue({ result: 'success', recipe: proposal.recipe });
  const prepareSpy = spyOn(RepairEngine, 'prepare');
  const secret = 'private-api-key-and-source';
  try {
    for (const [message, reason] of [
      ['Repair target changed: target-1', 'Repair target changed: target-1'],
      ['Repair inputs changed during preparation', 'Repair inputs changed during preparation'],
      [`Unexpected dependency error: ${secret}`, 'Repair preparation failed'],
      [`Repair target changed: target-1\n${secret}`, 'Repair preparation failed']
    ]) {
      const historyStart = state.repair.history.length;
      const writesStart = state.writes.length;
      prepareSpy.mockRejectedValueOnce(new Error(message));
      expect(await state.repair.analyze(new AbortController().signal)).toEqual({ result: 'preflight', reason });
      await expect(state.repair.stage()).rejects.toThrow('No executable repair proposal');
      const entries = state.repair.history.slice(historyStart);
      expect(entries).toContainEqual(expect.objectContaining({ level: 'WARN', scope: 'repair', message: `Repair analysis: preflight (${reason})` }));
      expect(entries.every(entry => entry.data === undefined)).toBe(true);
      expect(JSON.stringify(entries)).not.toContain(secret);
      expect(state.writes.slice(writesStart).join('\n')).not.toContain(secret);
      expect(await state.repair.list()).toEqual([]);
      expect([...state.rows.keys()]).toEqual(['connection']);
      expect(state.source.content).toBe('a { color: reed; }');
    }
  } finally {
    contextSpy.mockRestore();
    analyzeSpy.mockRestore();
    prepareSpy.mockRestore();
  }
});
