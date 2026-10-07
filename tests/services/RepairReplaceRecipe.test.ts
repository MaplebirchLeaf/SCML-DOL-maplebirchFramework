import { expect, test } from 'bun:test';
import { RepairEngine } from '../../src/services/Repair/Engine';
import { NativeJSON } from '../../src/services/Repair/Json';
import { RepairPrompt } from '../../src/services/Repair/Prompt';
import { RepairRecipeParser, type RepairContext, type RepairRecipe } from '../../src/services/Repair/Recipe';

async function fixture(kind: 'js' | 'css' | 'twee' = 'js') {
  const field = kind === 'twee' ? 'passageName' : 'fileName';
  const from = kind === 'twee' ? '<<print $value>>' : 'case "Alex":';
  const content = NativeJSON.stringify({ [field]: 'old-source', from });
  const context: RepairContext = {
    requestId: 'binding',
    mods: ['Legacy'],
    diagnostics: [],
    modLoaderLogs: [],
    patches: [],
    conflicts: [],
    targets: [
      {
        id: 'target-1',
        modName: 'Legacy',
        kind: 'replace-patcher',
        path: `replace-addon|2|${kind}|1|binding`,
        content,
        fingerprint: await RepairRecipeParser.fingerprint(content),
        signature: NativeJSON.stringify({ to: 'installed body' })
      }
    ],
    ...(kind === 'twee' ? { passages: [{ name: 'current-source', current: from }] } : { sources: [{ name: 'current-source', kind, current: from }] })
  };
  const recipe: RepairRecipe = {
    requestId: context.requestId,
    outcome: 'repair',
    summary: 'Relocate the existing native patch',
    evidence: [],
    operations: [
      {
        targetId: 'target-1',
        find: content,
        replace: NativeJSON.stringify({ from, [field]: 'current-source' }),
        expectedMatches: 1,
        reason: 'Anchor still exists uniquely in the observed new destination'
      }
    ]
  };
  return { context, recipe, field, from };
}

test.each(['js', 'css', 'twee'] as const)('prepares atomic %s destination repairs without changing the installed body', async kind => {
  const { context, recipe, field, from } = await fixture(kind);
  const [overlay] = await RepairEngine.prepare(recipe, context, target => target.content);
  expect(overlay.after).toBe(NativeJSON.stringify({ [field]: 'current-source', from }));
  expect(overlay.target.signature).toBe(context.targets[0].signature!);
  expect(overlay.replacement).toBeUndefined();
  const operation = recipe.operations[0];
  if (operation.type === 'state') throw new Error('Expected a source repair');
  expect(context.targets[0].content).toBe(operation.find);
});

test('binding repairs require observed unique destination source and reject generated body fields', async () => {
  const { context, recipe, from } = await fixture();
  const invalid = (replace: object) => ({ ...recipe, operations: [{ ...recipe.operations[0], replace: NativeJSON.stringify(replace) }] });
  expect(() => RepairRecipeParser.parse(NativeJSON.stringify(invalid({ fileName: 'guessed.js', from })), context)).toThrow('current source unavailable');
  expect(() => RepairRecipeParser.parse(NativeJSON.stringify(invalid({ fileName: 'current-source', from, to: 'new code' })), context)).toThrow('Invalid ReplacePatcher search binding');
  expect(() => RepairRecipeParser.parse(NativeJSON.stringify(invalid({ fileName: 'current-source', from: 'missing' })), context)).toThrow('found 0, expected 1');
  context.sources![0].current = from + '\n' + from;
  expect(() => RepairRecipeParser.parse(NativeJSON.stringify(recipe), context)).toThrow('found 2, expected 1');
});

test('private native source validates full counts while model sees only supplied excerpts', async () => {
  const { context, recipe, from } = await fixture();
  context.sources![0] = { name: 'current-source', kind: 'js', current: from + '\nprivate unrelated body', excerpts: [{ offset: 0, content: from }] };
  expect(RepairRecipeParser.parse(NativeJSON.stringify(recipe), context)).toEqual(recipe);
  const sent = NativeJSON.parse(RepairPrompt.content(context)) as RepairContext;
  expect(sent.sources![0]).not.toHaveProperty('current');
  expect(sent.sources![0].excerpts).toEqual(context.sources![0].excerpts!);
  context.sources![0].current += '\n' + from;
  expect(() => RepairRecipeParser.parse(NativeJSON.stringify(recipe), context)).toThrow('found 2, expected 1');
  context.sources![0].current = from;
  context.sources![0].excerpts = [{ offset: from.length, content: 'unrelated body' }];
  expect(() => RepairRecipeParser.parse(NativeJSON.stringify(recipe), context)).toThrow('outside supplied source excerpts');
});
