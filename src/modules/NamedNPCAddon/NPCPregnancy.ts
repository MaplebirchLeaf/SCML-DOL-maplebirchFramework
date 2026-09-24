// ./src/modules/NamedNPCAddon/NPCPregnancy.ts

import type NPCManager from '../NamedNPC';
import type { NPCData } from '../NamedNPC';
import dol from '../../host/DoL';

export type NPCPregnancySpecies = 'human' | 'wolf' | 'wolfboy' | 'wolfgirl' | 'hawk' | 'harpy';
export type NPCPregnancyOrifice = 'vagina' | 'anus';
export type NPCPregnancyRange = number | readonly [min: number, max: number];

export interface NPCPregnancyState {
  enabled?: boolean;
  analEnabled?: boolean;
  cycleDaysTotal?: number;
  cycleDay?: number;
  cycleDangerousDay?: number;
  fertileLeadDays?: number;
  pills?: 'contraceptive' | 'fertility' | null;
  [key: string]: unknown;
}

export interface NPCPregnancyRecord {
  pregnancyId: number;
  carrier: string;
  carrierSpecies: string;
  donor: string;
  donorSpecies: NPCPregnancySpecies;
  possibleDonors: { name: string; species: NPCPregnancySpecies }[];
  conceivedDate: number;
  conceivedLocation: string;
  gestationVariance: number;
  orifice: NPCPregnancyOrifice;
  deliveredDate: number | null;
  deliveredLocation: string | null;
  awareOfPregnancy: string[];
  awareOfCarrier: string[];
  awareOfDonor: string[];
  talkedAbout: Record<string, boolean>;
  playerLearnedFrom: string | null;
  hatchDelay?: number;
  layCare?: number;
  waterBreaking?: boolean;
}

export interface NPCChildRecord {
  childId: number;
  pregnancyId: number;
  species: 'human' | 'wolf' | 'hawk';
  features: {
    beastTransform: string | null;
    divineTransform: string | null;
    hairColour: string;
    eyeColour: string;
    skinColour: string | number;
    size: 'tiny' | 'small' | 'normal' | 'large';
    monster?: 'monster';
  };
  gender: 'm' | 'f' | 'h';
  identical: number | null;
  development: Record<string, unknown>;
  bornDate: number | null;
  name: string | null;
  coParents: string[];
  awareOfChild: string[];
  awareOfGender: string[];
}

export interface NPCPregnancyCycleConfig {
  days?: NPCPregnancyRange;
  dangerousDay?: number;
  fertileLeadDays?: NPCPregnancyRange;
  pills?: 'contraceptive' | 'fertility' | null;
  analEnabled?: boolean;
  avoidance?: number;
}

export interface NPCPregnancyConfig {
  canBePregnant?: boolean;
  canImpregnatePlayer?: boolean;
  cycle?: NPCPregnancyCycleConfig;
}

export interface NPCTryConceiveOptions {
  donor?: string;
  donorSpecies?: NPCPregnancySpecies;
  orifice?: NPCPregnancyOrifice;
  depth?: 'outside' | 'imminent' | 'deep';
  location?: string;
  fertility?: number;
  aware?: boolean;
  donorKnown?: boolean;
}

export interface NPCPregnancySnapshot {
  cycle: {
    enabled: boolean;
    day: number | null;
    days: number | null;
    dangerousDay: number | null;
    fertileLeadDays: number | null;
    fertility: number;
    pills: NPCPregnancyState['pills'];
    analEnabled: boolean;
    avoidance: number | null;
  };
  pregnancies: NPCPregnancyRecord[];
  progress: number | null;
  dueDate: number | null;
  belly: number;
}

const pregnancySpecies: readonly string[] = ['human', 'wolf', 'wolfboy', 'wolfgirl', 'hawk', 'harpy'];

export function isPregnancySpecies(value: unknown): value is NPCPregnancySpecies {
  return typeof value === 'string' && pregnancySpecies.includes(value);
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

class NPCPregnancy {
  private readonly configs = new Map<string, NPCPregnancyConfig>();
  private initialized = false;

  public constructor(private readonly manager: NPCManager) {}

  public get available(): boolean {
    return (
      typeof npcPregnancyRoll === 'function' &&
      typeof getActivePregnancies === 'function' &&
      typeof npcMenstrualFertility === 'function' &&
      typeof pregnancyProgress === 'function' &&
      typeof getDueDate === 'function' &&
      typeof npcBellySize === 'function'
    );
  }

  public add(npcName: string, config: NPCPregnancyConfig = {}): this {
    const name = this.name(npcName);
    if (config === null || typeof config !== 'object' || Array.isArray(config)) throw new Error(`Invalid pregnancy configuration: ${name}`);
    if ([config.canBePregnant, config.canImpregnatePlayer].some(value => value !== undefined && typeof value !== 'boolean')) {
      throw new Error(`Invalid pregnancy configuration: ${name}`);
    }
    this.validateCycle(name, config.cycle);
    this.configs.set(name, {
      canBePregnant: config.canBePregnant ?? true,
      canImpregnatePlayer: config.canImpregnatePlayer ?? false,
      ...(config.cycle ? { cycle: { ...config.cycle } } : {})
    });
    if (this.initialized) {
      this.applyRegistration(name);
      this.inject();
    }
    return this;
  }

  public init(): void {
    if (!dol.setup.pregnancy) return;
    this.initialized = true;
    for (const name of this.configs.keys()) this.applyRegistration(name);
  }

  public inject(): void {
    if (!this.initialized || !this.available || !Array.isArray(dol.variables.NPCName) || !dol.variables.NPCName.length) return;
    if (!this.manager.core.host.sugarcube.require().Macro.has('npcPregnancyUpdater')) return;
    const initialized = new Set((dol.variables.NPCName as NPCData[]).filter(npc => npc.pregnancy?.enabled !== undefined).map(npc => npc.nam));
    new (this.manager.core.host.sugarcube.require().Wikifier)(document.createDocumentFragment(), '<<npcPregnancyUpdater>>');
    for (const [name, config] of this.configs) {
      const npc = (dol.variables.NPCName as NPCData[]).find(npc => npc.nam === name);
      if (npc && config.cycle && !this.cycleConfigured(name) && npc.pregnancy?.enabled !== undefined) {
        this.applyCycle(npc, config.cycle, !initialized.has(name));
        this.markCycleConfigured(name);
      }
    }
  }

  public get(npcName: string): NPCPregnancySnapshot {
    this.requireRuntime();
    const name = this.name(npcName);
    const npc = this.npc(name);
    const state = npc.pregnancy ?? {};
    const pregnancies = getActivePregnancies(name);
    const active = pregnancies[0];
    return {
      cycle: {
        enabled: state.enabled === true,
        day: finite(state.cycleDay) ? state.cycleDay : null,
        days: finite(state.cycleDaysTotal) ? state.cycleDaysTotal : null,
        dangerousDay: finite(state.cycleDangerousDay) ? state.cycleDangerousDay : null,
        fertileLeadDays: finite(state.fertileLeadDays) ? state.fertileLeadDays : null,
        fertility: npcMenstrualFertility(name),
        pills: state.pills,
        analEnabled: state.analEnabled === true,
        avoidance: finite(npc.pregnancyAvoidance) ? npc.pregnancyAvoidance : null
      },
      pregnancies,
      progress: active ? pregnancyProgress(active) : null,
      dueDate: active ? getDueDate(active) : null,
      belly: npcBellySize(name)
    };
  }

  public tryConceive(npcName: string, options: NPCTryConceiveOptions = {}): NPCPregnancyRecord | null {
    this.requireRuntime();
    const name = this.name(npcName);
    const npc = this.npc(name);
    const carrierSpecies = this.species(name, npc.type);
    const donor = options.donor ?? 'pc';
    const donorSpecies = options.donorSpecies ?? (donor === 'pc' ? 'human' : this.species(donor, this.npc(donor).type));
    if (!isPregnancySpecies(donorSpecies)) throw new Error(`Unsupported pregnancy species for ${donor}: ${String(donorSpecies)}`);
    const donorNpc = (dol.variables.NPCName as NPCData[]).find(npc => npc.nam === donor);
    if ([npc, donorNpc].some(parent => parent?.penis === 'none' && parent.vagina === 'none')) return null;
    const orifice = options.orifice ?? (npc.vagina && npc.vagina !== 'none' ? 'vagina' : 'anus');
    if (orifice !== 'vagina' && orifice !== 'anus') throw new Error(`Invalid pregnancy orifice: ${String(orifice)}`);
    if (orifice === 'vagina' && (!npc.vagina || npc.vagina === 'none')) return null;
    const fertility = options.fertility ?? 1;
    if (!finite(fertility) || fertility < 0) throw new Error('Pregnancy fertility must be a finite non-negative number');
    const id = npcPregnancyRoll(name, carrierSpecies, donor, donorSpecies, orifice, options.depth, options.location, fertility);
    if (id === null) return null;
    if (options.aware) setKnowsPregnancy(id, 'pc');
    if (options.donorKnown) setKnowsDonor(id, 'pc');
    return (dol.variables.pregnancies as NPCPregnancyRecord[])[id];
  }

  private applyRegistration(npcName: string): void {
    const config = this.configs.get(npcName)!;
    for (const field of ['canBePregnant', 'canImpregnatePlayer'] as const) {
      const names: string[] = dol.setup.pregnancy[field];
      if (config[field] && !names.includes(npcName)) names.push(npcName);
    }
  }

  private applyCycle(npc: NPCData, config: NPCPregnancyCycleConfig, initializeDay: boolean): void {
    const state = (npc.pregnancy ??= {});
    if (config.days !== undefined) {
      state.cycleDaysTotal = this.range(config.days);
      const day = finite(state.cycleDay) ? Math.round(state.cycleDay) : 1;
      state.cycleDay = initializeDay ? this.random(1, state.cycleDaysTotal) : Math.clamp(day, 1, state.cycleDaysTotal);
    }
    if (config.dangerousDay !== undefined) state.cycleDangerousDay = config.dangerousDay;
    if (config.fertileLeadDays !== undefined) state.fertileLeadDays = this.range(config.fertileLeadDays);
    if (config.pills !== undefined) state.pills = config.pills;
    if (config.analEnabled !== undefined) state.analEnabled = config.analEnabled;
    if (config.avoidance !== undefined) npc.pregnancyAvoidance = config.avoidance;
  }

  private validateCycle(npcName: string, config?: NPCPregnancyCycleConfig): void {
    if (!config) return;
    if (config === null || typeof config !== 'object' || Array.isArray(config)) throw new Error(`Invalid pregnancy cycle: ${npcName}`);
    if (config.days !== undefined) this.validateRange(npcName, 'days', config.days);
    if (config.fertileLeadDays !== undefined) this.validateRange(npcName, 'fertileLeadDays', config.fertileLeadDays);
    if (config.dangerousDay !== undefined && (!Number.isInteger(config.dangerousDay) || config.dangerousDay < 1)) {
      throw new Error(`Invalid pregnancy dangerous day: ${npcName}`);
    }
    if (config.dangerousDay !== undefined && config.days === undefined) throw new Error(`Pregnancy dangerous day requires cycle days: ${npcName}`);
    const shortest = Array.isArray(config.days) ? config.days[0] : config.days;
    if (config.dangerousDay !== undefined && shortest !== undefined && config.dangerousDay > shortest) {
      throw new Error(`Pregnancy dangerous day exceeds cycle length: ${npcName}`);
    }
    if (config.pills !== undefined && !['contraceptive', 'fertility', null].includes(config.pills)) throw new Error(`Invalid pregnancy pills: ${npcName}`);
    if (config.analEnabled !== undefined && typeof config.analEnabled !== 'boolean') throw new Error(`Invalid anal pregnancy setting: ${npcName}`);
    if (config.avoidance !== undefined && (!finite(config.avoidance) || config.avoidance < 0 || config.avoidance > 100)) {
      throw new Error(`Invalid pregnancy avoidance: ${npcName}`);
    }
  }

  private validateRange(npcName: string, field: string, value: NPCPregnancyRange): void {
    const values = Array.isArray(value) ? value : [value];
    if ((Array.isArray(value) && values.length !== 2) || values.some(entry => !Number.isInteger(entry) || entry < 1) || (values.length === 2 && values[0] > values[1])) {
      throw new Error(`Invalid pregnancy cycle ${field}: ${npcName}`);
    }
  }

  private cycleConfigured(npcName: string): boolean {
    return dol.variables.maplebirch?.npc?.[npcName.toLowerCase()]?.pregnancyCycleConfigured === true;
  }

  private markCycleConfigured(npcName: string): void {
    dol.variables.maplebirch ??= {};
    dol.variables.maplebirch.npc ??= {};
    const npc = (dol.variables.maplebirch.npc[npcName.toLowerCase()] ??= {});
    npc.pregnancyCycleConfigured = true;
  }

  private species(npcName: string, value: unknown): NPCPregnancySpecies {
    if (!isPregnancySpecies(value)) throw new Error(`Unsupported pregnancy species for ${npcName}: ${String(value)}`);
    return value;
  }

  private name(value: string): string {
    const name = value.trim();
    if (!name || ['__proto__', 'constructor', 'prototype', 'pc', 'cleared'].includes(name)) throw new Error(`Invalid pregnancy NPC: ${value}`);
    return name;
  }

  private npc(npcName: string): NPCData {
    const npc = (dol.variables.NPCName as NPCData[] | undefined)?.find(npc => npc.nam === npcName);
    if (!npc) throw new Error(`Unknown pregnancy NPC: ${npcName}`);
    return npc;
  }

  private requireRuntime(): void {
    if (!this.available) throw new Error('NPC pregnancy requires the original 0.5.12.13 pregnancy API');
  }

  private range(value: NPCPregnancyRange): number {
    return typeof value === 'number' ? value : this.random(value[0], value[1]);
  }

  private random(min: number, max: number): number {
    return min + Math.floor(this.manager.core.host.sugarcube.require().State.random() * (max - min + 1));
  }
}

export default NPCPregnancy;
