// ./src/macros/lanButton.ts

import maplebirch from '../core';
import { addClasses, appendMacroIcon, bindLanguageUpdate, readStyle, text, translatedText, type MacroContext } from './helpers';

// <<lanButton>>
export function _languageButton(this: MacroContext): void {
  try {
    if (!this.args || this.args.length === 0) return this.error('<<lanButton>> needs at least one argument.');
    const payload = Array.isArray(this.payload) ? this.payload : [];
    const content = (payload[0]?.contents || '').trim();
    const source = text(this.args[0]);
    const { className, style, icon, iconOnly, convertMode } = readStyle(this.args);
    const passageObj = this.passageObj;
    if (!source) return this.error('<<lanButton>> needs a valid text source.');

    const $button = jQuery(document.createElement('button')).addClass('macro-button link-internal').attr('data-translation-key', source);
    addClasses($button, className);
    if (style) $button.attr('style', style);
    appendMacroIcon($button, icon);

    const textNode = iconOnly ? null : document.createTextNode('');
    if (textNode) $button.append(textNode);
    const update = () => {
      const buttonText = translatedText(source, convertMode);
      $button.attr('aria-label', buttonText);
      if (iconOnly) $button.attr('title', buttonText);
      else $button.removeAttr('title');
      if (textNode) textNode.data = buttonText;
    };
    update();

    $button.ariaClick({ namespace: '.macros', role: 'button', one: false }, this.createShadowWrapper(content ? () => maplebirch.SugarCube.Wikifier.wikifyEval(content, passageObj) : () => {}));
    $button.appendTo(this.output);
    bindLanguageUpdate($button, 'lanButton', update);
  } catch (error: any) {
    maplebirch.log('<<lanButton>> error', 'ERROR', error);
    return this.error(`<<lanButton>> error: ${error?.message || error}`);
  }
}
