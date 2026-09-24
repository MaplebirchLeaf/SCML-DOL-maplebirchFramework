// ./src/macros/lanSwitch.ts

import maplebirch from '../core';
import { bindLanguageUpdate, text, wiki, type MacroContext } from './helpers';

// <<lanSwitch>>
export function _languageSwitch(this: void, ...lanObj: unknown[]): string;
export function _languageSwitch(this: MacroContext, ...lanObj: unknown[]): HTMLElement;
export function _languageSwitch(this: MacroContext | void, ...lanObj: unknown[]): string | HTMLElement {
  const languages = maplebirch.meta.Languages;
  const currentLanguage = maplebirch.services.translator.language;
  const target: Record<string, string> = {};
  if (lanObj[0] && typeof lanObj[0] === 'object' && !Array.isArray(lanObj[0])) {
    for (const [language, value] of Object.entries(lanObj[0])) target[language] = text(value);
  } else {
    const source = Array.isArray(lanObj[0]) ? lanObj[0] : lanObj;
    for (let i = 0; i < source.length; i++) if (languages[i]) target[languages[i]] = text(source[i]);
  }
  const context = this as MacroContext | undefined;
  if (!context?.output) return target[currentLanguage] ?? target[languages[0]] ?? text(lanObj[0]);
  try {
    const $container = jQuery('<span style="display: contents;"></span>');
    const render = () => wiki($container, target[maplebirch.services.translator.language] ?? target[languages[0]] ?? '');
    render();
    jQuery(context.output).append($container);
    bindLanguageUpdate($container, 'lanSwitch', render);
    return $container[0];
  } catch (error) {
    maplebirch.log('lanSwitch error', 'ERROR', error);
    return target[currentLanguage] ?? target[languages[0]] ?? '';
  }
}
