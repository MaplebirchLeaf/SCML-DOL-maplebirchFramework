import Diagnostics from '../infra/Diagnostics';
import maplebirch from '../core';
import { addClasses, appendMacroIcon, bindLanguageUpdate, labelControl, isStyleArg, parseLanguageArgs, readStyle, sourceText, text, type LinkArg, type MacroContext } from './helpers';
import dol from '../host/DoL';

export function _languageLink(this: MacroContext): void {
  try {
    parseLanguageArgs(this.args);
    if (!this.args || this.args.length === 0) return this.error('<<lanLink>> needs at least one argument.');
    dol.temporary.link = true;
    const payload = Array.isArray(this.payload) ? this.payload : [];
    const content = (payload[0]?.contents || '').trim();
    const firstArg = this.args[0];
    const appearance = readStyle(this.args);
    const { className, style, icon, convertMode } = appearance;
    const passageObj = this.passageObj;
    let source: string | readonly string[] = '';
    let passageName: string | null = null;

    if (typeof firstArg === 'string' || typeof firstArg === 'function' || Array.isArray(firstArg)) {
      source = Array.isArray(firstArg) ? firstArg.map(text) : text(firstArg);
      for (let i = 1; i < this.args.length; i++) {
        const arg = this.args[i];
        if (typeof arg === 'string' && !isStyleArg(arg)) passageName ??= arg;
      }
    } else if (firstArg && typeof firstArg === 'object' && !Array.isArray(firstArg)) {
      const linkArg = firstArg as LinkArg;
      if (!linkArg.text) return this.error('<<lanLink>> link object needs text.');
      source = linkArg.text;
      passageName = linkArg.link || null;
    } else {
      return this.error('<<lanLink>> first argument must be text or a link object.');
    }
    const sourceLabel = sourceText(source);
    if (!sourceLabel) return this.error('<<lanLink>> missing text.');

    const $container = jQuery(document.createElement('span'));
    const $link = jQuery(document.createElement('a')).addClass('macro-link link-internal').attr('data-translation-key', sourceLabel);
    addClasses($link, className);
    if (style) $link.attr('style', style);
    if (passageName != null) {
      $link.attr('data-passage', passageName);
      if (maplebirch.SugarCube.Story.has(passageName)) {
        if (maplebirch.SugarCube.Config.addVisitedLinkClass && maplebirch.SugarCube.State.hasPlayed(passageName)) $link.addClass('link-visited');
      } else {
        $link.addClass('link-broken');
      }
    }
    if (convertMode) $link.attr('data-convert-mode', convertMode);
    appendMacroIcon($link, icon);

    const update = labelControl($link, 'macro-lanLink-text', source, appearance);

    $link.ariaClick(
      { namespace: '.macros', role: passageName != null ? 'link' : 'button', one: passageName != null },
      this.createShadowWrapper(
        () => {
          if (!content || (passageName != null && dol.variables.nextPassage)) return;
          window.ironmanFlag = true;
          try {
            maplebirch.SugarCube.Wikifier.wikifyEval(content, passageObj);
          } finally {
            delete window.ironmanFlag;
          }
        },
        passageName != null
          ? () => {
              const variables = dol.variables;
              const destination = variables.nextPassage || passageName;
              if (variables.nextPassage) {
                variables.nextPassageIntended = passageName;
                delete variables.nextPassage;
              }
              const sidebar = document.querySelector<HTMLElement>('#storyCaptionDiv');
              window.scrollUIBar = sidebar?.scrollTop ?? null;
              window.scrollMain = document.scrollingElement?.scrollTop ?? 0;
              maplebirch.SugarCube.Engine.play(destination);
            }
          : undefined
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
