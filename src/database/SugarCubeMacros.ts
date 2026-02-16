// ./src/database/SugarCubeMacros.ts

import maplebirch, { MaplebirchCore } from '../core';
import { convert } from '../utils';

const _ = maplebirch.lodash;

interface MacroContext {
  args: any[];
  payload: Array<{ name: string; args: any; contents?: string }>;
  output: HTMLElement;
  error: (msg: string) => any;
  createShadowWrapper: (fn?: Function | null, fn2?: Function | null) => (event: JQuery.Event) => void;
  passageObj?: any;
  lanListboxCache?: Record<string, { options: any[]; selectedIdx: number }>;
}

interface LinkArg {
  text: string;
  link?: string;
}

function macroTranslation(key: any, core: MaplebirchCore = maplebirch): string {
  try {
    key = String(key);
  } catch {
    return '';
  }
  const translation = core.t(key);
  if (translation[0] !== '[' || translation[translation.length - 1] !== ']') return translation;
  const autoTranslated = core.auto(key);
  if (autoTranslated !== key) return autoTranslated;
  if (key.includes(' ')) {
    const words = key.split(' ');
    const translatedWords = words.map((word: string) => core.auto(word));
    if (translatedWords.some((word: string, i: number) => word !== words[i])) return core.Language === 'CN' ? translatedWords.join('') : translatedWords.join(' ');
  }
  return key;
}

// <<language>>
function _language(this: MacroContext) {
  const $container = jQuery('<div style="display: contents;"></div>');
  const render = () => {
    const lang = maplebirch.Language;
    const content = this.payload.find((p: { name: string; args: any; contents?: string }) => p.name === 'option' && p.args[0]?.toUpperCase() === lang.toUpperCase())?.contents || '';
    $container.empty();
    if (content) {
      const fragment = document.createDocumentFragment();
      new maplebirch.SugarCube.Wikifier(fragment, content);
      $container.append(fragment);
      Links.generate();
    }
  };
  render();
  jQuery(this.output).append($container);
  _.invoke(setup, 'maplebirch.language.add', 'language', render);
  $container.on('remove', () => _.invoke(setup, 'maplebirch.language.remove', 'language', render));
}

// <<lanSwitch>>
function _languageSwitch(this: void, ...lanObj: any[]): string;
function _languageSwitch(this: MacroContext, ...lanObj: any[]): HTMLElement;
function _languageSwitch(this: MacroContext | void, ...lanObj: any[]): string | HTMLElement {
  const availableLangs = maplebirch.meta.Languages;
  const lancheck = maplebirch.Language;
  let targetObj: Record<string, string>;
  if (typeof lanObj[0] === 'object' && lanObj[0] !== null && !Array.isArray(lanObj[0])) {
    targetObj = lanObj[0];
  } else {
    const texts = Array.isArray(lanObj[0]) ? lanObj[0] : lanObj;
    targetObj = _.transform(
      texts,
      (acc, text, index) => {
        if (availableLangs[index]) acc[availableLangs[index]] = text;
      },
      {} as Record<string, string>
    );
  }

  if (!targetObj.hasOwnProperty(lancheck)) {
    const available = Object.keys(targetObj);
    maplebirch.Language = available.length > 0 ? available[0] : availableLangs[0];
  }

  const context = this as MacroContext;
  if (context?.output) {
    try {
      const $container = jQuery('<span style="display: contents;"></span>');
      const contentObj = targetObj;
      const renderContent = () => {
        $container.empty();
        const currentLang = maplebirch.Language;
        const content = contentObj[currentLang] || contentObj[availableLangs[0]] || '';
        if (content) {
          const fragment = document.createDocumentFragment();
          new maplebirch.SugarCube.Wikifier(fragment, content);
          $container.append(fragment);
          Links.generate();
        }
      };
      renderContent();
      jQuery(context.output).append($container);
      _.invoke(setup, 'maplebirch.language.add', 'lanSwitch', renderContent);
      $container.on('remove', () => _.invoke(setup, 'maplebirch.language.remove', 'lanSwitch', renderContent));
      return $container[0];
    } catch (e) {
      maplebirch.log('lanSwitch 宏模式错误', 'ERROR', e);
      return targetObj[lancheck];
    }
  } else {
    return targetObj[lancheck];
  }
}

// <<lanButton>>
function _languageButton(this: MacroContext) {
  try {
    if (!this.args || this.args.length === 0) return this.error('<<lanButton>> 需要至少一个参数');
    const arg = this.args[0];
    let buttonText = '';
    let translationKey = '';
    let convertMode: 'title' | 'lower' | 'upper' | 'capitalize' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant';
    let customClasses = '';
    let inlineStyle = '';

    for (let i = 1; i < this.args.length; i++) {
      if (typeof this.args[i] === 'string') {
        if (this.args[i].startsWith('class:')) {
          customClasses = this.args[i].substring(6);
        } else if (this.args[i].startsWith('style:')) {
          inlineStyle = this.args[i].substring(6);
        }
      }
    }

    if (typeof arg === 'string') {
      translationKey = arg;
      for (let i = 1; i < this.args.length; i++) {
        if (typeof this.args[i] === 'string' && !this.args[i].startsWith('class:') && !this.args[i].startsWith('style:')) {
          convertMode = this.args[i] as any;
          break;
        }
      }
      buttonText = macroTranslation(translationKey, maplebirch);
    } else if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
      if ('text' in arg) {
        translationKey = arg.text;
        for (let i = 1; i < this.args.length; i++) {
          if (typeof this.args[i] === 'string' && !this.args[i].startsWith('class:') && !this.args[i].startsWith('style:')) {
            convertMode = this.args[i] as any;
            break;
          }
        }
        buttonText = macroTranslation(translationKey, maplebirch);
      } else {
        return this.error('<<lanButton>> 不支持的参数对象类型');
      }
    } else {
      return this.error('<<lanButton>> 参数必须是字符串、函数或对象');
    }

    if (convertMode && buttonText) buttonText = convert(buttonText, convertMode);
    const $button = jQuery(document.createElement('button')).addClass('macro-button link-internal').attr('data-translation-key', translationKey);

    if (customClasses) {
      customClasses.split(/\s+/).forEach((cls: string) => {
        if (cls.trim()) $button.addClass(cls.trim());
      });
    }

    if (inlineStyle) $button.attr('style', inlineStyle);
    else {
      $button.append(document.createTextNode(buttonText));
    }

    const payloadContent = (this.payload[0]?.contents || '').trim() || '';
    const macroThis = this as MacroContext;

    $button.ariaClick(
      {
        namespace: '.macros',
        role: 'button',
        one: false
      },
      this.createShadowWrapper(payloadContent ? () => maplebirch.SugarCube.Wikifier.wikifyEval(payloadContent, macroThis.passageObj) : null)
    );

    const updateButtonText = () => {
      const newText = macroTranslation(translationKey, maplebirch);
      let finalText = newText;
      if (convertMode) finalText = convert(newText, convertMode);
      $button.empty().append(document.createTextNode(finalText));
    };

    $button.appendTo(this.output);
    _.invoke(setup, 'maplebirch.language.add', 'lanButton', updateButtonText);
    $button.on('remove', () => _.invoke(setup, 'maplebirch.language.remove', 'lanButton', updateButtonText));
  } catch (e: any) {
    maplebirch.log('<<lanButton>> 宏处理错误', 'ERROR', e);
    return this.error(`<<lanButton>> 执行错误: ${e.message}`);
  }
}

// <<lanLink>>
function _languageLink(this: MacroContext) {
  try {
    if (!this.args || this.args.length === 0) return this.error('<<lanLink>> 需要至少一个参数');
    T.link = true;
    const CONVERT_MODES = ['lower', 'upper', 'capitalize', 'title', 'camel', 'pascal', 'snake', 'kebab', 'constant'];
    let translationKey = '';
    let passageName: string | null = null;
    let convertMode: any;
    let customClasses = '';
    let inlineStyle = '';
    const firstArg = this.args[0];

    if (typeof firstArg === 'string') {
      translationKey = firstArg;
      for (let i = 1; i < this.args.length; i++) {
        const arg = this.args[i];
        if (typeof arg === 'string') {
          if (arg.startsWith('class:')) {
            customClasses = arg.substring(6);
          } else if (arg.startsWith('style:')) {
            inlineStyle = arg.substring(6);
          } else if (CONVERT_MODES.includes(arg)) {
            convertMode = arg;
          } else if (!passageName) {
            passageName = arg;
          }
        }
      }
    } else if (firstArg && typeof firstArg === 'object' && !Array.isArray(firstArg)) {
      const linkArg = firstArg as LinkArg;
      if (linkArg.text) {
        translationKey = linkArg.text;
        passageName = linkArg.link || null;
        for (let i = 1; i < this.args.length; i++) {
          const arg = this.args[i];
          if (typeof arg === 'string') {
            if (arg.startsWith('class:')) {
              customClasses = arg.substring(6);
            } else if (arg.startsWith('style:')) {
              inlineStyle = arg.substring(6);
            } else if (CONVERT_MODES.includes(arg)) {
              convertMode = arg;
            }
          }
        }
      } else {
        return this.error('<<lanLink>> 链接对象需要 text 属性');
      }
    } else {
      return this.error('<<lanLink>> 第一个参数必须是字符串或链接对象');
    }

    let linkText = macroTranslation(translationKey, maplebirch);
    const $container = jQuery(document.createElement('span'));
    const $link = jQuery(document.createElement('a')).addClass('macro-link link-internal').attr('data-translation-key', translationKey);

    if (customClasses) {
      customClasses.split(/\s+/).forEach((cls: string) => {
        if (cls.trim()) $link.addClass(cls.trim());
      });
    }

    if (inlineStyle) $link.attr('style', inlineStyle);
    if (passageName != null) {
      $link.attr('data-passage', passageName);
      if (maplebirch.SugarCube.Story.has(passageName)) {
        if (maplebirch.SugarCube.Config.addVisitedLinkClass && maplebirch.SugarCube.State.hasPlayed(passageName)) $link.addClass('link-visited');
      } else {
        $link.addClass('link-broken');
      }
    }

    if (convertMode) {
      $link.attr('data-convert-mode', convertMode);
      linkText = convert(linkText, convertMode);
    }
    $link.append(document.createTextNode(linkText));
    const payloadContent = (this.payload[0]?.contents || '').trim() || '';
    const macroThis = this as MacroContext;

    $link.ariaClick(
      {
        namespace: '.macros',
        role: passageName != null ? 'link' : 'button',
        one: passageName != null
      },
      this.createShadowWrapper(
        payloadContent ? () => maplebirch.SugarCube.Wikifier.wikifyEval(payloadContent, macroThis.passageObj) : null,
        passageName != null ? () => maplebirch.SugarCube.Engine.play(passageName) : null
      )
    );

    const updateLinkText = () => {
      let newText = macroTranslation(translationKey, maplebirch);
      if (convertMode) newText = convert(newText, convertMode);
      $link.empty().append(document.createTextNode(newText));
    };

    $container.append($link);
    $container.appendTo(this.output);
    _.invoke(setup, 'maplebirch.language.add', 'lanLink', updateLinkText);
    $container.on('remove', () => _.invoke(setup, 'maplebirch.language.remove', 'lanLink', updateLinkText));
  } catch (e: any) {
    maplebirch.log('<<lanLink>> 宏处理错误', 'ERROR', e);
    return this.error(`<<lanLink>> 执行错误: ${e.message}`);
  }
}

// <<lanListbox>>
function _languageListbox(this: MacroContext) {
  try {
    if (!this.args || this.args.length === 0) return this.error('<<lanListbox>> 需要至少一个参数：变量名');
    const varName = String(this.args[0]).trim();
    if (!varName || (varName[0] !== '$' && varName[0] !== '_')) return this.error(`变量名 '${varName}' 缺少sigil（$ 或 _）`);
    const varId = maplebirch.SugarCube.Util.slugify(varName);
    const CONVERT_MODES = ['lower', 'upper', 'capitalize', 'title', 'camel', 'pascal', 'snake', 'kebab', 'constant'];
    const config = { autoselect: false };
    let customClasses = '';
    let inlineStyle = '';

    for (let i = 1; i < this.args.length; i++) {
      const arg = this.args[i];
      if (typeof arg === 'string') {
        if (arg === 'autoselect') config.autoselect = true;
        else if (arg.startsWith('class:')) customClasses = arg.substring(6);
        else if (arg.startsWith('style:')) inlineStyle = arg.substring(6);
      }
    }

    const options: Array<{ label: string; value: any; type: string; exprIndex?: number; convertMode: string | null }> = [];
    let selectedIdx = -1;
    const dynamic = { payloads: [] as any[], expressions: [] as string[] };

    for (let i = 1; i < this.payload.length; i++) {
      const payload = this.payload[i];
      if (payload.name === 'option') {
        if (payload.args.length === 0) return this.error('<<option>> 需要参数');
        const label = String(payload.args[0]);
        const value = payload.args.length > 1 ? payload.args[1] : label;
        let isSelected = false;
        let convertMode: string | null = null;

        for (let j = 2; j < payload.args.length; j++) {
          const arg = payload.args[j];
          if (arg === 'selected') isSelected = true;
          else if (CONVERT_MODES.includes(arg)) convertMode = arg;
        }

        options.push({ label, value, type: 'static', convertMode });
        if (isSelected) {
          if (config.autoselect) return this.error('不能同时指定 autoselect 和 selected');
          if (selectedIdx !== -1) return this.error('只能有一个选中选项');
          selectedIdx = options.length - 1;
        }
      } else if (payload.name === 'optionsfrom') {
        if (!payload.args.full) return this.error('<<optionsfrom>> 需要表达式');
        dynamic.payloads.push(payload);
        dynamic.expressions.push(payload.args.full);
        let dynConvertMode: string | null = null;

        for (let j = 1; j < payload.args.length; j++) {
          const arg = payload.args[j];
          if (CONVERT_MODES.includes(arg)) {
            dynConvertMode = arg;
            break;
          }
        }

        let result: any;
        try {
          const exp = payload.args.full;
          result = maplebirch.SugarCube.Scripting.evalJavaScript(exp[0] === '{' ? `(${exp})` : exp);
        } catch (ex: any) {
          return this.error(`表达式错误: ${ex.message}`);
        }

        if (typeof result !== 'object' || result === null) return this.error('表达式必须返回对象或数组');
        if (Array.isArray(result) || result instanceof Set) {
          const resultArray = Array.isArray(result) ? result : Array.from(result);
          resultArray.forEach((val: any) =>
            options.push({
              label: String(val),
              value: val,
              type: 'dynamic',
              exprIndex: dynamic.expressions.length - 1,
              convertMode: dynConvertMode
            })
          );
        } else if (result instanceof Map) {
          result.forEach((val: any, key: any) =>
            options.push({
              label: String(key),
              value: val,
              type: 'dynamic',
              exprIndex: dynamic.expressions.length - 1,
              convertMode: dynConvertMode
            })
          );
        } else {
          Object.keys(result).forEach((key: string) =>
            options.push({
              label: key,
              value: result[key],
              type: 'dynamic',
              exprIndex: dynamic.expressions.length - 1,
              convertMode: dynConvertMode
            })
          );
        }
      }
    }

    if (options.length === 0) return this.error('没有指定选项');
    if (selectedIdx === -1) {
      selectedIdx = config.autoselect ? options.findIndex((opt: any) => maplebirch.SugarCube.Util.sameValueZero(opt.value, State.getVar(varName))) : 0;
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
          State.setVar(varName, options[Number(this.value)].value);
        })
      );

    if (customClasses) {
      customClasses.split(/\s+/).forEach((cls: string) => {
        if (cls.trim()) $select.addClass(cls.trim());
      });
    }

    if (inlineStyle) $select.attr('style', inlineStyle);

    const create = (opts: typeof options, selectIdx: number) => {
      $select.empty();
      opts.forEach((opt: any, i: number) => {
        let displayText = macroTranslation(opt.label, maplebirch) || opt.label;
        if (opt.convertMode) displayText = convert(displayText, opt.convertMode);
        jQuery(document.createElement('option'))
          .val(i)
          .text(displayText)
          .attr('data-translation-key', opt.label)
          .attr('data-convert-mode', opt.convertMode || '')
          .attr('data-opt-type', opt.type)
          .attr('data-expr-index', opt.exprIndex || -1)
          .prop('selected', i === selectIdx)
          .appendTo($select);
      });
    };

    create(options, selectedIdx);
    $select.appendTo(this.output);
    State.setVar(varName, options[selectedIdx].value);

    if (!this.lanListboxCache) this.lanListboxCache = {};
    const updateOptions = () => {
      const cacheKey = maplebirch.Language;
      if (this.lanListboxCache![cacheKey]) {
        const cached = this.lanListboxCache![cacheKey];
        options.length = 0;
        cached.options.forEach((o: any) => options.push(o));
        create(options, cached.selectedIdx);
        selectedIdx = cached.selectedIdx;
        State.setVar(varName, options[selectedIdx].value);
        return;
      }

      const freshOpts: typeof options = [];
      for (let i = 1; i < this.payload.length; i++) {
        const p = this.payload[i];
        if (p.name === 'option') {
          const lbl = String(p.args[0]);
          const val = p.args.length > 1 ? p.args[1] : lbl;
          let convertMode: string | null = null;

          for (let j = 2; j < p.args.length; j++) {
            const arg = p.args[j];
            if (CONVERT_MODES.includes(arg)) {
              convertMode = arg;
              break;
            }
          }

          freshOpts.push({ label: lbl, value: val, type: 'static', convertMode, exprIndex: -1 } as any);
        } else if (p.name === 'optionsfrom') {
          let res: any;
          try {
            const exp = p.args.full;
            res = maplebirch.SugarCube.Scripting.evalJavaScript(exp[0] === '{' ? `(${exp})` : exp);
          } catch (ex: any) {
            maplebirch.log(`<<lanListbox>> 重新计算表达式错误: ${ex.message}`, 'ERROR');
            continue;
          }

          if (typeof res !== 'object' || res === null) continue;
          const exprIndex = dynamic.expressions.indexOf(p.args.full);
          let dynConvertMode: string | null = null;

          for (let j = 1; j < p.args.length; j++) {
            const arg = p.args[j];
            if (CONVERT_MODES.includes(arg)) {
              dynConvertMode = arg;
              break;
            }
          }

          if (Array.isArray(res) || res instanceof Set) {
            const resArray = Array.isArray(res) ? res : Array.from(res);
            resArray.forEach((v: any) =>
              freshOpts.push({
                label: String(v),
                value: v,
                type: 'dynamic',
                exprIndex,
                convertMode: dynConvertMode
              })
            );
          } else if (res instanceof Map) {
            res.forEach((v: any, k: any) =>
              freshOpts.push({
                label: String(k),
                value: v,
                type: 'dynamic',
                exprIndex,
                convertMode: dynConvertMode
              })
            );
          } else {
            Object.keys(res).forEach((k: string) =>
              freshOpts.push({
                label: k,
                value: res[k],
                type: 'dynamic',
                exprIndex,
                convertMode: dynConvertMode
              })
            );
          }
        }
      }

      if (freshOpts.length > 0) {
        const currVal = State.getVar(varName);
        const newIdx = config.autoselect ? freshOpts.findIndex((o: any) => maplebirch.SugarCube.Util.sameValueZero(o.value, currVal)) : selectedIdx;

        options.length = 0;
        freshOpts.forEach((o: any) => options.push(o));
        const finalIdx = newIdx !== -1 ? newIdx : 0;
        create(options, finalIdx);
        selectedIdx = finalIdx;
        if (newIdx === -1) State.setVar(varName, freshOpts[0].value);
        this.lanListboxCache![cacheKey] = {
          options: [...freshOpts],
          selectedIdx: finalIdx
        };
      }
    };

    _.invoke(setup, 'maplebirch.language.add', 'lanListbox', updateOptions);
    $select.on('remove', () => {
      _.invoke(setup, 'maplebirch.language.remove', 'lanListbox', updateOptions);
      delete this.lanListboxCache;
    });
  } catch (e: any) {
    maplebirch.log('<<lanListbox>> 错误', 'ERROR', e);
    return this.error(`<<lanListbox>> 错误: ${e.message}`);
  }
}

// <<radiobuttonsfrom>>
function _radiobuttonsfrom(this: MacroContext): HTMLElement | void {
  if (this.args.length < 2) return this.error('缺少参数：变量名和选项数组');
  const varPath = this.args[0];
  if (typeof varPath === 'string') {
    if (!varPath.startsWith('$_') && '$' !== varPath[0] && '_' !== varPath[0]) {
      return this.error(`变量名 '${varPath}' 缺少sigil（$、$_ 或 _）`);
    }
  }

  let options = this.args[1];
  const separator = this.args.length > 2 ? this.args[2] : ' | ';
  const $container = jQuery('<span>').addClass('radiobuttonsfrom-container');
  let parsedOptions: Array<[string, any]> = [];

  const parse = (input: any): Array<[string, any]> | null => {
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') {
      const str = input.trim();
      if (str.includes('|')) {
        const options: Array<[string, any]> = [];
        const optionStrs = str.split('|').map((s: string) => s.trim());
        optionStrs.forEach((optionStr: string) => {
          if (optionStr.startsWith('[') && optionStr.endsWith(']')) {
            const valueContent = optionStr.substring(1, optionStr.length - 1);
            if (valueContent.includes(',')) options.push(['', valueContent.split(',')]);
            else options.push(['', valueContent]);
          } else if (optionStr.includes('[') && optionStr.endsWith(']')) {
            const bracketIndex = optionStr.indexOf('[');
            const key = optionStr.substring(0, bracketIndex);
            const valueContent = optionStr.substring(bracketIndex + 1, optionStr.length - 1);
            if (valueContent.includes(',')) options.push([key, valueContent.split(',')]);
            else options.push([key, valueContent]);
          } else if (!optionStr.includes('[') && !optionStr.includes(']')) {
            options.push([optionStr, optionStr]);
          } else options.push([optionStr, optionStr]);
        });
        return options;
      }
    }
    return null;
  };

  try {
    parsedOptions = parse(options)!;
    if (!parsedOptions) return this.error('无法解析选项参数');
  } catch (e: any) {
    return this.error(`无法解析选项参数: ${e.message}`);
  }

  const hasContent = this.payload.length > 0;
  const content = hasContent ? this.payload[0]?.contents || '' : '';
  const macroThis = this as MacroContext;
  const optionsData: Array<{ value: string; data: any; $label: ReturnType<typeof jQuery> }> = [];

  parsedOptions.forEach((option: [string, any], index: number) => {
    const $label = jQuery('<label>').addClass('radiobuttonsfrom-label');
    const $temp = jQuery(document.createElement('div'));
    let optionValue: string = (Array.isArray(option) && option.length >= 2 ? option[0] : option) as string;
    let displayData = Array.isArray(option) && option.length >= 2 ? option[1] : option;
    const optionInfo = { value: optionValue, data: displayData, $label: $label };
    optionsData.push(optionInfo);

    try {
      const safeValue = String(optionValue).replace(/'/g, "\\'");
      const macroStr = `<<radiobutton '${varPath}' '${safeValue}' autocheck>>`;
      new maplebirch.SugarCube.Wikifier($temp[0], macroStr);
      if (hasContent) {
        $temp.find('input[type="radio"]').on(
          'change.macros',
          this.createShadowWrapper(function (this: HTMLInputElement) {
            if (this.checked && content) maplebirch.SugarCube.Wikifier.wikifyEval(content, macroThis.passageObj);
          })
        );
      }
      $temp.children().appendTo($label);
      const $textContainer = jQuery('<span>').addClass('radiobuttonsfrom-text').attr('data-option-index', index);
      $label.append($textContainer);
      $container.append($label);
      if (index < parsedOptions.length - 1) $container.append(document.createTextNode(separator));
    } catch (error) {
      maplebirch.log('radiobuttonsfrom: 处理选项时出错', 'ERROR', option, error);
    }
  });

  $container.appendTo(this.output);
  const updateDisplayTexts = () => {
    const currentLang = maplebirch.Language;
    optionsData.forEach((option: any, index: number) => {
      const $textContainer = $container.find(`.radiobuttonsfrom-text[data-option-index="${index}"]`);
      let displayText = '';
      if (Array.isArray(option.data)) {
        if (option.data.length === 2 && Array.isArray(option.data[0])) {
          const langData = option.data.find((item: any) => item && Array.isArray(item));
          if (langData) {
            displayText = langData[0];
            if (currentLang === 'CN' && langData.length > 1) displayText = langData[1];
          }
        } else {
          displayText = option.data[0] || String(option.value);
          if (currentLang === 'CN' && option.data.length > 1) displayText = option.data[1];
        }
      } else if (option.data && typeof option.data === 'object' && !Array.isArray(option.data)) {
        displayText = option.data[currentLang] || option.data.EN || String(option.value);
      } else {
        displayText = String(option.data);
      }
      $textContainer.empty();
      if (typeof displayText === 'string' && /<[^>]+>/.test(displayText)) $textContainer.html(displayText);
      else $textContainer.text(displayText);
    });
  };

  updateDisplayTexts();
  _.invoke(setup, 'maplebirch.language.add', 'radiobuttonsfrom', updateDisplayTexts);
  $container.on('remove', () => _.invoke(setup, 'maplebirch.language.remove', 'radiobuttonsfrom', updateDisplayTexts));
  return $container[0];
}

// <<maplebirchReplace>>
function _overlayReplace(name: string, type: string) {
  const key = name;
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
