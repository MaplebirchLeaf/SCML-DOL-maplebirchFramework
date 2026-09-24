// ./src/infra/Logger.ts

import type ModLoader from '../host/ModLoader';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogConfig {
  level: number;
  tag: string;
  style: string;
}

type ModLogger = Partial<Record<'log' | 'warn' | 'error', (message: string) => void>>;

export class Logger {
  private static readonly LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const;
  // prettier-ignore
  private static readonly CONFIG: Record<LogLevel, LogConfig> = {
    DEBUG: { level: 0, tag: '[调试]', style: 'color: #9E9E9E; font-weight: bold;' },
    INFO:  { level: 1, tag: '[信息]', style: 'color: #2E7D32; font-weight: bold;' },
    WARN:  { level: 2, tag: '[警告]', style: 'color: #FF8F00; font-weight: bold;' },
    ERROR: { level: 3, tag: '[错误]', style: 'color: #C62828; font-weight: bold;' }
  };
  // prettier-ignore
  private static readonly FORWARD: Record<LogLevel, keyof ModLogger | null> = {
    DEBUG: null,
    INFO:  'log',
    WARN:  'warn',
    ERROR: 'error'
  };

  private static level: LogLevel = 'INFO';

  public constructor(readonly modloader?: ModLoader) {}

  public static toLevel(level: string | number): LogLevel {
    if (typeof level === 'number') return Logger.LEVELS[level] ?? 'INFO';
    const name = String(level || '').toUpperCase() as LogLevel;
    return Logger.CONFIG[name] ? name : 'INFO';
  }

  public log(message: string, levelName: string | number = 'INFO', ...objects: unknown[]): void {
    const name = Logger.toLevel(levelName);
    const config = Logger.CONFIG[name];
    if (config.level < Logger.CONFIG[Logger.level].level) return;
    console.log(`%c[maplebirch]${config.tag} ${message}`, config.style);
    for (const object of objects) console.dir(object);
    const method = Logger.FORWARD[name];
    if (!method || (name === 'INFO' && Logger.level !== 'DEBUG')) return;
    try {
      const mirror = this.modloader?.modUtils.getLogger() as ModLogger | undefined;
      if (!mirror) return;
      mirror[method]?.call(mirror, message);
    } catch (error) {
      console.warn('[maplebirch] ModLoader log mirror failed:', error);
    }
  }

  public set LevelName(levelName: string) {
    if (!levelName) return;
    Logger.level = Logger.toLevel(levelName);
    this.log(`日志级别变更为: ${Logger.level}`, Logger.level);
  }

  public get LevelName(): string {
    return Logger.level;
  }
}

export default Logger;
