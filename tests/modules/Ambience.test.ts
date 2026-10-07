import { expect, test } from 'bun:test';
import type { Howl, HowlOptions } from 'howler';
import type ModLoader from '../../src/host/ModLoader';
import Ambience from '../../src/modules/AudioAddon/Ambience';

class FakeHowl {
  public readonly fades: Array<[number, number, number]> = [];
  public played = false;
  public disposed = false;
  private level: number;

  public constructor(options: HowlOptions) {
    this.level = options.volume ?? 1;
    queueMicrotask(() => options.onload?.(1));
  }

  public play(): number {
    this.played = true;
    return 1;
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

  protected override create(options: HowlOptions): Howl {
    const sound = new FakeHowl(options);
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
