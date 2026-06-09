// ./src/macros/radiobuttonsfrom.ts

import maplebirch from '../core';
import { bindLanguageUpdate, text, type MacroContext } from './helpers';

function parseRadio(input: any): Array<[string, any]> | null {
  if (Array.isArray(input)) return input as Array<[string, any]>;
  if (typeof input !== 'string') return null;
  const source = input.trim();
  if (!source.includes('|')) return null;
  const result: Array<[string, any]> = [];
  for (const item of source.split('|').map(option => option.trim())) {
    if (item.startsWith('[') && item.endsWith(']')) {
      const value = item.slice(1, -1);
      result.push(['', value.includes(',') ? value.split(',') : value]);
      continue;
    }
    if (item.includes('[') && item.endsWith(']')) {
      const index = item.indexOf('[');
      const key = item.slice(0, index);
      const value = item.slice(index + 1, -1);
      result.push([key, value.includes(',') ? value.split(',') : value]);
      continue;
    }
    result.push([item, item]);
  }
  return result;
}

// <<radiobuttonsfrom>>
export function _radiobuttonsfrom(this: MacroContext): HTMLElement | void {
  if (this.args.length < 2) return this.error('Missing variable name and options.');
  const payload = Array.isArray(this.payload) ? this.payload : [];
  const varPath = this.args[0];
  if (typeof varPath === 'string' && !varPath.startsWith('$_') && varPath[0] !== '$' && varPath[0] !== '_') return this.error(`Variable '${varPath}' needs a sigil.`);
  const parsed = parseRadio(this.args[1]);
  if (!parsed) return this.error('Unable to parse options.');
  const separator = this.args.length > 2 ? text(this.args[2]) : ' | ';
  const content = (payload[0]?.contents || '').trim();
  const passageObj = this.passageObj;
  const options: Array<{ value: string; data: any; label: JQuery }> = [];
  const $container = jQuery('<span>').addClass('radiobuttonsfrom-container');

  parsed.forEach((option, index) => {
    const $label = jQuery('<label>').addClass('radiobuttonsfrom-label');
    const $temp = jQuery(document.createElement('div'));
    const optionValue = Array.isArray(option) && option.length >= 2 ? text(option[0]) : text(option);
    const displayData = Array.isArray(option) && option.length >= 2 ? option[1] : option;
    options.push({ value: optionValue, data: displayData, label: $label });
    try {
      const safeValue = optionValue.replace(/'/g, "\\'");
      new maplebirch.SugarCube.Wikifier($temp[0], `<<radiobutton '${varPath}' '${safeValue}' autocheck>>`);
      if (content) {
        $temp.find('input[type="radio"]').on(
          'change.macros',
          this.createShadowWrapper(function (this: HTMLInputElement) {
            if (this.checked) maplebirch.SugarCube.Wikifier.wikifyEval(content, passageObj);
          })
        );
      }
      $temp.children().appendTo($label);
      $label.append(jQuery('<span>').addClass('radiobuttonsfrom-text').attr('data-option-index', index));
      $container.append($label);
      if (index < parsed.length - 1) $container.append(document.createTextNode(separator));
    } catch (error) {
      maplebirch.log('radiobuttonsfrom: option error', 'ERROR', option, error);
    }
  });

  $container.appendTo(this.output);
  const update = () => {
    const language = maplebirch.Language;
    options.forEach((option, index) => {
      try {
        const $text = $container.find(`.radiobuttonsfrom-text[data-option-index="${index}"]`);
        const data = option?.data;
        let displayText = '';
        if (Array.isArray(data)) {
          displayText = text(data[0] ?? option.value);
          if (language === 'CN' && data.length > 1) displayText = text(data[1] ?? data[0] ?? option.value);
        } else if (data && typeof data === 'object') {
          displayText = text((data as Record<string, any>)[language] ?? (data as Record<string, any>).EN ?? (data as Record<string, any>).CN ?? option.value);
        } else {
          displayText = text(data ?? option.value);
        }
        $text.empty();
        if (/<[^>]+>/.test(displayText)) $text.html(displayText);
        else $text.text(displayText);
      } catch (error) {
        maplebirch.log(`radiobuttonsfrom update option failed: ${index}`, 'ERROR', error, option);
      }
    });
  };
  update();
  bindLanguageUpdate($container, 'radiobuttonsfrom', update);
  return $container[0];
}
