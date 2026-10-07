import { expect, test } from 'bun:test';
import { RepairRecipeParser, type RepairContext } from '../../../src/services/Repair/Recipe';

function fixture(kind: 'js' | 'twee', content: string, find = 'V.old', replace = 'V.current') {
  const context: RepairContext = {
    requestId: 'path-rename',
    mods: ['example'],
    diagnostics: [],
    modLoaderLogs: [],
    patches: [],
    conflicts: [],
    targets: [{ id: 'target-1', modName: 'example', kind, path: 'source', fingerprint: `sha256:${'a'.repeat(64)}`, content }],
    scripts: [{ name: 'current.js', symbols: [], excerpts: [{ line: 1, content: `const value = ${replace};` }] }]
  };
  const recipe = {
    requestId: context.requestId,
    outcome: 'repair',
    summary: 'Use the observed current path.',
    evidence: ['Current source uses the replacement path.'],
    operations: [{ targetId: 'target-1', find, replace, expectedMatches: 1, reason: 'Correct the renamed path.' }]
  };
  return { context, recipe, parse: () => RepairRecipeParser.parse(JSON.stringify(recipe), context) };
}

test('renames complete setup paths and story or temporary variables on reads and writes', () => {
  for (const [kind, content, find, replace] of [
    ['js', 'const value = setup.old;', 'setup.old', 'setup.current'],
    ['js', 'V.old = 3;', 'V.old', 'V.current'],
    ['js', '++C.npc.Remy.old;', 'C.npc.Remy.old', 'C.npc.Remy.current'],
    ['twee', '<<set $livestock_milk += 1>>', '$livestock_milk', '$livestock.milk'],
    ['twee', '<<if _old.value>>Text<</if>>', '_old.value', '_current.value'],
    ['twee', "Narrator's text <<script>>setup.old = 3;<</script>>", 'setup.old', 'setup.current'],
    ['twee', '<<print setup.old()>>', 'setup.old', 'setup.current']
  ] as const) {
    const state = fixture(kind, content, find, replace);
    expect(state.parse().operations).toEqual(state.recipe.operations);
  }
});

test('replacement evidence must come from current executable source', () => {
  const state = fixture('js', 'const value = V.old;');
  state.context.scripts = [];
  state.context.passages = [{ name: 'Old', original: '<<set V.current to 3>>' }];
  expect(state.parse).toThrow('Replacement path is not observed in current source');
  state.context.passages[0].current = '<<set V.current to 3>>';
  expect(state.parse().operations).toEqual(state.recipe.operations);
  state.context.passages[0].current = 'V.current';
  expect(state.parse).toThrow('Replacement path is not observed in current source');
  state.context.targets.push({ ...state.context.targets[0], id: 'target-2', content: 'const value = V.current;' });
  expect(state.parse().operations).toEqual(state.recipe.operations);
});

test('strings, comments and partial paths cannot provide evidence', () => {
  for (const content of ['"V.current";', "'V.current';", '`V.current`;', '// V.current', '/* V.current */', 'V.current.extra;', 'V.current_more;', 'obj.V.current;', 'V.current[index];']) {
    const state = fixture('js', 'V.old = 1;');
    state.context.scripts![0].excerpts[0].content = content;
    expect(state.parse).toThrow('Replacement path is not observed in current source');
  }
});

test('source accesses must be whole paths in code, including Unicode token boundaries', () => {
  for (const content of ['"V.old";', '// V.old', '/* V.old */', 'obj.V.old;', 'V.old.extra;', 'V.old_more;', 'V.old变量;', 'V.old[index];', 'V.old`tag`;']) {
    const state = fixture('js', content);
    expect(state.parse).toThrow('Repair path is not a complete code access');
  }
});

test('Twee paths stay inside supported expressions or script bodies', () => {
  for (const content of [
    'V.old',
    '<<capture V.old>>',
    '<<widget "V.old">>Text<</widget>>',
    '<span data-path="V.old">Text</span>',
    '[[V.old]]',
    '<<print "V.old">>',
    '<<script>>// V.old\n<</script>>'
  ]) {
    const state = fixture('twee', content);
    expect(state.parse).toThrow('Repair path is not a complete code access');
  }
});

test('dangerous properties, arbitrary expressions and new calls remain unsupported', () => {
  for (const replace of ['V.constructor', 'setup.__proto__.value', 'V.prototype.foo', '$__proto__.foo', '_constructor.value', 'V.current()', 'V.current || 0', 'globalThis.current']) {
    const state = fixture('js', 'const value = V.old;', 'V.old', replace);
    expect(state.parse).toThrow();
  }
});

test('property guards continue to reject writes and constructors while protecting reads', () => {
  const find = 'V.player.virginity';
  const replace = 'V?.player?.virginity';
  for (const content of [`${find} = true;`, `++${find};`, `new ${find}();`]) expect(fixture('js', content, find, replace).parse).toThrow('Property guard cannot modify a write or constructor');
  const read = fixture('js', `const value = ${find};`, find, replace);
  read.context.scripts = [];
  expect(read.parse().operations).toEqual(read.recipe.operations);
  const script = fixture('twee', `<<script>>const value = ${find};<</script>>`, find, replace);
  expect(script.parse().operations).toEqual(script.recipe.operations);
});
