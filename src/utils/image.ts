// ./src/utils/image.ts

import maplebirch from '../core';

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

export function loadImage(src: string): string | false | Promise<string | false> {
  const result = maplebirch.addon.resources.load(src);
  const refresh = (value: string | false): string | false => {
    if (value === false && src) queueSidebarRefresh();
    return value;
  };
  return result instanceof Promise ? result.then(refresh) : result;
}
