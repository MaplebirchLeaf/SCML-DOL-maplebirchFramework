// ./src/services/Logger.ts

import { MaplebirchCore } from '../core';

interface LogConfig {
  level: number;
  tag: string;
  style: string;
}

type LogLevelKey = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class Logger {
  // prettier-ignore
  private static readonly LogConfig: Record<LogLevelKey, LogConfig> = {
    DEBUG: { level: 0, tag: '[调试]', style: 'color: #9E9E9E; font-weight: bold;' },
    INFO:  { level: 1, tag: '[信息]', style: 'color: #2E7D32; font-weight: bold;' },
    WARN:  { level: 2, tag: '[警告]', style: 'color: #FF8F00; font-weight: bold;' },
    ERROR: { level: 3, tag: '[错误]', style: 'color: #C62828; font-weight: bold;' }
  };

  private static readonly LogLevel = Object.fromEntries(
    Object.entries(Logger.LogConfig).flatMap(([key, cfg]) => [
      [key, cfg.level],
      [cfg.level, key]
    ])
  ) as Record<string | number, string | number>;

  private level: number;

  constructor(readonly core: MaplebirchCore) {
    this.level = Logger.LogLevel.INFO as number;
  }

  async fromIDB(): Promise<void> {
    try {
      const DEBUG = await this.core.idb.withTransaction(['settings'], 'readonly', async (tx: any) => await tx.objectStore('settings').get('DEBUG'));
      this.level = (this.core.lodash.get(DEBUG, 'value', false) as boolean) ? (Logger.LogLevel.DEBUG as number) : (Logger.LogLevel.INFO as number);
    } catch {
      this.level = Logger.LogLevel.INFO as number;
    }
  }

  log(message: string, levelName: string | number = 'INFO', ...objects: any[]): void {
    try {
      const lname = String(levelName || 'INFO').toUpperCase() as LogLevelKey;
      const config = Logger.LogConfig[lname] || Logger.LogConfig.INFO;
      if (config.level < this.level) return;
      console.log(`%c[maplebirch]${config.tag} ${message}`, config.style);
      objects?.forEach(o => console.dir(o));
      const modLogger = this.core.modUtils.getLogger();
      if (lname === 'INFO' && this.level === Logger.LogLevel.DEBUG) {
        modLogger.log(message);
      } else if (lname === 'WARN') {
        modLogger.warn(message);
      } else if (lname === 'ERROR') {
        modLogger.error(message);
      }
    } catch (e) {
      try {
        console.error('[Logger] 写日志失败:', e);
      } catch {
        /* ignore */
      }
    }
  }

  set LevelName(levelName: string) {
    if (!levelName) return;
    const u = levelName.toUpperCase() as LogLevelKey;
    if (!Logger.LogConfig[u]) {
      this.log(`无效日志级别: ${levelName}`, 'WARN');
      return;
    }
    this.level = Logger.LogConfig[u].level;
    this.log(`日志级别变更为: ${u}`, u);
  }

  get LevelName(): string {
    return (Logger.LogLevel[this.level] as string) || 'INFO';
  }
}

export default Logger;
