// .src/modules/Frameworks/OtherTools/Antiques.ts

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

export const antiquesData: Record<string, AntiqueConfig> = {};

class Antiques {
  public static add(key: string, config: AntiqueConfig): void {
    if (!key || !config) return;
    antiquesData[key] = config.clone();
  }

  public static inject(data: Record<string, AntiqueConfig>): Record<string, AntiqueConfig> {
    if (!data) return data;
    for (const [key, config] of Object.entries(antiquesData)) {
      data[key] = config.clone();
      Antiques.ensureState(key);
    }
    return data;
  }

  private static ensureState(key: string): void {
    const museumAntiques = V.museumAntiques;
    if (!museumAntiques.antiques) return;
    museumAntiques.antiques[key] ??= 'notFound';
    museumAntiques.maxCount = Object.keys(museumAntiques.antiques).length;
  }
}

export default Antiques;
