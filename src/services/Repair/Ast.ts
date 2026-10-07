// ./src/services/Repair/Ast.ts

import { parse, tokenizer, type AnyNode, type Token } from 'acorn';
import { NativeJSON } from './Json';
import type { RepairTarget } from './Recipe';

export interface RepairAstOperation {
  type: 'ast';
  targetId: string;
  action: 'replaceExpression' | 'replaceStatement' | 'replaceBlock' | 'insertBefore' | 'insertAfter' | 'deleteStatement';
  selector: { nodeType: string; source: string };
  code?: string;
  reason: string;
  find?: never;
  replace?: never;
  expectedMatches?: never;
}

interface AstEntry {
  node: AnyNode;
  parent?: AnyNode;
  key?: string;
}

interface AstUnit {
  start: number;
  end: number;
  expression: boolean;
  source: string;
  tree: AnyNode;
}

interface MacroRange {
  name: string;
  expressionStart: number;
  expressionEnd: number;
  bodyStart?: number;
  bodyEnd?: number;
}

export default class RepairAst {
  public static readonly ACTIONS = ['replaceExpression', 'replaceStatement', 'replaceBlock', 'insertBefore', 'insertAfter', 'deleteStatement'] as const;
  private static readonly OPTIONS = { ecmaVersion: 2025, sourceType: 'script', preserveParens: true } as const;
  private static readonly UNSAFE = new Set([
    'eval',
    'Function',
    'AsyncFunction',
    'GeneratorFunction',
    'AsyncGeneratorFunction',
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource',
    'Worker',
    'SharedWorker',
    'importScripts',
    'window',
    'globalThis',
    'self',
    'document',
    'location',
    'navigator',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'setTimeout',
    'setInterval',
    'require',
    'constructor',
    'prototype',
    '__proto__',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
    'src',
    'srcdoc',
    'href',
    'innerHTML',
    'outerHTML',
    'cookie'
  ]);
  private static readonly SIMPLE = new Set([
    'Identifier',
    'Literal',
    'ParenthesizedExpression',
    'ChainExpression',
    'MemberExpression',
    'UnaryExpression',
    'BinaryExpression',
    'LogicalExpression',
    'ConditionalExpression',
    'ArrayExpression',
    'ObjectExpression',
    'Property',
    'AssignmentExpression',
    'ExpressionStatement',
    'ReturnStatement',
    'VariableDeclaration',
    'VariableDeclarator',
    'IfStatement',
    'BlockStatement',
    'EmptyStatement'
  ]);
  private static readonly ROOTS = new Set(['V', 'T', 'C', 'setup', 'maplebirch', 'State', 'Story', 'SugarCube']);
  private static readonly OPERATORS: Record<string, string> = {
    is: '===',
    isnot: '!==',
    eq: '==',
    neq: '!=',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    and: '&&',
    or: '||',
    not: '!'
  };

  private static *walk(root: AnyNode, scoped = false): Generator<AstEntry> {
    const pending: AstEntry[] = [{ node: root }];
    let count = 0;
    while (pending.length) {
      if (++count > 64000) throw new Error('AST node limit exceeded');
      const entry = pending.pop()!;
      if (scoped && entry.node !== root && ['BlockStatement', 'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ClassDeclaration', 'ClassExpression'].includes(entry.node.type))
        continue;
      yield entry;
      for (const [key, value] of Object.entries(entry.node)) {
        const children: unknown[] = Array.isArray(value) ? value : [value];
        for (const child of children) {
          if (child && typeof child === 'object' && 'type' in child && 'start' in child && 'end' in child) pending.push({ node: child as AnyNode, parent: entry.node, key });
        }
      }
    }
  }

  private static parseTree(source: string, expression: boolean): AnyNode {
    try {
      return parse(expression ? `(${source})` : source, RepairAst.OPTIONS);
    } catch {
      throw new Error('AST source parse failed');
    }
  }

  private static signature(source: string): string {
    try {
      return NativeJSON.stringify([...tokenizer(source, RepairAst.OPTIONS)].map(token => [token.type.label, source.slice(token.start, token.end)]));
    } catch {
      throw new Error('Invalid AST selector source');
    }
  }

  private static *units(target: RepairTarget, ranges: MacroRange[]): Generator<AstUnit> {
    if (target.kind === 'js') {
      if (target.content.length > 256000) throw new Error('AST source exceeds size limit');
      yield { start: 0, end: target.content.length, expression: false, source: target.content, tree: RepairAst.parseTree(target.content, false) };
      return;
    }
    if (target.kind !== 'twee') throw new Error('AST operation requires a JS or Twee target');
    for (const range of ranges) {
      const script = range.name === 'script';
      if (!script && !['set', 'run', 'if', 'elseif', 'print', '=', 'switch', 'case'].includes(range.name)) continue;
      const start = script ? range.bodyStart : range.expressionStart;
      const end = script ? range.bodyEnd : range.expressionEnd;
      if (start === undefined || end === undefined) continue;
      const source = target.content.slice(start, end);
      const expression = !script && !['set', 'run'].includes(range.name);
      let tree: AnyNode;
      try {
        tree = RepairAst.parseTree(source, expression);
      } catch {
        continue;
      }
      yield { start, end, expression, source, tree };
    }
  }

  private static isExpression(entry: AstEntry): boolean {
    if (entry.key === 'key' || entry.key === 'id' || entry.key === 'params' || entry.key === 'label') return false;
    if (entry.node.type === 'Identifier')
      return !['id', 'params', 'label'].includes(entry.key || '') && !(entry.key === 'property' && entry.parent?.type === 'MemberExpression') && !(entry.key === 'key');
    return entry.node.type === 'Literal' || entry.node.type.endsWith('Expression');
  }

  private static isStatement(node: AnyNode): boolean {
    return (node.type.endsWith('Statement') && node.type !== 'BlockStatement') || node.type === 'VariableDeclaration';
  }

  private static path(node: AnyNode): string | undefined {
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'ParenthesizedExpression' || node.type === 'ChainExpression') return RepairAst.path(node.expression);
    if (node.type !== 'MemberExpression' || node.computed || node.property.type !== 'Identifier') return;
    const root = RepairAst.path(node.object);
    return root && `${root}.${node.property.name}`;
  }

  private static normalizeOperators(source: string): string {
    const tokens = RepairAst.tokenize(source);
    let result = source;
    for (let index = tokens.length - 1; index >= 0; index--) {
      const token = tokens[index];
      if (token.type.label !== 'name' || ['.', '?.', ':'].includes(tokens[index - 1]?.type.label)) continue;
      const replacement = RepairAst.OPERATORS[source.slice(token.start, token.end)];
      if (replacement) result = result.slice(0, token.start) + replacement + result.slice(token.end);
    }
    return result;
  }

  private static readPath(entry: AstEntry): string | undefined {
    const { node, parent, key } = entry;
    if (!['Identifier', 'MemberExpression'].includes(node.type)) return;
    if (parent?.type === 'MemberExpression' && (key === 'object' || key === 'property')) return;
    if (parent?.type === 'CallExpression' && key === 'callee') return;
    if (parent?.type === 'AssignmentExpression' && key === 'left') return;
    if (['key', 'id', 'params', 'label'].includes(key || '')) return;
    const path = RepairAst.path(node);
    if (!path || RepairAst.ROOTS.has(path) || path.split('.').some(part => RepairAst.UNSAFE.has(part))) return;
    return path;
  }

  private static parseExpression(source: string): AnyNode {
    const tree = RepairAst.parseTree(source, true);
    if (tree.type !== 'Program' || tree.body.length !== 1 || tree.body[0].type !== 'ExpressionStatement') throw new Error('Repair requires one complete expression');
    const expression = tree.body[0].expression;
    if (expression.type !== 'ParenthesizedExpression' || expression.start !== 0 || expression.end !== source.length + 2) throw new Error('Repair requires one complete expression');
    return tree;
  }

  public static collectEvidence(source: string, twine = false): { paths: Set<string>; literals: Set<string> } {
    const paths = new Set<string>();
    const literals = new Set<string>();
    let tree: AnyNode;
    try {
      tree = RepairAst.parseExpression(twine ? RepairAst.normalizeOperators(source) : source);
    } catch {
      return { paths, literals };
    }
    for (const entry of RepairAst.walk(tree)) {
      const path = RepairAst.readPath(entry);
      if (path) paths.add(path);
      const { node } = entry;
      if (node.type === 'Literal' && !node.regex && !node.bigint) literals.add(NativeJSON.stringify(node.value));
    }
    return { paths, literals };
  }

  public static validateExpression(source: string, evidence: { paths: Set<string>; literals: Set<string> }): string[] {
    RepairAst.tokenize(source);
    const tree = RepairAst.parseExpression(source);
    const paths = new Set<string>();
    for (const entry of RepairAst.walk(tree)) {
      const { node, parent, key } = entry;
      if (['Program', 'ExpressionStatement'].includes(node.type)) continue;
      if (
        !['Identifier', 'Literal', 'ParenthesizedExpression', 'ChainExpression', 'MemberExpression', 'UnaryExpression', 'BinaryExpression', 'LogicalExpression', 'ConditionalExpression'].includes(
          node.type
        )
      )
        throw new Error(`Unsupported repair expression syntax: ${node.type}`);
      if (node.type === 'Identifier' && RepairAst.UNSAFE.has(node.name)) throw new Error('Unsafe repair expression identifier');
      if (node.type === 'MemberExpression' && (node.computed || node.property.type !== 'Identifier' || !RepairAst.path(node))) throw new Error('Repair expression requires static access');
      if (node.type === 'UnaryExpression' && !['!', '+', '-', '~', 'typeof', 'void'].includes(node.operator)) throw new Error('Unsafe repair expression unary operation');
      if (node.type === 'Literal') {
        if (node.regex || node.bigint || (typeof node.value === 'number' && !Number.isFinite(node.value)) || !evidence.literals.has(NativeJSON.stringify(node.value)))
          throw new Error('Repair expression literal is not observed');
        if (typeof node.value === 'string' && /(?:https?:\/\/|javascript:|data:|blob:|file:|^\/\/|<\/?(?:script|iframe|object|embed)\b)/i.test(node.value))
          throw new Error('Repair expression cannot load executable content');
      }
      const path = RepairAst.readPath(entry);
      if (path === 'undefined') continue;
      if (path) {
        if (!evidence.paths.has(path)) throw new Error(`Repair expression path is not observed: ${path}`);
        paths.add(path);
      } else if (node.type === 'Identifier' && !(parent?.type === 'MemberExpression' && (key === 'property' || key === 'object'))) {
        throw new Error('Repair expression cannot access a host root');
      }
    }
    return [...paths];
  }

  private static overlap(node: AnyNode, start: number, end: number): boolean {
    return start === end ? node.start < start && node.end > start : node.start < end && node.end > start;
  }

  private static insertion(code: string): void {
    const prefix = 'function __repair__(){\n';
    const tree = RepairAst.parseTree(`${prefix}${code}\n}`, false);
    if (tree.type !== 'Program' || tree.body.length !== 1 || tree.body[0].type !== 'FunctionDeclaration') throw new Error('AST insertion must be complete statements');
    const body = tree.body[0].body;
    if (
      body.start !== prefix.indexOf('{') ||
      body.end !== prefix.length + code.length + 2 ||
      !body.body.length ||
      body.body.length > 32 ||
      body.body.some(node => node.start < prefix.length || node.end > prefix.length + code.length)
    )
      throw new Error('AST insertion must be complete statements');
  }

  private static tokenize(code: string): Token[] {
    let closed = true;
    let tokens: Token[];
    try {
      tokens = [
        ...tokenizer(code, {
          ...RepairAst.OPTIONS,
          onComment: (block, _text, _start, end) => {
            if (!block && end === code.length) closed = false;
          }
        })
      ];
    } catch {
      throw new Error('AST code is not lexically closed');
    }
    if (!closed) throw new Error('AST code is not lexically closed');
    return tokens;
  }

  private static validate(unit: AstUnit, tree: AnyNode, selected: AnyNode, start: number, end: number): void {
    const all = [...RepairAst.walk(unit.tree)];
    const scope =
      all
        .filter(({ node }) => ['Program', 'BlockStatement'].includes(node.type) && node.start <= selected.start && node.end >= selected.end)
        .sort((left, right) => left.node.end - left.node.start - (right.node.end - right.node.start))[0]?.node ?? unit.tree;
    const original = [...RepairAst.walk(scope, true)];
    const names = new Set(
      original
        .filter(entry => entry.node.type === 'Identifier' && !['property', 'key', 'id', 'params', 'label'].includes(entry.key || ''))
        .map(entry => (entry.node as Extract<AnyNode, { type: 'Identifier' }>).name)
    );
    const bindings = new Map<string, string>();
    for (const { node, parent } of original) if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && parent?.type === 'VariableDeclaration') bindings.set(node.id.name, parent.kind);
    const locals = new Set(bindings.keys());
    for (const name of locals) names.add(name);
    const writes = new Set(original.flatMap(({ node }) => (node.type === 'AssignmentExpression' ? [RepairAst.path(node.left)] : [])));
    const callable = new Set<string>();
    for (const { node } of all) {
      if (['NewExpression', 'ImportExpression', 'TaggedTemplateExpression'].includes(node.type)) throw new Error('AST cannot repair source with indirect execution');
      if (node.type !== 'CallExpression') continue;
      const path = RepairAst.path(node.callee);
      if (!path) throw new Error('AST cannot repair source with dynamic calls');
      if (path.split('.').some(part => RepairAst.UNSAFE.has(part))) throw new Error('AST cannot repair source with prohibited calls');
      if (path) callable.add(path);
    }
    const offset = Number(unit.expression);
    const entries = [...RepairAst.walk(tree)];
    for (const { node } of entries) {
      if (!RepairAst.overlap(node, start + offset, end + offset)) continue;
      if (['NewExpression', 'ImportExpression', 'TaggedTemplateExpression', 'AwaitExpression', 'YieldExpression', 'UpdateExpression'].includes(node.type))
        throw new Error('Unsafe AST enclosing operation');
      if (
        node.type === 'MemberExpression' &&
        (node.computed ||
          node.property.type !== 'Identifier' ||
          RepairAst.path(node)
            ?.split('.')
            .some(part => RepairAst.UNSAFE.has(part)))
      )
        throw new Error('Unsafe AST member access');
      if (
        node.type === 'Property' &&
        (node.computed ||
          node.method ||
          node.kind !== 'init' ||
          (node.key.type !== 'Identifier' && node.key.type !== 'Literal') ||
          RepairAst.UNSAFE.has(node.key.type === 'Identifier' ? node.key.name : String(node.key.value)))
      )
        throw new Error('Unsafe AST object property');
      if (node.type === 'CallExpression') {
        const path = RepairAst.path(node.callee);
        if (!path || path.split('.').some(part => RepairAst.UNSAFE.has(part))) throw new Error('Unsafe AST call');
      }
    }
    for (const { node, parent, key } of entries) {
      if (node.start < start + offset || node.end > end + offset) continue;
      if (node === tree) continue;
      if (node.type === 'CallExpression') continue;
      if (!RepairAst.SIMPLE.has(node.type)) throw new Error(`Unsupported AST syntax: ${node.type}`);
      if (node.type === 'Identifier') {
        if (RepairAst.UNSAFE.has(node.name)) throw new Error('Unsafe AST identifier');
        const property = (key === 'property' && parent?.type === 'MemberExpression') || (key === 'key' && parent?.type === 'Property');
        if (!property && !names.has(node.name)) throw new Error('AST identifier is not present in source');
      }
      if (node.type === 'Literal' && (node.regex || node.bigint)) throw new Error('Unsupported AST literal');
      if (node.type === 'Literal' && typeof node.value === 'string' && /(?:https?:\/\/|javascript:|data:|blob:|file:|^\/\/|<\/?(?:script|iframe|object|embed)\b)/i.test(node.value))
        throw new Error('AST cannot load remote or executable content');
      if (node.type === 'UnaryExpression' && !['!', '+', '-', '~', 'typeof', 'void'].includes(node.operator)) throw new Error('Unsupported AST unary operation');
      if (node.type === 'VariableDeclarator') {
        const binding = node.id.type === 'Identifier' ? node.id.name : '';
        if (
          !locals.has(binding) ||
          parent?.type !== 'VariableDeclaration' ||
          bindings.get(binding) !== parent.kind ||
          RepairAst.ROOTS.has(binding) ||
          [...callable].some(call => call === binding || call.startsWith(`${binding}.`))
        )
          throw new Error('AST cannot add or change callable bindings');
      }
    }
    for (const { node } of entries) {
      if (!RepairAst.overlap(node, start + offset, end + offset)) continue;
      if (node.type === 'AssignmentExpression') {
        const path = RepairAst.path(node.left);
        if (
          !path ||
          path.split('.').some(part => RepairAst.UNSAFE.has(part)) ||
          !writes.has(path) ||
          (!path.includes('.') && (!locals.has(path) || RepairAst.ROOTS.has(path))) ||
          [...callable].some(call => call === path || call.startsWith(`${path}.`))
        )
          throw new Error('AST write is outside existing permissions');
      }
      if (node.type === 'VariableDeclarator') {
        const binding = node.id.type === 'Identifier' ? node.id.name : '';
        if (RepairAst.ROOTS.has(binding) || [...callable].some(call => call === binding || call.startsWith(`${binding}.`))) throw new Error('AST cannot change callable bindings');
      }
    }
  }

  public static apply(target: RepairTarget, operation: RepairAstOperation, scan: (source: string) => MacroRange[] = () => []): string {
    const ranges = target.kind === 'twee' ? scan(target.content) : [];
    const signature = RepairAst.signature(operation.selector.source);
    const candidates: Array<{ unit: AstUnit; entry: AstEntry }> = [];
    let scanned = 0;
    for (const unit of RepairAst.units(target, ranges)) {
      const offset = Number(unit.expression);
      for (const entry of RepairAst.walk(unit.tree)) {
        const { node } = entry;
        if (node.type !== operation.selector.nodeType || node.start < offset || node.end > unit.source.length + offset) continue;
        scanned += node.end - node.start;
        if (scanned > 2000000) throw new Error('AST selector scan limit exceeded');
        if (RepairAst.signature(unit.source.slice(node.start - offset, node.end - offset)) === signature) candidates.push({ unit, entry });
      }
    }
    if (candidates.length !== 1) throw new Error(`AST target must be unique (found ${candidates.length}, expected 1)`);
    const { unit, entry } = candidates[0];
    const expression = operation.action === 'replaceExpression';
    const block = operation.action === 'replaceBlock';
    if (expression ? !RepairAst.isExpression(entry) : block ? entry.node.type !== 'BlockStatement' : !RepairAst.isStatement(entry.node)) throw new Error('AST action does not match node kind');
    const list = (entry.key === 'body' && ['Program', 'BlockStatement'].includes(entry.parent?.type || '')) || (entry.key === 'consequent' && entry.parent?.type === 'SwitchCase');
    if (['insertBefore', 'insertAfter', 'deleteStatement'].includes(operation.action) && !list) throw new Error('AST statement requires a body list');
    const offset = Number(unit.expression);
    let start = entry.node.start - offset;
    let end = entry.node.end - offset;
    if (operation.action === 'insertBefore') end = start;
    if (operation.action === 'insertAfter') start = end;
    const code = operation.code || '';
    const tokens = RepairAst.tokenize(code);
    if (operation.action === 'insertBefore' || operation.action === 'insertAfter') RepairAst.insertion(code);
    if (target.kind === 'twee' && /<<|>>/.test(code)) throw new Error('AST code cannot change Twee boundaries');
    const source = unit.source.slice(0, start) + code + unit.source.slice(end);
    if (source === unit.source) throw new Error('Unchanged AST operation');
    const tree = RepairAst.parseTree(source, unit.expression);
    RepairAst.validate(unit, tree, entry.node, start, start + code.length);
    const beforeCalls = new Map<string, number>();
    for (const { node } of RepairAst.walk(unit.tree))
      if (node.type === 'CallExpression') {
        const key = RepairAst.signature(unit.source.slice(node.start - offset, node.end - offset));
        beforeCalls.set(key, (beforeCalls.get(key) || 0) + 1);
      }
    for (const { node } of RepairAst.walk(tree))
      if (node.type === 'CallExpression') {
        const key = RepairAst.signature(source.slice(node.start - offset, node.end - offset));
        const remaining = beforeCalls.get(key) || 0;
        if (!remaining) throw new Error('AST cannot add or change calls');
        beforeCalls.set(key, remaining - 1);
      }
    const inserted = [...RepairAst.walk(tree)].filter(({ node }) => node.start === start + (tokens[0]?.start ?? 0) + offset && node.end === start + (tokens.at(-1)?.end ?? 0) + offset);
    if (
      operation.action.startsWith('replace') &&
      !inserted.some(
        candidate =>
          candidate.key === entry.key &&
          candidate.parent?.type === entry.parent?.type &&
          (expression ? RepairAst.isExpression(candidate) : block ? candidate.node.type === 'BlockStatement' : RepairAst.isStatement(candidate.node))
      )
    )
      throw new Error('AST replacement must be one complete node');
    const absoluteStart = unit.start + start;
    const absoluteEnd = unit.start + end;
    const after = target.content.slice(0, absoluteStart) + code + target.content.slice(absoluteEnd);
    if (target.kind === 'twee') {
      const delta = code.length - (end - start);
      const updated = scan(after);
      if (
        updated.length !== ranges.length ||
        ranges.some((range, index) => {
          const next = updated[index];
          if (next.name !== range.name) return true;
          return (['expressionStart', 'expressionEnd', 'bodyStart', 'bodyEnd'] as const).some(key => {
            const position = range[key];
            if (position === undefined) return next[key] !== undefined;
            const shift = position > absoluteEnd || (position === absoluteEnd && (absoluteEnd !== absoluteStart || key.endsWith('End')));
            return next[key] !== position + (shift ? delta : 0);
          });
        })
      )
        throw new Error('AST code changed Twee boundaries');
    }
    return after;
  }
}
