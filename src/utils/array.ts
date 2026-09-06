// ./src/utils/array.ts

import _ from './shared';

export type ContainsMode = 'all' | 'any' | 'none';

export type ContainsOptions = {
  case?: boolean;
  compare?: (item: unknown, value: unknown) => boolean;
  deep?: boolean;
};

export function contains(array: readonly unknown[], value: unknown, mode: ContainsMode = 'all', options: ContainsOptions = {}): boolean {
  const { case: caseSensitive = true, compare, deep = false } = options;

  const match = (item: unknown, target: unknown): boolean => {
    if (compare) return compare(item, target);

    if (deep) return _.isEqual(item, target);

    if (!caseSensitive && typeof target === 'string' && typeof item === 'string') return item.toLowerCase() === target.toLowerCase();

    if (Number.isNaN(target)) return Number.isNaN(item);

    return item === target;
  };

  const values: unknown[] = Array.isArray(value) ? value : [value];

  switch (mode) {
    case 'all':
      return _.every(values, (targetValue: unknown) => _.some(array, (item: unknown) => match(item, targetValue)));

    case 'any':
      return _.some(values, (targetValue: unknown) => _.some(array, (item: unknown) => match(item, targetValue)));

    case 'none':
      return _.every(values, (targetValue: unknown) => !_.some(array, (item: unknown) => match(item, targetValue)));

    default:
      throw new Error(`Invalid mode: '${mode}'. Expected 'all', 'any' or 'none'.`);
  }
}

export function randomNumber(min?: number, max?: number, float = false): number {
  if (min == null && max == null) return _.random(0, 1, true);

  if (max == null) return _.random(0, min, false);

  return _.random(min, max, float);
}

export function randomPick<T>(items: readonly T[], weights: readonly number[] | null = null, allowNull = false): T | null | undefined {
  if (items.length === 0) return undefined;

  if (weights) {
    if (weights.length !== items.length) throw new Error(`weights length (${weights.length}) must match items length (${items.length})`);

    if (weights.some((weight: number) => weight < 0)) throw new Error('weights cannot contain negative values');

    const total = _.sum(weights);

    if (total <= 0) return undefined;

    const random = _.random(0, 1, true);

    let cumulative = 0;

    for (let index = 0; index < weights.length; index++) {
      cumulative += weights[index] / total;

      if (random <= cumulative) return items[index];
    }

    return items[items.length - 1];
  }

  if (allowNull && _.random(0, 1, true) < 1 / (items.length + 1)) return null;

  return _.sample(items);
}

export function clamp(value: any, min: number, max: number, fallback?: number): number {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const number = Number(value);
  return Math.min(Math.max(Number.isFinite(number) ? number : (fallback ?? low), low), high);
}
