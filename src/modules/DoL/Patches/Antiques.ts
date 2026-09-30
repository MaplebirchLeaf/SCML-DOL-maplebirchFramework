// ./src/modules/DoL/Patches/Antiques.ts

import { isKey, isRecord } from './config';
import dol from '../../../host/DoL';

export interface AntiqueConfig {
  hint: string;
  museum: string;
  name: string;
  cn_name?: string;
  journal: string;
  journalName?: string;
  icon: string;
  key?: string;
}

export const antiquesData: Record<string, AntiqueConfig> = Object.create(null);

import { clone } from '../../../utils/object';

interface InactiveAntique {
  status: string;
  hint: boolean;
}

class Antiques {
  public static add(key: string, config: AntiqueConfig): void {
    if (!isKey(key) || !isRecord(config)) return;
    antiquesData[key] = clone(config);
  }

  public static inject(data: Record<string, AntiqueConfig>): Record<string, AntiqueConfig> {
    if (!isRecord(data)) return data;
    for (const [key, config] of Object.entries(antiquesData)) {
      data[key] = clone(config);
    }
    Antiques.syncState(data);
    return data;
  }

  public static syncState(data?: Record<string, AntiqueConfig>): void {
    if (!dol.has('variables')) return;
    const variables = dol.variables;
    const museumAntiques = variables.museumAntiques;
    if (!museumAntiques?.antiques) return;
    if (data) {
      const state = (variables.maplebirch ??= {});
      const inactive: Record<string, InactiveAntique> = (state.inactiveAntiques ??= {});
      const hints: string[] = variables.museumAntiqueJournalHints ?? [];
      let donated = 0;
      for (const key of new Set([...Object.keys(museumAntiques.antiques), ...hints])) {
        if (Object.hasOwn(data, key) || !isKey(key)) continue;
        const status = museumAntiques.antiques[key] ?? 'notFound';
        inactive[key] = { status, hint: hints.includes(key) || variables.winterHint === key };
        if (['museum', 'stolen', 'recovered'].includes(status)) donated--;
        delete museumAntiques.antiques[key];
      }
      for (const [key, saved] of Object.entries(inactive)) {
        if (!Object.hasOwn(data, key)) continue;
        const current = museumAntiques.antiques[key];
        if (current === undefined || current === 'notFound') {
          museumAntiques.antiques[key] = saved.status;
          if (['museum', 'stolen', 'recovered'].includes(saved.status)) donated++;
        }
        if (saved.hint && !hints.includes(key)) hints.push(key);
        delete inactive[key];
      }
      if (variables.museumAntiqueJournalHints || hints.length) variables.museumAntiqueJournalHints = hints.filter(key => Object.hasOwn(data, key));
      if (variables.winterHint !== 'notGiven' && !Object.hasOwn(data, variables.winterHint)) variables.winterHint = 'notGiven';
      if (donated) museumAntiques.museumCount = Math.max(0, (Number(museumAntiques.museumCount) || 0) + donated);
      if (!Object.keys(inactive).length) delete state.inactiveAntiques;
    }
    for (const key of Object.keys(antiquesData)) museumAntiques.antiques[key] ??= 'notFound';
    museumAntiques.maxCount = Object.keys(museumAntiques.antiques).length;
  }
}

export default Antiques;
