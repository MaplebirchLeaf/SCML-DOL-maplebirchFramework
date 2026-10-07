// ./src/services/Repair/Body.ts

import { tokenizer, type Token } from 'acorn';
import RepairAst from './Ast';

interface BodyRange {
  name: string;
  expressionStart: number;
  expressionEnd: number;
  start: number;
  end: number;
  bodyStart?: number;
  bodyEnd?: number;
}

interface BodyExpression {
  start: number;
  end: number;
  source: string;
}

type BodyScan = (source: string) => BodyRange[];
type BodyEvidence = { paths: Set<string>; literals: Set<string> };
type BodyToken = Token & { value?: unknown };

export default class RepairBody {
  private static readonly LIMIT = 32000;
  private static readonly CONTAINERS = new Set([
    'if',
    'for',
    'switch',
    'widget',
    'link',
    'button',
    'linkappend',
    'linkprepend',
    'linkreplace',
    'append',
    'prepend',
    'replace',
    'repeat',
    'timed',
    'do',
    'capture',
    'silently',
    'nobr'
  ]);

  private static trimExpression(source: string, start: number, end: number): BodyExpression {
    const text = source.slice(start, end);
    const leading = text.length - text.trimStart().length;
    const trailing = text.length - text.trimEnd().length;
    return { start: start + leading, end: Math.max(start + leading, end - trailing), source: text.trim() };
  }

  private static isWriteToken(tokens: BodyToken[], index: number): boolean {
    const token = tokens[index];
    return ['=', '_=', '++/--', 'delete'].includes(token.type.label) || (token.type.label === 'name' && token.value === 'to' && !['.', '?.'].includes(tokens[index - 1]?.type.label));
  }

  private static parseAssignment(source: string): { path: string; start: number; end: number } | undefined {
    let tokens: BodyToken[];
    try {
      tokens = [...tokenizer(source, { ecmaVersion: 2025 })];
    } catch {
      return;
    }
    let index = 0;
    if (tokens[index]?.type.label !== 'name' || source.slice(tokens[index].start, tokens[index].end) !== tokens[index].value) return;
    let path = String(tokens[index++].value);
    while (tokens[index]?.type.label === '.' && tokens[index + 1]?.type.label === 'name') {
      if (source.slice(tokens[index + 1].start, tokens[index + 1].end) !== tokens[index + 1].value) return;
      path += `.${tokens[index + 1].value}`;
      index += 2;
    }
    const operator = tokens[index++];
    if (!operator || !(operator.type.label === '=' || (operator.type.label === 'name' && operator.value === 'to'))) return;
    const rhs = tokens.slice(index);
    if (!rhs.length) return;
    let depth = 0;
    for (const [offset, token] of rhs.entries()) {
      const label = token.type.label;
      if (RepairBody.isWriteToken(rhs, offset)) return;
      if (depth === 0 && (label === ',' || label === ';')) return;
      if (['(', '[', '{', '${'].includes(label)) depth++;
      else if ([')', ']', '}'].includes(label) && --depth < 0) return;
    }
    if (depth !== 0) return;
    return { path, start: operator.end, end: source.length };
  }

  private static collectExpressions(source: string, ranges: BodyRange[]): BodyExpression[] {
    const expressions: BodyExpression[] = [];
    for (const range of ranges) {
      if (range.name === 'if' || range.name === 'elseif') {
        const expression = RepairBody.trimExpression(source, range.expressionStart, range.expressionEnd);
        try {
          const tokens: BodyToken[] = [...tokenizer(expression.source, { ecmaVersion: 2025 })];
          if (!tokens.some((_token, index) => RepairBody.isWriteToken(tokens, index))) expressions.push(expression);
        } catch {
          continue;
        }
      } else if (range.name === 'set') {
        const assignment = RepairBody.parseAssignment(source.slice(range.expressionStart, range.expressionEnd));
        if (assignment) expressions.push(RepairBody.trimExpression(source, range.expressionStart + assignment.start, range.expressionStart + assignment.end));
      }
    }
    return expressions.filter(expression => !!expression.source);
  }

  private static collectEvidence(source: string, ranges: BodyRange[]): BodyEvidence {
    const evidence: BodyEvidence = { paths: new Set(), literals: new Set() };
    for (const range of ranges) {
      if (range.name.startsWith('/') || range.name === 'script') continue;
      let expression = source.slice(range.expressionStart, range.expressionEnd);
      if (range.name === 'set') {
        const assignment = RepairBody.parseAssignment(expression);
        if (!assignment) continue;
        expression = expression.slice(assignment.start, assignment.end);
      }
      const observed = RepairAst.collectEvidence(expression, true);
      for (const path of observed.paths) evidence.paths.add(path);
      for (const literal of observed.literals) evidence.literals.add(literal);
    }
    return evidence;
  }

  public static filterDependencies(source: string, paths: string[], scan: BodyScan): string[] {
    const observed = RepairBody.collectEvidence(source, scan(source)).paths;
    return paths.filter(path => observed.has(path));
  }

  public static validateScope(reference: string, findString: string, introduced: string[], scan: BodyScan): void {
    if (!introduced.length) return;
    if (typeof reference !== 'string' || reference.length > 256000 || typeof findString !== 'string' || !findString) throw new Error('Invalid body migration reference');
    const start = reference.indexOf(findString);
    if (start < 0 || reference.indexOf(findString, start + 1) >= 0) throw new Error('Body migration anchor must be unique');
    const ranges = scan(reference);
    const evidence = RepairBody.collectEvidence(reference, ranges);
    if (introduced.some(path => !evidence.paths.has(path))) throw new Error('Body migration path is not observed in current source');
    const roots = new Set(introduced.map(path => path.split('.')[0]).filter(root => root.startsWith('_') && root.length > 1));
    if (!roots.size) return;
    const containers = new Set([...RepairBody.CONTAINERS, ...ranges.filter(range => range.name.startsWith('/')).map(range => range.name.slice(1))]);
    const scope: string[] = [];
    const assigned = new Set<string>();
    for (const range of ranges) {
      if (range.start >= start) break;
      if (range.name.startsWith('/')) {
        if (scope.pop() !== range.name.slice(1)) throw new Error('Body migration reference has unbalanced macro scope');
      } else if (containers.has(range.name)) scope.push(range.name);
      else if (['unset', 'run', 'script'].includes(range.name)) {
        if (range.name === 'script' && (range.bodyStart === undefined || range.bodyEnd === undefined)) throw new Error('Body migration reference has incomplete script scope');
        const expression = range.name === 'script' ? reference.slice(range.bodyStart, range.bodyEnd) : reference.slice(range.expressionStart, range.expressionEnd);
        let tokens: BodyToken[];
        try {
          tokens = [...tokenizer(expression, { ecmaVersion: 2025 })];
        } catch {
          throw new Error('Body migration reference has invalid executable scope');
        }
        if (range.name !== 'unset' && tokens.some(token => token.type.label === 'name' && ['State', 'T'].includes(String(token.value)))) assigned.clear();
        for (const token of tokens) if (token.type.label === 'name' && roots.has(String(token.value))) assigned.delete(String(token.value));
      } else if (range.name === 'set' && range.end <= start) {
        const expression = reference.slice(range.expressionStart, range.expressionEnd);
        const assignment = RepairBody.parseAssignment(expression);
        let first: BodyToken | undefined;
        try {
          first = tokenizer(expression, { ecmaVersion: 2025 }).getToken();
        } catch {
          throw new Error('Body migration reference has invalid set expression');
        }
        const root = assignment?.path.split('.')[0] ?? (first?.type.label === 'name' ? String(first.value) : undefined);
        if (root && roots.has(root)) {
          if (scope.length) assigned.delete(root);
          else if (assignment?.path === root) assigned.add(root);
        }
      }
    }
    if ([...roots].some(root => !assigned.has(root))) throw new Error('Body migration temporary is not initialized before the anchor');
  }

  public static apply(
    before: string,
    rebased: string,
    expressions: unknown,
    reference: string,
    findString: string,
    scan: BodyScan,
    scopeReference = reference
  ): { after: string; introduced: string[] } {
    if ([before, rebased].some(source => typeof source !== 'string' || !source || source.length > RepairBody.LIMIT)) throw new Error('Invalid body migration source');
    if ([before, rebased].some(source => /\$(?:[$&'`\d]|<)/.test(source))) throw new Error('Body migration cannot use replacement-string tokens');
    if (!Array.isArray(expressions) || !expressions.length || expressions.length > 16) throw new Error('Invalid body migration expressions');
    const beforeRanges = scan(before);
    const rebasedRanges = scan(rebased);
    const original = RepairBody.collectExpressions(before, beforeRanges);
    const candidates = RepairBody.collectExpressions(rebased, rebasedRanges);
    const previous = RepairBody.collectEvidence(before, beforeRanges);
    const current = RepairBody.collectEvidence(reference, scan(reference));
    const evidence: BodyEvidence = { paths: new Set([...previous.paths, ...current.paths]), literals: new Set([...previous.literals, ...current.literals]) };
    const introduced = new Set<string>();
    const edits: Array<BodyExpression & { replace: string }> = [];
    for (const expression of expressions) {
      if (!expression || typeof expression !== 'object' || Array.isArray(expression)) throw new Error('Invalid body migration expression');
      const prototype = Object.getPrototypeOf(expression);
      const fields = Object.getOwnPropertyDescriptors(expression);
      if (
        (prototype !== Object.prototype && prototype !== null) ||
        Object.keys(fields).length !== 3 ||
        !['find', 'replace', 'expectedMatches'].every(key => Object.hasOwn(fields, key) && Object.hasOwn(fields[key], 'value'))
      )
        throw new Error('Invalid body migration expression');
      const find: unknown = fields.find.value;
      const replace: unknown = fields.replace.value;
      if (
        typeof find !== 'string' ||
        !find.trim() ||
        find.length > RepairBody.LIMIT ||
        typeof replace !== 'string' ||
        !replace.trim() ||
        replace.length > RepairBody.LIMIT ||
        fields.expectedMatches.value !== 1 ||
        find.trim() === replace.trim() ||
        /<<|>>/.test(replace)
      )
        throw new Error('Invalid body migration expression');
      const matches = candidates.filter(candidate => candidate.source === find.trim());
      if (original.filter(candidate => candidate.source === find.trim()).length !== 1 || matches.length !== 1) throw new Error('Body migration expression must be unique in bound and rebased source');
      const selected = matches[0];
      if (edits.some(edit => edit.start < selected.end && selected.start < edit.end)) throw new Error('Body migration expressions overlap');
      for (const path of RepairAst.validateExpression(replace, evidence)) if (!previous.paths.has(path)) introduced.add(path);
      edits.push({ ...selected, replace });
    }
    const paths = [...introduced].sort();
    RepairBody.validateScope(scopeReference, findString, paths, scan);
    let after = rebased;
    for (const edit of edits.sort((left, right) => right.start - left.start)) after = after.slice(0, edit.start) + edit.replace + after.slice(edit.end);
    if (after.length > RepairBody.LIMIT) throw new Error('Migrated replacement exceeds size limit');
    if (/\$(?:[$&'`\d]|<)/.test(after)) throw new Error('Body migration cannot use replacement-string tokens');
    const updatedRanges = scan(after);
    const offset = (position: number) => edits.reduce((shift, edit) => shift + (position >= edit.end ? edit.replace.length - (edit.end - edit.start) : 0), 0);
    if (
      updatedRanges.length !== rebasedRanges.length ||
      rebasedRanges.some((range, index) => {
        const updated = updatedRanges[index];
        return updated.name !== range.name || (['start', 'end', 'expressionStart', 'expressionEnd'] as const).some(key => updated[key] !== range[key] + offset(range[key]));
      })
    )
      throw new Error('Body migration changed Twee boundaries');
    return { after, introduced: paths };
  }
}
