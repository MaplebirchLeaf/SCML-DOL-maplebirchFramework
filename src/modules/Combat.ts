// ./src/modules/Combat.ts

import maplebirch, { type MaplebirchCore, createlog } from '../core';
import type { MacroContext } from '../SugarCubeMacros';
import CombatActions, { type ActionType, type CombatType, type OptionsTable } from './CombatAddon/CombatAction';

class CombatManager {
  public readonly log: ReturnType<typeof createlog>;
  public readonly CombatAction = new CombatActions();

  public constructor(readonly core: MaplebirchCore) {
    this.log = createlog('combat');

    this.core.once(':storyready', () => {
      this.core.tool.macro.define('generateCombatAction', this._generateCombatAction());
      this.core.tool.macro.define('combatButtonAdjustments', (name: string, extra: any) => this._combatButtonAdjustments(name, extra));
    });
  }

  private _generateCombatAction() {
    const CombatAction = this.CombatAction;
    const log = this.log;
    const combatButtonAdjustments = this._combatButtonAdjustments.bind(this);

    return function (this: MacroContext) {
      const optionsTable = this.args[0] as OptionsTable;
      const actionType = this.args[1] as ActionType;
      const combatType = (this.args[2] || '') as CombatType;
      const controls = V.options.combatControls;
      const frag = document.createDocumentFragment();
      const el = (val: string) => document.createElement(val);

      try {
        CombatAction.patchOptions(optionsTable, actionType, combatType);
      } catch (e) {
        log('mod战斗动作对象错误', 'ERROR', e);
      }
      if (['lists', 'limitedLists'].includes(controls)) {
        const optionValues = Object.values(optionsTable);
        const listSpan = el('span');
        listSpan.id = `${actionType}Select`;
        listSpan.className = `${combatListColor(actionType, optionValues.includes(V[actionType]) ? V[actionType] : optionValues[0], combatType)}List flavorText ${T.reducedWidths ? 'reducedWidth' : ''}`;
        T[`${actionType}options`] = optionsTable;
        const listBox = maplebirch.SugarCube.Wikifier.wikifyEval(`<<listbox '$${actionType}' autoselect>><<optionsfrom _${actionType}options>><</listbox>>`);
        listSpan.append(listBox);
        frag.append(listSpan);
      } else {
        if (!combatType && controls !== 'columnRadio') frag.append(el('br'));
        const optionNames = Object.keys(optionsTable);
        optionNames.forEach((name, n) => {
          const action = optionsTable[name];
          const label = el('label');
          const radioButton = maplebirch.SugarCube.Wikifier.wikifyEval(`<<radiobutton '$${actionType}' '${action}' autocheck>>`);
          const nameSpan = el('span');
          let difficultyText = document.createDocumentFragment();
          if (action === 'ask') {
            nameSpan.id = 'askLabel';
            nameSpan.className = V.askActionColour;
          } else {
            nameSpan.className = combatListColor(false, action, combatType);
          }
          nameSpan.innerText = ` ${name} `;
          try {
            const modDifficulty = CombatAction.difficulty(action, combatType);
            difficultyText = maplebirch.SugarCube.Wikifier.wikifyEval(modDifficulty || `<<${actionType}Difficulty${combatType} ${action}>>`);
          } catch (e) {
            log('mod战斗动作难度提示错误', 'ERROR', e);
          }
          if (controls === 'radio' && n < optionNames.length - 1) difficultyText.append(' |\xa0');
          label.append(radioButton, nameSpan, difficultyText);
          frag.append(label);
        });
        if (!combatType && controls !== 'columnRadio') frag.append(el('br'), el('br'));
      }
      this.output.append(frag);
      if (['lists', 'limitedLists'].includes(controls)) combatButtonAdjustments(actionType, combatType);
    };
  }

  private _combatListColor(name: string | number | false, value?: any, type: CombatType = 'Default') {
    type = (type || 'Default') as CombatType;
    const rawAction = value ?? (name !== false ? V[name] : '');
    const action = String(rawAction || '').replace(/\d+/g, '');
    if (combatActionColours[type]) for (const color in combatActionColours[type]) if (combatActionColours[type][color].includes(action)) return color;
    try {
      const modColor = this.CombatAction.color(action, type);
      if (modColor) return modColor;
    } catch (e) {
      this.log('mod战斗动作颜色错误', 'ERROR', e);
    }
    return 'white';
  }

  private _combatButtonAdjustments(name: string, extra: any) {
    const eventName = `change.maplebirchCombat-${name}`;
    jQuery(document)
      .off(eventName, '#listbox-' + name)
      .on(eventName, '#listbox-' + name, { name, extra }, e => {
        const action = V[e.data.name];
        let difficultyMacro = `<<${e.data.name}Difficulty${e.data.extra} ${action}>>`;
        try {
          const modDifficulty = this.CombatAction.difficulty(action, e.data.extra);
          if (modDifficulty) difficultyMacro = modDifficulty;
        } catch (e) {
          this.log('mod战斗动作难度提示错误', 'ERROR', e);
        }
        maplebirch.SugarCube.Wikifier.wikifyEval(`<<replace #${e.data.name}Difficulty>>${difficultyMacro}<</replace>>`);
        $('#' + e.data.name + 'Select')
          .removeClass('whiteList bratList meekList defList subList')
          .addClass(combatListColor(e.data.name, undefined, e.data.extra) + 'List');
      });
    return '';
  }

  public Init() {
    combatListColor = this._combatListColor.bind(this);
  }
}

maplebirch.register('combat', Object.seal(new CombatManager(maplebirch)), ['npc']);

export default CombatManager;
