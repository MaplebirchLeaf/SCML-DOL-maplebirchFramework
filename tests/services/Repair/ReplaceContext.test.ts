import { expect, mock, test } from 'bun:test';
import type ModLoader from '../../../src/host/ModLoader';
import { RepairAgent } from '../../../src/services/Repair/Agent';
import { RepairPrompt } from '../../../src/services/Repair/Prompt';
import { RepairSources } from '../../../src/services/Repair/Source';
import { RepairTargets } from '../../../src/services/Repair/Targets';

const pregnancyPath = 'game\\03-JavaScript\\04-Pregnancy\\pregnancy-lifecycle.js';
const pregnancyFrom = '\t\t\t\t\t\tcase "Alex":';
const pregnancyTo = '\t\t\t\t\t\tcase "Remy":\n\t\t\t\t\t\t\tbirthLocation = "riding_school";\n\t\t\t\t\t\t\tlocation = "riding_school";\n\t\t\t\t\t\t\tbreak;\n' + pregnancyFrom;

function fixture(messages: string[], scripts: Record<string, string>, passages: Record<string, string> = { Target: 'current anchor' }) {
  const records = (items: Record<string, string>) => ({
    items: Object.entries(items).map(([name, content]) => ({ name, content })),
    map: new Map(Object.entries(items).map(([name, content]) => [name, { name, content }]))
  });
  const cache = (passages: Record<string, string> = {}, scripts: Record<string, string> = {}) => ({
    passageDataItems: records(passages),
    scriptFileItems: records(scripts),
    styleFileItems: records({})
  });
  const twee = { passage: 'Target', findString: 'old anchor', replace: 'installed body' };
  const pregnancy = { fileName: 'pregnancy.js', from: pregnancyFrom, to: pregnancyTo };
  const untouched = { fileName: 'unrelated.js', from: 'unrelated', to: 'keep unchanged' };
  const mod = {
    name: 'Remy Love Mod',
    cache: cache({}, { 'pregnancy.js': 'unrelated mod cache source', 'unrelated.js': 'unrelated' }),
    replacePatcher: [],
    bootJson: {
      addonPlugin: [
        { modName: 'TweeReplacer', addonName: 'TweeReplacerAddon', params: [twee] },
        { modName: 'ReplacePatcher', addonName: 'ReplacePatcherAddon', params: { js: [pregnancy, untouched] } }
      ]
    }
  };
  const registered = new Map([[mod.name, { addonName: 'ReplacePatcherAddon', mod }]]);
  const tweePlugin = { name: 'TweeReplacer', cache: cache(), replacePatcher: [], modRef: { info: new Map([[mod.name, { mod }]]), do_patch() {} } };
  const replacePlugin = { name: 'ReplacePatcher', cache: cache(), replacePatcher: [], modRef: { info: registered, do_patch() {}, checkParams: () => true } };
  const mods = new Map([mod, tweePlugin, replacePlugin].map(mod => [mod.name, mod]));
  const current = cache(passages, scripts);
  const host = {
    diagnostics: { write: mock(), history: [], patches: [], conflicts: [] },
    modLoaderGui: { gLoadingProgress: { logList: messages.map(str => ({ type: 'error', str })) } },
    modUtils: { getModListNameNoAlias: () => [...mods.keys()], getMod: (name: string) => mods.get(name) },
    modSC2DataManager: { getSC2DataInfoAfterPatch: () => current }
  } as unknown as ModLoader;
  return { host, current, mod, registered, twee, pregnancy, untouched };
}

const missingPregnancy = '[ReplacePatcher] patchInReplaceParamsItem() patch[Remy Love Mod] cannot find file: pregnancy.js';
const failedTwee = '[TweeReplacer] do_patch() cannot find findString: [Remy Love Mod] findString:[old anchor] in:[Target]';

test('failed Twee rules and a registered missing JS file both remain repair targets', async () => {
  const current = `function npcPregnancyCycle() {\n${pregnancyFrom}\n}\n`;
  const state = fixture([failedTwee, missingPregnancy], { [pregnancyPath]: current, 'other.js': 'irrelevant vanilla source' });
  const before = structuredClone(state.pregnancy);
  const context = await RepairAgent.context(state.host, '');
  expect(context.targets.map(target => target.kind)).toEqual(['twee-replacer', 'replace-patcher']);
  expect(context.targets[1]).toMatchObject({
    modName: state.mod.name,
    path: 'replace-addon|1|js|0|binding',
    content: RepairTargets.replaceBinding(state.pregnancy, 'js'),
    signature: RepairTargets.replaceSignature(state.pregnancy)
  });
  expect(context.sources).toEqual([{ name: pregnancyPath, kind: 'js', current }]);
  expect(context.targets[1].reference).toContain(pregnancyTo);
  expect(context.targets[1].reference).not.toContain(current);
  expect(RepairPrompt.content(context)).not.toContain('irrelevant vanilla source');
  expect(RepairPrompt.content(context)).not.toContain('unrelated mod cache source');
  expect(context.passages).toEqual([{ name: 'Target', current: 'current anchor' }]);
  expect(state.pregnancy).toEqual(before);
  expect(state.untouched.to).toBe('keep unchanged');
  expect(context.relatedRules).toContainEqual({ modName: state.mod.name, patcher: 'replace-addon', kind: 'js', destination: 'pregnancy.js', find: pregnancyFrom, replace: pregnancyTo });
});

test('file relocation evidence requires one current source and one observed anchor', async () => {
  const state = fixture([missingPregnancy], { [pregnancyPath]: pregnancyFrom, 'duplicate.js': pregnancyFrom });
  const context = await RepairAgent.context(state.host, '');
  expect(context.targets).toHaveLength(1);
  expect(context.targets[0].path).toBe('replace-addon|1|js|0|binding');
  expect(context.sources).toBeUndefined();
  expect(RepairSources.replaceSources(state.host.modSC2DataManager.getSC2DataInfoAfterPatch(), 'js', 'pregnancy.js', pregnancyFrom)).toEqual([]);
  state.current.scriptFileItems.map.delete('duplicate.js');
  state.current.scriptFileItems.map.get(pregnancyPath)!.content += pregnancyFrom;
  expect(RepairSources.replaceSources(state.host.modSC2DataManager.getSC2DataInfoAfterPatch(), 'js', 'pregnancy.js', pregnancyFrom)).toEqual([]);
});

test('an existing destination supplies its current text when the old anchor failed', async () => {
  const message = `[ReplacePatcher] patchInReplaceParamsItem() patch[Remy Love Mod] cannot find 'from': ${pregnancyFrom} in:pregnancy.js`;
  const current = 'function rewrittenPregnancyCycle() {}';
  const state = fixture([message], { 'pregnancy.js': current, 'unrelated.js': pregnancyFrom });
  const context = await RepairAgent.context(state.host, '');
  expect(context.sources).toEqual([{ name: 'pregnancy.js', kind: 'js', current }]);
  expect(context.targets).toHaveLength(1);
  expect(state.pregnancy.fileName).toBe('pregnancy.js');
});

test('failure selection follows complete native mod, file and search strings', () => {
  const rule = { fileName: 'pregnancy.js', from: pregnancyFrom };
  expect(RepairSources.replaceRuleFailed([missingPregnancy], 'Remy Love Mod', 'js', rule)).toBe(true);
  expect(RepairSources.replaceRuleFailed([missingPregnancy], 'Remy Love', 'js', rule)).toBe(false);
  expect(RepairSources.replaceRuleFailed([missingPregnancy + '.old'], 'Remy Love Mod', 'js', rule)).toBe(false);
  expect(RepairSources.replaceRuleFailed([missingPregnancy.replace('cannot find', 'done')], 'Remy Love Mod', 'js', rule)).toBe(false);
  const wrongFrom = `[ReplacePatcher] patchInReplaceParamsItem() patch[Remy Love Mod] cannot find 'from': unrelated in:pregnancy.js`;
  expect(RepairSources.replaceRuleFailed([wrongFrom], 'Remy Love Mod', 'js', rule)).toBe(false);
  const passage = { passageName: 'Widgets Speech', from: 'old phrase' };
  const twee = "[ReplacePatcher] patchInReplaceParamsItemTwee() patch[Remy Love Mod] cannot find 'from': old phrase in:Widgets Speech";
  expect(RepairSources.replaceRuleFailed([twee], 'Remy Love Mod', 'twee', passage)).toBe(true);
  const core = `applyReplacePatcher() js replace 0: in [pregnancy.js] of [${pregnancyFrom}] positions []`;
  expect(RepairSources.replaceRuleFailed([core], 'Remy Love Mod', 'js', rule)).toBe(true);
  expect(RepairSources.replaceRuleFailed([core.replace('replace 0', 'replace multiple')], 'Remy Love Mod', 'js', rule)).toBe(false);
});

test('CSS and Twee addon bindings share current evidence without making game content writable', async () => {
  const messages = [
    "[ReplacePatcher] patchInReplaceParamsItem() patch[Remy Love Mod] cannot find 'from': color: reed in:style.css",
    "[ReplacePatcher] patchInReplaceParamsItemTwee() patch[Remy Love Mod] cannot find 'from': old phrase in:Target"
  ];
  const state = fixture(messages, {});
  const addon = state.mod.bootJson.addonPlugin[1];
  Object.assign(addon.params, { css: [{ fileName: 'style.css', from: 'color: reed', to: 'color: red' }], twee: [{ passageName: 'Target', from: 'old phrase', to: 'installed wording' }] });
  state.current.styleFileItems.map.set('style.css', { name: 'style.css', content: '.item { color: blue; }' });
  const context = await RepairAgent.context(state.host, '');
  expect(context.targets.map(target => target.path)).toEqual(['replace-addon|1|twee|0|binding', 'replace-addon|1|css|0|binding']);
  expect(context.passages).toEqual([{ name: 'Target', current: 'current anchor' }]);
  expect(context.sources).toEqual([{ name: 'style.css', kind: 'css', current: '.item { color: blue; }' }]);
  expect(context.targets.every(target => target.kind === 'replace-patcher')).toBe(true);
});

test('native JS evidence reserves shared space before long related passages', async () => {
  const current = '/* pregnancy data */\n' + ' '.repeat(21500) + pregnancyFrom;
  const state = fixture([failedTwee, missingPregnancy], { [pregnancyPath]: current }, { Target: 'current anchor\n' + 'x'.repeat(63970) });
  const context = await RepairAgent.context(state.host, '');
  expect(context.sources?.[0].current).toBe(current);
  expect(context.passages?.[0].current).toBe(state.current.passageDataItems.map.get('Target')!.content);
  expect(RepairPrompt.content(context).length).toBeLessThanOrEqual(480000);
});

test('unregistered addon packages and secret-containing current source stay unavailable', async () => {
  const state = fixture([missingPregnancy], { [pregnancyPath]: pregnancyFrom + '\nsecret-token' });
  const context = await RepairAgent.context(state.host, 'secret-token');
  expect(context.sources).toBeUndefined();
  expect(RepairPrompt.content(context)).not.toContain('secret-token');
  state.registered.clear();
  const unregistered = await RepairAgent.context(state.host, '');
  expect(unregistered.targets).toEqual([]);
});
