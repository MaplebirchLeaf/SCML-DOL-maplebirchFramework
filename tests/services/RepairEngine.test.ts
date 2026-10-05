import { expect, test } from 'bun:test';
import { RepairEngine } from '../../src/services/Repair/Engine';
import { RepairRecipeParser, type RepairContext, type RepairRecipe } from '../../src/services/Repair/Recipe';

async function fixture() {
  const context: RepairContext = {
    requestId: '1',
    mods: ['example'],
    diagnostics: [],
    modLoaderLogs: [],
    patches: [],
    conflicts: [],
    targets: [{ id: '1', modName: 'example', kind: 'patch-anchor', path: 'widget:anchor', content: 'old old', fingerprint: await RepairRecipeParser.fingerprint('old old') }]
  };
  const recipe: RepairRecipe = {
    requestId: '1',
    outcome: 'repair',
    summary: 'Change',
    evidence: [],
    operations: [{ targetId: '1', find: 'old', replace: '$&', expectedMatches: 2, reason: 'literal text' }]
  };
  return { context, recipe };
}

test('prepares literal overlays without changing originals', async () => {
  const { context, recipe } = await fixture();
  const result = await RepairEngine.prepare(recipe, context, () => 'old old');
  expect(result[0].after).toBe('$& $&');
  expect(result[0].fingerprint).toBe(await RepairRecipeParser.fingerprint('$& $&'));
  expect(context.targets[0].content).toBe('old old');
});

test('canonicalizes an atomic TweeReplacer binding without rewriting the live rule', async () => {
  const { context, recipe } = await fixture();
  const before = JSON.stringify({ passage: 'Old', findString: 'old' });
  context.targets[0] = { ...context.targets[0], kind: 'twee-replacer', path: 'twee-replacer|0|0', content: before, fingerprint: await RepairRecipeParser.fingerprint(before) };
  context.passages = [{ name: 'Current', current: 'new anchor' }];
  recipe.operations = [{ targetId: '1', find: before, replace: '{\n  "findString": "new anchor", "passage": "Current"\n}', expectedMatches: 1, reason: 'Use the observed search binding' }];
  const result = await RepairEngine.prepare(recipe, context, () => before);
  const after = JSON.stringify({ passage: 'Current', findString: 'new anchor' });
  expect(result[0].after).toBe(after);
  expect(result[0].fingerprint).toBe(await RepairRecipeParser.fingerprint(after));
  expect(context.targets[0].content).toBe(before);
});

test('derives replacement bodies from bound existing edits and keeps model flags out of native bindings', async () => {
  const { context, recipe } = await fixture();
  const original = '<<if $livestock_milk is undefined>><<set $livestock_milk to 0>><</if>>';
  const current = '<<if $livestock.milk is undefined>><<set $livestock.milk to 0>><</if>>';
  const replacement = `<<set $livestock_milk_max to 0>>\n${original}`;
  const before = JSON.stringify({ passage: 'Livestock Milking End', findString: original });
  context.targets[0] = {
    ...context.targets[0],
    kind: 'twee-replacer',
    path: 'twee-replacer|0|46',
    content: before,
    signature: JSON.stringify({ companion: { replace: replacement } }),
    fingerprint: await RepairRecipeParser.fingerprint(before)
  };
  context.passages = [{ name: 'Livestock Milking End', current: `<<effects>>\n${current}\n<<pass 180>>` }];
  recipe.operations = [
    {
      targetId: '1',
      find: before,
      replace: JSON.stringify({ passage: 'Livestock Milking End', findString: current, rebase: true }),
      expectedMatches: 1,
      reason: 'Keep current initialization and existing mod addition'
    }
  ];
  const overlays = await RepairEngine.prepare(recipe, context, () => before);
  expect(overlays[0].replacement).toEqual({ before: replacement, after: `<<set $livestock_milk_max to 0>>\n${current}` });
  expect(JSON.parse(overlays[0].after)).toEqual({ passage: 'Livestock Milking End', findString: current });
  expect(context.targets[0].content).toBe(before);

  recipe.operations[0].replace = JSON.stringify({ passage: 'Livestock Milking End', findString: current });
  expect((await RepairEngine.prepare(recipe, context, () => before))[0].replacement).toBeUndefined();

  recipe.operations[0].replace = JSON.stringify({ passage: 'Livestock Milking End', findString: current, rebase: true });
  context.targets[0].signature = JSON.stringify({ companion: { replaceFile: 'body.txt' }, replacement });
  expect((await RepairEngine.prepare(recipe, context, () => before))[0].replacement).toEqual(overlays[0].replacement);
});

test('Free Attitudes retains its installed body when the updated restriction contains a disabled radio', async () => {
  const { context, recipe } = await fixture();
  const old = '<<if $submissive gt 850>>\n\t<label><<radiobutton "$speech_attitude" "meek" autocheck>></label>\n<<else>>\n\t<span>Locked</span>\n<</if>>';
  const current = old.replace('<span>Locked</span>', '<input type="radio" disabled /><span>Locked</span>');
  const replacement = '<label><<radiobutton "$speech_attitude" "meek" autocheck>></label>';
  const before = JSON.stringify({ passage: 'Widgets Attitudes', findString: old });
  context.targets[0] = {
    ...context.targets[0],
    kind: 'twee-replacer',
    path: 'twee-replacer|0|0',
    content: before,
    signature: JSON.stringify({ companion: { replace: replacement } }),
    fingerprint: await RepairRecipeParser.fingerprint(before)
  };
  context.passages = [{ name: 'Widgets Attitudes', current }];
  recipe.operations = [
    { targetId: '1', find: before, replace: JSON.stringify({ passage: 'Widgets Attitudes', findString: current }), expectedMatches: 1, reason: 'Remove the restriction as the mod intends' }
  ];
  const overlays = await RepairEngine.prepare(recipe, context, () => before);
  expect(overlays[0].replacement).toBeUndefined();
  expect(JSON.parse(overlays[0].after).findString).toBe(current);
  expect(JSON.parse(context.targets[0].signature!).companion.replace).toBe(replacement);

  recipe.operations[0].replace = JSON.stringify({ passage: 'Widgets Attitudes', findString: current, rebase: true });
  await expect(RepairEngine.prepare(recipe, context, () => before)).rejects.toThrow('Mod and current source edits overlap');
});

test('rejects arbitrary replacement bodies, unsupported rebase flags and overlapping migration', async () => {
  const { context, recipe } = await fixture();
  const before = JSON.stringify({ passage: 'Target', findString: 'old' });
  context.targets[0] = {
    ...context.targets[0],
    kind: 'twee-replacer',
    path: 'twee-replacer|0|0',
    content: before,
    signature: JSON.stringify({ companion: { replace: 'different' } }),
    fingerprint: await RepairRecipeParser.fingerprint(before)
  };
  context.passages = [{ name: 'Target', current: 'current' }];
  for (const value of [
    { passage: 'Target', findString: 'current', replace: 'arbitrary()' },
    { passage: 'Target', findString: 'current', rebase: false },
    { passage: 'Target', findString: 'current', rebase: 'true' },
    { passage: 'Target', findString: 'current', rebase: true }
  ]) {
    recipe.operations = [{ targetId: '1', find: before, replace: JSON.stringify(value), expectedMatches: 1, reason: 'Rejected migration' }];
    await expect(RepairEngine.prepare(recipe, context, () => before)).rejects.toThrow();
  }
});

test('rejects changed content and forged fingerprints', async () => {
  const { context, recipe } = await fixture();
  await expect(RepairEngine.prepare(recipe, context, () => 'changed')).rejects.toThrow();
  context.targets[0].fingerprint = `sha256:${'0'.repeat(64)}`;
  await expect(RepairEngine.prepare(recipe, context, () => 'old old')).rejects.toThrow();
});

test('rejects sources changing while asynchronous validation runs', async () => {
  const { context, recipe } = await fixture();
  let reads = 0;
  await expect(RepairEngine.prepare(recipe, context, () => (++reads === 1 ? 'old old' : 'changed'))).rejects.toThrow();
});

test('uses only target fingerprints and matching even when the diagnostic mod list changes', async () => {
  const { context, recipe } = await fixture();
  context.mods = [];
  expect((await RepairEngine.prepare(recipe, context, () => 'old old')).length).toBe(1);
  context.mods = ['unrelated'];
  expect((await RepairEngine.prepare(recipe, context, () => 'old old')).length).toBe(1);
});

test('retains match count checks on preparation', async () => {
  const { context, recipe } = await fixture();
  recipe.operations[0].expectedMatches = 1;
  await expect(RepairEngine.prepare(recipe, context, () => 'old old')).rejects.toThrow();
});

test('revalidates stored executable operations instead of trusting prior acceptance', async () => {
  const { context, recipe } = await fixture();
  context.targets[0].kind = 'js';
  context.targets[0].content = 'const value = V.player.virginity;';
  context.targets[0].fingerprint = await RepairRecipeParser.fingerprint(context.targets[0].content);
  recipe.operations = [{ targetId: '1', find: 'V.player.virginity', replace: 'V?.player?.virginity', expectedMatches: 1, reason: 'Guard absent legacy state.' }];
  const result = await RepairEngine.prepare(recipe, context, () => context.targets[0].content);
  expect(result[0].after).toBe('const value = V?.player?.virginity;');
  recipe.operations[0].replace = 'fetch("https://example.invalid")';
  await expect(RepairEngine.prepare(recipe, context, () => context.targets[0].content)).rejects.toThrow('framework property guard');
});
