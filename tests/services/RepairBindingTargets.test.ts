import { expect, test } from 'bun:test';
import type { ModInfo } from '@scml/types/sugarcube-2-ModLoader/ModLoader';
import type { PatchInfoItem } from '@scml/types/sugarcube-2-ModLoader/ReplacePatcher';
import type ModLoader from '../../src/host/ModLoader';
import { NativeJSON } from '../../src/services/Repair/Json';
import type { RepairTarget } from '../../src/services/Repair/Recipe';
import { RepairTargets } from '../../src/services/Repair/Targets';

type Kind = 'twee' | 'js' | 'css';

function fixture(kind: Kind = 'js') {
  const rules: PatchInfoItem[] = [
    { fileName: 'current.js', passageName: 'Current', from: 'start', to: 'middle' },
    { fileName: 'pregnancy.js', passageName: 'Old', from: 'old anchor', to: 'finish' },
    { fileName: 'current.js', passageName: 'Current', from: 'finish', to: 'done' }
  ];
  const path = (rule: PatchInfoItem) => (kind === 'twee' ? rule.passageName! : rule.fileName);
  const map = new Map<string, PatchInfoItem[]>();
  for (const rule of rules) map.set(path(rule), [...(map.get(path(rule)) || []), rule]);
  const patcher = {
    patchFileName: 'patches/replace.json',
    patchInfo: { [kind]: rules },
    patchInfoMap: { js: new Map(), css: new Map(), twee: new Map(), [kind]: map }
  } as unknown as ModInfo['replacePatcher'][number];
  const mod = { name: 'Legacy Mod', replacePatcher: [patcher] } as unknown as ModInfo;
  const host = { modUtils: { getMod: (name: string) => (name === mod.name ? mod : undefined) } } as unknown as ModLoader;
  const target: RepairTarget = {
    id: 'target-1',
    modName: mod.name,
    kind: 'replace-patcher',
    path: `replace|${encodeURIComponent(patcher.patchFileName)}|${kind}|1|binding`,
    fingerprint: 'a'.repeat(64),
    content: NativeJSON.stringify(kind === 'twee' ? { passageName: 'Old', from: 'old anchor' } : { fileName: 'pregnancy.js', from: 'old anchor' }),
    signature: NativeJSON.stringify({ to: rules[1].to })
  };
  return { rules, patcher, host, target, map };
}

test('existing search-only memories retain their original signature and handle', () => {
  const state = fixture();
  const rule = state.rules[1];
  const target = {
    ...state.target,
    path: state.target.path.replace(/binding$/, 'from'),
    content: rule.from,
    signature: NativeJSON.stringify({ to: rule.to, fileName: rule.fileName, passageName: rule.passageName })
  };
  const handle = RepairTargets.handle(state.host, target)!;
  expect(handle.read()).toBe('old anchor');
  handle.write('new anchor');
  expect(rule.from).toBe('new anchor');
  expect(rule.fileName).toBe('pregnancy.js');
  expect(state.map.get('pregnancy.js')).toEqual([rule]);
});

test.each(['js', 'css', 'twee'] as const)('binding relocation preserves native %s rule order, output and rollback', kind => {
  const state = fixture(kind);
  const handle = RepairTargets.handle(state.host, state.target)!;
  expect(handle).toBeDefined();
  const before = handle.read();
  const destination = kind === 'twee' ? 'Current' : 'current.js';
  const after = NativeJSON.stringify(kind === 'twee' ? { passageName: destination, from: 'middle' } : { fileName: destination, from: 'middle' });
  handle.write(after);
  expect(handle.read()).toBe(after);
  expect(handle.output).toEqual({ kind, path: destination, replacement: 'finish' });
  expect(state.patcher.patchInfoMap[kind]).toBe(state.map);
  expect(state.map.get(destination)).toEqual(state.rules);
  expect(state.map.has(kind === 'twee' ? 'Old' : 'pregnancy.js')).toBe(false);
  let source = 'start';
  for (const rule of state.map.get(destination)!) source = source.replace(rule.from, () => rule.to);
  expect(source).toBe('done');
  expect(RepairTargets.handle(state.host, { ...state.target, content: after })?.read()).toBe(after);
  handle.write(before);
  expect(handle.read()).toBe(before);
  expect(state.map.get(destination)).toEqual([state.rules[0], state.rules[2]]);
  expect(state.map.get(kind === 'twee' ? 'Old' : 'pregnancy.js')).toEqual([state.rules[1]]);
  expect(state.rules[1].to).toBe('finish');
});

test('binding helpers bind only the existing replacement body', () => {
  const state = fixture();
  const rule = state.rules[1];
  expect(RepairTargets.replaceBinding(rule, 'js')).toBe(state.target.content);
  expect(RepairTargets.replaceBinding(rule, 'twee')).toBe(NativeJSON.stringify({ passageName: 'Old', from: 'old anchor' }));
  expect(RepairTargets.replaceSignature(rule)).toBe(state.target.signature!);
  rule.fileName = 'current.js';
  expect(RepairTargets.replaceSignature(rule)).toBe(state.target.signature!);
  rule.to = 'changed body';
  expect(RepairTargets.handle(state.host, state.target)).toBeUndefined();
});

test('invalid bindings cannot alter the rule or native index', () => {
  const state = fixture();
  const handle = RepairTargets.handle(state.host, state.target)!;
  const before = handle.read();
  expect(() => handle.write(NativeJSON.stringify({ fileName: '', from: 'anchor' }))).toThrow('Invalid ReplacePatcher search binding');
  expect(handle.read()).toBe(before);
  expect(state.map.get('pregnancy.js')).toEqual([state.rules[1]]);
});
