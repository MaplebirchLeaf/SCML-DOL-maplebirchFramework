// ./src/SugarCubeMacros.ts

import maplebirch, { type MaplebirchCore } from './core';
import { convert } from './utils';

const CONVERT_MODES = ['lower', 'upper', 'capitalize', 'title', 'camel', 'pascal', 'snake', 'kebab', 'constant'] as const;
type ConvertMode = (typeof CONVERT_MODES)[number];

interface MacroPayload {
  name: string;
  args: any;
  contents?: string;
}

export interface MacroContext {
  args: any[];
  payload?: MacroPayload[] | null;
  output: HTMLElement;
  error: (msg: string) => any;
  createShadowWrapper: (fn?: Function | null, fn2?: Function | null) => (event: JQuery.Event) => void;
  passageObj?: any;
  lanListboxCache?: Record<string, { options: ListboxOption[]; selectedIdx: number }>;
}

interface LinkArg {
  text: string;
  link?: string;
}

interface StyleArgs {
  classes: string;
  style: string;
  convertMode: ConvertMode | null;
}

interface ListboxOption {
  label: string;
  value: any;
  type: 'static' | 'dynamic';
  exprIndex?: number;
  convertMode: ConvertMode | null;
}

function text(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return text(value());
  if (typeof value === 'object') {
    if (typeof value.label === 'string') return value.label;
    if (typeof value.name === 'string') return value.name;
    if (typeof value.text === 'string') return value.text;
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return '';
}

function macroTranslation(key: any, core: MaplebirchCore = maplebirch): string {
  const source = text(key);
  if (!source) return '';
  const translation = core.t(source);
  if (translation[0] !== '[' || translation[translation.length - 1] !== ']') return translation;
  const auto = core.auto(source);
  if (auto !== source) return auto;
  if (!source.includes(' ')) return source;
  const words = source.split(' ');
  const translated = words.map(word => core.auto(word));
  if (translated.some((word, index) => word !== words[index])) return core.Language === 'CN' ? translated.join('') : translated.join(' ');
  return source;
}

function readStyle(args: any[], start = 1): StyleArgs {
  let classes = '';
  let style = '';
  let convertMode: ConvertMode | null = null;
  for (let i = start; i < args.length; i++) {
    const arg = args[i];
    if (typeof arg !== 'string') continue;
    if (arg.startsWith('class:')) {
      classes = arg.slice(6);
      continue;
    }
    if (arg.startsWith('style:')) {
      style = arg.slice(6);
      continue;
    }
    if (!convertMode && (CONVERT_MODES as readonly string[]).includes(arg)) convertMode = arg as ConvertMode;
  }
  return { classes, style, convertMode };
}

function wiki($container: JQuery, content: string): void {
  $container.empty();
  if (!content) return;
  const fragment = document.createDocumentFragment();
  new maplebirch.SugarCube.Wikifier(fragment, content);
  $container.append(fragment);
  Links.generate();
}

// <<language>>
function _language(this: MacroContext): void {
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
  setup.maplebirch?.language?.add('language', render);
  $container.on('remove', () => setup.maplebirch?.language?.remove('language', render));
}

// <<lanSwitch>>
function _languageSwitch(this: void, ...lanObj: any[]): string;
function _languageSwitch(this: MacroContext, ...lanObj: any[]): HTMLElement;
function _languageSwitch(this: MacroContext | void, ...lanObj: any[]): string | HTMLElement {
  const languages = maplebirch.meta.Languages;
  const currentLanguage = maplebirch.Language;
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
    const render = () => wiki($container, target[maplebirch.Language] ?? target[languages[0]] ?? '');
    render();
    jQuery(context.output).append($container);
    setup.maplebirch?.language?.add('lanSwitch', render);
    $container.on('remove', () => setup.maplebirch?.language?.remove('lanSwitch', render));
    return $container[0];
  } catch (error) {
    maplebirch.log('lanSwitch 宏模式错误', 'ERROR', error);
    return target[currentLanguage] ?? target[languages[0]] ?? '';
  }
}

// <<lanButton>>
function _languageButton(this: MacroContext): void {
  try {
    if (!this.args || this.args.length === 0) return this.error('<<lanButton>> 需要至少一个参数');
    const payload = Array.isArray(this.payload) ? this.payload : [];
    const content = (payload[0]?.contents || '').trim();
    const source = text(this.args[0]);
    const { classes, style, convertMode } = readStyle(this.args);
    const passageObj = this.passageObj;
    if (!source) return this.error('<<lanButton>> 参数必须是字符串、函数或带 text 属性的对象');
    let buttonText = macroTranslation(source, maplebirch);
    if (convertMode) buttonText = convert(buttonText, convertMode);
    const $button = jQuery(document.createElement('button')).addClass('macro-button link-internal').attr('data-translation-key', source);
    if (classes) for (const cls of classes.split(/\s+/)) if (cls.trim()) $button.addClass(cls.trim());
    if (style) $button.attr('style', style);
    $button.append(document.createTextNode(buttonText));
    $button.ariaClick(
      {
        namespace: '.macros',
        role: 'button',
        one: false
      },
      this.createShadowWrapper(content ? () => maplebirch.SugarCube.Wikifier.wikifyEval(content, passageObj) : null)
    );
    const update = () => {
      let nextText = macroTranslation(source, maplebirch);
      if (convertMode) nextText = convert(nextText, convertMode);
      $button.empty().append(document.createTextNode(nextText));
    };
    $button.appendTo(this.output);
    setup.maplebirch?.language?.add('lanButton', update);
    $button.on('remove', () => setup.maplebirch?.language?.remove('lanButton', update));
  } catch (error: any) {
    maplebirch.log('<<lanButton>> 宏处理错误', 'ERROR', error);
    return this.error(`<<lanButton>> 执行错误: ${error?.message || error}`);
  }
}

// <<lanLink>>
function _languageLink(this: MacroContext): void {
  try {
    if (!this.args || this.args.length === 0) return this.error('<<lanLink>> 需要至少一个参数');
    T.link = true;
    const payload = Array.isArray(this.payload) ? this.payload : [];
    const content = (payload[0]?.contents || '').trim();
    const firstArg = this.args[0];
    const { classes, style, convertMode } = readStyle(this.args);
    const passageObj = this.passageObj;
    let source = '';
    let passageName: string | null = null;
    if (typeof firstArg === 'string' || typeof firstArg === 'function') {
      source = text(firstArg);
      for (let i = 1; i < this.args.length; i++) {
        const arg = this.args[i];
        if (typeof arg !== 'string') continue;
        if (arg.startsWith('class:') || arg.startsWith('style:') || (CONVERT_MODES as readonly string[]).includes(arg)) continue;
        passageName ??= arg;
      }
    } else if (firstArg && typeof firstArg === 'object' && !Array.isArray(firstArg)) {
      const linkArg = firstArg as LinkArg;
      if (!linkArg.text) return this.error('<<lanLink>> 链接对象需要 text 属性');
      source = text(linkArg.text);
      passageName = linkArg.link || null;
    } else {
      return this.error('<<lanLink>> 第一个参数必须是字符串、函数或链接对象');
    }
    if (!source) return this.error('<<lanLink>> 缺少有效文本');
    const $container = jQuery(document.createElement('span'));
    const $link = jQuery(document.createElement('a')).addClass('macro-link link-internal').attr('data-translation-key', source);
    if (classes) for (const cls of classes.split(/\s+/)) if (cls.trim()) $link.addClass(cls.trim());
    if (style) $link.attr('style', style);
    if (passageName != null) {
      $link.attr('data-passage', passageName);
      if (maplebirch.SugarCube.Story.has(passageName)) {
        if (maplebirch.SugarCube.Config.addVisitedLinkClass && maplebirch.SugarCube.State.hasPlayed(passageName)) $link.addClass('link-visited');
      } else {
        $link.addClass('link-broken');
      }
    }
    let linkText = macroTranslation(source, maplebirch);
    if (convertMode) {
      $link.attr('data-convert-mode', convertMode);
      linkText = convert(linkText, convertMode);
    }
    $link.append(document.createTextNode(linkText));
    $link.ariaClick(
      {
        namespace: '.macros',
        role: passageName != null ? 'link' : 'button',
        one: passageName != null
      },
      this.createShadowWrapper(content ? () => maplebirch.SugarCube.Wikifier.wikifyEval(content, passageObj) : null, passageName != null ? () => maplebirch.SugarCube.Engine.play(passageName) : null)
    );
    const update = () => {
      let nextText = macroTranslation(source, maplebirch);
      if (convertMode) nextText = convert(nextText, convertMode);
      $link.empty().append(document.createTextNode(nextText));
    };
    $container.append($link);
    $container.appendTo(this.output);
    setup.maplebirch?.language?.add('lanLink', update);
    $container.on('remove', () => setup.maplebirch?.language?.remove('lanLink', update));
  } catch (error: any) {
    maplebirch.log('<<lanLink>> 宏处理错误', 'ERROR', error);
    return this.error(`<<lanLink>> 执行错误: ${error?.message || error}`);
  }
}

function optionsFrom(value: any, convertMode: ConvertMode | null, exprIndex: number): ListboxOption[] {
  const result: ListboxOption[] = [];
  if (Array.isArray(value) || value instanceof Set) {
    const list = Array.isArray(value) ? value : Array.from(value);
    for (const item of list) {
      result.push({
        label: text(item),
        value: item,
        type: 'dynamic',
        exprIndex,
        convertMode
      });
    }
    return result;
  }
  if (value instanceof Map) {
    value.forEach((item, key) => {
      result.push({
        label: text(key),
        value: item,
        type: 'dynamic',
        exprIndex,
        convertMode
      });
    });
    return result;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      result.push({
        label: key,
        value: value[key],
        type: 'dynamic',
        exprIndex,
        convertMode
      });
    }
  }
  return result;
}

function buildOptions(payload: MacroPayload[], allowSelected: boolean): { options: ListboxOption[]; selectedIdx: number } | string {
  const options: ListboxOption[] = [];
  let selectedIdx = -1;
  let exprIndex = 0;
  for (let i = 1; i < payload.length; i++) {
    const item = payload[i];
    const args = Array.isArray(item.args) ? item.args : [];
    if (item.name === 'option') {
      if (args.length === 0) return '<<option>> 需要参数';
      const label = text(args[0]);
      const value = args.length > 1 ? args[1] : label;
      const selected = args.includes('selected');
      let convertMode: ConvertMode | null = null;
      for (let j = 2; j < args.length; j++) {
        if (typeof args[j] === 'string' && (CONVERT_MODES as readonly string[]).includes(args[j])) {
          convertMode = args[j] as ConvertMode;
          break;
        }
      }
      options.push({
        label,
        value,
        type: 'static',
        convertMode
      });
      if (selected) {
        if (!allowSelected) return '不能同时指定 autoselect 和 selected';
        if (selectedIdx !== -1) return '只能有一个选中选项';
        selectedIdx = options.length - 1;
      }
      continue;
    }

    if (item.name === 'optionsfrom') {
      const expression = text(item.args?.full);
      if (!expression) return '<<optionsfrom>> 需要表达式';
      let value: any;
      try {
        value = maplebirch.SugarCube.Scripting.evalJavaScript(expression[0] === '{' ? `(${expression})` : expression);
      } catch (error: any) {
        return `表达式错误: ${error?.message || error}`;
      }
      if (!value || typeof value !== 'object') return '表达式必须返回对象或数组';
      let convertMode: ConvertMode | null = null;
      for (let j = 1; j < args.length; j++) {
        if (typeof args[j] === 'string' && (CONVERT_MODES as readonly string[]).includes(args[j])) {
          convertMode = args[j] as ConvertMode;
          break;
        }
      }
      for (const option of optionsFrom(value, convertMode, exprIndex)) options.push(option);
      exprIndex++;
    }
  }
  if (options.length === 0) return '没有指定选项';
  return { options, selectedIdx };
}

// <<lanListbox>>
function _languageListbox(this: MacroContext): void {
  try {
    if (!this.args || this.args.length === 0) return this.error('<<lanListbox>> 需要至少一个参数：变量名');
    const payload = Array.isArray(this.payload) ? this.payload : [];
    const varName = text(this.args[0]).trim();
    if (!varName || (varName[0] !== '$' && varName[0] !== '_')) return this.error(`变量名 '${varName}' 缺少sigil（$ 或 _）`);
    const varId = maplebirch.SugarCube.Util.slugify(varName);
    const config = { autoselect: false };
    let classes = '';
    let style = '';
    for (let i = 1; i < this.args.length; i++) {
      const arg = this.args[i];
      if (typeof arg !== 'string') continue;
      if (arg === 'autoselect') {
        config.autoselect = true;
      } else if (arg.startsWith('class:')) {
        classes = arg.slice(6);
      } else if (arg.startsWith('style:')) {
        style = arg.slice(6);
      }
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
      .attr({
        id: `lanListbox-${varId}`,
        name: `lanListbox-${varId}`,
        tabindex: 0
      })
      .addClass('macro-lanListbox')
      .on(
        'change.macros',
        this.createShadowWrapper(function (this: HTMLSelectElement) {
          const index = Number(this.value);
          if (options[index]) State.setVar(varName, options[index].value);
        })
      );
    if (classes) for (const cls of classes.split(/\s+/)) if (cls.trim()) $select.addClass(cls.trim());
    if (style) $select.attr('style', style);
    const create = (items: ListboxOption[], index: number) => {
      $select.empty();
      items.forEach((option, i) => {
        let displayText = macroTranslation(option?.label ?? '', maplebirch) || text(option?.label);
        if (option?.convertMode) displayText = convert(displayText, option.convertMode);
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
    setup.maplebirch?.language?.add('lanListbox', update);
    $select.on('remove', () => setup.maplebirch?.language?.remove('lanListbox', update));
  } catch (error: any) {
    maplebirch.log('<<lanListbox>> 错误', 'ERROR', error);
    return this.error(`<<lanListbox>> 错误: ${error?.message || error}`);
  }
}

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
function _radiobuttonsfrom(this: MacroContext): HTMLElement | void {
  if (this.args.length < 2) return this.error('缺少参数：变量名和选项数组');
  const payload = Array.isArray(this.payload) ? this.payload : [];
  const varPath = this.args[0];
  if (typeof varPath === 'string' && !varPath.startsWith('$_') && varPath[0] !== '$' && varPath[0] !== '_') return this.error(`变量名 '${varPath}' 缺少sigil（$、$_ 或 _）`);
  const parsed = parseRadio(this.args[1]);
  if (!parsed) return this.error('无法解析选项参数');
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
    options.push({
      value: optionValue,
      data: displayData,
      label: $label
    });
    try {
      const safeValue = optionValue.replace(/'/g, "\\'");
      const macro = `<<radiobutton '${varPath}' '${safeValue}' autocheck>>`;
      new maplebirch.SugarCube.Wikifier($temp[0], macro);
      if (content) {
        $temp.find('input[type="radio"]').on(
          'change.macros',
          this.createShadowWrapper(function (this: HTMLInputElement) {
            if (this.checked) maplebirch.SugarCube.Wikifier.wikifyEval(content, passageObj);
          })
        );
      }
      $temp.children().appendTo($label);
      const $text = jQuery('<span>').addClass('radiobuttonsfrom-text').attr('data-option-index', index);
      $label.append($text);
      $container.append($label);
      if (index < parsed.length - 1) $container.append(document.createTextNode(separator));
    } catch (error) {
      maplebirch.log('radiobuttonsfrom: 处理选项时出错', 'ERROR', option, error);
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
        if (/<[^>]+>/.test(displayText)) {
          $text.html(displayText);
        } else {
          $text.text(displayText);
        }
      } catch (error) {
        maplebirch.log(`radiobuttonsfrom 更新选项失败: ${index}`, 'ERROR', error, option);
      }
    });
  };
  update();
  setup.maplebirch?.language?.add('radiobuttonsfrom', update);
  $container.on('remove', () => setup.maplebirch?.language?.remove('radiobuttonsfrom', update));
  return $container[0];
}

// <<maplebirchReplace>>
function _overlayReplace(name: string, type: string): void {
  const key = text(name);
  if (!key) return;
  if (T.currentOverlay === key) {
    if (typeof window.closeOverlay === 'function') window.closeOverlay();
    $.wiki('<<exit>>');
    return;
  }
  T.buttons.toggle();
  if (typeof window.updateOptions === 'function') window.updateOptions();
  T.currentOverlay = key;
  const $overlay = jQuery('#customOverlay');
  if ($overlay.length) $overlay.removeClass('hidden').parent().removeClass('hidden').attr('data-overlay', T.currentOverlay);
  switch (type) {
    case 'customize':
      return $.wiki(`<<${key}>><<exit>>`);
    case 'title':
      const titleKey = 'title' + convert(key, 'pascal');
      if (titleKey && maplebirch.tool.macro.Macro.has(titleKey)) $.wiki(`<<replace #customOverlayTitle>><<${titleKey}>><</replace>>`);
      break;
    default:
      break;
  }
  $.wiki(`<<replace #customOverlayContent>><<${key}>><</replace>>`);
}

export { _language, _languageSwitch, _languageButton, _languageLink, _languageListbox, _radiobuttonsfrom, _overlayReplace };
