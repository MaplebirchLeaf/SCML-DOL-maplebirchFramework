// ./src/modules/Combat/CombatAction.ts
import maplebirch from '../../core';
const _ = maplebirch.lodash;

type ActionType = 'leftaction' | 'rightaction' | 'feetaction' | 'mouthaction' | 'penisaction' | 'vaginaaction' | 'anusaction' | 'chestaction' | 'thighaction';

type CombatType = 'Default' | 'Self' | 'Struggle' | 'Swarm' | 'Vore' | 'Machine' | 'Tentacle';

interface Context {
  actionType?: ActionType;
  combatType?: CombatType;
  encounterType?: string;
  action?: any;
  originalCount?: number;
  [key: string]: any;
}

interface ActionEntry {
  actionType: ActionType;
  cond: (ctx: Context) => boolean;
  display: (ctx: Context) => string;
  value: (ctx: Context) => any;
  color: (ctx: Context) => string;
  difficulty: (ctx: Context) => string;
  combatType: (ctx: Context) => CombatType;
  order: (ctx: Context) => number;
}

interface ActionConfig {
  id: string;
  actionType: ActionType | ActionType[];
  cond: (ctx: Context) => boolean;
  display: (ctx: Context) => string;
  value: (ctx: Context) => any;
  color?: string | ((ctx: Context) => string);
  difficulty?: string | ((ctx: Context) => string);
  combatType?: CombatType | ((ctx: Context) => CombatType);
  order?: number | ((ctx: Context) => number);
}

interface OptionsTable {
  [key: string]: any;
}

const CombatAction = {
  actions: new Map<string, ActionEntry[]>(),

  reg: function (...actionConfigs: ActionConfig[]): typeof CombatAction {
    _.forEach(actionConfigs, config => {
      const { id, actionType, cond, display, value, color = 'white', difficulty = '', combatType = 'Default', order = -4 } = config;
      const types = Array.isArray(actionType) ? actionType : [actionType];
      _.forEach(types, type => {
        const entry: ActionEntry = {
          actionType: type,
          cond,
          display,
          value,
          color: _.isFunction(color) ? color : () => color,
          difficulty: _.isFunction(difficulty) ? difficulty : () => difficulty,
          combatType: _.isFunction(combatType) ? (combatType as (ctx: Context) => CombatType) : () => combatType,
          order: _.isFunction(order) ? order : () => order
        };
        if (!this.actions.has(id)) this.actions.set(id, []);
        this.actions.get(id)!.push(entry);
      });
    });
    return this;
  },

  _eval: function <T>(fnOrValue: T | ((ctx: Context) => T), ctx: Context): T | null {
    if (_.isFunction(fnOrValue)) {
      try {
        return (fnOrValue as (ctx: Context) => T)(ctx);
      } catch (err) {
        maplebirch.log('CombatAction _eval error:', 'WARN', err, ctx);
        return null;
      }
    }
    return fnOrValue;
  },

  action: function (optionsTable: OptionsTable, actionType: ActionType, combatType?: CombatType): OptionsTable {
    const ctx: Context = {
      actionType,
      combatType: combatType || 'Default',
      originalCount: _.size(optionsTable)
    };

    const currentCombatType = ctx.combatType;
    const modActions: Array<{ id: string; display: string; value: any; order: number }> = [];

    this.actions.forEach((entries, id) => {
      _.forEach(entries, entry => {
        if (entry.actionType !== actionType) return;
        const entryCombatType = this._eval(entry.combatType, ctx) || 'Default';
        if (entryCombatType !== 'Default' && entryCombatType !== currentCombatType) return;
        try {
          if (this._eval(entry.cond, ctx)) {
            const display = this._eval(entry.display, ctx);
            const value = this._eval(entry.value, ctx);
            const order = this._eval(entry.order, ctx) ?? -4;
            if (display && !_.isNil(value)) modActions.push({ id, display, value, order });
          }
        } catch {}
      });
    });

    if (_.isEmpty(modActions)) return optionsTable;
    modActions.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const Entries = _.toPairs(optionsTable);
    const resultArray: Array<[string, any]> = [...Entries, ...modActions.map<[string, any]>(m => [m.display, m.value])];
    _.forEach(_.keys(optionsTable), key => delete optionsTable[key]);
    _.forEach(resultArray, ([display, value]) => (optionsTable[display] = value));

    return optionsTable;
  },

  color: function (action: any, encounterType?: CombatType): string | null {
    const ctx: Context = {
      action,
      encounterType: encounterType ?? 'Default'
    };

    for (const [, entries] of this.actions) {
      for (const entry of entries) {
        const value = this._eval(entry.value, ctx);
        if (value === action) {
          const entryCombatType = this._eval(entry.combatType, ctx) ?? 'Default';
          if (entryCombatType === ctx.encounterType || entryCombatType === 'Default') return this._eval(entry.color, ctx) || null;
        }
      }
    }
    return null;
  },

  difficulty: function (action: any, combatType?: CombatType): string | null {
    const ctx: Context = {
      action,
      combatType: combatType ?? 'Default'
    };

    for (const [, entries] of this.actions) {
      for (const entry of entries) {
        const value = this._eval(entry.value, ctx);
        if (value === action) {
          const entryCombatType = this._eval(entry.combatType, ctx) ?? 'Default';
          if (entryCombatType === ctx.combatType || entryCombatType === 'Default') return this._eval(entry.difficulty, ctx) ?? null;
        }
      }
    }
    return null;
  }
};

export default CombatAction;
