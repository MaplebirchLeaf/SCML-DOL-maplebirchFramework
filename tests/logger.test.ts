import './helpers/runtime';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import Logger from '../src/services/Logger';
import type { MaplebirchCore } from '../src/core';

const originalConsoleLog = console.log;
const originalConsoleDir = console.dir;
let logged: unknown[][];
let inspected: unknown[];

beforeEach(() => {
  logged = [];
  inspected = [];
  console.log = (...values: unknown[]): void => {
    logged.push(values);
  };
  console.dir = (value: unknown): void => {
    inspected.push(value);
  };
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.dir = originalConsoleDir;
});

function createLogger(debugSetting: boolean | Error = false): {
  logger: Logger;
  forwarded: string[];
} {
  const forwarded: string[] = [];
  const core = {
    idb: {
      withTransaction: async (_store: string, _mode: string, callback: (tx: { objectStore: () => { get: () => unknown } }) => unknown): Promise<unknown> => {
        if (debugSetting instanceof Error) throw debugSetting;
        return callback({ objectStore: () => ({ get: () => ({ value: debugSetting }) }) });
      }
    },
    manager: {
      modSC2DataManager: {
        getModUtils: () => ({
          getLogger: () => ({
            log: (message: string) => forwarded.push(`log:${message}`),
            warn: (message: string) => forwarded.push(`warn:${message}`),
            error: (message: string) => forwarded.push(`error:${message}`)
          })
        })
      }
    }
  } as unknown as MaplebirchCore;

  return { logger: new Logger(core), forwarded };
}

describe('Logger', () => {
  test('loads the debug setting and forwards supported host levels', async () => {
    const { logger, forwarded } = createLogger(true);
    await logger.fromIDB();

    logger.log('debug detail', 'DEBUG', { id: 1 });
    logger.log('information', 1);
    logger.log('warning', 'warn');
    logger.log('failure', 'ERROR');

    expect(logger.LevelName).toBe('DEBUG');
    expect(logged).toHaveLength(4);
    expect(inspected).toContainEqual({ id: 1 });
    expect(forwarded).toEqual(['log:information', 'warn:warning', 'error:failure']);
  });

  test('falls back to info and suppresses debug messages when storage fails', async () => {
    const { logger, forwarded } = createLogger(new Error('storage unavailable'));
    await logger.fromIDB();

    logger.log('hidden', 'DEBUG');
    logger.log('visible', 'unknown-level');

    expect(logger.LevelName).toBe('INFO');
    expect(logged).toHaveLength(1);
    expect(forwarded).toEqual([]);
  });

  test('changes valid levels and rejects invalid or empty values', () => {
    const { logger, forwarded } = createLogger();

    logger.LevelName = 'ERROR';
    expect(logger.LevelName).toBe('ERROR');
    logger.LevelName = '';
    logger.LevelName = 'verbose';

    expect(logger.LevelName).toBe('ERROR');
    expect(forwarded).toEqual(['error:日志级别变更为: ERROR']);
  });
});
