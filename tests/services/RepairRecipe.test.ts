import { expect, test } from 'bun:test';
import { RepairRecipeParser, type RepairContext } from '../../src/services/Repair/Recipe';
import { RepairPrompt } from '../../src/services/Repair/Prompt';

const context: RepairContext = {
  requestId: 'request-1',
  mods: ['example'],
  diagnostics: [],
  modLoaderLogs: [],
  patches: [],
  conflicts: [],
  targets: [{ id: 'target-1', modName: 'example', kind: 'css', path: 'style.css', fingerprint: `sha256:${'a'.repeat(64)}`, content: '.example { color: reed; }' }]
};
const proposal = () => ({
  requestId: 'request-1',
  outcome: 'repair',
  summary: 'Correct CSS colour.',
  evidence: ['Unknown colour reed.'],
  operations: [{ targetId: 'target-1', find: 'reed', replace: 'red', expectedMatches: 1, reason: 'Correct typo.' }]
});

test('accepts bounded literal proposals without modifying source', () => {
  const before = JSON.stringify(context);
  expect(RepairRecipeParser.parse(JSON.stringify(proposal()), context).operations[0].replace).toBe('red');
  expect(JSON.stringify(context)).toBe(before);
  expect(RepairRecipeParser.parse(JSON.stringify({ ...proposal(), outcome: 'insufficient-context', operations: [] }), context).operations).toEqual([]);
});

test('identifies no-op and match count failures without exposing source text', () => {
  const invalid = (find: string, replace: string, expectedMatches = 1) => ({
    ...proposal(),
    operations: [{ ...proposal().operations[0], find, replace, expectedMatches }]
  });
  expect(() => RepairRecipeParser.parse(JSON.stringify(invalid('reed', 'reed')), context)).toThrow('Unchanged repair operation: target-1');
  expect(() => RepairRecipeParser.parse(JSON.stringify(invalid('private source', 'red')), context)).toThrow('Repair search match count: target-1 (found 0, expected 1)');
  expect(() => RepairRecipeParser.parse(JSON.stringify(invalid('reed', 'red', 2)), context)).toThrow('Repair search match count: target-1 (found 1, expected 2)');
});

test('accepts large recipes while retaining per-operation template validation', () => {
  const find = 'a'.repeat(18000);
  const replace = 'b'.repeat(18000);
  const targets = Array.from({ length: 8 }, (_, index) => ({ ...context.targets[0], id: `target-${index}`, content: `.example { font-family: ${find}; }` }));
  const recipe = {
    ...proposal(),
    operations: targets.map(target => ({ ...proposal().operations[0], targetId: target.id, find, replace }))
  };
  const json = JSON.stringify(recipe);
  expect(json.length).toBeGreaterThan(256000);
  expect(RepairRecipeParser.parse(json, { ...context, targets }).operations).toHaveLength(8);
  recipe.operations[0].replace = 'url(https://example.test/style)';
  expect(() => RepairRecipeParser.parse(JSON.stringify(recipe), { ...context, targets })).toThrow();
});

test('TweeReplacer repairs must bind to one observed current passage match', () => {
  const old = '\t<<if $submissive gt 850>>';
  const updated = '\t\t<<if $submissive gt 850>>';
  const bound: RepairContext = {
    ...context,
    passages: [{ name: 'Widgets Attitudes', original: old, current: updated }],
    targets: [
      {
        ...context.targets[0],
        kind: 'twee-replacer',
        path: 'twee-replacer|0|0',
        content: JSON.stringify({ passage: 'Widgets Attitudes', findString: old }),
        signature: JSON.stringify({ companion: { replace: 'existing mod output' } })
      }
    ]
  };
  const p = { ...proposal(), operations: [{ ...proposal().operations[0], find: bound.targets[0].content, replace: JSON.stringify({ passage: 'Widgets Attitudes', findString: updated }) }] };
  expect(RepairRecipeParser.parse(JSON.stringify(p), bound).operations).toEqual(p.operations);
  for (const [current, reason] of [
    [undefined, 'TweeReplacer current source unavailable: target-1'],
    [old, 'TweeReplacer anchor not found: target-1 (found 0, expected 1)'],
    ['', 'TweeReplacer anchor not found: target-1 (found 0, expected 1)'],
    [updated.repeat(3), 'TweeReplacer anchor is ambiguous: target-1 (found 3, expected 1)']
  ] as const)
    expect(() => RepairRecipeParser.parse(JSON.stringify(p), { ...bound, passages: [{ name: 'Widgets Attitudes', original: updated, current }] })).toThrow(reason);

  const rename: RepairContext = {
    ...bound,
    targets: [{ ...bound.targets[0], content: JSON.stringify({ passage: 'Old passage', findString: updated }) }]
  };
  const renameProposal = { ...p, operations: [{ ...p.operations[0], find: rename.targets[0].content }] };
  expect(RepairRecipeParser.parse(JSON.stringify(renameProposal), rename).operations).toEqual(renameProposal.operations);
  for (const replace of [
    JSON.stringify({ passage: 'Unobserved passage', findString: updated }),
    JSON.stringify({ passage: 'Widgets Attitudes', findString: updated, replace: 'arbitrary body' }),
    'runArbitraryScript()'
  ])
    expect(() => RepairRecipeParser.parse(JSON.stringify({ ...renameProposal, operations: [{ ...renameProposal.operations[0], replace }] }), rename)).toThrow();
});

test('Twee anchor diagnostics count overlapping matches and keep custom IDs private', () => {
  expect(() => RepairRecipeParser.validateTweeAnchor('aaaa', 'aaa', 'target-7')).toThrow('TweeReplacer anchor is ambiguous: target-7 (found 2, expected 1)');
  expect(() => RepairRecipeParser.validateTweeAnchor('private source', 'absent', 'private target')).toThrow('TweeReplacer anchor not found: target (found 0, expected 1)');
  expect(() => RepairRecipeParser.validateTweeAnchor('private source', '', 'private target')).toThrow('TweeReplacer anchor not found: target (found 0, expected 1)');
});

function rebaseProposal(current: string, anchor = current, explicit = true) {
  const original = '<<set $old to 0>>';
  const replacement = '<<set $max to 5>>\n' + original + '\n<<set $flag to 1>>';
  const bound: RepairContext = {
    ...context,
    passages: [{ name: 'Target', current }],
    targets: [
      {
        ...context.targets[0],
        kind: 'twee-replacer',
        path: 'twee-replacer|0|0',
        content: JSON.stringify({ passage: 'Target', findString: original }),
        signature: JSON.stringify({ companion: { replace: replacement } })
      }
    ]
  };
  const recipe = {
    ...proposal(),
    operations: [
      {
        ...proposal().operations[0],
        find: bound.targets[0].content,
        replace: JSON.stringify({ passage: 'Target', findString: anchor, ...(explicit && { rebase: true }) })
      }
    ]
  };
  return { bound, recipe };
}

test('rebased Twee anchors cannot split variables, macro tokens, tags, links or comments', () => {
  for (const [current, anchor] of [
    ['<<set $livestock.milk to 0>>', 'livestock'],
    ['<<set $livestock.milk to 0>>', '<<set $livestock.milk'],
    ['<<set $livestock.milk to 0>>', 'livestock.milk to 0>>'],
    ['<<set $livestock.milk to 0>>', '<set $livestock.milk to 0>>'],
    ['$livestock.milk', 'livestock'],
    ['_temporary', 'temporary'],
    ['<span title="current > text">Body</span>', '<span title="current > text"'],
    ['<span title="current > text">Body</span>', 'current > text'],
    ['[[Current destination]]', 'Current destination'],
    ['[[Current destination]]', '[[Current'],
    ['<!-- current comment -->', 'current comment'],
    ['/% current comment %/', 'current comment'],
    ['/* current comment */', 'current comment'],
    ['// current comment\nfollowing', 'current comment'],
    ['<<script>>const value = 1;<</script>>', 'const value = 1;'],
    ['<script>const value = 1;</script>', 'const value = 1;']
  ]) {
    const { bound, recipe } = rebaseProposal(current, anchor);
    expect(() => RepairRecipeParser.parse(JSON.stringify(recipe), bound)).toThrow('anchor splits');
  }
});

test('complete anchors keep quoted delimiters and do not require balanced control blocks', () => {
  for (const current of [
    '<<set $livestock.milk to 0>>',
    '<<if $label is "quoted >> text">>',
    '<<elseif $flag is true>>\n<<set $value to 1>>',
    '<<case "current">>',
    '<span title="current > text">',
    '[[Current destination]]',
    '/* current comment */',
    '<<script>>const value = ">> and <</script>>"; run();<</script>>'
  ]) {
    const { bound, recipe } = rebaseProposal(current);
    expect(RepairRecipeParser.parse(JSON.stringify(recipe), bound).operations).toEqual(recipe.operations);
  }
  const ranges = RepairRecipeParser.macroRanges('<<if $label is "quoted >> text">><<run trace()>>');
  expect(ranges.map(range => [range.name, range.expressionStart, range.expressionEnd])).toEqual([
    ['if', 4, 31],
    ['run', 38, 46]
  ]);
});

test('Twee search-only repairs keep the mod body and explicit rebases migrate it', () => {
  const current = '<<set $livestock.milk to 0>>';
  const { bound, recipe } = rebaseProposal(current, current, false);
  expect(RepairRecipeParser.parse(JSON.stringify(recipe), bound).operations).toEqual(recipe.operations);
  expect(RepairRecipeParser.rebase(bound.targets[0], recipe.operations[0].replace)).toBeUndefined();
  const migrated = rebaseProposal(current);
  expect(RepairRecipeParser.rebase(migrated.bound.targets[0], migrated.recipe.operations[0].replace)?.after).toBe('<<set $max to 5>>\n' + current + '\n<<set $flag to 1>>');
  const partial = rebaseProposal(current, 'livestock', false);
  expect(() => RepairRecipeParser.parse(JSON.stringify(partial.recipe), partial.bound)).toThrow('anchor splits');
  const layout = rebaseProposal('\t\t<<set $old to 0>>\r\n', '\t\t<<set $old to 0>>\r\n', false);
  layout.bound.targets[0].content = JSON.stringify({ passage: 'Target', findString: '\t<<set $old to 0>>\n' });
  layout.recipe.operations[0].find = layout.bound.targets[0].content;
  expect(RepairRecipeParser.rebase(layout.bound.targets[0], layout.recipe.operations[0].replace)).toBeUndefined();
  expect(RepairRecipeParser.parse(JSON.stringify(layout.recipe), layout.bound).operations).toEqual(layout.recipe.operations);
});

test('search-only repairs may intentionally replace changed conditions without deriving a body', () => {
  const original = '<<if $value lt 50>>old text<</if>>';
  const current = '<<if $value lt 50>>old text<input type="radio" disabled /><</if>>';
  const { bound, recipe } = rebaseProposal(current, current, false);
  bound.targets[0].content = JSON.stringify({ passage: 'Target', findString: original });
  bound.targets[0].signature = JSON.stringify({ companion: { replace: 'new text' } });
  recipe.operations[0].find = bound.targets[0].content;
  expect(RepairRecipeParser.parse(JSON.stringify(recipe), bound).operations).toEqual(recipe.operations);
  expect(RepairRecipeParser.rebase(bound.targets[0], recipe.operations[0].replace)).toBeUndefined();
  const explicit = { ...recipe, operations: [{ ...recipe.operations[0], replace: JSON.stringify({ passage: 'Target', findString: current, rebase: true }) }] };
  expect(() => RepairRecipeParser.parse(JSON.stringify(explicit), bound)).toThrow('Mod and current source edits overlap');
});

test('review keeps executable repairs when one bound operation cannot be migrated', () => {
  const { bound, recipe } = rebaseProposal('<<set $amount to 3>>');
  bound.targets[0].id = 'target-2';
  bound.targets[0].content = JSON.stringify({ passage: 'Target', findString: '<<set $amount to 1>>' });
  bound.targets[0].signature = JSON.stringify({ companion: { replace: '<<set $amount to 2>>' } });
  const mixedContext = { ...bound, targets: [...context.targets, ...bound.targets] };
  const mixedRecipe = {
    ...proposal(),
    operations: [...proposal().operations, { ...recipe.operations[0], targetId: 'target-2', find: bound.targets[0].content }]
  };
  const before = JSON.stringify(mixedContext);
  const reviewed = RepairRecipeParser.review(JSON.stringify(mixedRecipe), mixedContext);
  expect(reviewed.recipe.operations).toEqual(proposal().operations);
  expect(reviewed.rejected).toEqual([{ targetId: 'target-2', reason: 'Mod and current source edits overlap' }]);
  expect(RepairRecipeParser.parse(JSON.stringify(reviewed.recipe), mixedContext)).toEqual(reviewed.recipe);
  expect(() => RepairRecipeParser.parse(JSON.stringify(mixedRecipe), mixedContext)).toThrow('Mod and current source edits overlap');
  expect(JSON.stringify(mixedContext)).toBe(before);
});

test('review validates every operation identity and shape before filtering failures', () => {
  const p = proposal();
  for (const operation of [{ ...p.operations[0], targetId: 'unknown', find: 'missing' }, { ...p.operations[0], regex: true }, { ...p.operations[0], expectedMatches: 1.5 }, p.operations[0]])
    expect(() => RepairRecipeParser.review(JSON.stringify({ ...p, operations: [p.operations[0], operation] }), context)).toThrow();
  expect(() => RepairRecipeParser.review(JSON.stringify({ ...p, requestId: 'unknown' }), context)).toThrow('Invalid recipe identity');
  expect(() => RepairRecipeParser.review(JSON.stringify(p), { ...context, targets: [...context.targets, ...context.targets] })).toThrow('Duplicate context targets');
  expect(RepairRecipeParser.review(JSON.stringify({ ...p, outcome: 'insufficient-context', operations: [] }), context)).toEqual({
    recipe: { ...p, outcome: 'insufficient-context', operations: [] },
    rejected: []
  });
});

test('review preserves unsafe-operation checks and reports no executable repairs', () => {
  const unsafeTarget = { ...context.targets[0], id: 'target-2', content: '.other { color: reed; }' };
  const unsafeOperation = { ...proposal().operations[0], targetId: 'target-2', replace: 'url(https://private.example/secret)' };
  const mixed = { ...proposal(), operations: [...proposal().operations, unsafeOperation] };
  const reviewed = RepairRecipeParser.review(JSON.stringify(mixed), { ...context, targets: [...context.targets, unsafeTarget] });
  expect(reviewed.recipe.operations).toEqual(proposal().operations);
  expect(reviewed.rejected).toEqual([{ targetId: 'target-2', reason: 'CSS repair must be a local declaration value' }]);
  expect(() => RepairRecipeParser.review(JSON.stringify({ ...proposal(), operations: [unsafeOperation] }), { ...context, targets: [unsafeTarget] })).toThrow(
    'target-2: CSS repair must be a local declaration value'
  );
});

test('review reports malformed binding JSON without exposing source or custom target names', () => {
  const { bound, recipe } = rebaseProposal('<<set $new to 0>>');
  bound.targets[0].id = 'private-source-name';
  const invalid = { ...recipe.operations[0], targetId: bound.targets[0].id, replace: '{"privateApiKey": "not-json' };
  const mixed = { ...proposal(), operations: [...proposal().operations, invalid] };
  const reviewed = RepairRecipeParser.review(JSON.stringify(mixed), { ...bound, targets: [...context.targets, ...bound.targets] });
  expect(reviewed.recipe.operations).toEqual(proposal().operations);
  expect(reviewed.rejected).toEqual([{ targetId: 'target', reason: 'Invalid repair binding JSON' }]);
  expect(() => RepairRecipeParser.review(JSON.stringify({ ...recipe, operations: [invalid] }), bound)).toThrow('target: Invalid repair binding JSON');
});

test('rejects identity, shape, targets and unsafe matching assumptions', () => {
  const p = proposal();
  for (const bad of [
    { ...p, requestId: 'other' },
    { ...p, schemaVersion: 1 },
    { ...p, execute: 'code' },
    { ...p, operations: [] },
    { ...p, outcome: 'insufficient-context' },
    { ...p, operations: [p.operations[0], p.operations[0]] },
    ...[{ targetId: 'unknown' }, { find: '' }, { find: 'missing' }, { expectedMatches: 2 }, { expectedMatches: 1.5 }, { replace: 'reed' }, { regex: true }].map(change => ({
      ...p,
      operations: [{ ...p.operations[0], ...change }]
    }))
  ])
    expect(() => RepairRecipeParser.parse(JSON.stringify(bad), context)).toThrow();
  expect(() => RepairRecipeParser.parse('```json\n{}\n```', context)).toThrow();
  expect(RepairRecipeParser.parse(JSON.stringify(p), { ...context, mods: [] }).operations).toEqual(p.operations);
});

test('fingerprints exact content and separates instructions from evidence', async () => {
  expect(await RepairRecipeParser.fingerprint('abc')).toBe('sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  expect(await RepairRecipeParser.fingerprint('abc\n')).not.toBe(await RepairRecipeParser.fingerprint('abc'));
  const messages = RepairPrompt.messages(context);
  expect(messages[0].role).toBe('system');
  expect(messages[0].content).toContain('in English');
  const chinese = RepairPrompt.messages(context, 'CN');
  expect(chinese[0].content).toContain('in Simplified Chinese');
  expect(chinese[1].content).toBe(messages[1].content);
  expect(JSON.parse(messages[1].content)).toEqual(context);
  expect(() => RepairPrompt.messages({ ...context, requestId: 'x'.repeat(RepairPrompt.MAX_LENGTH + 1) })).toThrow('Repair context exceeds size limit');
  const bound = { ...context, targets: [{ ...context.targets[0], signature: 'private host binding' }] };
  expect(RepairPrompt.messages(bound)[1].content).not.toContain('private host binding');
  expect(bound.targets[0].signature).toBe('private host binding');
});

test('related native rules remain read-only definitions without granting repair targets', () => {
  const related: RepairContext = {
    ...context,
    relatedRules: [{ modName: 'mod-a', patcher: 'twee-replacer', kind: 'twee', destination: 'Target', find: 'old anchor', replace: 'new anchor with A feature' }]
  };
  const before = JSON.stringify(related);
  const messages = RepairPrompt.messages(related);
  expect(JSON.parse(messages[1].content).relatedRules).toEqual(related.relatedRules);
  expect(messages[0].content).toContain('not execution history');
  expect(messages[0].content).toContain('not the input observed immediately before any failed rule');
  expect(messages[0].content).toContain("removes A's additions");
  expect(RepairRecipeParser.parse(JSON.stringify(proposal()), related).operations).toEqual(proposal().operations);
  expect(() => RepairRecipeParser.parse(JSON.stringify({ ...proposal(), operations: [{ ...proposal().operations[0], targetId: 'mod-a' }] }), related)).toThrow('Unknown or unbound target');
  expect(() => RepairRecipeParser.parse(JSON.stringify({ ...proposal(), relatedRules: related.relatedRules }), related)).toThrow('Invalid recipe fields');
  expect(JSON.stringify(related)).toBe(before);
});

test('passage excerpts constrain supplied anchors while full host source checks uniqueness', () => {
  const old = '<<set $old = 0>>';
  const current = '<<set $current.value = 0>>';
  const content = JSON.stringify({ passage: 'Large', findString: old });
  const bound: RepairContext = {
    ...context,
    targets: [{ ...context.targets[0], kind: 'twee-replacer', path: 'twee-replacer|0|0', content, signature: JSON.stringify({ companion: { replace: old + '\n<<set $mod = true>>' } }) }],
    passages: [{ name: 'Large', current: 'host-only prefix\n' + current + '\nhost-only ending', excerpts: [{ offset: 17, content: current }] }]
  };
  const recipe = { ...proposal(), operations: [{ ...proposal().operations[0], find: content, replace: JSON.stringify({ passage: 'Large', findString: current }) }] };
  expect(RepairRecipeParser.parse(JSON.stringify(recipe), bound).operations).toEqual(recipe.operations);
  const payload = RepairPrompt.messages(bound)[1].content;
  expect(payload).toContain(current);
  expect(payload).not.toContain('host-only');
  expect(JSON.parse(payload).passages[0]).not.toHaveProperty('current');
  expect(() => RepairRecipeParser.parse(JSON.stringify(recipe), { ...bound, passages: [{ ...bound.passages![0], current: current + '\n' + current }] })).toThrow(
    'TweeReplacer anchor is ambiguous: target-1 (found 2, expected 1)'
  );
  expect(() => RepairRecipeParser.parse(JSON.stringify(recipe), { ...bound, passages: [{ ...bound.passages![0], excerpts: [{ offset: 0, content: 'different source' }] }] })).toThrow(
    'outside supplied'
  );
});

test('permits only the local property guard template in executable source', () => {
  const withSource = (kind: 'js' | 'twee', content: string) => ({ ...context, targets: [{ ...context.targets[0], kind, content }] });
  const guard = {
    ...proposal(),
    operations: [{ targetId: 'target-1', find: 'V.player.virginity', replace: 'V?.player?.virginity', expectedMatches: 1, reason: 'Absent state guard.' }]
  };
  expect(RepairRecipeParser.propertyGuard('V.player.virginity')).toBe('V?.player?.virginity');
  expect(RepairRecipeParser.parse(JSON.stringify(guard), withSource('js', 'const value = V.player.virginity;')).operations).toEqual(guard.operations);
  expect(RepairRecipeParser.parse(JSON.stringify(guard), withSource('twee', '<<if V.player.virginity>>Text<</if>>')).operations).toEqual(guard.operations);
  for (const content of [
    'const value = "V.player.virginity";',
    'const value = `V.player.virginity`;',
    'const value = /V.player.virginity/g;',
    '// V.player.virginity',
    '/* V.player.virginity */',
    'V.player.virginity = true;',
    'V.player.virginity += 1;',
    'V.player.virginity **= 2;',
    'V.player.virginity &&= value;',
    'V.player.virginity ||= value;',
    'V.player.virginity ??= value;',
    '(V.player.virginity) = value;',
    '[V.player.virginity] = value;',
    '[a, V.player.virginity, b] = value;',
    '[a, ((V.player.virginity)), b] = value;',
    '({ a: V.player.virginity, b: other } = value);',
    '({ a: ((V.player.virginity)) } = value);',
    'V.player.virginity /* comment */ = value;',
    'for (V.player.virginity of array) {}',
    'new (V.player.virginity)();',
    'V.player.virginity `template`;',
    'V.player.virginity /* comment */ `template`;',
    'V.player.virginity++;',
    'new V.player.virginity();',
    'const value = unrelatedV.player.virginity;',
    'const value = V.player.virginityMore;',
    'const value = V.player.virginity.extra;'
  ])
    expect(() => RepairRecipeParser.parse(JSON.stringify(guard), withSource('js', content))).toThrow();
  for (const replace of ['V.player.virginity || runCommand()', 'new Function("alert(1)")()', 'fetch("https://example.invalid")', 'V?.player?.virginity; alert(1)'])
    expect(() => RepairRecipeParser.parse(JSON.stringify({ ...guard, operations: [{ ...guard.operations[0], replace }] }), withSource('js', 'const value = V.player.virginity;'))).toThrow();
  expect(() => RepairRecipeParser.parse(JSON.stringify(guard), withSource('twee', 'V.player.virginity'))).toThrow();
  expect(() => RepairRecipeParser.parse(JSON.stringify(guard), withSource('twee', '<<set V.player.virginity to true>>'))).toThrow();
  expect(() => RepairRecipeParser.parse(JSON.stringify(guard), withSource('twee', '<<for V.player.virginity range _array>>'))).toThrow();
  expect(() => RepairRecipeParser.parse(JSON.stringify(guard), withSource('twee', '<<capture V.player.virginity>>'))).toThrow();
  expect(RepairRecipeParser.propertyGuard('V.constructor.prototype')).toBeUndefined();
});

test('does not allow CSS or Twee replacements to introduce executable markup', () => {
  for (const replace of ['url(https://example.invalid)', 'red; background: url(x)', '</style><script>alert(1)</script>', 'expression(alert(1))', '@import x'])
    expect(() => RepairRecipeParser.parse(JSON.stringify({ ...proposal(), operations: [{ ...proposal().operations[0], replace }] }), context)).toThrow();
  const content = 'A colour is reed.';
  const source = { ...context, targets: [{ ...context.targets[0], kind: 'twee' as const, content }] };
  expect(RepairRecipeParser.parse(JSON.stringify(proposal()), source).operations[0].replace).toBe('red');
  for (const replace of ['<<run alert(1)>>', '<script>alert(1)</script>', '[[New destination]]', '$danger', '_danger', '&lt;script&gt;'])
    expect(() => RepairRecipeParser.parse(JSON.stringify({ ...proposal(), operations: [{ ...proposal().operations[0], replace }] }), source)).toThrow();
  for (const content of ['<<print "reed">>', '<span title="reed">Text</span>', '[[reed]]', '<script>reed</script>', '<<script>>reed<</script>>'])
    expect(() => RepairRecipeParser.parse(JSON.stringify(proposal()), { ...source, targets: [{ ...source.targets[0], content }] })).toThrow();
});
