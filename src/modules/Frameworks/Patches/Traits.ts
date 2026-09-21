// .src/modules/Frameworks/Patches/Traits.ts

import { clone } from '../../../utils/object';
import dol from '../../../host/Adapter';

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
  public static add(...traits: Partial<TraitConfig>[]): void {
    for (const trait of traits) {
      if (!trait?.title || !trait.name) continue;
      const next: TraitConfig = {
        title: trait.title,
        name: trait.name,
        colour: trait.colour ?? '',
        has: trait.has ?? false,
        text: trait.text ?? ''
      };
      const index = traitsData.findIndex(item => item.title === trait.title && item.name === trait.name);
      if (index >= 0) {
        traitsData[index] = next;
      } else {
        traitsData.push(next);
      }
    }
  }

  public static inject(data: TraitCategory[], translate: (text: string) => string): TraitCategory[] {
    const result: TraitCategory[] = clone(data);
    const titleMap = new Map<string, number>();
    result.forEach((category: TraitCategory, index: number) => {
      const title = translate(category.title);
      titleMap.set(title, index);
      category.title = title;
      category.traits ??= [];
    });
    for (const rawTrait of traitsData) {
      const trait = Traits.resolve(rawTrait, translate);
      if (!trait.name) continue;
      const item = {
        name: trait.name,
        colour: trait.colour,
        has: trait.has,
        text: trait.text
      };
      const categoryIndex = titleMap.get(trait.title);
      if (categoryIndex !== undefined) {
        const entries = result[categoryIndex].traits;
        const index = entries.findIndex(existing => existing.name === trait.name);
        if (index < 0) entries.push(item);
        else entries[index] = item;
        continue;
      }
      result.push({
        title: trait.title,
        traits: [item]
      });
      titleMap.set(trait.title, result.length - 1);
    }

    return (dol.temporary.traitLists = result);
  }

  private static resolve(trait: TraitConfig, translate: (text: string) => string): ResolvedTrait {
    return {
      title: translate(trait.title),
      name: value(trait.name, ''),
      colour: value(trait.colour, ''),
      has: value(trait.has, false),
      text: value(trait.text, '')
    };
  }
}

export default Traits;
