import maplebirch from '../../core';
import dol from '../../host/DoL';

class ImageLoader {
  private static refreshTimer: ReturnType<typeof setTimeout> | null = null;

  public static load(src: string): string | false | Promise<string | false> {
    const result = maplebirch.host.modLoader.resources.load(src);
    const refresh = (value: string | false): string | false => {
      if (value === false && src) ImageLoader.queueRefresh();
      return value;
    };
    return result instanceof Promise ? result.then(refresh) : result;
  }

  private static queueRefresh(): void {
    if (ImageLoader.refreshTimer) return;
    ImageLoader.refreshTimer = setTimeout(() => {
      ImageLoader.refreshTimer = null;
      try {
        Errors.Reporter.hide(true);
        dol.renderer.clearCaches(dol.temporary.modelclass);
        $.wiki('<<updatesidebarimg>>');
      } catch (error) {
        maplebirch.tool.log('图片加载后的侧边栏刷新失败', 'WARN', error);
      }
    }, 100);
  }
}

export default ImageLoader;
