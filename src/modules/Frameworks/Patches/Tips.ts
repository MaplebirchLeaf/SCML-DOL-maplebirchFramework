// ./src/modules/Frameworks/Patches/Tips.ts

import { isKey, isRecord } from './config';

export const tipsData: Record<string, string[]> = Object.create(null);
const customCategories = new Set<string>();

class Tips {
  public static add(category: string, ...tips: string[]): void {
    if (typeof category !== 'string') return;
    const key = category.trim();
    if (!isKey(key)) return;
    const target = (tipsData[key] ??= []);
    for (const tip of tips) if (typeof tip === 'string' && tip.trim() && !target.includes(tip)) target.push(tip);
  }

  public static apply(): void {
    if (typeof setup === 'undefined' || !isRecord(setup.tips)) return;
    for (const [category, tips] of Object.entries(tipsData)) {
      if (!isKey(category)) continue;
      if (!Object.prototype.hasOwnProperty.call(setup.tips, category)) customCategories.add(category);
      const target = Array.isArray(setup.tips[category]) ? setup.tips[category] : (setup.tips[category] = []);
      for (const tip of tips) if (!target.includes(tip)) target.push(tip);
    }
  }

  public static inject(data: string[]): string[] {
    if (!Array.isArray(data)) return data;
    const existing = new Set(data);
    for (const category of customCategories) {
      const tips = tipsData[category] ?? [];
      for (const tip of tips) {
        if (!existing.has(tip)) {
          data.push(tip);
          existing.add(tip);
        }
      }
    }
    return data;
  }
}

export default Tips;
