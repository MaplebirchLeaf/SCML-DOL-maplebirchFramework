import type { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';

type ImageResult = string | false;

/** Resolves ModLoader images and ordinary URLs while retaining the resolved URL. */
export default class Resources {
  private readonly cache = new Map<string, ImageResult>();
  private readonly pending = new Map<string, Promise<ImageResult>>();

  public constructor(
    private readonly manager: SC2DataManager,
    private readonly report: (path: string, error: unknown) => void
  ) {}

  public normalize(path: string): string {
    return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path) ? path : this.manager.getHtmlTagSrcHook().normalizePath(path.replace(/\\/g, '/'));
  }

  public has(path: string): boolean | undefined {
    if (!path) return false;
    const key = this.normalize(path);
    if (this.cache.has(key)) return this.cache.get(key) !== false;
    try {
      return this.manager.getHtmlTagSrcHook().checkImageExist(key);
    } catch (error) {
      this.report(key, error);
      return undefined;
    }
  }

  public load(path: string): ImageResult | Promise<ImageResult> {
    if (!path) return false;
    const key = this.normalize(path);
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;
    const current = this.pending.get(key);
    if (current) return current;
    const request = this.resolve(key).then(result => {
      if (this.pending.get(key) === request) {
        this.cache.set(key, result);
        this.pending.delete(key);
      }
      return result;
    });
    this.pending.set(key, request);
    return request;
  }

  public clear(path?: string): void {
    if (path === undefined) {
      this.cache.clear();
      this.pending.clear();
    } else {
      const key = this.normalize(path);
      this.cache.delete(key);
      this.pending.delete(key);
    }
  }

  private async resolve(path: string): Promise<ImageResult> {
    try {
      const image = await this.manager.getHtmlTagSrcHook().requestImageBySrc(path);
      if (image) return image;
    } catch (error) {
      this.report(path, error);
    }
    return new Promise(resolve => {
      const image = new Image();
      const finish = (result: ImageResult) => {
        clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        resolve(result);
      };
      const timer = setTimeout(() => finish(false), 15000);
      image.onload = () => finish(path);
      image.onerror = () => finish(false);
      image.src = path;
    });
  }
}
