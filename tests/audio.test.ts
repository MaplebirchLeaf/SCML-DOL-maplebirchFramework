import './helpers/runtime';
import { describe, expect, test } from 'bun:test';
import type { MaplebirchCore } from '../src/core';

const { default: AudioManager } = await import('../src/modules/Audio');
const { default: Track } = await import('../src/modules/AudioAddon/Track');

function createFixture() {
  const decodeTasks: Array<ReturnType<typeof Promise.withResolvers<AudioBuffer>>> = [];
  const firstDecode = Promise.withResolvers<void>();
  const gains: Array<{ connected: boolean; gain: { value: number }; connect(): void; disconnect(): void }> = [];
  const playback: boolean[] = [];
  let reads = 0;
  const record = { value: { arrayBuffer: new ArrayBuffer(8), format: 'wav' } };
  const context = {
    currentTime: 0,
    destination: {},
    resume: async () => undefined,
    decodeAudioData() {
      const task = Promise.withResolvers<AudioBuffer>();
      decodeTasks.push(task);
      firstDecode.resolve();
      return task.promise;
    },
    createGain() {
      const gain = {
        gain: { value: 0 },
        connected: false,
        connect() {
          this.connected = true;
        },
        disconnect() {
          this.connected = false;
        }
      };
      gains.push(gain);
      return gain;
    },
    createBufferSource() {
      return {
        buffer: null,
        onended: null,
        gain: null as (typeof gains)[number] | null,
        connect(gain: (typeof gains)[number]) {
          this.gain = gain;
        },
        disconnect() {},
        start() {
          playback.push(this.gain?.connected ?? false);
        },
        stop() {}
      };
    }
  };
  const core = {
    once() {},
    on() {},
    trigger: async () => undefined,
    addon: { hook() {} },
    howler: { Howler: { ctx: context, mute() {}, volume() {} } },
    idb: {
      async withTransaction(_stores: string[], _mode: string, callback: (tx: any) => unknown) {
        return callback({
          objectStore: () => ({
            get: async () => {
              reads++;
              return record;
            },
            delete: async () => undefined
          })
        });
      }
    }
  } as unknown as MaplebirchCore;
  const audio = new AudioManager(core);
  const createBuffer = () => ({ duration: 60 }) as AudioBuffer;
  return { audio, decodeTasks, firstDecode: firstDecode.promise, gains, playback, createBuffer, reads: () => reads };
}

describe('AudioManager concurrent loading', () => {
  test('keeps the latest pending player cached when older decodes complete in the same turn', async () => {
    const fixture = createFixture();
    const tracks = ['A', 'B', 'C', 'D'].map(name => new Track(name, 'demo'));
    const requests = tracks.map(track => fixture.audio.play(track));
    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(fixture.decodeTasks).toHaveLength(4);
      for (const task of [...fixture.decodeTasks].reverse()) task.resolve(fixture.createBuffer());

      expect(await Promise.all(requests)).toEqual([false, false, false, true]);
      expect(fixture.audio.CurrentTrack).toBe(tracks[3]);
      expect(fixture.audio.State).toBe('playing');
      expect(fixture.playback).toEqual([true]);
      expect(fixture.gains.filter(gain => gain.connected)).toHaveLength(3);
    } finally {
      fixture.audio.destroy();
    }
  });

  test('shares one decode and keeps the player connected for the latest same-track request', async () => {
    const fixture = createFixture();
    const firstTrack = new Track('song', 'demo');
    const secondTrack = new Track('song', 'demo');
    const first = fixture.audio.play(firstTrack);
    const second = fixture.audio.play(secondTrack);
    try {
      await fixture.firstDecode;
      for (const task of fixture.decodeTasks) task.resolve(fixture.createBuffer());
      expect(await Promise.all([first, second])).toEqual([false, true]);
      expect(fixture.decodeTasks).toHaveLength(1);
      expect(fixture.reads()).toBe(1);
      expect(fixture.playback).toEqual([true]);
      expect(secondTrack.format).toBe('wav');
      expect(secondTrack.duration).toBe(60);
      const cachedTrack = new Track('song', 'demo');
      expect(await fixture.audio.play(cachedTrack)).toBe(true);
      expect(fixture.decodeTasks).toHaveLength(1);
      expect(cachedTrack.format).toBe('wav');
      expect(cachedTrack.duration).toBe(60);
    } finally {
      fixture.audio.destroy();
    }
  });

  test('allows retry after a shared decode fails', async () => {
    const fixture = createFixture();
    try {
      const first = fixture.audio.play(new Track('song', 'demo'));
      const second = fixture.audio.play(new Track('song', 'demo'));
      await fixture.firstDecode;
      for (const task of fixture.decodeTasks) task.reject(new Error('decode failed'));
      expect(await Promise.all([first, second])).toEqual([false, false]);
      const retry = fixture.audio.play(new Track('song', 'demo'));
      await new Promise(resolve => setTimeout(resolve, 0));
      fixture.decodeTasks.at(-1)!.resolve(fixture.createBuffer());
      expect(await retry).toBe(true);
      expect(fixture.decodeTasks).toHaveLength(2);
      expect(fixture.playback).toEqual([true]);
    } finally {
      fixture.audio.destroy();
    }
  });

  for (const action of ['clearCache', 'destroy'] as const) {
    test(`${action} prevents an in-flight decode from recreating cached resources`, async () => {
      const fixture = createFixture();
      const first = fixture.audio.play(new Track('song', 'demo'));
      await fixture.firstDecode;
      fixture.audio[action]();
      fixture.decodeTasks[0].resolve(fixture.createBuffer());
      expect(await first).toBe(false);
      expect(fixture.gains.filter(gain => gain.connected)).toHaveLength(0);
      expect(fixture.playback).toEqual([]);
      fixture.audio.destroy();
    });
  }

  test('deleting a track cancels its in-flight decode', async () => {
    const fixture = createFixture();
    try {
      const pending = fixture.audio.play(new Track('song', 'demo'));
      await fixture.firstDecode;
      expect(await fixture.audio.delete('demo', 'song')).toBe(true);
      fixture.decodeTasks[0].resolve(fixture.createBuffer());
      expect(await pending).toBe(false);
      expect(fixture.gains.filter(gain => gain.connected)).toHaveLength(0);
      expect(fixture.playback).toEqual([]);
    } finally {
      fixture.audio.destroy();
    }
  });

  test('a cancelled decode cannot overwrite a replacement load or remove its pending task', async () => {
    const fixture = createFixture();
    try {
      const old = fixture.audio.play(new Track('song', 'demo'));
      await fixture.firstDecode;
      fixture.audio.clearCache();
      const replacement = fixture.audio.play(new Track('song', 'demo'));
      await new Promise(resolve => setTimeout(resolve, 0));
      fixture.decodeTasks[0].resolve(fixture.createBuffer());
      expect(await old).toBe(false);
      expect(fixture.gains).toHaveLength(0);
      const latestTrack = new Track('song', 'demo');
      const latest = fixture.audio.play(latestTrack);
      await new Promise(resolve => setTimeout(resolve, 0));
      for (const task of fixture.decodeTasks.slice(1)) task.resolve(fixture.createBuffer());
      expect(await Promise.all([replacement, latest])).toEqual([false, true]);
      expect(fixture.decodeTasks).toHaveLength(2);
      expect(fixture.playback).toEqual([true]);
      expect(fixture.audio.CurrentTrack).toBe(latestTrack);
    } finally {
      fixture.audio.destroy();
    }
  });
});
