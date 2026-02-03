// @ts-nocheck
/// <reference path='../../maplebirch.d.ts' />
(async() => {
  'use strict';

  /** @param {string} npcName @param {{ (): string; (): void; (): any; }} original */
  function Schedules(npcName, original) {
    /**@type {any}*/
    const scheduleMap = {
      'Robin': 'robin_location',
      'Sydney': 'sydney_location'
    };
    const property = scheduleMap[npcName];
    if (!property) return original;
    return function () {
      const location = maplebirch.npc.Schedules.get(npcName)?.location;
      const result = original();
      T[property] = V.options.maplebirch.npcschedules ? location : result ?? location;
      return T[property];
    };
  }

  class Internals {
    /** @param {string} key */
    static macroTranslation(key, core = maplebirch) {
      try { key = String(key); }
      catch (e) { return ''; }
      const translation = core.t(key);
      if (translation[0] !== '[' || translation[translation.length - 1] !== ']') return translation;
      const autoTranslated = core.auto(key);
      if (autoTranslated !== key) return autoTranslated;
      if (key.includes(' ')) {
        const words = key.split(' ');
        const translatedWords = words.map(word => core.auto(word));
        if (translatedWords.some((word, i) => word !== words[i])) return core.Language === 'CN' ? translatedWords.join('') : translatedWords.join(' ');
      }
      return key;
    }

    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.core = core;
      this.log = this.core.tool.createLog('internals');
      this.updateTimer = null;
    }

    #languageWidgetManager() {
      setup.maplebirch.language = {
        managers: { language: new Map(), lanSwitch: new Map(), lanButton: new Map(), lanLink: new Map(), lanListbox: new Map(), radiobuttonsfrom: new Map(), },
        init() {
          if (this.initialized) return;
          maplebirch.on(':language', () => {
            for (const [macroType, manager] of Object.entries(this.managers)) {
              manager.forEach((updater) => {
                try { updater(); }
                catch (e) { maplebirch.log(`Language update error for ${macroType}`, 'ERROR', e); }
              });
            }
          });
          maplebirch.once(':passagestart', () => Object.values(this.managers).forEach(manager => manager.clear()));
          this.initialized = true;
        },
        /** @param {string|number} macroType @param {any} updater */
        add(macroType, updater) {
          if (!this.managers[macroType]) this.managers[macroType] = new Map();
          this.managers[macroType].set(updater, updater);
          this.init();
        },
        /** @param {string|number} macroType @param {any} updater */
        remove(macroType, updater) {
          this.managers[macroType]?.delete(updater);
        }
      };
    }

    // <<language>>
    _language() {
      const $container = jQuery('<div style="display: contents;"></div>');
      const render = () => {
        const lang = maplebirch.Language;
        const content = this.payload.find(p => p.name === 'option' && p.args[0]?.toUpperCase() === lang.toUpperCase())?.contents || '';
        $container.empty();
        if (content) {
          const fragment = document.createDocumentFragment();
          new maplebirch.SugarCube.Wikifier(fragment, content);
          $container.append(fragment);
          Links.generate();
        }
      };
      render();
      $(this.output).append($container);
      setup.maplebirch.language.add('language', render);
      $container.on('remove', () => setup.maplebirch.language.remove('language', render));
    }

    // <<lanSwitch>>
    _languageSwitch(...lanObj) {
      const availableLangs = maplebirch.meta.availableLanguages;
      const lancheck = maplebirch.Language;
      let targetObj;
      
      if (typeof lanObj[0] === 'object' && lanObj[0] !== null && !Array.isArray(lanObj[0])) {
        targetObj = lanObj[0];
      } else {
        targetObj = {};
        if (Array.isArray(lanObj[0])) {
          lanObj[0].forEach((text, index) => { if (availableLangs[index]) targetObj[availableLangs[index]] = text; });
        } else {
          lanObj.forEach((text, index) => { if (availableLangs[index]) targetObj[availableLangs[index]] = text; });
        }
      }

      if (targetObj[lancheck] == undefined) {
        const available = Object.keys(targetObj);
        maplebirch.Language = available.length > 0 ? available[0] : availableLangs[0];
      }

      if (this?.output) {
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
          $(this.output).append($container);
          setup.maplebirch.language.add('lanSwitch', renderContent);
          $container.on('remove', () => setup.maplebirch.language.remove('lanSwitch', renderContent));
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
    _languageButton() {
      try {
        if (!this.args || this.args.length === 0) return this.error('<<lanButton>> 需要至少一个参数');
        const arg = this.args[0];
        let buttonText = '';
        let translationKey = '';
        let convertMode = null;
        let $image = null;
        let customClasses = '';
        let inlineStyle = '';
        for (let i = 1; i < this.args.length; i++) {
          if (typeof this.args[i] === 'string') {
            if (this.args[i].startsWith('class:')) { customClasses = this.args[i].substring(6); }
            else if (this.args[i].startsWith('style:')) { inlineStyle = this.args[i].substring(6); }
          }
        }
        if (typeof arg === 'string') {
          translationKey = arg;
          for (let i = 1; i < this.args.length; i++) if (typeof this.args[i] === 'string' && !this.args[i].startsWith('class:') && !this.args[i].startsWith('style:')) { convertMode = this.args[i]; break; }
          buttonText = Internals.macroTranslation(translationKey, maplebirch);
        } else if (typeof arg === 'object') {
          if (arg.isImage) {
            $image = jQuery(document.createElement('img')).attr('src', arg.source);
            if (arg.passage) $image.attr('data-passage', arg.passage);
            if (arg.title) $image.attr('title', arg.title);
            if (arg.align) $image.attr('align', arg.align);
            translationKey = `image:${arg.source}`;
            for (let i = 1; i < this.args.length; i++) if (typeof this.args[i] === 'string' && !this.args[i].startsWith('class:') && !this.args[i].startsWith('style:')) { convertMode = this.args[i]; break; }
          } else if (arg.text) {
            translationKey = arg.text;
            for (let i = 1; i < this.args.length; i++) if (typeof this.args[i] === 'string' && !this.args[i].startsWith('class:') && !this.args[i].startsWith('style:')) { convertMode = this.args[i]; break; }
            buttonText = Internals.macroTranslation(translationKey, maplebirch);
          } else {
            return this.error('<<lanButton>> 不支持的参数对象类型');
          }
        } else {
          return this.error('<<lanButton>> 参数必须是字符串、函数或对象');
        }

        if (convertMode && buttonText) buttonText = maplebirch.tool.convert(buttonText, convertMode);

        const $button = jQuery(document.createElement('button')).addClass('macro-button link-internal').attr('data-translation-key', translationKey);
        if (customClasses) customClasses.split(/\s+/).forEach(cls => { if (cls.trim()) $button.addClass(cls.trim()); });
        if (inlineStyle) $button.attr('style', inlineStyle);

        if ($image) { $button.append($image).addClass('link-image'); }
        else { $button.append(document.createTextNode(buttonText)); }

        const payloadContent = this.payload[0]?.contents?.trim() || '';
        const macroThis = this;

        $button.ariaClick({
          namespace: '.macros',
          role: 'button',
          one: false
        }, this.createShadowWrapper(
          payloadContent ? () => { maplebirch.SugarCube.Wikifier.wikifyEval(payloadContent, macroThis.passageObj); } : null
        ));

        const updateButtonText = () => {
          if ($image) return;
          const newText = Internals.macroTranslation(translationKey, maplebirch);
          let finalText = newText;
          if (convertMode) finalText = maplebirch.tool.convert(newText, convertMode);
          $button.empty().append(document.createTextNode(finalText));
        };

        $button.appendTo(this.output);
        setup.maplebirch.language.add('lanButton', updateButtonText);
        $button.on('remove', () => setup.maplebirch.language.remove('lanButton', updateButtonText));
      } catch (e) {
        maplebirch.log('<<lanButton>> 宏处理错误', 'ERROR', e);
        return this.error(`<<lanButton>> 执行错误: ${e.message}`);
      }
    }

    // <<lanLink>>
    _languageLink() {
      try {
        if (!this.args || this.args.length === 0) return this.error('<<lanLink>> 需要至少一个参数');
        T.link = true;
        const CONVERT_MODES = ['lower','upper','capitalize','title','camel','pascal','snake','kebab','constant'];
        let translationKey = '';
        let passageName = null;
        let convertMode = null;
        let customClasses = '';
        let inlineStyle = '';
        const firstArg = this.args[0];
        if (typeof firstArg === 'string') {
          translationKey = firstArg;
          for (let i = 1; i < this.args.length; i++) {
            const arg = this.args[i];
            if (typeof arg === 'string') {
              if (arg.startsWith('class:')) { customClasses = arg.substring(6); }
              else if (arg.startsWith('style:')) { inlineStyle = arg.substring(6); }
              else if (CONVERT_MODES.includes(arg)) { convertMode = arg; }
              else if (!passageName) { passageName = arg; }
            }
          }
        } else if (firstArg && typeof firstArg === 'object') {
          if (firstArg.text) {
            translationKey = firstArg.text;
            passageName = firstArg.link || null;
            for (let i = 1; i < this.args.length; i++) {
              const arg = this.args[i];
              if (typeof arg === 'string') {
                if (arg.startsWith('class:')) { customClasses = arg.substring(6); }
                else if (arg.startsWith('style:')) { inlineStyle = arg.substring(6); }
                else if (CONVERT_MODES.includes(arg)) { convertMode = arg; }
              }
            }
          } else {
            return this.error('<<lanLink>> 链接对象需要 text 属性');
          }
        } else {
          return this.error('<<lanLink>> 第一个参数必须是字符串或链接对象');
        }
        let linkText = Internals.macroTranslation(translationKey, maplebirch);
        const $container = jQuery(document.createElement('span'));
        const $link = jQuery(document.createElement('a')).addClass('macro-link link-internal').attr('data-translation-key', translationKey);
        if (customClasses) customClasses.split(/\s+/).forEach(cls => { if (cls.trim()) $link.addClass(cls.trim()); });
        if (inlineStyle) $link.attr('style', inlineStyle);
        if (passageName != null) {
          $link.attr('data-passage', passageName);
          if (maplebirch.SugarCube.Story.has(passageName)) {
            if (maplebirch.SugarCube.Config.addVisitedLinkClass && maplebirch.SugarCube.State.hasPlayed(passageName)) $link.addClass('link-visited');
          } else {
            $link.addClass('link-broken');
          }
        }
        if (convertMode) { $link.attr('data-convert-mode', convertMode); linkText = maplebirch.tool.convert(linkText, convertMode); }
        $link.append(document.createTextNode(linkText));
        const payloadContent = this.payload[0]?.contents?.trim() || '';
        const macroThis = this;
        $link.ariaClick({
          namespace: '.macros',
          role: passageName != null ? 'link' : 'button',
          one: passageName != null
        }, this.createShadowWrapper(
          payloadContent ? () => maplebirch.SugarCube.Wikifier.wikifyEval(payloadContent, macroThis.passageObj) : null,
          passageName != null ? () => maplebirch.SugarCube.Engine.play(passageName) : null
        ));
        const updateLinkText = () => {
          let newText = Internals.macroTranslation(translationKey, maplebirch);
          if (convertMode) newText = maplebirch.tool.convert(newText, convertMode);
          $link.empty().append(document.createTextNode(newText));
        };
        $container.append($link);
        $container.appendTo(this.output);
        setup.maplebirch.language.add('lanLink', updateLinkText);
        $container.on('remove', () => setup.maplebirch.language.remove('lanLink', updateLinkText));
      } catch (e) {
        maplebirch.log('<<lanLink>> 宏处理错误', 'ERROR', e);
        return this.error(`<<lanLink>> 执行错误: ${e.message}`);
      }
    }

    // <<lanListbox>>
    _languageListbox() {
      try {
        if (!this.args || this.args.length === 0) return this.error('<<lanListbox>> 需要至少一个参数：变量名');
        const varName = String(this.args[0]).trim();
        if (!varName || (varName[0] !== '$' && varName[0] !== '_')) return this.error(`变量名 '${varName}' 缺少sigil（$ 或 _）`);
        const varId = maplebirch.SugarCube.Util.slugify(varName);
        const CONVERT_MODES = ['lower','upper','capitalize','title','camel','pascal','snake','kebab','constant'];
        const config = { autoselect: false };
        let customClasses = '';
        let inlineStyle = '';
        for (let i = 1; i < this.args.length; ++i) {
          const arg = this.args[i];
          if (typeof arg === 'string') {
            if (arg === 'autoselect') config.autoselect = true;
            else if (arg.startsWith('class:')) customClasses = arg.substring(6);
            else if (arg.startsWith('style:')) inlineStyle = arg.substring(6);
          }
        }
        const options = [];
        let selectedIdx = -1;
        const dynamic = { payloads: [], expressions: [] };
        for (let i = 1; i < this.payload.length; ++i) {
          const payload = this.payload[i];
          if (payload.name === 'option') {
            if (payload.args.length === 0) return this.error('<<option>> 需要参数');
            const label = String(payload.args[0]);
            const value = payload.args.length > 1 ? payload.args[1] : label;
            let isSelected = false;
            let convertMode = null;
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
            let dynConvertMode = null;
            for (let j = 1; j < payload.args.length; j++) {
              const arg = payload.args[j];
              if (CONVERT_MODES.includes(arg)) {
                dynConvertMode = arg;
                break;
              }
            }
            let result;
            try {
              const exp = payload.args.full;
              result = maplebirch.SugarCube.Scripting.evalJavaScript(exp[0] === '{' ? `(${exp})` : exp);
            } catch (ex) {
              return this.error(`表达式错误: ${ex.message}`);
            }
            if (typeof result !== 'object' || result === null) return this.error('表达式必须返回对象或数组');
            if (Array.isArray(result) || result instanceof Set) {
              result.forEach(val => options.push({ label: String(val), value: val, type: 'dynamic', exprIndex: dynamic.expressions.length - 1, convertMode: dynConvertMode }));
            } else if (result instanceof Map) {
              result.forEach((val, key) => options.push({ label: String(key), value: val, type: 'dynamic', exprIndex: dynamic.expressions.length - 1, convertMode: dynConvertMode }));
            } else {
              Object.keys(result).forEach(key => options.push({ label: key, value: result[key], type: 'dynamic', exprIndex: dynamic.expressions.length - 1, convertMode: dynConvertMode }));
            }
          }
        }
        if (options.length === 0) return this.error('没有指定选项');
        if (selectedIdx === -1) {
          selectedIdx = config.autoselect ? options.findIndex(opt => maplebirch.SugarCube.Util.sameValueZero(opt.value, State.getVar(varName))) : 0;
          if (selectedIdx === -1) selectedIdx = 0;
        }
        const $select = jQuery(document.createElement('select'))
          .attr({
            id: `lanListbox-${varId}`,
            name: `lanListbox-${varId}`,
            tabindex: 0
          })
          .addClass('macro-lanListbox')
          .on('change.macros', this.createShadowWrapper(function () { State.setVar(varName, options[Number(this.value)].value); }));
        if (customClasses) customClasses.split(/\s+/).forEach(cls => { if (cls.trim()) $select.addClass(cls.trim()); });
        if (inlineStyle) $select.attr('style', inlineStyle);
        const create = (opts, selectIdx) => {
          $select.empty();
          opts.forEach((opt, i) => {
            let displayText = Internals.macroTranslation(opt.label, maplebirch) || opt.label;
            if (opt.convertMode && maplebirch.tool.convert) displayText = maplebirch.tool.convert(displayText, opt.convertMode);
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
          if (this.lanListboxCache[cacheKey]) {
            const cached = this.lanListboxCache[cacheKey];
            options.length = 0;
            cached.options.forEach(o => options.push(o));
            create(options, cached.selectedIdx);
            selectedIdx = cached.selectedIdx;
            State.setVar(varName, options[selectedIdx].value);
            return;
          }
          const freshOpts = [];
          for (let i = 1; i < this.payload.length; ++i) {
            const p = this.payload[i];
            if (p.name === 'option') {
              const lbl = String(p.args[0]);
              const val = p.args.length > 1 ? p.args[1] : lbl;
              let convertMode = null;
              for (let j = 2; j < p.args.length; j++) {
                const arg = p.args[j];
                if (CONVERT_MODES.includes(arg)) {
                  convertMode = arg;
                  break;
                }
              }
              freshOpts.push({ label: lbl, value: val, type: 'static', convertMode, exprIdx: -1 });
            } else if (p.name === 'optionsfrom') {
              let res;
              try {
                const exp = p.args.full;
                res = maplebirch.SugarCube.Scripting.evalJavaScript(exp[0] === '{' ? `(${exp})` : exp);
              } catch (ex) {
                maplebirch.log(`<<lanListbox>> 重新计算表达式错误: ${ex.message}`, 'ERROR');
                continue;
              }
              if (typeof res !== 'object' || res === null) continue;
              const exprIdx = dynamic.expressions.indexOf(p.args.full);
              let dynConvertMode = null;
              for (let j = 1; j < p.args.length; j++) {
                const arg = p.args[j];
                if (CONVERT_MODES.includes(arg)) {
                  dynConvertMode = arg;
                  break;
                }
              }
              if (Array.isArray(res) || res instanceof Set) {
                res.forEach(v => freshOpts.push({ label: String(v), value: v, type: 'dynamic', exprIdx, convertMode: dynConvertMode }));
              } else if (res instanceof Map) {
                res.forEach((v, k) => freshOpts.push({ label: String(k), value: v, type: 'dynamic', exprIdx, convertMode: dynConvertMode }));
              } else {
                Object.keys(res).forEach(k => freshOpts.push({ label: k, value: res[k], type: 'dynamic', exprIdx, convertMode: dynConvertMode }));
              }
            }
          }
          if (freshOpts.length > 0) {
            const currVal = State.getVar(varName);
            const newIdx = config.autoselect ? freshOpts.findIndex(o => maplebirch.SugarCube.Util.sameValueZero(o.value, currVal)) : selectedIdx;
            options.length = 0;
            freshOpts.forEach(o => options.push(o));
            const finalIdx = newIdx !== -1 ? newIdx : 0;
            create(options, finalIdx);
            selectedIdx = finalIdx;
            if (newIdx === -1) State.setVar(varName, freshOpts[0].value);
            this.lanListboxCache[cacheKey] = {
              options: [...freshOpts],
              selectedIdx: finalIdx
            };
          }
        };
        setup.maplebirch.language.add('lanListbox', updateOptions);
        $select.on('remove', () => { setup.maplebirch.language.remove('lanListbox', updateOptions); delete this.lanListboxCache; });
      } catch (e) {
        maplebirch.log('<<lanListbox>> 错误', 'ERROR', e);
        return this.error(`<<lanListbox>> 错误: ${e.message}`);
      }
    }

    // <<radiobuttonsfrom>>
    _radiobuttonsfrom() {
      if (this.args.length < 2) return this.error('缺少参数：变量名和选项数组');
      const varPath = this.args[0];
      if (typeof varPath === 'string') if (!varPath.startsWith('$_') && '$' !== varPath[0] && '_' !== varPath[0]) return this.error(`变量名 '${varPath}' 缺少sigil（$、$_ 或 _）`);
      let options = this.args[1];
      const separator = this.args.length > 2 ? this.args[2] : ' | ';
      const $container = jQuery('<span>').addClass('radiobuttonsfrom-container');
      let parsedOptions = [];
      const parse = (input) => {
        if (Array.isArray(input)) return input;
        if (typeof input === 'string') {
          const str = input.trim();
          if (str.includes('|')) {
            const options = [];
            const optionStrs = str.split('|').map(s => s.trim());
            optionStrs.forEach(optionStr => {
              if (optionStr.startsWith('[') && optionStr.endsWith(']')) {
                const valueContent = optionStr.substring(1, optionStr.length - 1);
                if (valueContent.includes(',')) options.push(['', valueContent.split(',').map(v => v.trim())]);
                else options.push(['', valueContent]);
              } else if (optionStr.includes('[') && optionStr.endsWith(']')) {
                const bracketIndex = optionStr.indexOf('[');
                const key = optionStr.substring(0, bracketIndex);
                const valueContent = optionStr.substring(bracketIndex + 1, optionStr.length - 1);
                if (valueContent.includes(',')) options.push([key, valueContent.split(',').map(v => v.trim())]);
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
        parsedOptions = parse(options);
        if (!parsedOptions) return this.error('无法解析选项参数');
      } catch (e) {
        return this.error(`无法解析选项参数: ${e.message}`);
      }
      const hasContent = this.payload.length > 0;
      const content = hasContent ? this.payload[0]?.contents || '' : '';
      const macroThis = this;
      const optionsData = [];
      parsedOptions.forEach((option, index) => {
        const $label = jQuery('<label>').addClass('radiobuttonsfrom-label');
        const $temp = jQuery(document.createElement('div'));
        let optionValue = Array.isArray(option) && option.length >= 2 ? option[0] : option;
        let displayData = Array.isArray(option) && option.length >= 2 ? option[1] : option;
        const optionInfo = { value: optionValue, data: displayData, $label: $label };
        optionsData.push(optionInfo);
        try {
          const safeValue = String(optionValue).replace(/'/g, "\\'");
          const macroStr = `<<radiobutton '${varPath}' '${safeValue}' autocheck>>`;
          new maplebirch.SugarCube.Wikifier($temp[0], macroStr);
          if (hasContent) {
            $temp.find('input[type="radio"]').on('change.macros', this.createShadowWrapper(function() {
              if (this.checked && content) maplebirch.SugarCube.Wikifier.wikifyEval(content, macroThis.passageObj);
            }));
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
        optionsData.forEach((option, index) => {
          const $textContainer = $container.find(`.radiobuttonsfrom-text[data-option-index="${index}"]`);
          let displayText = '';
          if (Array.isArray(option.data)) {
            if (option.data.length === 2 && Array.isArray(option.data[0])) {
              const langData = option.data.find(item => item && Array.isArray(item));
              if (langData) {
                displayText = langData[0];
                if (currentLang === 'CN' && langData.length > 1) displayText = langData[1];
              }
            } else {
              displayText = option.data[0] || String(option.value);
              if (currentLang === 'CN' && option.data.length > 1) displayText = option.data[1];
            }
          } else if (option.data && typeof option.data === 'object') {
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
      setup.maplebirch.language.add('radiobuttonsfrom', updateDisplayTexts);
      $container.on('remove', () => setup.maplebirch.language.remove('radiobuttonsfrom', updateDisplayTexts));
      return $container[0];
    }

    // <<maplebirchReplace>>
    _overlayReplace(name, type) {
      const key = name;
      if (!key) return;
      if (T.currentOverlay === key) {
        if (typeof closeOverlay === 'function') closeOverlay(); $.wiki('<<exit>>')
        return;
      }
      T.buttons.toggle();
      if (typeof updateOptions === 'function') updateOptions();
      T.currentOverlay = key;
      const $overlay = $('#customOverlay');
      if ($overlay.length) $overlay.removeClass('hidden').parent().removeClass('hidden').attr('data-overlay', T.currentOverlay);
      switch (type) {
        case 'customize': return $.wiki(`<<${key}>><<exit>>`);
        case 'title':
          const titleKey = 'title' + maplebirch.tool.convert(key, 'pascal');
          if (titleKey && maplebirch.tool.widget.Macro.has(titleKey)) $.wiki(`<<replace #customOverlayTitle>><<${titleKey}>><</replace>>`);
          break;
        default: break;
      }
      $.wiki(`<<replace #customOverlayContent>><<${key}>><</replace>>`);
    }

    _fixDynamicTask(fn, name) {
      const taskFn = (...args) => {
        try {
          return fn.apply(this, args);
        } catch (error) {
          console.error(`[Dynamic.task] Error in task '${name}':`, error);
          return null;
        }
      };
      Object.defineProperty(taskFn, 'toString', { value: () => name, writable: true, configurable: true });
      if (Dynamic.stage === Dynamic.Stage.Settled) {
        try { taskFn(); }
        catch (e) { console.warn(`Encountered an unexpected critical error while performing a dynamic render task`, name, e); }
      } else {
        Dynamic.tasks.push(taskFn);
      }
      return taskFn;
    }

    #getModName(modinfo) {
      if (!modinfo.nickName) return this.core.lang.auto(modinfo.name);
      if (typeof modinfo.nickName === 'string') return this.core.lang.auto(modinfo.nickName);
      if (typeof modinfo.nickName === 'object') {
        const translationsObj = Object.entries(modinfo.nickName).reduce((acc, [lang, text]) => {
          acc[lang.toUpperCase()] = text;
          return acc;
        }, {});
        const mapKey = `modList_${modinfo.name}`;
        if (!this.core.lang.translations.has(mapKey)) this.core.lang.translations.set(mapKey, translationsObj);
        return this.core.lang.t(mapKey);
      }
      return false
    }

    #getModDependenceInfo() {
      const modList = this.core.modUtils.getModListName();
      for (let i = 0; i < modList.length; i++) {
        const modName = modList[i];
        const modinfo = this.core.modUtils.getMod(modName);
        if (!modinfo) continue;
        if (!modinfo.bootJson.dependenceInfo) continue;
        if (modinfo.bootJson.dependenceInfo.some(dep => dep.modName === 'maplebirch') && !this.core.modList.includes(modinfo.name)) this.core.modList.push(modinfo.name);
      }
    }

    _showModVersions() {
      const html = `<div id='modversions'>Maplebirch Framework v${maplebirch.meta.version}|${maplebirch.modList.length}</div>`;
      return html;
    }

    _showFrameworkInfo() {
      let html_1 = `
      <div class='p-2 text-align-center'>
        <h3>[[<<lanSwitch 'Maplebirch Framework' '秋枫白桦框架'>>|'https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchframework']]</h3>
        <div class='m-2'><span class='gold'><<lanSwitch 'Version: ' '版本：'>></span>${this.core.meta.version}<br></div>
        <div class='m-2'><span class='gold'><<lanSwitch 'Author: ' '作者：'>></span>${this.core.meta.author}<br></div>
        <div class='m-2'><span class='gold'><<lanSwitch 'Last Modified By: ' '最后修改者：'>></span>${this.core.meta.modifiedby}<br></div>
      </div>`;

      this.#getModDependenceInfo();
      const modlist = this.core.modList;
      const html = [];

      for (let i = 0; i < modlist.length; i++) {
        const modId = modlist[i];
        const modinfo = modUtils.getMod(modId);
        if (!modinfo) continue;
        const modname = this.#getModName(modinfo);
        const modversion = modinfo.version;
        const text = `<div class='modinfo'>・${modname}：v${modversion}</div>`;
        html.push(text);
      }

      if (html.length > 0) html_1 += `<div class='p-2 text-align-center'><h3><<lanSwitch 'Framework Mod List' '框架模组列表'>></h3><div id='modlist'>${html.join('')}</div></div>`;
      
      return html_1;
    }

    compatibleModI18N() {
      const originalName = setup.NPC_CN_NAME;
      setup.NPC_CN_NAME = (args) => {
        if (!args || typeof args !== 'string') return args;
        const originalResult = originalName(args);
        if (originalResult !== args) return originalResult;
        if (this.core.lang.translations.has(args)) return this.core.auto(args);
        return args;
      };
      const originalTitle = setup.NPC_CN_TITLE;
      setup.NPC_CN_TITLE = (str) => {
        if (!str || typeof str !== 'string') return str;
        const originalResult = originalTitle(str);
        if (originalResult !== str) return originalResult;
        if (this.core.lang.translations.has(str)) return this.core.auto(str);
        return str;
      };
    }

    preInit() {
      Object.defineProperties(window, { lanSwitch: { value: this._languageSwitch }, });

      this.core.tool.framework.onInit(() => {
        setup.maplebirch = {};
        this.#languageWidgetManager();
        setup.maplebirch.hint = (() => {
          const hint = [];
          function push(...args) { args.forEach(item => { if (!hint.includes(item)) hint.push(item); }); }
          return { push, get play() { return hint.map(item => `${item}`).join(''); } };
        })();
        setup.maplebirch.content = (() => {
          const content = [];
          function push(...args) { args.forEach(item => { if (!content.includes(item)) content.push(item); }); }
          return { push, get play() { return content.map(item => `${item}`).join(''); } };
        })();
      });
      
      this.core.tool.other.configureLocation('lake_ruin', {
        condition: () => Weather.bloodMoon && !Weather.isSnow
      }, { layer: 'base', element: 'bloodmoon' });

      this.core.tool.other.configureLocation('lake_ruin', {
        condition: () => Weather.bloodMoon && Weather.isSnow
      }, { layer: 'base', element: 'bloodmoon_snow' });

      this.core.once(':defineSugarcube', () => {
        this.core.tool.widget.defineMacro('language', this._language, ['option'], false, false);
        this.core.tool.widget.defineMacro('lanSwitch', this._languageSwitch);
        this.core.tool.widget.defineMacro('lanButton', this._languageButton, null, false, true);
        this.core.tool.widget.defineMacro('lanLink', this._languageLink, null, false, true);
        this.core.tool.widget.defineMacro('lanListbox', this._languageListbox, ['option', 'optionsfrom'], ['optionsfrom'], true);
        this.core.tool.widget.defineMacro('radiobuttonsfrom', this._radiobuttonsfrom, null, false, true);
        this.core.tool.widget.defineMacro('maplebirchReplace', (name, type) => this._overlayReplace(name, type));
        this.core.tool.widget.defineMacro('maplebirchTextOutput', this.core.tool.text.makeMacroHandler());
        this.core.tool.widget.defineMacroS('maplebirchFrameworkVersions', this._showModVersions);
        this.core.tool.widget.defineMacroS('maplebirchFrameworkInfo', () => this._showFrameworkInfo());
      });

      this.core.on(':loadSaveData', () => maplebirch.Language = V?.maplebirch?.language);

      $(document).on('change', 'select[name="lanListbox-optionsmaplebirchnpcsidebarnnpc"]', function () {
        if (!maplebirch.modules.initPhase.preInitCompleted) return;
        try { $.wiki('<<replace #customOverlayContent>><<maplebirchOptions>><</replace>>'); } catch (error) { console.log('图形选择错误:', error); }
      });

      $(document).on('change', 'select[name="lanListbox-optionsmaplebirchnpcsidebarfacevariant"]', function () {
        if (!maplebirch.modules.initPhase.preInitCompleted) return;
        try { $.wiki('<<updatesidebarimg>>'); } catch (error) { console.log('姿态更新错误:', error); }
      });

      $(document).on('change', 'select[name="lanListbox-optionsmaplebirchcharactercharartselect"]', function () {
        if (!maplebirch.modules.initPhase.preInitCompleted) return;
        try { $.wiki('<<replace #customOverlayContent>><<maplebirchOptions>><</replace>>'); } catch (error) { console.log('渐变调整错误:', error); }
      });

      $(document).on('change', 'select[name="lanListbox-optionsmaplebirchcharactercloseupselect"]', function () {
        if (!maplebirch.modules.initPhase.preInitCompleted) return;
        try { $.wiki('<<replace #customOverlayContent>><<maplebirchOptions>><</replace>>'); } catch (error) { console.log('渐变调整错误:', error); }
      });


      $(document).on('click', '.link-internal.macro-button', () => {
        if (!maplebirch.modules.initPhase.preInitCompleted) return;
        if (this.updateTimer) clearTimeout(this.updateTimer);
        try {
          this.updateTimer = setTimeout(() => {
          const count = ((V.options.maplebirch?.relationcount ?? 4) - 2);
          document.querySelectorAll('.relation-stat-list').forEach(list => list.style.setProperty('--maplebirch-relation-count', count));
        }, 100);
        } catch { console.log('点击事件处理错误:', error); }
      });
    }

    Init() {
      Dynamic.task = (fn, name) => this._fixDynamicTask(fn, name);
      if (this.core.modUtils.getMod('ModI18N')) this.compatibleModI18N();
      getRobinLocation = Schedules('Robin', getRobinLocation);
      sydneySchedule = Schedules('Sydney', sydneySchedule);
    }

  }
  
  await maplebirch.register('Internals', new Internals(maplebirch), ['tool']);
})();