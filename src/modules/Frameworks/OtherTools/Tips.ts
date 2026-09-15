// ./src/modules/Frameworks/OtherTools/Tips.ts

export const tipsData: Record<string, string[]> = {};
const customCategories = new Set<string>();

class Tips {
  public static add(category: string, ...tips: string[]): void {
    if (typeof category !== 'string') return;
    const key = category.trim();
    if (!key) return;
    const target = (tipsData[key] ??= []);
    for (const tip of tips) if (typeof tip === 'string' && tip.trim() && !target.includes(tip)) target.push(tip);
  }

  public static apply(): void {
    if (!setup.tips || typeof setup.tips !== 'object' || Array.isArray(setup.tips)) setup.tips = {};
    for (const [category, tips] of Object.entries(tipsData)) {
      if (!Object.prototype.hasOwnProperty.call(setup.tips, category)) customCategories.add(category);
      const target = Array.isArray(setup.tips[category]) ? setup.tips[category] : (setup.tips[category] = []);
      for (const tip of tips) if (!target.includes(tip)) target.push(tip);
    }
  }

  public static inject(data: string[]): string[] {
    if (!Array.isArray(data)) return data;
    for (const category of customCategories) {
      const tips = tipsData[category] ?? [];
      for (const tip of tips) if (!data.includes(tip)) data.push(tip);
    }
    return data;
  }
}

export default Tips;
