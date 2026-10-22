import '../support/runtime';
import { expect, test } from 'bun:test';
import Foodstuff, { foodstuffData, type FoodstuffConfig } from '../../src/modules/DoL/Patches/Foodstuff';

type Stock = { amount: number; knows_recipe?: boolean };

function withFoodstuff(run: (setup: { foodstuff: Record<string, FoodstuffConfig> }, variables: { foodstuff: Record<string, Stock> }) => void) {
  const globals = new Map(['V', 'setup'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const registered = { ...foodstuffData };
  const setup = { foodstuff: { apple: { name: 'apple', index: 0 } } as Record<string, FoodstuffConfig> };
  const variables = { foodstuff: { apple: { amount: 3 } } as Record<string, Stock> };
  for (const key of Object.keys(foodstuffData)) delete foodstuffData[key];
  Object.defineProperties(globalThis, { V: { value: variables, configurable: true }, setup: { value: setup, configurable: true } });
  try {
    run(setup, variables);
  } finally {
    for (const key of Object.keys(foodstuffData)) delete foodstuffData[key];
    Object.assign(foodstuffData, registered);
    for (const [name, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
}

test('registered recipes have safe collection defaults without changing the registration input', () => {
  withFoodstuff((setup, variables) => {
    const config = { name: 'berry jam', recipe: { difficulty: 1 } };
    Foodstuff.add('mod_jam', config);
    Foodstuff.apply();
    expect(setup.foodstuff.mod_jam.recipe).toEqual({ difficulty: 1, ingredients: [], tags: [] });
    expect(variables.foodstuff.mod_jam.amount).toBe(0);
    expect(config).toEqual({ name: 'berry jam', recipe: { difficulty: 1 } });
  });
});

test('partial recipe overrides retain native ingredients, timing, servings and alternatives', () => {
  withFoodstuff((setup, variables) => {
    setup.foodstuff.jam = {
      name: 'jam',
      index: 5,
      recipe: { difficulty: 2, cook_minutes: 20, servings: 3, ingredients: ['apple'], tags: ['sweet'], ingredient_alternatives: { normal: { apple: ['pear'] } } }
    };
    variables.foodstuff.jam = { amount: 7, knows_recipe: true };
    const saved = variables.foodstuff.jam;
    Foodstuff.add('jam', { recipe: { cook_minutes: 10 } });
    Foodstuff.apply();
    expect(setup.foodstuff.jam.recipe).toEqual({ difficulty: 2, cook_minutes: 10, servings: 3, ingredients: ['apple'], tags: ['sweet'], ingredient_alternatives: { normal: { apple: ['pear'] } } });
    Foodstuff.apply();
    expect(setup.foodstuff.jam.index).toBe(5);
    expect(variables.foodstuff.jam).toBe(saved);
    expect(saved).toEqual({ amount: 7, knows_recipe: true });
  });
});

test('state synchronization restores registered definitions before the native exam reads inventory', () => {
  withFoodstuff((setup, variables) => {
    const config = { name: 'berry jam', recipe: { difficulty: 1, ingredients: ['apple'] } };
    Foodstuff.add('mod_jam', config);
    variables.foodstuff.mod_jam = { amount: 7, knows_recipe: false };
    const saved = variables.foodstuff.mod_jam;
    for (let load = 0; load < 2; load++) {
      delete setup.foodstuff.mod_jam;
      Foodstuff.syncState();
      const examRecipes = Object.keys(variables.foodstuff).filter(key => setup.foodstuff[key].recipe?.ingredients!.length && setup.foodstuff[key].recipe!.difficulty === 1);
      expect(examRecipes).toEqual(['mod_jam']);
      expect(variables.foodstuff.mod_jam).toBe(saved);
      expect(saved).toEqual({ amount: 7, knows_recipe: false });
    }
    setup.foodstuff.mod_jam.recipe!.cook_minutes = 15;
    Foodstuff.syncState();
    expect(setup.foodstuff.mod_jam.recipe!.cook_minutes).toBe(15);
  });
});

test('plain ingredients stay recipe-free and unregistered inventory is preserved', () => {
  withFoodstuff((setup, variables) => {
    const orphan = { amount: 11, knows_recipe: true };
    variables.foodstuff.removed_mod_food = orphan;
    Foodstuff.add('mod_berry', { category: 'fruit' });
    Foodstuff.apply();
    expect(setup.foodstuff.mod_berry.recipe).toBeUndefined();
    expect(setup.foodstuff.removed_mod_food).toBeUndefined();
    expect(variables.foodstuff.removed_mod_food).toBe(orphan);
    expect(orphan).toEqual({ amount: 11, knows_recipe: true });
  });
});
