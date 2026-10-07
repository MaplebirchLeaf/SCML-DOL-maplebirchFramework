import './runtime';
import { expect, test } from 'bun:test';
import { RepairRecipeParser, type RepairContext, type RepairRecipe, type RepairTarget } from '../../src/services/Repair/Recipe';
import { RepairEngine } from '../../src/services/Repair/Engine';
import type { RepairAstOperation } from '../../src/services/Repair/Ast';

async function fixture(content: string, selector: RepairAstOperation['selector'], code?: string, action: RepairAstOperation['action'] = 'replaceExpression', kind: RepairTarget['kind'] = 'js') {
  const target: RepairTarget = { id: 'target-1', modName: 'example', kind, path: 'script.js', content, fingerprint: await RepairRecipeParser.fingerprint(content) };
  const context: RepairContext = { requestId: 'ast', mods: ['example'], diagnostics: [], modLoaderLogs: [], patches: [], conflicts: [], targets: [target] };
  const operation: RepairAstOperation = { type: 'ast', targetId: target.id, action, selector, ...(code !== undefined && { code }), reason: 'Repair the observed source' };
  const recipe: RepairRecipe = { requestId: context.requestId, outcome: 'repair', summary: 'Fix source', evidence: [], operations: [operation] };
  return { target, context, operation, recipe, prepare: () => RepairEngine.prepare(recipe, context, () => target.content) };
}

test('AST uniquely locates a real expression and preserves every unmodified byte', async () => {
  const before = '// state.value\r\nconst hint = "state.value";\r\nfunction read() {\r\n\treturn state /* kept */ . value;\r\n}\r\n';
  const state = await fixture(before, { nodeType: 'MemberExpression', source: 'state.value' }, 'state.value ?? 0');
  const [overlay] = await state.prepare();
  expect(overlay.before).toBe(before);
  expect(overlay.after).toBe(before.replace('state /* kept */ . value', 'state.value ?? 0'));
  expect(overlay.fingerprint).toBe(await RepairRecipeParser.fingerprint(overlay.after));
  expect(RepairRecipeParser.parse(JSON.stringify(state.recipe), state.context).operations[0].type).toBe('ast');
});

test.each(['return state.value + state.value;', 'return state.value; } function other() { return state.value;'])('AST rejects ambiguous node selectors: %s', async body => {
  const state = await fixture(`function read() { ${body} }`, { nodeType: 'MemberExpression', source: 'state.value' }, 'state.value ?? 0');
  await expect(state.prepare()).rejects.toThrow('AST target must be unique');
});

test('AST selector type and node category are enforced', async () => {
  const state = await fixture('function read() { return state.value; }', { nodeType: 'MemberExpression', source: 'state.other' }, '0');
  await expect(state.prepare()).rejects.toThrow('found 0');
  state.operation.selector.source = 'state.value';
  state.operation.action = 'replaceStatement';
  await expect(state.prepare()).rejects.toThrow('node kind');
});

test.each(['(', 'state.value ??', '0; state.value', '() => 1', 'function () {}', 'new Date()', 'import("mod")'])(
  'AST rejects syntax errors, multiple nodes and executable constructs: %s',
  async code => {
    const state = await fixture('function read() { return state.value; }', { nodeType: 'MemberExpression', source: 'state.value' }, code);
    await expect(state.prepare()).rejects.toThrow();
  }
);

test.each([
  'eval("x")',
  '(0, eval)("x")',
  'Function("return 1")()',
  'fetch("/api")',
  'new XMLHttpRequest()',
  'new WebSocket("wss://example.test")',
  'state.constructor',
  'state["con" + "structor"]',
  'state.__proto__',
  'state.\\u0063onstructor',
  'window.location',
  'globalThis.fetch',
  '{__proto__: state.value}',
  'state.value = 1',
  '"https://example.test/mod.js"',
  '`safe ${fetch("/api")}`'
])('AST denies dangerous access or unapproved writes: %s', async code => {
  const state = await fixture('function read() { return state.value; }', { nodeType: 'MemberExpression', source: 'state.value' }, code);
  await expect(state.prepare()).rejects.toThrow();
});

test.each(['"constructor"', '"__proto__"', '"prototype"'])('AST validates enclosing computed members after replacing a literal: %s', async code => {
  const state = await fixture('function read() { return state["value"]; }', { nodeType: 'Literal', source: '"value"' }, code);
  await expect(state.prepare()).rejects.toThrow('Unsafe AST member');
});

test.each(['import("old")', 'new Function("old")', 'new WebSocket("old")', 'load`old`'])('AST cannot edit arguments inside prohibited enclosing operations: %s', async expression => {
  const selector = expression.includes('`') ? { nodeType: 'TemplateElement', source: 'old' } : { nodeType: 'Literal', source: '"old"' };
  const state = await fixture(`function read() { return ${expression}; }`, selector, '"changed"');
  await expect(state.prepare()).rejects.toThrow();
});

test('AST supports full statements, blocks, insertion and deletion within existing write permissions', async () => {
  const before = 'function update() {\n\tstate.count = state.count + 1;\n\treturn state.count;\n}';
  const selector = { nodeType: 'ExpressionStatement', source: 'state.count=state.count+1;' };
  const replacement = await fixture(before, selector, 'state.count = 0;', 'replaceStatement');
  expect((await replacement.prepare())[0].after).toBe(before.replace('state.count = state.count + 1;', 'state.count = 0;'));
  for (const action of ['insertBefore', 'insertAfter'] as const) {
    const inserted = await fixture(before, selector, '\nif (state.count == null) { state.count = 0; }\n', action);
    const anchor = 'state.count = state.count + 1;';
    expect((await inserted.prepare())[0].after).toBe(before.replace(anchor, action === 'insertBefore' ? inserted.operation.code + anchor : anchor + inserted.operation.code));
  }
  const deleted = await fixture(before, selector, undefined, 'deleteStatement');
  expect((await deleted.prepare())[0].after).toBe(before.replace('state.count = state.count + 1;', ''));
  const block = await fixture(before, { nodeType: 'BlockStatement', source: '{ state.count = state.count + 1; return state.count; }' }, '{ state.count = 0; return state.count; }', 'replaceBlock');
  expect((await block.prepare())[0].after).toBe('function update() { state.count = 0; return state.count; }');
});

test.each(['"__proto__"', '"constructor"', '"prototype"'])('AST cannot replace an object key as an expression: %s', async code => {
  const state = await fixture('const obj = { "safe": { x: 1 } };', { nodeType: 'Literal', source: '"safe"' }, code);
  await expect(state.prepare()).rejects.toThrow();
});

test('AST cannot insert beside or delete a bare if branch statement', async () => {
  for (const action of ['insertBefore', 'insertAfter', 'deleteStatement'] as const) {
    const state = await fixture(
      'if (state.ready) state.count = 0;',
      { nodeType: 'ExpressionStatement', source: 'state.count = 0;' },
      action === 'deleteStatement' ? undefined : 'state.count = 1;',
      action
    );
    await expect(state.prepare()).rejects.toThrow('body list');
  }
});

test.each(['} function f() {', '} if (flag) {', '/*', 'state.count = (', '// only comment'])('AST insertions cannot pair syntax with untouched source: %s', async code => {
  const state = await fixture('const obj = { f: 1 }; if (flag) { state.count = 1; }', { nodeType: 'ExpressionStatement', source: 'state.count = 1;' }, code, 'insertBefore');
  await expect(state.prepare()).rejects.toThrow();
});

test.each(['0 //', '\n0', '// comment\n0'])('AST expression replacement preserves its original syntax slot: %s', async code => {
  const state = await fixture('function read() { return value; render();\n}', { nodeType: 'Identifier', source: 'value' }, code);
  await expect(state.prepare()).rejects.toThrow();
});

test('AST permits a complete top-level declaration while retaining its local binding', async () => {
  const state = await fixture('const value = 1;', { nodeType: 'VariableDeclaration', source: 'const value = 1;' }, 'const value = 2;', 'replaceStatement');
  expect((await state.prepare())[0].after).toBe('const value = 2;');
});

test('AST retains declaration kind and cannot hoist a block binding', async () => {
  const state = await fixture('if (state.ready) { let value = 1; }', { nodeType: 'VariableDeclaration', source: 'let value = 1;' }, 'var value = 2;', 'replaceStatement');
  await expect(state.prepare()).rejects.toThrow();
});

test('AST preserves existing call text but refuses changed, duplicated or aliased calls', async () => {
  const before = 'function update() { if (state.ready) { render(state.value); } }';
  const selector = { nodeType: 'BlockStatement', source: '{ render(state.value); }' };
  const state = await fixture(before, selector, '{ if (state.value != null) { render(state.value); } }', 'replaceBlock');
  expect((await state.prepare())[0].after).toContain('if (state.value != null)');
  for (const code of ['{ render(0); }', '{ render(state.value); render(state.value); }', '{ render.constructor("x")(); }']) {
    state.operation.code = code;
    await expect(state.prepare()).rejects.toThrow();
  }
  const alias = await fixture('let alias = render; alias();', { nodeType: 'VariableDeclaration', source: 'let alias = render;' }, 'let alias = state.value;', 'replaceStatement');
  await expect(alias.prepare()).rejects.toThrow('callable bindings');
});

test('AST refuses changes around indirect callees even when call tokens remain unchanged', async () => {
  for (const code of ['"constructor"', '"con" + "structor"']) {
    const state = await fixture('let key = "safe"; obj[key](payload);', { nodeType: 'Literal', source: '"safe"' }, code);
    await expect(state.prepare()).rejects.toThrow('dynamic calls');
  }
  const alias = await fixture('let alias = render; alias();', { nodeType: 'Identifier', source: 'render' }, 'alias');
  await expect(alias.prepare()).rejects.toThrow('callable bindings');
});

test.each(['eval(payload)', 'new Function(payload)', 'import(payload)', 'new WebSocket(payload)'])('AST does not modify data feeding an existing prohibited operation: %s', async call => {
  const state = await fixture(`let payload = "safe"; ${call};`, { nodeType: 'Literal', source: '"safe"' }, '"changed"');
  await expect(state.prepare()).rejects.toThrow();
});

test.each(['function a() { let x; x = 1; } function b() { return 0; }', 'function a() { if (state.ready) { let x; x = 1; } return 0; }'])(
  'AST cannot borrow local writes from another lexical scope: %s',
  async before => {
    const state = await fixture(before, { nodeType: 'Literal', source: '0' }, '(x = 2)');
    await expect(state.prepare()).rejects.toThrow();
  }
);

test.each(['V', 'setup', 'window'])('AST cannot overwrite a dangerous root object: %s', async root => {
  const state = await fixture(`let ${root} = {}; ${root} = {};`, { nodeType: 'ExpressionStatement', source: `${root} = {};` }, `${root} = null;`, 'replaceStatement');
  await expect(state.prepare()).rejects.toThrow();
});

test.each([
  ['Before <<script>>\nstate.count = state.value;\n<</script>> After', 'state.count = state.value ?? 0;'],
  ['Before <<if state.value>>kept<</if>> After', '<<if state.value ?? 0>>'],
  ['<<print state.value>> / <<run state.other = 1;>>', '<<print state.value ?? 0>>']
])('AST repairs only JS in a Twee macro or script: %s', async (before, expected) => {
  const state = await fixture(before, { nodeType: 'MemberExpression', source: 'state.value' }, 'state.value ?? 0', 'replaceExpression', 'twee');
  const after = (await state.prepare())[0].after;
  expect(after).toContain(expected);
  expect(after).toBe(before.replace('state.value', 'state.value ?? 0'));
});

test('AST skips unsupported SugarCube dialect and refuses plain text, markup or macro escape', async () => {
  const source = 'state.value <span title="state.value">kept</span> <<if state.value is 0>>kept<</if>>';
  const state = await fixture(source, { nodeType: 'MemberExpression', source: 'state.value' }, 'state.value ?? 0', 'replaceExpression', 'twee');
  await expect(state.prepare()).rejects.toThrow('found 0');
  const script = await fixture('<<script>>state.count = state.value;<</script>>', { nodeType: 'MemberExpression', source: 'state.value' }, '"<</script>>"', 'replaceExpression', 'twee');
  await expect(script.prepare()).rejects.toThrow('Twee boundaries');
});

test.each(['css', 'state', 'patch-anchor', 'replace-patcher', 'twee-replacer'] as const)('AST does not extend other target mechanisms: %s', async kind => {
  const state = await fixture('state.value', { nodeType: 'MemberExpression', source: 'state.value' }, '0', 'replaceExpression', kind);
  await expect(state.prepare()).rejects.toThrow('JS or Twee target');
});

test('AST preserves strict atomic review and fingerprint validation', async () => {
  const state = await fixture('function read() { return state.value; }', { nodeType: 'MemberExpression', source: 'state.value' }, 'fetch("/api")');
  expect(() => RepairRecipeParser.review(JSON.stringify(state.recipe), state.context)).toThrow();
  state.operation.code = 'state.value ?? 0';
  const before = state.target.content;
  state.target.content += '\n';
  await expect(state.prepare()).rejects.toThrow('target changed');
  state.target.content = before;
  const extra = { ...state.operation, selector: { ...state.operation.selector, offset: 0 } };
  expect(() => RepairRecipeParser.parse(JSON.stringify({ ...state.recipe, operations: [extra] }), state.context)).toThrow('fields');
});
