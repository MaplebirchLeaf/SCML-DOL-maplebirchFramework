// ./src/modules/Combat/CombatAction.ts

import maplebirch from '../../core';

export type ActionType = 'leftaction' | 'rightaction' | 'feetaction' | 'mouthaction' | 'penisaction' | 'vaginaaction' | 'anusaction' | 'chestaction' | 'thighaction';
export type CombatType = 'Default' | 'Self' | 'Struggle' | 'Swarm' | 'Vore' | 'Machine' | 'Tentacle';

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
  effect: (ctx: Context) => string;
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
  effect?: string | ((ctx: Context) => string);
  combatType?: CombatType | ((ctx: Context) => CombatType);
  order?: number | ((ctx: Context) => number);
}

export interface OptionsTable {
  [key: string]: any;
}

class CombatActions {
  public readonly actions: ActionEntry[] = [];

  public reg(...configs: ActionConfig[]): this {
    configs.forEach(config => {
      const { id, actionType, cond, display, value, color = 'white', difficulty = '', effect = '', combatType = 'Default', order = -4 } = config;
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
          effect: typeof effect === 'function' ? effect : () => effect,
          combatType: typeof combatType === 'function' ? combatType : () => combatType,
          order: typeof order === 'function' ? order : () => order
        });
      });
    });
    return this;
  }

  private eval<T>(fnOrValue: T | ((ctx: Context) => T), ctx: Context): T | null {
    if (typeof fnOrValue !== 'function') return fnOrValue;
    try {
      return (fnOrValue as (ctx: Context) => T)(ctx);
    } catch (e) {
      maplebirch.combat?.log?.('CombatAction 执行错误', 'WARN', e, ctx);
      return null;
    }
  }

  public patchOptions(optionsTable: OptionsTable, actionType: ActionType, combatType: CombatType = 'Default'): OptionsTable {
    const ctx: Context = {
      actionType,
      combatType: combatType || 'Default',
      originalCount: Object.keys(optionsTable).length
    };
    const modActions: Array<{ display: string; value: any; order: number }> = [];
    this.actions.forEach(entry => {
      if (entry.actionType !== actionType) return;
      const entryCombatType = this.eval(entry.combatType, ctx) ?? 'Default';
      if (entryCombatType !== ctx.combatType) return;
      if (!this.eval(entry.cond, ctx)) return;
      const display = this.eval(entry.display, ctx);
      const value = this.eval(entry.value, ctx);
      const order = this.eval(entry.order, ctx) ?? -4;
      if (display && value != null) modActions.push({ display, value, order });
    });
    if (modActions.length === 0) return optionsTable;
    modActions.sort((a, b) => a.order - b.order);
    const result = [...Object.entries(optionsTable), ...modActions.map(action => [action.display, action.value] as [string, any])];
    Object.keys(optionsTable).forEach(key => delete optionsTable[key]);
    result.forEach(([display, value]) => (optionsTable[display] = value));
    return optionsTable;
  }

  public color(action: any, encounterType: CombatType = 'Default'): string | null {
    const ctx: Context = {
      action,
      encounterType
    };
    const exact = this.actions.find(entry => {
      const value = this.eval(entry.value, ctx);
      const entryCombatType = this.eval(entry.combatType, ctx) ?? 'Default';
      return value === action && entryCombatType === encounterType;
    });
    if (exact) return this.eval(exact.color, ctx) || null;
    const fallback = this.actions.find(entry => {
      const value = this.eval(entry.value, ctx);
      const entryCombatType = this.eval(entry.combatType, ctx) ?? 'Default';
      return value === action && entryCombatType === 'Default';
    });
    return fallback ? this.eval(fallback.color, ctx) || null : null;
  }

  public difficulty(action: any, combatType: CombatType = 'Default'): string | null {
    const ctx: Context = {
      action,
      combatType
    };
    const exact = this.actions.find(entry => {
      const value = this.eval(entry.value, ctx);
      const entryCombatType = this.eval(entry.combatType, ctx) ?? 'Default';
      return value === action && entryCombatType === combatType;
    });
    if (exact) return this.eval(exact.difficulty, ctx) ?? null;
    const fallback = this.actions.find(entry => {
      const value = this.eval(entry.value, ctx);
      const entryCombatType = this.eval(entry.combatType, ctx) ?? 'Default';
      return value === action && entryCombatType === 'Default';
    });
    return fallback ? (this.eval(fallback.difficulty, ctx) ?? null) : null;
  }

  public effect(...actionTypes: ActionType[]): string {
    const result: string[] = [];
    const targetTypes = actionTypes.length ? actionTypes : [...new Set(this.actions.map(entry => entry.actionType))];
    targetTypes.forEach(actionType => {
      this.actions.forEach(entry => {
        if (entry.actionType !== actionType) return;
        const ctx: Context = { actionType, id: entry.id };
        const value = this.eval(entry.value, ctx);
        const effect = this.eval(entry.effect, ctx);
        if (value == null || !effect) return;
        const actionVar = `$${actionType}`;
        const defaultVar = `$${actionType}default`;
        result.push(`<<if ${actionVar} is ${JSON.stringify(value)}>>\n\t<<set ${actionVar} to 0>><<set ${defaultVar} to ${JSON.stringify(value)}>>\n\t${effect}\n<</if>>`);
      });
    });
    return result.join('\n');
  }
}

export default CombatActions;
