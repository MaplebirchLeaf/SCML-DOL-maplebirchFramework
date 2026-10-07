import '../../support/runtime';
import { expect, spyOn, test } from 'bun:test';
import type ModLoader from '../../../src/host/ModLoader';
import type IndexedDB from '../../../src/services/IndexedDB';
import Emitter from '../../../src/infra/Emitter';
import Repair, { type RepairMemory } from '../../../src/services/Repair';
import { RepairRecipeParser, type RepairContext, type RepairRecipe } from '../../../src/services/Repair/Recipe';
import { RepairTargets, type RepairHandle } from '../../../src/services/Repair/Targets';
import { NativeJSON } from '../../../src/services/Repair/Json';

type TweePatcher = NonNullable<RepairHandle['twee']>['patcher'];
type TweeData = Parameters<TweePatcher['do_patch']>[1];
type TweeInfo = Parameters<TweePatcher['do_patch']>[0];

const oldSearch = '<<set $livestock_milk = 0>>\n<<set $animal = "cow">>';
const currentSearch = '<<set $livestock.milk = 0>>\n<<set $animal = "cow">>';
const fileBody = oldSearch + '\n<<set $remyLove = true>>';
const currentBody = currentSearch + '\n<<set $remyLove = true>>';

function fixture(rows = new Map<string, unknown>(), current = currentSearch, search = oldSearch, body = fileBody) {
  const events = new Emitter();
  const stores: string[] = [];
  const warnings: string[] = [];
  const idb = {
    define: (name: string) => stores.push(name),
    has: () => false,
    with: async (_store: string, _mode: IDBTransactionMode, callback: (tx: { objectStore(): unknown }) => unknown) =>
      callback({
        objectStore: () => ({
          get: async (id: string) => structuredClone(rows.get(id)),
          getAll: async () => structuredClone([...rows.values()]),
          put: async (row: { id: string }) => rows.set(row.id, structuredClone(row)),
          delete: async (id: string) => rows.delete(id)
        })
      })
  } as unknown as IndexedDB;
  const records = (items: Array<{ name: string; content: string }>) => ({ items, map: new Map(items.map(item => [item.name, item])) });
  const cache = (text?: string) => ({ passageDataItems: records(text === undefined ? [] : [{ name: 'Target', content: text }]), scriptFileItems: records([]), styleFileItems: records([]) });
  const rule = { passage: 'Target', findString: search, replaceFile: 'body.twee' } as NonNullable<RepairHandle['twee']>['rule'];
  const archive = new Map([['body.twee', body]]);
  const mod = { name: 'Old Remy', bootJson: { addonPlugin: [{ modName: 'TweeReplacer', addonName: 'TweeReplacerAddon', params: [rule] }] }, cache: cache(), replacePatcher: [] };
  const modZip = {
    zip: {
      file(path: string) {
        return archive.has(path) ? { async: async () => archive.get(path) } : null;
      }
    }
  };
  const info = { addonName: 'TweeReplacerAddon', mod, modZip } as unknown as TweeInfo;
  const patcher = {
    info: new Map([[mod.name, info]]),
    async do_patch(input: TweeInfo, data: TweeData) {
      const addon = input.mod.bootJson.addonPlugin![0];
      for (const entry of addon.params as NonNullable<RepairHandle['twee']>['rule'][]) {
        const passage = data.passageDataItems.map.get(entry.passage);
        const body = entry.replace || (await input.modZip.zip.file(entry.replaceFile!)?.async('string'));
        if (!passage || !entry.findString || !body || !passage.content.includes(entry.findString)) continue;
        passage.content = entry.all ? passage.content.replaceAll(entry.findString, body) : passage.content.replace(entry.findString, body);
      }
    }
  } as unknown as TweePatcher;
  const plugin = { name: 'TweeReplacer', cache: cache(), replacePatcher: [], modRef: patcher };
  const final = cache(current);
  const diagnostics = { history: [], patches: [], conflicts: [], write: (message: string) => warnings.push(message) };
  const host = {
    diagnostics,
    modLoaderGui: { gLoadingProgress: { logList: [{ type: 'error', str: `[TweeReplacer] do_patch() cannot find findString: [${mod.name}] findString:[${oldSearch}] in:[Target]` }] } },
    modUtils: {
      getLogger: () => ({ warn: (message: string) => warnings.push(message) }),
      getModListNameNoAlias: () => [mod.name, plugin.name],
      getMod: (name: string) => (name === mod.name ? mod : name === plugin.name ? plugin : undefined)
    },
    modSC2DataManager: { getSC2DataInfoAfterPatch: () => final, getSC2DataInfoCache: () => cache(search) }
  } as unknown as ModLoader;
  const repair = new Repair(idb, host, events);
  return { rows, events, stores, warnings, archive, rule, info, patcher, host, repair, final, item: final.passageDataItems.items[0] };
}

async function seed(state: ReturnType<typeof fixture>, after = currentSearch, rebase = true, before = oldSearch, signature?: string): Promise<RepairMemory> {
  await RepairTargets.prepareRules(state.host);
  const content = NativeJSON.stringify({ passage: 'Target', findString: before });
  const context: RepairContext = {
    requestId: crypto.randomUUID(),
    mods: ['Old Remy'],
    diagnostics: [],
    modLoaderLogs: [],
    patches: [],
    conflicts: [],
    passages: [{ name: 'Target', current: after }],
    targets: [
      {
        id: 'target-1',
        modName: 'Old Remy',
        kind: 'twee-replacer',
        path: 'twee-replacer|0|0',
        content,
        fingerprint: await RepairRecipeParser.fingerprint(content),
        signature: signature || RepairTargets.tweeSignature(RepairTargets.tweeRules(state.host)[0])
      }
    ]
  };
  const recipe: RepairRecipe = {
    requestId: context.requestId,
    outcome: 'repair',
    summary: 'Keep current initialization and the existing mod addition',
    evidence: [],
    operations: [
      {
        targetId: 'target-1',
        find: content,
        replace: NativeJSON.stringify({ passage: 'Target', findString: after, ...(rebase && { rebase: true }) }),
        expectedMatches: 1,
        reason: 'Move the original mod addition onto current source'
      }
    ]
  };
  const memory: RepairMemory = { id: `memory:${crypto.randomUUID()}`, summary: recipe.summary, enabled: true, state: 'pending', createdAt: '2026-10-06T00:00:00.000Z', context, recipe };
  state.rows.set(memory.id, structuredClone(memory));
  return memory;
}

test('normal loading without repair memory does not decompress replacement files', async () => {
  const state = fixture();
  const file = spyOn(state.info.modZip.zip, 'file');
  try {
    await state.events.trigger(':addon:repair');
    expect(file).not.toHaveBeenCalled();
    expect(state.rule).toEqual({ passage: 'Target', findString: oldSearch, replaceFile: 'body.twee' });
    expect(await state.repair.list()).toEqual([]);
  } finally {
    file.mockRestore();
  }
});

async function native(state: ReturnType<typeof fixture>): Promise<void> {
  await state.patcher.do_patch(state.info, state.final as unknown as TweeData);
  await state.events.trigger(':addon:verify');
  await state.events.trigger(':modLoaderEnd');
}

test('reviewed rebase proposal stores its bound original file body and replays the saved operation', async () => {
  const state = fixture();
  Object.assign(state.repair.connection, { apiUrl: 'https://repair.example.test/v1', model: 'test-model' });
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const request = NativeJSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
        const context = NativeJSON.parse(request.messages.find(message => message.role === 'user')!.content) as RepairContext;
        const target = context.targets[0];
        const recipe: RepairRecipe = {
          requestId: context.requestId,
          outcome: 'repair',
          summary: 'Preserve new initialization and the old mod feature',
          evidence: [],
          operations: [
            {
              targetId: target.id,
              find: target.content,
              replace: NativeJSON.stringify({ passage: 'Target', findString: currentSearch, rebase: true }),
              expectedMatches: 1,
              reason: 'Rebase the existing addition'
            }
          ]
        };
        return new Response(NativeJSON.stringify({ choices: [{ message: { content: NativeJSON.stringify(recipe) } }] }), { headers: { 'Content-Type': 'application/json' } });
      },
      { preconnect: globalThis.fetch.preconnect }
    )
  );
  try {
    const result = await state.repair.analyze(new AbortController().signal);
    expect(result.overlays?.[0].replacement).toEqual({ before: fileBody, after: currentBody });
    expect(state.rule).toEqual({ passage: 'Target', findString: oldSearch, replaceFile: 'body.twee' });
    await state.repair.stage();
    const memory = (await state.repair.list())[0];
    expect(memory.state).toBe('pending');
    expect(memory.context.targets[0]).not.toHaveProperty('reference');
    expect(NativeJSON.parse(memory.context.targets[0].signature!)).toMatchObject({ companion: { replaceFile: 'body.twee' }, replacement: fileBody });
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockRejectedValue(new Error('Reload must use repair memory'));
    const reload = fixture(state.rows);
    await reload.events.trigger(':addon:repair');
    await native(reload);
    expect(reload.item.content).toBe(currentBody);
    expect((await reload.repair.list())[0].state).toBe('trial');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(reload.archive.get('body.twee')).toBe(fileBody);
  } finally {
    fetch.mockRestore();
  }
});

test('file-based rebase memory becomes trial and active then reloads without an AI request or ZIP edits', async () => {
  const state = fixture();
  const memory = await seed(state);
  const fetch = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Memory replay must not call AI'));
  try {
    await state.events.trigger(':indexedDB');
    await state.events.trigger(':addon:repair');
    expect(state.rule).toEqual({ passage: 'Target', findString: currentSearch, replace: currentBody });
    expect(state.item.content).toBe(currentSearch);
    expect((await state.repair.list())[0].state).toBe('pending');
    await expect(state.repair.confirm(memory.id)).rejects.toThrow();
    await state.events.trigger(':addon:verify');
    expect((await state.repair.list())[0].state).toBe('pending');
    await native(state);
    expect(state.item.content).toBe(currentBody);
    expect((await state.repair.list())[0].state).toBe('trial');
    await state.repair.confirm(memory.id);
    expect((await state.repair.list())[0].state).toBe('active');
    expect(state.archive.get('body.twee')).toBe(fileBody);
    const reload = fixture(state.rows);
    await reload.events.trigger(':addon:repair');
    await native(reload);
    expect(reload.item.content).toBe(currentBody);
    expect((await reload.repair.list())[0].state).toBe('active');
    expect(reload.archive.get('body.twee')).toBe(fileBody);
    expect(fetch).not.toHaveBeenCalled();
    expect(state.stores).toEqual(['repair']);
  } finally {
    fetch.mockRestore();
  }
});

test('multiple threshold edits survive memory replay together with current path and condition changes', async () => {
  const search = '\t<<if $livestock_obey gte 80 and C.npc.Remy.love gte 50 and !playerChastity()>>';
  const body = search.replace('gte 80', 'gte 50').replace('Remy.love gte 50', 'Remy.love gte 20');
  const current = search.replace('$livestock_obey', '$livestock.obey').replace('()>>', '() and $livestock.pride is 1>>');
  const expected = current.replace('gte 80', 'gte 50').replace('Remy.love gte 50', 'Remy.love gte 20');
  const state = fixture(undefined, current, search, body);
  const memory = await seed(state, current, true, search);
  const fetch = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Memory replay must not call AI'));
  try {
    await state.events.trigger(':addon:repair');
    expect(state.rule).toEqual({ passage: 'Target', findString: current, replace: expected });
    expect(state.item.content).toBe(current);
    await native(state);
    expect(state.item.content).toBe(expected);
    expect((await state.repair.list())[0].state).toBe('trial');
    await state.repair.confirm(memory.id);
    const reload = fixture(state.rows, current, search, body);
    await reload.events.trigger(':addon:repair');
    await native(reload);
    expect(reload.item.content).toBe(expected);
    expect((await reload.repair.list())[0].state).toBe('active');
    expect(reload.archive.get('body.twee')).toBe(body);
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    fetch.mockRestore();
  }
});

test('multi-step rebase followed by search-only correction retains derived body and companion binding', async () => {
  const secondSearch = currentSearch + '\n<<set $livestock.capacity = 10>>';
  const thirdSearch = secondSearch.replaceAll('\n', '\n\t');
  const state = fixture(undefined, thirdSearch);
  const first = await seed(state);
  const firstSignature = RepairTargets.companionForBody(first.context.targets[0].signature!, currentBody);
  const second = await seed(state, secondSearch, true, currentSearch, firstSignature);
  const secondBody = secondSearch + '\n<<set $remyLove = true>>';
  const secondSignature = RepairTargets.companionForBody(firstSignature, secondBody);
  const third = await seed(state, thirdSearch, false, secondSearch, secondSignature);
  state.rows.delete(first.id);
  state.rows.delete(second.id);
  third.steps = [
    { recipe: first.recipe, context: first.context },
    { recipe: second.recipe, context: second.context }
  ];
  state.rows.set(third.id, structuredClone(third));
  await state.events.trigger(':addon:repair');
  expect(state.rule).toEqual({ passage: 'Target', findString: thirdSearch, replace: secondBody });
  await native(state);
  expect(state.item.content).toBe(secondBody);
  expect((await state.repair.list())[0].state).toBe('trial');
  expect(state.archive.get('body.twee')).toBe(fileBody);
  await state.repair.confirm(third.id);
  const reload = fixture(state.rows, thirdSearch);
  await reload.events.trigger(':addon:repair');
  await native(reload);
  expect(reload.rule.replace).toBe(secondBody);
  expect((await reload.repair.list())[0].state).toBe('active');
  const altered = fixture(state.rows, thirdSearch);
  const row = structuredClone(third);
  row.recipe = structuredClone(row.recipe);
  row.context.targets[0].signature = RepairTargets.companionForBody(firstSignature, 'unrelated body');
  altered.rows.set(row.id, row);
  await altered.events.trigger(':addon:repair');
  expect((await altered.repair.list())[0].state).toBe('stale');
  expect(altered.rule).toEqual({ passage: 'Target', findString: oldSearch, replaceFile: 'body.twee' });
});

test('native failure cannot promote rebased memory or retain a proof wrapper', async () => {
  const state = fixture();
  const memory = await seed(state);
  const failure = new Error('Native addon failed');
  const original = async () => {
    throw failure;
  };
  state.patcher.do_patch = original;
  await state.events.trigger(':addon:repair');
  await expect(state.patcher.do_patch(state.info, state.final as unknown as TweeData)).rejects.toBe(failure);
  await state.events.trigger(':modLoaderEnd');
  expect((await state.repair.list())[0].state).toBe('failed');
  await expect(state.repair.confirm(memory.id)).rejects.toThrow();
  expect(state.patcher.do_patch).toBe(original);
  expect(state.archive.get('body.twee')).toBe(fileBody);
});

test('later rule body changes cannot pass loading verification even if native output still exists', async () => {
  const state = fixture();
  const memory = await seed(state);
  await state.events.trigger(':addon:repair');
  await state.patcher.do_patch(state.info, state.final as unknown as TweeData);
  expect(state.item.content).toBe(currentBody);
  state.rule.replace = 'changed by another module';
  await state.events.trigger(':modLoaderEnd');
  expect((await state.repair.list())[0].state).toBe('failed');
  await expect(state.repair.confirm(memory.id)).rejects.toThrow();
  expect(state.archive.get('body.twee')).toBe(fileBody);
});
