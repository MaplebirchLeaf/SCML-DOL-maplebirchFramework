// ./src/modules/Combat.ts

import maplebirch, { MaplebirchCore, createlog } from '../core';
import Reaction from './CombatAddon/Reaction';
import CombatAction from './CombatAddon/CombatAction';
import Speech from './CombatAddon/Speech';

class CombatManager {
  readonly log: ReturnType<typeof createlog>;
  readonly Reaction: typeof Reaction = Reaction;
  readonly CombatAction: typeof CombatAction = CombatAction;
  readonly Speech: typeof Speech = Speech;
  private readonly _: typeof maplebirch.lodash;

  constructor(readonly core: MaplebirchCore) {
    this.log = createlog('combat');
    this._ = core.lodash;
    this.Reaction.init();
    this.core.once(':finally', () => {
      this.core.tool.macro.define('generateCombatAction', this._generateCombatAction());
      this.core.tool.macro.define('combatButtonAdjustments', (name: string, extra: any) => this._combatButtonAdjustments(name, extra));
    });
  }

  _generateCombatAction() {
    const self = this;
    return function () {
      let optionsTable = this.args[0];
      const actionType = this.args[1];
      const combatType = this.args[2] || '';
      const controls = V.options.combatControls;
      const frag = document.createDocumentFragment();
      const el = (val: string) => document.createElement(val);

      try { self.CombatAction.action(optionsTable, actionType, combatType); }
      catch (e) { self.log('mod战斗动作对象错误', 'ERROR'); }
      if (self._.includes(['lists', 'limitedLists'], controls)) {
        const actions = self._.values(optionsTable);
        const listSpan = el('span');
        listSpan.id = `${actionType}Select`;
        const textColor = combatListColor(actionType, self._.includes(actions, V[actionType]) ? V[actionType] : actions[0]);
        listSpan.className = `${textColor}List flavorText ${T.reducedWidths ? 'reducedWidth' : ''}`;
        T[`${actionType}options`] = optionsTable;
        const listBox = maplebirch.SugarCube.Wikifier.wikifyEval(`<<listbox '$${actionType}' autoselect>><<optionsfrom _${actionType}options>><</listbox>>`);
        listSpan.append(listBox);
        frag.append(listSpan);
      } else {
        if (!combatType && controls !== 'columnRadio') frag.append(el('br'));
        const optionNames = self._.keys(optionsTable);
        self._.forEach(optionNames, (name: string, n: number) => {
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
          let difficultyText: DocumentFragment;
          try {
            const modDifficulty = self.CombatAction.difficulty(action, combatType);
            if (modDifficulty) {
              difficultyText = maplebirch.SugarCube.Wikifier.wikifyEval(modDifficulty);
            } else {
              difficultyText = maplebirch.SugarCube.Wikifier.wikifyEval(`<<${actionType}Difficulty${combatType} ${action}>>`);
            }
          } catch (e) {
            self.log('mod战斗动作难度提示错误', 'ERROR');
          }
          if (controls === 'radio' && n < optionNames.length - 1) if (difficultyText) difficultyText.append(' |\xa0');
          label.append(radioButton, nameSpan, difficultyText!);
          frag.append(label);
        });
        if (!combatType && controls !== 'columnRadio') frag.append(el('br'), el('br'));
      }
      this.output.append(frag);
      if (self._.includes(['lists', 'limitedLists'], controls)) self._combatButtonAdjustments(actionType, combatType);
    };
  }

  _combatListColor(name: string | number, value: any, type: string) {
    const action = (value || V[name]).replace(/\d+/g, '');
    const encounterType = type || 'Default';
    if (combatActionColours[encounterType]) for (const color in combatActionColours[encounterType]) if (combatActionColours[encounterType][color].includes(action)) return color;
    try {
      const modColor = maplebirch.combat.CombatAction.color(action, encounterType);
      if (modColor) return modColor;
    } catch (e) {
      maplebirch.combat.log('mod战斗动作颜色错误', 'ERROR');
    }
    return 'white';
  }

  _combatButtonAdjustments(name: string, extra: any) {
    const self = this;
    jQuery(document).on('change', '#listbox-' + name, { name, extra }, function (e: any) {
      const action = V[e.data.name];
      let difficultyMacro = `<<${e.data.name}Difficulty${e.data.extra} ${action}>>`;
      try {
        const modDifficulty = self.CombatAction.difficulty(action, e.data.extra);
        if (modDifficulty) difficultyMacro = modDifficulty;
      } catch (e) {
        self.log('mod战斗动作难度提示错误', 'ERROR');
      }
      maplebirch.SugarCube.Wikifier.wikifyEval('<<replace #' + e.data.name + 'Difficulty>>' + difficultyMacro + '<</replace>>');
      $('#' + e.data.name + 'Select').removeClass('whiteList bratList meekList defList subList');
      $('#' + e.data.name + 'Select').addClass(combatListColor(e.data.name, undefined, e.data.extra) + 'List');
    });
    return '';
  }

  ejaculation(index: string | number, ...args: string[]) {
    const npcName = V.npc[V.npcrow.indexOf(index)];
    const npc = V.NPCList[index];
    if (!npc) return false;
    const output = args[0] ? ' ' + args[0] : '';
    if (npcName && maplebirch.SugarCube.Macro.has(`ejaculation-${npcName.toLowerCase()}`) && self._.includes(setup.NPCNameList, npcName)) return `<<ejaculation-${npcName.toLowerCase()}${output}>>`;
    if (V.position === 'wall') {
      if (V.walltype === 'pillory' || V.walltype === 'cleanpillory') {
        return `<<ejaculation-pillory${output}>>`;
      } else {
        return `<<ejaculation-wall${output}>>`;
      }
    } else if (V.punishmentposition === 'gloryhole' || V.gloryhole) {
      return `<<ejaculation-gloryhole${output}>>`;
    } else if (V.NPCList[index].type === 'plant') {
      return `<<ejaculation-plant${output}>>`;
    } else if (V.NPCList[index].fullDescription === 'Ivory Wraith') {
      return `<<ejaculation-wraith${output}>>`;
    } else {
      return '';
    }
  }

  Init() {
    combatListColor = this._combatListColor;
  }
}

(async function(maplebirch) {
  'use strict';
  await maplebirch.register('combat', Object.seal(new CombatManager(maplebirch)), ['npc']);
})(maplebirch)

export default CombatManager