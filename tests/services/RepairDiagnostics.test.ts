import { expect, mock, spyOn, test } from 'bun:test';
import type ModLoader from '../../src/host/ModLoader';
import { RepairAgent } from '../../src/services/Repair/Agent';
import { NativeJSON } from '../../src/services/Repair/Json';
import { RepairRecipeParser } from '../../src/services/Repair/Recipe';
import { RepairSources } from '../../src/services/Repair/Source';
import { RepairPrompt } from '../../src/services/Repair/Prompt';
import type { RepairContext, RepairRecipe } from '../../src/services/Repair/Recipe';

test('analysis distinguishes malformed JSON from valid JSON rejected by repair validation', async () => {
  const context: RepairContext = {
    requestId: 'request-1',
    mods: ['example'],
    diagnostics: [],
    modLoaderLogs: [],
    patches: [],
    conflicts: [],
    targets: [{ id: 'target-1', modName: 'example', kind: 'css', path: 'style.css', fingerprint: `sha256:${'a'.repeat(64)}`, content: '.item { color: reed; }' }]
  };
  const input = { apiUrl: 'https://example.test/v1', apiKey: '', model: 'model' };
  const signal = new AbortController().signal;
  const fetch = spyOn(globalThis, 'fetch');
  try {
    fetch.mockResolvedValueOnce(new Response('private envelope detail'));
    expect(await RepairAgent.analyze(input, context, signal)).toEqual({ result: 'response', reason: 'Invalid API JSON' });
    fetch.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: '' } }] }));
    expect(await RepairAgent.analyze(input, context, signal)).toEqual({ result: 'response', reason: 'API response contains no text' });
    fetch.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: '{"private response detail":' } }] }));
    expect(await RepairAgent.analyze(input, context, signal)).toEqual({ result: 'response', reason: 'Invalid repair JSON' });
    const unsafe: RepairRecipe = {
      requestId: context.requestId,
      outcome: 'repair',
      summary: 'Change the colour.',
      evidence: ['Unknown colour reed.'],
      operations: [{ targetId: 'target-1', find: 'reed', replace: 'url(https://private.invalid)', expectedMatches: 1, reason: 'Unsafe replacement.' }]
    };
    fetch.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: NativeJSON.stringify(unsafe) } }] }));
    expect(await RepairAgent.analyze(input, context, signal)).toEqual({ result: 'preflight', reason: 'target-1: CSS repair must be a local declaration value' });
    expect(context.targets[0].content).toBe('.item { color: reed; }');
  } finally {
    fetch.mockRestore();
  }
});

test('collects GUI warnings/errors and framework diagnostics from their actual stores', async () => {
  const content = '.example { color: red; }';
  const host = {
    diagnostics: {
      write: mock(),
      history: [{ at: 'framework-time', level: 'ERROR', scope: 'patch', message: 'Framework failed', data: new Error('stack-detail') }],
      patches: [
        { target: 'applied.css', pattern: 'needle', status: 'applied', matches: 1, applied: 1 },
        { target: 'missing.css', pattern: 'needle', status: 'error', matches: 0, applied: 0, error: 'patch-error' }
      ],
      conflicts: []
    },
    modLoaderGui: {
      gLoadingProgress: {
        logList: [
          { type: 'info', str: 'ignore-info' },
          { type: 'warning', str: 'example.css warning', time: { toISOString: () => 'gui-time' } },
          { type: 'error', str: 'API token secret-key failed', time: { toISOString: () => 'gui-time' } }
        ]
      }
    },
    modUtils: {
      version: 'loader-version',
      getModListNameNoAlias: () => ['example'],
      getMod: () => ({ name: 'example', version: '1', cache: { passageDataItems: { items: [] }, scriptFileItems: { items: [] }, styleFileItems: { items: [{ name: 'example.css', content }] } } })
    }
  } as unknown as ModLoader;
  const context = await RepairAgent.context(host, 'secret-key');
  expect(context.diagnostics[0]).toMatchObject({ at: 'framework-time', level: 'ERROR', scope: 'patch' });
  expect(context.diagnostics[0].message).toContain('stack-detail');
  expect(context.modLoaderLogs).toEqual([
    { at: 'gui-time', level: 'WARN', message: 'example.css warning' },
    { at: 'gui-time', level: 'ERROR', message: 'API token [REDACTED] failed' }
  ]);
  expect(context.patches[0].status).toBe('applied');
  expect(context.patches[1].error).toBe('patch-error');
  expect(context.targets[0]).toMatchObject({ path: 'example.css', content });
  expect(context.mods).toEqual(['example']);
  expect(context).not.toHaveProperty('environment');
  expect(context.targets[0]).not.toHaveProperty('modVersion');
  expect(JSON.stringify(context)).not.toContain('secret-key');
});

test('patch evidence includes merged source but excludes secrets in companion rules and conflicts', async () => {
  const cache = { passageDataItems: { items: [] }, scriptFileItems: { items: [] }, styleFileItems: { items: [] } };
  const rule = { passageName: 'Target', from: 'old anchor', to: 'existing replacement' };
  const mod = { name: 'example', cache, replacePatcher: [{ patchFileName: 'patch.json', patchInfo: { twee: [rule, { ...rule, to: 'private-key' }] } }] };
  const host = {
    diagnostics: {
      write: mock(),
      history: [{ level: 'WARN', message: 'example patch.json Target' }],
      patches: [],
      conflicts: [{ source: 'private-key', dataSource: 'example', passages: ['private-key'], scripts: [], styles: [] }]
    },
    modLoaderGui: {},
    modUtils: { getModListNameNoAlias: () => ['example'], getMod: () => mod },
    modSC2DataManager: { getSC2DataInfoAfterPatch: () => ({ passageDataItems: { map: new Map([['Target', { content: 'current anchor in passage' }]]) } }) }
  } as unknown as ModLoader;
  const context = await RepairAgent.context(host, 'private-key', [
    {
      id: '',
      modName: 'maplebirch',
      kind: 'patch-anchor',
      path: 'zone|Target',
      reference: 'Target',
      content: 'old',
      fingerprint: await RepairRecipeParser.fingerprint('old'),
      signature: 'private-key'
    }
  ]);
  expect(context.targets).toHaveLength(1);
  expect(context.targets[0].reference).toBe('Target');
  expect(context.passages).toEqual([{ name: 'Target', current: 'current anchor in passage' }]);
  expect(context.targets[0].signature).toContain('existing replacement');
  expect(NativeJSON.stringify(context)).not.toContain('private-key');
});

test('escaped log histories and source references stay within the API context budget', async () => {
  const message = '"\\\n'.repeat(1000);
  const name = 'style.css';
  const mod = {
    name: 'example',
    replacePatcher: [],
    cache: { passageDataItems: { items: [] }, scriptFileItems: { items: [] }, styleFileItems: { items: [{ name, content: '.item { color: red; }' }] } }
  };
  const host = {
    diagnostics: {
      write: mock(),
      history: Array.from({ length: 100 }, () => ({ level: 'WARN', message: name + message })),
      patches: Array.from({ length: 100 }, () => ({ target: name, pattern: message, status: 'error', matches: 0, applied: 0, error: message })),
      conflicts: Array.from({ length: 100 }, () => ({ source: message, dataSource: message, passages: Array(30).fill(message), scripts: Array(30).fill(message), styles: Array(30).fill(message) }))
    },
    modLoaderGui: { gLoadingProgress: { logList: Array.from({ length: 100 }, () => ({ type: 'error', str: name + message })) } },
    modUtils: { getModListNameNoAlias: () => ['example'], getMod: () => mod }
  } as unknown as ModLoader;
  const context = await RepairAgent.context(host, '');
  expect(RepairPrompt.content(context).length).toBeLessThanOrEqual(480000);
  expect(context.targets[0].path).toBe(name);
});

function sourceFixture(messages: string[], original: Record<string, string>, current: Record<string, string>, params: Array<{ passage: string; findString: string; replace: string }> = []) {
  const records = (passages: Record<string, string>) => ({
    items: Object.entries(passages).map(([name, content]) => ({ name, content })),
    map: new Map(Object.entries(passages).map(([name, content]) => [name, { name, content }]))
  });
  const source = (passages: Record<string, string>) => ({ passageDataItems: records(passages), scriptFileItems: records({}), styleFileItems: records({}) });
  const vanilla = source(original);
  const merged = source(current);
  const mod = { name: 'free-attitudes', bootJson: { addonPlugin: [{ modName: 'TweeReplacer', addonName: 'TweeReplacerAddon', params }] }, replacePatcher: [], cache: source({}) };
  const plugin = { name: 'TweeReplacer', replacePatcher: [], cache: source({}), modRef: { info: new Map([['free-attitudes', { mod }]]), do_patch() {} } };
  let originalReads = 0;
  let currentReads = 0;
  const host = {
    diagnostics: { write: mock(), history: messages.map(message => ({ level: 'ERROR', message })), patches: [], conflicts: [] },
    modLoaderGui: {},
    modUtils: { getModListNameNoAlias: () => ['free-attitudes', 'TweeReplacer'], getMod: (name: string) => (name === mod.name ? mod : name === plugin.name ? plugin : undefined) },
    modSC2DataManager: {
      getSC2DataInfoCache: () => {
        originalReads++;
        return vanilla;
      },
      getSC2DataInfoAfterPatch: () => {
        currentReads++;
        return merged;
      }
    }
  } as unknown as ModLoader;
  return { host, mod, vanilla, merged, reads: () => ({ original: originalReads, current: currentReads }) };
}

test('exact passage names are resolved from full errors before log display truncation', async () => {
  const state = sourceFixture(
    ['x'.repeat(2200) + ' Error (:: Free Attitudes): widget failed in:[Widgets Attitudes] and in:[Widgets Stats]'],
    { 'Free Attitudes': 'vanilla free', 'Widgets Attitudes': 'vanilla attitudes', 'Widgets Stats': 'vanilla stats', Unrelated: 'never send this' },
    { 'Free Attitudes': 'current free', 'Widgets Attitudes': 'current attitudes', 'Widgets Stats': 'current stats', Unrelated: 'never send this either' }
  );
  const originals = RepairSources.captureOriginalPassages(state.host);
  const context = await RepairAgent.context(state.host, '', [], originals);
  expect(context.diagnostics[0].message).not.toContain('Free Attitudes');
  expect(context.passages).toEqual([
    { name: 'Free Attitudes', original: 'vanilla free', current: 'current free' },
    { name: 'Widgets Attitudes', original: 'vanilla attitudes', current: 'current attitudes' },
    { name: 'Widgets Stats', original: 'vanilla stats', current: 'current stats' }
  ]);
  expect(state.reads()).toEqual({ original: 1, current: 1 });
  expect(NativeJSON.stringify(context)).not.toContain('never send');
});

test('missing current or uncaptured original source stays explicitly absent', async () => {
  const state = sourceFixture(
    ['Error (:: Deleted Passage): missing; Error (:: Missing Both): missing; Error (:: Current Only): failed'],
    { 'Deleted Passage': 'original deleted' },
    { 'Current Only': 'current source' }
  );
  const context = await RepairAgent.context(state.host, '', [], new Map([['Deleted Passage', 'original deleted']]));
  expect(context.passages).toEqual([{ name: 'Deleted Passage', original: 'original deleted' }, { name: 'Missing Both' }, { name: 'Current Only', current: 'current source' }]);
  expect(state.reads()).toEqual({ original: 0, current: 1 });
});

test('short passage titles and unrelated mod rules do not match longer error names', async () => {
  const state = sourceFixture(['free-attitudes failed in:[Widgets Attitudes]'], {}, { Widgets: 'short unrelated', 'Widgets Attitudes': 'named passage' });
  state.mod.cache.passageDataItems = {
    items: [
      { name: 'Widgets', content: 'short unrelated' },
      { name: 'Widgets Attitudes', content: 'named passage' }
    ],
    map: new Map()
  };
  Object.assign(state.mod, { replacePatcher: [{ patchFileName: 'patch.json', patchInfo: { twee: [{ passageName: 'Elsewhere', from: 'old', to: 'new' }] } }] });
  const context = await RepairAgent.context(state.host, '', [
    { id: '', modName: 'maplebirch', kind: 'patch-anchor', path: 'zone|Widgets', reference: 'Widgets', content: 'old', fingerprint: await RepairRecipeParser.fingerprint('old') }
  ]);
  expect(context.passages).toEqual([{ name: 'Widgets Attitudes', current: 'named passage' }]);
  expect(context.targets.map(target => target.path)).toEqual(['Widgets Attitudes']);
  expect(RepairSources.passageNames(['Error (:: Widgets Attitudes Extra): failed'], ['Widgets', 'Widgets Attitudes'])).toEqual(['Widgets Attitudes Extra']);
});

test('early original capture copies only named rule destinations and stays bounded', () => {
  const source = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`Passage ${index}`, 'v'.repeat(32000)]));
  source.Unrelated = 'must remain unselected';
  const state = sourceFixture([], source, {}, [{ passage: 'Passage 0', findString: 'v', replace: 'new' }]);
  Object.assign(state.mod, { replacePatcher: [{ patchInfo: { twee: [{ passageName: 'Passage 1', from: 'old', to: 'new' }] } }] });
  const originals = RepairSources.captureOriginalPassages(
    state.host,
    Array.from({ length: 10 }, (_, index) => `Passage ${index + 2}`)
  );
  expect(state.reads()).toEqual({ original: 1, current: 0 });
  expect([...originals.values()].reduce((sum, content) => sum + content.length, 0)).toBeLessThanOrEqual(256000);
  expect(originals.has('Passage 0')).toBe(true);
  expect(originals.has('Passage 1')).toBe(true);
  expect(originals.has('Unrelated')).toBe(false);
  state.vanilla.passageDataItems.map.clear();
  expect(originals.get('Passage 0')).toBe('v'.repeat(32000));
});

test('renamed TweeReplacer passages send precise local candidates and editable search fields first', async () => {
  const state = sourceFixture(
    ['[TweeReplacer] cannot find passage: [free-attitudes] [Free Attitudes]'],
    {},
    { 'Widgets Attitudes': 'before unique old anchor after', 'Widgets Stats': 'unrelated stats' },
    [
      { passage: 'Free Attitudes', findString: 'unique old anchor', replace: 'existing replacement' },
      { passage: 'Widgets Stats', findString: 'successful anchor', replace: 'successful replacement' }
    ]
  );
  const context = await RepairAgent.context(state.host, '');
  expect(context.passages).toEqual([{ name: 'Free Attitudes' }, { name: 'Widgets Attitudes', current: 'before unique old anchor after' }]);
  expect(context.targets.map(target => [target.kind, target.path, target.content])).toEqual([
    ['twee-replacer', 'twee-replacer|0|0', NativeJSON.stringify({ passage: 'Free Attitudes', findString: 'unique old anchor' })]
  ]);
  expect(context.targets[0].reference).toContain('existing replacement');
  expect(context.targets[0].reference).not.toContain('before unique old anchor after');
  expect(state.reads()).toEqual({ original: 0, current: 1 });
});

test('absent or overly broad search literals cannot fabricate renamed passage candidates', async () => {
  const state = sourceFixture(
    ['[TweeReplacer] cannot find passage: [free-attitudes] [Free Attitudes]'],
    {},
    { One: 'broad anchor', Two: 'broad anchor', Three: 'broad anchor', Four: 'broad anchor' },
    [{ passage: 'Free Attitudes', findString: 'broad anchor', replace: 'new' }]
  );
  const broad = await RepairAgent.context(state.host, '');
  expect(broad.passages).toEqual([{ name: 'Free Attitudes' }]);
  state.mod.bootJson.addonPlugin[0].params[0].findString = 'missing anchor';
  const absent = await RepairAgent.context(state.host, '');
  expect(absent.passages).toEqual([{ name: 'Free Attitudes' }]);
});

test('read-only passage evidence rejects API secrets and reserves room for failing rule material', async () => {
  const state = sourceFixture(
    ['[TweeReplacer] failed [free-attitudes] in:[Widgets Attitudes] and Error (:: Secret Passage): failed'],
    { 'Widgets Attitudes': 'o'.repeat(32000), 'Secret Passage': 'private-key' },
    { 'Widgets Attitudes': 'c'.repeat(32000), 'Secret Passage': 'private-key' },
    [{ passage: 'Widgets Attitudes', findString: 'old anchor', replace: 'r'.repeat(30000) }]
  );
  const context = await RepairAgent.context(
    state.host,
    'private-key',
    [],
    new Map([
      ['Widgets Attitudes', 'o'.repeat(32000)],
      ['Secret Passage', 'private-key']
    ])
  );
  expect(context.targets[0]).toMatchObject({ kind: 'twee-replacer', content: NativeJSON.stringify({ passage: 'Widgets Attitudes', findString: 'old anchor' }) });
  expect(context.passages?.find(passage => passage.name === 'Widgets Attitudes')?.current).toBe('c'.repeat(32000));
  expect(context.passages?.find(passage => passage.name === 'Secret Passage')).toEqual({ name: 'Secret Passage', currentOmitted: true });
  const total =
    (context.passages || []).reduce((sum, passage) => sum + (passage.original?.length || 0) + (passage.current?.length || 0), 0) +
    context.targets.reduce((sum, target) => sum + target.content.length + (target.reference?.length || 0), 0);
  expect(total).toBeLessThanOrEqual(160000);
  expect(RepairPrompt.content(context).length).toBeLessThanOrEqual(480000);
  expect(NativeJSON.stringify(context)).not.toContain('private-key');
});

test('failed rule batches retain their own current source before reverse-ordered logs consume the budget', async () => {
  const params = Array.from({ length: 23 }, (_, index) => ({ passage: `Target ${index + 1}`, findString: `old anchor ${index + 1}`, replace: `existing replacement ${index + 1}` }));
  const messages = params.map(rule => `[TweeReplacer] do_patch() cannot find findString: [free-attitudes] findString:[${rule.findString}] in:[${rule.passage}]`);
  const original = Object.fromEntries(params.map(rule => [rule.passage, `original ${rule.passage} `.padEnd(11000, 'o')]));
  const current = Object.fromEntries(params.map(rule => [rule.passage, `current ${rule.passage} `.padEnd(11000, 'c')]));
  const state = sourceFixture(messages, original, current, params);
  const originals = RepairSources.captureOriginalPassages(state.host);
  const context = await RepairAgent.context(state.host, '', [], originals);

  expect(context.targets.length).toBeGreaterThan(0);
  expect(context.targets.length).toBeLessThan(16);
  expect(context.omittedRules).toBe(params.length - context.targets.length);
  expect(context.targets.map(target => (NativeJSON.parse(target.content) as { passage: string }).passage)).toEqual(params.slice(0, context.targets.length).map(rule => rule.passage));
  for (const target of context.targets) {
    const { passage } = NativeJSON.parse(target.content) as { passage: string };
    const evidence = context.passages?.find(item => item.name === passage);
    expect(evidence?.current === current[passage]).toBe(true);
    expect(evidence).not.toHaveProperty('currentOmitted');
    if (evidence?.original !== undefined) expect(evidence.original === original[passage]).toBe(true);
  }
  const omitted = context.passages?.filter(passage => passage.current === undefined) || [];
  expect(omitted.length).toBe(params.length - context.targets.length);
  expect(omitted.every(passage => passage.currentOmitted === true && originals.has(passage.name))).toBe(true);
  expect(context.passages).toHaveLength(params.length);
  expect(state.reads()).toEqual({ original: 1, current: 1 });
  const total =
    (context.passages || []).reduce((sum, passage) => sum + (passage.original?.length || 0) + (passage.current?.length || 0), 0) +
    context.targets.reduce((sum, target) => sum + target.content.length + (target.reference?.length || 0), 0) +
    (context.relatedRules || []).reduce((sum, rule) => sum + rule.find.length + rule.replace.length, 0);
  expect(total).toBeLessThanOrEqual(160000);
  expect(RepairPrompt.content(context).length).toBeLessThanOrEqual(480000);
});

test('expanded source budget sends more than the previous 80000-character allowance', async () => {
  const params = Array.from({ length: 3 }, (_, index) => ({ passage: `Expanded ${index + 1}`, findString: `old anchor ${index + 1}`, replace: `existing replacement ${index + 1}` }));
  const messages = params.map(rule => `[TweeReplacer] do_patch() cannot find findString: [free-attitudes] findString:[${rule.findString}] in:[${rule.passage}]`);
  const current = Object.fromEntries(params.map(rule => [rule.passage, `current ${rule.passage} `.padEnd(32000, 'c')]));
  const state = sourceFixture(messages, {}, current, params);
  const context = await RepairAgent.context(state.host, '');
  const apiContent = RepairPrompt.messages(context)[1].content;
  const api = NativeJSON.parse(apiContent) as RepairContext;
  const sentSource = (api.passages || []).reduce((sum, passage) => sum + (passage.current?.length || 0), 0);

  expect(sentSource).toBe(96000);
  expect(sentSource).toBeGreaterThan(80000);
  expect(sentSource).toBeLessThanOrEqual(160000);
  expect(apiContent.length).toBeLessThanOrEqual(480000);
  expect(context.targets).toHaveLength(params.length);
  expect(api.passages?.every(passage => passage.current === current[passage.name])).toBe(true);
  expect(api.targets.every(target => target.signature === undefined)).toBe(true);
});

test('native TweeReplacer positions exclude mod and findString body names and retain a 34825-character passage', async () => {
  const name = 'Widgets Attitudes';
  const body = 'c'.repeat(34825);
  const vanilla = 'v'.repeat(34825);
  const find = 'Attitudes and Rule Body Name';
  const state = sourceFixture(
    [
      `[TweeReplacer] do_patch() cannot find findString: [Free Attitudes] findString:[${find}] in:[${name}]`,
      '[TweeReplacer] do_patch() cannot find passage: [Free Attitudes] [Widgets Stats]',
      '[TweeReplacer] do_patch() done: [Free Attitudes] okCount:[0] errorCount:[4]'
    ],
    { [name]: vanilla, Attitudes: 'short unrelated', 'Rule Body Name': 'also unrelated' },
    { [name]: body, Attitudes: 'short unrelated', 'Rule Body Name': 'also unrelated' },
    [{ passage: name, findString: find, replace: 'existing replacement' }]
  );
  const originals = RepairSources.captureOriginalPassages(state.host);
  expect(originals.get(name)).toBe(vanilla);
  expect(originals.has('Attitudes')).toBe(false);
  expect(originals.has('Rule Body Name')).toBe(false);
  const context = await RepairAgent.context(state.host, '', [], originals);
  expect(context.passages).toEqual([{ name: 'Widgets Stats' }, { name, current: body, original: vanilla }]);
  expect(context.targets[0]).toMatchObject({ kind: 'twee-replacer', content: NativeJSON.stringify({ passage: name, findString: find }) });
  expect(state.reads()).toEqual({ original: 1, current: 1 });
  expect(RepairPrompt.content(context).length).toBeLessThanOrEqual(480000);
});

test('whole-passage evidence stays bounded when no related fragment can be located', async () => {
  const oversized = 'x'.repeat(64001);
  const state = sourceFixture(['Error (:: Too Large): failed'], { 'Too Large': oversized }, { 'Too Large': oversized });
  const originals = RepairSources.captureOriginalPassages(state.host);
  expect(originals.has('Too Large')).toBe(false);
  expect((await RepairAgent.context(state.host, '', [], new Map([['Too Large', oversized]]))).passages).toEqual([{ name: 'Too Large', currentOmitted: true }]);
});

test('a rule with excluded current source is deferred while an actually missing passage remains diagnosable', async () => {
  const state = sourceFixture(
    ['[TweeReplacer] do_patch() cannot find findString: [free-attitudes] findString:[old anchor] in:[Too Large]', '[TweeReplacer] do_patch() cannot find passage: [free-attitudes] [Missing]'],
    {},
    { 'Too Large': 'x'.repeat(64001) },
    [
      { passage: 'Too Large', findString: 'old anchor', replace: 'existing replacement' },
      { passage: 'Missing', findString: 'missing anchor', replace: 'existing replacement' }
    ]
  );
  const context = await RepairAgent.context(state.host, '');

  expect(context.targets.map(target => [target.id, target.path])).toEqual([['target-1', 'twee-replacer|0|1']]);
  expect(context.omittedRules).toBe(1);
  expect(context.passages).toContainEqual({ name: 'Too Large', currentOmitted: true });
  expect(context.passages).toContainEqual({ name: 'Missing' });
});

test('large passage excerpts stay within API budgets while full private source validates anchors', async () => {
  const oldSearch = '\t<<if $livestock_milk gte 100>>\n\t\t<<set $remyMilkOffer to true>>\n\t<</if>>';
  const currentSearch = oldSearch.replace('$livestock_milk', '$livestock.milk');
  const head = 'FULL_CURRENT_ONLY_MARKER\n' + 'unrelated-head-data\n'.repeat(5000);
  const tail = '\nunrelated-tail-data\n'.repeat(4500);
  const large = head + currentSearch + tail;
  const passages = { 'Large Speech': large, 'Large Widgets': large + '\nextra tail', 'Large Secret': large + '\nprivate-key' };
  const params = Object.keys(passages).map(passage => ({ passage, findString: oldSearch, replace: oldSearch + '\n<<set $remyLove to true>>' }));
  const messages = params.map(rule => `[TweeReplacer] do_patch() cannot find findString: [free-attitudes] findString:[${rule.findString}] in:[${rule.passage}]`);
  const state = sourceFixture(messages, {}, passages, params);
  const context = await RepairAgent.context(state.host, 'private-key');

  expect(context.targets).toHaveLength(2);
  expect(context.omittedRules).toBe(1);
  const apiContent = RepairPrompt.content(context);
  const api = NativeJSON.parse(RepairPrompt.messages(context, 'CN')[1].content) as RepairContext;
  expect(apiContent.length).toBeLessThanOrEqual(480000);
  expect(NativeJSON.stringify(context).length).toBeGreaterThan(apiContent.length);
  expect(apiContent).not.toContain('FULL_CURRENT_ONLY_MARKER');
  expect(apiContent).not.toContain('private-key');
  expect(api.targets.every(target => target.signature === undefined)).toBe(true);
  for (const target of context.targets) {
    const { passage } = NativeJSON.parse(target.content) as { passage: keyof typeof passages };
    const hostEvidence = context.passages!.find(item => item.name === passage)!;
    const apiEvidence = api.passages!.find(item => item.name === passage)!;
    expect(hostEvidence.current).toBe(passages[passage]);
    expect(apiEvidence.current).toBeUndefined();
    expect(hostEvidence).not.toHaveProperty('currentOmitted');
    expect(apiEvidence.excerpts).toEqual(hostEvidence.excerpts);
    expect(apiEvidence.excerpts!.map(excerpt => excerpt.content).join('\n')).toContain(currentSearch);
    for (const excerpt of apiEvidence.excerpts!) expect(excerpt.content).toBe(passages[passage].slice(excerpt.offset, excerpt.offset + excerpt.content.length));
    expect(apiEvidence.excerpts!.reduce((sum, excerpt) => sum + excerpt.content.length, 0)).toBeLessThanOrEqual(12000);
  }
  expect(context.passages?.find(item => item.name === 'Large Secret')).toEqual({ name: 'Large Secret', currentOmitted: true });
  const total =
    (api.passages || []).reduce(
      (sum, passage) => sum + (passage.original?.length || 0) + (passage.current?.length || 0) + (passage.excerpts || []).reduce((size, excerpt) => size + excerpt.content.length, 0),
      0
    ) +
    context.targets.reduce((sum, target) => sum + target.content.length + (target.reference?.length || 0), 0) +
    (context.relatedRules || []).reduce((sum, rule) => sum + rule.find.length + rule.replace.length, 0);
  expect(total).toBeLessThanOrEqual(160000);

  const target = context.targets[0];
  const recipe: RepairRecipe = {
    requestId: context.requestId,
    outcome: 'repair',
    summary: 'Keep current livestock initialization',
    evidence: [],
    operations: [
      { targetId: target.id, find: target.content, replace: NativeJSON.stringify({ passage: 'Large Speech', findString: currentSearch }), expectedMatches: 1, reason: 'Use the observed current block' }
    ]
  };
  expect(RepairRecipeParser.parse(NativeJSON.stringify(recipe), context).outcome).toBe('repair');
  const unseen = structuredClone(recipe);
  unseen.operations[0].replace = NativeJSON.stringify({ passage: 'Large Speech', findString: 'FULL_CURRENT_ONLY_MARKER' });
  expect(() => RepairRecipeParser.parse(NativeJSON.stringify(unseen), context)).toThrow('outside supplied source excerpts');
  const duplicated = structuredClone(context);
  duplicated.passages!.find(passage => passage.name === 'Large Speech')!.current += '\n' + currentSearch;
  expect(RepairPrompt.content(duplicated)).toBe(apiContent);
  expect(() => RepairRecipeParser.parse(NativeJSON.stringify(recipe), duplicated)).toThrow('anchor is ambiguous');
  expect(state.merged.passageDataItems.map.get('Large Speech')?.content).toBe(large);
});

test('large passages without a local source fragment remain omitted rather than fabricated', async () => {
  const name = 'Large Missing Anchor';
  const oldSearch = '<<set $uniqueMissingAnimalValue to true>>';
  const state = sourceFixture([`[TweeReplacer] do_patch() cannot find findString: [free-attitudes] findString:[${oldSearch}] in:[${name}]`], {}, { [name]: 'unrelated source\n'.repeat(5000) }, [
    { passage: name, findString: oldSearch, replace: oldSearch + '\nexisting mod addition' }
  ]);
  const context = await RepairAgent.context(state.host, '');
  expect(context.targets).toEqual([]);
  expect(context.omittedRules).toBe(1);
  expect(context.passages).toEqual([{ name, currentOmitted: true }]);
});

test('unavailable source snapshots log their failures without fabricating passage content', async () => {
  const state = sourceFixture(['Error (:: Target): failed'], {}, {});
  const originalFailure = new Error('Original source unreadable');
  const currentFailure = new Error('Merged source unreadable');
  state.host.modSC2DataManager.getSC2DataInfoCache = () => {
    throw originalFailure;
  };
  state.host.modSC2DataManager.getSC2DataInfoAfterPatch = () => {
    throw currentFailure;
  };

  expect(RepairSources.captureOriginalPassages(state.host).size).toBe(0);
  expect((await RepairAgent.context(state.host, '')).passages).toEqual([{ name: 'Target' }]);
  expect(state.host.diagnostics.write).toHaveBeenCalledWith('Repair original passage snapshot unavailable', 'WARN', 'repair', originalFailure);
  expect(state.host.diagnostics.write).toHaveBeenCalledWith('Repair current source unavailable', 'WARN', 'repair', currentFailure);
});

test('an earlier mod is read-only evidence while precise failures prioritize the later search binding', async () => {
  const state = sourceFixture(
    ['[TweeReplacer] do_patch() cannot find findString: [free-attitudes] findString:[old anchor] in:[Target]'],
    { Target: 'old anchor' },
    { Target: 'A content new anchor' },
    [{ passage: 'Target', findString: 'old anchor', replace: 'B replacement' }]
  );
  const earlier = {
    ...state.mod,
    name: 'earlier',
    bootJson: {
      addonPlugin: [
        {
          modName: 'TweeReplacer',
          addonName: 'TweeReplacerAddon',
          params: [
            { passage: 'Target', findString: 'old anchor', replace: 'A content new anchor' },
            ...Array.from({ length: 20 }, (_, index) => ({ passage: 'Target', findString: `unrelated ${index}`, replace: `A addition ${index}` })),
            { passage: 'Target', findString: 'private-key', replace: 'do not send this rule' }
          ]
        }
      ]
    }
  };
  const plugin = state.host.modUtils.getMod('TweeReplacer')!;
  state.mod.cache.passageDataItems.items.push({ name: 'Target', content: 'B unrelated source' });
  Object.assign(state.mod, {
    replacePatcher: [{ patchInfo: { twee: [{ passageName: 'Target', fileName: 'source.twee', from: 'unrelated B search', to: 'unrelated B replacement' }] } }]
  });
  Object.assign(plugin.modRef as object, {
    isLinkerMode: false,
    info: new Map([
      [earlier.name, { mod: earlier }],
      [state.mod.name, { mod: state.mod }]
    ])
  });
  Object.assign(state.host.modUtils, {
    getModListNameNoAlias: () => [earlier.name, state.mod.name, plugin.name],
    getMod: (name: string) => (name === earlier.name ? earlier : name === state.mod.name ? state.mod : name === plugin.name ? plugin : undefined)
  });

  const context = await RepairAgent.context(state.host, 'private-key');
  expect(context.targets.map(target => [target.modName, target.kind])).toEqual([['free-attitudes', 'twee-replacer']]);
  expect(context.relatedRules).toContainEqual(expect.objectContaining({ modName: 'earlier', patcher: 'twee-replacer', destination: 'Target', find: 'old anchor', replace: 'A content new anchor' }));
  expect(context.relatedRules).toContainEqual(expect.objectContaining({ modName: 'free-attitudes', find: 'old anchor', replace: 'B replacement' }));
  expect(NativeJSON.stringify(context)).not.toContain('private-key');
  expect(context.passages).toEqual([{ name: 'Target', current: 'A content new anchor' }]);
  expect(RepairPrompt.content(context).length).toBeLessThanOrEqual(480000);
  const ordered = context.relatedRules!.filter(rule => rule.find === 'old anchor');
  expect(ordered.map(rule => rule.order)).toEqual([1, 23]);
  Object.assign(plugin.modRef as object, { isLinkerMode: true });
  expect(RepairSources.relatedRules(state.host, () => true).every(rule => rule.order === undefined)).toBe(true);
});

test('related ReplacePatcher definitions follow the loader and native rule maps, not display order', () => {
  const state = sourceFixture([], {}, {});
  const first = { passageName: 'Target', fileName: 'source.twee', from: 'old', to: 'middle' };
  const second = { ...first, from: 'middle', to: 'new' };
  const last = { ...first, from: 'new', to: 'final' };
  const patcher = (rules: (typeof first)[], registered: (typeof first)[]) => ({
    patchInfo: { twee: rules },
    patchInfoMap: { twee: new Map([['Target', registered]]), js: new Map(), css: new Map() }
  });
  const earlier = { ...state.mod, name: 'A', replacePatcher: [patcher([second, first], [first, second])] };
  const later = { ...state.mod, name: 'B', replacePatcher: [patcher([last], [last])] };
  Object.assign(state.host.modUtils, {
    getModListNameNoAlias: () => [later.name, earlier.name],
    getMod: (name: string) => (name === earlier.name ? earlier : name === later.name ? later : undefined)
  });
  Object.assign(state.host, { modLoader: { getModCacheOneArray: () => [{ mod: earlier }, { mod: later }] } });

  const rules = RepairSources.relatedRules(state.host, (kind, destination) => kind === 'twee' && destination === 'Target');
  expect(rules.map(rule => [rule.modName, rule.find, rule.replace, rule.order])).toEqual([
    ['A', 'old', 'middle', 1],
    ['A', 'middle', 'new', 2],
    ['B', 'new', 'final', 3]
  ]);
  Reflect.deleteProperty(state.host, 'modLoader');
  expect(RepairSources.relatedRules(state.host, () => true).every(rule => rule.order === undefined)).toBe(true);
});
