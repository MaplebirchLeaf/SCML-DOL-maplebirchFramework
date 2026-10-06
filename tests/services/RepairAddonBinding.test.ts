import './runtime';
import { expect, test } from 'bun:test';
import type { ReplaceParams } from '@scml/types/Mod_ReplacePatch/ReplacePatcher';
import type ModLoader from '../../src/host/ModLoader';
import type IndexedDB from '../../src/services/IndexedDB';
import Emitter from '../../src/infra/Emitter';
import Diagnostics from '../../src/infra/Diagnostics';
import Repair, { type RepairMemory } from '../../src/services/Repair';
import { RepairProof } from '../../src/services/Repair/Proof';
import { RepairTargets, type RepairHandle } from '../../src/services/Repair/Targets';
import { NativeJSON } from '../../src/services/Repair/Json';
import { RepairRecipeParser, type RepairContext } from '../../src/services/Repair/Recipe';

type Addon = NonNullable<RepairHandle['addon']>['patcher'];
type Data = Parameters<Addon['do_patch']>[1];
type Rule = NonNullable<RepairHandle['addon']>['rule'];

const destination = 'game\\03-JavaScript\\04-Pregnancy\\pregnancy-lifecycle.js';

function fixture(
  rows = new Map<string, unknown>(),
  definitions: Rule[] = [{ fileName: 'pregnancy.js', from: 'case "Alex":', to: 'case "Remy": case "Alex":' }],
  content = 'switch (name) { case "Alex": break; }'
) {
  const warnings: string[] = [];
  const logger = { log: () => {}, warn: (message: string) => warnings.push(message), error: (message: string) => warnings.push(message) };
  const records = (items: Array<{ name: string; content: string }>) => ({
    items,
    map: new Map(items.map(item => [item.name, item])),
    back2Array() {
      this.items = [...this.map.values()];
    },
    getByNameWithOrWithoutPath(name: string) {
      return this.map.get(name) || this.items.find(item => item.name.split(/[\\/]/).at(-1) === name);
    }
  });
  const cache = () => ({ passageDataItems: records([]), scriptFileItems: records([]), styleFileItems: records([]) });
  const data = { ...cache(), scriptFileItems: records([{ name: destination, content }]) };
  const rules = definitions.map(rule => ({ ...rule }));
  const params = { js: rules };
  const mod = { name: 'Remy Love Mod', cache: cache(), replacePatcher: [], bootJson: { addonPlugin: [{ modName: 'ReplacePatcher', addonName: 'ReplacePatcherAddon', params }] } };
  const patcher = {
    info: new Map<string, Parameters<Addon['do_patch']>[0]>(),
    checkParams(value: unknown): value is ReplaceParams {
      return !!value && typeof value === 'object';
    },
    async do_patch(this: Addon, info: Parameters<Addon['do_patch']>[0], data: Data) {
      const params = info.mod.bootJson.addonPlugin?.find(entry => entry.modName === 'ReplacePatcher' && entry.addonName === 'ReplacePatcherAddon')?.params;
      if (!this.checkParams(params)) return;
      for (const kind of ['js', 'css', 'twee'] as const) {
        const records = kind === 'js' ? data.scriptFileItems : kind === 'css' ? data.styleFileItems : data.passageDataItems;
        for (const rule of params[kind] || []) {
          const path = RepairTargets.replacePath(rule, kind)!;
          const item = kind === 'twee' ? records.map.get(path) : records.getByNameWithOrWithoutPath(path);
          if (!item?.content.includes(rule.from)) continue;
          item.content = rule.all ? item.content.replaceAll(rule.from, rule.to) : item.content.replace(rule.from, rule.to);
        }
        records.back2Array();
      }
    }
  } as unknown as Addon;
  const info = { addonName: 'ReplacePatcherAddon', mod, modZip: undefined } as unknown as Parameters<Addon['do_patch']>[0];
  patcher.info.set(mod.name, info);
  const plugin = { name: 'ReplacePatcher', cache: cache(), replacePatcher: [], modRef: patcher };
  const events = new Emitter();
  const idb = {
    define: () => true,
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
  const host = {
    diagnostics: new Diagnostics({} as ModLoader),
    modLoaderGui: { gLoadingProgress: { logList: [] } },
    modUtils: {
      getLogger: () => logger,
      getModListNameNoAlias: () => [mod.name, plugin.name],
      getMod: (name: string) => (name === mod.name ? mod : name === plugin.name ? plugin : undefined)
    },
    modSC2DataManager: { getSC2DataInfoAfterPatch: () => data, getSC2DataInfoCache: cache }
  } as unknown as ModLoader;
  const repair = new Repair(idb, host, events);
  return { host, data, patcher, info, mod, rules, params, repair, rows, events, warnings };
}

async function target(state: ReturnType<typeof fixture>, index = 0) {
  const location = [...RepairTargets.replaceRules(state.host)][index];
  const content = RepairTargets.replaceBinding(location.rule, location.kind);
  return {
    id: 'target-1',
    modName: location.modName,
    kind: 'replace-patcher' as const,
    path: location.path,
    content,
    fingerprint: await RepairRecipeParser.fingerprint(content),
    signature: RepairTargets.replaceSignature(location.rule)
  };
}

test('only registered addon rules are writable and relocation preserves native rule identity and body', async () => {
  const state = fixture();
  const binding = await target(state);
  expect(binding.path).toBe('replace-addon|0|js|0|binding');
  state.mod.bootJson.addonPlugin.push({ ...state.mod.bootJson.addonPlugin[0], params: { js: [{ fileName: 'ignored.js', from: 'unused', to: 'unused2' }] } });
  expect([...RepairTargets.replaceRules(state.host)]).toHaveLength(1);
  const handle = RepairTargets.handle(state.host, binding)!;
  const before = handle.read();
  const body = state.rules[0].to;
  handle.write(NativeJSON.stringify({ fileName: destination, from: state.rules[0].from }));
  expect(handle.output.path).toBe(destination);
  expect(handle.addon?.rule).toBe(state.params.js[0]);
  expect(state.rules[0].to).toBe(body);
  handle.write(before);
  expect(handle.read()).toBe(binding.content);
  expect(state.rules[0].to).toBe(body);
  state.patcher.info.clear();
  expect(RepairTargets.handle(state.host, binding)).toBeUndefined();
});

test('native addon proof follows preceding rules, all and replacement string dollar semantics', async () => {
  const state = fixture(
    undefined,
    [
      { fileName: destination, from: 'old', to: 'middle', all: true },
      { fileName: 'old.js', from: 'middle middle', to: '$&!' }
    ],
    'old old'
  );
  const binding = await target(state, 1);
  const handle = RepairTargets.handle(state.host, binding)!;
  handle.write(NativeJSON.stringify({ fileName: destination, from: 'middle middle' }));
  const original = state.patcher.do_patch;
  const proof = RepairProof.observe([handle], state.repair);
  expect(proof.verify(handle)).toBe(false);
  await state.patcher.do_patch(state.info, state.data as unknown as Data);
  expect(state.data.scriptFileItems.map.get(destination)?.content).toBe('middle middle!');
  expect(proof.verify(handle)).toBe(true);
  expect(proof.output(handle)).toBe('middle middle!');
  expect(proof.sequence(handle)).toBeGreaterThan(0);
  expect(state.patcher.do_patch).toBe(original);
});

test.each(['missing anchor', 'case "Alex": case "Alex":'])('native input %s cannot receive successful repair proof', async content => {
  const state = fixture(undefined, undefined, content);
  const handle = RepairTargets.handle(state.host, await target(state))!;
  handle.write(NativeJSON.stringify({ fileName: destination, from: state.rules[0].from }));
  const proof = RepairProof.observe([handle], state.repair);
  await state.patcher.do_patch(state.info, state.data as unknown as Data);
  expect(proof.verify(handle)).toBe(false);
  expect(proof.output(handle)).toBeUndefined();
});

test('overlapping native addon search matches remain unverified', async () => {
  const state = fixture(undefined, [{ fileName: 'old.js', from: 'aba', to: 'replacement' }], 'ababa');
  const handle = RepairTargets.handle(state.host, await target(state))!;
  handle.write(NativeJSON.stringify({ fileName: destination, from: 'aba' }));
  const proof = RepairProof.observe([handle], state.repair);
  await state.patcher.do_patch(state.info, state.data as unknown as Data);
  expect(proof.verify(handle)).toBe(false);
});

test.each([
  { source: 'ababa', from: 'aba' },
  { source: 'old old', from: 'old' }
])('core binding rejects repeated or overlapping actual search matches: $source', ({ source, from }) => {
  type Core = NonNullable<RepairHandle['patcher']>;
  type CoreData = Parameters<Core['applyReplacePatcher']>[0];
  const rule = { fileName: destination, from, to: 'replacement' };
  const item = { name: destination, content: source };
  const patcher = {
    patchInfoMap: { js: new Map([[destination, [rule]]]), twee: new Map(), css: new Map() },
    applyReplacePatcher(data: CoreData) {
      const current = data.scriptFileItems.items[0];
      current.content = current.content.replace(rule.from, () => rule.to);
    }
  } as unknown as Core;
  const handle: RepairHandle = { read: () => '', write: () => {}, output: { kind: 'js', path: destination, replacement: rule.to }, patcher, rule, binding: true };
  const data = { scriptFileItems: { items: [item] } } as unknown as CoreData;
  const proof = RepairProof.observe([handle], fixture().repair);
  patcher.applyReplacePatcher(data);
  expect(proof.verify(handle)).toBe(false);
});

test('native addon output changed by another wrapper is rejected and the wrapper is restored', async () => {
  const state = fixture();
  const handle = RepairTargets.handle(state.host, await target(state))!;
  handle.write(NativeJSON.stringify({ fileName: destination, from: state.rules[0].from }));
  const original = state.patcher.do_patch;
  const altered = async function (this: Addon, info: Parameters<Addon['do_patch']>[0], data: Data) {
    await original.call(this, info, data);
    data.scriptFileItems.map.get(destination)!.content = 'overwritten';
  };
  state.patcher.do_patch = altered;
  const proof = RepairProof.observe([handle], state.repair);
  await state.patcher.do_patch(state.info, state.data as unknown as Data);
  expect(proof.verify(handle)).toBe(false);
  expect(state.patcher.do_patch).toBe(altered);
});

async function seed(state: ReturnType<typeof fixture>): Promise<RepairMemory> {
  const binding = await target(state);
  const context: RepairContext = {
    requestId: 'native-addon',
    mods: [state.mod.name],
    diagnostics: [],
    modLoaderLogs: [],
    patches: [],
    conflicts: [],
    sources: [{ name: destination, kind: 'js', current: state.data.scriptFileItems.map.get(destination)!.content }],
    targets: [binding]
  };
  const recipe = {
    requestId: context.requestId,
    outcome: 'repair' as const,
    summary: 'Relocate the existing pregnancy rule',
    evidence: [],
    operations: [
      {
        targetId: binding.id,
        find: binding.content,
        replace: NativeJSON.stringify({ fileName: destination, from: state.rules[0].from }),
        expectedMatches: 1,
        reason: 'Observed source contains the old anchor in the new file'
      }
    ]
  };
  const memory: RepairMemory = { id: 'memory:native-addon', state: 'pending', enabled: true, createdAt: '2026-10-06T00:00:00.000Z', summary: recipe.summary, recipe, context };
  state.rows.set(memory.id, structuredClone(memory));
  return memory;
}

test('addon memory remains pending before native hooks and enters trial only after observed native output', async () => {
  const state = fixture();
  const memory = await seed(state);
  await state.events.trigger(':addon:repair');
  expect(state.rules[0].fileName).toBe(destination);
  await state.events.trigger(':addon:verify');
  expect((await state.repair.list())[0].state).toBe('pending');
  await state.patcher.do_patch(state.info, state.data as unknown as Data);
  await state.events.trigger(':modLoaderEnd');
  expect((await state.repair.list())[0].state).toBe('trial');
  await state.repair.confirm(memory.id);
  expect((await state.repair.list())[0].state).toBe('active');
  const reload = fixture(state.rows);
  await reload.events.trigger(':addon:repair');
  await reload.patcher.do_patch(reload.info, reload.data as unknown as Data);
  await reload.events.trigger(':modLoaderEnd');
  expect((await reload.repair.list())[0].state).toBe('active');
});

test('changed replacement text or native all semantics invalidate existing addon memory', async () => {
  const state = fixture();
  await seed(state);
  state.rules[0].to = 'another replacement';
  await state.events.trigger(':addon:repair');
  expect((await state.repair.list())[0].state).toBe('stale');
  expect(state.rules[0].fileName).toBe('pregnancy.js');
  const allState = fixture(undefined, [{ fileName: 'pregnancy.js', from: 'case "Alex":', to: 'case "Remy": case "Alex":', all: false }]);
  const binding = await target(allState);
  expect(binding.signature).toBe(NativeJSON.stringify({ to: allState.rules[0].to, all: false }));
  allState.rules[0].all = true;
  expect(RepairTargets.handle(allState.host, binding)).toBeUndefined();
});
