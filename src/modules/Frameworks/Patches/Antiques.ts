// .src/modules/Frameworks/Patches/Antiques.ts

import { isKey, isRecord } from './config';
import dol from '../../../host/Adapter';

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
    Antiques.syncState();
    return data;
  }

  public static syncState(): void {
    if (!dol.has('variables') || !dol.variables.museumAntiques?.antiques) return;
    const museumAntiques = dol.variables.museumAntiques;
    for (const key of Object.keys(antiquesData)) museumAntiques.antiques[key] ??= 'notFound';
    museumAntiques.maxCount = Object.keys(museumAntiques.antiques).length;
  }
}

export default Antiques;
