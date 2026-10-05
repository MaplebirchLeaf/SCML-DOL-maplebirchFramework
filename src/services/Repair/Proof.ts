// ./src/services/Repair/Proof.ts

import { RepairTargets, type RepairHandle } from './Targets';
import type Diagnostics from '../../infra/Diagnostics';
import type { ModBootJsonAddonPluginTweeReplacer } from '@scml/types/Mod_TweeReplacer/TweeReplacer';

type Patcher = NonNullable<RepairHandle['patcher']>;

type PatchData = Parameters<Patcher['applyReplacePatcher']>[0];

type TweePatcher = NonNullable<RepairHandle['twee']>['patcher'];

type TweeInfo = Parameters<TweePatcher['do_patch']>[0];

type TweeData = Parameters<TweePatcher['do_patch']>[1];

interface Observation {
  handle: RepairHandle;
  diagnostics: Diagnostics;
  matched: boolean;
  sequence: number;
  output?: string;
  attempted?: boolean;
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

interface TweeObserver {
  patcher: TweePatcher;
  original: TweePatcher['do_patch'];
  descriptor?: PropertyDescriptor;
  wrapper: TweePatcher['do_patch'];
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
  private static tweeObservers = new WeakMap<TweePatcher, TweeObserver>();
  private static invocationSequence = 0;

  private static warn(observation: Observation, phase: string, error: unknown): void {
    const { twee, patcher, rule } = observation.handle;
    const target = twee ? `${twee.mod.name}:${twee.rule.passage}` : `${patcher?.patchFileName || 'ReplacePatcher'}:${rule?.passageName || rule?.fileName || '未知目标'}`;
    observation.diagnostics.write(`修复${phase}失败：${target}`, 'WARN', 'repair', error);
  }

  private static records(data: PatchData, handle: RepairHandle) {
    return handle.output.kind === 'twee' ? data.passageDataItems : handle.output.kind === 'js' ? data.scriptFileItems : data.styleFileItems;
  }

  private static restoreObserver(observer: PatchObserver): void {
    if (observer.patcher.applyReplacePatcher === observer.wrapper) {
      if (observer.descriptor) Object.defineProperty(observer.patcher, 'applyReplacePatcher', observer.descriptor);
      else Reflect.deleteProperty(observer.patcher, 'applyReplacePatcher');
    }
    if (RepairProof.observers.get(observer.patcher) === observer) RepairProof.observers.delete(observer.patcher);
  }

  private static restoreTweeObserver(observer: TweeObserver): void {
    if (observer.patcher.do_patch === observer.wrapper) {
      if (observer.descriptor) Object.defineProperty(observer.patcher, 'do_patch', observer.descriptor);
      else Reflect.deleteProperty(observer.patcher, 'do_patch');
    }
    if (RepairProof.tweeObservers.get(observer.patcher) === observer) RepairProof.tweeObservers.delete(observer.patcher);
  }

  private static tweeExpectation(data: TweeData, info: TweeInfo, handle: RepairHandle): { output: string; matched: boolean } | undefined {
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
        // 前序原生规则执行后，再用当前输入核对记忆中的规则。
        if (content.split(current.findString).length !== 2) return;
        matched = true;
      }
      // 原生 TweeReplacer 使用替换字符串，包含 $ 替换语义。
      content = current.all ? content.replaceAll(current.findString, replacement) : content.replace(current.findString, replacement);
    }
    return { output: content, matched };
  }

  private static async observeTwee(observer: TweeObserver, receiver: TweePatcher, info: TweeInfo, data: TweeData): ReturnType<TweePatcher['do_patch']> {
    const expected = new Map<Observation, ReturnType<typeof RepairProof.tweeExpectation>>();
    for (const subscriber of observer.subscribers)
      for (const observation of subscriber.observations) {
        if (receiver !== observer.patcher || observer.patcher.info.get(info.mod.name) !== info || observation.handle.twee?.mod !== info.mod) continue;
        observation.matched = false;
        observation.sequence = 0;
        observation.output = undefined;
        observation.attempted = true;
        try {
          expected.set(observation, receiver === observer.patcher ? RepairProof.tweeExpectation(data, info, observation.handle) : undefined);
        } catch (error) {
          expected.set(observation, undefined);
          RepairProof.warn(observation, '预期计算', error);
        }
      }
    try {
      const result = await observer.original.call(receiver, info, data);
      const sequence = ++RepairProof.invocationSequence;
      for (const [observation, expectedOutput] of expected) {
        if (!expectedOutput?.matched) continue;
        try {
          const output = observation.handle.output;
          const item = data.passageDataItems.map.get(output.path);
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
      // 同一原生实例处理多个模组，观察器须保留至订阅的模组执行完毕。
      if ([...observer.subscribers].every(subscriber => subscriber.observations.every(observation => observation.attempted))) RepairProof.restoreTweeObserver(observer);
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
      if (current === rule) matched = true;
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

  /** 观察加载器现有补丁器的调用，保留原接收者和方法。 */
  public static observe(handles: RepairHandle[], diagnostics: Diagnostics): ReplacePatchProof {
    const owned = new Map<PatchObserver, Observer>();
    const ownedTwee = new Map<TweeObserver, Observer>();
    const observations = new Map<RepairHandle, Observation>();
    const restore = () => {
      for (const [observer, subscriber] of owned) {
        observer.subscribers.delete(subscriber);
        if (!observer.subscribers.size) RepairProof.restoreObserver(observer);
      }
      owned.clear();
      for (const [observer, subscriber] of ownedTwee) {
        observer.subscribers.delete(subscriber);
        if (!observer.subscribers.size) RepairProof.restoreTweeObserver(observer);
      }
      ownedTwee.clear();
    };
    try {
      for (const handle of handles) {
        if (handle.twee) {
          const patcher = handle.twee.patcher;
          let observer = RepairProof.tweeObservers.get(patcher);
          if (!observer || patcher.do_patch !== observer.wrapper) {
            const created: TweeObserver = {
              patcher,
              original: patcher.do_patch,
              descriptor: Object.getOwnPropertyDescriptor(patcher, 'do_patch'),
              wrapper: function (this: TweePatcher, info: TweeInfo, data: TweeData) {
                return RepairProof.observeTwee(created, this, info, data);
              },
              subscribers: new Set()
            };
            patcher.do_patch = created.wrapper;
            RepairProof.tweeObservers.set(patcher, created);
            observer = created;
          }
          let subscriber = ownedTwee.get(observer);
          if (!subscriber) {
            subscriber = { observations: [] };
            observer.subscribers.add(subscriber);
            ownedTwee.set(observer, subscriber);
          }
          const observation = { handle, diagnostics, matched: false, sequence: 0 };
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
