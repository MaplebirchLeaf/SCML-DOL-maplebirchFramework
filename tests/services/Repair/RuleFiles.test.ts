import { expect, test } from 'bun:test';
import type ModLoader from '../../../src/host/ModLoader';
import type { ReplaceParams } from '@scml/types/Mod_TweeReplacer/TweeReplacer';
import { RepairTargets, type RepairHandle } from '../../../src/services/Repair/Targets';
import { RepairProof } from '../../../src/services/Repair/Proof';
import { NativeJSON } from '../../../src/services/Repair/Json';

function fixture(rules: ReplaceParams[], contents: Record<string, string>, paramsFiles?: string[]) {
  const files = new Map(Object.entries(contents));
  const reads: string[] = [];
  const warnings: unknown[] = [];
  const zip = {
    file(path: string) {
      reads.push(path);
      if (!files.has(path)) return null;
      return { async: async () => files.get(path) };
    }
  };
  const mod = {
    name: 'File Rules',
    bootJson: { addonPlugin: [{ modName: 'TweeReplacer', addonName: 'TweeReplacerAddon', params: rules, ...(paramsFiles && { paramsFiles }) }] }
  };
  const info = { mod, modZip: { zip }, addonName: 'TweeReplacerAddon' };
  const patcher = {
    info: new Map([[mod.name, info]]),
    async do_patch(input: typeof info, data: { passageDataItems: { map: Map<string, { content: string }> } }) {
      for (const rule of input.mod.bootJson.addonPlugin[0].params) {
        const passage = data.passageDataItems.map.get(rule.passage);
        if (!passage || !rule.findString) continue;
        const replacement = rule.replace || (await input.modZip.zip.file(rule.replaceFile!)?.async());
        if (!replacement || !passage.content.includes(rule.findString)) continue;
        passage.content = rule.all ? passage.content.replaceAll(rule.findString, replacement) : passage.content.replace(rule.findString, replacement);
      }
    }
  };
  const host = {
    diagnostics: { write: (...args: unknown[]) => warnings.push(args) },
    modUtils: {
      getModListNameNoAlias: () => [mod.name, 'TweeReplacer'],
      getMod: (name: string) => (name === mod.name ? mod : name === 'TweeReplacer' ? { modRef: patcher } : undefined)
    }
  } as unknown as ModLoader;
  const handle = (index: number) => {
    const location = RepairTargets.tweeRules(host).find(rule => rule.index === index)!;
    return RepairTargets.handle(host, {
      id: `target-${index}`,
      modName: mod.name,
      kind: 'twee-replacer',
      path: `twee-replacer|0|${index}`,
      fingerprint: `sha256:${'0'.repeat(64)}`,
      content: NativeJSON.stringify({ passage: rules[index].passage, findString: rules[index].findString }),
      signature: RepairTargets.tweeSignature(location)
    })!;
  };
  return { host, rules, files, reads, warnings, zip, mod, info, patcher, handle };
}

test('registered file bodies are read once per preparation and inline replacement takes precedence', async () => {
  const state = fixture(
    [
      { passage: 'Target', findString: 'first', replaceFile: 'body.twee' },
      { passage: 'Target', findString: 'second', replace: '', replaceFile: 'body.twee' },
      { passage: 'Target', findString: 'third', replace: 'inline', replaceFile: 'ignored.twee' }
    ],
    { 'body.twee': 'file body', 'ignored.twee': 'ignored file body' }
  );
  expect(RepairTargets.tweeRules(state.host).map(rule => rule.index)).toEqual([2]);
  await RepairTargets.prepareRules(state.host);
  expect(state.reads).toEqual(['body.twee']);
  expect(RepairTargets.tweeRules(state.host).map(rule => rule.index)).toEqual([0, 1, 2]);
  expect(state.rules.map(rule => RepairTargets.replacement(rule))).toEqual(['file body', 'file body', 'inline']);
  expect(state.rules[0]).not.toHaveProperty('replace');
  expect(state.files.get('body.twee')).toBe('file body');
});

test('missing files, changed paths and external parameter files do not create writable targets', async () => {
  const state = fixture([{ passage: 'Target', findString: 'old', replaceFile: 'body.twee' }], { 'body.twee': 'file body' });
  await RepairTargets.prepareRules(state.host);
  state.rules[0].replaceFile = 'missing.twee';
  expect(RepairTargets.replacement(state.rules[0])).toBeUndefined();
  await RepairTargets.prepareRules(state.host);
  expect(RepairTargets.tweeRules(state.host)).toEqual([]);
  const external = fixture([{ passage: 'Target', findString: 'old', replaceFile: 'body.twee' }], { 'body.twee': 'file body' }, ['rules.json']);
  await RepairTargets.prepareRules(external.host);
  expect(external.reads).toEqual([]);
  expect(RepairTargets.tweeRules(external.host)).toEqual([]);
});

test('file signatures bind both the file path and its effective bytes while inline signatures stay compatible', async () => {
  const state = fixture(
    [
      { passage: 'Target', findString: 'old', replaceFile: 'body.twee', all: true },
      { passage: 'Target', findString: 'inline', replace: 'inline body', debug: false }
    ],
    { 'body.twee': 'first body' }
  );
  await RepairTargets.prepareRules(state.host);
  const first = RepairTargets.tweeSignature(RepairTargets.tweeRules(state.host)[0]);
  expect(NativeJSON.parse(first)).toEqual({ companion: { replaceFile: 'body.twee', all: true }, replacement: 'first body' });
  expect(RepairTargets.tweeSignature(RepairTargets.tweeRules(state.host)[1])).toBe(NativeJSON.stringify({ companion: { replace: 'inline body', debug: false } }));
  state.files.set('body.twee', 'second body');
  await RepairTargets.prepareRules(state.host);
  expect(RepairTargets.tweeSignature(RepairTargets.tweeRules(state.host)[0])).not.toBe(first);
  state.files.delete('body.twee');
  await RepairTargets.prepareRules(state.host);
  expect(RepairTargets.tweeRules(state.host).map(rule => rule.index)).toEqual([1]);
});

test('body overlay and rollback modify only loaded fields and preserve original file and option shape', async () => {
  const state = fixture([{ passage: 'Target', findString: 'old', replace: '', replaceFile: 'body.twee', debug: true, all: false }], { 'body.twee': 'original body' });
  await RepairTargets.prepareRules(state.host);
  const rule = state.rules[0];
  const original = { ...rule };
  const signature = RepairTargets.tweeSignature(RepairTargets.tweeRules(state.host)[0]);
  const handle = state.handle(0);
  const before = handle.read();
  const after = NativeJSON.stringify({ passage: 'Renamed', findString: 'current' });
  handle.write(after, 'derived body');
  expect(rule).toEqual({ passage: 'Renamed', findString: 'current', replace: 'derived body', debug: true, all: false });
  expect(handle.output).toEqual({ kind: 'twee', path: 'Renamed', replacement: 'derived body' });
  expect(RepairTargets.tweeSignature(RepairTargets.tweeRules(state.host)[0])).toBe(RepairTargets.companionForBody(signature, 'derived body'));
  expect(state.files.get('body.twee')).toBe('original body');
  handle.write(before, 'original body');
  expect(rule).toEqual(original);
  expect(handle.output.replacement).toBe('original body');
  expect(RepairTargets.tweeSignature(RepairTargets.tweeRules(state.host)[0])).toBe(signature);
  expect(state.reads).toEqual(['body.twee']);
});

test('search-only overlay retains its file binding and rollback removes fields originally absent', async () => {
  const state = fixture([{ passage: 'Target', findString: 'old', replaceFile: 'body.twee' }], { 'body.twee': 'original body' });
  await RepairTargets.prepareRules(state.host);
  const handle = state.handle(0);
  const before = handle.read();
  handle.write(NativeJSON.stringify({ passage: 'Target', findString: 'current' }));
  expect(state.rules[0]).toEqual({ passage: 'Target', findString: 'current', replaceFile: 'body.twee' });
  expect(() => handle.write(before, '')).toThrow('cannot be empty');
  expect(handle.read()).not.toBe(before);
  handle.write(before, 'derived body');
  handle.write(before, 'original body');
  expect(state.rules[0]).toEqual({ passage: 'Target', findString: 'old', replaceFile: 'body.twee' });
});

test('inline body overlays preserve signature order when an unused file field is restored', async () => {
  const state = fixture([{ passage: 'Target', findString: 'old', replace: 'inline body', replaceFile: 'ignored.twee', debug: true }], { 'ignored.twee': 'ignored file body' });
  await RepairTargets.prepareRules(state.host);
  const signature = RepairTargets.tweeSignature(RepairTargets.tweeRules(state.host)[0]);
  const handle = state.handle(0);
  const before = handle.read();
  handle.write(before, 'derived body');
  expect(RepairTargets.tweeSignature(RepairTargets.tweeRules(state.host)[0])).toBe(RepairTargets.companionForBody(signature, 'derived body'));
  handle.write(before, 'inline body');
  expect(RepairTargets.tweeSignature(RepairTargets.tweeRules(state.host)[0])).toBe(signature);
  expect(state.reads).toEqual([]);
});

test('native proof includes preceding file rules and replacement dollar semantics', async () => {
  const state = fixture(
    [
      { passage: 'Target', findString: 'old', replaceFile: 'first.twee' },
      { passage: 'Target', findString: 'middle old', replaceFile: 'second.twee' }
    ],
    { 'first.twee': 'middle $&', 'second.twee': '$& $1 $$ done' }
  );
  await RepairTargets.prepareRules(state.host);
  const handle = state.handle(1);
  const item = { name: 'Target', content: 'old' };
  const data = { passageDataItems: { items: [item], map: new Map([['Target', item]]) } } as unknown as Parameters<NonNullable<RepairHandle['twee']>['patcher']['do_patch']>[1];
  const native = state.patcher.do_patch;
  const proof = RepairProof.observe([handle], state.host.diagnostics);
  await state.patcher.do_patch(state.info, data);
  expect(item.content).toBe('middle old $1 $ done');
  expect(proof.verify(handle)).toBe(true);
  expect(proof.output(handle)).toBe(item.content);
  expect(state.patcher.do_patch).toBe(native);
  expect(state.files.get('second.twee')).toBe('$& $1 $$ done');
});

test('file read failures are isolated and recorded without modifying native rules', async () => {
  const state = fixture([{ passage: 'Target', findString: 'old', replaceFile: 'body.twee' }], { 'body.twee': 'file body' });
  const failure = new Error('archive unavailable');
  state.zip.file = () => {
    throw failure;
  };
  await RepairTargets.prepareRules(state.host);
  expect(RepairTargets.tweeRules(state.host)).toEqual([]);
  expect(state.warnings).toEqual([['Repair replacement source unavailable: File Rules:body.twee', 'WARN', 'repair', failure]]);
  expect(state.rules[0]).toEqual({ passage: 'Target', findString: 'old', replaceFile: 'body.twee' });
});

test('file source limits are bounded and reported without editing omitted rules', async () => {
  const rules = Array.from({ length: 258 }, (_, index) => ({ passage: 'Target', findString: `old-${index}`, replaceFile: `body-${index}.twee` }));
  const state = fixture(rules, Object.fromEntries(rules.map(rule => [rule.replaceFile, 'file body'])));
  await RepairTargets.prepareRules(state.host);
  expect(state.reads).toHaveLength(256);
  expect(RepairTargets.tweeRules(state.host)).toHaveLength(256);
  expect(state.warnings).toEqual([['Repair replacement source limit reached; some file rules were omitted', 'WARN', 'repair']]);
  expect(state.rules.at(-1)).toEqual(rules.at(-1));
  const large = fixture([{ passage: 'Target', findString: 'old', replaceFile: 'large.twee' }], { 'large.twee': 'x'.repeat(256001) });
  await RepairTargets.prepareRules(large.host);
  expect(RepairTargets.tweeRules(large.host)).toEqual([]);
  expect(large.warnings).toHaveLength(1);
  const totalRules = Array.from({ length: 33 }, (_, index) => ({ passage: 'Target', findString: `old-${index}`, replaceFile: `body-${index}.twee` }));
  const total = fixture(totalRules, Object.fromEntries(totalRules.map(rule => [rule.replaceFile, 'x'.repeat(250000)])));
  await RepairTargets.prepareRules(total.host);
  expect(total.reads).toHaveLength(32);
  expect(RepairTargets.tweeRules(total.host)).toHaveLength(32);
  expect(total.warnings).toHaveLength(1);
});
