// ./src/modules/Combat/CombatAction.ts

import maplebirch from '../../core';

export const actionTypes = ['leftaction', 'rightaction', 'feetaction', 'mouthaction', 'penisaction', 'vaginaaction', 'anusaction', 'chestaction', 'thighaction'] as const;
export type ActionType = (typeof actionTypes)[number];
export type OptionType = ActionType | 'ask';
export const combatTypes = ['Default', 'Self', 'Struggle', 'Swarm', 'Vore', 'Machine', 'Tentacle'] as const;
export type CombatType = (typeof combatTypes)[number];
export type ActionValue = string | number;

interface Context {
  actionType?: OptionType;
  combatType?: CombatType;
  encounterType?: CombatType;
  action?: ActionValue;
  id?: string;
  originalCount?: number;
  label?: string;
}

interface ActionEntry {
  id: string;
  actionType: ActionType;
  cond: (ctx: Context) => boolean;
  display: (ctx: Context) => string;
  value: (ctx: Context) => ActionValue;
  color: (ctx: Context) => string;
  difficulty: (ctx: Context) => string;
  effect: (ctx: Context) => string;
  combatType: (ctx: Context) => CombatType | CombatType[];
  order: (ctx: Context) => number;
}

interface ActionConfig {
  id: string;
  actionType: ActionType | ActionType[];
  cond: (ctx: Context) => boolean;
  display: (ctx: Context) => string;
  value: (ctx: Context) => ActionValue;
  color?: string | ((ctx: Context) => string);
  difficulty?: string | ((ctx: Context) => string);
  effect?: string | ((ctx: Context) => string);
  combatType?: CombatType | CombatType[] | ((ctx: Context) => CombatType | CombatType[]);
  order?: number | ((ctx: Context) => number);
}

interface ModificationConfig {
  id: string;
  actionType: OptionType | OptionType[];
  value: ActionValue;
  combatType?: CombatType | CombatType[] | ((ctx: Context) => CombatType | CombatType[]);
  cond?: (ctx: Context) => boolean;
  display?: string | ((ctx: Context) => string);
  order?: number | ((ctx: Context) => number);
}

interface ModificationEntry {
  id: string;
  actionType: OptionType;
  value: ActionValue;
  combatType: (ctx: Context) => CombatType | CombatType[];
  cond?: (ctx: Context) => boolean;
  display?: (ctx: Context) => string;
  order?: (ctx: Context) => number;
}

export interface OptionsTable {
  [key: string]: ActionValue;
}

class CombatActions {
  public readonly actions: ActionEntry[] = [];
  private readonly modifications: ModificationEntry[] = [];

  private matches(entry: Pick<ActionEntry, 'combatType'>, ctx: Context, combatType: CombatType): boolean {
    const types = this.eval(entry.combatType, ctx) ?? 'Default';
    return Array.isArray(types) ? types.includes(combatType) : types === combatType;
  }

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

  public modify(...configs: ModificationConfig[]): this {
    configs.forEach(({ id, actionType, value, combatType = 'Default', cond, display, order }) => {
      for (const type of Array.isArray(actionType) ? actionType : [actionType]) {
        this.modifications.push({
          id,
          actionType: type,
          value,
          combatType: typeof combatType === 'function' ? combatType : () => combatType,
          cond,
          display: typeof display === 'function' ? display : display === undefined ? undefined : () => display,
          order: typeof order === 'function' ? order : order === undefined ? undefined : () => order
        });
      }
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

  public patchOptions(optionsTable: OptionsTable, actionType: OptionType, combatType: CombatType = 'Default'): OptionsTable {
    combatType ||= 'Default';
    const ctx: Context = {
      actionType,
      combatType,
      originalCount: Object.keys(optionsTable).length
    };
    const options = Object.entries(optionsTable);
    let changed = false;
    this.modifications.forEach(entry => {
      if (entry.actionType !== actionType || !this.matches(entry, ctx, combatType)) return;
      const index = options.findIndex(([, value]) => value === entry.value);
      if (index < 0) return;
      const [label, value] = options[index];
      const optionContext = { ...ctx, id: entry.id, action: value, label };
      if (entry.cond && this.eval(entry.cond, optionContext) === false) {
        options.splice(index, 1);
        changed = true;
        return;
      }
      const nextLabel = entry.display ? this.eval(entry.display, optionContext) : label;
      if (!nextLabel || (nextLabel !== label && options.some(([other], otherIndex) => otherIndex !== index && other === nextLabel))) return;
      options[index][0] = nextLabel;
      if (nextLabel !== label) changed = true;
      const order = entry.order ? this.eval(entry.order, optionContext) : null;
      if (typeof order === 'number' && Number.isInteger(order)) {
        const target = Math.max(0, Math.min(order, options.length - 1));
        if (target !== index) {
          const [option] = options.splice(index, 1);
          options.splice(target, 0, option);
          changed = true;
        }
      }
    });
    const modActions: Array<{ display: string; value: ActionValue; order: number }> = [];
    this.actions.forEach(entry => {
      if (entry.actionType !== actionType) return;
      if (!this.matches(entry, ctx, combatType)) return;
      if (!this.eval(entry.cond, ctx)) return;
      const display = this.eval(entry.display, ctx);
      const value = this.eval(entry.value, ctx);
      const order = this.eval(entry.order, ctx) ?? -4;
      if (display && value != null) modActions.push({ display, value, order });
    });
    if (modActions.length === 0 && !changed) return optionsTable;
    modActions.sort((a, b) => a.order - b.order);
    const result = [...options, ...modActions.map(action => [action.display, action.value] as [string, ActionValue])];
    Object.keys(optionsTable).forEach(key => delete optionsTable[key]);
    result.forEach(([display, value]) => (optionsTable[display] = value));
    return optionsTable;
  }

  public color(action: ActionValue, encounterType: CombatType = 'Default'): string | null {
    encounterType ||= 'Default';
    const ctx: Context = {
      action,
      encounterType,
      combatType: encounterType
    };
    const exact = this.actions.find(entry => {
      const value = this.eval(entry.value, ctx);
      return value === action && this.matches(entry, ctx, encounterType);
    });
    if (exact) return this.eval(exact.color, ctx) || null;
    const fallback = this.actions.find(entry => {
      const value = this.eval(entry.value, ctx);
      return value === action && this.matches(entry, ctx, 'Default');
    });
    return fallback ? this.eval(fallback.color, ctx) || null : null;
  }

  public difficulty(action: ActionValue, combatType: CombatType = 'Default'): string | null {
    combatType ||= 'Default';
    const ctx: Context = {
      action,
      combatType
    };
    const exact = this.actions.find(entry => {
      const value = this.eval(entry.value, ctx);
      return value === action && this.matches(entry, ctx, combatType);
    });
    if (exact) return this.eval(exact.difficulty, ctx) ?? null;
    const fallback = this.actions.find(entry => {
      const value = this.eval(entry.value, ctx);
      return value === action && this.matches(entry, ctx, 'Default');
    });
    return fallback ? (this.eval(fallback.difficulty, ctx) ?? null) : null;
  }

  public effect(combatType: CombatType | undefined, ...actionTypes: ActionType[]): string {
    const result: string[] = [];
    const encounterType = combatType ?? 'Default';
    const targetTypes = actionTypes.length ? actionTypes : [...new Set(this.actions.map(entry => entry.actionType))];
    targetTypes.forEach(actionType => {
      this.actions.forEach(entry => {
        if (entry.actionType !== actionType) return;
        const ctx: Context = { actionType, id: entry.id, combatType: encounterType };
        if (!this.matches(entry, ctx, encounterType)) return;
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
