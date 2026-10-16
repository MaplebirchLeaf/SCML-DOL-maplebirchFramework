import { expect, test } from 'bun:test';
import type { Howl, HowlOptions } from 'howler';
import type ModLoader from '../../src/host/ModLoader';
import Ambience from '../../src/modules/AudioAddon/Ambience';
import { bytesToBase64 } from '../../src/utils/binary';

class FakeHowl {
  public readonly fades: Array<[number, number, number]> = [];
  public played = false;
  public disposed = false;
  public blocked = false;
  public awaitingResume = false;
  public playCalls = 0;
  private level: number;

  public constructor(
    public readonly options: HowlOptions,
    load = true
  ) {
    this.level = options.volume ?? 1;
    if (load) queueMicrotask(() => options.onload?.(1));
  }

  public play(): number {
    this.playCalls++;
    if (this.blocked) {
      queueMicrotask(() => this.emit('playerror', 1, 'Playback requires user interaction'));
      return 1;
    }
    if (this.awaitingResume) return 1;
    this.played = true;
    queueMicrotask(() => this.emit('play', 1));
    return 1;
  }

  public playing(): boolean {
    return this.played;
  }

  public unlock(): void {
    this.blocked = false;
    if (this.awaitingResume) {
      this.awaitingResume = false;
      this.played = true;
      this.emit('play', 1);
    }
    this.emit('unlock');
  }

  private emit(event: string, ...args: unknown[]): void {
    const option = this.options[`on${event}` as keyof HowlOptions];
    if (typeof option === 'function') (option as (...args: unknown[]) => void).call(this, ...args);
  }

  public volume(value?: number): number | this {
    if (value == null) return this.level;
    this.level = value;
    return this;
  }

  public fade(from: number, to: number, duration: number): this {
    this.fades.push([from, to, duration]);
    this.level = to;
    return this;
  }

  public stop(): this {
    this.played = false;
    return this;
  }

  public unload(): this {
    this.disposed = true;
    return this;
  }

  public off(): this {
    return this;
  }
}

class TestAmbience extends Ambience {
  public readonly sounds: FakeHowl[] = [];
  public blockNext = false;
  public waitNext = false;
  public holdNextLoad = false;

  protected override create(options: HowlOptions): Howl {
    const sound = new FakeHowl(options, !this.holdNextLoad);
    this.holdNextLoad = false;
    sound.blocked = this.blockNext;
    sound.awaitingResume = this.waitNext;
    this.blockNext = false;
    this.waitNext = false;
    this.sounds.push(sound);
    return sound as unknown as Howl;
  }
}

test('ambience decodes ZIP bytes in memory without creating blob URLs', async () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const bytes = new Uint8Array([11, 0, 127, 128, 255, 12]).subarray(1, 5);
  const modloader = {
    modLoader: { getModZip: () => ({ zip: { file: () => ({ async: async () => bytes }) } }) }
  } as unknown as ModLoader;
  const channel = new TestAmbience(modloader);
  URL.createObjectURL = () => {
    throw new Error('Game CSP blocks blob audio requests');
  };
  URL.revokeObjectURL = () => {
    throw new Error('In-memory audio must not manage blob URLs');
  };
  try {
    expect(await channel.play('audio-pack', 'audio/rain.ogg', 0.3, 0)).toBe(true);
    const options = channel.sounds[0].options;
    expect(options.src).toEqual([`data:audio/ogg;base64,${bytesToBase64(bytes)}`]);
    expect(options.src).toEqual(['data:audio/ogg;base64,AH+A/w==']);
    const source = (options.src as string[])[0];
    expect(Uint8Array.from(atob(source.split(',')[1]), character => character.charCodeAt(0))).toEqual(bytes);
    expect(options.format).toEqual(['ogg']);
    expect(options.loop).toBe(true);
    channel.stop(0);
    expect(channel.sounds[0].disposed).toBe(true);
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    channel.stop(0);
  }
});

test('ambience loads an optional mod ZIP track and crossfades without a raw AudioContext', async () => {
  const modloader = {
    modLoader: {
      getModZip: () => ({ zip: { file: (path: string) => (path.endsWith('.ogg') ? { async: async () => new Uint8Array([1, 2, 3]) } : null) } })
    }
  } as unknown as ModLoader;
  const channel = new TestAmbience(modloader);
  try {
    expect(await channel.play('audio-pack', 'audio/rain.ogg', 0.3, 0)).toBe(true);
    expect(channel.sounds[0].played).toBe(true);
    expect(channel.sounds[0].volume()).toBe(0.3);
    expect(await channel.play('audio-pack', 'audio/rain.ogg', 0.5, 0)).toBe(true);
    expect(channel.sounds).toHaveLength(1);
    expect(channel.sounds[0].volume()).toBe(0.5);
    expect(await channel.play('audio-pack', 'audio/wind.ogg', 0.2, 5)).toBe(true);
    expect(channel.sounds[1].fades).toContainEqual([0, 0.2, 5]);
    expect(channel.sounds[0].fades).toContainEqual([0.5, 0, 5]);
    await Bun.sleep(10);
    expect(channel.sounds[0].disposed).toBe(true);
    channel.stop(0);
    expect(channel.sounds[1].disposed).toBe(true);
    expect(await channel.play('audio-pack', 'audio/missing.mp3')).toBe(false);
  } finally {
    channel.stop(0);
  }
});

function createChannel(): TestAmbience {
  const modloader = {
    modLoader: { getModZip: () => ({ zip: { file: () => ({ async: async () => new Uint8Array([1, 2, 3]) }) } }) }
  } as unknown as ModLoader;
  return new TestAmbience(modloader);
}

test('refreshing a playing ambience reuses the loop without starting another sound', async () => {
  const channel = createChannel();
  try {
    await channel.play('audio-pack', 'audio/rain.ogg', 0.3, 0);
    await channel.play('audio-pack', 'audio/rain.ogg', 0.4, 0);
    expect(channel.sounds).toHaveLength(1);
    expect(channel.sounds[0].playCalls).toBe(1);
    expect(channel.sounds[0].playing()).toBe(true);
    expect(channel.sounds[0].volume()).toBe(0.4);
  } finally {
    channel.stop(0);
  }
});

test('refreshing the same ambience restarts a loop that stopped unexpectedly', async () => {
  const channel = createChannel();
  try {
    await channel.play('audio-pack', 'audio/rain.ogg', 0.3, 0);
    const sound = channel.sounds[0];
    sound.stop();
    await channel.play('audio-pack', 'audio/rain.ogg', 0.4, 0);
    expect(channel.sounds).toHaveLength(1);
    expect(sound.playCalls).toBe(2);
    expect(sound.playing()).toBe(true);
    expect(sound.volume()).toBe(0.4);
  } finally {
    channel.stop(0);
  }
});

test('refreshing an ambience waiting for context resume does not queue duplicate playback', async () => {
  const channel = createChannel();
  channel.waitNext = true;
  try {
    await channel.play('audio-pack', 'audio/rain.ogg', 0.3, 0);
    const sound = channel.sounds[0];
    expect(sound.playing()).toBe(false);
    await channel.play('audio-pack', 'audio/rain.ogg', 0.4, 1500);
    channel.setVolume(0.5, 100);
    await channel.play('audio-pack', 'audio/rain.ogg', 0.6, 1500);
    expect(sound.playCalls).toBe(1);
    expect(sound.fades).toHaveLength(0);
    sound.unlock();
    await Bun.sleep(0);
    expect(sound.playing()).toBe(true);
    expect(sound.playCalls).toBe(1);
    expect(channel.sounds).toHaveLength(1);
    expect(sound.volume()).toBe(0.6);
  } finally {
    channel.stop(0);
  }
});

test('an asynchronous playback error retries the ambience after audio unlock', async () => {
  const channel = createChannel();
  channel.blockNext = true;
  try {
    const pending = channel.play('audio-pack', 'audio/rain.ogg', 0.3, 0);
    await Bun.sleep(0);
    const sound = channel.sounds[0];
    expect(sound.playing()).toBe(false);
    expect(sound.playCalls).toBe(1);
    sound.unlock();
    await pending;
    await Bun.sleep(0);
    expect(sound.playing()).toBe(true);
    expect(sound.playCalls).toBe(2);
    expect(sound.volume()).toBe(0.3);
  } finally {
    channel.stop(0);
  }
});

test('unlocking after a scene change does not revive the previous ambience', async () => {
  const channel = createChannel();
  channel.blockNext = true;
  try {
    const pending = channel.play('audio-pack', 'audio/rain.ogg', 0.3, 0);
    await Bun.sleep(0);
    const previous = channel.sounds[0];
    await channel.play('audio-pack', 'audio/wind.ogg', 0.4, 0);
    previous.unlock();
    await pending;
    await Bun.sleep(0);
    expect(previous.playCalls).toBe(1);
    expect(previous.playing()).toBe(false);
    expect(previous.disposed).toBe(true);
    expect(channel.sounds[1].playing()).toBe(true);
  } finally {
    channel.stop(0);
  }
});

test('unlocking after stopping ambience does not restart the old loop', async () => {
  const channel = createChannel();
  channel.blockNext = true;
  const pending = channel.play('audio-pack', 'audio/rain.ogg', 0.3, 0);
  await Bun.sleep(0);
  const sound = channel.sounds[0];
  channel.stop(0);
  sound.unlock();
  await pending;
  await Bun.sleep(0);
  expect(sound.playCalls).toBe(1);
  expect(sound.playing()).toBe(false);
  expect(sound.disposed).toBe(true);
});

test('stopping ambience cancels a ZIP read before playback starts', async () => {
  let resolveBytes!: (bytes: Uint8Array) => void;
  const bytes = new Promise<Uint8Array>(resolve => (resolveBytes = resolve));
  const modloader = {
    modLoader: { getModZip: () => ({ zip: { file: () => ({ async: () => bytes }) } }) }
  } as unknown as ModLoader;
  const channel = new TestAmbience(modloader);
  const playing = channel.play('audio-pack', 'audio/rain.ogg');
  channel.stop(0);
  resolveBytes(new Uint8Array([1, 2, 3]));
  expect(await playing).toBe(false);
  expect(channel.sounds).toHaveLength(0);
});

test('environment and weather layers refresh independently and stop by layer', async () => {
  const channel = createChannel();
  try {
    expect(await channel.play('pack', 'audio/sea.ogg', 0.3, 0, 'environment')).toBe(true);
    expect(await channel.play('pack', 'audio/rain.ogg', 0.4, 0, 'weather')).toBe(true);
    expect(await channel.play('pack', 'audio/sea.ogg', 0.5, 0, 'environment')).toBe(true);
    expect(channel.sounds).toHaveLength(2);
    expect(channel.sounds.every(sound => sound.playCalls === 1 && sound.played)).toBe(true);
    channel.setVolume(0.2, 0, 'weather');
    expect(channel.sounds[0].volume()).toBe(0.5);
    expect(channel.sounds[1].volume()).toBe(0.2);
    channel.stop(0, 'weather');
    expect(channel.sounds[0].disposed).toBe(false);
    expect(channel.sounds[1].disposed).toBe(true);
    expect(await channel.play('pack', 'audio/wind.ogg', 0.2, 0, 'weather')).toBe(true);
  } finally {
    channel.stop(0);
    expect(channel.sounds.every(sound => sound.disposed)).toBe(true);
  }
});

test('ambience limits active layers and fading tails', async () => {
  const channel = createChannel();
  try {
    for (let layer = 0; layer < 4; layer++) expect(await channel.play('pack', 'audio/rain.ogg', 0.3, 0, String(layer))).toBe(true);
    expect(await channel.play('pack', 'audio/wind.ogg', 0.3, 0, 'fifth')).toBe(false);
    for (let track = 0; track < 6; track++) await channel.play('pack', `audio/${track}.ogg`, 0.3, 1000, '0');
    expect(channel.sounds.filter(sound => !sound.disposed)).toHaveLength(8);
  } finally {
    channel.stop(0);
    expect(channel.sounds.every(sound => sound.disposed)).toBe(true);
  }
});

test('stopping one ambience layer immediately also clears its fading tails', async () => {
  const channel = createChannel();
  try {
    await channel.play('pack', 'audio/rain.ogg', 0.3, 0, 'weather');
    await channel.play('pack', 'audio/sea.ogg', 0.3, 0, 'place');
    await channel.play('pack', 'audio/wind.ogg', 0.3, 1000, 'weather');
    channel.stop(0, 'weather');
    expect(channel.sounds.map(sound => sound.disposed)).toEqual([true, false, true]);
  } finally {
    channel.stop(0);
  }
});

test('stopping one ambience layer cancels its pending read without cancelling another layer', async () => {
  let resolveBytes!: (bytes: Uint8Array) => void;
  const bytes = new Promise<Uint8Array>(resolve => (resolveBytes = resolve));
  const modloader = {
    modLoader: { getModZip: () => ({ zip: { file: (path: string) => ({ async: () => (path.includes('rain') ? bytes : Promise.resolve(new Uint8Array([1]))) }) } }) }
  } as unknown as ModLoader;
  const channel = new TestAmbience(modloader);
  try {
    const rain = channel.play('pack', 'audio/rain.ogg', 0.2, 0, 'weather');
    await channel.play('pack', 'audio/sea.ogg', 0.3, 0, 'environment');
    channel.stop(0, 'weather');
    resolveBytes(new Uint8Array([1]));
    expect(await rain).toBe(false);
    expect(channel.sounds).toHaveLength(1);
    expect(channel.sounds[0].playing()).toBe(true);
  } finally {
    channel.stop(0);
  }
});

test('replacing an ambience layer releases its pending decoder before starting the next track', async () => {
  const channel = createChannel();
  channel.holdNextLoad = true;
  try {
    const old = channel.play('pack', 'audio/old.ogg', 0.2, 0, 'weather');
    await Bun.sleep(0);
    expect(channel.sounds).toHaveLength(1);
    expect(await channel.play('pack', 'audio/new.ogg', 0.2, 0, 'weather')).toBe(true);
    expect(await old).toBe(false);
    expect(channel.sounds[0].disposed).toBe(true);
    expect(channel.sounds[1].playing()).toBe(true);
  } finally {
    channel.stop(0);
  }
});

test('a failed ambience ZIP read releases its reserved layer', async () => {
  const modloader = {
    modLoader: {
      getModZip: () => ({
        zip: { file: (path: string) => ({ async: () => (path.includes('bad') ? Promise.reject(new Error('read failed')) : Promise.resolve(new Uint8Array([1]))) }) }
      })
    }
  } as unknown as ModLoader;
  const channel = new TestAmbience(modloader);
  try {
    await expect(channel.play('pack', 'audio/bad.ogg', 0.2, 0, 'bad')).rejects.toThrow('read failed');
    for (let i = 0; i < 4; i++) expect(await channel.play('pack', 'audio/rain.ogg', 0.2, 0, String(i))).toBe(true);
  } finally {
    channel.stop(0);
  }
});
