import { Howl, type HowlOptions } from 'howler';
import type ModLoader from '../../host/ModLoader';

interface Loop {
  key: string;
  howl: Howl;
  url: string;
}

class Ambience {
  private active: Loop | null = null;
  private request = 0;

  public constructor(private readonly modloader: ModLoader) {}

  protected create(options: HowlOptions): Howl {
    return new Howl(options);
  }

  public async play(modName: string, path: string, volume = 1, fadeMs = 1000): Promise<boolean> {
    const key = JSON.stringify([modName, path]);
    const targetVolume = this.clamp(volume);
    const duration = this.duration(fadeMs);
    if (this.active?.key === key) {
      this.setVolume(targetVolume, duration);
      return true;
    }
    const request = ++this.request;
    const file = this.modloader.modLoader?.getModZip(modName)?.zip.file(path);
    if (!file) return false;
    const bytes = await file.async('uint8array');
    if (request !== this.request) return false;
    const format = path.split('.').pop()?.toLowerCase() ?? '';
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const url = URL.createObjectURL(new Blob([buffer], { type: `audio/${format}` }));
    let loading: Howl | undefined;
    let howl: Howl;
    try {
      howl = await new Promise<Howl>((resolve, reject) => {
        loading = this.create({
          src: [url],
          format: [format],
          loop: true,
          volume: 0,
          onload: () => resolve(loading!),
          onloaderror: (_id, error) => reject(error)
        });
      });
    } catch (error) {
      loading?.unload();
      URL.revokeObjectURL(url);
      throw error;
    }
    const next = { key, howl, url };
    if (request !== this.request) {
      this.dispose(next);
      return false;
    }
    const previous = this.active;
    try {
      howl.play();
      if (duration) howl.fade(0, targetVolume, duration);
      else howl.volume(targetVolume);
    } catch (error) {
      this.dispose(next);
      throw error;
    }
    this.active = next;
    if (previous) this.fadeOut(previous, duration);
    return true;
  }

  public setVolume(volume: number, fadeMs = 100): void {
    if (!this.active) return;
    const target = this.clamp(volume);
    const duration = this.duration(fadeMs);
    if (duration) this.active.howl.fade(this.active.howl.volume(), target, duration);
    else this.active.howl.volume(target);
  }

  public stop(fadeMs = 1000): void {
    this.request++;
    const current = this.active;
    this.active = null;
    if (current) this.fadeOut(current, this.duration(fadeMs));
  }

  private fadeOut(loop: Loop, duration: number): void {
    if (!duration) {
      this.dispose(loop);
      return;
    }
    loop.howl.fade(loop.howl.volume(), 0, duration);
    setTimeout(() => {
      this.dispose(loop);
    }, duration);
  }

  private dispose(loop: Loop): void {
    loop.howl.stop();
    loop.howl.unload();
    URL.revokeObjectURL(loop.url);
  }

  private clamp(volume: number): number {
    return Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0;
  }

  private duration(milliseconds: number): number {
    return Number.isFinite(milliseconds) ? Math.max(0, milliseconds) : 0;
  }
}

export default Ambience;
