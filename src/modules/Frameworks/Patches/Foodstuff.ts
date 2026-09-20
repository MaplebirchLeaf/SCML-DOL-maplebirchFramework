// .src/modules/Frameworks/Patches/Foodstuff.ts

import { isKey, isRecord } from './config';

type FoodstuffSeason = 'spring' | 'summer' | 'autumn' | 'winter';
type FoodstuffPlantingBed = 'earth' | 'water';
type FoodstuffStallSize = 'small' | 'large';

export interface FoodstuffConfig {
  key?: string;
  index?: number;
  is_fishing_bait?: boolean;
  name?: string;
  singular?: string;
  plural?: string;
  icon?: string;
  category?: string;
  kitchen_item_type_icon?: string;
  prop_folder?: string;
  ingredient_alternatives?: Partial<Record<'normal' | 'lewd', string[]>>;
  tending?: {
    planting_bed?: FoodstuffPlantingBed;
    growth_days?: number;
    featCost?: number;
    yield_multiplier?: number;
    has_seeds?: boolean;
    seed_name?: string;
    seasons?: FoodstuffSeason[];
    affected_by_tending_skill?: boolean;
    tags?: string[];
    [key: string]: unknown;
  };
  shop?: {
    sell_price?: number;
    available_in?: string[];
    bought_in_bulk?: number;
    stall_size?: FoodstuffStallSize;
    [key: string]: unknown;
  };
  recipe?: {
    recipe_name?: string;
    difficulty?: number;
    cook_minutes?: number;
    servings?: number;
    ingredients?: string[];
    ingredient_alternatives?: Partial<Record<'normal' | 'lewd', Record<string, string[]>>>;
    tags?: string[];
    [key: string]: unknown;
  };
  food?: {
    handheld_gift?: boolean;
    tags?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type FoodstuffItem = FoodstuffConfig & Required<Pick<FoodstuffConfig, 'index' | 'name' | 'singular' | 'plural' | 'icon' | 'category' | 'kitchen_item_type_icon' | 'prop_folder'>>;

export const foodstuffData: Record<string, FoodstuffConfig> = Object.create(null);

import { clone } from '../../../utils/object';

class Foodstuff {
  public static add(key: string, config: FoodstuffConfig): void {
    if (!isKey(key) || !isRecord(config)) return;
    foodstuffData[key] = clone(config);
  }

  public static apply(): void {
    if (typeof setup === 'undefined' || !isRecord(setup.foodstuff)) return;
    Foodstuff.applySetup();
    Foodstuff.syncState();
  }

  public static syncState(): void {
    if (typeof setup === 'undefined' || !isRecord(setup.foodstuff)) return;
    for (const key of Object.keys(foodstuffData)) Foodstuff.ensureState(key);
  }

  public static applySetup(): void {
    if (typeof setup === 'undefined' || !isRecord(setup.foodstuff) || Object.keys(foodstuffData).length === 0) return;
    for (const [key, config] of Object.entries(foodstuffData)) {
      Foodstuff.set(key, config);
    }
    Foodstuff.sort();
  }

  private static set(key: string, config: FoodstuffConfig): void {
    const current = setup.foodstuff[key];
    const item: FoodstuffConfig = { ...clone(current), ...clone(config) };
    const name = item.name ?? key.replace(/_/g, ' ');
    if (item.index === undefined) item.index = Foodstuff.nextIndex();
    setup.foodstuff[key] = {
      index: item.index,
      name,
      singular: item.singular ?? name,
      plural: item.plural ?? `${name}s`,
      icon: item.icon ?? `${key}.png`,
      category: item.category ?? 'ingredient',
      kitchen_item_type_icon: item.kitchen_item_type_icon ?? 'recipe-ingredient.png',
      prop_folder: item.prop_folder ?? 'ingredient',
      ...item,
      shop: { sell_price: 0, ...current?.shop, ...item.shop }
    };
  }

  private static nextIndex(): number {
    let maxIndex = -1;
    for (const item of Object.values(setup.foodstuff) as FoodstuffConfig[]) {
      const index = Number(item.index);
      if (Number.isFinite(index) && index > maxIndex) maxIndex = index;
    }
    return maxIndex + 1;
  }

  private static sort(): void {
    const sorted: Record<string, FoodstuffItem> = {};
    Object.keys(setup.foodstuff)
      .sort()
      .forEach(key => {
        sorted[key] = setup.foodstuff[key];
      });
    setup.foodstuff = sorted;
  }

  private static ensureState(key: string): void {
    if (typeof V === 'undefined') return;
    V.foodstuff ??= {};
    V.foodstuff[key] ??= { amount: 0 };
  }
}

export default Foodstuff;
