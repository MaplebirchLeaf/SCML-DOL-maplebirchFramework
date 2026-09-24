// ./src/host/ModLoader.ts

import type { Gui } from '@scml/types/Mod_LoaderGui/Gui';
import type { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import Diagnostics, { type PatchResult } from '../infra/Diagnostics';
import Resources from './Resources';

export type Replacement = [RegExp, string];
type TwineAssetMode = 'append' | 'replace' | 'patch';

export interface SourcePatch {
  src?: string;
  srcmatch?: RegExp;
  srcmatchgroup?: RegExp;
  to?: string;
  applyafter?: string;
  applybefore?: string;
  expected?: number;
}

export interface SourcePatchResult extends Pick<PatchResult, 'pattern' | 'matches' | 'applied' | 'status' | 'expected' | 'error'> {
  content: string;
}

export function applySourcePatch(source: string, patch: SourcePatch): SourcePatchResult {
  const pattern = patch.src || patch.srcmatch || patch.srcmatchgroup;
  const result: SourcePatchResult = { content: source, pattern: String(pattern ?? ''), matches: 0, applied: 0, status: 'invalid', expected: patch.expected };
  if ([patch.src, patch.srcmatch, patch.srcmatchgroup].filter(value => value !== undefined).length !== 1) return result;
  if ([patch.to, patch.applyafter, patch.applybefore].filter(value => value !== undefined).length !== 1) return result;
  if (!pattern || (patch.to === undefined && patch.applyafter === undefined && patch.applybefore === undefined)) return result;
  if (patch.expected !== undefined && (!Number.isSafeInteger(patch.expected) || patch.expected < 0)) return result;
  try {
    const escaped = typeof pattern === 'string' ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : pattern.source;
    const flags = typeof pattern === 'string' ? '' : pattern.flags;
    const candidates = new RegExp(escaped, flags.includes('g') ? flags : `${flags}g`);
    result.matches = [...source.matchAll(candidates)].length;
    if (patch.expected !== undefined && result.matches !== patch.expected) return { ...result, status: 'mismatch' };
    if (result.matches === 0) return { ...result, status: 'unmatched' };
    const all = pattern === patch.srcmatchgroup || flags.includes('g');
    const matcher = new RegExp(escaped, all && !flags.includes('g') ? `${flags}g` : flags);
    result.content =
      patch.to !== undefined ? source.replace(matcher, patch.to) : source.replace(matcher, match => (patch.applyafter !== undefined ? match + patch.applyafter : patch.applybefore + match));
    result.applied = all ? result.matches : 1;
    result.status = 'applied';
  } catch (error) {
    result.status = 'error';
    result.error = Diagnostics.message(error);
  }
  return result;
}

function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/[\\/]+/g, '\\')
    .toLowerCase();
}

function findAsset(text: string, kind: string, targetName: string) {
  const regex = new RegExp(`^\\/\\*[ \\t]*${kind}[ \\t]+#(\\d+):[ \\t]*"([^"]+)"[ \\t]*\\*\\/[ \\t]*$`, 'gm');
  let maxId = 0;
  let found: { start: number; contentStart: number; end: number; id: number; name: string } | null = null;
  let previous: RegExpExecArray | null = null;
  for (const match of text.matchAll(regex)) {
    const id = Number(match[1]);
    if (Number.isSafeInteger(id) && id > maxId) maxId = id;
    if (previous && normalizeName(previous[2]) === targetName) {
      found = { start: previous.index, contentStart: previous.index + previous[0].length, end: match.index, id: Number(previous[1]), name: previous[2] };
      break;
    }
    previous = match;
  }
  if (!found && previous && normalizeName(previous[2]) === targetName) {
    found = { start: previous.index, contentStart: previous.index + previous[0].length, end: text.length, id: Number(previous[1]), name: previous[2] };
  }
  return { found, maxId };
}

export class ModLoader {
  public static getLodash(): ReturnType<ReturnType<SC2DataManager['getModUtils']>['getLodash']> {
    return window.modSC2DataManager.getModUtils().getLodash();
  }

  public readonly diagnostics = new Diagnostics(this);
  public readonly resources: Resources;

  public constructor(
    public readonly modSC2DataManager: SC2DataManager,
    public readonly modLoaderGui: Gui
  ) {
    this.resources = new Resources(modSC2DataManager, (path, error) => this.diagnostics.write(`图片资源读取失败: ${path}`, 'WARN', 'resources', error));
  }

  public replace(content: string, replacements: Replacement[], label = 'replace'): string {
    const unmatched: number[] = [];
    let result = content;
    for (let i = 0; i < replacements.length; i++) {
      const [regex, replacement] = replacements[i];
      const { content: next, ...report } = applySourcePatch(result, { srcmatch: regex, to: replacement });
      this.diagnostics.recordPatch({ kind: 'source', target: label, index: i + 1, ...report });
      if (report.status !== 'applied') unmatched.push(i + 1);
      result = next;
    }
    if (unmatched.length) this.diagnostics.write(`${label}: 以下正则未匹配到内容 - ${unmatched.join(',')}`, 'WARN');
    return result;
  }

  public defineTwineAsset(type: 'script' | 'style', name: string, content: string | ((current: string) => string), mode: TwineAssetMode = 'append'): void {
    const story = document.getElementsByTagName('tw-storydata')[0];
    const node = story?.getElementsByTagName(type)[0];
    if (!node) {
      this.diagnostics.recordPatch({ kind: type, target: name, index: 0, pattern: name, matches: 0, applied: 0, status: 'missing', error: 'Twine asset container not found' });
      return;
    }
    const text = node.textContent ?? '';
    const kind = type === 'script' ? 'twine-user-script' : 'twine-user-stylesheet';
    const { found, maxId } = findAsset(text, kind, normalizeName(name));
    if (found) {
      if (mode === 'append') return;
      const current = text
        .slice(found.contentStart, found.end)
        .replace(/^\r?\n/, '')
        .replace(/\r?\n$/, '');
      const next = typeof content === 'function' ? content(current) : content;
      const normalized = next.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
      node.textContent = text.slice(0, found.start) + `/* ${kind} #${found.id}: "${found.name}" */\n` + `${normalized}\n` + text.slice(found.end).replace(/^\r?\n/, '');
      this.diagnostics.recordPatch({ kind: type, target: name, index: 0, pattern: name, matches: 1, applied: 1, status: 'applied' });
      return;
    }
    if (mode === 'patch') {
      this.diagnostics.recordPatch({ kind: type, target: name, index: 0, pattern: name, matches: 0, applied: 0, status: 'missing', error: 'Twine asset not found' });
      this.diagnostics.write(`Twine asset patch: 未找到资产 ${name}，已跳过追加以避免重复脚本`, 'WARN');
      return;
    }
    const next = typeof content === 'function' ? content('') : content;
    const normalized = next.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
    const separator = !text ? '' : text.endsWith('\n') ? '\n' : '\n\n';
    node.textContent = text + separator + `/* ${kind} #${maxId + 1}: "${name}" */\n` + normalized;
  }

  public async disabled(modNames: string | string[], reload = true): Promise<boolean> {
    const controller = this.loadController;
    const [enabledModsRaw = [], disabledModsRaw = []] = await Promise.all([controller.listModIndexDB(), controller.loadHiddenModList()]);
    const enabledMods = [...new Set(enabledModsRaw.map(name => name.trim()).filter(Boolean))];
    const disabledMods = [...new Set(disabledModsRaw.map(name => name.trim()).filter(Boolean))];
    const enabledSet = new Set(enabledMods);
    const disabledSet = new Set(disabledMods);
    const targets = new Set((Array.isArray(modNames) ? modNames : [modNames]).map(name => name.trim()).filter(name => name && enabledSet.has(name)));
    if (targets.size === 0) return false;
    const nextEnabledMods = enabledMods.filter(modName => !targets.has(modName));
    const nextDisabledMods = [...disabledMods, ...[...targets].filter(modName => !disabledSet.has(modName))];
    if (nextEnabledMods.length === enabledMods.length && nextDisabledMods.length === disabledMods.length) return false;
    await Promise.all([controller.overwriteModIndexDBModList(nextEnabledMods), controller.overwriteModIndexDBHiddenModList(nextDisabledMods)]);
    if (reload) location.reload();
    return true;
  }

  public get modUtils(): ReturnType<SC2DataManager['getModUtils']> {
    return this.modSC2DataManager.getModUtils();
  }

  public get modLoader(): ReturnType<SC2DataManager['getModLoader']> {
    return this.modSC2DataManager.getModLoader();
  }

  public get loadController(): ReturnType<SC2DataManager['getModLoadController']> {
    return this.modSC2DataManager.getModLoadController();
  }

  public get dependence(): ReturnType<SC2DataManager['getDependenceChecker']> {
    return this.modSC2DataManager.getDependenceChecker();
  }

  public get conflict(): ReturnType<SC2DataManager['getConflictResult']> {
    return this.modSC2DataManager.getConflictResult();
  }

  public get lodash(): ReturnType<ReturnType<SC2DataManager['getModUtils']>['getLodash']> {
    return this.modUtils.getLodash();
  }
}

export default ModLoader;
