import { clone } from '../../../utils/object';
import Foodstuff, { type FoodstuffConfig } from './Foodstuff';
import { isKey, isRecord } from './config';
import dol from '../../../host/Adapter';

export type FishingLocation = 'fishingBeach' | 'fishingPier' | 'fishingCoastPath' | 'fishingForestLake' | 'fishingMoor';
export type FishingSeason = 'spring' | 'summer' | 'autumn' | 'winter';
export type FishBehavior = 'runner' | 'darter' | 'panicked' | 'anchor' | 'thrasher' | 'slipper';

export interface FishConfig {
  minSize: number;
  maxSize: number;
  locations: Partial<Record<FishingLocation, number>>;
  icon: string;
  preferredSeason?: FishingSeason[];
  preferredLocation?: FishingLocation[];
  preferredBait?: string;
  cookable?: boolean;
  requiresBaitFish?: boolean;
  isBaitFish?: boolean;
  minigame?: { behavior: FishBehavior; maxStamina: number; armFatigueDifficulty: number };
  foodstuff?: FoodstuffConfig;
}

export type FishData = Omit<FishConfig, 'foodstuff'> & Required<Pick<FishConfig, 'preferredSeason' | 'preferredLocation' | 'cookable'>>;

export const fishData: Record<string, FishConfig> = Object.create(null);
export const fishingLocationData: Partial<Record<FishingLocation, Record<string, number>>> = {};
const locations: FishingLocation[] = ['fishingBeach', 'fishingPier', 'fishingCoastPath', 'fishingForestLake', 'fishingMoor'];
const seasons: FishingSeason[] = ['spring', 'summer', 'autumn', 'winter'];
const behaviors: FishBehavior[] = ['runner', 'darter', 'panicked', 'anchor', 'thrasher', 'slipper'];

export default class Fishing {
  public static addFish(key: string, config: FishConfig): boolean {
    if (!isKey(key) || !isRecord(config)) return false;
    if (!Number.isFinite(config.minSize) || config.minSize <= 0 || !Number.isFinite(config.maxSize) || config.maxSize < config.minSize) return false;
    if (typeof config.icon !== 'string' || !config.icon.trim() || !isRecord(config.locations)) return false;
    if (!Object.entries(config.locations).every(([location, weight]) => locations.includes(location as FishingLocation) && Number.isFinite(weight) && weight >= 0)) return false;
    if (!Object.values(config.locations).some(weight => weight > 0)) return false;
    if (config.preferredLocation !== undefined && (!Array.isArray(config.preferredLocation) || !config.preferredLocation.every(location => locations.includes(location)))) return false;
    if (config.preferredSeason !== undefined && (!Array.isArray(config.preferredSeason) || !config.preferredSeason.every(season => seasons.includes(season)))) return false;
    if (config.preferredBait !== undefined && !isKey(config.preferredBait)) return false;
    if ([config.cookable, config.requiresBaitFish, config.isBaitFish].some(flag => flag !== undefined && typeof flag !== 'boolean')) return false;
    if (config.foodstuff !== undefined && !isRecord(config.foodstuff)) return false;
    const game = config.minigame;
    if (game !== undefined && !isRecord(game)) return false;
    if (config.requiresBaitFish && !game) return false;
    if (game && (!behaviors.includes(game.behavior) || !Number.isFinite(game.maxStamina) || game.maxStamina <= 0 || !Number.isFinite(game.armFatigueDifficulty) || game.armFatigueDifficulty <= 0))
      return false;
    fishData[key] = clone(config);
    Foodstuff.add(key, {
      category: 'seafood',
      kitchen_item_type_icon: 'recipe-seafood.png',
      icon: config.icon.replace(/^fish\//, ''),
      ...config.foodstuff,
      ...(config.isBaitFish ? { is_fishing_bait: true } : {})
    });
    return true;
  }

  public static addBait(key: string, config: FoodstuffConfig): void {
    if (!isKey(key) || !isRecord(config)) return;
    Foodstuff.add(key, { ...config, is_fishing_bait: true });
  }

  public static configureLocation(location: FishingLocation, weights: Record<string, number>): boolean {
    if (!locations.includes(location) || !isRecord(weights)) return false;
    if (!Object.entries(weights).every(([key, weight]) => isKey(key) && Number.isFinite(weight) && weight >= 0)) return false;
    fishingLocationData[location] = { ...fishingLocationData[location], ...weights };
    return true;
  }

  public static apply(): void {
    if (!dol.has('setup')) return;
    const target = dol.setup.fishing?.lootTables?.fish;
    if (!isRecord(target)) return;
    for (const [key, config] of Object.entries(fishData)) {
      const { foodstuff: _foodstuff, ...fish } = clone(config) as FishConfig;
      target[key] = { preferredSeason: [], preferredLocation: [], preferredBait: 'bait_worm', cookable: false, ...fish };
    }
    for (const location of locations) {
      for (const [key, weight] of Object.entries(fishingLocationData[location] ?? {})) {
        if (!target[key]) throw new Error(`Unknown fish at ${location}: ${key}`);
        target[key].locations[location] = weight;
      }
    }
  }
}
