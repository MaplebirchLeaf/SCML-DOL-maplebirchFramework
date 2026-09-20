import { describe, expect, test } from 'bun:test';
import EventEmitter from '../../src/services/EventEmitter';
import type { MaplebirchCore } from '../../src/core';

function emitter() {
  const errors: string[] = [];
  const core = {
    logger: {
      log(message: string, level: string) {
        if (level === 'ERROR') errors.push(message);
      }
    }
  } as MaplebirchCore;
  return { events: new EventEmitter(core), errors };
}

describe('EventEmitter', () => {
  test('save and load dispatch finish synchronous listeners before returning', async () => {
    for (const name of [':onSave', ':onLoad']) {
      const { events, errors } = emitter();
      const calls: string[] = [];
      events.on(name, async () => {
        calls.push('async start');
        await Promise.resolve();
        throw new Error('async save failure');
      });
      events.on(name, () => calls.push('sync listener'));
      events.after(name, () => calls.push('after'));
      const pending = events.trigger(name);
      expect(calls).toEqual(['async start', 'sync listener', 'after']);
      expect(errors).toHaveLength(1);
      await pending;
      await Promise.resolve();
      expect(errors).toHaveLength(2);
      expect(errors[1]).toContain('async save failure');
    }
  });

  test('sticky after waits for all synchronous and asynchronous listeners', async () => {
    const { events } = emitter();
    const calls: string[] = [];
    events.on(':storyready', async () => {
      calls.push('first');
      events.after(':storyready', () => calls.push('after'));
      await Promise.resolve();
      calls.push('first complete');
    });
    events.on(':storyready', () => calls.push('second'));
    await events.trigger(':storyready');
    expect(calls).toEqual(['first', 'first complete', 'second', 'after']);
  });

  test('sticky after registered during a pending listener waits for completion', async () => {
    const { events } = emitter();
    const calls: string[] = [];
    let release!: () => void;
    const pending = new Promise<void>(resolve => {
      release = resolve;
    });
    events.on(':idbReady', async () => {
      await pending;
      calls.push('ready');
    });
    const triggering = events.trigger(':idbReady', 'settings');
    events.after(':idbReady', (store: string) => calls.push(store));
    expect(calls).toEqual([]);
    release();
    await triggering;
    expect(calls).toEqual(['ready', 'settings']);
    events.after(':idbReady', (store: string) => calls.push(`late ${store}`));
    expect(calls.at(-1)).toBe('late settings');
  });

  test('nested dispatch completes its outer listeners before after callbacks', async () => {
    const { events } = emitter();
    const calls: string[] = [];
    events.on(':language', async (depth: number) => {
      calls.push(`start ${depth}`);
      if (depth === 0) {
        events.after(':language', () => calls.push('after'));
        await events.trigger(':language', 1);
      }
      calls.push(`end ${depth}`);
    });
    await events.trigger(':language', 0);
    expect(calls).toEqual(['start 0', 'start 1', 'end 1', 'end 0', 'after']);
  });

  test('once is consumed before reentrant dispatch and errors do not stop later callbacks', async () => {
    const { events, errors } = emitter();
    const calls: string[] = [];
    events.once('custom', async (value: number) => {
      calls.push(`once ${value}`);
      await events.trigger('custom', 2);
      throw new Error('expected failure');
    });
    events.on('custom', (value: number) => calls.push(`on ${value}`));
    events.after('custom', (value: number) => calls.push(`after ${value}`));
    await events.trigger('custom', 1);
    expect(calls).toEqual(['once 1', 'on 2', 'on 1', 'after 1']);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('expected failure');
  });
});
