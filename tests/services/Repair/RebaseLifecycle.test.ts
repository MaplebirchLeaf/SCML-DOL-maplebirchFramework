import '../../support/runtime';
import { expect, spyOn, test } from 'bun:test';
import type ModLoader from '../../../src/host/ModLoader';
import type IndexedDB from '../../../src/services/IndexedDB';
import Emitter from '../../../src/infra/Emitter';
import Repair, { type RepairMemory } from '../../../src/services/Repair';
import { RepairRecipeParser, type RepairContext, type RepairRecipe } from '../../../src/services/Repair/Recipe';
import { RepairTargets, type RepairHandle } from '../../../src/services/Repair/Targets';
import { NativeJSON } from '../../../src/services/Repair/Json';
import RepairState from '../../../src/services/Repair/State';

type TweePatcher = NonNullable<RepairHandle['twee']>['patcher'];
type TweeData = Parameters<TweePatcher['do_patch']>[1];
type TweeInfo = Parameters<TweePatcher['do_patch']>[0];

const oldSearch = '<<set $livestock_milk = 0>>\n<<set $animal = "cow">>';
const currentSearch = '<<set $livestock.milk = 0>>\n<<set $animal = "cow">>';
const fileBody = oldSearch + '\n<<set $remyLove = true>>';
const currentBody = currentSearch + '\n<<set $remyLove = true>>';

const migrationSearch = '/*Alex variables*/';
const migrationCondition = '(getPregnancyObject().potentialFathers.length is 1 or getPregnancyObject().potentialFathers.length is undefined) and getPregnancyObject().fetus[0].father is "Remy"';
const migrationSource = 'getPregnancyObject().fetus[0].father';
const migrationDefinition = '<<set _birth to getLabouringPregnancy("pc")>>';
const migrationAnchor = '<<set $alex_pregnancy to _birth?.donor is "Alex">>';
const migrationCurrent = migrationDefinition + '\n' + migrationAnchor;
const migrationFileBody = `<<if ${migrationCondition}>>\r\n<<set $remy_pregnancy.source to ${migrationSource}>>\r\n<</if>>\r\n${migrationSearch}`;
const migrationBody = migrationFileBody.replace(migrationCondition, '_birth?.donor === "Remy"').replace(`to ${migrationSource}>>`, 'to _birth?.donor>>').replace(migrationSearch, migrationAnchor);

function fixture(rows = new Map<string, unknown>(), current = currentSearch, search = oldSearch, body = fileBody, variables?: object) {
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
  const repair = new Repair(
    idb,
    host,
    events,
    () => undefined,
    () => variables
  );
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

async function seedMigration(state: ReturnType<typeof fixture>): Promise<RepairMemory> {
  const memory = await seed(state, migrationAnchor, true, migrationSearch);
  memory.context.passages![0].current = migrationCurrent;
  memory.recipe.operations[0].replace = NativeJSON.stringify({
    passage: 'Target',
    findString: migrationAnchor,
    rebase: true,
    expressions: [
      { find: migrationCondition, replace: '_birth?.donor === "Remy"', expectedMatches: 1 },
      { find: migrationSource, replace: '_birth?.donor', expectedMatches: 1 }
    ]
  });
  state.rows.set(memory.id, structuredClone(memory));
  return memory;
}

async function addSecondBinding(state: ReturnType<typeof fixture>, memory: RepairMemory) {
  const search = '/*Other variables*/';
  const anchor = '<<set $other_flag to true>>';
  const body = '<<set $remyOther to true>>\r\n' + search;
  const after = body.replace(search, anchor);
  const rule = { passage: 'Other', findString: search, replace: '', replaceFile: 'other.twee', debug: false, all: false };
  (state.info.mod.bootJson.addonPlugin![0].params as NonNullable<RepairHandle['twee']>['rule'][]).push(rule);
  state.archive.set('other.twee', body);
  const item = { name: 'Other', content: anchor };
  state.final.passageDataItems.items.push(item);
  state.final.passageDataItems.map.set(item.name, item);
  await RepairTargets.prepareRules(state.host);
  const content = NativeJSON.stringify({ passage: rule.passage, findString: search });
  const location = RepairTargets.tweeRules(state.host).find(location => location.index === 1)!;
  memory.context.passages!.push({ name: 'Other', current: anchor });
  memory.context.targets.push({
    id: 'target-2',
    modName: 'Old Remy',
    kind: 'twee-replacer',
    path: 'twee-replacer|0|1',
    content,
    fingerprint: await RepairRecipeParser.fingerprint(content),
    signature: RepairTargets.tweeSignature(location)
  });
  const binding = NativeJSON.stringify({ passage: 'Other', findString: anchor, rebase: true });
  memory.recipe.operations.push({ targetId: 'target-2', find: content, replace: binding, expectedMatches: 1, reason: 'Keep the second file feature with its current binding' });
  state.rows.set(memory.id, structuredClone(memory));
  return { rule, item, body, after, binding: NativeJSON.stringify({ passage: 'Other', findString: anchor }) };
}

async function addState(state: ReturnType<typeof fixture>, memory: RepairMemory, variables: object) {
  const path = ['Example', 'progress'];
  const content = RepairState.read(path, variables);
  memory.context.targets.push({
    id: 'state-1',
    modName: 'maplebirch',
    kind: 'state',
    path: NativeJSON.stringify(path),
    content,
    fingerprint: await RepairRecipeParser.fingerprint(content),
    signature: NativeJSON.stringify({ modName: 'maplebirch', path, scope: 'state' })
  });
  memory.recipe.operations.push({ type: 'state', targetId: 'state-1', changes: [{ type: 'set', path: [...path, 'count'], value: 1 }], reason: 'Repair the bound legacy count' });
  state.rows.set(memory.id, structuredClone(memory));
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

test('file expression migration becomes trial and active and replays against a fresh registered ZIP without AI', async () => {
  const state = fixture(undefined, migrationCurrent, migrationSearch, migrationFileBody);
  const memory = await seedMigration(state);
  const fetch = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Migration replay must not call AI'));
  try {
    await state.events.trigger(':addon:repair');
    expect(state.rule).toEqual({ passage: 'Target', findString: migrationAnchor, replace: migrationBody });
    expect(state.item.content).toBe(migrationCurrent);
    expect((await state.repair.list())[0].state).toBe('pending');
    await expect(state.repair.confirm(memory.id)).rejects.toThrow();
    await native(state);
    expect(state.item.content).toBe(migrationDefinition + '\n' + migrationBody);
    expect((await state.repair.list())[0].state).toBe('trial');
    await state.repair.confirm(memory.id);
    expect((await state.repair.list())[0].state).toBe('active');
    expect(state.archive.get('body.twee')).toBe(migrationFileBody);
    const reload = fixture(state.rows, migrationCurrent, migrationSearch, migrationFileBody);
    expect(reload.rule).not.toBe(state.rule);
    expect(reload.rule).toEqual({ passage: 'Target', findString: migrationSearch, replaceFile: 'body.twee' });
    await reload.events.trigger(':addon:repair');
    await native(reload);
    expect(reload.item.content).toBe(migrationDefinition + '\n' + migrationBody);
    expect((await reload.repair.list())[0].state).toBe('active');
    expect(reload.archive.get('body.twee')).toBe(migrationFileBody);
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    fetch.mockRestore();
  }
});

test('live removal or movement of the temporary initializer retracts the derived file body before native reads it', async () => {
  for (const current of [migrationAnchor, migrationAnchor + '\n' + migrationDefinition]) {
    const state = fixture(undefined, current, migrationSearch, migrationFileBody);
    const memory = await seedMigration(state);
    const originalRule = structuredClone(state.rule);
    const read: string[] = [];
    const original = state.patcher.do_patch;
    state.patcher.do_patch = async (info, data) => {
      read.push(state.rule.replace || (await info.modZip.zip.file(state.rule.replaceFile!)!.async('string')));
      await original.call(state.patcher, info, data);
    };
    await state.events.trigger(':addon:repair');
    expect(state.rule.replace).toBe(migrationBody);
    await native(state);
    expect(read).toEqual([migrationFileBody]);
    expect(state.rule).toEqual(originalRule);
    expect(state.item.content).toBe(current);
    expect((state.rows.get(memory.id) as RepairMemory).state).toBe('failed');
    expect(state.archive.get('body.twee')).toBe(migrationFileBody);
  }
});

test('a second native binding failure rolls back both file rules and the state in their shared recipe', async () => {
  const variables: { Example: { progress: { count: string | number; note: string } } } = { Example: { progress: { count: 'legacy', note: 'keep' } } };
  const state = fixture(undefined, migrationCurrent, migrationSearch, migrationFileBody, variables);
  const memory = await seedMigration(state);
  const second = await addSecondBinding(state, memory);
  await addState(state, memory, variables);
  const firstRule = structuredClone(state.rule);
  const secondRule = structuredClone(second.rule);
  await state.events.trigger(':addon:repair');
  expect(state.rule.replace).toBe(migrationBody);
  expect(second.rule.replace).toBe(second.after);
  await state.events.trigger(':variable');
  expect(variables).toEqual({ Example: { progress: { count: 1, note: 'keep' } } });
  second.item.content = 'Another module removed the selected second anchor.';
  await state.patcher.do_patch(state.info, state.final as unknown as TweeData);
  await state.events.trigger(':variable');
  expect(variables).toEqual({ Example: { progress: { count: 'legacy', note: 'keep' } } });
  await state.events.trigger(':modLoaderEnd');
  expect(state.rule).toEqual(firstRule);
  expect(second.rule).toEqual(secondRule);
  expect(variables).toEqual({ Example: { progress: { count: 'legacy', note: 'keep' } } });
  expect(state.archive).toEqual(
    new Map([
      ['body.twee', migrationFileBody],
      ['other.twee', second.body]
    ])
  );
  expect((state.rows.get(memory.id) as RepairMemory).state).toBe('failed');
});

test('an interrupted second body write restores complete original replaceFile and optional-field shapes', async () => {
  const variables = { Example: { progress: { count: 'legacy' } } };
  const state = fixture(undefined, migrationCurrent, migrationSearch, migrationFileBody, variables);
  const memory = await seedMigration(state);
  const second = await addSecondBinding(state, memory);
  await addState(state, memory, variables);
  const firstRule = structuredClone(state.rule);
  const secondRule = structuredClone(second.rule);
  const original = RepairTargets.handle;
  let interrupted = false;
  const handle = spyOn(RepairTargets, 'handle').mockImplementation((host, target, anchors) => {
    const result = original(host, target, anchors);
    if (!result || target.path !== 'twee-replacer|0|1') return result;
    const write = result.write.bind(result);
    result.write = (content, replacement) => {
      write(content, replacement);
      if (!interrupted && content === second.binding) {
        interrupted = true;
        throw new Error('Second write interrupted after changing the rule fields');
      }
    };
    return result;
  });
  try {
    await state.events.trigger(':addon:repair');
    expect(interrupted).toBe(true);
    expect(state.rule).toEqual(firstRule);
    expect(second.rule).toEqual(secondRule);
    expect(state.rule).not.toHaveProperty('replace');
    expect(second.rule).toHaveProperty('replace', '');
    expect(variables).toEqual({ Example: { progress: { count: 'legacy' } } });
    expect((state.rows.get(memory.id) as RepairMemory).state).toBe('stale');
    expect(state.archive).toEqual(
      new Map([
        ['body.twee', migrationFileBody],
        ['other.twee', second.body]
      ])
    );
  } finally {
    handle.mockRestore();
  }
});

test('final migrated output cannot supply its own new reads or temporary initialization as verification evidence', async () => {
  const body = migrationDefinition + '\n' + migrationFileBody;
  const state = fixture(undefined, migrationCurrent, migrationSearch, body);
  const memory = await seedMigration(state);
  const originalRule = structuredClone(state.rule);
  await state.events.trigger(':addon:repair');
  await state.patcher.do_patch(state.info, state.final as unknown as TweeData);
  const migrated = state.rule.replace!;
  expect(migrated).toStartWith(migrationDefinition);
  expect(migrated).toContain('_birth?.donor === "Remy"');
  state.item.content = migrated;
  await state.events.trigger(':modLoaderEnd');
  expect((state.rows.get(memory.id) as RepairMemory).state).toBe('failed');
  expect((state.rows.get(memory.id) as RepairMemory).error).toContain('temporary is not initialized');
  expect(state.rule).toEqual(originalRule);
  expect(state.archive.get('body.twee')).toBe(body);
});

test('an unobservable preceding regex rule retracts the migration before native code reads the file body', async () => {
  const state = fixture(undefined, migrationCurrent, migrationSearch, migrationFileBody);
  const memory = await seedMigration(state);
  const originalRule = structuredClone(state.rule);
  const read: string[] = [];
  const original = state.patcher.do_patch;
  state.patcher.do_patch = async (info, data) => {
    read.push(state.rule.replace || (await info.modZip.zip.file(state.rule.replaceFile!)!.async('string')));
    await original.call(state.patcher, info, data);
  };
  await state.events.trigger(':addon:repair');
  expect(state.rule.replace).toBe(migrationBody);
  (state.info.mod.bootJson.addonPlugin![0].params as NonNullable<RepairHandle['twee']>['rule'][]).unshift({ passage: 'Target', findRegex: 'Alex', replace: 'Alex' });
  await native(state);
  expect(read).toEqual([migrationFileBody]);
  expect(state.rule).toEqual(originalRule);
  expect(state.item.content).toBe(migrationCurrent);
  expect((state.rows.get(memory.id) as RepairMemory).state).toBe('failed');
  expect(state.archive.get('body.twee')).toBe(migrationFileBody);
});
