import dol from '../../../host/DoL';
import { clone } from '../../../utils/object';
import { isKey, isRecord } from './config';

type FeatBoostText = string | (() => string);
type FeatBoostField = 'name' | 'missing' | 'text' | 'upgrade';

export interface FeatBoostConfig {
  name: FeatBoostText;
  required?: string[];
  cost: number;
  max?: number;
  maxMultiplier?: number;
  exclusive?: string;
  missing?: FeatBoostText;
  text?: FeatBoostText;
  upgrade?: FeatBoostText;
  effect?: string;
}

export const featBoostsData: Record<string, FeatBoostConfig> = Object.create(null);

class FeatBoosts {
  public static add(key: string, config: FeatBoostConfig): boolean {
    const text = (value: unknown) => value === undefined || typeof value === 'string' || typeof value === 'function';
    if (
      !isKey(key) ||
      !isRecord(config) ||
      !config.name ||
      !text(config.name) ||
      !Number.isSafeInteger(config.cost) ||
      config.cost < 0 ||
      (config.max !== undefined && (!Number.isSafeInteger(config.max) || config.max < 0)) ||
      (config.maxMultiplier !== undefined && (!Number.isSafeInteger(config.maxMultiplier) || config.maxMultiplier <= 0)) ||
      (config.required !== undefined && (!Array.isArray(config.required) || !config.required.every(isKey))) ||
      (config.exclusive !== undefined && !isKey(config.exclusive)) ||
      !text(config.missing) ||
      !text(config.text) ||
      !text(config.upgrade) ||
      (config.effect !== undefined && typeof config.effect !== 'string')
    )
      return false;
    featBoostsData[key] = clone(config);
    return true;
  }

  public static has(key: string): boolean {
    return Object.hasOwn(featBoostsData, key);
  }

  public static text(key: string, field: FeatBoostField, translate: (text: string) => string): string {
    const value = featBoostsData[key]?.[field];
    return translate(typeof value === 'function' ? value() : (value ?? ''));
  }

  public static setup(translate: (text: string) => string): void {
    const boosts = dol.variables.featsBoosts;
    if (!boosts?.upgradeDetails) return;
    const earnedFeats = Object.keys(dol.variables.feats.allSaves);
    for (const [key, config] of Object.entries(featBoostsData)) {
      if (Object.hasOwn(boosts.upgradeDetails, key)) continue;
      const required = config.required ?? [];
      const maxEarned = !required.length ? 1 : required.filter(feat => earnedFeats.includes(feat)).length;
      const max = !maxEarned ? 0 : (config.max ?? ((config.maxMultiplier ?? 0) * maxEarned || maxEarned));
      boosts.upgrades[key] = 0;
      boosts.upgradeDetails[key] = { cost: config.cost, max, purchased: 0, ...(config.exclusive ? { exclusive: config.exclusive } : {}) };
      boosts.missing[key] = FeatBoosts.text(key, 'missing', translate);
      boosts.name[key] = max > 0 ? FeatBoosts.text(key, 'name', translate) : '?????';
    }
  }

  public static refresh(key: string, translate: (text: string) => string): void {
    const boosts = dol.variables.featsBoosts;
    const details = boosts?.upgradeDetails?.[key];
    if (!FeatBoosts.has(key) || !details) return;
    boosts.name[key] = details.max > 0 ? FeatBoosts.text(key, 'name', translate) : '?????';
    boosts.missing[key] = FeatBoosts.text(key, 'missing', translate);
  }

  public static apply(effect: (source: string) => void): void {
    const boosts = dol.variables.featsBoosts;
    if (!boosts?.upgradeDetails) return;
    for (const [key, config] of Object.entries(featBoostsData)) {
      const details = boosts.upgradeDetails[key];
      if (
        !config.effect ||
        !details ||
        details.purchased <= 0 ||
        details.purchased > details.max ||
        boosts.upgrades[key] !== details.purchased * details.cost ||
        (config.required?.length && !config.required.some(feat => Object.hasOwn(dol.variables.feats.allSaves, feat)))
      )
        continue;
      effect(config.effect);
    }
  }
}

export default FeatBoosts;
