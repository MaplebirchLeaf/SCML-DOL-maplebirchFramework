import dol from '../../host/DoL';
import type Combat from '../Combat';

export type CompanionNPC = Record<string, unknown>;
export type CompanionEvent = 'effects' | 'assist' | 'update' | 'hit' | 'stun' | 'defeat' | 'leave';

export interface CompanionEffects {
  bonus: number;
  guard: number;
}

interface CompanionReference {
  source: 'named' | 'per';
  key: string;
}

export interface CompanionMember extends CompanionReference {
  widget: string;
  health: number;
  healthmax: number;
  stun: number;
  active: boolean;
}

export interface ResolvedCompanion extends CompanionMember {
  npc: CompanionNPC;
}

export interface CompanionContext extends ResolvedCompanion, CompanionEffects {
  event: CompanionEvent;
  damage: number;
  hit?: [number, number?];
}

interface CompanionState extends CompanionMember {
  leave_turn: number;
  stun_turn: number;
}

interface CombatState {
  companions: CompanionState[];
  turn: number;
  updated: number;
}

class Companions {
  private clock?: { moment: object | undefined; key: number };
  private querying = false;

  public constructor(private readonly combat: Combat) {}

  private get state(): CombatState | undefined {
    return dol.variables.maplebirch?.combat;
  }

  // 战斗可以反复进入同一段落，使用 SugarCube 的历史节点区分回合。
  private get turnKey(): number {
    const moment = this.combat.core.SugarCube.State.current;
    if (!this.clock || this.clock.moment !== moment) {
      const state = this.state;
      const key = Math.max(state?.turn ?? -1, ...(state?.companions.map(member => member.leave_turn) ?? [])) + 1;
      this.clock = { moment, key };
    }
    return this.clock.key;
  }

  public get members(): readonly ResolvedCompanion[] {
    return (this.state?.companions ?? []).flatMap(member => {
      const npc = member.active && this.resolveNPC(member);
      return npc ? [this.view(member, npc)] : [];
    });
  }

  private reference(npc: CompanionNPC): CompanionReference | undefined {
    if (!npc || typeof npc !== 'object' || !dol.has('variables')) return;
    const vars = dol.variables;
    const named = vars.NPCName?.find((current: CompanionNPC) => current === npc);
    if (named && typeof named.nam === 'string' && named.nam) return { source: 'named', key: named.nam };
    const key = Object.keys(vars.per_npc ?? {}).find(key => vars.per_npc[key] === npc);
    return key ? { source: 'per', key } : undefined;
  }

  private resolveNPC(member: CompanionReference): CompanionNPC | undefined {
    if (member.source === 'named') {
      const npc = dol.variables.NPCName?.find((current: CompanionNPC) => current.nam === member.key);
      return npc?.init === 1 ? npc : undefined;
    }
    const npc = dol.variables.per_npc?.[member.key];
    return npc && typeof npc.type === 'string' && typeof npc.fullDescription === 'string' ? npc : undefined;
  }

  private find(npc: CompanionNPC): CompanionState | undefined {
    const ref = this.reference(npc);
    return ref && this.state?.companions.find(member => member.source === ref.source && member.key === ref.key);
  }

  private view(member: CompanionMember, npc: CompanionNPC): ResolvedCompanion {
    const { source, key, widget, health, healthmax, stun, active } = member;
    return { source, key, widget, health, healthmax, stun, active, npc };
  }

  public get(npc: CompanionNPC): Readonly<ResolvedCompanion> | undefined {
    const member = this.find(npc);
    return member ? this.view(member, npc) : undefined;
  }

  public add(npc: CompanionNPC, widget: string, healthmax = 100): boolean {
    const ref = this.reference(npc);
    if (!this.canAct || !ref || !this.resolveNPC(ref) || typeof widget !== 'string' || !/^[A-Za-z][\w-]*$/.test(widget) || !Number.isFinite(healthmax) || healthmax <= 0) return false;
    const state: CombatState = ((dol.variables.maplebirch ??= {}).combat ??= { companions: [], turn: -1, updated: -1 });
    const member = state.companions.find(member => member.source === ref.source && member.key === ref.key);
    if (member) {
      if (member.active || member.health <= 0) return false;
      member.active = true;
    } else state.companions.push({ ...ref, widget, health: healthmax, healthmax, stun: 0, active: true, leave_turn: -1, stun_turn: -1 });
    return true;
  }

  public clear(): void {
    this.clock = undefined;
    delete dol.variables.maplebirch?.combat;
  }

  private available(member: CompanionState): boolean {
    return this.canAct && !!this.state?.companions.includes(member) && member.active && member.health > 0 && member.stun === 0 && !!this.resolveNPC(member);
  }

  private supports(member: CompanionState): boolean {
    return this.available(member) && member.stun_turn !== this.turnKey;
  }

  private effects(member: CompanionState): CompanionEffects {
    const effects = { bonus: 0, guard: 0 };
    if (this.querying) return effects;
    this.querying = true;
    try {
      this.render(member, 'effects', 0, effects);
    } finally {
      this.querying = false;
    }
    return {
      bonus: Number.isFinite(effects.bonus) ? Math.max(0, effects.bonus) : 0,
      guard: Number.isFinite(effects.guard) ? Math.min(1, Math.max(0, effects.guard)) : 0
    };
  }

  public damage(amount: number): number {
    if (!Number.isFinite(amount) || amount <= 0 || this.querying) return amount;
    let bonus = 0;
    for (const member of this.state?.companions ?? []) {
      if (!this.supports(member)) continue;
      const effects = this.effects(member);
      if (this.supports(member)) bonus += effects.bonus;
    }
    const damage = amount * (1 + bonus);
    return Number.isFinite(damage) ? damage : amount;
  }

  public pain(amount: number, modifier = 4): number {
    if (!Number.isFinite(amount * modifier) || amount * modifier <= 0 || this.querying) return amount;
    let factor = 1;
    for (const member of this.state?.companions ?? []) {
      if (!this.supports(member)) continue;
      const effects = this.effects(member);
      if (this.supports(member)) factor *= 1 - effects.guard;
    }
    return amount * factor;
  }

  public leave(...npcs: CompanionNPC[]): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const state = this.state;
    if (!state || !npcs.length) return fragment;
    const selected = new Set(npcs.map(npc => this.find(npc)));
    for (const member of state.companions.slice()) {
      if (this.state !== state) break;
      if (!member.active || !selected.has(member)) continue;
      member.active = false;
      const turn = this.turnKey;
      if (member.leave_turn === turn) continue;
      member.leave_turn = turn;
      fragment.append(this.render(member, 'leave'));
    }
    return fragment;
  }

  private hit(member: CompanionState, damage: number, stun = 0): DocumentFragment {
    const fragment = document.createDocumentFragment();
    if (
      !this.canSettle ||
      !member.active ||
      !this.state?.companions.includes(member) ||
      !this.resolveNPC(member) ||
      member.health <= 0 ||
      !Number.isFinite(damage) ||
      damage < 0 ||
      !Number.isSafeInteger(stun) ||
      stun < 0 ||
      (damage === 0 && stun === 0)
    )
      return fragment;
    const lost = Math.min(member.health, damage);
    member.health -= lost;
    member.stun = Math.max(member.stun, stun);
    if (member.health <= 0) member.active = false;
    return this.render(member, member.active ? 'hit' : 'defeat', lost);
  }

  public update(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const state = this.state;
    if (!state || !this.canSettle) return fragment;
    const turn = this.turnKey;
    if (state.turn !== turn || state.updated === turn) return fragment;
    state.updated = turn;
    for (const member of state.companions.slice()) {
      if (this.state !== state || !this.canSettle) break;
      if (!member.active || !this.resolveNPC(member)) continue;
      const result: CompanionEffects & Pick<CompanionContext, 'hit'> = { bonus: 0, guard: 0 };
      fragment.append(this.render(member, 'update', 0, result));
      if (Array.isArray(result.hit) && result.hit.length >= 1 && result.hit.length <= 2) fragment.append(this.hit(member, result.hit[0], result.hit[1] ?? 0));
    }
    return fragment;
  }

  private get canSettle(): boolean {
    const vars = dol.variables;
    return vars.combat === 1 && ['man', 'beast'].includes(vars.enemytype) && !vars.possessed;
  }

  private get canAct(): boolean {
    const vars = dol.variables;
    return this.canSettle && vars.enemyhealth > 0 && !this.combat.climax && vars.finish !== 1 && !(vars.alarm === 1 && vars.rescue >= 1) && !vars.nextPassage && !vars.nextPassageCheck;
  }

  private render(member: CompanionState, event: CompanionEvent, damage = 0, effects: CompanionEffects = { bonus: 0, guard: 0 }): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const npc = this.resolveNPC(member);
    if (!npc) return fragment;
    const temporary = dol.temporary;
    const hadContext = Object.hasOwn(temporary, 'maplebirch_companion');
    const previous = temporary.maplebirch_companion;
    temporary.maplebirch_companion = Object.assign(effects, this.view(member, npc), { event, damage }) satisfies CompanionContext;
    try {
      fragment.append(this.combat.core.SugarCube.Wikifier.wikifyEval(`<<${member.widget} _maplebirch_companion>>`));
    } catch (error) {
      if (event === 'effects') Object.assign(effects, { bonus: 0, guard: 0 });
      if (event === 'update') Object.assign(effects, { hit: undefined });
      this.combat.log(`战斗同伴执行错误: ${member.source}:${member.key}`, 'ERROR', error);
    } finally {
      if (hadContext) temporary.maplebirch_companion = previous;
      else delete temporary.maplebirch_companion;
    }
    return fragment;
  }

  public turn(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const state = this.state;
    if (!state) return fragment;
    if (dol.variables.combat !== 1) {
      this.clear();
      return fragment;
    }
    const turn = this.turnKey;
    if (!state.companions.some(member => member.active) || state.turn === turn || !this.canAct) return fragment;
    state.turn = turn;
    for (const member of state.companions.slice()) {
      if (this.state !== state || !this.canAct) break;
      if (!member.active || !this.resolveNPC(member)) continue;
      if (member.stun > 0) {
        member.stun_turn = turn;
        member.stun--;
        fragment.append(this.render(member, 'stun'));
      } else {
        fragment.append(this.render(member, 'assist'));
      }
    }
    return fragment;
  }
}

export default Companions;
