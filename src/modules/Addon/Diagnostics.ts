import { errorMessage } from '../../utils/error';
import type { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import type { ModUtils } from '@scml/types/sugarcube-2-ModLoader/Utils';

export interface PatchResult {
  kind: 'passage' | 'script' | 'style' | 'source';
  target: string;
  index: number;
  pattern: string;
  matches: number;
  applied: number;
  status: 'applied' | 'unmatched' | 'missing' | 'invalid' | 'mismatch' | 'error';
  expected?: number;
  error?: string;
}

export interface ModRequirement {
  name: string;
  range?: string;
  version?: string;
  status: 'available' | 'missing' | 'incompatible' | 'invalid';
  error?: string;
}

export interface ModConflict {
  source: string;
  dataSource: string;
  passages: string[];
  scripts: string[];
  styles: string[];
}

export default class Diagnostics {
  private readonly results = new Map<string, PatchResult>();

  public constructor(
    private readonly manager: SC2DataManager,
    private readonly modUtils: ModUtils
  ) {}

  public get patches(): PatchResult[] {
    return [...this.results.values()].map(result => ({ ...result }));
  }

  public recordPatch(result: PatchResult): void {
    this.results.set(JSON.stringify([result.kind, result.target, result.index]), { ...result });
  }

  public clearPatches(): void {
    this.results.clear();
  }

  public mod(name: string, range?: string): ModRequirement {
    const mod = this.modUtils.getMod(name);
    if (!mod) return { name, range, status: 'missing' };
    try {
      const semver = this.manager.getDependenceChecker().getInfiniteSemVerApi();
      const valid = range === undefined || semver.satisfies(semver.parseVersion(mod.version).version, semver.parseRange(range));
      return { name, range, version: mod.version, status: valid ? 'available' : 'incompatible' };
    } catch (error) {
      return { name, range, version: mod.version, status: 'invalid', error: errorMessage(error) };
    }
  }

  public dependencies(): boolean {
    return this.manager.getDependenceChecker().check();
  }

  public get conflicts(): ModConflict[] | undefined {
    return this.manager.getConflictResult()?.map(({ mod, result }) => ({
      source: mod.dataSource,
      dataSource: result.dataSource,
      passages: [...result.passageDataItems.conflict],
      scripts: [...result.scriptFileItems.conflict],
      styles: [...result.styleFileItems.conflict]
    }));
  }
}
