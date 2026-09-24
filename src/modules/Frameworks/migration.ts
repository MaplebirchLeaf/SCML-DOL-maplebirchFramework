// ./src/modules/Frameworks/migration.ts

import Diagnostics from '../../infra/Diagnostics';
import maplebirch from '../../core';
import type { ScopedLog } from '../../infra/Diagnostics';
import { coverFn, mergeFn } from '../../utils/object';
import ModLoader from '../../host/ModLoader';

const _ = ModLoader.getLodash();

interface Step {
  from: string;
  to: string;
  apply: (data: Record<string, unknown>, utils: Utils) => void;
}

interface PathRef {
  parent: Record<string, unknown>;
  key: string;
}

interface Utils {
  readonly log: ScopedLog;
  path: (obj: Record<string, unknown>, path: string, create?: boolean) => PathRef | null;
  move: (data: Record<string, unknown>, from: string, to: string) => boolean;
  remove: (data: Record<string, unknown>, path: string) => boolean;
  transform: (data: Record<string, unknown>, path: string, fn: (value: unknown) => unknown) => boolean;
  fill: (target: Record<string, unknown>, defaults: Record<string, unknown>, mode?: 'merge' | 'cover') => void;
}

class migration {
  public static readonly log: ScopedLog = (message, level = 'INFO', ...objects) => maplebirch.tool.log(message, level, ...objects);

  public static create(): migration {
    return new migration();
  }

  public readonly log = migration.log;
  public readonly utils: Utils;

  public steps: Step[] = [];

  private readonly unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);

  public constructor() {
    this.utils = Object.freeze({
      log: this.log,
      path: (obj: Record<string, unknown>, path: string, create = false) => this.path(obj, path, create),
      move: (data: Record<string, unknown>, from: string, to: string) => this.move(data, from, to),
      remove: (data: Record<string, unknown>, path: string) => {
        const target = this.path(data, path);
        if (!target || !Object.prototype.hasOwnProperty.call(target.parent, target.key)) return false;
        delete target.parent[target.key];
        return true;
      },
      transform: (data: Record<string, unknown>, path: string, fn: (value: unknown) => unknown) => {
        const target = this.path(data, path);
        if (!target || !Object.prototype.hasOwnProperty.call(target.parent, target.key)) return false;
        try {
          target.parent[target.key] = fn(target.parent[target.key]);
          return true;
        } catch (error) {
          this.log(`转换失败: ${path} - ${Diagnostics.message(error)}`, 'ERROR');
          return false;
        }
      },
      fill: (target: Record<string, unknown>, defaults: Record<string, unknown>, mode: 'merge' | 'cover' = 'merge') => {
        try {
          const filter = (key: string, value: unknown, depth: number, targetValue: unknown) =>
            !(depth === 1 && key === 'version') && (targetValue === undefined || (_.isPlainObject(value) && _.isPlainObject(targetValue)));
          if (mode === 'cover') coverFn(target, filter, defaults);
          else mergeFn(target, filter, defaults);
        } catch (error) {
          this.log(`属性填充失败: ${Diagnostics.message(error)}`, 'ERROR');
        }
      }
    });
  }

  public add(from: string, to: string, apply: Step['apply']): void {
    if (typeof apply !== 'function') return;
    if (from !== '*' && this.compare(from, to) >= 0) return;
    if (this.steps.some(step => step.from === from && step.to === to)) return;
    this.steps.push({ from, to, apply });
  }

  public run(data: Record<string, unknown>, targetVersion: string): void {
    if (!data || typeof data !== 'object') return;
    let current = String(data.version || '0.0.0');
    data.version = current;
    if (this.compare(current, targetVersion) >= 0) return;
    const exactSteps = this.steps.filter(step => step.from !== '*').sort((a, b) => this.compare(a.from, b.from) || this.compare(a.to, b.to));
    const wildcardSteps = this.steps.filter(step => step.from === '*').sort((a, b) => this.compare(b.to, a.to));
    for (let count = 0; this.compare(current, targetVersion) < 0 && count < 100; count++) {
      const exactNext = exactSteps
        .filter(step => this.compare(step.from, current) === 0)
        .filter(step => this.compare(step.to, current) > 0)
        .filter(step => this.compare(step.to, targetVersion) <= 0)
        .sort((a, b) => this.compare(b.to, a.to))[0];
      const wildcardNext = wildcardSteps.filter(step => this.compare(step.to, current) > 0).filter(step => this.compare(step.to, targetVersion) <= 0)[0];
      const next = exactNext ?? wildcardNext;
      if (!next) return;
      try {
        this.log(`迁移中: ${current} → ${next.to}`, 'DEBUG');
        next.apply(data, this.utils);
        current = next.to;
        data.version = current;
      } catch (error) {
        const migrationError = Object.assign(new Error(`迁移失败 ${current} → ${next.to}: ${Diagnostics.message(error)}`, { cause: error }), { fromVersion: current, toVersion: next.to });
        this.log('迁移失败', 'ERROR', migrationError.message);
        throw migrationError;
      }
    }
    if (this.compare(current, targetVersion) < 0) this.log('迁移步骤超过上限: 100', 'ERROR');
  }

  private path(obj: Record<string, unknown>, route: string, create = false): PathRef | null {
    if (!obj || typeof obj !== 'object') return null;
    const parts = String(route)
      .split('.')
      .map(part => part.trim())
      .filter(Boolean);
    if (parts.length === 0 || parts.some(part => this.unsafeKeys.has(part))) return null;
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (!Object.hasOwn(current, key) || current[key] === null || typeof current[key] !== 'object') {
        if (!create) return null;
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    return {
      parent: current,
      key: parts[parts.length - 1]
    };
  }

  private move(data: Record<string, unknown>, from: string, to: string): boolean {
    const source = this.path(data, from);
    if (!source || !Object.prototype.hasOwnProperty.call(source.parent, source.key)) return false;
    const route = (value: string) =>
      value
        .split('.')
        .map(part => part.trim())
        .filter(Boolean)
        .join('.');
    const fromPath = route(from);
    const toPath = route(to);
    if (fromPath === toPath) return true;
    if (toPath.startsWith(`${fromPath}.`)) return false;
    const target = this.path(data, to, true);
    if (!target) return false;
    target.parent[target.key] = source.parent[source.key];
    delete source.parent[source.key];
    return true;
  }

  private compare(a: string, b: string): number {
    const left = String(a || '0.0.0')
      .split('.')
      .map(Number);
    const right = String(b || '0.0.0')
      .split('.')
      .map(Number);
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
      const diff = (Number.isFinite(left[i]) ? left[i] : 0) - (Number.isFinite(right[i]) ? right[i] : 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }
}

export default migration;
