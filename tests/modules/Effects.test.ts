import { expect, test } from 'bun:test';
import type { Howl, HowlOptions } from 'howler';
import type ModLoader from '../../src/host/ModLoader';
import Effects from '../../src/modules/AudioAddon/Effects';

class FakeHowl {
  public disposed = false;
  public played = false;
  public playCalls = 0;
  private level = 0;
  private readonly events = new Map<string, Array<() => void>>();

  public constructor(public readonly options: HowlOptions) {
    queueMicrotask(() => {
      if (!this.disposed) options.onload?.(1);
    });
  }

  public on(event: string, callback: () => void): this {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event)!.push(callback);
    return this;
  }

  public off(): this {
    this.events.clear();
    return this;
  }

  public emit(event: string): void {
    for (const callback of this.events.get(event) ?? []) callback();
  }

  public play(): number {
    this.played = true;
    this.playCalls++;
    queueMicrotask(() => this.emit('play'));
    return 1;
  }

  public end(): void {
    this.played = false;
    this.emit('end');
  }

  public volume(value?: number): number | this {
    if (value === undefined) return this.level;
    this.level = value;
    return this;
  }

  public unload(): this {
    this.disposed = true;
    this.played = false;
    return this;
  }
}

class TestEffects extends Effects {
  public unlocked = true;
  public audioContext: AudioContext | null = null;
  public readonly sounds: FakeHowl[] = [];

  protected override get ready(): boolean {
    return this.audioContext ? this.audioContext.state === 'running' : this.unlocked;
  }

  protected override get context(): AudioContext | null {
    return this.audioContext;
  }

  protected override create(options: HowlOptions): Howl {
    const howl = new FakeHowl(options);
    this.sounds.push(howl);
    return howl as unknown as Howl;
  }
}

function createEffects(enabled: () => boolean = () => true, read: () => Promise<Uint8Array> = async () => new Uint8Array([0, 127, 128, 255])): TestEffects {
  const modloader = {
    modLoader: { getModZip: () => ({ zip: { file: () => ({ async: read }) } }) }
  } as unknown as ModLoader;
  return new TestEffects(modloader, enabled);
}

test('effects use memory-decoded ZIP data and reuse ended sounds without interrupting other channels', async () => {
  const effects = createEffects();
  try {
    expect(await effects.play('pack', 'audio/sfx/bell.ogg', { volume: 0.3, channel: 'action', cooldownMs: 0 })).toBe(true);
    const bell = effects.sounds[0];
    expect(bell.options.src).toEqual(['data:audio/ogg;base64,AH+A/w==']);
    expect(bell.options.loop).toBe(false);
    expect(bell.options.onunlock).toBeUndefined();
    expect(bell.volume()).toBe(0.3);
    expect(await effects.play('pack', 'audio/voice/breath.ogg', { channel: 'voice' })).toBe(true);
    expect(bell.played).toBe(true);
    bell.end();
    expect(await effects.play('pack', 'audio/sfx/bell.ogg', { volume: 0.5, channel: 'action', cooldownMs: 0 })).toBe(true);
    expect(effects.sounds).toHaveLength(2);
    expect(bell.playCalls).toBe(2);
    expect(bell.volume()).toBe(0.5);
  } finally {
    effects.destroy();
    expect(effects.sounds.every(sound => sound.disposed)).toBe(true);
  }
});

test('a late error from an ended effect cannot unload its Howl reused by a new effect', async () => {
  const effects = createEffects();
  try {
    await effects.play('pack', 'audio/sfx/hit.ogg', { cooldownMs: 0 });
    const sound = effects.sounds[0];
    // Howler can already have queued a callback before off() removes its listener.
    const lateError = (sound as unknown as { events: Map<string, Array<() => void>> }).events.get('playerror')![0];
    sound.end();
    await effects.play('pack', 'audio/sfx/hit.ogg', { cooldownMs: 0 });
    lateError();
    expect(sound.disposed).toBe(false);
    expect(sound.played).toBe(true);
    expect(sound.playCalls).toBe(2);
    effects.stop('pack');
    expect(sound.disposed).toBe(true);
  } finally {
    effects.destroy();
  }
});

test('effects isolate mod channels, enforce cooldown and limit active sounds to three', async () => {
  const effects = createEffects();
  try {
    expect(await effects.play('one', 'audio/bell.ogg')).toBe(true);
    expect(await effects.play('one', 'audio/bell.ogg')).toBe(false);
    expect(await effects.play('two', 'audio/bell.ogg')).toBe(true);
    expect(await effects.play('three', 'audio/bell.ogg')).toBe(true);
    expect(effects.sounds[0].disposed).toBe(false);
    expect(await effects.play('four', 'audio/bell.ogg')).toBe(false);
    effects.sounds[0].end();
    expect(await effects.play('four', 'audio/bell.ogg')).toBe(true);
  } finally {
    effects.destroy();
  }
});

test('stopping one mod or its voice channel preserves other mods and action sounds', async () => {
  const effects = createEffects();
  try {
    await effects.play('one', 'audio/voice.ogg', { channel: 'voice' });
    await effects.play('one', 'audio/action.ogg', { channel: 'action' });
    await effects.play('two', 'audio/voice.ogg', { channel: 'voice' });
    effects.stop('one', 'voice');
    expect(effects.sounds.map(sound => sound.disposed)).toEqual([true, false, false]);
    effects.stop('one');
    expect(effects.sounds.map(sound => sound.disposed)).toEqual([true, true, false]);
  } finally {
    effects.destroy();
  }
});

test('effects keep at most eight idle sounds', async () => {
  const effects = createEffects();
  try {
    for (let i = 0; i < 10; i++) {
      expect(await effects.play('pack', `audio/${i}.ogg`, { cooldownMs: 0 })).toBe(true);
      effects.sounds[i].end();
    }
    expect(effects.sounds.filter(sound => !sound.disposed)).toHaveLength(8);
    expect(effects.sounds[0].disposed).toBe(true);
    expect(effects.sounds[1].disposed).toBe(true);
    expect(await effects.play('pack', 'audio/9.ogg', { cooldownMs: 0 })).toBe(true);
    expect(effects.sounds).toHaveLength(10);
  } finally {
    effects.destroy();
  }
});

test('locked audio skips short effects instead of queuing an old sound for unlock', async () => {
  const effects = createEffects();
  effects.unlocked = false;
  try {
    expect(await effects.play('pack', 'audio/bell.ogg', { cooldownMs: 0 })).toBe(false);
    expect(effects.sounds[0].playCalls).toBe(0);
    effects.unlocked = true;
    expect(effects.sounds[0].playCalls).toBe(0);
    expect(await effects.play('pack', 'audio/bell.ogg', { cooldownMs: 0 })).toBe(true);
    expect(effects.sounds).toHaveLength(1);
  } finally {
    effects.destroy();
  }
});

test('an idle context that previously ran resumes before the current effect without disabling automatic suspension', async () => {
  let resumes = 0;
  const context = {
    state: 'suspended',
    currentTime: 30,
    resume: async () => {
      resumes++;
      context.state = 'running';
    }
  };
  const effects = createEffects();
  effects.audioContext = context as unknown as AudioContext;
  try {
    expect(await effects.play('pack', 'audio/bell.ogg')).toBe(true);
    expect(resumes).toBe(1);
    expect(effects.sounds[0].playCalls).toBe(1);
  } finally {
    effects.destroy();
  }
});

test('an initially locked context is not resumed or given a pending short effect', async () => {
  let resumes = 0;
  const effects = createEffects();
  effects.audioContext = {
    state: 'suspended',
    currentTime: 0,
    resume: async () => {
      resumes++;
    }
  } as unknown as AudioContext;
  try {
    expect(await effects.play('pack', 'audio/bell.ogg')).toBe(false);
    expect(resumes).toBe(0);
    expect(effects.sounds[0].playCalls).toBe(0);
  } finally {
    effects.destroy();
  }
});

test('stopping a mod during idle resume cancels its sound without stopping another mod', async () => {
  let completeResume!: () => void;
  const resumed = new Promise<void>(resolve => (completeResume = resolve));
  const context = { state: 'suspended', currentTime: 30, resume: () => resumed };
  const effects = createEffects();
  effects.audioContext = context as unknown as AudioContext;
  try {
    const pending = effects.play('one', 'audio/bell.ogg');
    await Bun.sleep(0);
    effects.stop('one');
    expect(await pending).toBe(false);
    effects.audioContext = null;
    expect(await effects.play('two', 'audio/bell.ogg')).toBe(true);
    completeResume();
    await Bun.sleep(0);
    expect(effects.sounds[0].playCalls).toBe(0);
    expect(effects.sounds[0].disposed).toBe(true);
    expect(effects.sounds[1].played).toBe(true);
  } finally {
    effects.destroy();
  }
});

test('an expired idle resume cannot play its old effect after the context resumes', async () => {
  let completeResume!: () => void;
  const resumed = new Promise<void>(resolve => (completeResume = resolve));
  const context = { state: 'suspended', currentTime: 30, resume: () => resumed };
  const effects = createEffects();
  effects.audioContext = context as unknown as AudioContext;
  try {
    const pending = effects.play('pack', 'audio/bell.ogg');
    expect(await pending).toBe(false);
    context.state = 'running';
    completeResume();
    await Bun.sleep(0);
    expect(effects.sounds[0].playCalls).toBe(0);
    expect(effects.sounds[0].disposed).toBe(true);
  } finally {
    effects.destroy();
  }
});

test('stopping or replacing a channel cancels its pending ZIP read', async () => {
  let resolveBytes!: (bytes: Uint8Array) => void;
  const bytes = new Promise<Uint8Array>(resolve => (resolveBytes = resolve));
  const effects = createEffects(
    () => true,
    () => bytes
  );
  try {
    const old = effects.play('pack', 'audio/old.ogg', { channel: 'voice', cooldownMs: 0 });
    const current = effects.play('pack', 'audio/new.ogg', { channel: 'voice', cooldownMs: 0 });
    resolveBytes(new Uint8Array([1]));
    expect(await old).toBe(false);
    expect(await current).toBe(true);
    expect(effects.sounds).toHaveLength(1);
    effects.stop('pack', 'voice');
    expect(effects.sounds[0].disposed).toBe(true);
    effects.unlocked = true;
    expect(effects.sounds[0].playCalls).toBe(1);
  } finally {
    effects.destroy();
  }
});

test('disabled audio skips effects and rechecks the setting after asynchronous loading', async () => {
  let enabled = false;
  let resolveBytes!: (bytes: Uint8Array) => void;
  const bytes = new Promise<Uint8Array>(resolve => (resolveBytes = resolve));
  const effects = createEffects(
    () => enabled,
    () => bytes
  );
  try {
    expect(await effects.play('pack', 'audio/bell.ogg')).toBe(false);
    expect(effects.sounds).toHaveLength(0);
    enabled = true;
    const pending = effects.play('pack', 'audio/bell.ogg');
    enabled = false;
    resolveBytes(new Uint8Array([1]));
    expect(await pending).toBe(false);
    expect(effects.sounds[0].playCalls).toBe(0);
    expect(await effects.play('pack', 'audio/bell.ogg', { volume: 0 })).toBe(false);
  } finally {
    effects.destroy();
  }
});

test('effects expire delayed loads and do not play them after a scene has moved on', async () => {
  let resolveBytes!: (bytes: Uint8Array) => void;
  const bytes = new Promise<Uint8Array>(resolve => (resolveBytes = resolve));
  const effects = createEffects(
    () => true,
    () => bytes
  );
  try {
    const pending = effects.play('pack', 'audio/bell.ogg');
    await Bun.sleep(1510);
    resolveBytes(new Uint8Array([1]));
    expect(await pending).toBe(false);
    expect(effects.sounds).toHaveLength(0);
  } finally {
    effects.destroy();
  }
});

test('asynchronous playback errors unload the sound and never register an unlock retry', async () => {
  const effects = createEffects();
  try {
    await effects.play('pack', 'audio/bell.ogg');
    const sound = effects.sounds[0];
    sound.emit('playerror');
    expect(sound.disposed).toBe(true);
    expect(sound.options.onunlock).toBeUndefined();
    expect(sound.playCalls).toBe(1);
  } finally {
    effects.destroy();
  }
});
