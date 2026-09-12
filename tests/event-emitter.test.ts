import './helpers/runtime';
import { describe, expect, test } from 'bun:test';
import EventEmitter from '../src/services/EventEmitter';
import type { MaplebirchCore } from '../src/core';

function createEmitter(): EventEmitter {
  return new EventEmitter({ logger: { log() {} } } as unknown as MaplebirchCore);
}

function createEmitterWithLogs(): { events: EventEmitter; logs: string[] } {
  const logs: string[] = [];
  const events = new EventEmitter({ logger: { log: (message: string): number => logs.push(message) } } as unknown as MaplebirchCore);
  return { events, logs };
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

describe('EventEmitter listener lifecycle', () => {
  test('rejects duplicate callbacks and removes listeners by callback or description', async () => {
    const events = createEmitter();
    const values: number[] = [];
    const callback = (value: number): number => values.push(value);

    expect(events.on('custom', callback, 'named')).toBeTrue();
    expect(events.on('custom', callback, 'duplicate')).toBeFalse();
    await events.trigger('custom', 1);
    expect(events.off('custom', 'named')).toBeTrue();
    expect(events.off('custom', callback)).toBeFalse();
    expect(events.off('missing', callback)).toBeFalse();
    await events.trigger('custom', 2);

    expect(values).toEqual([1]);
  });

  test('replays sticky events to late listeners and once listeners', async () => {
    const events = createEmitter();
    const seen: string[] = [];

    await events.trigger(':language', 'CN');
    events.on(':language', (language: string) => seen.push(`on:${language}`));
    events.once(':language', (language: string) => seen.push(`once:${language}`));
    await events.trigger(':language', 'EN');

    expect(seen).toEqual(['on:CN', 'once:CN', 'on:EN']);
  });

  test('runs after callbacks once and immediately replays them for sticky events', async () => {
    const events = createEmitter();
    const seen: string[] = [];

    events.after('custom', (value: string) => seen.push(`after:${value}`));
    await events.trigger('custom', 'first');
    await events.trigger('custom', 'second');
    await events.trigger(':storyready', 'ready');
    events.after(':storyready', (value: string) => seen.push(`sticky:${value}`));

    expect(seen).toEqual(['after:first', 'sticky:ready']);
  });

  test('isolates synchronous and asynchronous listener, after, and sticky failures', async () => {
    const { events, logs } = createEmitterWithLogs();

    events.on('custom', () => {
      throw new Error('listener failed');
    });
    events.after('custom', async () => Promise.reject(new Error('after failed')));
    await events.trigger('custom');

    await events.trigger(':idbReady', 1);
    events.on(':idbReady', async () => Promise.reject(new Error('sticky failed')));
    await new Promise((resolve: (value: void) => void) => setTimeout(resolve, 0));

    expect(logs.some((message: string) => message.includes('listener failed'))).toBeTrue();
    expect(logs.some((message: string) => message.includes('after failed'))).toBeTrue();
    expect(logs.some((message: string) => message.includes('sticky failed'))).toBeTrue();
  });
});
