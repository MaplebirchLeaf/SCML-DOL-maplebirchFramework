import './helpers/runtime';
import { describe, expect, test } from 'bun:test';
import EventEmitter from '../src/services/EventEmitter';
import type { MaplebirchCore } from '../src/core';

function createEmitter(): EventEmitter {
  return new EventEmitter({ logger: { log() {} } } as unknown as MaplebirchCore);
}

describe('EventEmitter.once', () => {
  test('consumes a once listener only once across concurrent triggers', async () => {
    const events = createEmitter();
    const gate = Promise.withResolvers<void>();
    let calls = 0;
    events.on('event', () => gate.promise);
    events.once('event', () => calls++);

    const first = events.trigger('event');
    const second = events.trigger('event');
    gate.resolve();
    await Promise.all([first, second]);

    expect(calls).toBe(1);
  });

  test('does not serialize independent triggers behind a waiting listener', async () => {
    const events = createEmitter();
    const gate = Promise.withResolvers<void>();
    const seen: string[] = [];
    events.on('event', async (value: string) => {
      if (value === 'first') await gate.promise;
      seen.push(value);
    });

    const first = events.trigger('event', 'first');
    await events.trigger('event', 'second');
    expect(seen).toEqual(['second']);
    gate.resolve();
    await first;
    expect(seen).toEqual(['second', 'first']);
  });

  test('does not retry a throwing once listener from another trigger snapshot', async () => {
    const events = createEmitter();
    const gate = Promise.withResolvers<void>();
    let calls = 0;
    events.on('event', () => gate.promise);
    events.once('event', () => {
      calls++;
      throw new Error('callback failed');
    });
    const first = events.trigger('event');
    const second = events.trigger('event');
    gate.resolve();
    await Promise.all([first, second]);
    expect(calls).toBe(1);
  });
});
