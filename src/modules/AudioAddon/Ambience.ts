import type { Howl, HowlOptions } from 'howler';
import Sound from './Sound';
import type ModLoader from '../../host/ModLoader';
import { bytesToBase64 } from '../../utils/binary';

interface Loop {
  key: string;
  layer: string;
  howl: Howl;
  id?: number;
  pending: boolean;
}

interface Channel {
  request: number;
  active: Loop | null;
  cancel?: () => void;
}

class Ambience {
  private readonly channels = new Map<string, Channel>();
  private readonly fading = new Map<Loop, ReturnType<typeof setTimeout>>();

  public constructor(private readonly modloader: ModLoader) {}

  protected create(options: HowlOptions): Howl {
    return new Sound(options);
  }

  public async play(modName: string, path: string, volume = 1, fadeMs = 1000, layer = 'default'): Promise<boolean> {
    let channel = this.channels.get(layer);
    if (!channel) {
      if (this.channels.size >= 4) return false;
      channel = { request: 0, active: null };
      this.channels.set(layer, channel);
    }
    const key = JSON.stringify([modName, path]);
    const targetVolume = this.clamp(volume);
    const duration = this.duration(fadeMs);
    channel.cancel?.();
    channel.cancel = undefined;
    const request = ++channel.request;
    if (channel.active?.key === key) {
      this.resume(channel.active);
      this.setVolume(targetVolume, duration, layer);
      return true;
    }
    const file = this.modloader.modLoader?.getModZip(modName)?.zip.file(path);
    if (!file) {
      if (!channel.active) this.channels.delete(layer);
      return false;
    }
    let bytes: Uint8Array;
    try {
      bytes = await file.async('uint8array');
    } catch (error) {
      if (this.channels.get(layer) === channel && request === channel.request && !channel.active) this.channels.delete(layer);
      throw error;
    }
    if (this.channels.get(layer) !== channel || request !== channel.request) return false;
    const format = path.split('.').pop()?.toLowerCase() ?? '';
    const src = `data:audio/${format};base64,${bytesToBase64(bytes)}`;
    let loading: Howl | undefined;
    let howl: Howl | undefined;
    const settled = () => {
      const active = this.channels.get(layer)?.active;
      if (active && active.howl === loading) active.pending = false;
    };
    try {
      howl = await new Promise<Howl | undefined>((resolve, reject) => {
        channel.cancel = () => {
          loading?.off();
          loading?.unload();
          resolve(undefined);
        };
        loading = this.create({
          src: [src],
          format: [format],
          loop: true,
          volume: 0,
          onload: () => resolve(loading!),
          onloaderror: (_id, error) => reject(error),
          onplay: settled,
          onplayerror: settled,
          onunlock: () => {
            const active = this.channels.get(layer)?.active;
            if (active && active.howl === loading) this.resume(active);
          }
        });
      });
    } catch (error) {
      loading?.unload();
      if (this.channels.get(layer) === channel && request === channel.request && !channel.active) this.channels.delete(layer);
      throw error;
    }
    if (request === channel.request) channel.cancel = undefined;
    if (!howl) return false;
    const next: Loop = { key, layer, howl, pending: false };
    if (this.channels.get(layer) !== channel || request !== channel.request) {
      this.dispose(next);
      return false;
    }
    const previous = channel.active;
    channel.active = next;
    try {
      this.resume(next);
      if (duration) howl.fade(0, targetVolume, duration);
      else howl.volume(targetVolume);
    } catch (error) {
      channel.active = previous;
      this.dispose(next);
      throw error;
    }
    if (previous) this.fadeOut(previous, duration);
    return true;
  }

  public setVolume(volume: number, fadeMs = 100, layer = 'default'): void {
    const active = this.channels.get(layer)?.active;
    if (!active) return;
    const target = this.clamp(volume);
    const duration = active.pending ? 0 : this.duration(fadeMs);
    if (duration) active.howl.fade(active.howl.volume(), target, duration);
    else active.howl.volume(target);
  }

  public stop(fadeMs = 1000, layer?: string): void {
    const channels = layer === undefined ? [...this.channels.values()] : [this.channels.get(layer)];
    if (layer === undefined) this.channels.clear();
    else this.channels.delete(layer);
    const duration = this.duration(fadeMs);
    for (const channel of channels) {
      channel?.cancel?.();
      if (channel?.active) this.fadeOut(channel.active, duration);
    }
    if (!duration) for (const loop of this.fading.keys()) if (layer === undefined || loop.layer === layer) this.dispose(loop);
  }

  private resume(loop: Loop): void {
    if (loop.pending || loop.howl.playing()) return;
    loop.pending = true;
    try {
      loop.id = loop.howl.play(loop.id);
    } catch (error) {
      loop.pending = false;
      throw error;
    }
  }

  private fadeOut(loop: Loop, duration: number): void {
    if (!duration || loop.pending) {
      this.dispose(loop);
      return;
    }
    loop.howl.fade(loop.howl.volume(), 0, duration);
    while (this.fading.size >= 4) this.dispose(this.fading.keys().next().value!);
    const timer = setTimeout(() => {
      this.dispose(loop);
    }, duration);
    this.fading.set(loop, timer);
  }

  private dispose(loop: Loop): void {
    clearTimeout(this.fading.get(loop));
    this.fading.delete(loop);
    loop.howl.stop();
    loop.howl.unload();
  }

  private clamp(volume: number): number {
    return Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0;
  }

  private duration(milliseconds: number): number {
    return Number.isFinite(milliseconds) ? Math.max(0, milliseconds) : 0;
  }
}

export default Ambience;
