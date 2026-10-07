import { expect, test } from 'bun:test';
import type Diagnostics from '../../../src/infra/Diagnostics';
import { RepairProof } from '../../../src/services/Repair/Proof';
import type { RepairHandle } from '../../../src/services/Repair/Targets';
import type { ModBootJsonAddonPluginTweeReplacer } from '@scml/types/Mod_TweeReplacer/TweeReplacer';

type Patcher = NonNullable<RepairHandle['patcher']>;
type PatchData = Parameters<Patcher['applyReplacePatcher']>[0];
type TweePatcher = NonNullable<RepairHandle['twee']>['patcher'];
type TweeInfo = Parameters<TweePatcher['do_patch']>[0];
type TweeData = Parameters<TweePatcher['do_patch']>[1];
type TweeRule = NonNullable<RepairHandle['twee']>['rule'];

function diagnosticsFixture() {
  const writes: Array<Parameters<Diagnostics['write']>> = [];
  const diagnostics = { write: (...args: Parameters<Diagnostics['write']>) => writes.push(args) } as unknown as Diagnostics;
  return { diagnostics, writes };
}

function fixture(source: string, definitions: Array<{ from: string; to: string }>) {
  const rules = definitions.map(rule => ({ ...rule, fileName: 'source.twee', passageName: 'Target' }));
  const item = { id: 1, name: 'Target', tags: [], content: source };
  const data = {
    passageDataItems: { items: [item] },
    scriptFileItems: { items: [] },
    styleFileItems: { items: [] }
  } as unknown as PatchData;
  let calls = 0;
  const patcher = {
    patchInfo: { twee: rules },
    patchInfoMap: { twee: new Map([['Target', rules]]), js: new Map(), css: new Map() },
    applyReplacePatcher(this: Patcher, input: PatchData) {
      calls++;
      expect(this).toBe(patcher);
      for (const target of input.passageDataItems.items) for (const rule of this.patchInfoMap.twee.get(target.name) || []) target.content = target.content.replace(rule.from, () => rule.to);
    }
  } as unknown as Patcher;
  const handles: RepairHandle[] = rules.map(rule => ({
    read: () => rule.from,
    write: content => {
      rule.from = content;
    },
    output: { kind: 'twee', path: 'Target', replacement: rule.to },
    patcher,
    rule
  }));
  return {
    ...diagnosticsFixture(),
    patcher,
    data,
    handles,
    item,
    get calls() {
      return calls;
    }
  };
}

test('preexisting replacement text cannot prove that a missing anchor matched', () => {
  const state = fixture('already patched', [{ from: 'missing', to: 'already patched' }]);
  const original = state.patcher.applyReplacePatcher;
  const proof = RepairProof.observe(state.handles, state.diagnostics);
  expect(proof.verify(state.handles[0])).toBe(false);
  expect(proof.sequence(state.handles[0])).toBe(0);
  state.patcher.applyReplacePatcher(state.data);
  expect(state.calls).toBe(1);
  expect(proof.verify(state.handles[0])).toBe(false);
  expect(proof.output(state.handles[0])).toBeUndefined();
  expect(proof.sequence(state.handles[0])).toBe(0);
  expect(state.patcher.applyReplacePatcher).toBe(original);
});

test('proof follows preceding rules, first occurrence semantics and literal replacement dollars', () => {
  const state = fixture('old old', [
    { from: 'old', to: 'middle' },
    { from: 'middle', to: '$&' },
    { from: '$&', to: '$1\\path' }
  ]);
  const original = state.patcher.applyReplacePatcher;
  const proof = RepairProof.observe(state.handles.slice(1), state.diagnostics);
  state.patcher.applyReplacePatcher(state.data);
  expect(state.item.content).toBe('$1\\path old');
  expect(proof.verify(state.handles[1])).toBe(true);
  expect(proof.verify(state.handles[2])).toBe(true);
  expect(proof.output(state.handles[1])).toBe('$1\\path old');
  expect(state.patcher.applyReplacePatcher).toBe(original);
  proof.restore();
  expect(state.patcher.applyReplacePatcher).toBe(original);
});

test('separate repair records share one observer and restoration order cannot retain a wrapper', () => {
  const state = fixture('old second', [
    { from: 'old', to: 'new' },
    { from: 'second', to: 'last' }
  ]);
  const original = state.patcher.applyReplacePatcher;
  const first = RepairProof.observe([state.handles[0]], state.diagnostics);
  const wrapper = state.patcher.applyReplacePatcher;
  const second = RepairProof.observe([state.handles[1]], state.diagnostics);
  expect(state.patcher.applyReplacePatcher).toBe(wrapper);
  first.restore();
  expect(state.patcher.applyReplacePatcher).toBe(wrapper);
  state.patcher.applyReplacePatcher(state.data);
  expect(first.verify(state.handles[0])).toBe(false);
  expect(second.verify(state.handles[1])).toBe(true);
  expect(state.calls).toBe(1);
  second.restore();
  expect(state.patcher.applyReplacePatcher).toBe(original);
});

test('distinct patchers on the same passage expose their observed output order', () => {
  const first = fixture('old', [{ from: 'old', to: 'middle' }]);
  const second = fixture('unused', [{ from: 'middle', to: 'final' }]);
  const firstOriginal = first.patcher.applyReplacePatcher;
  const secondOriginal = second.patcher.applyReplacePatcher;
  const firstProof = RepairProof.observe(first.handles, first.diagnostics);
  const secondProof = RepairProof.observe(second.handles, second.diagnostics);
  first.patcher.applyReplacePatcher(first.data);
  second.patcher.applyReplacePatcher(first.data);
  expect(first.item.content).toBe('final');
  expect(firstProof.verify(first.handles[0])).toBe(true);
  expect(secondProof.verify(second.handles[0])).toBe(true);
  expect(firstProof.output(first.handles[0])).toBe('middle');
  expect(secondProof.output(second.handles[0])).toBe('final');
  expect(firstProof.sequence(first.handles[0])).toBeGreaterThan(0);
  expect(secondProof.sequence(second.handles[0])).toBeGreaterThan(firstProof.sequence(first.handles[0]));
  expect(first.patcher.applyReplacePatcher).toBe(firstOriginal);
  expect(second.patcher.applyReplacePatcher).toBe(secondOriginal);
});

test('unused observations restore an inherited method without changing the object shape', () => {
  const state = fixture('old', [{ from: 'old', to: 'new' }]);
  const original = state.patcher.applyReplacePatcher;
  Object.setPrototypeOf(state.patcher, { applyReplacePatcher: original });
  Reflect.deleteProperty(state.patcher, 'applyReplacePatcher');
  const proof = RepairProof.observe(state.handles, state.diagnostics);
  expect(Object.hasOwn(state.patcher, 'applyReplacePatcher')).toBe(true);
  proof.restore();
  expect(Object.hasOwn(state.patcher, 'applyReplacePatcher')).toBe(false);
  expect(state.patcher.applyReplacePatcher).toBe(original);
});

test('original errors propagate and the patcher is restored after a failed call', () => {
  const state = fixture('old', [{ from: 'old', to: 'new' }]);
  const failure = new Error('Existing patch failed');
  const original = () => {
    throw failure;
  };
  state.patcher.applyReplacePatcher = original;
  const proof = RepairProof.observe(state.handles, state.diagnostics);
  expect(() => state.patcher.applyReplacePatcher(state.data)).toThrow(failure);
  expect(proof.verify(state.handles[0])).toBe(false);
  expect(state.patcher.applyReplacePatcher).toBe(original);
});

test('restoration preserves a later patcher method installed by another module', () => {
  const state = fixture('old', [{ from: 'old', to: 'new' }]);
  const proof = RepairProof.observe(state.handles, state.diagnostics);
  const later = () => {};
  state.patcher.applyReplacePatcher = later;
  proof.restore();
  expect(state.patcher.applyReplacePatcher).toBe(later);
  expect(proof.verify(state.handles[0])).toBe(false);
});

test('proof rejects a patcher that does not produce its existing ordered rule output', () => {
  const state = fixture('old', [{ from: 'old', to: 'new' }]);
  const original = state.patcher.applyReplacePatcher;
  state.patcher.applyReplacePatcher = function (data: PatchData) {
    original.call(this, data);
    data.passageDataItems.items[0].content = 'different output';
  };
  const altered = state.patcher.applyReplacePatcher;
  const proof = RepairProof.observe(state.handles, state.diagnostics);
  state.patcher.applyReplacePatcher(state.data);
  expect(state.item.content).toBe('different output');
  expect(proof.verify(state.handles[0])).toBe(false);
  expect(state.patcher.applyReplacePatcher).toBe(altered);
});

function tweeFixture(source: string, definitions: TweeRule[]) {
  const rules = definitions.map(rule => ({ ...rule }));
  const item = { id: 1, name: 'Target', tags: [], content: source };
  const data = { passageDataItems: { items: [item], map: new Map([['Target', item]]) } } as unknown as TweeData;
  const mod = {
    name: 'Free Attitudes',
    bootJson: { addonPlugin: [{ modName: 'TweeReplacer', addonName: 'TweeReplacerAddon', params: rules }] }
  } as TweeInfo['mod'];
  const info = { addonName: 'TweeReplacerAddon', mod } as TweeInfo;
  let calls = 0;
  const patcher = {
    info: new Map([[mod.name, info]]),
    async do_patch(this: TweePatcher, input: TweeInfo, sc: TweeData) {
      calls++;
      expect(this).toBe(patcher);
      const entry = input.mod.bootJson.addonPlugin?.find(addon => addon.modName === 'TweeReplacer' && addon.addonName === 'TweeReplacerAddon');
      for (const rule of (entry?.params || []) as TweeRule[]) {
        const passage = sc.passageDataItems.map.get(rule.passage);
        if (!passage || !rule.findString || !rule.replace || !passage.content.includes(rule.findString)) continue;
        passage.content = rule.all ? passage.content.replaceAll(rule.findString, rule.replace) : passage.content.replace(rule.findString, rule.replace);
      }
    }
  } as unknown as TweePatcher;
  const handles: RepairHandle[] = rules.map(rule => ({
    read: () => rule.findString!,
    write: content => {
      rule.findString = content;
    },
    get output() {
      return { kind: 'twee' as const, path: rule.passage, replacement: rule.replace };
    },
    twee: { patcher, mod, rule }
  }));
  return {
    ...diagnosticsFixture(),
    patcher,
    info,
    data,
    handles,
    item,
    rules,
    get calls() {
      return calls;
    }
  };
}

test('native TweeReplacer observation follows rule order, all and replacement dollar semantics', async () => {
  const state = tweeFixture('old old', [
    { passage: 'Target', findString: 'old', replace: 'middle', all: true },
    { passage: 'Target', findString: 'middle middle', replace: '$&!', all: true }
  ]);
  const original = state.patcher.do_patch;
  const proof = RepairProof.observe(state.handles.slice(1), state.diagnostics);
  await state.patcher.do_patch(state.info, state.data);
  expect(state.item.content).toBe('middle middle!');
  expect(state.calls).toBe(1);
  expect(proof.verify(state.handles[1])).toBe(true);
  expect(proof.output(state.handles[1])).toBe('middle middle!');
  expect(state.patcher.do_patch).toBe(original);
});

test('a remembered unique anchor is not proved when live source now has two matches', async () => {
  const state = tweeFixture('new anchor new anchor', [{ passage: 'Target', findString: 'new anchor', replace: 'existing replacement' }]);
  const original = state.patcher.do_patch;
  const proof = RepairProof.observe(state.handles, state.diagnostics);
  await state.patcher.do_patch(state.info, state.data);
  expect(state.item.content).toBe('existing replacement new anchor');
  expect(state.calls).toBe(1);
  expect(proof.verify(state.handles[0])).toBe(false);
  expect(proof.output(state.handles[0])).toBeUndefined();
  expect(state.patcher.do_patch).toBe(original);
});

test('a shared TweeReplacer instance retains the observer until the repaired mod executes', async () => {
  const state = tweeFixture('old', [{ passage: 'Target', findString: 'old', replace: 'new' }]);
  const other = tweeFixture('unused', []);
  state.patcher.info.set((other.info.mod.name = 'Unrelated'), other.info);
  const original = state.patcher.do_patch;
  const proof = RepairProof.observe(state.handles, state.diagnostics);
  const wrapper = state.patcher.do_patch;
  await state.patcher.do_patch(other.info, state.data);
  expect(state.patcher.do_patch).toBe(wrapper);
  expect(proof.verify(state.handles[0])).toBe(false);
  await state.patcher.do_patch(state.info, state.data);
  expect(state.calls).toBe(2);
  expect(proof.verify(state.handles[0])).toBe(true);
  expect(state.patcher.do_patch).toBe(original);
});

test('missing passage or consumed duplicate anchor does not receive TweeReplacer proof', async () => {
  const state = tweeFixture('old', [
    { passage: 'Target', findString: 'old', replace: 'new' },
    { passage: 'Target', findString: 'old', replace: 'second' },
    { passage: 'Widgets Stats', findString: '<<sub_check>>', replace: ' ' }
  ]);
  const proof = RepairProof.observe(state.handles, state.diagnostics);
  await state.patcher.do_patch(state.info, state.data);
  expect(proof.verify(state.handles[0])).toBe(true);
  expect(proof.verify(state.handles[1])).toBe(false);
  expect(proof.verify(state.handles[2])).toBe(false);
});

test('unregistered info and preexisting output cannot prove a native repaired rule matched', async () => {
  const state = tweeFixture('already patched', [{ passage: 'Target', findString: 'missing', replace: 'already patched' }]);
  const proof = RepairProof.observe(state.handles, state.diagnostics);
  await state.patcher.do_patch({ ...state.info }, state.data);
  expect(proof.verify(state.handles[0])).toBe(false);
  expect(proof.output(state.handles[0])).toBeUndefined();
  proof.restore();
});

test('native TweeReplacer and main ReplacePatcher share their actual output sequence', async () => {
  const main = fixture('old', [{ from: 'old', to: 'middle' }]);
  const native = tweeFixture('middle', [{ passage: 'Target', findString: 'middle', replace: 'final' }]);
  native.data.passageDataItems.items = main.data.passageDataItems.items;
  native.data.passageDataItems.map.set('Target', main.item);
  const proof = RepairProof.observe([...main.handles, ...native.handles], main.diagnostics);
  main.patcher.applyReplacePatcher(main.data);
  await native.patcher.do_patch(native.info, native.data);
  expect(main.item.content).toBe('final');
  expect(proof.output(main.handles[0])).toBe('middle');
  expect(proof.output(native.handles[0])).toBe('final');
  expect(proof.sequence(native.handles[0])).toBeGreaterThan(proof.sequence(main.handles[0]));
});

test('multiple memory records share native observer ownership and restore the inherited method', async () => {
  const state = tweeFixture('old second', [
    { passage: 'Target', findString: 'old', replace: 'new' },
    { passage: 'Target', findString: 'second', replace: 'last' }
  ]);
  const original = state.patcher.do_patch;
  Object.setPrototypeOf(state.patcher, { do_patch: original });
  Reflect.deleteProperty(state.patcher, 'do_patch');
  const first = RepairProof.observe([state.handles[0]], state.diagnostics);
  const wrapper = state.patcher.do_patch;
  const second = RepairProof.observe([state.handles[1]], state.diagnostics);
  expect(state.patcher.do_patch).toBe(wrapper);
  first.restore();
  await state.patcher.do_patch(state.info, state.data);
  expect(first.verify(state.handles[0])).toBe(false);
  expect(second.verify(state.handles[1])).toBe(true);
  expect(Object.hasOwn(state.patcher, 'do_patch')).toBe(false);
  expect(state.patcher.do_patch).toBe(original);
});

test('native exceptions propagate and cannot leave a proof or retained wrapper', async () => {
  const state = tweeFixture('old', [{ passage: 'Target', findString: 'old', replace: 'new' }]);
  const failure = new Error('Existing native error');
  const original = async () => {
    throw failure;
  };
  state.patcher.do_patch = original;
  const proof = RepairProof.observe(state.handles, state.diagnostics);
  await expect(state.patcher.do_patch(state.info, state.data)).rejects.toBe(failure);
  expect(proof.verify(state.handles[0])).toBe(false);
  expect(state.patcher.do_patch).toBe(original);
});

test('native unexpected output and unsupported external rule lists remain unverified', async () => {
  const state = tweeFixture('old', [{ passage: 'Target', findString: 'old', replace: 'new' }]);
  (state.info.mod.bootJson.addonPlugin![0] as ModBootJsonAddonPluginTweeReplacer).paramsFiles = ['external.json'];
  const proof = RepairProof.observe(state.handles, state.diagnostics);
  await state.patcher.do_patch(state.info, state.data);
  expect(state.item.content).toBe('new');
  expect(proof.verify(state.handles[0])).toBe(false);

  const changed = tweeFixture('old', [{ passage: 'Target', findString: 'old', replace: 'new' }]);
  const original = changed.patcher.do_patch;
  changed.patcher.do_patch = async function (info, data) {
    await original.call(this, info, data);
    data.passageDataItems.map.get('Target')!.content = 'different';
  };
  const changedProof = RepairProof.observe(changed.handles, changed.diagnostics);
  await changed.patcher.do_patch(changed.info, changed.data);
  expect(changedProof.verify(changed.handles[0])).toBe(false);
});

test('preparation errors log to the owning diagnostics without affecting another subscriber or the native patch', () => {
  const state = fixture('old second', [
    { from: 'old', to: 'new' },
    { from: 'second', to: 'last' }
  ]);
  const other = diagnosticsFixture();
  const failure = new Error('Cannot read the repair output');
  Object.defineProperty(state.handles[0], 'output', {
    get: () => {
      throw failure;
    }
  });
  const original = state.patcher.applyReplacePatcher;
  const first = RepairProof.observe([state.handles[0]], state.diagnostics);
  const second = RepairProof.observe([state.handles[1]], other.diagnostics);
  state.patcher.applyReplacePatcher(state.data);
  expect(state.item.content).toBe('new last');
  expect(state.calls).toBe(1);
  expect(first.verify(state.handles[0])).toBe(false);
  expect(second.verify(state.handles[1])).toBe(true);
  expect(state.writes).toEqual([['修复预期计算失败：ReplacePatcher:Target', 'WARN', 'repair', failure]]);
  expect(other.writes).toEqual([]);
  expect(state.patcher.applyReplacePatcher).toBe(original);
});

test('ReplacePatcher result inspection failures are recorded without altering its output or restoration', () => {
  const state = fixture('old', [{ from: 'old', to: 'new' }]);
  const failure = new Error('Cannot inspect the patched items');
  const native = state.patcher.applyReplacePatcher;
  const original = function (this: Patcher, data: PatchData) {
    native.call(this, data);
    Object.defineProperty(data.passageDataItems, 'items', {
      get: () => {
        throw failure;
      }
    });
  };
  state.patcher.applyReplacePatcher = original;
  const proof = RepairProof.observe(state.handles, state.diagnostics);
  expect(state.patcher.applyReplacePatcher(state.data)).toBeUndefined();
  expect(state.item.content).toBe('new');
  expect(proof.verify(state.handles[0])).toBe(false);
  expect(state.writes).toEqual([['修复结果校验失败：ReplacePatcher:Target', 'WARN', 'repair', failure]]);
  expect(state.patcher.applyReplacePatcher).toBe(original);
});

test('native TweeReplacer expectation failures retain diagnostics and normal patch execution', async () => {
  const state = tweeFixture('old', [{ passage: 'Target', findString: 'old', replace: 'new' }]);
  const failure = new Error('Cannot read the native repair output');
  Object.defineProperty(state.handles[0], 'output', {
    get: () => {
      throw failure;
    }
  });
  const original = state.patcher.do_patch;
  const proof = RepairProof.observe(state.handles, state.diagnostics);
  await expect(state.patcher.do_patch(state.info, state.data)).resolves.toBeUndefined();
  expect(state.item.content).toBe('new');
  expect(state.calls).toBe(1);
  expect(proof.verify(state.handles[0])).toBe(false);
  expect(state.writes).toEqual([['修复预期计算失败：Free Attitudes:Target', 'WARN', 'repair', failure]]);
  expect(state.patcher.do_patch).toBe(original);
});

test('native TweeReplacer result inspection failures log the target and preserve its result', async () => {
  const state = tweeFixture('old', [{ passage: 'Target', findString: 'old', replace: 'new' }]);
  const failure = new Error('Cannot inspect the native passage map');
  const native = state.patcher.do_patch;
  const original = async function (this: TweePatcher, info: TweeInfo, data: TweeData) {
    await native.call(this, info, data);
    Object.defineProperty(data.passageDataItems, 'map', {
      get: () => {
        throw failure;
      }
    });
  };
  state.patcher.do_patch = original;
  const proof = RepairProof.observe(state.handles, state.diagnostics);
  await expect(state.patcher.do_patch(state.info, state.data)).resolves.toBeUndefined();
  expect(state.item.content).toBe('new');
  expect(proof.verify(state.handles[0])).toBe(false);
  expect(state.writes).toEqual([['修复结果校验失败：Free Attitudes:Target', 'WARN', 'repair', failure]]);
  expect(state.patcher.do_patch).toBe(original);
});
