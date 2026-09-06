// ./src/utils/image.ts

const imageCache = new Map<string, boolean>();
const imagePending = new Map<string, Promise<boolean>>();

let sidebarRefreshTimer: ReturnType<typeof setTimeout> | null = null;

function queueSidebarRefresh(delay = 100): void {
  if (sidebarRefreshTimer) return;

  sidebarRefreshTimer = setTimeout(() => {
    sidebarRefreshTimer = null;

    try {
      Errors.Reporter.hide(true);
      Renderer.clearCaches(T.modelclass);
      $.wiki('<<updatesidebarimg>>');
    } catch {}
  }, delay);
}

function checkImageExist(src: string): boolean | Promise<boolean> {
  if (imageCache.has(src)) return imageCache.get(src)!;

  if (imagePending.has(src)) return imagePending.get(src)!;

  if (!src) {
    imageCache.set(src, false);
    return false;
  }

  const pending = new Promise<boolean>(resolve => {
    const image = new Image();

    image.onload = () => {
      image.onload = null;
      image.onerror = null;
      imageCache.set(src, true);
      resolve(true);
    };

    image.onerror = () => {
      image.onload = null;
      image.onerror = null;
      imageCache.set(src, false);
      resolve(false);
      queueSidebarRefresh(100);
    };

    image.src = src;
  }).finally(() => {
    imagePending.delete(src);
  });

  imagePending.set(src, pending);

  return pending;
}

export function loadImage(src: string): string | boolean | Promise<string | boolean> {
  try {
    if (!src) return false;

    if (imageCache.has(src)) return imageCache.get(src) ? src : false;

    return window.modUtils.getImage(src).then(value => {
      if (value) {
        imageCache.set(src, true);
        return value;
      }
      const checkResult = checkImageExist(src);
      return checkResult instanceof Promise ? checkResult.then(exists => (exists ? src : false)) : checkResult ? src : false;
    });
  } catch {
    return src;
  }
}
