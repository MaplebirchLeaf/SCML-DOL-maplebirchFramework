// .src/modules/Frameworks/OtherTools/Foodstuff.ts

import { clone } from '../../../utils';

type FoodstuffSeason = 'spring' | 'summer' | 'autumn' | 'winter';
type FoodstuffPlantingBed = 'earth' | 'water';
type FoodstuffStallSize = 'small' | 'large';

export interface FoodstuffConfig {
  key?: string;
  index?: number;
  name?: string;
  singular?: string;
  plural?: string;
  icon?: string;
  category?: string;
  kitchen_item_type_icon?: string;
  prop_folder?: string;
  ingredient_alternatives?: Record<string, string[]>;
  tending?: {
    planting_bed?: FoodstuffPlantingBed;
    growth_days?: number;
    yield_multiplier?: number;
    has_seeds?: boolean;
    seed_name?: string;
    seasons?: FoodstuffSeason[];
    affected_by_tending_skill?: boolean;
    tags?: string[];
    [key: string]: any;
  };
  shop?: {
    sell_price?: number;
    available_in?: string[];
    bought_in_bulk?: number;
    stall_size?: FoodstuffStallSize;
    [key: string]: any;
  };
  recipe?: {
    recipe_name?: string;
    difficulty?: number;
    cook_minutes?: number;
    servings?: number;
    ingredients?: string[];
    ingredient_alternatives?: Record<string, string[]>;
    tags?: string[];
    [key: string]: any;
  };
  food?: {
    handheld_gift?: boolean;
    tags?: string[];
    [key: string]: any;
  };
  [key: string]: any;
}

export const foodstuffData: Record<string, FoodstuffConfig> = {};

class Foodstuff {
  public static add(key: string, config: FoodstuffConfig): void {
    if (!key || !config) return;
    foodstuffData[key] = clone(config);
  }

  public static apply(): void {
    setup.foodstuff ??= {};
    for (const [key, config] of Object.entries(foodstuffData)) {
      Foodstuff.set(key, config);
      delete foodstuffData[key];
    }
    Foodstuff.sort();
  }

  private static set(key: string, config: FoodstuffConfig): void {
    const item = clone(config);
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
      shop: {
        sell_price: 0,
        ...item.shop
      },
      ...item
    };
    Foodstuff.ensureState(key);
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
    const sorted: Record<string, FoodstuffConfig> = {};
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
