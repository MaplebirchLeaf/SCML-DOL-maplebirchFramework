// ./src/services/Repair/Agent.ts

import { RepairTargets } from './Targets';
import { NativeJSON } from './Json';
import type ModLoader from '../../host/ModLoader';
import { RepairConnection, type RepairConnectionInput, type ConnectionResult } from './Connection';
import { RepairPrompt } from './Prompt';
import { RepairRecipeParser, type RepairContext, type RepairRecipe, type RepairTarget } from './Recipe';
import { RepairSources, type RepairSource } from './Source';
import type { ModInfo } from '@scml/types/sugarcube-2-ModLoader/ModLoader';

export class RepairAgent {
  private static readonly CONTEXT_LIMIT = RepairPrompt.MAX_LENGTH - 32000;

  private static *patchRules(modName: string, patcher: ModInfo['replacePatcher'][number]) {
    for (const kind of ['twee', 'js', 'css'] as const) {
      for (const [index, rule] of (patcher.patchInfo[kind] || []).entries()) yield { modName, patcher, kind, index, rule };
    }
  }

  private static *replaceRules(mods: ModInfo[]) {
    for (const mod of mods) {
      for (const patcher of mod.replacePatcher || []) yield* RepairAgent.patchRules(mod.name, patcher);
    }
  }

  private static tweeRuleFailed(messages: string[], modName: string, rule: { passage: string; findString?: string }): boolean {
    return messages.some(
      message =>
        message.includes(`[TweeReplacer] do_patch() cannot find passage: [${modName}] [${rule.passage}]`) ||
        message.includes(`[TweeReplacer] do_patch() cannot find findString: [${modName}] findString:[${rule.findString}] in:[${rule.passage}]`)
    );
  }

  public static async context(host: ModLoader, apiKey: string, anchorTargets: RepairTarget[] = [], originals: ReadonlyMap<string, string> = new Map()): Promise<RepairContext> {
    const redact = (value: string) => (apiKey ? value.split(apiKey).join('[REDACTED]') : value).replace(/Bearer\s+\S+|\bsk-[\w-]+/gi, '[REDACTED]');
    const logs = host.diagnostics.history.filter(record => record.level === 'ERROR' || record.level === 'WARN').slice(-60);
    const diagnostics = logs.map(record => ({
      at: record.at,
      level: record.level,
      scope: record.scope && redact(record.scope).slice(0, 200),
      message: redact(record.message + (record.data instanceof Error ? `\n${record.data.stack || record.data.message}` : '')).slice(0, 2000)
    }));
    const modLoaderLogs = (host.modLoaderGui.gLoadingProgress?.logList || [])
      .filter(record => record.type === 'warning' || record.type === 'error')
      .slice(-80)
      .map(record => ({ at: record.time?.toISOString(), level: record.type === 'error' ? ('ERROR' as const) : ('WARN' as const), message: redact(record.str).slice(0, 2000) }));
    const patches = host.diagnostics.patches.slice(-60).map(({ target, pattern, status, matches, expected, applied, error }) => ({
      target: redact(target).slice(0, 256),
      pattern: redact(pattern).slice(0, 256),
      status,
      matches,
      expected,
      applied,
      ...(error && { error: redact(error).slice(0, 2000) })
    }));
    const names = (values: string[]) => values.slice(-8).map(value => redact(value).slice(0, 200));
    const conflicts = (host.diagnostics.conflicts || []).slice(-10).map(conflict => ({
      source: redact(conflict.source).slice(0, 200),
      dataSource: redact(conflict.dataSource).slice(0, 200),
      passages: names(conflict.passages),
      scripts: names(conflict.scripts),
      styles: names(conflict.styles)
    }));
    const mods = RepairTargets.loadedMods(host);
    const context: RepairContext = {
      requestId: crypto.randomUUID(),
      mods: mods.map(mod => redact(mod.name).slice(0, 200)),
      diagnostics,
      modLoaderLogs,
      patches,
      conflicts,
      targets: []
    };
    // 日志含大量转义字符时，仍为源码保留空间。
    while (RepairPrompt.content(context).length > 320000) {
      const lists = [context.diagnostics, context.modLoaderLogs, context.patches, context.conflicts, context.mods];
      const largest = lists.reduce((left, right) => (NativeJSON.stringify(left).length > NativeJSON.stringify(right).length ? left : right));
      largest.shift();
    }
    // 显示日志截短前，先从完整日志解析名称。
    const messages = RepairSources.diagnosticMessages(host);
    let current: RepairSource | undefined;
    try {
      current = host.modSC2DataManager.getSC2DataInfoAfterPatch();
    } catch (error) {
      host.diagnostics.write('Repair current source unavailable', 'WARN', 'repair', error);
    }
    await RepairTargets.prepareRules(host);
    const allRules = RepairTargets.tweeRules(host);
    const knownPassages = new Set([
      ...(current?.passageDataItems.map.keys() || []),
      ...originals.keys(),
      ...mods.flatMap(mod => mod.cache.passageDataItems.items.map(item => item.name)),
      ...allRules.map(({ rule }) => rule.passage),
      ...mods.flatMap(mod => (mod.replacePatcher || []).flatMap(patcher => (patcher.patchInfo.twee || []).map(rule => rule.passageName || ''))),
      ...anchorTargets.map(target => target.reference || '')
    ]);
    const trace = RepairSources.trace(current, messages, RepairSources.passageNames(messages, knownPassages));
    const relatedPassages = new Set(trace.passages);
    const relatedScripts = new Set(trace.scripts.map(script => script.name));
    const related = (name: string | undefined, kind?: 'js' | 'css') =>
      !!name && ((kind === 'js' && relatedScripts.has(name)) || messages.some(message => RepairSources.sourceMentioned(message, name)));
    const named = (name: string | undefined) => !!name && relatedPassages.has(name);
    const rules = allRules.filter(({ mod, rule }) => named(rule.passage) || messages.some(message => RepairSources.sourceMentioned(message, mod.name) && message.includes(rule.findString!)));
    const failedRules = rules.filter(({ mod, rule }) => RepairAgent.tweeRuleFailed(messages, mod.name, rule));
    const writableMods = failedRules.length ? [] : mods;
    for (const { rule } of rules) {
      relatedPassages.add(rule.passage);
      if (current && !current.passageDataItems.map.has(rule.passage)) RepairSources.passageCandidates(current, rule.findString!).forEach(name => relatedPassages.add(name));
    }
    let remaining = 160000;
    const addPassageText = (passage: NonNullable<RepairContext['passages']>[number], field: 'current' | 'original', content: string | undefined, reserve = 0) => {
      if (typeof content !== 'string' || content.length > 64000 || content.length > remaining - reserve || redact(content) !== content) return;
      passage[field] = content;
      if (RepairPrompt.content(context).length > RepairAgent.CONTEXT_LIMIT - reserve) delete passage[field];
      else remaining -= content.length;
    };
    for (const name of relatedPassages) {
      if (!name || name.length > 256 || redact(name) !== name) continue;
      const passage: NonNullable<RepairContext['passages']>[number] = { name };
      (context.passages ||= []).push(passage);
      if (RepairPrompt.content(context).length > RepairAgent.CONTEXT_LIMIT) {
        context.passages.pop();
        continue;
      }
    }
    const reference = (kind: 'twee' | 'js' | 'css', path: string | undefined): string | undefined => {
      if (!path) return;
      // 段落证据已共享，不为每条规则重复发送源码。
      if (kind === 'twee') return path;
      const records = kind === 'js' ? current?.scriptFileItems : current?.styleFileItems;
      const content = records?.map.get(path)?.content;
      if (content !== undefined && path.length + content.length + 1 <= 32000 && redact(content) === content) return `${path}\n${content}`;
    };
    const add = (target: RepairTarget) => {
      if (
        context.targets.length >= 16 ||
        target.content.length > 32000 ||
        (target.reference?.length || 0) > 32000 ||
        [target.modName, target.path, target.content, target.signature || '', target.reference || ''].some(value => redact(value) !== value)
      )
        return;
      const size = target.content.length + (target.reference?.length || 0);
      if (size > remaining) return;
      context.targets.push({ ...target, id: `target-${context.targets.length + 1}` });
      if (RepairPrompt.content(context).length > RepairAgent.CONTEXT_LIMIT) {
        context.targets.pop();
        return;
      }
      remaining -= size;
    };
    // 失效规则优先，其他模组提供只读证据。
    const selectedRules = failedRules.length ? failedRules : rules;
    for (const location of selectedRules) {
      if (context.targets.length >= 16) break;
      const { mod, addon, index, rule } = location;
      const content = NativeJSON.stringify({ passage: rule.passage, findString: rule.findString });
      add({
        id: '',
        modName: mod.name,
        kind: 'twee-replacer',
        path: `twee-replacer|${addon}|${index}`,
        content,
        fingerprint: await RepairRecipeParser.fingerprint(content),
        signature: RepairTargets.tweeSignature(location),
        reference: `${rule.passage}\nExisting replacement:\n${RepairTargets.replacement(rule)}`
      });
    }
    // 规则与段落共享配额，优先保留对应源码。
    const rulePassages = new Map<RepairTarget, string[]>();
    const passageSearches = new Map<string, string[]>();
    for (const target of context.targets) {
      const { passage, findString } = NativeJSON.parse(target.content) as { passage: string; findString: string };
      const names = current?.passageDataItems.map.has(passage) ? [passage] : RepairSources.passageCandidates(current, findString);
      rulePassages.set(target, names);
      for (const name of names) passageSearches.set(name, [...(passageSearches.get(name) || []), findString]);
    }
    const prioritized = new Set([...rulePassages.values()].flat());
    const supplyCurrent = (passage: NonNullable<RepairContext['passages']>[number], reserve = 0) => {
      const content = current?.passageDataItems.map.get(passage.name)?.content;
      if (typeof content === 'string' && content.length > 64000 && content.length <= 256000 && redact(content) === content) {
        // 完整正文留作本地校验，接口只发送共享片段。
        const excerpts = RepairSources.passageExcerpts(content, passageSearches.get(passage.name) || []);
        const size = excerpts?.reduce((sum, excerpt) => sum + excerpt.content.length, 0);
        if (excerpts?.length && size !== undefined && size <= 12000 && size <= remaining - reserve) {
          passage.current = content;
          passage.excerpts = excerpts;
          if (RepairPrompt.content(context).length > RepairAgent.CONTEXT_LIMIT - reserve) {
            delete passage.current;
            delete passage.excerpts;
          } else remaining -= size;
        }
      } else addPassageText(passage, 'current', content, reserve);
      if (typeof content === 'string' && passage.current === undefined) passage.currentOmitted = true;
    };
    for (const name of prioritized) {
      const passage = context.passages?.find(passage => passage.name === name);
      if (passage) supplyCurrent(passage);
    }
    // 存在源码但本次未能提供时，延后该规则；不能提交没有校验材料的搜索修复。
    context.targets = context.targets.filter(target => {
      const names = rulePassages.get(target)!;
      if (!names.length || names.some(name => context.passages?.some(passage => passage.name === name && passage.current !== undefined))) return true;
      remaining += target.content.length + (target.reference?.length || 0);
      return false;
    });
    if (selectedRules.length > context.targets.length) context.omittedRules = selectedRules.length - context.targets.length;
    context.targets.forEach((target, index) => (target.id = `target-${index + 1}`));
    for (const passage of context.passages || []) if (!prioritized.has(passage.name)) supplyCurrent(passage, 32000);
    for (const { modName, patcher, kind, index, rule } of RepairAgent.replaceRules(writableMods)) {
      if (context.targets.length >= 16) break;
      if (!rule.from || rule.from.length > 32000 || redact(rule.from) !== rule.from) continue;
      const path = kind === 'twee' ? rule.passageName : rule.fileName;
      const sourceRelated = kind === 'twee' ? named(path) : related(path, kind);
      const relevant = sourceRelated || (related(patcher.patchFileName) && messages.some(message => message.includes(rule.from)));
      if (!relevant) continue;
      add({
        id: '',
        modName,
        kind: 'replace-patcher',
        signature: NativeJSON.stringify({ to: rule.to, fileName: rule.fileName, passageName: rule.passageName }),
        path: `replace|${encodeURIComponent(patcher.patchFileName)}|${kind}|${index}|from`,
        fingerprint: await RepairRecipeParser.fingerprint(rule.from),
        content: rule.from,
        reference: reference(kind, path)
      });
    }
    for (const mod of writableMods) {
      for (const [kind, items] of [
        ['twee', mod.cache.passageDataItems.items],
        ['js', mod.cache.scriptFileItems.items],
        ['css', mod.cache.styleFileItems.items]
      ] as const) {
        for (const item of items) {
          if (
            !item.name ||
            !(kind === 'twee' ? named(item.name) : related(item.name, kind)) ||
            item.content.length > remaining ||
            item.content.length > 32000 ||
            context.targets.length >= 16 ||
            redact(item.content) !== item.content
          )
            continue;
          add({ id: '', modName: mod.name, kind, path: item.name, fingerprint: await RepairRecipeParser.fingerprint(item.content), content: item.content });
        }
      }
    }
    for (const target of anchorTargets) {
      if (context.targets.length >= 16 || failedRules.length || !named(target.reference) || redact(target.content) !== target.content) continue;
      add({ ...target, reference: reference('twee', target.reference) || target.reference });
    }
    for (const rule of RepairSources.relatedRules(host, (kind, path) => (kind === 'twee' ? named(path) : related(path, kind)))) {
      if (context.relatedRules?.length === 32) break;
      const values = [rule.modName, rule.destination, rule.find, rule.replace];
      if (values.some(value => value.length > 32000 || redact(value) !== value)) continue;
      const size = rule.find.length + rule.replace.length;
      if (size > remaining) continue;
      (context.relatedRules ||= []).push(rule);
      if (RepairPrompt.content(context).length > RepairAgent.CONTEXT_LIMIT) context.relatedRules.pop();
      else remaining -= size;
    }
    // 含密钥的脚本整份排除。
    for (const script of trace.scripts) {
      const content = current?.scriptFileItems?.map.get(script.name)?.content;
      if (typeof content !== 'string' || redact(content) !== content || redact(script.name) !== script.name) continue;
      const size = NativeJSON.stringify(script).length;
      if (size > remaining || size > 32000 || script.symbols.some(symbol => redact(symbol) !== symbol)) continue;
      (context.scripts ||= []).push(script);
      if (RepairPrompt.content(context).length > RepairAgent.CONTEXT_LIMIT) context.scripts.pop();
      else remaining -= size;
    }
    // 优先提供当前证据和可执行规则材料，原文仅用于对照。
    for (const passage of context.passages || []) addPassageText(passage, 'original', originals.get(passage.name));
    return context;
  }

  public static async analyze(
    input: RepairConnectionInput,
    context: RepairContext,
    signal: AbortSignal,
    language: 'EN' | 'CN' = 'EN'
  ): Promise<{ result: ConnectionResult | 'preflight'; recipe?: RepairRecipe; reason?: string }> {
    const response = await RepairConnection.complete(input, RepairPrompt.messages(context, language), signal);
    if (response.result !== 'success' || !response.content) return { result: response.result, ...(response.reason && { reason: response.reason }) };
    try {
      const { recipe, rejected } = RepairRecipeParser.review(response.content, context);
      const reason = rejected.map(item => `${item.targetId}: ${item.reason}`).join('; ');
      return { result: 'success', recipe, ...(reason && { reason: `${language === 'CN' ? '已跳过' : 'Skipped'} ${reason}` }) };
    } catch (error) {
      if (error instanceof SyntaxError) return { result: 'response', reason: 'Invalid repair JSON' };
      return { result: 'preflight', reason: error instanceof Error ? error.message : 'Repair validation failed' };
    }
  }
}
