import Diagnostics from '../infra/Diagnostics';
import maplebirch from '../core';
import { addClasses, appendMacroIcon, bindLanguageUpdate, labelControl, parseLanguageArgs, readStyle, sourceText, text, type MacroContext } from './helpers';

export function _languageButton(this: MacroContext): void {
  try {
    parseLanguageArgs(this.args);
    if (!this.args || this.args.length === 0) return this.error('<<lanButton>> needs at least one argument.');
    const payload = Array.isArray(this.payload) ? this.payload : [];
    const content = (payload[0]?.contents || '').trim();
    const firstArg = this.args[0];
    const source = Array.isArray(firstArg) ? firstArg.map(text) : text(firstArg);
    const appearance = readStyle(this.args);
    const { className, style, icon } = appearance;
    const passageObj = this.passageObj;
    const sourceLabel = sourceText(source);
    if (!sourceLabel) return this.error('<<lanButton>> needs a valid text source.');

    const $button = jQuery(document.createElement('button')).addClass('macro-button link-internal').attr('data-translation-key', sourceLabel);
    addClasses($button, className);
    if (style) $button.attr('style', style);
    appendMacroIcon($button, icon);

    const update = labelControl($button, 'macro-lanButton-text', source, appearance);

    $button.ariaClick({ namespace: '.macros', role: 'button', one: false }, this.createShadowWrapper(content ? () => maplebirch.SugarCube.Wikifier.wikifyEval(content, passageObj) : () => {}));
    $button.appendTo(this.output);
    bindLanguageUpdate($button, 'lanButton', update);
  } catch (error) {
    maplebirch.log('<<lanButton>> error', 'ERROR', error);
    return this.error(`<<lanButton>> error: ${Diagnostics.message(error)}`);
  }
}
