// ./src/macros/maplebirchReplace.ts

import maplebirch from '../core';
import { text } from './helpers';
import dol from '../host/DoL';

// <<maplebirchReplace>>
export function _overlayReplace(name: string, type: string): void {
  const key = text(name);
  if (!key) return;
  if (dol.temporary.currentOverlay === key) {
    if (typeof window.closeOverlay === 'function') window.closeOverlay();
    $.wiki('<<exit>>');
    return;
  }
  dol.temporary.buttons.toggle();
  if (typeof window.updateOptions === 'function') window.updateOptions();
  dol.temporary.currentOverlay = key;
  const $overlay = jQuery('#customOverlay');
  if ($overlay.length) $overlay.removeClass('hidden').parent().removeClass('hidden').attr('data-overlay', dol.temporary.currentOverlay);
  switch (type) {
    case 'customize':
      return $.wiki(`<<${key}>><<exit>>`);
    case 'title':
      const titleKey = 'title' + key.convert('pascal');
      if (titleKey && maplebirch.tool.macro.Macro.has(titleKey)) $.wiki(`<<replace #customOverlayTitle>><<${titleKey}>><</replace>>`);
      break;
    default:
      break;
  }
  $.wiki(`<<replace #customOverlayContent>><<${key}>><</replace>>`);
}
