// ./src/services/Repair/Targets.ts

import type { ModInfo } from '@scml/types/sugarcube-2-ModLoader/ModLoader';
import type { PatchInfoItem } from '@scml/types/sugarcube-2-ModLoader/ReplacePatcher';
import type { ReplaceParams, TweeReplacer, ModBootJsonAddonPluginTweeReplacer } from '@scml/types/Mod_TweeReplacer/TweeReplacer';
import type { ReplacePatcher as ReplaceAddon, ReplaceParams as AddonParams, ReplaceParamsItem, ReplaceParamsItemTwee } from '@scml/types/Mod_ReplacePatch/ReplacePatcher';
import type ModLoader from '../../host/ModLoader';
import type { SourcePatch } from '../../host/ModLoader';
import { NativeJSON } from './Json';
import type { RepairTarget } from './Recipe';

interface TweeRuleLocation {
  mod: ModInfo;
  addon: number;
  index: number;
  rule: ReplaceParams;
}

type ReplaceRule = (PatchInfoItem | ReplaceParamsItem | ReplaceParamsItemTwee) & { fileName?: string; passageName?: string; all?: boolean };

interface ReplaceRuleLocation {
  modName: string;
  kind: 'twee' | 'js' | 'css';
  index: number;
  rule: ReplaceRule;
  path: string;
  patchFileName?: string;
  patcher?: ModInfo['replacePatcher'][number];
  addon?: { patcher: ReplaceAddon; mod: ModInfo; params: AddonParams };
}

export interface RepairZone {
  locationPassage: Record<string, SourcePatch[]>;
  widgetPassage: Record<string, SourcePatch[]>;
}

export type RepairAnchors = Map<string, { descriptor: SourcePatch; title: string; index: number }>;

export interface RepairHandle {
  read(): string;

  write(content: string, replacement?: string): void;

  output: { kind: 'twee' | 'js' | 'css'; path: string; replacement?: string };
  patcher?: ModInfo['replacePatcher'][number];
  rule?: PatchInfoItem;
  anchor?: { title: string; index: number };
  twee?: { patcher: TweeReplacer; mod: ModInfo; rule: ReplaceParams };
  addon?: { patcher: ReplaceAddon; mod: ModInfo; rule: ReplaceRule; params: AddonParams };
  binding?: true;
}

export class RepairTargets {
  private static readonly fileBodies = new WeakMap<ReplaceParams, { path: string; content: string }>();
  private static readonly ruleKeys = new WeakMap<ReplaceParams, string[]>();

  public static loadedMods(host: ModLoader): ModInfo[] {
    return (host.modUtils.getModListNameNoAlias() as string[]).map(name => host.modUtils.getMod(name) as ModInfo | undefined).filter(mod => !!mod);
  }

  public static tweeReplacer(host: ModLoader): TweeReplacer | undefined {
    const patcher = (host.modUtils.getMod('TweeReplacer') as ModInfo | undefined)?.modRef as TweeReplacer | undefined;
    if (patcher?.info instanceof Map && typeof patcher.do_patch === 'function') return patcher;
  }

  private static replaceAddon(host: ModLoader): ReplaceAddon | undefined {
    const patcher = (host.modUtils.getMod('ReplacePatcher') as ModInfo | undefined)?.modRef as ReplaceAddon | undefined;
    if (patcher?.info instanceof Map && typeof patcher.do_patch === 'function' && typeof patcher.checkParams === 'function') return patcher;
  }

  private static *ruleEntries(params: { twee?: ReplaceRule[]; js?: ReplaceRule[]; css?: ReplaceRule[] }): Generator<Pick<ReplaceRuleLocation, 'kind' | 'index' | 'rule'>> {
    for (const kind of ['twee', 'js', 'css'] as const) {
      for (const [index, rule] of (params[kind] || []).entries()) yield { kind, index, rule };
    }
  }

  // 仅枚举加载器及插件实际使用的内存规则。
  public static *replaceRules(host: ModLoader, modName?: string): Generator<ReplaceRuleLocation> {
    const selected = modName ? (host.modUtils.getMod(modName) as ModInfo | undefined) : undefined;
    for (const mod of modName ? (selected ? [selected] : []) : RepairTargets.loadedMods(host)) {
      for (const patcher of mod.replacePatcher || []) {
        for (const entry of RepairTargets.ruleEntries(patcher.patchInfo))
          yield { modName: mod.name, ...entry, path: `replace|${encodeURIComponent(patcher.patchFileName)}|${entry.kind}|${entry.index}|binding`, patchFileName: patcher.patchFileName, patcher };
      }
    }
    const patcher = RepairTargets.replaceAddon(host);
    if (!patcher) return;
    for (const { mod } of patcher.info.values()) {
      if (modName && mod.name !== modName) continue;
      const addonIndex = mod.bootJson.addonPlugin?.findIndex(entry => entry.modName === 'ReplacePatcher' && entry.addonName === 'ReplacePatcherAddon') ?? -1;
      const params = mod.bootJson.addonPlugin?.[addonIndex]?.params;
      if (!patcher.checkParams(params)) continue;
      for (const entry of RepairTargets.ruleEntries(params))
        yield { modName: mod.name, ...entry, path: `replace-addon|${addonIndex}|${entry.kind}|${entry.index}|binding`, addon: { patcher, mod, params } };
    }
  }

  /** 只读已注册 ZIP 的替换正文，后续操作仍只修改内存规则。 */
  public static async prepareRules(host: ModLoader): Promise<void> {
    const patcher = RepairTargets.tweeReplacer(host);
    if (!patcher) return;
    let remaining = 8000000;
    let readFiles = 0;
    let limited = false;
    for (const { mod, modZip } of patcher.info.values()) {
      const entry = mod.bootJson.addonPlugin?.find(addon => addon.modName === 'TweeReplacer' && addon.addonName === 'TweeReplacerAddon') as ModBootJsonAddonPluginTweeReplacer | undefined;
      if (!entry || !Array.isArray(entry.params) || (Array.isArray(entry.paramsFiles) && entry.paramsFiles.length)) continue;
      const files = new Map<string, string | undefined>();
      for (const rule of entry.params as ReplaceParams[]) {
        if (!rule || typeof rule !== 'object' || rule.replace || typeof rule.replaceFile !== 'string' || !rule.replaceFile) continue;
        RepairTargets.fileBodies.delete(rule);
        if (!files.has(rule.replaceFile)) {
          try {
            if (readFiles >= 256 || remaining <= 0) {
              files.set(rule.replaceFile, undefined);
              if (!limited) host.diagnostics.write('Repair replacement source limit reached; some file rules were omitted', 'WARN', 'repair');
              limited = true;
            } else {
              readFiles++;
              // 原生只读接口没有文件大小预读，只能限制数量与解码后缓存的正文。
              const body = await modZip?.zip.file(rule.replaceFile)?.async('string');
              if (body && (body.length > 256000 || body.length > remaining)) {
                files.set(rule.replaceFile, undefined);
                if (!limited) host.diagnostics.write('Repair replacement source limit reached; some file rules were omitted', 'WARN', 'repair');
                limited = true;
              } else {
                files.set(rule.replaceFile, body);
                remaining -= body?.length || 0;
              }
            }
          } catch (error) {
            files.set(rule.replaceFile, undefined);
            host.diagnostics.write(`Repair replacement source unavailable: ${mod.name}:${rule.replaceFile}`, 'WARN', 'repair', error);
          }
        }
        const content = files.get(rule.replaceFile);
        if (content) RepairTargets.fileBodies.set(rule, { path: rule.replaceFile, content });
      }
    }
  }

  /** 原生插件优先使用非空 replace，仅在缺省时读取 replaceFile。 */
  public static replacement(rule: ReplaceParams): string | undefined {
    if (typeof rule.replace === 'string' && rule.replace) return rule.replace;
    const file = RepairTargets.fileBodies.get(rule);
    return file && file.path === rule.replaceFile ? file.content : undefined;
  }

  /** 使用插件已注册的内存规则与只读正文缓存，不改动 ZIP。 */
  public static tweeRules(host: ModLoader, modName?: string): TweeRuleLocation[] {
    const rules: TweeRuleLocation[] = [];
    const patcher = RepairTargets.tweeReplacer(host);
    if (!patcher) return rules;
    for (const { mod } of patcher.info.values()) {
      if (modName && mod.name !== modName) continue;
      const addon = (mod.bootJson.addonPlugin || []).findIndex(entry => entry.modName === 'TweeReplacer' && entry.addonName === 'TweeReplacerAddon');
      const entry = mod.bootJson.addonPlugin?.[addon] as ModBootJsonAddonPluginTweeReplacer | undefined;
      if (!entry || !Array.isArray(entry.params) || (Array.isArray(entry.paramsFiles) && entry.paramsFiles.length)) continue;
      for (const [index, rule] of entry.params.entries()) {
        if (rule && typeof rule.passage === 'string' && typeof rule.findString === 'string' && rule.findString && !rule.findRegex && RepairTargets.replacement(rule))
          rules.push({ mod, addon, index, rule });
      }
    }
    return rules;
  }

  public static tweeSignature(location: TweeRuleLocation): string {
    const keys = RepairTargets.ruleKeys.get(location.rule) || Object.keys(location.rule);
    RepairTargets.ruleKeys.set(location.rule, keys);
    // 删除再恢复文件字段会改变插入顺序，签名仍采用读取时的字段顺序。
    const rule = Object.fromEntries([...new Set([...keys, ...Object.keys(location.rule)])].filter(key => Object.hasOwn(location.rule, key)).map(key => [key, Reflect.get(location.rule, key)]));
    const { findString: _find, passage: _passage, ...companion } = rule;
    const addon = location.mod.bootJson.addonPlugin?.[location.addon] as ModBootJsonAddonPluginTweeReplacer | undefined;
    return NativeJSON.stringify({ companion, paramsFiles: addon?.paramsFiles, ...(!location.rule.replace && { replacement: RepairTargets.replacement(location.rule) }) });
  }

  /** 派生正文写入内存后，以同一字段顺序绑定下一次修复。 */
  public static companionForBody(signature: string, body: string): string {
    const value = NativeJSON.parse(signature) as { companion: Omit<ReplaceParams, 'passage' | 'findString'>; paramsFiles?: string[]; replacement?: string };
    delete value.companion.replaceFile;
    value.companion.replace = body;
    delete value.replacement;
    return NativeJSON.stringify(value);
  }

  public static captureAnchors(zone: RepairZone | undefined): RepairAnchors {
    const anchors: RepairAnchors = new Map();
    if (!zone) return anchors;
    for (const group of ['locationPassage', 'widgetPassage'] as const) {
      for (const [title, descriptors] of Object.entries(zone[group]))
        descriptors.forEach((descriptor, index) => {
          if (typeof descriptor.src === 'string' && !descriptor.srcmatch && !descriptor.srcmatchgroup)
            anchors.set(`zone|${group}|${encodeURIComponent(title)}|${index}|src`, { descriptor, title, index });
        });
    }
    return anchors;
  }

  public static anchorSignature(descriptor: SourcePatch): string {
    return NativeJSON.stringify({ to: descriptor.to, applyafter: descriptor.applyafter, applybefore: descriptor.applybefore, expected: descriptor.expected });
  }

  public static replacePath(rule: ReplaceRule, kind: 'twee' | 'js' | 'css'): string | undefined {
    return kind === 'twee' ? rule.passageName : rule.fileName;
  }

  public static replaceBinding(rule: ReplaceRule, kind: 'twee' | 'js' | 'css'): string {
    const path = RepairTargets.replacePath(rule, kind);
    return NativeJSON.stringify(kind === 'twee' ? { passageName: path, from: rule.from } : { fileName: path, from: rule.from });
  }

  public static replaceSignature(rule: ReplaceRule): string {
    return NativeJSON.stringify({ to: rule.to, ...(rule.all !== undefined && { all: rule.all }) });
  }

  private static bindingHandle(location: ReplaceRuleLocation): RepairHandle {
    const { rule, kind, patcher, addon } = location;
    return {
      read: () => RepairTargets.replaceBinding(rule, kind),
      write: content => {
        const value = NativeJSON.parse(content) as Record<string, unknown> | null;
        const destination = kind === 'twee' ? 'passageName' : 'fileName';
        const path = value?.[destination];
        if (
          !value ||
          typeof value !== 'object' ||
          Array.isArray(value) ||
          Object.keys(value).length !== 2 ||
          !Object.hasOwn(value, destination) ||
          !Object.hasOwn(value, 'from') ||
          typeof path !== 'string' ||
          !path ||
          typeof value.from !== 'string' ||
          !value.from
        )
          throw new Error('Invalid ReplacePatcher search binding');
        Reflect.set(rule, destination, path);
        rule.from = value.from;
        if (patcher) RepairTargets.indexReplaceRules(patcher, kind);
      },
      get output() {
        return { kind, path: RepairTargets.replacePath(rule, kind)!, replacement: rule.to };
      },
      patcher,
      rule: patcher ? (rule as PatchInfoItem) : undefined,
      addon: addon ? { ...addon, rule } : undefined,
      binding: true
    };
  }

  /** 按原生规则顺序重建索引，保留规则与 Map 的引用。 */
  private static indexReplaceRules(patcher: ModInfo['replacePatcher'][number], kind: 'twee' | 'js' | 'css'): void {
    const map = patcher.patchInfoMap[kind];
    map.clear();
    for (const rule of patcher.patchInfo[kind] || []) {
      const path = kind === 'twee' ? rule.passageName : rule.fileName;
      if (!path) continue;
      const rules = map.get(path);
      if (rules) rules.push(rule);
      else map.set(path, [rule]);
    }
  }

  public static handle(host: ModLoader, target: RepairTarget, anchors?: RepairAnchors): RepairHandle | undefined {
    const mod = host.modUtils.getMod(target.modName) as ModInfo | undefined;
    if (!mod) return;
    if (target.kind === 'twee-replacer') {
      const [prefix, addon, index, extra] = target.path.split('|');
      if (prefix !== 'twee-replacer' || !/^\d+$/.test(addon) || !/^\d+$/.test(index) || extra !== undefined) return;
      const location = RepairTargets.tweeRules(host, mod.name).find(item => item.addon === Number(addon) && item.index === Number(index));
      const patcher = RepairTargets.tweeReplacer(host);
      if (!patcher || !location || RepairTargets.tweeSignature(location) !== target.signature) return;
      const { rule } = location;
      const body = RepairTargets.replacement(rule);
      const original = {
        replace: rule.replace,
        replaceFile: rule.replaceFile,
        hasReplace: Object.hasOwn(rule, 'replace'),
        hasReplaceFile: Object.hasOwn(rule, 'replaceFile')
      };
      return {
        read: () => NativeJSON.stringify({ passage: rule.passage, findString: rule.findString }),
        write: (content, replacement) => {
          const value = NativeJSON.parse(content) as { passage: string; findString: string };
          if (replacement !== undefined) {
            if (!replacement) throw new Error('TweeReplacer replacement cannot be empty');
            if (replacement === body) {
              if (original.hasReplace) rule.replace = original.replace;
              else delete rule.replace;
              if (original.hasReplaceFile) rule.replaceFile = original.replaceFile;
              else delete rule.replaceFile;
            } else {
              rule.replace = replacement;
              delete rule.replaceFile;
            }
          }
          rule.passage = value.passage;
          rule.findString = value.findString;
        },
        get output() {
          return { kind: 'twee' as const, path: rule.passage, replacement: RepairTargets.replacement(rule) };
        },
        twee: { patcher, mod: location.mod, rule }
      };
    }
    if (target.kind === 'patch-anchor' && target.path.startsWith('zone|')) {
      const anchor = anchors?.get(target.path);
      if (!anchor || target.modName !== 'maplebirch' || RepairTargets.anchorSignature(anchor.descriptor) !== target.signature) return;
      return {
        read: () => anchor.descriptor.src!,
        write: content => {
          anchor.descriptor.src = content;
        },
        output: { kind: 'twee', path: anchor.title },
        anchor: { title: anchor.title, index: anchor.index + 1 }
      };
    }
    if (target.kind === 'replace-patcher') {
      const [prefix, file, kind, index, field, extra] = target.path.split('|');
      if (!['replace', 'replace-addon'].includes(prefix) || !['from', 'binding'].includes(field) || !['js', 'css', 'twee'].includes(kind) || !/^\d+$/.test(index) || extra !== undefined) return;
      if (field === 'binding') {
        const location = [...RepairTargets.replaceRules(host, target.modName)].find(item => item.path === target.path);
        if (
          !location ||
          typeof location.rule.from !== 'string' ||
          !location.rule.from ||
          typeof location.rule.to !== 'string' ||
          !location.rule.to ||
          RepairTargets.replaceSignature(location.rule) !== target.signature
        )
          return;
        if (location.patcher && !location.patcher.patchInfoMap[location.kind].get(RepairTargets.replacePath(location.rule, location.kind)!)?.includes(location.rule as PatchInfoItem)) return;
        return RepairTargets.bindingHandle(location);
      }
      if (prefix !== 'replace') return;
      const patchers = mod.replacePatcher.filter(patcher => patcher.patchFileName === decodeURIComponent(file));
      if (patchers.length !== 1) return;
      const patcher = patchers[0];
      const type = kind as 'js' | 'css' | 'twee';
      const rule: PatchInfoItem | undefined = patcher.patchInfo[type]?.[Number(index)];
      if (!rule || typeof rule.from !== 'string' || typeof rule.to !== 'string') return;
      const signature = NativeJSON.stringify({ to: rule.to, fileName: rule.fileName, passageName: rule.passageName });
      if (signature !== target.signature) return;
      const path = type === 'twee' ? rule.passageName : rule.fileName;
      if (!path || !patcher.patchInfoMap[type].get(path)?.includes(rule)) return;
      return {
        read: () => rule.from,
        write: content => {
          rule.from = content;
        },
        output: { kind: type, path, replacement: rule.to },
        patcher,
        rule
      };
    }
    const records = target.kind === 'twee' ? mod.cache.passageDataItems : target.kind === 'js' ? mod.cache.scriptFileItems : target.kind === 'css' ? mod.cache.styleFileItems : undefined;
    if (!records) return;
    const matches = records.items.filter(item => item.name === target.path);
    if (matches.length !== 1) return;
    const item = matches[0];
    return {
      read: () => item.content,
      write: content => {
        item.content = content;
        records.fillMap();
      },
      output: { kind: target.kind as 'twee' | 'js' | 'css', path: target.path }
    };
  }
}
