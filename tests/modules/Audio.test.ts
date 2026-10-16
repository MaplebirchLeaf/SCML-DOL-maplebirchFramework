import '../support/runtime';
import { expect, test } from 'bun:test';
import { Howler, type Howl, type HowlOptions } from 'howler';
import type { MaplebirchCore } from '../../src/core';
import Audio from '../../src/modules/Audio';
import Track from '../../src/modules/AudioAddon/Track';

class FakeHowl {
  public disposed = false;
  public played = false;
  public blocked = false;
  public throwOnPlay = false;
  public playCalls = 0;
  public soundId = 0;
  private ended = true;
  private level = 0;
  private position = 0;

  public constructor(
    public readonly options: HowlOptions,
    load: boolean
  ) {
    if (load) queueMicrotask(() => options.onload?.(1));
  }

  public play(): number {
    if (this.throwOnPlay) throw new Error('play failed');
    this.playCalls++;
    if (this.ended) this.soundId++;
    this.ended = false;
    if (!this.blocked) {
      this.played = true;
      const id = this.soundId;
      queueMicrotask(() => this.options.onplay?.(id));
    }
    return this.soundId;
  }

  public pause(): this {
    this.played = false;
    return this;
  }

  public stop(): this {
    this.played = false;
    this.position = 0;
    this.ended = true;
    return this;
  }

  public seek(value?: number): number | this {
    if (value === undefined) return this.position;
    this.position = value;
    return this;
  }

  public duration(): number {
    return 120;
  }

  public volume(value?: number): number | this {
    if (value === undefined) return this.level;
    this.level = value;
    return this;
  }

  public off(): this {
    for (const key of Object.keys(this.options)) if (key.startsWith('on')) delete this.options[key as keyof HowlOptions];
    return this;
  }

  public unload(): this {
    this.disposed = true;
    this.played = false;
    return this;
  }
}

class TestAudio extends Audio {
  public readonly sounds: FakeHowl[] = [];
  public holdNext = false;
  public blockNext = false;

  protected override create(options: HowlOptions): Howl {
    const howl = new FakeHowl(options, !this.holdNext);
    howl.blocked = this.blockNext;
    this.holdNext = this.blockNext = false;
    this.sounds.push(howl);
    return howl as unknown as Howl;
  }
}

function audioCore(read?: (name: string) => Promise<unknown>): MaplebirchCore {
  return {
    host: { modLoader: {} },
    once() {},
    on() {},
    trigger: async () => {},
    services: { addonPlugin: { hook() {} } },
    with: async (_stores: string[], _mode: string, callback: (tx: unknown) => unknown) =>
      await callback({ objectStore: () => ({ get: async ([, name]: string[]) => (read ? await read(name) : { value: { arrayBuffer: new Uint8Array([0, 127, 128, 255]).buffer, format: 'ogg' } }) }) })
  } as unknown as MaplebirchCore;
}

function makeAudio(read?: (name: string) => Promise<unknown>): TestAudio {
  const audio = new TestAudio(audioCore(read));
  Object.defineProperty(audio, 'log', { value: () => {} });
  audio.AutoNext = false;
  return audio;
}

function withClamp(callback: () => void): void {
  const original = Object.getOwnPropertyDescriptor(Math, 'clamp');
  Object.defineProperty(Math, 'clamp', { value: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)), configurable: true });
  try {
    callback();
  } finally {
    if (original) Object.defineProperty(Math, 'clamp', original);
    else Reflect.deleteProperty(Math, 'clamp');
  }
}

test('audio music playlists exclude ambience, effects and voices both on demand and during initialization', async () => {
  const records = ['music/town', 'ambience/rain', 'sfx/bell', 'voice/breath'].map(audioName => ({ modName: 'pack', audioName, value: { format: 'ogg' } }));
  const core = {
    host: { modLoader: {} },
    once() {},
    on() {},
    services: { addonPlugin: { hook() {} } },
    with: async (_stores: string[], _mode: string, callback: (tx: unknown) => unknown) =>
      await callback({ objectStore: () => ({ getAll: async () => records, index: () => ({ getAll: async () => records }) }) })
  } as unknown as MaplebirchCore;
  const audio = new Audio(core);
  try {
    expect((await audio.getPlaylist('pack')).tracks.map(track => track.audioName)).toEqual(['music/town']);
    await audio.preInit();
    expect((await audio.getPlaylist('pack')).tracks.map(track => track.audioName)).toEqual(['music/town']);
  } finally {
    audio.destroy();
  }
});

test('muting or setting master volume to zero cancels short effects immediately', () => {
  const originalClamp = Object.getOwnPropertyDescriptor(Math, 'clamp');
  Object.defineProperty(Math, 'clamp', { value: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)), configurable: true });
  let stops = 0;
  const audio = Object.assign(Object.create(Audio.prototype), {
    muted: false,
    volume: 1,
    effects: { stop: () => stops++ },
    currentHowl: null,
    emit() {}
  }) as Audio;
  try {
    audio.Mute = true;
    expect(stops).toBe(1);
    audio.Mute = false;
    expect(stops).toBe(1);
    audio.Volume = 0;
    expect(stops).toBe(2);
  } finally {
    audio.Mute = false;
    audio.Volume = 1;
    if (originalClamp) Object.defineProperty(Math, 'clamp', originalClamp);
    else Reflect.deleteProperty(Math, 'clamp');
  }
});

test('music uses memory sources and keeps only the mod multiplier on its Howl', async () => {
  const audio = makeAudio();
  try {
    withClamp(() => {
      audio.Volume = 0.5;
      audio.setModVolume('pack', 0.4);
    });
    expect(await audio.play(new Track('music/town', 'pack'))).toBe(true);
    const sound = audio.sounds[0];
    expect(sound.options.src).toEqual(['data:audio/ogg;base64,AH+A/w==']);
    expect(sound.options.format).toEqual(['ogg']);
    expect(sound.volume()).toBe(0.4);
    expect(Howler.volume()).toBe(0.5);
    audio.Mute = true;
    expect(sound.volume()).toBe(0.4);
    audio.Mute = false;
  } finally {
    audio.destroy();
    withClamp(() => {
      audio.Volume = 1;
    });
  }
});

test('music preserves seek, pause, resume, end and cache reuse', async () => {
  const audio = makeAudio();
  const track = new Track('music/town', 'pack');
  try {
    await audio.play(track);
    await Bun.sleep(0);
    withClamp(() => {
      expect(audio.seek(25)).toBe(true);
      expect(audio.currentTime).toBe(30);
      expect(audio.progress).toEqual({ currentTime: 30, duration: 120, percent: 25 });
      expect(audio.pause()).toBe(true);
      expect(audio.State).toBe('paused');
      expect(audio.resume()).toBe(true);
      expect(audio.currentTime).toBe(30);
      expect(audio.seekTo(60)).toBe(true);
    });
    await Bun.sleep(0);
    audio.sounds[0].options.onend?.(1);
    expect(audio.State).toBe('stopped');
    expect(await audio.play(track)).toBe(true);
    expect(audio.sounds).toHaveLength(1);
  } finally {
    audio.destroy();
  }
});

test('stop and cache clearing cancel pending Howl loads without restoring stale music', async () => {
  const audio = makeAudio();
  try {
    audio.holdNext = true;
    const old = audio.play(new Track('music/old', 'pack'));
    await Bun.sleep(0);
    expect(audio.sounds).toHaveLength(1);
    audio.stop();
    expect(await old).toBe(false);
    expect(audio.sounds[0].disposed).toBe(true);
    expect(audio.sounds[0].playCalls).toBe(0);
    audio.holdNext = true;
    const pending = audio.play(new Track('music/new', 'pack'));
    await Bun.sleep(0);
    audio.clearCache();
    expect(await pending).toBe(false);
    expect(audio.sounds[1].disposed).toBe(true);
    expect(audio.CurrentTrack).toBeNull();
  } finally {
    audio.destroy();
  }
});

test('stop clears a paused track whose pending unlock player has already been unloaded', async () => {
  const audio = makeAudio();
  try {
    audio.blockNext = true;
    await audio.play(new Track('music/town', 'pack'));
    audio.pause();
    expect(audio.stop()).toBe(true);
    expect(audio.State).toBe('stopped');
    expect(audio.CurrentTrack).toBeNull();
    expect(audio.resume()).toBe(false);
  } finally {
    audio.destroy();
  }
});

test('replacing music rejects a late database result and destroy cancels a pending decoder', async () => {
  let finishRead!: (value: unknown) => void;
  const late = new Promise(resolve => (finishRead = resolve));
  const record = { value: { arrayBuffer: new Uint8Array([1]).buffer, format: 'ogg' } };
  const audio = makeAudio(async name => (name.includes('old') ? await late : record));
  try {
    const old = audio.play(new Track('music/old', 'pack'));
    expect(await audio.play(new Track('music/current', 'pack'))).toBe(true);
    finishRead(record);
    expect(await old).toBe(false);
    expect(audio.sounds).toHaveLength(1);
    expect(audio.CurrentTrack?.audioName).toBe('music/current');
    audio.holdNext = true;
    const pending = audio.play(new Track('music/pending', 'pack'));
    await Bun.sleep(0);
    audio.destroy();
    expect(await pending).toBe(false);
    expect(audio.sounds.every(sound => sound.disposed)).toBe(true);
    expect(audio.CurrentTrack).toBeNull();
  } finally {
    audio.destroy();
  }
});

test('stopping or pausing a sound waiting for unlock unloads its queued playback', async () => {
  const audio = makeAudio();
  try {
    audio.blockNext = true;
    await audio.play(new Track('music/town', 'pack'));
    expect(audio.pause()).toBe(true);
    expect(audio.sounds[0].disposed).toBe(true);
    expect(audio.State).toBe('paused');
    expect(audio.resume()).toBe(true);
    await Bun.sleep(0);
    expect(audio.sounds).toHaveLength(2);
    expect(audio.State).toBe('playing');
    audio.blockNext = true;
    await audio.play(new Track('music/other', 'pack'));
    audio.stop();
    expect(audio.sounds[2].disposed).toBe(true);
    expect(audio.State).toBe('stopped');
  } finally {
    audio.destroy();
  }
});

test('music load and asynchronous playback errors leave no active player', async () => {
  const audio = makeAudio();
  try {
    audio.holdNext = true;
    const loading = audio.play(new Track('music/bad', 'pack'));
    await Bun.sleep(0);
    audio.sounds[0].options.onloaderror?.(1, 'decode failed');
    expect(await loading).toBe(false);
    expect(audio.sounds[0].disposed).toBe(true);
    expect(audio.State).toBe('idle');
    await audio.play(new Track('music/town', 'pack'));
    audio.sounds[1].options.onplayerror?.(1, 'play failed');
    expect(audio.State).toBe('idle');
    expect(audio.CurrentTrack).toBeNull();
    expect(audio.sounds[1].disposed).toBe(true);
    await audio.play(new Track('music/retry', 'pack'));
    await Bun.sleep(0);
    audio.pause();
    audio.sounds[2].throwOnPlay = true;
    expect(audio.resume()).toBe(false);
    expect(audio.State).toBe('idle');
    expect(audio.sounds[2].disposed).toBe(true);
  } finally {
    audio.destroy();
  }
});

test('loading listeners can clear the cache before an obsolete decode is created', async () => {
  const audio = makeAudio();
  Object.assign(audio.core, {
    trigger: async (name: string, event: { type: string }) => {
      if (name === ':audio' && event.type === 'loading') audio.clearCache();
    }
  });
  try {
    expect(await audio.play(new Track('music/town', 'pack'))).toBe(false);
    expect(audio.sounds).toHaveLength(0);
    expect(audio.CurrentTrack).toBeNull();
  } finally {
    audio.destroy();
  }
});

test('end listeners can stop music without an obsolete auto-next request', async () => {
  const audio = makeAudio();
  let next = 0;
  audio.AutoNext = true;
  audio.next = async () => {
    next++;
    return false;
  };
  Object.assign(audio.core, {
    trigger: async (name: string, event: { type: string }) => {
      if (name === ':audio' && event.type === 'end') audio.stop();
    }
  });
  try {
    await audio.play(new Track('music/town', 'pack'));
    await Bun.sleep(0);
    audio.sounds[0].options.onend?.(audio.sounds[0].soundId);
    await Bun.sleep(0);
    expect(next).toBe(0);
    expect(audio.State).toBe('stopped');
    expect(audio.CurrentTrack).toBeNull();
  } finally {
    audio.destroy();
  }
});

test('end listeners can select another track without an obsolete auto-next request', async () => {
  const audio = makeAudio();
  let next = 0;
  audio.AutoNext = true;
  audio.next = async () => {
    next++;
    return false;
  };
  Object.assign(audio.core, {
    trigger: async (name: string, event: { type: string }) => {
      if (name === ':audio' && event.type === 'end') void audio.play(new Track('music/chosen', 'pack'));
    }
  });
  try {
    await audio.play(new Track('music/town', 'pack'));
    await Bun.sleep(0);
    audio.sounds[0].options.onend?.(audio.sounds[0].soundId);
    await Bun.sleep(0);
    expect(next).toBe(0);
    expect(audio.State).toBe('playing');
    expect(audio.CurrentTrack?.audioName).toBe('music/chosen');
  } finally {
    audio.destroy();
  }
});

test('late events from an old sound id cannot change a cached Howl playing a new instance', async () => {
  const audio = makeAudio();
  const track = new Track('music/town', 'pack');
  try {
    await audio.play(track);
    await Bun.sleep(0);
    const sound = audio.sounds[0];
    const previousId = sound.soundId;
    const oldPlay = sound.options.onplay!;
    const oldEnd = sound.options.onend!;
    const oldError = sound.options.onplayerror!;
    audio.stop();
    sound.blocked = true;
    await audio.play(track);
    expect(sound.soundId).not.toBe(previousId);
    oldPlay.call(sound as unknown as Howl, previousId);
    oldError.call(sound as unknown as Howl, previousId, 'old error');
    oldEnd.call(sound as unknown as Howl, previousId);
    expect(audio.State).toBe('playing');
    expect(audio.CurrentTrack).toBe(track);
    expect(sound.disposed).toBe(false);
    // A stale onplay must not mark the blocked new instance as already started.
    audio.stop();
    expect(sound.disposed).toBe(true);
  } finally {
    audio.destroy();
  }
});

test('real Howler tracks music for its 30-second suspend timer and decodes the memory source without URL requests', async () => {
  const internals = Howler as typeof Howler & { state: string; _suspendTimer: ReturnType<typeof setTimeout> | null; _autoSuspend(): void; _howls: Howl[] };
  const original = {
    ctx: Howler.ctx,
    gain: Howler.masterGain,
    web: Howler.usingWebAudio,
    noAudio: Howler.noAudio,
    unlock: Howler.autoUnlock,
    codecs: Howler.codecs,
    state: internals.state,
    timer: internals._suspendTimer,
    volume: Howler.volume(),
    createURL: URL.createObjectURL,
    location: Object.getOwnPropertyDescriptor(window, 'location'),
    xhr: Object.getOwnPropertyDescriptor(globalThis, 'XMLHttpRequest')
  };
  const gain = () => ({
    gain: {
      value: 1,
      setValueAtTime(value: number) {
        this.value = value;
      }
    },
    connect() {},
    disconnect() {}
  });
  let suspends = 0;
  let decodes = 0;
  let requests = 0;
  let starts = 0;
  const context = {
    state: 'running',
    currentTime: 1,
    destination: {},
    sampleRate: 44100,
    createGain: gain,
    createBufferSource: () => ({
      buffer: null,
      playbackRate: { setValueAtTime() {} },
      connect() {},
      disconnect() {},
      start() {
        starts++;
      },
      stop() {}
    }),
    decodeAudioData: async (_bytes: ArrayBuffer) => {
      decodes++;
      return { duration: 120 };
    },
    resume: async () => {
      context.state = 'running';
    },
    suspend: async () => {
      suspends++;
      context.state = 'suspended';
    }
  };
  let audio: Audio | undefined;
  try {
    Howler.ctx = context as unknown as AudioContext;
    Howler.masterGain = gain() as unknown as GainNode;
    Howler.usingWebAudio = true;
    Howler.noAudio = false;
    Howler.autoUnlock = false;
    Howler.codecs = () => true;
    internals.state = 'running';
    internals._suspendTimer = null;
    internals._autoSuspend();
    expect(internals._suspendTimer).not.toBeNull();
    Object.defineProperty(window, 'location', { value: { protocol: 'file:' }, configurable: true });
    URL.createObjectURL = () => {
      throw new Error('Game CSP blocks blob URLs');
    };
    Object.defineProperty(globalThis, 'XMLHttpRequest', {
      configurable: true,
      value: class {
        constructor() {
          requests++;
          throw new Error('Memory audio must not request a URL');
        }
      }
    });
    audio = new Audio(audioCore());
    Object.defineProperty(audio, 'log', { value: () => {} });
    expect(await audio.play(new Track('music/town', 'pack'))).toBe(true);
    await Bun.sleep(5);
    expect(decodes).toBe(1);
    expect(requests).toBe(0);
    expect(internals._howls.some(howl => howl.playing())).toBe(true);
    expect(internals._suspendTimer).toBeNull();
    context.currentTime = 36;
    internals._autoSuspend();
    expect(internals._suspendTimer).toBeNull();
    expect(suspends).toBe(0);
    expect(audio.State).toBe('playing');
    audio.stop();
    internals._autoSuspend();
    expect(internals._suspendTimer).not.toBeNull();
    context.state = internals.state = 'suspended';
    expect(await audio.play(new Track('music/town', 'pack'))).toBe(true);
    // _autoResume emitted resume asynchronously, but its callback has not run yet.
    const startsBeforeCancel = starts;
    audio.stop();
    await Bun.sleep(10);
    expect(starts).toBe(startsBeforeCancel);
    expect(internals._howls.some(howl => howl.playing())).toBe(false);
  } finally {
    audio?.destroy();
    clearTimeout(internals._suspendTimer ?? undefined);
    Howler.volume(original.volume);
    Howler.ctx = original.ctx;
    Howler.masterGain = original.gain;
    Howler.usingWebAudio = original.web;
    Howler.noAudio = original.noAudio;
    Howler.autoUnlock = original.unlock;
    Howler.codecs = original.codecs;
    internals.state = original.state;
    internals._suspendTimer = original.timer;
    URL.createObjectURL = original.createURL;
    if (original.location) Object.defineProperty(window, 'location', original.location);
    else Reflect.deleteProperty(window, 'location');
    if (original.xhr) Object.defineProperty(globalThis, 'XMLHttpRequest', original.xhr);
    else Reflect.deleteProperty(globalThis, 'XMLHttpRequest');
  }
});
