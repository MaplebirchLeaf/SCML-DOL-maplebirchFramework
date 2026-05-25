// .src/modules/Frameworks/OtherTools/Traits.ts

import maplebirch from '../../../core';

export interface TraitCategory {
  title: string;
  traits: Trait[];
}

interface Trait {
  name: string;
  colour: string;
  has: boolean;
  text: string;
}

export interface TraitConfig {
  title: string;
  name: string | (() => string);
  colour: string | (() => string);
  has: boolean | (() => boolean);
  text: string | (() => string);
}

interface ResolvedTrait {
  title: string;
  name: string;
  colour: string;
  has: boolean;
  text: string;
}

function value<T>(input: T | (() => T) | undefined, fallback: T): T {
  return typeof input === 'function' ? (input as () => T)() : (input ?? fallback);
}

export const traitsData: TraitConfig[] = [];

class Traits {
  static add(...traits: Partial<TraitConfig>[]): void {
    for (const trait of traits) {
      if (!trait?.title || !trait.name) continue;
      const title = maplebirch.auto(trait.title);
      const name = value(trait.name, '');
      if (!name) continue;
      const next: TraitConfig = {
        title: trait.title,
        name: trait.name,
        colour: trait.colour ?? '',
        has: trait.has ?? false,
        text: trait.text ?? ''
      };
      const index = traitsData.findIndex(item => {
        const itemTitle = maplebirch.auto(item.title);
        const itemName = value(item.name, '');
        return itemTitle === title && itemName === name;
      });
      if (index >= 0) {
        traitsData[index] = next;
      } else {
        traitsData.push(next);
      }
    }
  }

  static inject(data: TraitCategory[]): TraitCategory[] {
    const result = clone(data);
    const titleMap: Record<string, number> = {};
    result.forEach((category: TraitCategory, index: number) => {
      const title = maplebirch.auto(category.title);
      titleMap[title] = index;
      category.title = title;
      category.traits ??= [];
    });
    for (const rawTrait of traitsData) {
      const trait = Traits.resolve(rawTrait);
      const item = {
        name: trait.name,
        colour: trait.colour,
        has: trait.has,
        text: trait.text
      };
      if (Object.prototype.hasOwnProperty.call(titleMap, trait.title)) {
        result[titleMap[trait.title]].traits.push(item);
        continue;
      }
      result.push({
        title: trait.title,
        traits: [item]
      });
      titleMap[trait.title] = result.length - 1;
    }

    return (T.traitLists = result);
  }

  private static resolve(trait: TraitConfig): ResolvedTrait {
    return {
      title: maplebirch.auto(trait.title),
      name: value(trait.name, ''),
      colour: value(trait.colour, ''),
      has: value(trait.has, false),
      text: value(trait.text, '')
    };
  }
}

export default Traits;
