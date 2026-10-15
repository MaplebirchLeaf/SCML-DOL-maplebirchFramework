import { expect, test } from 'bun:test';
import type { Howl, HowlOptions } from 'howler';
import type ModLoader from '../../src/host/ModLoader';
import Ambience from '../../src/modules/AudioAddon/Ambience';

class FakeHowl {
  public readonly fades: Array<[number, number, number]> = [];
  public played = false;
  public disposed = false;
  public blocked = false;
  public awaitingResume = false;
  public playCalls = 0;
  private level: number;

  public constructor(private readonly options: HowlOptions) {
    this.level = options.volume ?? 1;
    queueMicrotask(() => options.onload?.(1));
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
}

class TestAmbience extends Ambience {
  public readonly sounds: FakeHowl[] = [];
  public blockNext = false;
  public waitNext = false;

  protected override create(options: HowlOptions): Howl {
    const sound = new FakeHowl(options);
    sound.blocked = this.blockNext;
    sound.awaitingResume = this.waitNext;
    this.blockNext = false;
    this.waitNext = false;
    this.sounds.push(sound);
    return sound as unknown as Howl;
  }
}

test('ambience loads an optional mod ZIP track and crossfades without a raw AudioContext', async () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const revoked: string[] = [];
  let urls = 0;
  URL.createObjectURL = () => `blob:test-${++urls}`;
  URL.revokeObjectURL = url => void revoked.push(url);
  try {
    const modloader = {
      modLoader: {
        getModZip: () => ({ zip: { file: (path: string) => (path.endsWith('.ogg') ? { async: async () => new Uint8Array([1, 2, 3]) } : null) } })
      }
    } as unknown as ModLoader;
    const channel = new TestAmbience(modloader);
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
    expect(revoked).toContain('blob:test-1');
    channel.stop(0);
    expect(channel.sounds[1].disposed).toBe(true);
    expect(revoked).toContain('blob:test-2');
    expect(await channel.play('audio-pack', 'audio/missing.mp3')).toBe(false);
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
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
