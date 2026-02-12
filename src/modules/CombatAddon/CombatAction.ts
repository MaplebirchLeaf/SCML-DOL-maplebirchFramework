// ./src/modules/Combat/CombatAction.ts

import maplebirch from '../../core';

interface ActionEntry {
  actionType: any;
  cond: (ctx: Context) => boolean;
  display: (ctx: Context) => string;
  value: (ctx: Context) => any;
  color?: (ctx: Context) => string;
  difficulty?: (ctx: Context) => string;
  combatType?: (ctx: Context) => string;
  order?: (ctx: Context) => number;
}

interface Context {
  actionType?: any;
  combatType?: string;
  encounterType?: string;
  action?: any;
  originalCount?: number;
  [key: string]: any;
}

interface ActionConfig {
  id: string;
  actionType: any;
  cond: (ctx: Context) => boolean;
  display: (ctx: Context) => string;
  value: (ctx: Context) => any;
  color?: string | ((ctx: Context) => string);
  difficulty?: string | ((ctx: Context) => string);
  combatType?: string | ((ctx: Context) => string);
  order?: number | ((ctx: Context) => number);
}

interface OptionsTable {
  [key: string]: any;
}

const _ = maplebirch.lodash;

const CombatAction = {
  actions: new Map<string, ActionEntry>(),

  reg: function (...actionConfigs: ActionConfig[]): typeof CombatAction {
    _.forEach(actionConfigs, config => {
      const { 
        id, 
        actionType, 
        cond, 
        display, 
        value, 
        color = 'white', 
        difficulty = '', 
        combatType = 'Default', 
        order = -4 
      } = config;
      
      this.actions.set(id, { 
        actionType, 
        cond, 
        display, 
        value, 
        color:      _.isFunction(color) ? color : () => color,
        difficulty: _.isFunction(difficulty) ? difficulty : () => difficulty,
        combatType: _.isFunction(combatType) ? combatType : () => combatType,
        order:      _.isFunction(order) ? order : () => order
      });
    });
    return this;
  },

  _eval: function <T>(fnOrValue: T | ((ctx: Context) => T), ctx: Context): T | null {
    if (_.isFunction(fnOrValue)) {
      try { return (fnOrValue as (ctx: Context) => T)(ctx); }
      catch (e) { return null; }
    }
    return fnOrValue;
  },

  action: function (optionsTable: OptionsTable, actionType: any, combatType?: string): OptionsTable {
    const ctx: Context = { 
      actionType, 
      combatType: combatType || 'Default', 
      originalCount: _.size(optionsTable) 
    };
    
    const currentCombatType = ctx.combatType;
    const modActions: Array<{id: string, display: string, value: any, order: number}> = [];
    
    this.actions.forEach((entry: { actionType: any; combatType: any; cond: any; display: any; value: any; order: any; }, id: any) => {
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
    
    if (_.isEmpty(modActions)) return optionsTable;
    
    const Entries = _.toPairs(optionsTable);
    const resultArray: Array<[string, any]> = [];
    if (Entries.length <= 4) {
      if (Entries.length > 0) resultArray.push(Entries[0]);
      _.forEach(modActions, mod => resultArray.push([mod.display, mod.value]));
      _.forEach(Entries.slice(1), entry => resultArray.push(entry));
    } else {
      _.forEach(Entries, (entry, index) => {
        if (index === Math.max(1, (Entries.length - 4))) _.forEach(modActions, mod => resultArray.push([mod.display, mod.value]));
        resultArray.push(entry);
      });
    }
    
    _.forEach(_.keys(optionsTable), key => delete optionsTable[key]);
    _.forEach(resultArray, ([display, value]) => optionsTable[display] = value);
    
    return optionsTable;
  },

  color: function (action: any, encounterType?: string): string | null {
    const ctx: Context = { 
      action, 
      encounterType: encounterType ?? 'Default' 
    };
    
    for (const [id, entry] of this.actions) {
      const value = this._eval(entry.value, ctx);
      if (value === action) {
        const entryCombatType = this._eval(entry.combatType, ctx) ?? 'Default';
        if (entryCombatType === ctx.encounterType || entryCombatType === 'Default') return this._eval(entry.color, ctx) || null;
      }
    }
    return null;
  },

  difficulty: function (action: any, combatType?: string): string | null {
    const ctx: Context = { 
      action, 
      combatType: combatType ?? 'Default' 
    };
    
    for (const [id, entry] of this.actions) {
      const value = this._eval(entry.value, ctx);
      if (value === action) {
        const entryCombatType = this._eval(entry.combatType, ctx) ?? 'Default';
        if (entryCombatType === ctx.combatType || entryCombatType === 'Default') return this._eval(entry.difficulty, ctx) ?? null;
      }
    }
    return null;
  }
};

export default CombatAction;