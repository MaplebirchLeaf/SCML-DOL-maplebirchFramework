// ./src/modules/Frameworks/migration.ts

import { createlog } from '../../core';

interface Step {
  from: string;
  to: string;
  apply: (data: Record<string, any>, utils: Utils) => void;
}

interface PathRef {
  parent: Record<string, any>;
  key: string;
}

interface Utils {
  readonly log: ReturnType<typeof createlog>;
  path: (obj: Record<string, any>, path: string, create?: boolean) => PathRef | null;
  move: (data: Record<string, any>, from: string, to: string) => boolean;
  remove: (data: Record<string, any>, path: string) => boolean;
  transform: (data: Record<string, any>, path: string, fn: (value: any) => any) => boolean;
  fill: (target: Record<string, any>, defaults: Record<string, any>, mode?: 'merge' | 'cover') => void;
}

class migration {
  public static readonly log = createlog('migration');

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
      path: (obj: Record<string, any>, path: string, create = false) => this.path(obj, path, create),
      move: (data: Record<string, any>, from: string, to: string) => this.move(data, from, to),
      remove: (data: Record<string, any>, path: string) => {
        const target = this.path(data, path);
        if (!target || !Object.prototype.hasOwnProperty.call(target.parent, target.key)) return false;
        delete target.parent[target.key];
        return true;
      },
      transform: (data: Record<string, any>, path: string, fn: (arg0: any) => any) => {
        const target = this.path(data, path);
        if (!target || !Object.prototype.hasOwnProperty.call(target.parent, target.key)) return false;
        try {
          target.parent[target.key] = fn(target.parent[target.key]);
          return true;
        } catch (error: any) {
          this.log(`转换失败: ${path} - ${error?.message || error}`, 'ERROR');
          return false;
        }
      },
      fill: (target: Record<string, any>, defaults: Record<string, any>, mode: 'merge' | 'cover' = 'merge') => {
        try {
          const filter = (key: string, _value: any, _depth: number, targetValue: any) => key !== 'version' && targetValue === undefined;
          if (mode === 'cover') target.coverfn(filter, defaults);
          else target.mergefn(filter, defaults);
        } catch (error: any) {
          this.log(`属性填充失败: ${error?.message || error}`, 'ERROR');
        }
      }
    });
  }

  public add(from: string, to: string, apply: Step['apply']): void {
    if (typeof apply !== 'function') return;
    if (this.compare(from, to) >= 0) {
      this.log(`无效迁移版本: ${from} -> ${to}`, 'WARN');
      return;
    }
    if (this.steps.some(step => step.from === from && step.to === to)) {
      this.log(`重复迁移: ${from} -> ${to}`, 'WARN');
      return;
    }
    this.steps.push({ from, to, apply });
  }

  public run(data: Record<string, any>, targetVersion: string): void {
    if (!data || typeof data !== 'object') {
      this.log('迁移数据无效', 'WARN');
      return;
    }
    if (!/^\d+(?:\.\d+)*$/.test(targetVersion)) this.log(`目标版本格式无效: ${targetVersion}`, 'WARN');
    let current = String(data.version || '0.0.0');
    data.version = current;
    if (this.compare(current, targetVersion) >= 0) return;
    const steps = [...this.steps].sort((a, b) => this.compare(a.from, b.from) || this.compare(a.to, b.to));
    for (let count = 0; this.compare(current, targetVersion) < 0 && count < 100; count++) {
      const next = steps
        .filter(step => this.compare(step.from, current) === 0)
        .filter(step => this.compare(step.to, current) > 0)
        .filter(step => this.compare(step.to, targetVersion) <= 0)
        .sort((a, b) => this.compare(b.to, a.to))[0];
      if (!next) {
        this.log(`迁移链中断: ${current} -> ${targetVersion}`, 'WARN');
        return;
      }
      try {
        this.log(`迁移中: ${current} → ${next.to}`, 'DEBUG');
        next.apply(data, this.utils);
        current = next.to;
        data.version = current;
      } catch (error: any) {
        const migrationError = new Error(`迁移失败 ${current} → ${next.to}: ${error?.message || error}`);
        (migrationError as any).fromVersion = current;
        (migrationError as any).toVersion = next.to;
        (migrationError as any).cause = error;
        this.log('迁移失败', 'ERROR', migrationError.message);
        throw migrationError;
      }
    }
    if (this.compare(current, targetVersion) < 0) this.log('迁移步骤超过上限: 100', 'ERROR');
  }

  private path(obj: Record<string, any>, route: string, create = false): PathRef | null {
    if (!obj || typeof obj !== 'object') return null;
    const parts = String(route)
      .split('.')
      .map(part => part.trim())
      .filter(Boolean);
    if (parts.length === 0 || parts.some(part => this.unsafeKeys.has(part))) return null;
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
        if (!create) return null;
        current[key] = {};
      }
      current = current[key];
    }
    return {
      parent: current,
      key: parts[parts.length - 1]
    };
  }

  private move(data: Record<string, any>, from: string, to: string): boolean {
    const source = this.path(data, from);
    if (!source || !Object.prototype.hasOwnProperty.call(source.parent, source.key)) return false;
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
