// ./src/services/Repair/Proof.ts

import { RepairTargets, type RepairHandle } from './Targets';
import type Diagnostics from '../../infra/Diagnostics';
import type { ModBootJsonAddonPluginTweeReplacer } from '@scml/types/Mod_TweeReplacer/TweeReplacer';

type Patcher = NonNullable<RepairHandle['patcher']>;

type PatchData = Parameters<Patcher['applyReplacePatcher']>[0];

type TweePatcher = NonNullable<RepairHandle['twee']>['patcher'];

type TweeInfo = Parameters<TweePatcher['do_patch']>[0];

type TweeData = Parameters<TweePatcher['do_patch']>[1];

type AddonPatcher = NonNullable<RepairHandle['addon']>['patcher'];

type AddonInfo = Parameters<AddonPatcher['do_patch']>[0];

type AddonData = Parameters<AddonPatcher['do_patch']>[1];

type AsyncPatcher = Pick<TweePatcher, 'info' | 'do_patch'>;

interface Observation {
  handle: RepairHandle;
  diagnostics: Diagnostics;
  matched: boolean;
  sequence: number;
  output?: string;
  attempted?: boolean;
  guard?: { validate(handle: RepairHandle, source: string): void; rollback(error: unknown): void };
}

interface Observer {
  observations: Observation[];
}

interface PatchObserver {
  patcher: Patcher;
  original: Patcher['applyReplacePatcher'];
  descriptor?: PropertyDescriptor;
  wrapper: Patcher['applyReplacePatcher'];
  subscribers: Set<Observer>;
}

interface AsyncObserver {
  patcher: AsyncPatcher;
  original: AsyncPatcher['do_patch'];
  descriptor?: PropertyDescriptor;
  wrapper: AsyncPatcher['do_patch'];
  subscribers: Set<Observer>;
}

export interface ReplacePatchProof {
  verify(handle: RepairHandle): boolean;

  output(handle: RepairHandle): string | undefined;

  sequence(handle: RepairHandle): number;

  restore(): void;
}

export class RepairProof {
  private static observers = new WeakMap<Patcher, PatchObserver>();
  private static asyncObservers = new WeakMap<AsyncPatcher, AsyncObserver>();
  private static invocationSequence = 0;

  private static warn(observation: Observation, phase: string, error: unknown): void {
    const { twee, patcher, rule, addon } = observation.handle;
    const owner = twee?.mod.name || addon?.mod.name || patcher?.patchFileName || 'ReplacePatcher';
    const path = twee?.rule.passage || addon?.rule.passageName || addon?.rule.fileName || rule?.passageName || rule?.fileName || '未知目标';
    observation.diagnostics.write(`修复${phase}失败：${owner}:${path}`, 'WARN', 'repair', error);
  }

  private static records(data: PatchData, handle: RepairHandle) {
    return handle.output.kind === 'twee' ? data.passageDataItems : handle.output.kind === 'js' ? data.scriptFileItems : data.styleFileItems;
  }

  private static uniqueMatch(content: string, find: string): boolean {
    const first = content.indexOf(find);
    return first >= 0 && content.indexOf(find, first + 1) < 0;
  }

  private static restoreObserver(observer: PatchObserver): void {
    if (observer.patcher.applyReplacePatcher === observer.wrapper) {
      if (observer.descriptor) Object.defineProperty(observer.patcher, 'applyReplacePatcher', observer.descriptor);
      else Reflect.deleteProperty(observer.patcher, 'applyReplacePatcher');
    }
    if (RepairProof.observers.get(observer.patcher) === observer) RepairProof.observers.delete(observer.patcher);
  }

  private static restoreAsyncObserver(observer: AsyncObserver): void {
    if (observer.patcher.do_patch === observer.wrapper) {
      if (observer.descriptor) Object.defineProperty(observer.patcher, 'do_patch', observer.descriptor);
      else Reflect.deleteProperty(observer.patcher, 'do_patch');
    }
    if (RepairProof.asyncObservers.get(observer.patcher) === observer) RepairProof.asyncObservers.delete(observer.patcher);
  }

  private static addonExpectation(data: AddonData, info: AddonInfo, handle: RepairHandle): { output: string; matched: boolean } | undefined {
    const { addon, output } = handle;
    if (!addon || addon.mod !== info.mod || addon.patcher.info.get(info.mod.name) !== info) return;
    const params = info.mod.bootJson.addonPlugin?.find(entry => entry.modName === 'ReplacePatcher' && entry.addonName === 'ReplacePatcherAddon')?.params;
    if (params !== addon.params || !addon.patcher.checkParams(params)) return;
    const rules = params[output.kind];
    if (!rules?.some(rule => rule === addon.rule)) return;
    const records = RepairProof.records(data, handle);
    const item = records.map.get(output.path);
    if (!item || records.items.filter(candidate => candidate.name === output.path).length !== 1) return;
    let content = item.content;
    let matched = false;
    for (const rule of rules) {
      const path = RepairTargets.replacePath(rule, output.kind);
      if (!path) return;
      const destination = output.kind === 'twee' ? records.map.get(path) : records.getByNameWithOrWithoutPath(path);
      if (destination !== item || !content.includes(rule.from)) continue;
      if (rule === addon.rule) {
        if (!RepairProof.uniqueMatch(content, rule.from)) return;
        matched = true;
      }
      content = rule.all ? content.replaceAll(rule.from, rule.to) : content.replace(rule.from, rule.to);
    }
    return { output: content, matched };
  }

  private static tweeExpectation(data: TweeData, info: TweeInfo, handle: RepairHandle, guard?: Observation['guard']): { output: string; matched: boolean } | undefined {
    const { twee, output } = handle;
    if (!twee || twee.mod !== info.mod || twee.patcher.info.get(info.mod.name) !== info) return;
    const addon = info.mod.bootJson.addonPlugin?.find(entry => entry.modName === 'TweeReplacer' && entry.addonName === 'TweeReplacerAddon') as ModBootJsonAddonPluginTweeReplacer | undefined;
    if (!addon || (Array.isArray(addon.paramsFiles) && addon.paramsFiles.length) || !Array.isArray(addon.params) || !addon.params.includes(twee.rule)) return;
    const items = data.passageDataItems.items.filter(item => item.name === output.path);
    if (items.length !== 1 || data.passageDataItems.map.get(output.path) !== items[0]) return;
    let content = items[0].content;
    let matched = false;
    for (const current of addon.params) {
      if (!current || typeof current.passage !== 'string') return;
      if (current.passage !== output.path) continue;
      const replacement = RepairTargets.replacement(current);
      if (typeof current.findString !== 'string' || !current.findString || !replacement) return;
      if (!content.includes(current.findString)) continue;
      if (current === twee.rule) {
        if (!RepairProof.uniqueMatch(content, current.findString)) return;
        guard?.validate(handle, content);
        matched = true;
      }
      content = current.all ? content.replaceAll(current.findString, replacement) : content.replace(current.findString, replacement);
    }
    return { output: content, matched };
  }

  private static async observeAsync(observer: AsyncObserver, receiver: AsyncPatcher, info: TweeInfo, data: TweeData): ReturnType<AsyncPatcher['do_patch']> {
    const expected = new Map<Observation, ReturnType<typeof RepairProof.tweeExpectation>>();
    for (const subscriber of observer.subscribers)
      for (const observation of subscriber.observations) {
        const owner = observation.handle.twee || observation.handle.addon;
        if (receiver !== observer.patcher || observer.patcher.info.get(info.mod.name) !== info || owner?.mod !== info.mod) continue;
        observation.matched = false;
        observation.sequence = 0;
        observation.output = undefined;
        observation.attempted = true;
        try {
          const output = observation.handle.twee ? RepairProof.tweeExpectation(data, info, observation.handle, observation.guard) : RepairProof.addonExpectation(data, info, observation.handle);
          if (observation.guard && !output?.matched) throw new Error('Migrated rule input cannot be verified');
          expected.set(observation, output);
        } catch (error) {
          expected.set(observation, undefined);
          RepairProof.warn(observation, '预期计算', error);
          observation.guard?.rollback(error);
        }
      }
    try {
      const result = await observer.original.call(receiver, info, data);
      const sequence = ++RepairProof.invocationSequence;
      for (const [observation, expectedOutput] of expected) {
        if (!expectedOutput?.matched) continue;
        try {
          const item = RepairProof.records(data, observation.handle).map.get(observation.handle.output.path);
          if (item?.content === expectedOutput.output) {
            observation.matched = true;
            observation.sequence = sequence;
            observation.output = expectedOutput.output;
          }
        } catch (error) {
          RepairProof.warn(observation, '结果校验', error);
        }
      }
      return result;
    } finally {
      if ([...observer.subscribers].every(subscriber => subscriber.observations.every(observation => observation.attempted))) RepairProof.restoreAsyncObserver(observer);
    }
  }

  private static expectation(data: PatchData, handle: RepairHandle): { output: string; matched: boolean } | undefined {
    const { patcher, rule, output } = handle;
    if (!patcher || !rule) return;
    const items = RepairProof.records(data, handle).items.filter(item => item.name === output.path);
    const rules = patcher.patchInfoMap[output.kind].get(output.path);
    if (items.length !== 1 || !rules?.includes(rule)) return;
    let content = items[0].content;
    let matched = false;
    for (const current of rules) {
      if (typeof current.from !== 'string' || typeof current.to !== 'string') return;
      const position = content.indexOf(current.from);
      if (position < 0) continue;
      if (current === rule) {
        if (handle.binding && !RepairProof.uniqueMatch(content, current.from)) return;
        matched = true;
      }
      content = content.slice(0, position) + current.to + content.slice(position + current.from.length);
    }
    return { output: content, matched };
  }

  private static observeReplace(observer: PatchObserver, receiver: Patcher, data: PatchData): ReturnType<Patcher['applyReplacePatcher']> {
    const expected = new Map<Observation, ReturnType<typeof RepairProof.expectation>>();
    for (const subscriber of observer.subscribers)
      for (const observation of subscriber.observations) {
        observation.matched = false;
        observation.sequence = 0;
        observation.output = undefined;
        try {
          expected.set(observation, receiver === observer.patcher ? RepairProof.expectation(data, observation.handle) : undefined);
        } catch (error) {
          expected.set(observation, undefined);
          RepairProof.warn(observation, '预期计算', error);
        }
      }
    try {
      const result = observer.original.call(receiver, data);
      const sequence = ++RepairProof.invocationSequence;
      for (const [observation, result] of expected) {
        if (!result?.matched) continue;
        try {
          const items = RepairProof.records(data, observation.handle).items.filter(item => item.name === observation.handle.output.path);
          if (items.length === 1 && items[0].content === result.output) {
            observation.matched = true;
            observation.sequence = sequence;
            observation.output = result.output;
          }
        } catch (error) {
          RepairProof.warn(observation, '结果校验', error);
        }
      }
      return result;
    } finally {
      RepairProof.restoreObserver(observer);
    }
  }

  public static observe(handles: RepairHandle[], diagnostics: Diagnostics, guard?: Observation['guard']): ReplacePatchProof {
    const owned = new Map<PatchObserver, Observer>();
    const ownedAsync = new Map<AsyncObserver, Observer>();
    const observations = new Map<RepairHandle, Observation>();
    const restore = () => {
      for (const [observer, subscriber] of owned) {
        observer.subscribers.delete(subscriber);
        if (!observer.subscribers.size) RepairProof.restoreObserver(observer);
      }
      owned.clear();
      for (const [observer, subscriber] of ownedAsync) {
        observer.subscribers.delete(subscriber);
        if (!observer.subscribers.size) RepairProof.restoreAsyncObserver(observer);
      }
      ownedAsync.clear();
    };
    try {
      for (const handle of handles) {
        const nativeAddon = handle.twee?.patcher || handle.addon?.patcher;
        if (nativeAddon) {
          let observer = RepairProof.asyncObservers.get(nativeAddon);
          if (!observer || nativeAddon.do_patch !== observer.wrapper) {
            const created: AsyncObserver = {
              patcher: nativeAddon,
              original: nativeAddon.do_patch,
              descriptor: Object.getOwnPropertyDescriptor(nativeAddon, 'do_patch'),
              wrapper: function (this: AsyncPatcher, info: TweeInfo, data: TweeData) {
                return RepairProof.observeAsync(created, this, info, data);
              },
              subscribers: new Set()
            };
            nativeAddon.do_patch = created.wrapper;
            RepairProof.asyncObservers.set(nativeAddon, created);
            observer = created;
          }
          let subscriber = ownedAsync.get(observer);
          if (!subscriber) {
            subscriber = { observations: [] };
            observer.subscribers.add(subscriber);
            ownedAsync.set(observer, subscriber);
          }
          const observation = { handle, diagnostics, matched: false, sequence: 0, guard };
          subscriber.observations.push(observation);
          observations.set(handle, observation);
          continue;
        }
        if (!handle.patcher || !handle.rule) continue;
        const patcher = handle.patcher;
        let observer = RepairProof.observers.get(patcher);
        if (!observer || patcher.applyReplacePatcher !== observer.wrapper) {
          const created: PatchObserver = {
            patcher,
            original: patcher.applyReplacePatcher,
            descriptor: Object.getOwnPropertyDescriptor(patcher, 'applyReplacePatcher'),
            wrapper: function (this: Patcher, data: PatchData) {
              return RepairProof.observeReplace(created, this, data);
            },
            subscribers: new Set()
          };
          patcher.applyReplacePatcher = created.wrapper;
          RepairProof.observers.set(patcher, created);
          observer = created;
        }
        let subscriber = owned.get(observer);
        if (!subscriber) {
          subscriber = { observations: [] };
          observer.subscribers.add(subscriber);
          owned.set(observer, subscriber);
        }
        const observation = { handle, diagnostics, matched: false, sequence: 0 };
        subscriber.observations.push(observation);
        observations.set(handle, observation);
      }
    } catch (error) {
      restore();
      throw error;
    }
    return {
      verify: handle => observations.get(handle)?.matched === true,
      output: handle => observations.get(handle)?.output,
      sequence: handle => observations.get(handle)?.sequence ?? 0,
      restore
    };
  }
}
