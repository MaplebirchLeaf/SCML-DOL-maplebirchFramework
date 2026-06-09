// ./src/macros/language.ts

import maplebirch from '../core';
import { bindLanguageUpdate, text, wiki, type MacroContext } from './helpers';

// <<language>>
export function _language(this: MacroContext): void {
  const payload = Array.isArray(this.payload) ? this.payload : [];
  const $container = jQuery('<div style="display: contents;"></div>');
  const render = () => {
    const language = maplebirch.Language.toUpperCase();
    const option = payload.find(item => {
      const args = Array.isArray(item.args) ? item.args : [];
      return item.name === 'option' && text(args[0]).toUpperCase() === language;
    });
    wiki($container, option?.contents || '');
  };
  render();
  jQuery(this.output).append($container);
  bindLanguageUpdate($container, 'language', render);
}
