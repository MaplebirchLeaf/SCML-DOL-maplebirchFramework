// @ts-check
/// <reference path='../../maplebirch.d.ts' />
(async() => {
  'use strict';

  class CombatManager {
    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.log = core.tool.createLog('combat');
      this.Reaction.init();
      core.once(':finally', () => {
        core.tool.widget.defineMacro('generateCombatAction', this._generateCombatAction());
        core.tool.widget.defineMacro('combatButtonAdjustments', (/**@type {string}*/name, /**@type {any}*/extra) => this._combatButtonAdjustments(name, extra));
      });
    }

    Reaction = {
      /**@type {{herm:any[];crossdress:any[];}}*/
      Triggers: { herm: [], crossdress: [] },
      HermNameList: ['Sydney', 'Kylar', 'Gwylan'],
      CDNameList: ['Sydney', 'Kylar', 'Gwylan'],
      /** @param {'herm'|'crossdress'} type - 反应类型 @param {string} npc - NPC名称 @param {Function} cond - 条件函数 @param {Function} action - 动作函数 */
      reg: function (/**@type {'herm'|'crossdress'}*/type, /**@type {string}*/npc, /**@type {any}*/cond, /**@type {any}*/action) {
        this.Triggers[type].push({ npc, cond, action });
        const list = type === 'herm' ? this.HermNameList : this.CDNameList;
        if (!list.includes(npc)) list.push(npc);
      },
      regReaction: function (/**@type {'herm'|'crossdress'}*/type, /**@type {string}*/npc, /**@type {any}*/config) {
        this.reg(type, npc,
          () => !V[`${npc.toLowerCase()}Seen`]?.includes(type),
          () => {
            if (V[`${npc.toLowerCase()}Seen`]?.includes(type)) return '';
            const single = V.npc.length === 1;
            const lang = maplebirch.Language;
            let output;
            if (typeof config.texts === 'function') { output = config.texts(lang, single); }
            else { output = single ? config.texts[lang].s : config.texts[lang].m; }
            const before = typeof config.before === 'function' ? config.before() : (config.before || '');
            const affter = typeof config.affter === 'function' ? config.affter() : (config.affter || '');
            return `<<set $${npc.toLowerCase()}Seen.pushUnique('${type}')>>${before}${output}${affter}`;
          }
        );
      },
      /** @param {'herm'|'crossdress'} type - 反应类型 @returns {string} 反应文本 */
      check: function (/**@type {'herm'|'crossdress'} */type) {
        const npcList = type === 'herm' ? this.HermNameList : this.CDNameList;
        /** @type {any[]} */
        const outputs = [];
        for (const npcName of V.npc.filter((/**@type {string}*/n) => npcList.includes(n))) {
          const triggers = this.Triggers[type].filter(t => t.npc === npcName && t.cond());
          triggers.forEach(trigger => {
            const output = trigger.action();
            if (output) outputs.push(output);
          });
        }
        return outputs.join('<br><br>');
      },
      init: function () {
        const reg = this.regReaction.bind(this);
        reg('herm', 'Sydney', {
          texts: {
            CN: { s: `<<if _sydneyStatus.includes('corrupt')>><<He>>惊奇地盯着你的<<genitals>>。<<else>><<He>>将好奇的目光投向你的<<genitals>>。<</if>>`, m: `<<if _sydneyStatus.includes('corrupt')>>悉尼惊奇地盯着你的<<genitals>>。<<else>>悉尼将好奇的目光投向你的<<genitals>>。<</if>>` },
            EN: { s: `<<if _sydneyStatus.includes('corrupt')>><<He>> stares with wonder at your <<genitals>>.<<else>><<He>> eyes your <<genitals>> with great curiosity.<</if>>`, m: `<<if _sydneyStatus.includes('corrupt')>>Sydney stares with wonder at your <<genitals>>.<<else>>Sydney eyes your <<genitals>> with great curiosity.<</if>>` }
          },
          affter: '<<npcincr Sydney purity -2>><<lspurity>><<set $speechhermaroused to 2>>'
        });
        reg('crossdress', 'Sydney', {
          before: '<<run statusCheck("Sydney")>>',
          texts: {
            CN: { s: `<<if _sydneyStatus.includes('corrupt')>><<He>>被你的<<genitals>>吓了一跳。虽然这不是<<he>>所期望的，但是<<he>>好像并不介意。<<else>><<He>>迷茫地看着你的<<genitals>>。这不是<<he>>所期望的，但是<<he>>好像并不在乎。<</if>>`, m: `<<if _sydneyStatus.includes('corrupt')>>悉尼被你的<<genitals>>吓了一跳。虽然这不是<<nnpc_he 'Sydney'>>所期望的，但是<<nnpc_he 'Sydney'>>好像并不介意。<<else>>悉尼迷茫地看着你的<<genitals>>。这不是<<nnpc_he 'Sydney'>>所期望的，但是<<nnpc_he 'Sydney'>>好像并不在乎。<</if>>` },
            EN: { s: `<<if _sydneyStatus.includes('corrupt')>><<He>> looks taken aback by your <<genitals>>. It wasn't what <<he>> was expecting, but <<he>> doesn't seem to mind.<<else>><<He>> stares at your <<genitals>> with confusion. It wasn't what <<he>> was expecting, but <<he>> doesn't seem to mind.<</if>>`, m: `<<if _sydneyStatus.includes('corrupt')>>Sydney looks taken aback by your <<genitals>>. It wasn't what <<nnpc_he 'Sydney'>> was expecting, but <<nnpc_he 'Sydney'>> doesn't seem to mind.<<else>>Sydney stares at your <<genitals>> with confusion. It wasn't what <<nnpc_he 'Sydney'>> was expecting, but <<nnpc_he 'Sydney'>> doesn't seem to mind.<</if>>` }
          },
          affter: '<<npcincr Sydney purity -2>><<lspurity>><<set $speechcrossdressaroused to 2>>'
        });
        reg('herm', 'Kylar', {
          texts: {
            CN: { s: `<span class='purple'><<He>>挥了挥手，在看到你的<<genitals>>后，<<his>>呼吸急促起来。</span>`, m: `<span class='purple'>凯拉尔挥了挥手，在看到你的<<genitals>>后，<<nnpc_his 'Kylar'>>呼吸急促起来。</span>` },
            EN: { s: `<span class='purple'><<His>> hands shake and <<his>> breath quickens at the sight of your <<genitals>>.</span>`, m: `<span class='purple'>Kylar hands shake and <<nnpc_his 'Kylar'>> breath quickens at the sight of your <<genitals>>.</span>` }
          },
          affter: '<<set $enemyarousal += 50>><<set $speechhermaroused to 2>>'
        });
        reg('crossdress', 'Kylar', {
          before: '<<set _kylar to statusCheck("Kylar")>>',
          texts: (/**@type {'CN'|'EN'}*/lang, /**@type {any}*/s) => {
            const p = T.kylar.gender !== V.player.sex || T.kylar.gender === 'h';
            const t = {
              CN: { s: { p: `你的<<genitals 1>>显然不是<<he>>所期望的，但是<<he>>好像并不在乎。<<if _kylar.gender isnot 'h'>><span class='purple'>事实上，如果从<<his>>兴奋着颤抖的双手来看，<<he>>是相当高兴的！</span><</if>>`, n: `当<<He>>看到你的<<genitals>>时，<<he>>似乎很失望。这不是<<he>>所期望的。` }, m: { p: `你的<<genitals 1>>显然不是凯拉尔所期望的，但是凯拉尔好像并不在乎。<<if _kylar.gender isnot 'h'>><span class='purple'>事实上，如果从<<nnpc_his 'Kylar'>>兴奋着颤抖的双手来看，<<nnpc_he 'Kylar'>>是相当高兴的！</span><</if>>`, n: `当凯拉尔看到你的<<genitals>>时，凯拉尔似乎很失望。这不是凯拉尔所期望的。` } },
              EN: { s: { p: `Your <<genitals 1>> was clearly not what <<he>> was expecting, but <<he>> doesn't seem to mind. <<if _kylar.gender isnot 'h'>><span class='purple'>In fact, if <<his>> shaking hands are anything to go by <<he>> is quite pleased.</span><</if>>`, n: `<<He>> looks disappointed by your <<genitals>>. It wasn't what <<he>> was expecting.` }, m: { p: `Your <<genitals 1>> was clearly not what kylar was expecting, but <<nnpc_he 'Kylar'>> doesn't seem to mind. <<if _kylar.gender isnot 'h'>><span class='purple'>In fact, if <<nnpc_his 'Kylar'>> shaking hands are anything to go by <<nnpc_he 'Kylar'>> is quite pleased.</span><</if>>`, n: `Kylar looks disappointed by your <<genitals>>. It wasn't what <<nnpc_he 'Kylar'>> was expecting.` } }
            };
            return s ? t[lang].s[p ? 'p' : 'n'] : t[lang].m[p ? 'p' : 'n'];
          },
          affter: () => {
            const p = T.kylar.gender !== V.player.sex || T.kylar.gender === 'h';
            return p ? '<<set $enemyarousal += 50>><<set $speechcrossdressaroused to 2>>' : '<<set $enemyarousal -= 100>><<set $enemytrust -= 50>><<set $speechcrossdressdisappointed to 2>>';
          }
        });
        reg('herm', 'Gwylan', {
          texts: {
            CN: { s: `<<He>>见到你的<<genitals>>后，稍稍睁大了眼睛。`, m: `格威岚见到你的<<genitals>>后，稍稍睁大了眼睛。` },
            EN: { s: `<<His>> eyebrows raise upon seeing your <<genitals>>.`, m: `Gwylan's eyebrows raise upon seeing your <<genitals>>.` }
          },
          affter: '<<set $speechhermaroused to 2>>'
        });
        reg('crossdress', 'Gwylan', {
          texts: {
            CN: { s: `<<He>>看到你的<<genitals>>时挠了挠头。虽然这不是<<he>>预想中的样子，但<<he>>似乎并不在意。`, m: `格威岚看到你的<<genitals>>时挠了挠头。虽然这不是<<nnpc_he 'Gwylan'>>预想中的样子，但<<nnpc_he 'Gwylan'>>似乎并不在意。` },
            EN: { s: `<<He>> scratches <<his>> head upon seeing your <<genitals>>. It wasn't what <<he>> was expecting, but <<he>> doesn't seem to mind.`, m: `Gwylan scratches <<nnpc_his 'Gwylan'>> head upon seeing your <<genitals>>. It wasn't what <<nnpc_he 'Gwylan'>> was expecting, but <<nnpc_he 'Gwylan'>> doesn't seem to mind.` }
          },
          affter: '<<set $speechcrossdressaroused to 2>>'
        });
      }
    };

    CombatAction = {
      actions: new Map(),
      /** @param {...Object} actionConfigs - 动作配置数组 @returns {Object} this */
      reg: function (/**@type {any[]}*/...actionConfigs) {
        actionConfigs.forEach(config => {
          const { id, actionType, cond, display, value, color = 'white', difficulty = '', combatType = 'Default', order = -4 } = config;
          this.actions.set(id, { actionType, cond, display, value, color, difficulty, combatType, order });
        });
        return this;
      },

      _eval: function (/**@type {(arg0: any) => any}*/ fnOrValue, /**@type {any}*/ctx) {
        if (typeof fnOrValue === 'function') {
          try { return fnOrValue(ctx); }
          catch (e) { return null; }
        }
        return fnOrValue;
      },
      /** @param {{ [x: string]: any; }} optionsTable - 原始选项表 @param {string} actionType - 动作类型 @param {string} combatType - 战斗类型 @returns {{ [x: string]: any; }} 处理后的选项表 */
      action: function (/**@type {{ [x: string]: any; }}*/optionsTable, /**@type {any}*/actionType, /**@type {any}*/combatType) {
        const ctx = { actionType, combatType: combatType || 'Default', originalCount: Object.keys(optionsTable).length };
        const currentCombatType = ctx.combatType;
        /** @type {any[]} */const modActions = [];
        this.actions.forEach((entry, id) => {
          if (entry.actionType !== actionType) return;
          const entryCombatType = this._eval(entry.combatType, ctx) || 'Default';
          if (entryCombatType !== 'Default' && entryCombatType !== currentCombatType) return;
          try {
            if (this._eval(entry.cond, ctx)) {
              const display = this._eval(entry.display, ctx);
              const value = this._eval(entry.value, ctx);
              const order = this._eval(entry.order, ctx) ?? -4;
              if (display && value) modActions.push({ id, display, value, order });
            }
          } catch (e) { }
        });
        if (modActions.length === 0) return optionsTable;
        const originalEntries = Object.entries(optionsTable);
        const resultArray = [];
        if (originalEntries.length <= 4) {
          if (originalEntries.length > 0) resultArray.push(originalEntries[0]);
          modActions.forEach(mod => resultArray.push([mod.display, mod.value]));
          for (let i = 1; i < originalEntries.length; i++) resultArray.push(originalEntries[i]);
        } else {
          originalEntries.forEach((entry, index) => {
            if (index === Math.max(1, (originalEntries.length - 4))) modActions.forEach(mod => resultArray.push([mod.display, mod.value]));
            resultArray.push(entry);
          });
        }
        Object.keys(optionsTable).forEach(key => delete optionsTable[key]);
        resultArray.forEach(([display, value]) => optionsTable[display] = value);
        return optionsTable;
      },
      /** @param {string} action - 动作值 @param {string} encounterType - 遭遇类型 @returns {string|null} 颜色名称 */
      color: function (/**@type {any}*/action, /**@type {any}*/encounterType) {
        const ctx = { action, encounterType: encounterType ?? 'Default' };
        for (const [id, entry] of this.actions) {
          const value = this._eval(entry.value, ctx);
          if (value === action) {
            /**@type {any}*/
            const entryCombatType = this._eval(entry.combatType, ctx) ?? 'Default';
            if (entryCombatType === ctx.encounterType || entryCombatType === 'Default') return this._eval(entry.color, ctx) || null;
          }
        }
        return null;
      },
      /** @param {string} action - 动作值 @param {string} combatType - 战斗类型 @returns {string|null} 难度提示文本 */
      difficulty: function (/**@type {any}*/action, /**@type {any}*/combatType) {
        const ctx = { action, combatType: combatType ?? 'Default' };
        for (const [id, entry] of this.actions) {
          const value = this._eval(entry.value, ctx);
          if (value === action) {
            const entryCombatType = this._eval(entry.combatType, ctx) ?? 'Default';
            if (entryCombatType === ctx.combatType || entryCombatType === 'Default') return this._eval(entry.difficulty, ctx) ?? null;
          }
        }
        return null;
      }
    }

    Speech = {
      speechs: new Map(),
      /** @param {string} npc - NPC名称 @param {Function} cond - 条件函数 @param {string} speech - 对话文本 @param {number} cd - 冷却值 */
      reg: function(/**@type {string}*/npc, /**@type {Function}*/cond, /**@type {string}*/speech, /**@type {number}*/cd) {
        if (!this.speechs.has(npc)) this.speechs.set(npc, []);
        this.speechs.get(npc).push({ cond, speech, cd, current: 0 });
      },
      /** @param {string} npc - NPC名称 @returns {string} 对话文本 */
      output: function(/**@type {string}*/npc) {
        if (!this.speechs.has(npc)) return '';
        const speechs = this.speechs.get(npc);
        for (const speech of speechs) {
          if (speech.current > 0) { speech.current--; continue; }
          try {
            if (speech.cond()) { speech.current = speech.cd; return speech.speech; }
          } catch (/**@type {any} */e) {}
        }
        return '';
      },
      init: function() {
        for (const speechs of this.speechs.values()) for (const speech of speechs) speech.current = 0;
      }
    }

    _generateCombatAction() {
      const self = this;
      return function() {
        // @ts-ignore
        let optionsTable = this.args[0]; const actionType = this.args[1]; const combatType = this.args[2] || '';
        const controls = V.options.combatControls;
        const frag = document.createDocumentFragment();
        const el = (/**@type {any}*/val) => document.createElement(val);
        try { self.CombatAction.action(optionsTable, actionType, combatType); } catch(e) { self.log('mod战斗动作对象错误', 'ERROR'); };
        if (['lists', 'limitedLists'].includes(controls)) {
          const actions = Object.values(optionsTable);
          const listSpan = el('span');
          listSpan.id = `${actionType}Select`;
          const textColor = combatListColor(actionType, actions.includes(V[actionType]) ? V[actionType] : actions[0]);
          listSpan.className = `${textColor}List flavorText ${T.reducedWidths ? 'reducedWidth' : ''}`;
          T[`${actionType}options`] = optionsTable;
          const listBox = maplebirch.SugarCube.Wikifier.wikifyEval(`<<listbox '$${actionType}' autoselect>><<optionsfrom _${actionType}options>><</listbox>>`);
          listSpan.append(listBox);
          frag.append(listSpan);
        } else {
          if (!combatType && controls !== 'columnRadio') frag.append(el('br'));
          const optionNames = Object.keys(optionsTable);
          for (let n = 0; n < optionNames.length; n++) {
            const name = optionNames[n];
            const action = optionsTable[name];
            const label = el('label');
            const radioButton = maplebirch.SugarCube.Wikifier.wikifyEval(`<<radiobutton '$${actionType}' '${action}' autocheck>>`);
            const nameSpan = el('span');
            if (action === 'ask') {
              nameSpan.id = 'askLabel';
              nameSpan.className = V.askActionColour;
            } else {
              nameSpan.className = combatListColor(false, action, combatType);
            }
            nameSpan.innerText = ` ${name} `;
            /**@type {any} */let difficultyText;
            try {
              const modDifficulty = self.CombatAction.difficulty(action, combatType);
              if (modDifficulty) { difficultyText = maplebirch.SugarCube.Wikifier.wikifyEval(modDifficulty); }
              else { difficultyText = maplebirch.SugarCube.Wikifier.wikifyEval(`<<${actionType}Difficulty${combatType} ${action}>>`); }
            } catch (e) { self.log('mod战斗动作难度提示错误', 'ERROR'); }
            if (controls === 'radio' && n < optionNames.length - 1) difficultyText.append(' |\xa0');
            label.append(radioButton, nameSpan, difficultyText);
            frag.append(label);
          }
          if (!combatType && controls !== 'columnRadio') frag.append(el('br'), el('br'));
        }
        // @ts-ignore
        this.output.append(frag);
        if (['lists', 'limitedLists'].includes(controls)) self._combatButtonAdjustments(actionType, combatType);
      }
    }

    /** @param {any} name @param {any} value @param {string} type */
    _combatListColor(name, value, type) {
      const action = (value || V[name]).replace(/\d+/g, '');
      const encounterType = type || 'Default';
      if (combatActionColours[encounterType]) for (const color in combatActionColours[encounterType]) if (combatActionColours[encounterType][color].includes(action)) return color;
      try { const modColor = maplebirch.combat.CombatAction.color(action, encounterType); if (modColor) return modColor; } catch (e) { maplebirch.combat.log('mod战斗动作颜色错误', 'ERROR') };
      return 'white';
    }

    /** @param {string} name @param {any} extra */
    _combatButtonAdjustments(name, extra) {
      const self = this;
      jQuery(document).on('change', '#listbox-' + name, { name, extra }, function (/** @type {any}*/e) {
        const action = V[e.data.name];
        let difficultyMacro = `<<${e.data.name}Difficulty${e.data.extra} ${action}>>`;
        try { const modDifficulty = self.CombatAction.difficulty(action, e.data.extra); if (modDifficulty) difficultyMacro = modDifficulty; } catch (e) { self.log('mod战斗动作难度提示错误', 'ERROR'); }
        maplebirch.SugarCube.Wikifier.wikifyEval('<<replace #' + e.data.name + 'Difficulty>>' + difficultyMacro + '<</replace>>');
        $('#' + e.data.name + 'Select').removeClass('whiteList bratList meekList defList subList');
        $('#' + e.data.name + 'Select').addClass(combatListColor(e.data.name, undefined, e.data.extra) + 'List');
      });
      return '';
    }

    /** @param {number} index @param {string[]} args */
    ejaculation(index, ...args) {
      const npcName = V.npc[V.npcrow.indexOf(index)];
      const npc = V.NPCList[index]; if (!npc) return false;
      const output = args[0] ? ' ' + args[0] : '';
      if (npcName && maplebirch.SugarCube.Macro.has(`ejaculation-${npcName.toLowerCase()}`) && setup.NPCNameList.includes(npcName)) {
        return `<<ejaculation-${npcName.toLowerCase()}${output}>>`
      } if (V.position === 'wall') {
        if (V.walltype === 'pillory' || V.walltype === 'cleanpillory') { return `<<ejaculation-pillory${output}>>`; }
        else { return `<<ejaculation-wall${output}>>`; }
      } else if (V.punishmentposition === 'gloryhole' || V.gloryhole) {
        return `<<ejaculation-gloryhole${output}>>`
      } else if (V.NPCList[index].type === 'plant') {
        return `<<ejaculation-plant${output}>>`
      } else if (V.NPCList[index].fullDescription === 'Ivory Wraith') {
        return `<<ejaculation-wraith${output}>>`
      } else {
        return ''
      }
    }

    Init() {
      combatListColor = this._combatListColor;
    }
  }

  await maplebirch.register('combat', new CombatManager(maplebirch), ['npc']);
})();