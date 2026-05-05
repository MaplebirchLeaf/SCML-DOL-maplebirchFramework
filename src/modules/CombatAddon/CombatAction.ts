// ./src/modules/Combat/CombatAction.ts

import maplebirch from '../../core';

type ActionType = string;
type CombatType = string;

interface Context {
  actionType?: ActionType;
  combatType?: CombatType;
  encounterType?: CombatType;
  action?: any;
  originalCount?: number;
  [key: string]: any;
}

interface ActionEntry {
  id: string;
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
  actions: [] as ActionEntry[],

  reg(...configs: ActionConfig[]): typeof CombatAction {
    configs.forEach(config => {
      const { id, actionType, cond, display, value, color = 'white', difficulty = '', combatType = 'Default', order = -4 } = config;
      const actionTypes = Array.isArray(actionType) ? actionType : [actionType];
      actionTypes.forEach(type => {
        this.actions.push({
          id,
          actionType: type,
          cond,
          display,
          value,
          color: typeof color === 'function' ? color : () => color,
          difficulty: typeof difficulty === 'function' ? difficulty : () => difficulty,
          combatType: typeof combatType === 'function' ? combatType : () => combatType,
          order: typeof order === 'function' ? order : () => order
        });
      });
    });
    return this;
  },

  _eval<T>(fnOrValue: T | ((ctx: Context) => T), ctx: Context): T | null {
    if (typeof fnOrValue !== 'function') return fnOrValue;
    try {
      return (fnOrValue as (ctx: Context) => T)(ctx);
    } catch (e) {
      maplebirch.combat?.log?.('CombatAction 执行错误', 'WARN', e, ctx);
      return null;
    }
  },

  action(optionsTable: OptionsTable, actionType: ActionType, combatType: CombatType = 'Default'): OptionsTable {
    const ctx: Context = {
      actionType,
      combatType: combatType || 'Default',
      originalCount: Object.keys(optionsTable).length
    };
    const modActions: Array<{ display: string; value: any; order: number }> = [];
    this.actions.forEach(entry => {
      if (entry.actionType !== actionType) return;
      const entryCombatType = this._eval(entry.combatType, ctx) ?? 'Default';
      if (entryCombatType !== 'Default' && entryCombatType !== ctx.combatType) return;
      if (!this._eval(entry.cond, ctx)) return;
      const display = this._eval(entry.display, ctx);
      const value = this._eval(entry.value, ctx);
      const order = this._eval(entry.order, ctx) ?? -4;
      if (display && value != null) modActions.push({ display, value, order });
    });
    if (modActions.length === 0) return optionsTable;
    modActions.sort((a, b) => a.order - b.order);
    const result = [...Object.entries(optionsTable), ...modActions.map(action => [action.display, action.value] as [string, any])];
    Object.keys(optionsTable).forEach(key => delete optionsTable[key]);
    result.forEach(([display, value]) => (optionsTable[display] = value));
    return optionsTable;
  },

  color(action: any, encounterType: CombatType = 'Default'): string | null {
    const ctx: Context = {
      action,
      encounterType
    };
    const exact = this.actions.find(entry => {
      const value = this._eval(entry.value, ctx);
      const entryCombatType = this._eval(entry.combatType, ctx) ?? 'Default';
      return value === action && entryCombatType === encounterType;
    });
    if (exact) return this._eval(exact.color, ctx) || null;
    const fallback = this.actions.find(entry => {
      const value = this._eval(entry.value, ctx);
      const entryCombatType = this._eval(entry.combatType, ctx) ?? 'Default';
      return value === action && entryCombatType === 'Default';
    });
    return fallback ? this._eval(fallback.color, ctx) || null : null;
  },

  difficulty(action: any, combatType: CombatType = 'Default'): string | null {
    const ctx: Context = {
      action,
      combatType
    };
    const exact = this.actions.find(entry => {
      const value = this._eval(entry.value, ctx);
      const entryCombatType = this._eval(entry.combatType, ctx) ?? 'Default';
      return value === action && entryCombatType === combatType;
    });
    if (exact) return this._eval(exact.difficulty, ctx) ?? null;
    const fallback = this.actions.find(entry => {
      const value = this._eval(entry.value, ctx);
      const entryCombatType = this._eval(entry.combatType, ctx) ?? 'Default';
      return value === action && entryCombatType === 'Default';
    });
    return fallback ? (this._eval(fallback.difficulty, ctx) ?? null) : null;
  }
};

export default CombatAction;
