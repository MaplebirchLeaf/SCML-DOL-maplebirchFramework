// ./src/macros/lanButton.ts

import Diagnostics from '../infra/Diagnostics';
import maplebirch from '../core';
import { addClasses, appendMacroIcon, bindLanguageUpdate, parseLanguageArgs, readStyle, sourceText, text, translatedText, type MacroContext } from './helpers';

// <<lanButton>>
export function _languageButton(this: MacroContext): void {
  try {
    parseLanguageArgs(this.args);
    if (!this.args || this.args.length === 0) return this.error('<<lanButton>> needs at least one argument.');
    const payload = Array.isArray(this.payload) ? this.payload : [];
    const content = (payload[0]?.contents || '').trim();
    const firstArg = this.args[0];
    const source = Array.isArray(firstArg) ? firstArg.map(text) : text(firstArg);
    const { className, style, icon, iconOnly, convertMode } = readStyle(this.args);
    const passageObj = this.passageObj;
    const sourceLabel = sourceText(source);
    if (!sourceLabel) return this.error('<<lanButton>> needs a valid text source.');

    const $button = jQuery(document.createElement('button')).addClass('macro-button link-internal').attr('data-translation-key', sourceLabel);
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

    $button.ariaClick(
      { namespace: '.macros', role: 'button', one: false },
      this.createShadowWrapper(content ? () => maplebirch.host.sugarcube.require().Wikifier.wikifyEval(content, passageObj) : () => {})
    );
    $button.appendTo(this.output);
    bindLanguageUpdate($button, 'lanButton', update);
  } catch (error) {
    maplebirch.log('<<lanButton>> error', 'ERROR', error);
    return this.error(`<<lanButton>> error: ${Diagnostics.message(error)}`);
  }
}
