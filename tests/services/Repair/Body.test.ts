import { expect, test } from 'bun:test';
import RepairBody from '../../../src/services/Repair/Body';
import { RepairEngine } from '../../../src/services/Repair/Engine';
import { RepairRecipeParser, type RepairContext, type RepairRecipe, type RepairTarget } from '../../../src/services/Repair/Recipe';
import { RepairRebase } from '../../../src/services/Repair/Rebase';

const hospital2Condition = '(getPregnancyObject().potentialFathers.length is 1 or getPregnancyObject().potentialFathers.length is undefined) and getPregnancyObject().fetus[0].father is "Remy"';
const hospital2Updated = '_pregnancy?.possibleDonors.length === 1 && _pregnancy?.donor === "Remy"';
const hospital2Source = 'getPregnancyObject().fetus[0].father';
const hospital2Anchor = '<<set $alex_pregnancy to _pregnancy?.possibleDonors.length is 1 and _pregnancy?.donor is "Alex">>';
const hospital2Body = [
  `<<if ${hospital2Condition}>>`,
  '<<set $remy_pregnancy to {}>>',
  '<<set $remy_pregnancy.knows to knowsAboutPregnancy("pc","Remy")>>',
  '<<set $remy_pregnancy.talked to talkedAboutPregnancy("pc","Remy")>>',
  `<<set $remy_pregnancy.source to ${hospital2Source}>>`,
  '<</if>>',
  '/*Alex variables*/'
].join('\n');
const hospital2Current = [
  '<<effects>>',
  '',
  'The midwife places a mask over your face. You feel your consciousness fade.',
  '<br><br>',
  '',
  '<<set _pregnancy to getLabouringPregnancy("pc")>>',
  hospital2Anchor,
  '',
  '<<set _timeCalc to birthLaborTime()>>'
].join('\n');
const hospital5Condition = '$remy_pregnancy isnot undefined and $litter_potention_fathers is 1 and $remy_pregnancy.source is "Remy"';
const hospital5Updated = '$remy_pregnancy !== undefined && $remy_pregnancy.source === "Remy"';
const hospital5Alex = '$alex_pregnancy isnot undefined and $litter_potention_fathers is 1 and $alex_pregnancy.source is "Alex"';
const hospital5Body = [
  `<<if ${hospital5Condition}>>`,
  '',
  '\t<<if pregnancyCountBetweenParents("pc","Remy") gte 2 or pregnancyCountBetweenParents("Remy","pc") gte 2>>',
  '\t\t是一个穿着骑马装的<<if $NPCName[$NPCNameList.indexOf("Remy")].pronoun is "f">>女人<<else>>男人<</if>>，',
  '\t\t<<if $remy_mask is 1>><<nnpc_he "Remy">>还戴着副面具，<</if>>呃……具体的我不知道该怎么形容。"',
  '\t\t<br><br>',
  '\t\t助产士低声对你说，"不过，那个人就快要过来了。"',
  '\t\t<br><br>',
  '\t\t<<link [[继续|Pregnancy Birth Hospital Remy]]>><</link>>',
  '\t<<else>>',
  '\t\t一共有两个人，他们看起来都很可怕，<<if $remy_mask is 1>>特别是其中一个人，还戴着副面具，<</if>>我不知道他们是谁。但是其中一个人声称是你的',
  '\t\t<<if $NPCName[$NPCNameList.indexOf("Bailey")].pronoun is "f">>妈妈<<else>>爸爸<</if>>，还拿出了一份证明材料。"',
  '\t\t助产士低声对你说，"他们快要过来了。"',
  '\t\t<br><br>',
  '\t\t<<link [[继续|Pregnancy Birth Hospital Remy Bailey]]>><</link>>',
  '\t<</if>>',
  '\t',
  `<<elseif ${hospital5Alex}>>`
].join('\r\n');
const hospital5Current = [
  '"Someone\'s waiting for you.',
  '',
  '<<if $alex_pregnancy>>',
  '',
  '\t<<if C.npc.Alex.pregnancy.nursery is true>>',
  '\t\tYour <<nnpc_girlfriend "Alex">> I think."',
  '\t\t<br><br>',
  '\t\t<<link [[Next|Pregnancy Birth Hospital Alex]]>><</link>>',
  '\t<</if>>',
  '<</if>>'
].join('\n');

interface Expression {
  find: string;
  replace: string;
  expectedMatches: 1;
}

const expression = (find: string, replace: string): Expression => ({ find, replace, expectedMatches: 1 });
const hospital2Expressions = [expression(hospital2Condition, hospital2Updated), expression(hospital2Source, '_pregnancy?.donor')];

async function fixture(hospital: 2 | 5, expressions: Expression[]) {
  const passage = `Pregnancy Birth Hospital ${hospital}`;
  const oldFind = hospital === 2 ? '/*Alex variables*/' : `<<if ${hospital5Alex}>>`;
  const findString = hospital === 2 ? hospital2Anchor : '<<if $alex_pregnancy>>';
  const body = hospital === 2 ? hospital2Body : hospital5Body;
  const content = JSON.stringify({ passage, findString: oldFind });
  const target: RepairTarget = {
    id: 'hospital',
    modName: 'Remy',
    kind: 'twee-replacer',
    path: `twee-replacer|0|${hospital === 2 ? 77 : 82}`,
    content,
    fingerprint: await RepairRecipeParser.fingerprint(content),
    signature: JSON.stringify(
      hospital === 2 ? { companion: { replace: body } } : { companion: { replaceFile: 'game/base-system/addon-replace/events-Pregnancy Birth Hospital 5-remy.txt' }, replacement: body }
    )
  };
  const context: RepairContext = {
    requestId: 'hospital',
    mods: ['Remy'],
    diagnostics: [],
    modLoaderLogs: [],
    patches: [],
    conflicts: [],
    passages: [{ name: passage, current: hospital === 2 ? hospital2Current : hospital5Current }],
    targets: [target]
  };
  const recipe: RepairRecipe = {
    requestId: context.requestId,
    outcome: 'repair',
    summary: 'Migrate the existing Hospital rule to current observed expressions',
    evidence: [],
    operations: [
      {
        targetId: target.id,
        find: content,
        replace: JSON.stringify({ passage, findString, rebase: true, expressions }),
        expectedMatches: 1,
        reason: 'Preserve the installed body and current donor paths'
      }
    ]
  };
  return { target, context, recipe, body, findString };
}

test('Hospital 2 rebases the anchor before migrating its complete condition and source RHS', async () => {
  const { target, context, recipe, body, findString } = await fixture(2, hospital2Expressions);
  const overlays = await RepairEngine.prepare(recipe, context, () => target.content);
  const expected = body.replace('/*Alex variables*/', findString).replace(hospital2Condition, hospital2Updated).replace(`to ${hospital2Source}>>`, 'to _pregnancy?.donor>>');
  expect(overlays[0].replacement).toMatchObject({ before: body, after: expected });
  expect(JSON.parse(overlays[0].after)).toEqual({ passage: 'Pregnancy Birth Hospital 2', findString });
  expect(context.targets[0].content).toBe(target.content);
  expect(context.passages![0].current).toBe(hospital2Current);
  expect(expected).toContain('<<set $remy_pregnancy.knows to knowsAboutPregnancy("pc","Remy")>>');
  expect(expected).toContain('<<set $remy_pregnancy.talked to talkedAboutPregnancy("pc","Remy")>>');
});

test('Hospital 5 inherits the current Alex elseif and preserves every narrative byte and CRLF', async () => {
  const { target, context, recipe, body, findString } = await fixture(5, [expression(hospital5Condition, hospital5Updated)]);
  const overlays = await RepairEngine.prepare(recipe, context, () => target.content);
  const expected = body.replace(hospital5Condition, hospital5Updated).replace(`<<elseif ${hospital5Alex}>>`, '<<elseif $alex_pregnancy>>');
  expect(overlays[0].replacement).toMatchObject({ before: body, after: expected });
  expect(JSON.parse(overlays[0].after)).toEqual({ passage: 'Pregnancy Birth Hospital 5', findString });
  expect(expected.slice(expected.indexOf('>>') + 2, expected.lastIndexOf('<<elseif'))).toBe(body.slice(body.indexOf('>>') + 2, body.lastIndexOf('<<elseif')));
  expect(context.passages![0].current).toBe(hospital5Current);
});

const simpleBody = '<<if $legacy.value is 1>>Original narrative.\r\n<br><br><</if>>';
const simpleReference = '<<if $current.value is 1>>Current native branch.<</if>>\nANCHOR';
const simpleFind = '$legacy.value is 1';

function apply(replace: string, before = simpleBody, rebased = before, reference = simpleReference, findString = 'ANCHOR') {
  return RepairBody.apply(before, rebased, [expression(simpleFind, replace)], reference, findString, RepairRecipeParser.macroRanges);
}

test('updates only a unique complete condition and leaves surrounding text and line endings intact', () => {
  expect(apply('$current.value === 1').after).toBe(simpleBody.replace(simpleFind, '$current.value === 1'));
});

test('rejects an ambiguous original condition or an ambiguous rebased condition', () => {
  const duplicate = simpleBody + '\n' + simpleBody;
  expect(() => apply('$current.value === 1', duplicate)).toThrow();
  expect(() => apply('$current.value === 1', simpleBody, duplicate)).toThrow();
});

test('requires a complete condition or complete set RHS instead of a partial path or assignment', () => {
  for (const find of ['$legacy.value', '$remy_pregnancy.source to ' + hospital2Source]) {
    const before = find.startsWith('$legacy') ? simpleBody : hospital2Body;
    expect(() => RepairBody.apply(before, before, [expression(find, '$current.value')], simpleReference, 'ANCHOR', RepairRecipeParser.macroRanges)).toThrow();
  }
});

test('does not select expressions from prose, comments, HTML attributes or unsupported macros', () => {
  for (const before of [simpleFind, `/* ${simpleFind} */`, `<span title="${simpleFind}">Text</span>`, `<<print ${simpleFind}>>`]) {
    expect(() => apply('$current.value === 1', before)).toThrow();
  }
});

test('does not allow an expression selector that exists only after rebase', () => {
  expect(() => apply('$current.value === 1', '<<if $different.value is 1>>Old<</if>>', simpleBody)).toThrow();
});

test('requires literal expectedMatches 1 for each expression edit', () => {
  for (const expectedMatches of [0, 2, '1']) {
    const edits = [{ find: simpleFind, replace: '$current.value === 1', expectedMatches }];
    expect(() => RepairBody.apply(simpleBody, simpleBody, edits, simpleReference, 'ANCHOR', RepairRecipeParser.macroRanges)).toThrow();
  }
});

test('rejects duplicate edits even when each selector individually matches once', () => {
  const edit = expression(simpleFind, '$current.value === 1');
  expect(() => RepairBody.apply(simpleBody, simpleBody, [edit, edit], simpleReference, 'ANCHOR', RepairRecipeParser.macroRanges)).toThrow();
});

test('rejects malformed expressions and macro boundary injection', () => {
  for (const replace of [
    '$current.value ===',
    '$current.value === 1; true',
    '$current.value === 1 >> <<run fetch("bad")>>',
    '$current.value === 1 //',
    '$legacy.value); $current.value; ($legacy.value',
    '$legacy.value) + ($current.value'
  ]) {
    expect(() => apply(replace)).toThrow();
  }
});

test('rejects dangerous access, dynamic paths, new calls and executable syntax', () => {
  for (const replace of [
    'fetch("https://example.invalid")',
    'getPregnancyObject().fetus[0].father === 1',
    'Object.keys($current.value).length === 1',
    '(() => $current.value)() === 1',
    '$current.value || globalThis.document',
    '$current.value || window',
    '$current.constructor === 1',
    '$current["__proto__"] === 1',
    '$current[$legacy.value] === 1',
    'new Date()'
  ]) {
    expect(() => apply(replace)).toThrow();
  }
});

test('rejects writes inside replacement expressions', () => {
  for (const replace of ['$current.value = 1', '$current.value += 1', '$current.value++', 'delete $current.value', '($current.value = 1, true)']) {
    expect(() => apply(replace)).toThrow();
  }
});

test('treats rejected executable expressions as text without executing their side effects', () => {
  expect(Object.hasOwn(globalThis, 'repairBodyMustNotExecute')).toBe(false);
  expect(() => apply('(globalThis.repairBodyMustNotExecute = true, $current.value === 1)')).toThrow();
  expect(Object.hasOwn(globalThis, 'repairBodyMustNotExecute')).toBe(false);
});

test('rejects new thresholds, string values and unknown property paths', () => {
  for (const replace of ['$current.value === 2', '$current.value === "new-person"', '$current.unknown === 1', '$unknown.value === 1']) {
    expect(() => apply(replace)).toThrow();
  }
});

test('nonfinite numeric syntax cannot borrow an observed null literal', () => {
  const condition = '$legacy.value is null';
  const before = `<<if ${condition}>>keep<</if>>`;
  expect(() => RepairBody.apply(before, before, [expression(condition, '$legacy.value === 1e309')], 'ANCHOR', 'ANCHOR', RepairRecipeParser.macroRanges)).toThrow('literal is not observed');
});

test('folded migration dependencies retain only reads in the final derived body', () => {
  expect(RepairBody.filterDependencies('<<if $latest.value === 1>>keep<</if>>', ['$previous.value', '$latest.value'], RepairRecipeParser.macroRanges)).toEqual(['$latest.value']);
});

test('a set RHS edit preserves the assignment target and refuses another write', () => {
  const before = `<<set $remy_pregnancy.source to ${hospital2Source}>>`;
  const edit = expression(hospital2Source, '_pregnancy?.donor');
  const result = RepairBody.apply(before, before, [edit], hospital2Current, hospital2Anchor, RepairRecipeParser.macroRanges);
  RepairBody.validateScope(hospital2Current, hospital2Anchor, result.introduced, RepairRecipeParser.macroRanges);
  expect(result.after).toBe('<<set $remy_pregnancy.source to _pregnancy?.donor>>');
  expect(() =>
    RepairBody.apply(before, before, [expression(hospital2Source, '$remy_pregnancy.source = _pregnancy?.donor')], hospital2Current, hospital2Anchor, RepairRecipeParser.macroRanges)
  ).toThrow();
});

function validatePregnancyScope(reference: string, findString = 'ANCHOR') {
  const observed = reference + '\n<<if _pregnancy?.donor is "Remy">>Observed donor path.<</if>>';
  RepairBody.validateScope(observed, findString, ['_pregnancy.donor'], RepairRecipeParser.macroRanges);
}

test('authorizes a new temporary path only after an unconditional definition before this anchor', () => {
  expect(() => validatePregnancyScope('<<set _pregnancy to getLabouringPregnancy("pc")>>\nANCHOR')).not.toThrow();
});

test('rejects undefined temporary variables and definitions after the anchor', () => {
  expect(() => validatePregnancyScope('<<if _pregnancy?.donor is "Remy">>Observed read<</if>>\nANCHOR')).toThrow('temporary is not initialized');
  expect(() => validatePregnancyScope('ANCHOR\n<<set _pregnancy to getLabouringPregnancy("pc")>>')).toThrow('temporary is not initialized');
});

test('a temporary property assignment does not initialize its root before the anchor', () => {
  expect(() => validatePregnancyScope('<<set _pregnancy.donor to "Remy">>\nANCHOR')).toThrow('temporary is not initialized');
});

test('a temporary definition removed before the anchor cannot authorize the migrated read', () => {
  expect(() => validatePregnancyScope('<<set _pregnancy to getLabouringPregnancy("pc")>>\n<<unset _pregnancy>>\nANCHOR')).toThrow();
});

test('temporary roots containing another underscore or dollar still require earlier initialization', () => {
  for (const root of ['__foo', '_foo$']) {
    const path = `${root}.donor`;
    const reference = `<<if ${root}?.donor is "Remy">>Observed donor.<</if>>\nANCHOR`;
    expect(() => RepairBody.validateScope(reference, 'ANCHOR', [path], RepairRecipeParser.macroRanges)).toThrow('temporary is not initialized');
    expect(() => RepairBody.validateScope(`<<set ${root} to getLabouringPregnancy("pc")>>\n${reference}`, 'ANCHOR', [path], RepairRecipeParser.macroRanges)).not.toThrow();
  }
});

test('run or script mentioning a migrated temporary or shared temporary state invalidates its earlier definition', () => {
  const definition = '<<set _pregnancy to getLabouringPregnancy("pc")>>\n';
  for (const executable of [
    '<<run _pregnancy = undefined>>',
    '<<run _pregnancy.donor>>',
    '<<run State.temporary = {}>>',
    '<<run State["temporary"].pregnancy = undefined>>',
    '<<run T.pregnancy = undefined>>',
    '<<script>>_pregnancy = undefined;<</script>>',
    '<<script>>console.log(_pregnancy);<</script>>',
    '<<script>>SugarCube.State.temporary = {};<</script>>'
  ]) {
    expect(() => validatePregnancyScope(definition + executable + '\nANCHOR')).toThrow('temporary is not initialized');
    expect(() => validatePregnancyScope(definition + executable + '\n' + definition + 'ANCHOR')).not.toThrow();
  }
});

test('a branch or deferred reassignment invalidates the earlier temporary until another top-level definition', () => {
  const definition = '<<set _pregnancy to getLabouringPregnancy("pc")>>\n';
  for (const block of [
    '<<if $ready>><<set _pregnancy to undefined>><</if>>',
    '<<if $ready>><<set _pregnancy.donor to undefined>><</if>>',
    '<<if $ready>><<set _pregnancy += 1>><</if>>',
    '<<link "Continue">><<set _pregnancy to undefined>><</link>>'
  ]) {
    expect(() => validatePregnancyScope(definition + block + '\nANCHOR')).toThrow('temporary is not initialized');
    expect(() => validatePregnancyScope(definition + block + '\n' + definition + 'ANCHOR')).not.toThrow();
  }
});

test('rejects conditional, loop and deferred temporary definitions before the anchor', () => {
  for (const block of [
    '<<if $ready>><<set _pregnancy to getLabouringPregnancy("pc")>><</if>>',
    '<<if $ready>>Ready<<elseif $other>><<set _pregnancy to getLabouringPregnancy("pc")>><</if>>',
    '<<if $ready>>Ready<<else>><<set _pregnancy to getLabouringPregnancy("pc")>><</if>>',
    '<<for _index = 0; _index < 1; _index++>><<set _pregnancy to getLabouringPregnancy("pc")>><</for>>',
    '<<switch $kind>><<case "human">><<set _pregnancy to getLabouringPregnancy("pc")>><</switch>>',
    '<<link "Continue">><<set _pregnancy to getLabouringPregnancy("pc")>><</link>>',
    '<<button "Continue">><<set _pregnancy to getLabouringPregnancy("pc")>><</button>>'
  ]) {
    expect(() => validatePregnancyScope(block + '\nANCHOR')).toThrow('temporary is not initialized');
  }
});

test('rejects a missing or duplicate insertion anchor for temporary scope proof', () => {
  const definition = '<<set _pregnancy to getLabouringPregnancy("pc")>>\n';
  expect(() => validatePregnancyScope(definition + 'Other anchor')).toThrow();
  expect(() => validatePregnancyScope(definition + 'ANCHOR\nANCHOR')).toThrow();
});

test('Hospital 2 cannot borrow a temporary definition or paths from another passage', async () => {
  const { target, context, recipe } = await fixture(2, hospital2Expressions);
  context.passages = [
    { name: 'Pregnancy Birth Hospital 2', current: hospital2Anchor },
    { name: 'Another passage', current: hospital2Current }
  ];
  await expect(RepairEngine.prepare(recipe, context, () => target.content)).rejects.toThrow('temporary is not initialized');
});

test('Hospital 2 rejects a definition inserted after its selected native anchor', async () => {
  const { target, context, recipe } = await fixture(2, hospital2Expressions);
  context.passages![0].current = hospital2Anchor + '\n<<set _pregnancy to getLabouringPregnancy("pc")>>';
  await expect(RepairEngine.prepare(recipe, context, () => target.content)).rejects.toThrow('temporary is not initialized');
});

test('migrates expressions with an unchanged native binding and without requesting rebase', async () => {
  const { target, context, recipe, body } = await fixture(2, hospital2Expressions);
  const binding = JSON.parse(target.content) as { passage: string; findString: string };
  context.passages![0].current = hospital2Current + '\n' + binding.findString;
  recipe.operations[0].replace = JSON.stringify({ ...binding, expressions: hospital2Expressions });
  const overlays = await RepairEngine.prepare(recipe, context, () => target.content);
  const after = body.replace(hospital2Condition, hospital2Updated).replace(`to ${hospital2Source}>>`, 'to _pregnancy?.donor>>');
  expect(overlays[0].before).toBe(target.content);
  expect(overlays[0].after).toBe(target.content);
  expect(overlays[0].replacement).toMatchObject({ before: body, after });
  expect(after).toEndWith('/*Alex variables*/');
});

test('keeps legacy bindings without expression edits compatible with parsing and preparation', async () => {
  for (const rebase of [false, true]) {
    const { target, context, recipe, body, findString } = await fixture(2, hospital2Expressions);
    recipe.operations[0].replace = JSON.stringify({ passage: 'Pregnancy Birth Hospital 2', findString, ...(rebase && { rebase: true }) });
    expect(RepairRecipeParser.parse(JSON.stringify(recipe), context).operations).toEqual(recipe.operations);
    const overlays = await RepairEngine.prepare(recipe, context, () => target.content);
    if (rebase) expect(overlays[0].replacement).toMatchObject({ before: body, after: body.replace('/*Alex variables*/', findString) });
    else expect(overlays[0].replacement).toBeUndefined();
  }
});

test('one invalid expression rejects both Hospital operations during legacy recipe review', async () => {
  const first = await fixture(2, hospital2Expressions);
  const second = await fixture(5, [expression(hospital5Condition, '$remy_pregnancy.source ===')]);
  first.target.id = 'target-1';
  first.recipe.operations[0].targetId = first.target.id;
  second.target.id = 'target-2';
  second.recipe.operations[0].targetId = second.target.id;
  const context: RepairContext = { ...first.context, targets: [first.target, second.target], passages: [...first.context.passages!, ...second.context.passages!] };
  const recipe: RepairRecipe = { ...first.recipe, operations: [...first.recipe.operations, ...second.recipe.operations] };
  expect(recipe.operations.every(operation => !Object.hasOwn(operation, 'type'))).toBe(true);
  expect(() => RepairRecipeParser.review(JSON.stringify(recipe), context)).toThrow();
  await expect(RepairEngine.prepare(recipe, context, target => context.targets.find(candidate => candidate.id === target.id)?.content)).rejects.toThrow();
  expect(context.targets.map(target => target.content)).toEqual([first.target.content, second.target.content]);
});

test('an expression cannot borrow a hidden host path outside the supplied source excerpt', async () => {
  const { target, context, recipe, findString } = await fixture(2, [expression(hospital2Source, '$current.secret')]);
  const hidden = '<<if $current.secret is "Remy">>Hidden host evidence.<</if>>\n';
  context.passages![0].current = hidden + hospital2Current;
  context.passages![0].excerpts = [{ offset: hidden.length + hospital2Current.indexOf(findString), content: findString }];
  await expect(RepairEngine.prepare(recipe, context, () => target.content)).rejects.toThrow();
});

test('visible paths may use host scope proof when their earlier initialization is outside the excerpt', async () => {
  const { target, context, recipe, body, findString } = await fixture(2, hospital2Expressions);
  context.passages![0].excerpts = [{ offset: hospital2Current.indexOf(findString), content: findString }];
  const overlays = await RepairEngine.prepare(recipe, context, () => target.content);
  const after = body.replace('/*Alex variables*/', findString).replace(hospital2Condition, hospital2Updated).replace(`to ${hospital2Source}>>`, 'to _pregnancy?.donor>>');
  expect(overlays[0].replacement).toMatchObject({ before: body, after });
});

test('a complete condition or set RHS cannot erase a nested assignment, update or delete', () => {
  for (const find of ['($legacy.value = 1)', '$legacy.value++ === 1', 'delete $legacy.value']) {
    for (const before of [`<<if ${find}>>Old branch<</if>>`, `<<set $result to ${find}>>`]) {
      expect(() => RepairBody.apply(before, before, [expression(find, '$current.value === 1')], simpleReference, 'ANCHOR', RepairRecipeParser.macroRanges)).toThrow();
    }
  }
});

test('body expression migration rejects native replacement expansion tokens anywhere in the bound body', () => {
  for (const token of ['$&', "\u0024'", '$`', '$1', '$0', '$<name>', '$$']) {
    const before = simpleBody + '\nUnchanged narrative token: ' + token;
    expect(() => apply('$current.value === 1', before)).toThrow('replacement-string tokens');
  }
});

test('a Unicode escape in a set target cannot imitate a SugarCube temporary definition', () => {
  expect(() => validatePregnancyScope('<<set \\u005fpregnancy to getLabouringPregnancy("pc")>>\nANCHOR')).toThrow('temporary is not initialized');
});

test('triple-quoted and nowiki pseudo-macros cannot authorize paths or serve as expression selectors', () => {
  for (const wrap of [(source: string) => `"""${source}"""`, (source: string) => `<nowiki>${source}</nowiki>`]) {
    const reference = wrap('<<if $hidden.value is 1>>Fake evidence.<</if>>') + '\nANCHOR';
    expect(() => apply('$hidden.value === 1', simpleBody, simpleBody, reference)).toThrow();
    expect(() => apply('$current.value === 1', wrap(simpleBody))).toThrow('expression must be unique');
  }
});

test('a fake temporary set in triple-quoted or nowiki text cannot initialize a real subsequent read', () => {
  for (const wrap of [(source: string) => `"""${source}"""`, (source: string) => `<nowiki>${source}</nowiki>`]) {
    const definition = wrap('<<set _pregnancy to getLabouringPregnancy("pc")>>');
    expect(() => validatePregnancyScope(definition + '\nANCHOR')).toThrow('temporary is not initialized');
  }
});

test('the inherited Hospital 5 branch migrates a simple outer tail without changing its added body', async () => {
  const { target, context, findString } = await fixture(5, []);
  const before = `<<if $remy_pregnancy>>\r\n\tRemy branch.\r\n<<if $remy_mask is 1>>Masked.<</if>>\r\n<<elseif ${hospital5Alex}>>`;
  target.signature = JSON.stringify({ companion: { replace: before } });
  const result = RepairRecipeParser.rebase(target, JSON.stringify({ passage: 'Pregnancy Birth Hospital 5', findString, rebase: true }), context);
  expect(result).toMatchObject({ before, after: before.replace(`<<elseif ${hospital5Alex}>>`, '<<elseif $alex_pregnancy>>') });
});

test('outer-tail inheritance preserves the rejection of native replacement expansion tokens', async () => {
  const { target, context, findString } = await fixture(5, []);
  for (const token of ['$&', "\u0024'", '$`', '$1', '$0', '$<name>', '$$']) {
    const before = `<<if $remy_pregnancy>>\r\nRemy branch ${token}\r\n<<elseif ${hospital5Alex}>>`;
    target.signature = JSON.stringify({ companion: { replace: before } });
    expect(() => RepairRecipeParser.rebase(target, JSON.stringify({ passage: 'Pregnancy Birth Hospital 5', findString, rebase: true }), context)).toThrow();
  }
});

test('nested or ambiguous old tails use the existing general rebase policy instead of the outer-tail helper', async () => {
  const { target, context, findString } = await fixture(5, []);
  const original = `<<if ${hospital5Alex}>>`;
  for (const before of [
    `<<if $remy_pregnancy>>\r\nRemy branch.\r\n<<if $remy_mask is 1>>Masked.\r\n<<elseif ${hospital5Alex}>>`,
    `<<if $remy_pregnancy>>\r\n<<if ${hospital5Alex}>>Nested old branch.<</if>>\r\n<<elseif ${hospital5Alex}>>`
  ]) {
    target.signature = JSON.stringify({ companion: { replace: before } });
    const replace = JSON.stringify({ passage: 'Pregnancy Birth Hospital 5', findString, rebase: true });
    let general: string;
    try {
      general = RepairRebase.apply(original, before, findString);
    } catch {
      expect(() => RepairRecipeParser.rebase(target, replace, context)).toThrow();
      continue;
    }
    expect(RepairRecipeParser.rebase(target, replace, context)).toMatchObject({ before, after: general });
  }
});
