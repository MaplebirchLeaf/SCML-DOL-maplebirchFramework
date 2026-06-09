// ./src/macros/lanListbox.ts

import maplebirch from '../core';
import { addClasses, bindLanguageUpdate, macroTranslation, text, type ListboxOption, type MacroContext, type MacroPayload, CONVERT_MODES, type ConvertMode } from './helpers';

function optionsFrom(value: any, convertMode: ConvertMode | null, exprIndex: number): ListboxOption[] {
  const result: ListboxOption[] = [];
  if (Array.isArray(value) || value instanceof Set) {
    for (const item of Array.isArray(value) ? value : Array.from(value)) result.push({ label: text(item), value: item, type: 'dynamic', exprIndex, convertMode });
  } else if (value instanceof Map) {
    value.forEach((item, key) => result.push({ label: text(key), value: item, type: 'dynamic', exprIndex, convertMode }));
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) result.push({ label: key, value: value[key], type: 'dynamic', exprIndex, convertMode });
  }
  return result;
}

function optionConvertMode(args: any[], start: number): ConvertMode | null {
  for (let i = start; i < args.length; i++) if (typeof args[i] === 'string' && (CONVERT_MODES as readonly string[]).includes(args[i])) return args[i] as ConvertMode;
  return null;
}

function buildOptions(payload: MacroPayload[], allowSelected: boolean): { options: ListboxOption[]; selectedIdx: number } | string {
  const options: ListboxOption[] = [];
  let selectedIdx = -1;
  let exprIndex = 0;

  for (let i = 1; i < payload.length; i++) {
    const item = payload[i];
    const args = Array.isArray(item.args) ? item.args : [];
    if (item.name === 'option') {
      if (args.length === 0) return '<<option>> needs arguments.';
      const label = text(args[0]);
      const value = args.length > 1 ? args[1] : label;
      options.push({ label, value, type: 'static', convertMode: optionConvertMode(args, 2) });
      if (args.includes('selected')) {
        if (!allowSelected) return 'Cannot use autoselect and selected together.';
        if (selectedIdx !== -1) return 'Only one option can be selected.';
        selectedIdx = options.length - 1;
      }
      continue;
    }

    if (item.name === 'optionsfrom') {
      const expression = text(item.args?.full);
      if (!expression) return '<<optionsfrom>> needs an expression.';
      let value: any;
      try {
        value = maplebirch.SugarCube.Scripting.evalJavaScript(expression[0] === '{' ? `(${expression})` : expression);
      } catch (error: any) {
        return `Expression error: ${error?.message || error}`;
      }
      if (!value || typeof value !== 'object') return 'Expression must return an object or array.';
      for (const option of optionsFrom(value, optionConvertMode(args, 1), exprIndex)) options.push(option);
      exprIndex++;
    }
  }

  if (options.length === 0) return 'No options specified.';
  return { options, selectedIdx };
}

// <<lanListbox>>
export function _languageListbox(this: MacroContext): void {
  try {
    if (!this.args || this.args.length === 0) return this.error('<<lanListbox>> needs a variable name.');
    const payload = Array.isArray(this.payload) ? this.payload : [];
    const varName = text(this.args[0]).trim();
    if (!varName || (varName[0] !== '$' && varName[0] !== '_')) return this.error(`Variable '${varName}' needs a sigil.`);

    const varId = maplebirch.SugarCube.Util.slugify(varName);
    const config = { autoselect: false };
    let classes = '';
    let style = '';
    for (let i = 1; i < this.args.length; i++) {
      const arg = this.args[i];
      if (typeof arg !== 'string') continue;
      if (arg === 'autoselect') config.autoselect = true;
      else if (arg.startsWith('class:')) classes = arg.slice(6);
      else if (arg.startsWith('style:')) style = arg.slice(6);
    }

    const built = buildOptions(payload, !config.autoselect);
    if (typeof built === 'string') return this.error(built);
    const options = built.options;
    let selectedIdx = built.selectedIdx;
    if (selectedIdx === -1) {
      selectedIdx = config.autoselect ? options.findIndex(option => maplebirch.SugarCube.Util.sameValueZero(option.value, State.getVar(varName))) : 0;
      if (selectedIdx === -1) selectedIdx = 0;
    }

    const $select = jQuery(document.createElement('select'))
      .attr({ id: `lanListbox-${varId}`, name: `lanListbox-${varId}`, tabindex: 0 })
      .addClass('macro-lanListbox')
      .on(
        'change.macros',
        this.createShadowWrapper(function (this: HTMLSelectElement) {
          const index = Number(this.value);
          if (options[index]) State.setVar(varName, options[index].value);
        })
      );
    addClasses($select, classes);
    if (style) $select.attr('style', style);

    const create = (items: ListboxOption[], index: number) => {
      $select.empty();
      items.forEach((option, i) => {
        let displayText = macroTranslation(option?.label ?? '', maplebirch) || text(option?.label);
        if (option?.convertMode) displayText = displayText.convert(option.convertMode);
        jQuery(document.createElement('option'))
          .val(i)
          .text(displayText)
          .attr('data-translation-key', option?.label ?? '')
          .attr('data-convert-mode', option?.convertMode ?? '')
          .attr('data-opt-type', option?.type ?? '')
          .attr('data-expr-index', option?.exprIndex ?? -1)
          .prop('selected', i === index)
          .appendTo($select);
      });
    };

    create(options, selectedIdx);
    $select.appendTo(this.output);
    State.setVar(varName, options[selectedIdx].value);
    const update = () => {
      const currentValue = State.getVar(varName);
      const currentIndex = options.findIndex(option => maplebirch.SugarCube.Util.sameValueZero(option.value, currentValue));
      if (currentIndex >= 0) selectedIdx = currentIndex;
      create(options, selectedIdx);
    };
    bindLanguageUpdate($select, 'lanListbox', update);
  } catch (error: any) {
    maplebirch.log('<<lanListbox>> error', 'ERROR', error);
    return this.error(`<<lanListbox>> error: ${error?.message || error}`);
  }
}
