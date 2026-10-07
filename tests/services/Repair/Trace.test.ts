import { expect, test } from 'bun:test';
import type ModLoader from '../../../src/host/ModLoader';
import { RepairAgent } from '../../../src/services/Repair/Agent';
import { NativeJSON } from '../../../src/services/Repair/Json';
import { RepairSources, type RepairSource } from '../../../src/services/Repair/Source';

type Sources = Record<string, string>;

function sc2(passages: Sources = {}, scripts: Sources = {}, styles: Sources = {}) {
  const records = (values: Sources) => {
    const items = Object.entries(values).map(([name, content]) => ({ name, content }));
    return { items, map: new Map(items.map(item => [item.name, item])) };
  };
  return { passageDataItems: records(passages), scriptFileItems: records(scripts), styleFileItems: records(styles) };
}

function traceFixture(messages: string[], passages: Sources, scripts: Sources, modSources: Array<{ name: string; passages?: Sources; scripts?: Sources; styles?: Sources }> = []) {
  const current = sc2(passages, scripts);
  const original = sc2({ TempleQuarters: 'original temple source' }, { 'colours.js': 'original colours source' });
  const mods = modSources.map(mod => ({ name: mod.name, replacePatcher: [], cache: sc2(mod.passages, mod.scripts, mod.styles) }));
  let originalReads = 0;
  let currentReads = 0;
  const host = {
    diagnostics: { write() {}, history: messages.map(message => ({ level: 'ERROR', message })), patches: [], conflicts: [] },
    modLoaderGui: {},
    modUtils: { getModListNameNoAlias: () => mods.map(mod => mod.name), getMod: (name: string) => mods.find(mod => mod.name === name) },
    modSC2DataManager: {
      getSC2DataInfoCache: () => {
        originalReads++;
        return original;
      },
      getSC2DataInfoAfterPatch: () => {
        currentReads++;
        return current;
      }
    }
  } as unknown as ModLoader;
  return { host, current, original, mods, reads: () => ({ original: originalReads, current: currentReads }) };
}

const templeError =
  'Error (::TempleQuarters): <<img>>: error within widget code (Error: <<canvasimg>>: error within widget code (Error: <<animatemodel>>: Cannot read properties of undefined (reading "rgb")))\n    at Object.getSkinRgb (<anonymous>:120:24)';

const templePassages = {
  TempleQuarters: '<<img "pc">>',
  'Widgets Image': '<<widget "img">><<canvasimg "pc">><</widget>>',
  'Widgets Canvas': '<<widget "canvasimg">><<animatemodel "pc">><</widget>>',
  'Widgets Animation': '<<widget "animatemodel">><<set _filter = getSkinFilter("light")>><</widget>>',
  Unrelated: 'unrelated passage source must stay local'
};

const colourCore = [
  'const skin_options = { light: { rgb: [255, 220, 190] } };',
  ...Array.from({ length: 36 }, (_, index) => `const dataSpacing${index} = "unrelated palette value";`),
  'function getSkinFilter(name) {',
  '  const rgb = Object.getSkinRgb(name);',
  '  return rgb.join(",");',
  '}',
  ...Array.from({ length: 36 }, (_, index) => `const callerSpacing${index} = "unrelated palette value";`),
  'Object.getSkinRgb = function (name) {',
  '  return skin_options[name].rgb;',
  '};'
].join('\n');

function longColours(core = colourCore) {
  return [
    'throw new Error("SOURCE_MUST_NOT_EXECUTE");',
    'const distantHeader = "UNRELATED_SOURCE_HEADER";',
    ...Array.from({ length: 160 }, (_, index) => `const before${index} = "unrelated colour configuration ${index}";`),
    core,
    ...Array.from({ length: 160 }, (_, index) => `const after${index} = "unrelated colour configuration ${index}";`),
    'const distantFooter = "UNRELATED_SOURCE_FOOTER";'
  ].join('\n');
}

test('nested widget errors locate definition passages and current JS by symbol without filenames', () => {
  const scripts = { 'colours.js': longColours(), 'unrelated.js': 'const unrelatedSource = "NEVER_SEND_THIS_SCRIPT";' };
  const state = traceFixture([templeError], templePassages, scripts);
  const trace = RepairSources.trace(state.current as unknown as RepairSource, [templeError], ['TempleQuarters']);

  expect(new Set(trace.passages)).toEqual(new Set(['TempleQuarters', 'Widgets Image', 'Widgets Canvas', 'Widgets Animation']));
  expect(trace.scripts.map(script => script.name)).toEqual(['colours.js']);
  const [script] = trace.scripts;
  const excerpts = script.excerpts.map(excerpt => excerpt.content).join('\n');
  expect(script.symbols.some(symbol => symbol.includes('getSkinRgb'))).toBe(true);
  expect(excerpts).toContain('Object.getSkinRgb = function');
  expect(excerpts).toContain('function getSkinFilter');
  expect(excerpts).toContain('skin_options');
  expect(excerpts).not.toContain('UNRELATED_SOURCE_HEADER');
  expect(excerpts).not.toContain('UNRELATED_SOURCE_FOOTER');
  expect(excerpts).not.toContain('NEVER_SEND_THIS_SCRIPT');
  expect(excerpts.length).toBeLessThanOrEqual(4000);
  for (const excerpt of script.excerpts) {
    expect(excerpt.line).toBeGreaterThan(0);
    expect(
      scripts['colours.js']
        .split('\n')
        .slice(excerpt.line - 1)
        .join('\n')
        .startsWith(excerpt.content)
    ).toBe(true);
  }
});

test('a unique JS symbol traces a distant caller and shared data without passage or filename hints', () => {
  const state = traceFixture([], {}, { 'colours.js': longColours() });
  const trace = RepairSources.trace(state.current as unknown as RepairSource, ['TypeError: Object.getSkinRgb failed\n    at Object.getSkinRgb (<anonymous>:1:1)'], []);
  const excerpts = trace.scripts
    .flatMap(script => script.excerpts)
    .map(excerpt => excerpt.content)
    .join('\n');
  expect(trace.scripts.map(script => script.name)).toEqual(['colours.js']);
  expect(excerpts).toContain('Object.getSkinRgb = function');
  expect(excerpts).toContain('function getSkinFilter');
  expect(excerpts).toContain('const skin_options');
});

test('context includes traced current evidence and keeps vanilla JS outside writable targets', async () => {
  const state = traceFixture([templeError], templePassages, { 'colours.js': longColours() });
  const before = structuredClone(state.current);
  const context = await RepairAgent.context(state.host, '');

  expect(context.passages?.map(passage => passage.name)).toEqual(expect.arrayContaining(['TempleQuarters', 'Widgets Image', 'Widgets Canvas', 'Widgets Animation']));
  expect(context.scripts?.map(script => script.name)).toEqual(['colours.js']);
  expect(context.targets).toEqual([]);
  expect(state.current).toEqual(before);
  expect(state.reads()).toEqual({ original: 0, current: 1 });
  const serialized = NativeJSON.stringify(context);
  expect(serialized).toContain('getSkinRgb');
  expect(serialized).not.toContain('original colours source');
  expect(serialized).not.toContain('unrelated passage source must stay local');
  expect(serialized).not.toContain('UNRELATED_SOURCE_HEADER');
  expect(serialized).not.toContain('UNRELATED_SOURCE_FOOTER');
});

test('symbol tracing retains existing writable capability only for matching loaded mod JS', async () => {
  const modColour = 'Object.getSkinRgb = function (name) { return skin_options[name].rgb; };';
  const state = traceFixture([templeError], templePassages, { 'colours.js': colourCore }, [
    {
      name: 'colour-addon',
      scripts: { 'colours.js': modColour, 'unrelated.js': 'const privateUnrelated = "UNRELATED_MOD_SOURCE";' },
      styles: { 'colours.js': '.style-decoy { content: "CSS_WITH_SAME_NAME"; }' }
    },
    { name: 'other-addon', scripts: { 'elsewhere.js': 'const otherSource = "UNRELATED_OTHER_MOD";' } }
  ]);
  const before = structuredClone(state.mods);
  const context = await RepairAgent.context(state.host, '');

  expect(context.targets).toHaveLength(1);
  expect(context.targets[0]).toMatchObject({ modName: 'colour-addon', kind: 'js', path: 'colours.js', content: modColour });
  expect(context.targets[0].id).toBe('target-1');
  expect(context.scripts?.map(script => script.name)).toEqual(['colours.js']);
  expect(state.mods).toEqual(before);
  expect(NativeJSON.stringify(context)).not.toContain('UNRELATED_MOD_SOURCE');
  expect(NativeJSON.stringify(context)).not.toContain('UNRELATED_OTHER_MOD');
  expect(NativeJSON.stringify(context)).not.toContain('CSS_WITH_SAME_NAME');
});

test('comments and quoted declaration text do not create false JS evidence', () => {
  const state = traceFixture(
    [],
    {},
    {
      'comment.js': '// Object.getSkinRgb = function (name) { return "COMMENT_DECOY"; };',
      'string.js': 'const sample = "Object.getSkinRgb = function (name) { return STRING_DECOY; };";',
      'colours.js': colourCore
    }
  );
  const trace = RepairSources.trace(state.current as unknown as RepairSource, ['TypeError at Object.getSkinRgb (<anonymous>:2:1)'], []);
  expect(trace.scripts.map(script => script.name)).toEqual(['colours.js']);
  expect(NativeJSON.stringify(trace)).not.toContain('DECOY');
});

test('closing macro markup does not discover unrelated widget definitions', () => {
  const state = traceFixture(
    [],
    {
      Main: '<</closedOnly>><<visible>>',
      'Visible Definition': '<<widget "visible">>Visible output<</widget>>',
      'Closed Definition': '<<widget "closedOnly">>CLOSED_MACRO_DECOY<</widget>>'
    },
    {}
  );
  const trace = RepairSources.trace(state.current as unknown as RepairSource, ['Error (::Main): <<visible>> failed'], ['Main']);
  expect(new Set(trace.passages)).toEqual(new Set(['Main', 'Visible Definition']));
});

test('recursive widget definitions are collected once and terminate', () => {
  const state = traceFixture(
    [],
    {
      Main: '<<loop>>',
      'Loop Definition': '<<widget "loop">><<nextLoop>><</widget>>',
      'Next Loop Definition': '<<widget "nextLoop">><<loop>><</widget>>'
    },
    {}
  );
  const trace = RepairSources.trace(state.current as unknown as RepairSource, ['Error (::Main): <<loop>> failed'], ['Main']);
  expect(trace.passages).toHaveLength(3);
  expect(new Set(trace.passages)).toEqual(new Set(['Main', 'Loop Definition', 'Next Loop Definition']));
});

test('ambiguous generic functions preserve both direct candidates without choosing an unrelated caller', () => {
  const state = traceFixture(
    [],
    {},
    {
      'first.js': 'function render() { return "FIRST_RENDER"; }',
      'second.js': 'function render() { return "SECOND_RENDER"; }',
      'caller.js': 'function unrelatedCaller() { return render(); }'
    }
  );
  const trace = RepairSources.trace(state.current as unknown as RepairSource, ['TypeError: render failed\n    at render (<anonymous>:1:1)'], []);
  expect(trace.scripts.map(script => script.name).sort()).toEqual(['first.js', 'second.js']);
  expect(NativeJSON.stringify(trace)).not.toContain('unrelatedCaller');
});

test('macro cycles, large symbol input and many declarations stay bounded', () => {
  const passages: Sources = { Main: '<<cycle0>>' };
  for (let index = 0; index < 60; index++) passages[`Cycle ${index}`] = `<<widget "cycle${index}">><<cycle${(index + 1) % 60}>><</widget>>`;
  const scripts = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`render-${index}.js`, 'function render() { return "x"; }\n'.repeat(200)]));
  const malformed = `Error (::Main): <<${'x'.repeat(5000)}>> at Object.${'y'.repeat(5000)}\n at render (<anonymous>:1:1)`;
  const state = traceFixture([], passages, scripts);
  const trace = RepairSources.trace(state.current as unknown as RepairSource, [malformed], ['Main']);

  expect(trace.passages).toContain('Main');
  expect(trace.passages).toContain('Cycle 0');
  expect(trace.passages.length).toBeLessThanOrEqual(16);
  expect(new Set(trace.passages).size).toBe(trace.passages.length);
  expect(trace.scripts.length).toBeGreaterThan(0);
  expect(trace.scripts.length).toBeLessThanOrEqual(8);
  expect(new Set(trace.scripts.flatMap(script => script.symbols)).size).toBeLessThanOrEqual(32);
  expect(trace.scripts.flatMap(script => script.symbols).every(symbol => symbol.length < 5000)).toBe(true);
  for (const script of trace.scripts) expect(script.excerpts.reduce((size, excerpt) => size + excerpt.content.length, 0)).toBeLessThanOrEqual(4000);
  expect(RepairSources.trace(undefined, [malformed], ['Main'])).toEqual({ passages: ['Main'], scripts: [] });
});

test('credentials outside selected excerpts exclude the complete script from API context', async () => {
  const apiKey = 'fixture-private-key-' + 'q'.repeat(40);
  const secretSource = longColours(`const unrelatedCredential = "${apiKey}";\n${'const safePadding = "padding";\n'.repeat(1000)}${colourCore}`);
  const state = traceFixture([templeError], templePassages, { 'colours.js': secretSource }, [{ name: 'colour-addon', scripts: { 'colours.js': secretSource } }]);
  const trace = RepairSources.trace(state.current as unknown as RepairSource, [templeError], ['TempleQuarters']);
  expect(trace.scripts).toHaveLength(1);
  expect(
    trace.scripts
      .flatMap(script => script.excerpts)
      .map(excerpt => excerpt.content)
      .join('\n')
  ).not.toContain(apiKey);

  const context = await RepairAgent.context(state.host, apiKey);
  expect(context.scripts || []).toEqual([]);
  expect(context.targets).toEqual([]);
  expect(NativeJSON.stringify(context)).not.toContain(apiKey);
});

test('escaped traces fit the API budget and do not replace existing evidence', async () => {
  const escaped = '"\\\n'.repeat(2000);
  const state = traceFixture(
    Array.from({ length: 40 }, () => templeError + escaped),
    templePassages,
    { 'colours.js': longColours() },
    [{ name: 'colour-addon', scripts: { 'colours.js': colourCore } }]
  );
  const context = await RepairAgent.context(state.host, '');
  expect(NativeJSON.stringify(context).length).toBeLessThanOrEqual(240000);
  expect(context.targets[0]).toMatchObject({ modName: 'colour-addon', kind: 'js', path: 'colours.js' });
  expect(context.scripts?.[0].name).toBe('colours.js');
});

test('wrapped short stacks keep the failed function and caller ahead of other passage references', () => {
  const scripts: Sources = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`helper-${index}.js`, `function helper${index}() { return ${index}; }`]));
  scripts['last-colours.js'] = colourCore;
  const state = traceFixture([], { Main: Array.from({ length: 12 }, (_, index) => `<<run helper${index}()>>`).join('\n') }, scripts);
  const trace = RepairSources.trace(state.current as unknown as RepairSource, ['Error (::Main): <<script>> failed at Object.getSkinRgb )))'], ['Main']);
  expect(trace.scripts[0].name).toBe('last-colours.js');
  expect(trace.scripts[0].symbols).toEqual(expect.arrayContaining(['getSkinRgb', 'getSkinFilter']));
  expect(trace.scripts.length).toBeLessThanOrEqual(8);
});

test('quoted macro closing text does not hide the following JS function reference', () => {
  const state = traceFixture([], { Main: '<<set _marker = ">>", _skin = Object.getSkinRgb("light")>>' }, { 'colours.js': colourCore });
  const trace = RepairSources.trace(state.current as unknown as RepairSource, ['Error (::Main): <<set>> failed'], ['Main']);
  expect(trace.scripts[0].symbols).toContain('getSkinRgb');
});

test('long single-line sources retain accurate excerpt columns', () => {
  const source = 'const padding = 0;'.repeat(500) + colourCore.replaceAll('\n', ' ');
  const state = traceFixture([], {}, { 'minified.js': source });
  const trace = RepairSources.trace(state.current as unknown as RepairSource, ['at Object.getSkinRgb (<anonymous>:1:2)'], []);
  expect(trace.scripts[0].symbols).toContain('getSkinRgb');
  for (const excerpt of trace.scripts[0].excerpts) {
    expect(excerpt.line).toBe(1);
    expect(excerpt.column).toBeGreaterThan(1);
    expect(source.slice(excerpt.column! - 1).startsWith(excerpt.content)).toBe(true);
  }
});

test('property names and constants from other scopes do not fabricate shared data evidence', () => {
  const state = traceFixture(
    [],
    {},
    {
      'colours.js':
        'function hiddenConfig() { const skin_options = "OTHER_SCOPE"; return skin_options; }\nObject.getSkinRgb = function () { return skin_options.light.rgb + setup.colours.skin_options.light.rgb; };',
      'unrelated.js': 'const colours = "OTHER_FILE";'
    }
  );
  const trace = RepairSources.trace(state.current as unknown as RepairSource, ['at Object.getSkinRgb (<anonymous>:1:2)'], []);
  expect(trace.scripts.map(script => script.name)).toEqual(['colours.js']);
  expect(trace.scripts[0].symbols).not.toContain('skin_options');
  expect(trace.scripts[0].symbols).not.toContain('colours');
});
