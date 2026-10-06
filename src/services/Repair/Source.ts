// ./src/services/Repair/Source.ts

import type ModLoader from '../../host/ModLoader';
import { RepairTargets } from './Targets';
import { RepairRecipeParser, type RepairContext } from './Recipe';

export type RepairSource = ReturnType<ModLoader['modSC2DataManager']['getSC2DataInfoAfterPatch']>;

type SourceDeclaration = { name: string; start: number; end: number; callable: boolean; file: number };

type ScriptSource = { name: string; content: string; code: string; declarations: SourceDeclaration[] };

type ScriptEvidence = NonNullable<RepairContext['scripts']>[number];

export class RepairSources {
  public static hasReplaceFailure(messages: string[]): boolean {
    return messages.some(message =>
      /\[ReplacePatcher\] patchInReplaceParamsItem(?:Twee)?\(\) patch\[[^\]\r\n]+\] cannot find (?:file|passageName|'from'):|applyReplacePatcher\(\) (?:js|css|passage) replace 0:/.test(message)
    );
  }

  public static replaceRuleFailed(messages: string[], modName: string, kind: 'twee' | 'js' | 'css', rule: { from: string; fileName?: string; passageName?: string }): boolean {
    const passage = kind === 'twee';
    const destination = passage ? rule.passageName : rule.fileName;
    if (!destination) return false;
    const prefix = `[ReplacePatcher] ${passage ? 'patchInReplaceParamsItemTwee' : 'patchInReplaceParamsItem'}() patch[${modName}]`;
    const core = `applyReplacePatcher() ${passage ? 'passage' : kind} replace 0: in [${destination}] of [${rule.from}] positions []`;
    return messages.some(
      message =>
        message.endsWith(`${prefix} cannot find ${passage ? 'passageName' : 'file'}: ${destination}`) ||
        message.endsWith(`${prefix} cannot find 'from': ${rule.from} in:${destination}`) ||
        message.endsWith(core)
    );
  }

  /** 缺失文件只提供唯一字面匹配的已加载源码，不猜测文件别名。 */
  public static replaceSources(source: RepairSource | undefined, kind: 'js' | 'css', path: string, find: string): Array<{ name: string; kind: 'js' | 'css'; current: string }> {
    const records = kind === 'js' ? source?.scriptFileItems : source?.styleFileItems;
    const entries = records?.map instanceof Map ? records.map : new Map((records?.items || []).map(item => [item.name, item]));
    const basename = (name: string) => name.split(/[\\/]/).at(-1);
    const named = [...entries].filter(([name]) => name === path || basename(name) === path);
    const exact = entries.get(path);
    if (exact && typeof exact.content === 'string') return [{ name: path, kind, current: exact.content }];
    if (named.length === 1 && typeof named[0][1].content === 'string') return [{ name: named[0][0], kind, current: named[0][1].content }];
    if (named.length || !find) return [];
    let remaining = 16000000;
    const candidates: Array<{ name: string; kind: 'js' | 'css'; current: string }> = [];
    for (const [name, item] of entries) {
      if (typeof item.content !== 'string') continue;
      remaining -= item.content.length;
      if (remaining < 0) return [];
      const index = item.content.indexOf(find);
      if (index < 0) continue;
      if (candidates.length || item.content.indexOf(find, index + 1) >= 0) return [];
      candidates.push({ name, kind, current: item.content });
    }
    return candidates;
  }

  /** 仅收集相关原生规则的定义，顺序只在同一补丁器阶段和目标内比较。 */
  public static relatedRules(host: ModLoader, related: (kind: 'twee' | 'js' | 'css', path: string) => boolean): NonNullable<RepairContext['relatedRules']> {
    const rules: NonNullable<RepairContext['relatedRules']> = [];
    let mods = RepairTargets.loadedMods(host);
    let mainOrdered = false;
    try {
      const loader = host.modLoader;
      if (typeof loader?.getModCacheOneArray === 'function') {
        mods = loader.getModCacheOneArray().map(entry => entry.mod);
        mainOrdered = true;
      }
    } catch (error) {
      host.diagnostics.write('Repair native patch order unavailable', 'WARN', 'repair', error);
    }
    const orders = new Map<string, number>();
    for (const mod of mods)
      for (const patcher of mod.replacePatcher || [])
        for (const kind of ['js', 'css', 'twee'] as const) {
          const index = patcher.patchInfoMap?.[kind];
          const nativeIndex = index instanceof Map;
          const groups = nativeIndex ? [...index] : (patcher.patchInfo[kind] || []).map(rule => [kind === 'twee' ? rule.passageName : rule.fileName, [rule]] as const);
          for (const [destination, definitions] of groups)
            for (const rule of definitions) {
              if (typeof destination !== 'string' || !destination || typeof rule.from !== 'string' || !rule.from || typeof rule.to !== 'string') continue;
              const key = `replace-patcher\0${kind}\0${destination}`;
              const order = (orders.get(key) || 0) + 1;
              orders.set(key, order);
              if (related(kind, destination))
                rules.push({ modName: mod.name, patcher: 'replace-patcher', kind, destination, find: rule.from, replace: rule.to, ...(mainOrdered && nativeIndex && { order }) });
            }
        }
    for (const { modName, kind, rule, addon } of RepairTargets.replaceRules(host)) {
      if (!addon) continue;
      const destination = RepairTargets.replacePath(rule, kind);
      if (!destination || !rule.from || typeof rule.to !== 'string' || !related(kind, destination)) continue;
      rules.push({ modName, patcher: 'replace-addon', kind, destination, find: rule.from, replace: rule.to });
    }
    const standalone = RepairTargets.tweeReplacer(host)?.isLinkerMode === false;
    for (const { mod, rule } of RepairTargets.tweeRules(host)) {
      const key = `twee-replacer\0twee\0${rule.passage}`;
      const order = (orders.get(key) || 0) + 1;
      orders.set(key, order);
      if (related('twee', rule.passage))
        rules.push({
          modName: mod.name,
          patcher: 'twee-replacer',
          kind: 'twee',
          destination: rule.passage,
          find: rule.findString!,
          replace: RepairTargets.replacement(rule)!,
          ...(standalone && { order })
        });
    }
    return rules;
  }

  /** 显示截短和脱敏前，使用完整日志选择相关源码。 */
  public static diagnosticMessages(host: ModLoader): string[] {
    const messages: Array<{ error: boolean; message: string }> = [];
    for (const record of host.diagnostics.history.filter(record => record.level === 'ERROR' || record.level === 'WARN').slice(-30))
      messages.push({ error: record.level === 'ERROR', message: record.message + (record.data instanceof Error ? `\n${record.data.stack || record.data.message}` : '') });
    for (const record of (host.modLoaderGui.gLoadingProgress?.logList || []).filter(record => record.type === 'warning' || record.type === 'error').slice(-40))
      messages.push({ error: record.type === 'error', message: record.str });
    for (const patch of host.diagnostics.patches.slice(-30)) if (patch.status !== 'applied') messages.push({ error: true, message: `${patch.target}\n${patch.pattern}\n${patch.error || ''}` });
    return messages
      .reverse()
      .sort((left, right) => Number(right.error) - Number(left.error))
      .map(record => record.message);
  }

  /** 在打补丁前快照：运行时读取可能从已修改的 DOM 重建原始缓存。 */
  public static captureOriginalPassages(host: ModLoader, extraNames: string[] = []): Map<string, string> {
    const snapshot = new Map<string, string>();
    try {
      const source = host.modSC2DataManager.getSC2DataInfoCache();
      const passages = source.passageDataItems.map;
      const names = new Set(RepairSources.passageNames(RepairSources.diagnosticMessages(host), passages.keys()));
      for (const mod of RepairTargets.loadedMods(host)) {
        for (const patcher of mod.replacePatcher || []) for (const rule of patcher.patchInfo.twee || []) if (typeof rule.passageName === 'string') names.add(rule.passageName);
      }
      // 快照只需要规则的段落名，无修复记忆时无需解压替换正文。
      for (const { mod } of RepairTargets.tweeReplacer(host)?.info.values() || []) {
        const entry = mod.bootJson.addonPlugin?.find(addon => addon.modName === 'TweeReplacer' && addon.addonName === 'TweeReplacerAddon');
        if (Array.isArray(entry?.params)) for (const rule of entry.params) if (typeof rule?.passage === 'string') names.add(rule.passage);
      }
      extraNames.forEach(name => names.add(name));
      let remaining = 256000;
      for (const name of names) {
        const content = passages.get(name)?.content;
        if (typeof content !== 'string' || content.length > 64000 || content.length > remaining) continue;
        snapshot.set(name, content);
        remaining -= content.length;
      }
    } catch (error) {
      host.diagnostics.write('Repair original passage snapshot unavailable', 'WARN', 'repair', error);
    }
    return snapshot;
  }

  private static readonly NAME_CHARACTER = /[\p{L}\p{N}_./\\-]/u;

  /** 文件名或段落标题须在日志中完整出现，不匹配其他名称的子串。 */
  public static sourceMentioned(message: string, name: string): boolean {
    if (!name) return false;
    let index = message.indexOf(name);
    while (index >= 0) {
      if (!RepairSources.NAME_CHARACTER.test(message[index - 1] || '') && !RepairSources.NAME_CHARACTER.test(message[index + name.length] || '')) return true;
      index = message.indexOf(name, index + name.length);
    }
    return false;
  }

  /** 从完整日志选取精确的已知标题和明确标注的 SugarCube 段落名。 */
  public static passageNames(messages: string[], known: Iterable<string>): string[] {
    const candidates = [...new Set(known)].filter(Boolean).sort((left, right) => right.length - left.length);
    const selected = new Set<string>();
    for (const message of messages) {
      const explicit = [
        ...message.matchAll(/\(\s*::\s*([^\n)]+?)\s*\)/g),
        ...message.matchAll(/\bin\s*:?\s*\[([^\]\r\n]+)\]/g),
        ...message.matchAll(/cannot find passage:\s*\[[^\]\r\n]*\]\s*\[([^\]\r\n]+)\]/g)
      ];
      if (explicit.length) {
        explicit.forEach(match => selected.add(match[1].trim()));
        continue;
      }
      // 其他插件消息可能是模组名或规则正文，并非段落位置。
      if (message.includes('[TweeReplacer]')) continue;
      const spans: Array<[number, number]> = [];
      for (const name of candidates) {
        let index = message.indexOf(name);
        while (index >= 0) {
          const end = index + name.length;
          if (
            !RepairSources.NAME_CHARACTER.test(message[index - 1] || '') &&
            !RepairSources.NAME_CHARACTER.test(message[end] || '') &&
            !spans.some(([start, finish]) => index >= start && end <= finish)
          ) {
            spans.push([index, end]);
            selected.add(name);
            break;
          }
          index = message.indexOf(name, end);
        }
      }
    }
    return [...selected];
  }

  /** 仅保留代码位置，静态检索不把字符串或注释当成声明或调用。 */
  private static code(source: string): string {
    const offsets = RepairRecipeParser.codeOffsets(source);
    return source.replace(/[^\r\n]/g, (character, index) => (offsets[index] ? character : ' '));
  }

  /** 限制声明附近的扫描范围。 */
  private static declarationEnd(code: string, start: number): number {
    const limit = Math.min(code.length, start + 8000);
    let depth = 0;
    let body = false;
    for (let index = start; index < limit; index++) {
      if (code[index] === '{') {
        body = true;
        depth++;
      } else if (code[index] === '}' && body && --depth === 0) return index + 1;
      else if (!body && code[index] === ';') return index + 1;
    }
    return limit;
  }

  /** 复用字面量标记寻找宏结束位置，字符串中的 >> 不截断表达式。 */
  private static expressions(content: string): string[] {
    const expressions: string[] = [];
    for (const range of RepairRecipeParser.macroRanges(content)) {
      if (!['script', 'set', 'run', 'if', 'elseif', 'print', '=', 'for', 'switch', 'case'].includes(range.name)) continue;
      if (range.name === 'script') {
        if (range.bodyStart !== undefined && range.bodyEnd !== undefined) expressions.push(RepairSources.code(content.slice(range.bodyStart, range.bodyEnd)));
      } else expressions.push(RepairSources.code(content.slice(range.expressionStart, range.expressionEnd)));
    }
    return expressions;
  }

  /** 展开有限层数的字面 widget 和 include，并收集日志与表达式中的函数名。 */
  private static traceWidgets(source: RepairSource | undefined, messages: string[], passageNames: Iterable<string>): { passages: Set<string>; symbols: Set<string>; reported: Set<string> } {
    const passages = new Set<string>();
    const macros = new Set<string>();
    const symbols = new Set<string>();
    const addPassage = (name: string) => {
      if (!name || name.length > 256 || (!passages.has(name) && passages.size >= 16)) return false;
      passages.add(name);
      return true;
    };
    const addSymbol = (name: string) => {
      if (name.length <= 128 && symbols.size < 32 && !['if', 'for', 'while', 'switch', 'catch', 'function'].includes(name)) symbols.add(name);
    };
    const addMacro = (name: string) => {
      if (name.length <= 128 && macros.size < 32) macros.add(name);
    };
    for (const name of passageNames) addPassage(name);
    for (const message of messages) {
      for (const match of message.matchAll(/<<\s*([A-Za-z_][\w-]*)(?=[\s>])/g)) addMacro(match[1]);
      for (const match of message.matchAll(/\bat\s+(?:async\s+)?(?:new\s+)?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)(?=\s*(?:\(|[)>]|$))|\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)@/gm))
        addSymbol((match[1] || match[2]).split('.').at(-1)!);
    }
    const reported = new Set(symbols);
    const currentPassages = source?.passageDataItems;
    const passageMap = currentPassages?.map instanceof Map ? currentPassages.map : new Map((currentPassages?.items || []).map(passage => [passage.name, passage]));
    const widgets = new Map<string, Array<{ passage: string; body: string }>>();
    const cleanTwee = (content: string) => content.replace(/\/%[\s\S]*?(?:%\/|$)|<!--[\s\S]*?(?:-->|$)/g, '');
    let passageBudget = 16000000;
    for (const [name, passage] of passageMap) {
      if (typeof passage.content !== 'string' || passage.content.length > passageBudget) continue;
      passageBudget -= passage.content.length;
      const content = cleanTwee(passage.content);
      for (const match of content.matchAll(/<<\s*widget\s+(?:"([^"\r\n]+)"|'([^'\r\n]+)')[^>]*>>([\s\S]*?)<<\s*\/widget\s*>>/g)) {
        const symbol = match[1] || match[2];
        if (symbol.length > 128) continue;
        const definitions = widgets.get(symbol) || [];
        if (definitions.length < 16) definitions.push({ passage: name, body: match[3] });
        widgets.set(symbol, definitions);
      }
    }
    let fragments = [...passages].map(name => passageMap.get(name)?.content).filter((content): content is string => typeof content === 'string' && content.length <= 64000);
    const expanded = new Set<string>();
    const included = new Set(passages);
    for (let round = 0; round < 4 && (fragments.length || macros.size > expanded.size); round++) {
      const next: string[] = [];
      for (const fragment of fragments) {
        const content = cleanTwee(fragment);
        for (const match of content.matchAll(/<<\s*([A-Za-z_][\w-]*)(?=[\s>])/g)) addMacro(match[1]);
        for (const match of content.matchAll(/<<\s*include\s+(?:"([^"\r\n]+)"|'([^'\r\n]+)')\s*>>/g)) {
          const name = match[1] || match[2];
          const body = passageMap.get(name)?.content;
          if (typeof body === 'string' && body.length <= 64000 && !included.has(name) && addPassage(name)) {
            included.add(name);
            next.push(body);
          }
        }
        for (const expression of RepairSources.expressions(content)) for (const call of expression.matchAll(/(?<![\w$])([A-Za-z_$][\w$]*)\s*\(/g)) addSymbol(call[1]);
      }
      for (const macro of macros) {
        if (expanded.has(macro)) continue;
        expanded.add(macro);
        for (const widget of widgets.get(macro) || []) if (addPassage(widget.passage)) next.push(widget.body.slice(0, 64000));
      }
      fragments = next;
    }
    return { passages, symbols, reported };
  }

  /** 当前脚本索引受扫描量、文件数和声明数限制。 */
  private static scriptIndex(source: RepairSource | undefined, symbols: ReadonlySet<string>): { files: ScriptSource[]; definitions: Map<string, SourceDeclaration[]> } {
    const files: ScriptSource[] = [];
    const definitions = new Map<string, SourceDeclaration[]>();
    const currentScripts = source?.scriptFileItems;
    const scriptItems = currentScripts?.map instanceof Map ? currentScripts.map.values() : currentScripts?.items || [];
    let scriptBudget = 32000000;
    let indexed = 0;
    for (const script of scriptItems) {
      if (files.length >= 256 || typeof script.name !== 'string' || typeof script.content !== 'string' || script.content.length > scriptBudget) continue;
      scriptBudget -= script.content.length;
      const file = files.length;
      const code = RepairSources.code(script.content);
      const declarations: SourceDeclaration[] = [];
      // 支持命名函数、赋值函数、箭头函数和对象或类方法，不求值属性或参数。
      const pattern =
        /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(|\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=|([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*[:=]\s*(?:async\s+)?(?:function\b|(?:\([^;{}]*?\)|[A-Za-z_$][\w$]*)\s*=>)|(?:^|[;{},])\s*(?:(?:async|static)\s+)*([A-Za-z_$][\w$]*)\s*\([^;{}]*?\)\s*\{/g;
      for (const match of code.matchAll(pattern)) {
        const name = (match[1] || match[2] || match[3] || match[4]).split('.').at(-1)!.trim();
        if (name.length > 128 || ['if', 'for', 'while', 'switch', 'catch'].includes(name) || (indexed >= 16000 && !symbols.has(name))) continue;
        const locations = definitions.get(name) || [];
        if (locations.length >= 16) continue;
        const callable = !match[2] || /^\s*(?:async\s+)?(?:function\b|(?:\([^;{}]*?\)|[A-Za-z_$][\w$]*)\s*=>)/.test(code.slice(match.index + match[0].length, match.index + match[0].length + 512));
        const declaration = { name, start: match.index, end: RepairSources.declarationEnd(code, match.index), callable, file };
        declarations.push(declaration);
        locations.push(declaration);
        definitions.set(name, locations);
        indexed++;
      }
      files.push({ name: script.name, content: script.content, code, declarations });
    }
    return { files, definitions };
  }

  /** 从直接符号扩展唯一静态调用者与源码常量，不推测同名声明的归属。 */
  private static selectDeclarations(files: ScriptSource[], definitions: ReadonlyMap<string, SourceDeclaration[]>, symbols: Set<string>, reported: ReadonlySet<string>): Set<SourceDeclaration> {
    const selected = new Set<SourceDeclaration>();
    for (const symbol of symbols) {
      const declarations = definitions.get(symbol) || [];
      // 未出现在栈中的通用函数名不能确定归属，保留其 widget 源码作为依据。
      if (!reported.has(symbol) && declarations.length !== 1) continue;
      declarations.forEach(declaration => selected.add(declaration));
    }
    // 只有唯一函数声明才扩展静态调用者；同名函数不能据此确认调用关系。
    const roots = [...selected].filter(declaration => declaration.callable && definitions.get(declaration.name)?.length === 1 && (!reported.size || reported.has(declaration.name)));
    if (roots.length) {
      const names = roots.map(root => root.name.replaceAll('$', '\\$')).join('|');
      const call = new RegExp(`(?<![\\w$])(?:${names})\\s*\\(`);
      for (const file of files)
        for (const declaration of file.declarations) {
          if (!declaration.callable || selected.has(declaration) || definitions.get(declaration.name)?.length !== 1 || symbols.size >= 32) continue;
          if (call.test(file.code.slice(declaration.start + 1, declaration.end))) {
            symbols.add(declaration.name);
            selected.add(declaration);
          }
        }
    }
    // 唯一函数正文引用的局部源码常量可解释缺失配置，不展开运行时对象。
    for (const declaration of selected) {
      if (!declaration.callable || definitions.get(declaration.name)?.length !== 1) continue;
      const code = files[declaration.file].code.slice(declaration.start, declaration.end);
      for (const match of code.matchAll(/(?<![\w$])[A-Za-z_$][\w$]*/g)) {
        const candidates = definitions.get(match[0]);
        if (symbols.size >= 32 || candidates?.length !== 1 || candidates[0].callable || candidates[0].file !== declaration.file || /\.\s*$/.test(code.slice(0, match.index))) continue;
        const owner = files[declaration.file].declarations.find(candidate => candidate.callable && candidates[0].start > candidate.start && candidates[0].end <= candidate.end);
        if (owner && owner !== declaration) continue;
        symbols.add(match[0]);
        selected.add(candidates[0]);
      }
    }
    return selected;
  }

  /** 片段保留真实行列位置。 */
  private static scriptExcerpts(files: ScriptSource[], selected: ReadonlySet<SourceDeclaration>, reported: ReadonlySet<string>): ScriptEvidence[] {
    const scripts: ScriptEvidence[] = [];
    // 报错直接指向的声明优先，避免通用 render/reset 等引用挤掉真正的失败位置。
    const priority = new Set([...selected].filter(declaration => reported.has(declaration.name)).map(declaration => declaration.file));
    const ordered = [...files.entries()].sort(([left], [right]) => Number(priority.has(right)) - Number(priority.has(left)));
    for (const [index, file] of ordered) {
      if (scripts.length >= 8) break;
      const declarations = [...selected].filter(declaration => declaration.file === index);
      if (!declarations.length) continue;
      const excerpts: ScriptEvidence['excerpts'] = [];
      const ranges: Array<[number, number]> = [];
      let remaining = 4000;
      for (const declaration of declarations) {
        let start = Math.max(0, declaration.start - 200);
        const lineStart = file.content.lastIndexOf('\n', declaration.start) + 1;
        if (lineStart >= start) start = lineStart;
        const end = Math.min(file.content.length, declaration.end + 200, start + 1500, start + remaining);
        if (ranges.some(([from, to]) => declaration.start >= from && declaration.end <= to) || end <= declaration.start) continue;
        const content = file.content.slice(start, end);
        const column = start - file.content.lastIndexOf('\n', start - 1);
        excerpts.push({ line: file.content.slice(0, start).split('\n').length, ...(column > 1 && { column }), content });
        ranges.push([start, end]);
        remaining -= content.length;
      }
      if (excerpts.length)
        scripts.push({
          name: file.name,
          symbols: [...new Set(declarations.filter(declaration => ranges.some(([start, end]) => declaration.start >= start && declaration.start < end)).map(declaration => declaration.name))],
          excerpts
        });
    }
    return scripts;
  }

  /** 从当前缓存推导少量静态引用，不表示这些源码已经在报错时执行。 */
  public static trace(source: RepairSource | undefined, messages: string[], passageNames: Iterable<string>): { passages: string[]; scripts: ScriptEvidence[] } {
    const { passages, symbols, reported } = RepairSources.traceWidgets(source, messages, passageNames);
    if (!symbols.size) return { passages: [...passages], scripts: [] };
    const { files, definitions } = RepairSources.scriptIndex(source, symbols);
    const selected = RepairSources.selectDeclarations(files, definitions, symbols, reported);
    return { passages: [...passages], scripts: RepairSources.scriptExcerpts(files, selected, reported) };
  }

  /** 字面匹配可能改名的段落。 */
  public static passageCandidates(source: RepairSource | undefined, find: string): string[] {
    if (!source || !find) return [];
    const names: string[] = [];
    for (const [name, passage] of source.passageDataItems.map) {
      if (!passage.content.includes(find)) continue;
      names.push(name);
      // 匹配过宽时，不作为段落改名的精确证据。
      if (names.length > 3) return [];
    }
    return names;
  }

  /** 用失败搜索中的唯一字面片段定位附近源码，不进行模糊替换或推断执行顺序。 */
  public static passageExcerpts(source: string, searches: string[]): NonNullable<NonNullable<RepairContext['passages']>[number]['excerpts']> | undefined {
    if (source.length > 256000) return;
    const ranges: Array<{ start: number; end: number }> = [];
    for (const search of searches.slice(0, 16)) {
      const lines = search
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length >= 16);
      const needles = [...new Set(lines.slice(0, 8).flatMap(line => [line.slice(0, 80), line.slice(-80), line.slice(Math.max(0, Math.floor(line.length / 2) - 40), Math.floor(line.length / 2) + 40)]))]
        .filter(needle => needle.length >= 16)
        .sort((left, right) => right.length - left.length);
      const needle = needles.find(needle => {
        const position = source.indexOf(needle);
        return position >= 0 && source.indexOf(needle, position + 1) < 0;
      });
      if (!needle) continue;
      const position = source.indexOf(needle);
      if (ranges.some(range => range.start <= position && position + needle.length <= range.end)) continue;
      let start = Math.max(0, position - 512);
      const lineStart = source.lastIndexOf('\n', start - 1) + 1;
      if (start - lineStart <= 256) start = lineStart;
      const end = Math.min(source.length, position + needle.length + 2000);
      ranges.push({ start, end });
      if (ranges.length === 4) break;
    }
    if (!ranges.length) return;
    ranges.sort((left, right) => left.start - right.start);
    const merged: Array<{ offset: number; content: string }> = [];
    for (const range of ranges) {
      const previous = merged.at(-1);
      if (previous && previous.offset + previous.content.length >= range.start) previous.content = source.slice(previous.offset, Math.max(previous.offset + previous.content.length, range.end));
      else merged.push({ offset: range.start, content: source.slice(range.start, range.end) });
    }
    return merged;
  }
}
