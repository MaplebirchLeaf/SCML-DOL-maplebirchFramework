import { expect, test } from 'bun:test';
import { RepairRebase } from '../../src/services/Repair/Rebase';

test('rebases the existing Remy milk initialization without deleting the current vanilla initialization', () => {
  const original = '<<if $livestock_milk is undefined>><<set $livestock_milk to 0>><</if>>';
  const current = '<<if $livestock.milk is undefined>><<set $livestock.milk to 0>><</if>>';
  const mod = '<<if $livestock_milk_max is undefined>><<set $livestock_milk_max to 0>><</if>>\n';
  for (const ending of ['', '<<set $milk_hand_first to 1>>']) {
    const replacement = mod + original + ending;
    expect(RepairRebase.apply(original, replacement, current)).toBe(mod + current + ending);
    expect(replacement).toBe(mod + original + ending);
  }
});

test('rebases the Remy riding-school wrapper across CRLF while keeping the current link body', () => {
  const original = '<<getouticon>><<link [[离开|Riding School]]>><<handheldon>><</link>>\n<br>';
  const replacement = original.replaceAll('\n', '\r\n') + '\r\n\r\n<</if>>';
  const current = '<<getouticon>><<link [[离开|Riding School]]>><</link>>\n<br>';
  expect(RepairRebase.apply(original, replacement, current)).toBe(current + '\r\n\r\n<</if>>');
});

test('rebases the Remy milking-dialogue inherited branch while preserving its raw surrounding CRLF', () => {
  const original =
    '\t<<He>>伸手去抓你的项圈，然后停了下来。“也许我该换种更传统的方法，虽然花时间，但要是我们宝贵的<<if $player.gender_appearance is "m">>公牛<<else>>母牛<</if>>能产更多奶，那也值得。”<<he>>喃喃自语。\n\t<br><br>';
  const current = '\t<<He>>伸手去抓你的项圈，然后停了下来。“也许我该用老办法。虽然会多花点时间，但能从我们珍贵的<<pcow>>身上挤出更多牛奶，那也值了。”<<he>>咕哝道。\n\t<br><br>';
  const prefix = '<<else>>\r\n\t<<unset $mmilkfight_phase>>\r\n';
  const replacement = prefix + original.replaceAll('\n', '\r\n');
  expect(RepairRebase.apply(original, replacement, current)).toBe(prefix + current);
  expect(RepairRebase.apply(original.replaceAll('\n', '\r\n'), prefix + original, current)).toBe(prefix + current);
});

test('refuses duplicate inherited blocks even when their line endings differ', () => {
  const original = 'line one\nline two';
  expect(() => RepairRebase.apply(original, original.replaceAll('\n', '\r\n') + '\n' + original, 'updated\nsource')).toThrow('Ambiguous inherited');
});

test('retains the Remy threshold edit and added action while inheriting the current variable path', () => {
  const original = '<<elseif $livestock_obey gte 51>>';
  const replacement = '<<elseif $livestock_obey gte 71>>\n<<set $syndromeremybuild += 1>>';
  const current = '<<elseif $livestock.obey gte 51>>';
  expect(RepairRebase.apply(original, replacement, current)).toBe('<<elseif $livestock.obey gte 71>>\n<<set $syndromeremybuild += 1>>');
  expect(RepairRebase.apply(original, original.replace('51', '52'), current)).toBe('<<elseif $livestock.obey gte 52>>');
});

test('transfers complete identifiers and number tokens instead of their shared character fragments', () => {
  for (const value of ['field51', '$field51', '变量51', '51.2', '0x51', '51n', '51_000']) {
    const original = `const value = ${value};\nconst other = 1;`;
    const replacement = original.replace('51', '52');
    const current = original.replace('other = 1', 'other = 2');
    expect(RepairRebase.apply(original, replacement, current)).toBe(replacement.replace('other = 1', 'other = 2'));
  }
});

test('transports one independent mod edit onto either side of a current edit', () => {
  const original = 'const alpha = 1;\nconst beta = 2;\n';
  expect(RepairRebase.apply(original, original.replace('alpha = 1', 'alpha = 9'), original.replace('beta = 2', 'beta = 3'))).toBe('const alpha = 9;\nconst beta = 3;\n');
  expect(RepairRebase.apply(original, original.replace('beta = 2', 'beta = 8'), original.replace('alpha = 1', 'alpha = 123'))).toBe('const alpha = 123;\nconst beta = 8;\n');
});

test('retains an existing mod insertion while preserving a separate current change', () => {
  const original = 'first();\nsecond();\nthird();\n';
  const replacement = 'first();\nmodFeature();\nsecond();\nthird();\n';
  const current = 'first();\nsecond();\nlast();\n';
  expect(RepairRebase.apply(original, replacement, current)).toBe('first();\nmodFeature();\nsecond();\nlast();\n');
});

test('refuses overlapping or adjacent edits instead of choosing one branch', () => {
  const original = 'const amount = 1;\n';
  expect(() => RepairRebase.apply(original, 'const amount = 2;\n', 'const amount = 3;\n')).toThrow('overlap');
  expect(() => RepairRebase.apply('a b c', 'a x c', 'a bx c')).toThrow('overlap');
  expect(() => RepairRebase.apply('before\nvalue\nafter', 'before\nmod\nafter', 'before\ncurrent\nafter')).toThrow('overlap');
});

test('refuses ambiguous inherited or unchanged context', () => {
  expect(() => RepairRebase.apply('aaa', 'aaaa', 'bbb')).toThrow('Ambiguous inherited');
  const repeated = 'same();\n'.repeat(50) + 'const end = 1;';
  expect(() => RepairRebase.apply(repeated, repeated.replace('same', 'mod'), repeated.replace('end = 1', 'end = 2'))).toThrow('unique unchanged context');
});

test('transfers an existing whole variable rename and still rejects split source delimiters', () => {
  const original = 'const foobar = 1;\nconst count = 2;';
  expect(RepairRebase.apply(original, original.replace('foobar', 'fooBaz'), original.replace('count = 2', 'count = 3'))).toBe('const fooBaz = 1;\nconst count = 3;');
  expect(() => RepairRebase.apply('<<if x>>\ny=1', '<mod<if x>>\ny=1', '<<if x>>\ny=2')).toThrow('splits a source token');
});

test('retains both Remy thresholds while inheriting the current variable path and pride condition', () => {
  const original = '\t<<if $livestock_obey gte 80 and C.npc.Remy.love gte 50 and random(1,100) gte 60 and !playerChastity()>>';
  const replacement = original.replace('gte 80', 'gte 50').replace('Remy.love gte 50', 'Remy.love gte 20');
  const current = original.replace('$livestock_obey', '$livestock.obey').replace('()>>', '() and $livestock.pride is 1>>');
  expect(RepairRebase.apply(original, replacement, current)).toBe(current.replace('gte 80', 'gte 50').replace('Remy.love gte 50', 'Remy.love gte 20'));
});

test('maps multiple edits from original coordinates without losing current changes between them', () => {
  const original = 'const alpha = 1;\nconst beta = 2;\nconst gamma = 3;\nconst delta = 4;';
  const replacement = original.replace('alpha = 1', 'alpha = 12345').replace('delta = 4', 'delta = 0');
  const current = original.replace('beta = 2', 'beta = 9876').replace('gamma = 3', 'gamma = 99');
  expect(RepairRebase.apply(original, replacement, current)).toBe(current.replace('alpha = 1', 'alpha = 12345').replace('delta = 4', 'delta = 0'));
});

test('compares dispersed changes across CRLF and LF without rewriting untouched current line endings', () => {
  const original = 'const alpha = 1;\nconst beta = 2;\nconst gamma = 3;\nconst delta = 4;';
  const replacement = original.replace('alpha = 1', 'alpha = 12345').replace('delta = 4', 'delta = 0').replaceAll('\n', '\r\n');
  const current = 'const alpha = 1;\r\nconst beta = 9876;\nconst gamma = 99;\r\nconst delta = 4;';
  expect(RepairRebase.apply(original, replacement, current)).toBe(current.replace('alpha = 1', 'alpha = 12345').replace('delta = 4', 'delta = 0'));
  expect(RepairRebase.apply(original.replaceAll('\n', '\r\n'), replacement, current)).toBe(current.replace('alpha = 1', 'alpha = 12345').replace('delta = 4', 'delta = 0'));
});

test('keeps mixed line endings from the original mod additions and unchanged current source', () => {
  const original = 'first();\nsecond();\nthird();\n';
  const replacement = 'first();\r\nextraOne();\nextraTwo();\r\nsecond();\r\nthird();\n';
  const current = 'first();\r\nsecond();\nlast();\r\n';
  expect(RepairRebase.apply(original, replacement, current)).toBe('first();\r\nextraOne();\nextraTwo();\r\nsecond();\nlast();\r\n');
});

test('one conflicting hunk rejects the migration even when other hunks are independent', () => {
  const original = 'const alpha = 1;\nconst beta = 2;\nconst gamma = 3;';
  expect(() => RepairRebase.apply(original, original.replace('alpha = 1', 'alpha = 4').replace('gamma = 3', 'gamma = 5'), original.replace('gamma = 3', 'gamma = 6'))).toThrow('overlap');
});

test('allows an independent mod edit alongside a current object-binding change for review', () => {
  const original =
    '\t<<set _i to $NPCNameList.indexOf("Remy")>>\n\t<<set $NPCName[_i].love = Math.clamp($NPCName[_i].love, -100, 100)>>\n\t<<set $NPCName[_i].dom = Math.clamp($NPCName[_i].dom, -50, 50)>>';
  const replacement = original.replace('dom, -50, 50', 'dom, -50, 100');
  expect(RepairRebase.apply(original, replacement, original.replace('"Remy"', '_name'))).toBe(replacement.replace('"Remy"', '_name'));
  const body = replacement.replace('\n\t<<set $NPCName[_i].dom', '\n\t<<set $NPCName[_i].lust = Math.clamp($NPCName[_i].lust, 0, 100)>>\n\t<<set $NPCName[_i].dom').replaceAll('\n', '\r\n');
  const current = original.replace('"Remy"', '_name').replaceAll('\t', '\t\t');
  const migrated = RepairRebase.apply(original, body, current);
  expect(migrated).toContain('$NPCNameList.indexOf(_name)');
  expect(migrated).toContain('$NPCName[_i].love = Math.clamp($NPCName[_i].love, -100, 100)');
  expect(migrated).toContain('$NPCName[_i].lust = Math.clamp($NPCName[_i].lust, 0, 100)');
  expect(migrated).toContain('$NPCName[_i].dom = Math.clamp($NPCName[_i].dom, -50, 100)');
});

test('uses the same scope policy for inherited source and retains the changed binding in the resulting body', () => {
  const original = '<<set _i to $NPCNameList.indexOf("Remy")>>\n<<set _npc to $NPCName[_i]>>';
  const current = original.replace('"Remy"', '_name');
  const addition = '\n<<set _npc.dom += 10>>';
  expect(RepairRebase.apply(original, original + addition, current)).toBe(current + addition);
});

test('refuses replacement expansion tokens in every input', () => {
  for (const token of ['$&', "$'", '$`', '$1', '$0', '$<name>', '$$']) {
    expect(() => RepairRebase.apply('old ' + token, 'prefix old ' + token, 'new ' + token)).toThrow('Replacement-string tokens');
    expect(() => RepairRebase.apply('old', 'prefix old ' + token, 'new')).toThrow('Replacement-string tokens');
    expect(() => RepairRebase.apply('old', 'prefix old', 'new ' + token)).toThrow('Replacement-string tokens');
  }
});

test('requires bounded changed inputs and bounds the derived body', () => {
  expect(() => RepairRebase.apply('', 'mod', 'current')).toThrow('Invalid rebase source');
  expect(() => RepairRebase.apply('old', 'prefix old', 'old')).toThrow('Rebase requires');
  expect(() => RepairRebase.apply('old', 'old', 'new')).toThrow('Rebase requires');
  expect(() => RepairRebase.apply('old', 'old' + 'x'.repeat(32000), 'new')).toThrow('Invalid rebase source');
  expect(() => RepairRebase.apply('old', 'x'.repeat(31997) + 'old', 'current')).toThrow('exceeds size limit');
  expect(RepairRebase.apply('old', 'x'.repeat(31997) + 'old', 'new')).toHaveLength(32000);
});

test('unterminated escaped literals do not repeatedly rescan the remaining source', () => {
  const started = performance.now();
  for (const quote of ['"', "'", '`']) {
    const source = ('\\' + quote).repeat(15000) + ' end = 1;';
    expect(() => RepairRebase.apply(source, source.replace('end = 1', 'end = 2'), source.replace('end = 1', 'end = 3'))).toThrow('overlap');
  }
  expect(performance.now() - started).toBeLessThan(1000);
});

test('derives source text without executing either the mod or current source', () => {
  const original = 'original();';
  const mod = 'globalThis.rebaseMustNotExecute = true;\n' + original;
  const current = 'throw new Error("source must stay text");';
  expect(RepairRebase.apply(original, mod, current)).toBe('globalThis.rebaseMustNotExecute = true;\n' + current);
  expect(Object.hasOwn(globalThis, 'rebaseMustNotExecute')).toBe(false);
});
