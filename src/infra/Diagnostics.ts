// ./src/infra/Diagnostics.ts

import type ModLoader from '../host/ModLoader';
import Logger, { type LogLevel } from './Logger';

export interface DiagnosticRecord {
  at: string;
  level: LogLevel;
  scope?: string;
  message: string;
  data?: unknown;
}

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

export interface ModConflict {
  source: string;
  dataSource: string;
  passages: string[];
  scripts: string[];
  styles: string[];
}

export type ScopedLog = (message: string, level?: string, ...objects: unknown[]) => void;

export class Diagnostics extends Logger {
  private static readonly entries: DiagnosticRecord[] = [];
  private static readonly patchResults = new Map<string, PatchResult>();

  public constructor(
    modloader?: ModLoader,
    readonly scope = ''
  ) {
    super(modloader);
  }

  public static message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  public override log(message: string, levelName: string | number = 'INFO', ...objects: unknown[]): void {
    const level = Logger.toLevel(levelName);
    if (level === 'WARN' || level === 'ERROR') {
      this.record(message, level, this.scope, ...objects);
      return;
    }
    super.log(this.scope ? `[${this.scope}] ${message}` : message, level, ...objects);
  }

  public record(message: string, level: string = 'INFO', scope: string = this.scope, ...objects: unknown[]): void {
    const name = Logger.toLevel(level);
    const data = objects.length === 0 ? undefined : objects.length === 1 ? objects[0] : objects;
    Diagnostics.entries.push({
      at: new Date().toISOString(),
      level: name,
      message,
      ...(scope ? { scope } : {}),
      ...(data === undefined ? {} : { data })
    });
    if (Diagnostics.entries.length > 1000) Diagnostics.entries.splice(0, Diagnostics.entries.length - 1000);
    super.log(scope ? `[${scope}] ${message}` : message, name, ...objects);
  }

  public write(message: string, level: string = 'INFO', scope: string = this.scope, ...objects: unknown[]): void {
    const name = Logger.toLevel(level);
    if (name === 'WARN' || name === 'ERROR') {
      this.record(message, name, scope, ...objects);
      return;
    }
    super.log(scope ? `[${scope}] ${message}` : message, name, ...objects);
  }

  public scoped(scope: string): ScopedLog {
    return (message, level = 'INFO', ...objects) => this.write(message, level, scope, ...objects);
  }

  public get history(): readonly DiagnosticRecord[] {
    return Diagnostics.entries.map(record => ({ ...record }));
  }

  public get errors(): DiagnosticRecord[] {
    return this.history.filter(record => record.level === 'ERROR');
  }

  public get patches(): PatchResult[] {
    return [...Diagnostics.patchResults.values()].map(result => ({ ...result }));
  }

  public recordPatch(result: PatchResult): void {
    Diagnostics.patchResults.set(JSON.stringify([result.kind, result.target, result.index]), { ...result });
    if (result.status !== 'applied') this.record(`${result.kind} patch did not apply: ${result.target}`, 'WARN', 'patch', result);
  }

  public clearPatches(): void {
    Diagnostics.patchResults.clear();
  }

  public get conflicts(): ModConflict[] | undefined {
    return this.modloader?.conflict?.map(({ mod, result }) => ({
      source: mod.dataSource,
      dataSource: result.dataSource,
      passages: [...result.passageDataItems.conflict],
      scripts: [...result.scriptFileItems.conflict],
      styles: [...result.styleFileItems.conflict]
    }));
  }

  public export(): string {
    return JSON.stringify(
      { history: Diagnostics.entries, patches: this.patches, conflicts: this.conflicts },
      (_key, value) => (value instanceof Error ? { name: value.name, message: value.message } : value),
      2
    );
  }

  public reset(): void {
    Diagnostics.entries.length = 0;
    Diagnostics.patchResults.clear();
  }
}

export default Diagnostics;
