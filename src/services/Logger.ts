// ./src/services/Logger.ts

import type { MaplebirchCore } from '../core';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogConfig {
  level: number;
  tag: string;
  style: string;
}

interface DebugSetting {
  value?: boolean;
}

class Logger {
  private static readonly LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const;
  // prettier-ignore
  private static readonly CONFIG: Record<LogLevel, LogConfig> = {
    DEBUG: { level: 0, tag: '[调试]', style: 'color: #9E9E9E; font-weight: bold;' },
    INFO:  { level: 1, tag: '[信息]', style: 'color: #2E7D32; font-weight: bold;' },
    WARN:  { level: 2, tag: '[警告]', style: 'color: #FF8F00; font-weight: bold;' },
    ERROR: { level: 3, tag: '[错误]', style: 'color: #C62828; font-weight: bold;' }
  };

  private level: LogLevel = 'INFO';
  public constructor(readonly core: MaplebirchCore) {}

  public async fromIDB(): Promise<void> {
    try {
      const setting = (await this.core.idb.withTransaction('settings', 'readonly', tx => tx.objectStore('settings').get('DEBUG'))) as DebugSetting | undefined;
      this.level = setting?.value === true ? 'DEBUG' : 'INFO';
    } catch {
      this.level = 'INFO';
    }
  }

  public log(message: string, levelName: string | number = 'INFO', ...objects: unknown[]): void {
    const name = typeof levelName === 'number' ? (Logger.LEVELS[levelName] ?? 'INFO') : (String(levelName || 'INFO').toUpperCase() as LogLevel);
    const config = Logger.CONFIG[name] ?? Logger.CONFIG.INFO;
    if (config.level < Logger.CONFIG[this.level].level) return;
    console.log(`%c[maplebirch]${config.tag} ${message}`, config.style);
    for (const object of objects) console.dir(object);
    try {
      const logger = this.core.manager.modSC2DataManager.getModUtils().getLogger();
      if (name === 'INFO' && this.level === 'DEBUG') {
        logger.log?.(message);
      } else if (name === 'WARN') {
        logger.warn?.(message);
      } else if (name === 'ERROR') {
        logger.error?.(message);
      }
    } catch {}
  }

  public set LevelName(levelName: string) {
    if (!levelName) return;
    const name = levelName.toUpperCase() as LogLevel;
    if (!Logger.CONFIG[name]) {
      this.log(`无效日志级别: ${levelName}`, 'WARN');
      return;
    }
    this.level = name;
    this.log(`日志级别变更为: ${name}`, name);
  }

  public get LevelName(): string {
    return this.level;
  }
}

export default Logger;
