(async() => {
  'use strict';
  if (!window.maplebirch) {
    console.log('%c[maplebirch] 错误: 核心系统未初始化', 'color: #C62828; font-weight: bold;');
    return;
  }

  const maplebirch = window.maplebirch;

  class processHandling {
    static getTranslation(key, core = maplebirch) {
      try { key = String(key); }
      catch (e) { return ''; }
      const autoTranslated = core.autoTranslate(key);
      if (autoTranslated !== key) return autoTranslated;
      const result = core.t(key);
      return (result[0] === '[' && result[result.length - 1] === ']') ? autoTranslated : result;
    }

    constructor() {
      this.lang = maplebirch.lang;
      this.tool = null;
      this.log = null;
      this.updateTimer = null;
    }

    _languageButton() {
      try {
        if (!this.args || this.args.length === 0) return this.error('<<langbutton>> 需要至少一个参数');
        const arg = this.args[0];
        let buttonText = '';
        let translationKey = '';
        let convertMode = null;
        let $image = null;
        if (typeof arg === 'string') {
          translationKey = arg;
          convertMode = this.args.length > 1 ? this.args[1] : null;
          buttonText = processHandling.getTranslation(translationKey, maplebirch);
        }
        else if (typeof arg === 'object') {
          if (arg.isImage) {
            $image = jQuery(document.createElement('img')).attr('src', arg.source);
            if (arg.passage) $image.attr('data-passage', arg.passage);
            if (arg.title) $image.attr('title', arg.title);
            if (arg.align) $image.attr('align', arg.align);
            translationKey = `image:${arg.source}`;
            convertMode = this.args.length > 1 ? this.args[1] : null;
          } else if (arg.text) {
            translationKey = arg.text;
            convertMode = this.args.length > 1 ? this.args[1] : null;
            buttonText = processHandling.getTranslation(translationKey, maplebirch);
          } else {
            return this.error('<<langbutton>> 不支持的参数对象类型');
          }
        }
        else {
          return this.error('<<langbutton>> 参数必须是字符串、函数或对象');
        }

        if (convertMode && buttonText) buttonText = maplebirch.tool.convert(buttonText, convertMode);

        const $button = jQuery(document.createElement('button')).addClass('macro-button link-internal').attr('data-translation-key', translationKey);

        if ($image) { $button.append($image).addClass('link-image'); }
        else { $button.append(document.createTextNode(buttonText)); }

        const payloadContent = this.payload[0]?.contents?.trim() || '';
        const macroThis = this;

        $button.ariaClick({
          namespace: '.macros',
          role: 'button',
          one: false
        }, this.createShadowWrapper(
          payloadContent ? () => { Wikifier.wikifyEval(payloadContent, macroThis.passageObj); } : null
        ));
        $button.appendTo(this.output);
      } catch (e) {
        console.error('<<langbutton>> 宏处理错误', e);
        return this.error(`<<langbutton>> 执行错误: ${e.message}`);
      }
    }

    _languageLink() {
      try {
        if (!this.args || this.args.length === 0) return this.error('<<langlink>> 需要至少一个参数');

        const arg = this.args[0];
        let linkText = '';
        let translationKey = '';
        let passageName = null;
        let convertMode = null;
        let $image = null;

        if (typeof arg === 'string') {
          translationKey = arg;
          passageName = this.args.length > 1 ? this.args[1] : null;
          convertMode = this.args.length > 2 ? this.args[2] : null;
          linkText = processHandling.getTranslation(translationKey, maplebirch);
        }
        else if (typeof arg === 'object') {
          if (arg.isImage) {
            $image = jQuery(document.createElement('img')).attr('src', arg.source);

            if (arg.passage) $image.attr('data-passage', arg.passage);
            if (arg.title) $image.attr('title', arg.title);
            if (arg.align) $image.attr('align', arg.align);

            passageName = arg.link;
            translationKey = `image:${arg.source}`;
            convertMode = this.args.length > 1 ? this.args[1] : null;
          }
          else if (arg.link) {
            translationKey = arg.text;
            passageName = arg.link;
            convertMode = this.args.length > 1 ? this.args[1] : null;
            linkText = processHandling.getTranslation(translationKey, maplebirch);
          }
          else {
            return this.error('<<langlink>> 不支持的参数对象类型');
          }
        }
        else {
          return this.error('<<langlink>> 参数必须是字符串、函数或链接对象');
        }

        if (convertMode && linkText) linkText = maplebirch.tool.convert(linkText, convertMode);

        const $link = jQuery(document.createElement('a')).addClass('macro-link link-internal').attr('data-translation-key', translationKey);

        if ($image) { $link.append($image).addClass('link-image'); }
        else { $link.append(document.createTextNode(linkText)); }

        if (passageName != null) {
          $link.attr('data-passage', passageName);
          if (maplebirch.SugarCube.Story.has(passageName)) {
            if (maplebirch.SugarCube.Config.addVisitedLinkClass && maplebirch.SugarCube.State.hasPlayed(passageName)) $link.addClass('link-visited');
          } else {
            $link.addClass('link-broken');
          }
        }

        const payloadContent = this.payload[0]?.contents?.trim() || '';
        const macroThis = this;

        $link.ariaClick({
          namespace: '.macros',
          role: passageName != null ? 'link' : 'button',
          one: passageName != null
        }, this.createShadowWrapper(
          payloadContent ? () => { Wikifier.wikifyEval(payloadContent, macroThis.passageObj); } : null,
          passageName != null ? () => maplebirch.SugarCube.Engine.play(passageName) : null
        ));
        $link.appendTo(this.output);

      } catch (e) {
        console.error('<<langlink>> 宏处理错误', e);
        return this.error(`<<langlink>> 执行错误: ${e.message}`);
      }
    }

    _radiobuttonsfrom() {
      if (this.args.length < 2) return this.error('缺少参数：变量名和选项数组');
      let varPath = this.args[0];
      if (typeof varPath === 'string') {
      } else if (typeof varPath === 'object' && varPath.raw) {
        varPath = varPath.raw[0];
      } else {
        varPath = String(varPath);
      }
      const options = this.args[1];
      if (!Array.isArray(options)) return this.error('第二个参数必须是数组');
      const separator = this.args.length > 2 ? this.args[2] : ' | ';
      const container = $('<span>').addClass('radiobuttonsfrom-container');
      options.forEach((option, index) => {
        const label = $('<label>').addClass('radiobuttonsfrom-label');
        const temp = document.createElement('div');
        new Wikifier(temp, `<<radiobutton "${varPath}" "${option}" autocheck>>`);
        $(temp).children().appendTo(label);
        label.append(document.createTextNode(option));
        container.append(label);
        if (index < options.length - 1) container.append(document.createTextNode(separator));
      });
      container.appendTo(this.output);
    }

    _fixDynamicTask(fn, name) {
      const taskFn = function() {
        try {
          return fn.apply(this, arguments);
        } catch (error) {
        console.error('[Dynamic.task] Error in task "' + name + '":', error);
          return null;
        }
      };
      Object.defineProperty(taskFn, 'toString', {
        value: function() { return name; },
        writable: true,
        configurable: true
      });
      if (Dynamic.stage === Dynamic.Stage.Settled) {
        taskFn();
      } else {
        Dynamic.tasks.push(taskFn);
      }
      return taskFn;
    }

    #getModName(modinfo) {
      if (!modinfo.nickName) return this.lang.autoTranslate(modinfo.name);
      if (typeof modinfo.nickName === 'string') return this.lang.autoTranslate(modinfo.nickName);
      if (typeof modinfo.nickName === 'object') {
        const translationsObj = Object.entries(modinfo.nickName).reduce((acc, [lang, text]) => {
          acc[lang.toUpperCase()] = text;
          return acc;
        }, {});
        const mapKey = `modList_${modinfo.name}`;
        if (!this.lang.translations.has(mapKey)) this.lang.translations.set(mapKey, translationsObj);
        return this.lang.t(mapKey);
      }
      return false
    }

    #getModDependenceInfo() {
      const modList = modUtils.getModListName();
      for (let i = 0; i < modList.length; i++) {
        const modName = modList[i];
        const modinfo = modUtils.getMod(modName);
        if (!modinfo) continue;
        if (modinfo.bootJson.dependenceInfo.some(dep => dep.modName === "maplebirch") && !maplebirch.modList.includes(modinfo.name)) {
          maplebirch.modList.push(modinfo.name);
        }
      }
    }

    _showModVersions() {
      const html = `<div id="modversions">Maplebirch Framework v${maplebirch.constructor.meta.version}|${maplebirch.t('Dependence')}:${maplebirch.modList.length}</div>`;
      return html;
    }

    _showFrameworkInfo() {
      let html_1 = `<div class="p-2 text-align-center">
          <h3>${maplebirch.t('Maplebirch Frameworks')}</h3>
          <div class="m-2">
            <span class="gold">${maplebirch.t('Version')}：</span>${maplebirch.constructor.meta.version}<br>
          </div>
          <div class="m-2">
            <span class="gold">${maplebirch.t('Author')}：</span>${maplebirch.autoTranslate(maplebirch.constructor.meta.author)}<br>
          </div>
          <div class="m-2">
            <span class="gold">${maplebirch.t('Last Modified By')}：</span>${maplebirch.autoTranslate(maplebirch.constructor.meta.modifiedby)}<br>
          </div>
      </div>`;

      this.#getModDependenceInfo();
      const modlist = maplebirch.modList;
      const html = [];

      for (let i = 0; i < modlist.length; i++) {
        const modId = modlist[i];
        const modinfo = modUtils.getMod(modId);
        if (!modinfo) continue;

        const modname = this.#getModName(modinfo);
        const modversion = modinfo.version;
        const text = `
          <div class="modinfo">
            ・ ${modname}：v${modversion}
          </div>
          `;
        html.push(text);
      }

      if (html.length > 0) {
        html_1 += `
          <div class="p-2 text-align-center">
            <h3>${maplebirch.t('Maplebirch Frameworks Mod List')}</h3>
            <div id="modlist">
              ${html.join('')}
            </div>
          </div>
        `;
      }
      
      return html_1;
    }

    #updatePermissions() {
      if (!V.options?.maplebirch?.sandbox) return;
      const sandbox = V.options.maplebirch.sandbox;
      const allowedObjects = this.tool.console.allowedObjects;
      if (sandbox.window) {
        sandbox.V = true;
        sandbox.T = true;
        sandbox.maplebirch = true;
        if (!this.tool.console.fullAccess) this.tool.console.enableFullAccess();
      } else if (sandbox.maplebirch) {
        sandbox.V = true;
        sandbox.T = true;
        if (this.tool.console.fullAccess) this.tool.console.disableFullAccess();
      }
      if (sandbox.maplebirch && (!sandbox.V || !sandbox.T)) sandbox.maplebirch = false;
      if (sandbox.window && !sandbox.maplebirch) sandbox.window = false;
      if (sandbox.V && !allowedObjects.has('V')) { this.tool.console.allowObject('V'); }
      else if (!sandbox.V && allowedObjects.has('V')) { this.tool.console.disallowObject('V'); }
      if (sandbox.T && !allowedObjects.has('T')) { this.tool.console.allowObject('T');}
      else if (!sandbox.T && allowedObjects.has('T')) { this.tool.console.disallowObject('T'); }
      if (sandbox.maplebirch && !allowedObjects.has('maplebirch')) { this.tool.console.allowObject('maplebirch'); }
      else if (!sandbox.maplebirch && allowedObjects.has('maplebirch')) { this.tool.console.disallowObject('maplebirch'); }
      if (sandbox.window && !this.tool.console.fullAccess) { this.tool.console.enableFullAccess(); }
      else if (!sandbox.window && this.tool.console.fullAccess) { this.tool.console.disableFullAccess(); }
      const text = maplebirch.t('permission');
      const vItem = $(`label:contains("V ${text}")`).closest('.settingsToggleItem');
      const tItem = $(`label:contains("T ${text}")`).closest('.settingsToggleItem');
      const mbItem = $(`label:contains("Maplebirch ${text}")`).closest('.settingsToggleItem');
      const wItem = $(`label:contains("window ${text}")`).closest('.settingsToggleItem');
      const vDisabled = sandbox.window || sandbox.maplebirch;
      const tDisabled = sandbox.window || sandbox.maplebirch;
      const mbDisabled = sandbox.window || !(sandbox.V && sandbox.T);
      const wDisabled = !sandbox.maplebirch;
      vItem.css("color", vDisabled ? "var(--400)" : "var(--000)");
      vItem.find('input').prop('disabled', vDisabled).prop('checked', sandbox.V);
      tItem.css("color", tDisabled ? "var(--400)" : "var(--000)");
      tItem.find('input').prop('disabled', tDisabled).prop('checked', sandbox.T);
      mbItem.css("color", mbDisabled ? "var(--400)" : "var(--000)");
      mbItem.find('input').prop('disabled', mbDisabled).prop('checked', sandbox.maplebirch);
      wItem.css("color", wDisabled ? "var(--400)" : "var(--000)");
      wItem.find('input').prop('disabled', wDisabled).prop('checked', sandbox.window);
    }

    preInit() {
      this.tool = maplebirch.tool;
      this.log = this.tool.createLog('widget');
      this.tool.framework.onInit(() => setup.maplebirch = {});
      this.tool.framework.addTo('HintMobile', 'maplebirchModHintMobile');
      this.tool.framework.addTo('MenuBig', 'maplebirchModHintDesktop');
      this.tool.other.configureLocation('lake_ruin', {
        condition: () => Weather.bloodMoon && !Weather.isSnow
      }, { layer: 'base', element: 'bloodmoon' });

      this.tool.other.configureLocation('lake_ruin', {
        condition: () => Weather.bloodMoon && Weather.isSnow
      }, { layer: 'base', element: 'bloodmoon_snow' });

      maplebirch.once(':definewidget', () => {
        this.tool.widget.defineMacro('langbutton', this._languageButton, null, false, true);
        this.tool.widget.defineMacro('langlink', this._languageLink, null, false, true);
        this.tool.widget.defineMacro('radiobuttonsfrom', this._radiobuttonsfrom);
        this.tool.widget.defineMacro('maplebirchTextOutput', this.tool.text.makeMacroHandler());
        this.tool.widget.defineMacroS('maplebirchFrameworkVersions', this._showModVersions);
        this.tool.widget.defineMacroS('maplebirchFrameworkInfo', () => this._showFrameworkInfo());
      });

      maplebirch.on(':passagestart', () => V.debug = V.options?.maplebirch?.debug ? 1 : V.debug);

      maplebirch.on(':loadSaveData', () => maplebirch.Language = V?.maplebirch?.language);

      $(document).on('mouseup touchend', () => {
        if (!maplebirch.modules.initPhase.preInitCompleted) return;
        try {
          let needsRefresh = false;
          if (typeof T.selectedLang === 'string' && maplebirch.constructor.meta.availableLanguages.includes(T.selectedLang)) {
            if (T.selectedLang !== maplebirch.lang.language) {
              maplebirch.Language = T.selectedLang;
              if (typeof V.maplebirch !== 'object') V.maplebirch = {};
              V.maplebirch.language = T.selectedLang;
              needsRefresh = true;
            }
          }
          const npcSidebarName = V.options?.maplebirch?.npcsidebar?.nnpc;
          if (T.fixedName && typeof T.fixedName === 'string' && npcSidebarName) if (T.fixedName.split('.')[T.fixedName.split('.').length - 1] !== npcSidebarName) needsRefresh = true;
          if (needsRefresh) $.wiki('<<replace #customOverlayContent>><<maplebirchOptions>><</replace>>');
        } catch (error) {
          console.log('鼠标事件处理错误:', error);
        }
      });

      maplebirch.on('update', () => {
        if (this.updateTimer) clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(() => {
          this.#updatePermissions();
          this.updateTimer = null;
        }, 50);
      });
    }

    Init() {
      Dynamic.task = (fn, name) => this._fixDynamicTask(fn, name);
    }

    postInit() {
      
    }
  }

  await maplebirch.register('processHandling', new processHandling(), ['tool']);
})();