import { Howler, type Howl, type HowlOptions } from 'howler';
import Sound from './Sound';
import type ModLoader from '../../host/ModLoader';
import { bytesToBase64 } from '../../utils/binary';

interface EffectOptions {
  volume?: number;
  channel?: string;
  cooldownMs?: number;
}

interface Effect {
  key: string;
  modName: string;
  channel: string;
  sound: string;
  howl?: Howl;
  cancel?: () => void;
  timer: ReturnType<typeof setTimeout>;
}

class Effects {
  private readonly active = new Map<string, Effect>();
  private readonly cache = new Map<string, Howl>();
  private readonly recent = new Map<string, number>();

  public constructor(
    private readonly modloader: ModLoader,
    private readonly enabled: () => boolean = () => true
  ) {}

  protected create(options: HowlOptions): Howl {
    return new Sound(options);
  }

  protected get ready(): boolean {
    return this.context?.state === 'running';
  }

  protected get context(): AudioContext | null {
    return Howler.usingWebAudio ? Howler.ctx : null;
  }

  public async play(modName: string, path: string, options: EffectOptions = {}): Promise<boolean> {
    const volume = Number.isFinite(options.volume ?? 1) ? Math.min(1, Math.max(0, options.volume ?? 1)) : 0;
    if (!volume || !this.enabled()) return false;
    const channel = options.channel ?? 'default';
    const key = JSON.stringify([modName, channel]);
    const cooldown = Number.isFinite(options.cooldownMs ?? 150) ? Math.max(0, options.cooldownMs ?? 150) : 150;
    const previous = this.active.get(key);
    if (Date.now() - (this.recent.get(key) ?? -Infinity) < cooldown) return false;
    if (!previous && this.active.size >= 3) return false;
    if (previous) this.dispose(previous);
    const sound = JSON.stringify([modName, path]);
    const effect: Effect = {
      key,
      modName,
      channel,
      sound,
      // A slow load or suspended context must not replay an old action later.
      timer: setTimeout(() => this.dispose(effect), 1500)
    };
    this.active.set(key, effect);
    this.recent.delete(key);
    this.recent.set(key, Date.now());
    while (this.recent.size > 32) this.recent.delete(this.recent.keys().next().value!);
    try {
      const howl = await this.load(effect, modName, path);
      if (!howl || this.active.get(key) !== effect) return false;
      if (!this.enabled()) {
        this.finish(effect);
        return false;
      }
      const ready = await this.resume(effect);
      if (this.active.get(key) !== effect) return false;
      if (!ready || !this.enabled()) {
        this.finish(effect);
        return false;
      }
      howl.on('play', () => clearTimeout(effect.timer));
      howl.on('playerror', () => this.dispose(effect));
      howl.on('end', () => this.finish(effect));
      howl.volume(volume);
      howl.play();
      return this.active.get(key) === effect;
    } catch (error) {
      this.dispose(effect);
      throw error;
    }
  }

  public stop(modName?: string, channel?: string): void {
    for (const effect of this.active.values()) if ((modName === undefined || effect.modName === modName) && (channel === undefined || effect.channel === channel)) this.dispose(effect);
  }

  public destroy(): void {
    this.stop();
    for (const howl of this.cache.values()) howl.unload();
    this.cache.clear();
    this.recent.clear();
  }

  private async resume(effect: Effect): Promise<boolean> {
    if (this.ready) return true;
    const context = this.context;
    // Time advances only after the context has run. Never queue an initial audio unlock.
    if (!context || context.currentTime <= 0 || context.state === 'closed') return false;
    return await new Promise<boolean>(resolve => {
      effect.cancel = () => resolve(false);
      void context.resume().then(
        () => {
          effect.cancel = undefined;
          resolve(this.ready);
        },
        () => {
          effect.cancel = undefined;
          resolve(false);
        }
      );
    });
  }

  private async load(effect: Effect, modName: string, path: string): Promise<Howl | null> {
    const cached = this.cache.get(effect.sound);
    if (cached) {
      this.cache.delete(effect.sound);
      effect.howl = cached;
      return cached;
    }
    const file = this.modloader.modLoader?.getModZip(modName)?.zip.file(path);
    if (!file) {
      this.dispose(effect);
      return null;
    }
    const bytes = await file.async('uint8array');
    if (this.active.get(effect.key) !== effect) return null;
    const format = path.split('.').pop()?.toLowerCase() ?? '';
    return await new Promise<Howl | null>((resolve, reject) => {
      effect.cancel = () => resolve(null);
      effect.howl = this.create({
        src: [`data:audio/${format};base64,${bytesToBase64(bytes)}`],
        format: [format],
        loop: false,
        volume: 0,
        pool: 1,
        onload: () => {
          effect.cancel = undefined;
          resolve(effect.howl!);
        },
        onloaderror: (_id, error) => {
          effect.cancel = undefined;
          reject(error);
        }
      });
    });
  }

  private finish(effect: Effect): void {
    if (this.active.get(effect.key) !== effect || !effect.howl) return;
    clearTimeout(effect.timer);
    this.active.delete(effect.key);
    effect.howl.off();
    this.cache.get(effect.sound)?.unload();
    this.cache.delete(effect.sound);
    this.cache.set(effect.sound, effect.howl);
    while (this.cache.size > 8) {
      const key = this.cache.keys().next().value!;
      this.cache.get(key)!.unload();
      this.cache.delete(key);
    }
  }

  private dispose(effect: Effect): void {
    if (this.active.get(effect.key) !== effect) return;
    clearTimeout(effect.timer);
    effect.cancel?.();
    effect.cancel = undefined;
    // Unload clears Howler's pending resume callback as well as the playing sound.
    effect.howl?.off();
    effect.howl?.unload();
    this.active.delete(effect.key);
  }
}

export default Effects;
