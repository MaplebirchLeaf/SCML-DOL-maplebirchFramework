// .src/modules/Frameworks/migration.ts

import maplebirch, { createlog } from '../../core';
import { merge } from '../../utils';

const _ = maplebirch.lodash;

interface step {
  fromVersion: string;
  toVersion: string;
  migrationFn: (data: any, utils: MigrationUtils) => void;
}

interface result {
  parent: Record<string, any>;
  key: string;
}

interface MigrationUtils {
  readonly log: ReturnType<typeof createlog>;
  resolvePath: (obj: Record<string, any>, path: string, createIfMissing?: boolean) => result | null;
  rename: (data: Record<string, any>, oldPath: string, newPath: string) => boolean;
  move: (data: Record<string, any>, oldPath: string, newPath: string) => boolean;
  remove: (data: Record<string, any>, path: string) => boolean;
  transform: (data: Record<string, any>, path: string, transformer: (value: any) => any) => boolean;
  fill: (target: Record<string, any>, defaults: Record<string, any>, options?: { mode?: 'merge' | 'replace' }) => void;
}

class migration {
  static log = createlog('migration');
  static create() {
    return new migration();
  }
  log = migration.log;
  migrations: step[] = [];
  utils: MigrationUtils;

  constructor() {
    this.migrations = [];

    const renameFunc = (data: Record<string, any>, oldPath: string, newPath: string): boolean => {
      const source = this.utils.resolvePath(data, oldPath);
      if (!source?.parent[source.key]) return false;
      const value = source.parent[source.key];
      delete source.parent[source.key];
      const target = this.utils.resolvePath(data, newPath, true);
      target.parent[target.key] = value;
      return true;
    };

    this.utils = {
      log: migration.log,
      resolvePath: (obj: Record<string, any>, path: string, createIfMissing = false) => {
        const parts = String(path).split('.').filter(Boolean);
        if (parts.length === 0) return null;
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (current[part] === undefined) {
            if (!createIfMissing) return null;
            current[part] = {};
          }
          current = current[part];
          if (current === null || typeof current !== 'object') {
            if (!createIfMissing) return null;
            current = {};
          }
        }
        return { parent: current, key: parts.at(-1)! };
      },

      rename: renameFunc,
      move: renameFunc,

      remove: (data: Record<string, any>, path: string) => {
        const target = this.utils.resolvePath(data, path);
        if (target?.parent[target.key] !== undefined) {
          delete target.parent[target.key];
          return true;
        }
        return false;
      },

      transform: (data: Record<string, any>, path: string, transformer: (value: any) => any) => {
        const target = this.utils.resolvePath(data, path);
        if (!target?.parent[target.key]) return false;
        try {
          target.parent[target.key] = transformer(target.parent[target.key]);
          return true;
        } catch {
          return false;
        }
      },

      fill: (target: Record<string, any>, defaults: Record<string, any>, options = {}) => {
        const mode = options.mode || 'merge';
        const filterFn = (key: string, _value: any, _depth: number) => {
          if (key === 'version') return false;
          return !Object.prototype.hasOwnProperty.call(target, key);
        };
        try {
          merge(target, defaults, { mode, filterFn });
        } catch (err: any) {
          this.log(`属性填充失败: ${err?.message || err}`, 'ERROR');
        }
      }
    };
    Object.freeze(this.utils);
  }

  private _compareVersions(a: string, b: string) {
    const parse = (v: string) =>
      String(v || '0.0.0')
        .split('.')
        .map(Number);
    const v1 = parse(a);
    const v2 = parse(b);
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const diff = (v1[i] || 0) - (v2[i] || 0);
      if (diff) return diff;
    }
    return 0;
  }

  add(fromVersion: string, toVersion: string, migrationFn: (data: any, utils: MigrationUtils) => void) {
    if (!_.isFunction(migrationFn)) return;
    const exists = _.some(this.migrations, m => m.fromVersion === fromVersion && m.toVersion === toVersion);
    if (exists) {
      this.log(`重复迁移: ${fromVersion} -> ${toVersion}`, 'WARN');
      return;
    }
    this.migrations.push({ fromVersion, toVersion, migrationFn });
  }

  run(data: Record<string, any>, targetVersion: string) {
    data.version = _.get(data, 'version', '0.0.0');
    let currentVersion = data.version as string;
    if (!/^\d+(\.\d+){0,2}$/.test(targetVersion)) this.log(`警告: 目标版本格式无效 ${targetVersion}`, 'WARN');
    if (this._compareVersions(currentVersion, targetVersion) >= 0) return;
    const sortedMigrations = _.orderBy([...this.migrations], [m => this._compareVersions(m.fromVersion, currentVersion), m => this._compareVersions(m.toVersion, targetVersion)], ['asc', 'asc']);
    let steps = 0;
    const MAX_STEPS = 100;

    while (this._compareVersions(currentVersion, targetVersion) < 0 && steps++ < MAX_STEPS) {
      const candidates = _.filter(sortedMigrations, m => this._compareVersions(m.fromVersion, currentVersion) === 0 && this._compareVersions(m.toVersion, targetVersion) <= 0);
      const migration = _.reduce(candidates, (best, curr) => (this._compareVersions(curr.toVersion, best.toVersion) > 0 ? curr : best), {
        toVersion: currentVersion,
        fromVersion: '',
        migrationFn: () => {}
      } as step);
      if (!migration || migration.toVersion === currentVersion) {
        this.log(`迁移中断: ${currentVersion} -> ${targetVersion}`, 'WARN');
        break;
      }
      try {
        this.log(`迁移中: ${currentVersion} → ${migration.toVersion}`, 'DEBUG');
        migration.migrationFn(data, this.utils);
        data.version = currentVersion = migration.toVersion;
      } catch (e: any) {
        const migrationError = new Error(`迁移失败 ${currentVersion}→${migration.toVersion}: ${e.message}`);
        (migrationError as any).fromVersion = currentVersion;
        (migrationError as any).toVersion = migration.toVersion;
        (migrationError as any).cause = e;
        this.log('迁移失败', 'ERROR', migrationError.message);
        throw migrationError;
      }
    }

    if (this._compareVersions(currentVersion, targetVersion) < 0) {
      this.log(`强制设置版本: ${targetVersion}`, 'WARN');
      data.version = targetVersion;
    }
  }
}

export default migration;
