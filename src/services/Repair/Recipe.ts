// ./src/services/Repair/Recipe.ts

import { NativeJSON } from './Json';
import { RepairRebase } from './Rebase';

export interface RepairTarget {
  id: string;
  modName: string;
  kind: 'twee' | 'js' | 'css' | 'patch-anchor' | 'replace-patcher' | 'twee-replacer';
  path: string;
  fingerprint: string;
  content: string;
  signature?: string;
  reference?: string;
}

export interface RepairContext {
  requestId: string;
  mods: string[];
  diagnostics: Array<{ at?: string; level: string; scope?: string; message: string }>;
  modLoaderLogs: Array<{ at?: string; level: 'WARN' | 'ERROR'; message: string }>;
  patches: Array<{ target: string; pattern: string; status: string; matches: number; expected?: number; applied?: number; error?: string }>;
  conflicts: Array<{ source: string; dataSource: string; passages: string[]; scripts: string[]; styles: string[] }>;
  passages?: Array<{
    name: string;
    original?: string;
    current?: string;
    currentOmitted?: true;
    /** 长段落只向接口发送相关片段，完整 current 留在宿主用于校验。 */
    excerpts?: Array<{ offset: number; content: string }>;
  }>;
  /** 本次未发送的相关规则数。 */
  omittedRules?: number;
  /** 当前脚本的只读定位片段。 */
  scripts?: Array<{ name: string; symbols: string[]; excerpts: Array<{ line: number; column?: number; content: string }> }>;
  /** 原生补丁目的文件；完整正文留给宿主验证唯一匹配。 */
  sources?: Array<{ name: string; kind: 'js' | 'css'; current: string; excerpts?: Array<{ offset: number; content: string }> }>;
  relatedRules?: Array<{
    modName: string;
    patcher: 'replace-patcher' | 'replace-addon' | 'twee-replacer';
    kind: 'twee' | 'js' | 'css';
    destination: string;
    find: string;
    replace: string;
    order?: number;
  }>;
  targets: RepairTarget[];
}

export interface RepairRecipe {
  requestId: string;
  outcome: 'repair' | 'insufficient-context';
  summary: string;
  evidence: string[];
  operations: RepairOperation[];
}

interface RepairOperation {
  targetId: string;
  find: string;
  replace: string;
  expectedMatches: number;
  reason: string;
}

interface TweeRegion {
  start: number;
  end: number;
  name?: string;
  expressionStart?: number;
  expressionEnd?: number;
  bodyStart?: number;
  bodyEnd?: number;
}

export class RepairRecipeParser {
  public static readonly MAX_LENGTH = 2000000;

  private static object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

  private static text = (value: unknown, limit: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= limit;

  private static keys = (value: Record<string, unknown>, names: string[]) => Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));

  /** 标记代码位置，排除字面量、注释和含义不明的斜杠表达式。 */
  public static codeOffsets(source: string, mode: 'code' | 'markup' = 'code'): Uint8Array {
    const offsets = new Uint8Array(source.length);
    let index = 0;
    while (index < source.length) {
      const character = source[index];
      if (character === '"' || character === "'" || character === '`') {
        const quote = character;
        for (index++; index < source.length; index++) {
          if (source[index] === '\\') index++;
          else if (source[index] === quote) {
            index++;
            break;
          }
        }
      } else if (character === '/' && mode === 'code') {
        if (source[index + 1] === '*') {
          const end = source.indexOf('*/', index + 2);
          index = end < 0 ? source.length : end + 2;
        } else if (source[index + 1] === '/') {
          const end = source.indexOf('\n', index + 2);
          index = end < 0 ? source.length : end;
        } else {
          // 不将正则正文或含义不明的除法表达式视为可修改代码。
          let bracket = false;
          for (index++; index < source.length && source[index] !== '\n'; index++) {
            if (source[index] === '\\') index++;
            else if (source[index] === '[') bracket = true;
            else if (source[index] === ']') bracket = false;
            else if (source[index] === '/' && !bracket) {
              index++;
              break;
            }
          }
        }
      } else offsets[index++] = 1;
    }
    return offsets;
  }

  /** 复用字面量标记寻找结束符，HTML 属性只处理引号，不解释斜杠。 */
  private static quotedEnd(source: string, start: number, delimiter: string, mode: 'code' | 'markup' = 'code'): number {
    let end = source.indexOf(delimiter, start);
    while (end >= 0) {
      const offsets = RepairRecipeParser.codeOffsets(source.slice(start, end + delimiter.length), mode);
      if (offsets.slice(end - start).every(Boolean)) return end;
      end = source.indexOf(delimiter, end + delimiter.length);
    }
    return -1;
  }

  /** 脚本中的字符串和注释不能冒充结束标签。 */
  private static bodyClose(source: string, start: number, pattern: RegExp): { start: number; end: number } | undefined {
    pattern.lastIndex = start;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
      const offsets = RepairRecipeParser.codeOffsets(source.slice(start, match.index + 2));
      if (offsets.slice(match.index - start).every(Boolean)) return { start: match.index, end: match.index + match[0].length };
    }
  }

  /** 区分外层宏、标签、链接、注释和脚本正文。 */
  private static tweeRegions(source: string): TweeRegion[] {
    const regions: TweeRegion[] = [];
    const pattern = /<!--|\/%|\/\*|\/\/|\[\[|\[(?:[<>]?img)\[|<<\s*(\/?[A-Za-z_][\w-]*|=)(?=[\s>])|<\/?[A-Za-z][\w:-]*(?=[\s/>])/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
      const start = match.index;
      const token = match[0];
      const region: TweeRegion = { start, end: source.length };
      if (match[1]) {
        region.name = match[1];
        region.expressionStart = start + token.length;
        const close = RepairRecipeParser.quotedEnd(source, region.expressionStart, '>>');
        if (close >= 0) {
          region.expressionEnd = close;
          region.end = close + 2;
          if (region.name === 'script') {
            region.bodyStart = region.end;
            const bodyClose = RepairRecipeParser.bodyClose(source, region.end, /<<\s*\/script\s*>>/g);
            region.bodyEnd = bodyClose?.start;
            region.end = bodyClose?.end ?? source.length;
          }
        }
      } else if (token.startsWith('<') && token !== '<!--') {
        const close = RepairRecipeParser.quotedEnd(source, start + token.length, '>', 'markup');
        if (close >= 0) {
          region.end = close + 1;
          if (/^<(?:script|style)(?=[\s>])/i.test(source.slice(start, region.end))) {
            const name = /^<([A-Za-z]+)/.exec(token)![1];
            region.end = RepairRecipeParser.bodyClose(source, region.end, new RegExp(`<\\/${name}\\s*>`, 'gi'))?.end ?? source.length;
          }
        }
      } else {
        const delimiter = token === '<!--' ? '-->' : token === '/%' ? '%/' : token === '/*' ? '*/' : token === '//' ? '\n' : ']]';
        const close = token.startsWith('[') ? RepairRecipeParser.quotedEnd(source, start + token.length, delimiter, 'markup') : source.indexOf(delimiter, start + token.length);
        if (close >= 0) region.end = close + (token === '//' ? 0 : delimiter.length);
      }
      regions.push(region);
      pattern.lastIndex = region.end;
    }
    return regions;
  }

  /** 宏表达式范围供源码追踪复用；script 的范围同时包含完整正文。 */
  public static macroRanges(source: string): Array<TweeRegion & { name: string; expressionStart: number; expressionEnd: number }> {
    return RepairRecipeParser.tweeRegions(source).filter(
      (region): region is TweeRegion & { name: string; expressionStart: number; expressionEnd: number } =>
        region.name !== undefined && region.expressionStart !== undefined && region.expressionEnd !== undefined
    );
  }

  /** 锚点必须唯一，且位于完整语法边界。 */
  public static validateTweeAnchor(source: string, anchor: string, id = 'target'): void {
    const matches = RepairRecipeParser.matches(source, anchor, true);
    const name = RepairRecipeParser.targetName(id);
    if (!matches.length) throw new Error(`TweeReplacer anchor not found: ${name} (found 0, expected 1)`);
    if (matches.length > 1) throw new Error(`TweeReplacer anchor is ambiguous: ${name} (found ${matches.length}, expected 1)`);
    const [start] = matches;
    const end = start + anchor.length;
    const positions = [start, end];
    for (const position of positions) {
      const before = source[position - 1] || '';
      const after = source[position] || '';
      if (
        (/[\p{L}\p{N}_$]/u.test(before) && /[\p{L}\p{N}_$]/u.test(after)) ||
        ['<<', '>>', '[[', ']]', '/*', '*/', '/%', '%/', '\r\n'].includes(before + after) ||
        (/[\uD800-\uDBFF]/.test(before) && /[\uDC00-\uDFFF]/.test(after))
      )
        throw new Error('TweeReplacer anchor splits a source token');
    }
    if (RepairRecipeParser.tweeRegions(source).some(region => positions.some(position => region.start < position && position < region.end)))
      throw new Error('TweeReplacer anchor splits executable markup');
  }

  private static codePath(value: string): boolean {
    if (!/^(?:(?:V|T|C|setup|maplebirch|options|npc)(?:\.[A-Za-z_$][\w$]*){1,8}|(?:\$[A-Za-z_]\w*|_[A-Za-z]\w*)(?:\.[A-Za-z_$][\w$]*){0,8})$/.test(value)) return false;
    return !value.split('.').some((part, index) => ['constructor', 'prototype', '__proto__'].includes(index === 0 ? part.replace(/^[$_]/, '') : part));
  }

  /** 属性保护与路径迁移共用路径限制。 */
  public static propertyGuard(find: string): string | undefined {
    if (!RepairRecipeParser.codePath(find) || find.split('.').length < 3) return;
    return find.replaceAll('.', '?.');
  }

  /** Twee 只标记表达式与 script 正文，保留原文坐标。 */
  private static executableCode(source: string, kind: 'js' | 'twee'): string {
    const code = Array<string>(source.length).fill(' ');
    const ranges =
      kind === 'js'
        ? [{ start: 0, end: source.length }]
        : RepairRecipeParser.macroRanges(source).flatMap(region => {
            if (region.name === 'script') return region.bodyStart !== undefined && region.bodyEnd !== undefined ? [{ start: region.bodyStart, end: region.bodyEnd }] : [];
            return ['if', 'elseif', 'print', '=', 'switch', 'case', 'set', 'run', 'for'].includes(region.name) ? [{ start: region.expressionStart, end: region.expressionEnd }] : [];
          });
    for (const { start, end } of ranges) {
      const fragment = source.slice(start, end);
      const offsets = RepairRecipeParser.codeOffsets(fragment);
      for (let index = 0; index < fragment.length; index++) if (offsets[index]) code[start + index] = fragment[index];
    }
    return code.join('');
  }

  private static completeAccess(source: string, code: string, path: string, start: number): boolean {
    const end = start + path.length;
    return code.slice(start, end) === path && !/[$\p{ID_Continue}.?]/u.test(source[start - 1] || '') && !/[$\p{ID_Continue}.?[`]/u.test(source[end] || '');
  }

  private static *currentCode(context: RepairContext): Generator<{ kind: 'js' | 'twee'; content: string }> {
    for (const target of context.targets) if (target.kind === 'js' || target.kind === 'twee') yield { kind: target.kind, content: target.content };
    for (const source of context.sources || []) if (source.kind === 'js') yield { kind: 'js', content: source.current };
    for (const script of context.scripts || []) for (const excerpt of script.excerpts) yield { kind: 'js', content: excerpt.content };
    for (const passage of context.passages || []) if (passage.current !== undefined) yield { kind: 'twee', content: passage.current };
  }

  /** 目的路径须在本次当前源码中以完整代码访问出现。 */
  private static observedPath(context: RepairContext, path: string): boolean {
    for (const source of RepairRecipeParser.currentCode(context)) {
      const positions = RepairRecipeParser.matches(source.content, path);
      if (!positions.length) continue;
      const code = RepairRecipeParser.executableCode(source.content, source.kind);
      if (positions.some(start => RepairRecipeParser.completeAccess(source.content, code, path, start))) return true;
    }
    return false;
  }

  /** 回放只重查路径目的，不提前验证其他模组尚未执行的锚点。 */
  public static validatePaths(recipe: RepairRecipe, context: RepairContext): boolean {
    const targets = new Map(context.targets.map(target => [target.id, target]));
    let renamed = false;
    for (const operation of recipe.operations) {
      const target = targets.get(operation.targetId);
      if (!target || (target.kind !== 'js' && target.kind !== 'twee') || !RepairRecipeParser.codePath(operation.find) || !RepairRecipeParser.codePath(operation.replace)) continue;
      renamed = true;
      if (!RepairRecipeParser.observedPath(context, operation.replace)) throw new Error('Replacement path is not observed in current source');
    }
    return renamed;
  }

  private static matches(content: string, find: string, overlap = false): number[] {
    const positions: number[] = [];
    if (!find) return positions;
    let position = content.indexOf(find);
    while (position >= 0) {
      positions.push(position);
      position = content.indexOf(find, position + (overlap ? 1 : find.length));
    }
    return positions;
  }

  /** 仅在方案明确请求迁移时，由宿主绑定的既有正文推导。 */
  public static rebase(target: RepairTarget, replace: string): { before: string; after: string } | undefined {
    if (target.kind !== 'twee-replacer') return;
    const binding = NativeJSON.parse(replace) as { findString: string; rebase?: true };
    if (!binding.rebase) return;
    const original = NativeJSON.parse(target.content) as { findString: string };
    const signature = NativeJSON.parse(target.signature || '{}') as { companion?: { replace?: string }; replacement?: string };
    const before = signature.companion?.replace || signature.replacement;
    if (typeof before !== 'string') throw new Error('Bound replacement source unavailable');
    return { before, after: RepairRebase.apply(original.findString, before, binding.findString) };
  }

  private static targetName(id: string): string {
    return /^target-\d+$/.test(id) ? id : 'target';
  }

  private static validateBinding(target: RepairTarget, operation: RepairOperation, context: RepairContext): void {
    if (operation.find !== target.content || operation.expectedMatches !== 1) throw new Error('ReplacePatcher repairs update one complete search binding');
    const [prefix, location, kind, index, field, extra] = target.path.split('|');
    if (
      !['replace', 'replace-addon'].includes(prefix) ||
      !location ||
      (prefix === 'replace-addon' && !/^\d+$/.test(location)) ||
      !['twee', 'js', 'css'].includes(kind) ||
      !/^\d+$/.test(index) ||
      field !== 'binding' ||
      extra !== undefined
    )
      throw new Error('Invalid ReplacePatcher rule');
    const value: unknown = NativeJSON.parse(operation.replace);
    const destination = kind === 'twee' ? 'passageName' : 'fileName';
    if (
      !RepairRecipeParser.object(value) ||
      !RepairRecipeParser.keys(value, [destination, 'from']) ||
      !RepairRecipeParser.text(value[destination], 256) ||
      /[\r\n]/.test(value[destination]) ||
      !RepairRecipeParser.text(value.from, 32000)
    )
      throw new Error('Invalid ReplacePatcher search binding');
    const name = value[destination];
    const anchor = value.from;
    const source = kind === 'twee' ? context.passages?.find(source => source.name === name) : context.sources?.find(source => source.kind === kind && source.name === name);
    if (source?.current === undefined) throw new Error(`ReplacePatcher current source unavailable: ${RepairRecipeParser.targetName(target.id)}`);
    const matches = RepairRecipeParser.matches(source.current, anchor, true);
    if (matches.length !== 1) throw new Error(`ReplacePatcher anchor match count: ${RepairRecipeParser.targetName(target.id)} (found ${matches.length}, expected 1)`);
    if (kind === 'twee') RepairRecipeParser.validateTweeAnchor(source.current, anchor, target.id);
    if (source.excerpts && !source.excerpts.some(excerpt => excerpt.content.includes(anchor))) throw new Error('ReplacePatcher anchor is outside supplied source excerpts');
    const before = NativeJSON.parse(target.content) as Record<string, string>;
    if (before[destination] === value[destination] && before.from === value.from) throw new Error('Unchanged ReplacePatcher search binding');
  }

  /** 校验单条操作和当前源码。 */
  private static validateOperation(target: RepairTarget, operation: RepairOperation, context: RepairContext): void {
    const { find, replace } = operation;
    const name = RepairRecipeParser.targetName(target.id);
    if (!find) throw new Error(`Empty repair search: ${name}`);
    if (find === replace) throw new Error(`Unchanged repair operation: ${name}`);
    const positions = RepairRecipeParser.matches(target.content, find);
    if (positions.length !== operation.expectedMatches) throw new Error(`Repair search match count: ${name} (found ${positions.length}, expected ${operation.expectedMatches})`);
    if (target.kind === 'twee-replacer') {
      if (find !== target.content || operation.expectedMatches !== 1) throw new Error('TweeReplacer repairs update one complete search binding');
      const [prefix, addon, index, extra] = target.path.split('|');
      if (prefix !== 'twee-replacer' || !/^\d+$/.test(addon) || !/^\d+$/.test(index) || extra !== undefined) throw new Error('Invalid TweeReplacer rule');
      const value: unknown = NativeJSON.parse(replace);
      if (
        !RepairRecipeParser.object(value) ||
        !(RepairRecipeParser.keys(value, ['passage', 'findString']) || (RepairRecipeParser.keys(value, ['passage', 'findString', 'rebase']) && value.rebase === true)) ||
        !RepairRecipeParser.text(value.passage, 256) ||
        !RepairRecipeParser.text(value.findString, 32000) ||
        /[\r\n]/.test(value.passage)
      )
        throw new Error('Invalid TweeReplacer search binding');
      if (NativeJSON.stringify({ passage: value.passage, findString: value.findString }) === target.content) throw new Error('Unchanged TweeReplacer search binding');
      RepairRecipeParser.rebase(target, replace);
      const { passage, findString: anchor } = value;
      const source = context.passages?.find(item => item.name === passage);
      const current = source?.current;
      if (current === undefined) throw new Error(`TweeReplacer current source unavailable: ${name}`);
      RepairRecipeParser.validateTweeAnchor(current, anchor, target.id);
      if (source?.excerpts && !source.excerpts.some(excerpt => excerpt.content.includes(anchor))) throw new Error('TweeReplacer anchor is outside supplied source excerpts');
      return;
    }
    if (target.kind === 'replace-patcher' && target.path.endsWith('|binding')) {
      RepairRecipeParser.validateBinding(target, operation, context);
      return;
    }
    if (target.kind === 'patch-anchor' || target.kind === 'replace-patcher') {
      // 这些目标仅是搜索文本或锚点字段，不含规则的替换正文。
      if (!replace || Array.from(replace).some(character => character.charCodeAt(0) < 32 && ![9, 10, 13].includes(character.charCodeAt(0)))) throw new Error('Invalid patch anchor');
      return;
    }
    if (target.kind === 'css') {
      if (!/^[\w\s#.,%()+*/-]+$/.test(replace) || /\/\*|\*\/|\b(?:url|expression)\s*\(/i.test(replace)) throw new Error('CSS repair must be a local declaration value');
      for (const start of positions) {
        const boundary = Math.max(target.content.lastIndexOf('{', start), target.content.lastIndexOf('}', start), target.content.lastIndexOf(';', start));
        const colon = target.content.indexOf(':', boundary + 1);
        const endCandidates = [target.content.indexOf(';', start), target.content.indexOf('}', start)].filter(value => value >= 0);
        const end = endCandidates.length ? Math.min(...endCandidates) : -1;
        if (colon < 0 || colon >= start || end < start + find.length) throw new Error('CSS repair is outside a declaration value');
        const value = target.content
          .slice(colon + 1, end)
          .split(find)
          .join(replace);
        if (/[<>@\\]|\b(?:url|expression)\s*\(|(?:javascript|https?)\s*:/i.test(value)) throw new Error('CSS repair cannot load or execute content');
      }
      return;
    }
    const guard = RepairRecipeParser.propertyGuard(find);
    const rename = RepairRecipeParser.codePath(find) && RepairRecipeParser.codePath(replace);
    if (replace === guard || rename) {
      const code = RepairRecipeParser.executableCode(target.content, target.kind);
      for (const start of positions) {
        const end = start + find.length;
        if (!RepairRecipeParser.completeAccess(target.content, code, find, start)) throw new Error(`${rename ? 'Repair path' : 'Property guard'} is not a complete code access`);
        if (rename) continue;
        const following = code.slice(end).trimStart();
        const preceding = code
          .slice(0, start)
          .replace(/(?:\(\s*)+$/, '')
          .trimEnd();
        if (/^[\]})\s]*(?:=(?!=|>)|(?:\*\*|&&|\|\||\?\?|[+\-*/%&|^])=|\+\+|--|(?:to|range|of|in)\b)/.test(following) || /(?:\bnew|\+\+|--|\[|:|,)\s*$/.test(preceding))
          throw new Error('Property guard cannot modify a write or constructor');
        if (/^(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*(?:\n|$))*`/.test(target.content.slice(end))) throw new Error('Property guard cannot modify a tagged template');
      }
      if (rename && !RepairRecipeParser.observedPath(context, replace)) throw new Error('Replacement path is not observed in current source');
      return;
    }
    if (target.kind !== 'twee') throw new Error('JS repair requires a framework property guard');
    if (/[<>[\]{}$&`\\]|_[A-Za-z]/.test(find + replace)) throw new Error('Twee repair must be plain text or a framework property guard');
    const blocked = /<<script(?:\s[^>]*)?>>[\s\S]*?(?:<<\/script>>|$)|<<[\s\S]*?>>|<(?:script|style)\b[\s\S]*?(?:<\/(?:script|style)\s*>|$)|<[^>]*>|\[\[[\s\S]*?\]\]/gi;
    for (const region of target.content.matchAll(blocked)) {
      if (positions.some(start => start < region.index + region[0].length && start + find.length > region.index)) throw new Error('Twee text repair overlaps executable markup');
    }
  }

  /** 筛选操作前，先校验全部结构和绑定。 */
  private static read(json: string, context: RepairContext): { recipe: RepairRecipe; targets: Map<string, RepairTarget> } {
    if (json.length > RepairRecipeParser.MAX_LENGTH) throw new Error('Recipe exceeds size limit');
    const recipe: unknown = NativeJSON.parse(json);
    if (!RepairRecipeParser.object(recipe) || !RepairRecipeParser.keys(recipe, ['requestId', 'outcome', 'summary', 'evidence', 'operations'])) throw new Error('Invalid recipe fields');
    if (recipe.requestId !== context.requestId || !['repair', 'insufficient-context'].includes(String(recipe.outcome))) throw new Error('Invalid recipe identity');
    if (!RepairRecipeParser.text(recipe.summary, 2000) || !Array.isArray(recipe.evidence) || recipe.evidence.length > 16 || !recipe.evidence.every(item => RepairRecipeParser.text(item, 2000)))
      throw new Error('Invalid recipe explanation');
    if (!Array.isArray(recipe.operations) || recipe.operations.length > 16 || (recipe.outcome === 'repair' ? !recipe.operations.length : !!recipe.operations.length))
      throw new Error('Invalid recipe operations');
    const targets = new Map(context.targets.map(target => [target.id, target]));
    if (targets.size !== context.targets.length) throw new Error('Duplicate context targets');
    const seen = new Set<string>();
    for (const operation of recipe.operations) {
      if (!RepairRecipeParser.object(operation) || !RepairRecipeParser.keys(operation, ['targetId', 'find', 'replace', 'expectedMatches', 'reason'])) throw new Error('Invalid operation fields');
      if (
        !RepairRecipeParser.text(operation.targetId, 200) ||
        !RepairRecipeParser.text(operation.find, 32000) ||
        typeof operation.replace !== 'string' ||
        operation.replace.length > 32000 ||
        !RepairRecipeParser.text(operation.reason, 2000)
      )
        throw new Error('Invalid operation text');
      const target = targets.get(operation.targetId);
      if (!target || !/^sha256:[a-f0-9]{64}$/.test(target.fingerprint)) throw new Error('Unknown or unbound target');
      // 每个目标仅允许一次修改，确保匹配计数独立、审核明确。
      if (seen.has(target.id)) throw new Error('Duplicate operation target');
      seen.add(target.id);
      if (!Number.isSafeInteger(operation.expectedMatches) || Number(operation.expectedMatches) < 1 || Number(operation.expectedMatches) > 32) throw new Error('Invalid match count');
    }
    return { recipe: recipe as unknown as RepairRecipe, targets };
  }

  /** 分析允许筛选失败项；存储和回放严格校验。 */
  private static inspect(json: string, context: RepairContext, partial: boolean): { recipe: RepairRecipe; rejected: Array<{ targetId: string; reason: string }> } {
    const { recipe, targets } = RepairRecipeParser.read(json, context);
    const operations: RepairOperation[] = [];
    const rejected: Array<{ targetId: string; reason: string }> = [];
    for (const operation of recipe.operations) {
      try {
        RepairRecipeParser.validateOperation(targets.get(operation.targetId)!, operation, context);
        operations.push(operation);
      } catch (error) {
        if (!partial) throw error;
        const reason = error instanceof SyntaxError ? 'Invalid repair binding JSON' : error instanceof Error ? error.message : 'Repair validation failed';
        rejected.push({ targetId: RepairRecipeParser.targetName(operation.targetId), reason });
      }
    }
    if (rejected.length && !operations.length) throw new Error(`${rejected[0].targetId}: ${rejected[0].reason}`);
    return { recipe: { ...recipe, operations }, rejected };
  }

  /** 严格解析存储和回放方案。 */
  public static parse(json: string, context: RepairContext): RepairRecipe {
    return RepairRecipeParser.inspect(json, context, false).recipe;
  }

  /** 分析保留通过项，校验失败原因不写入配方。 */
  public static review(json: string, context: RepairContext): { recipe: RepairRecipe; rejected: Array<{ targetId: string; reason: string }> } {
    return RepairRecipeParser.inspect(json, context, true);
  }

  public static async fingerprint(content: string): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
    return `sha256:${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}`;
  }
}
