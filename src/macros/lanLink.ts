// ./src/macros/lanLink.ts

import Diagnostics from '../infra/Diagnostics';
import maplebirch from '../core';
import { addClasses, appendMacroIcon, bindLanguageUpdate, isStyleArg, readStyle, text, translatedText, type LinkArg, type MacroContext } from './helpers';
import dol from '../host/DoL';

// <<lanLink>>
export function _languageLink(this: MacroContext): void {
  try {
    if (!this.args || this.args.length === 0) return this.error('<<lanLink>> needs at least one argument.');
    dol.temporary.link = true;
    const payload = Array.isArray(this.payload) ? this.payload : [];
    const content = (payload[0]?.contents || '').trim();
    const firstArg = this.args[0];
    const { className, style, icon, iconOnly, convertMode } = readStyle(this.args);
    const passageObj = this.passageObj;
    let source = '';
    let passageName: string | null = null;

    if (typeof firstArg === 'string' || typeof firstArg === 'function') {
      source = text(firstArg);
      for (let i = 1; i < this.args.length; i++) {
        const arg = this.args[i];
        if (typeof arg === 'string' && !isStyleArg(arg)) passageName ??= arg;
      }
    } else if (firstArg && typeof firstArg === 'object' && !Array.isArray(firstArg)) {
      const linkArg = firstArg as LinkArg;
      if (!linkArg.text) return this.error('<<lanLink>> link object needs text.');
      source = text(linkArg.text);
      passageName = linkArg.link || null;
    } else {
      return this.error('<<lanLink>> first argument must be text or a link object.');
    }
    if (!source) return this.error('<<lanLink>> missing text.');

    const $container = jQuery(document.createElement('span'));
    const $link = jQuery(document.createElement('a')).addClass('macro-link link-internal').attr('data-translation-key', source);
    addClasses($link, className);
    if (style) $link.attr('style', style);
    if (passageName != null) {
      $link.attr('data-passage', passageName);
      if (maplebirch.host.sugarcube.require().Story.has(passageName)) {
        if (maplebirch.host.sugarcube.require().Config.addVisitedLinkClass && maplebirch.host.sugarcube.require().State.hasPlayed(passageName)) $link.addClass('link-visited');
      } else {
        $link.addClass('link-broken');
      }
    }
    if (convertMode) $link.attr('data-convert-mode', convertMode);
    appendMacroIcon($link, icon);

    const textNode = iconOnly ? null : document.createTextNode('');
    if (textNode) $link.append(textNode);
    const update = () => {
      const linkText = translatedText(source, convertMode);
      $link.attr('aria-label', linkText);
      if (iconOnly) $link.attr('title', linkText);
      else $link.removeAttr('title');
      if (textNode) textNode.data = linkText;
    };
    update();

    $link.ariaClick(
      { namespace: '.macros', role: passageName != null ? 'link' : 'button', one: passageName != null },
      this.createShadowWrapper(
        content ? () => maplebirch.host.sugarcube.require().Wikifier.wikifyEval(content, passageObj) : () => {},
        passageName != null ? () => maplebirch.host.sugarcube.require().Engine.play(passageName) : undefined
      )
    );
    $container.append($link);
    $container.appendTo(this.output);
    bindLanguageUpdate($container, 'lanLink', update);
  } catch (error) {
    maplebirch.log('<<lanLink>> error', 'ERROR', error);
    return this.error(`<<lanLink>> error: ${Diagnostics.message(error)}`);
  }
}
