// .src/modules/Frameworks/otherTools.ts

import maplebirch from '../../core';
import { clone, merge } from '../../utils';

interface TraitCategory {
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

interface LocationConfigOptions {
  overwrite?: boolean;
  layer?: string;
  element?: string;
}

interface LocationConfig {
  condition?: (...object: any[]) => boolean;
  folder?: string;
  base?: Record<string, any>;
  emissive?: Record<string, any>;
  reflective?: Record<string, any>;
  layerTop?: Record<string, any>;
  customMapping?: any;
  [key: string]: any;
}

interface LocationUpdate {
  overwrite: boolean;
  config: LocationConfig;
  customMapping: any;
}

interface BodywritingConfig {
  writing?: string;
  writ_cn?: string;
  type?: 'text' | 'object';
  arrow?: 0 | 1;
  special?: string;
  gender?: 'n' | 'f' | 'm' | 'h';
  lewd?: 0 | 1;
  degree?: number;
  featSkip?: boolean;
  sprites?: string[];
  index?: number;
  key?: string;
}

interface BodywritingData {
  operation: 'add' | 'del';
  config?: BodywritingConfig;
}

const otherTools = (core => {
  const traitsData: TraitConfig[] = [];
  const locationData: Record<string, LocationUpdate> = {};
  const bodywritingData: Record<string, BodywritingData> = {};

  function value<T>(input: T | (() => T) | undefined, fallback: T): T {
    return typeof input === 'function' ? (input as () => T)() : (input ?? fallback);
  }

  class Traits {
    // prettier-ignore
    static categories: Record<string, string> = {
      'General Traits'   : '一般特质',
      'Medicinal Traits' : '医疗特质',
      'Special Traits'   : '特殊特质',
      'School Traits'    : '学校特质',
      'Trauma Traits'    : '创伤特质',
      'NPC Traits'       : 'NPC特质',
      'Hypnosis Traits'  : '催眠特质',
      'Acceptance Traits': '接纳特质'
    };

    static add(...traits: Partial<TraitConfig>[]): void {
      for (const trait of traits) {
        if (!trait?.title || !trait.name) continue;
        const title = Traits.categories[trait.title] || trait.title;
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
          const itemTitle = Traits.categories[item.title] || item.title;
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
        const title = Traits.categories[category.title] || category.title;
        titleMap[title] = index;
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
        title: Traits.categories[trait.title] || trait.title,
        name: value(trait.name, ''),
        colour: value(trait.colour, ''),
        has: value(trait.has, false),
        text: value(trait.text, '')
      };
    }
  }

  class Location {
    static configure(locationId: string, config: LocationConfig, options: LocationConfigOptions = {}): boolean {
      if (!locationId || !config) return false;
      const { overwrite = false, layer, element } = options;
      locationData[locationId] ??= {
        overwrite: false,
        config: {},
        customMapping: null
      };
      const update = locationData[locationId];
      if (overwrite) {
        update.overwrite = true;
        update.config = clone(config);
        update.customMapping = config.customMapping || null;
        return true;
      }
      if (layer && element) {
        update.config[layer] ??= {};
        update.config[layer][element] = merge({}, update.config[layer][element] || {}, config, { mode: 'merge' });
        return true;
      }
      update.config = Location.merge(update.config, config);
      if (config.customMapping) update.customMapping = config.customMapping;
      return true;
    }

    static apply(): void {
      setup.LocationImages ??= {};
      setup.Locations ??= {};
      for (const [locationId, update] of Object.entries(locationData)) {
        const current = setup.LocationImages[locationId] || {};
        if (update.overwrite || !setup.LocationImages[locationId]) {
          setup.LocationImages[locationId] = {
            folder: update.config.folder || current.folder || 'default',
            base: update.config.base || current.base || {},
            emissive: update.config.emissive || current.emissive,
            reflective: update.config.reflective || current.reflective,
            layerTop: update.config.layerTop || current.layerTop
          };
        } else {
          setup.LocationImages[locationId] = Location.merge(current, update.config);
        }
        if (update.customMapping) setup.Locations[locationId] = update.customMapping;
        delete locationData[locationId];
      }
    }

    private static merge(target: any, source: any): any {
      return merge(target, source, {
        mode: 'merge',
        filterFn: (key: string, _value: any, depth: number) => depth !== 1 || key === 'folder' || key === 'base' || key === 'emissive' || key === 'reflective' || key === 'layerTop'
      });
    }
  }

  class Bodywriting {
    static add(key: string, config: BodywritingConfig): void {
      if (!key || !config) return;
      bodywritingData[key] = {
        operation: 'add',
        config: clone(config)
      };
    }

    static delete(key: string): void {
      if (!key) return;
      bodywritingData[key] = {
        operation: 'del'
      };
    }

    static apply(): void {
      setup.bodywriting ??= {};
      setup.bodywriting_namebyindex ??= {};
      for (const [key, data] of Object.entries(bodywritingData)) {
        if (data.operation === 'del') {
          Bodywriting.remove(key);
        } else if (data.config) {
          Bodywriting.set(key, data.config);
        }
        delete bodywritingData[key];
      }
    }

    private static remove(key: string): void {
      const item = setup.bodywriting[key];
      if (!item) return;
      const index = item.index;
      delete setup.bodywriting[key];
      if (setup.bodywriting_namebyindex[index] === key) delete setup.bodywriting_namebyindex[index];
    }

    private static set(key: string, config: BodywritingConfig): void {
      if (config.index === undefined) {
        let maxIndex = 0;
        for (const item of Object.values(setup.bodywriting) as BodywritingConfig[]) {
          const index = Number(item.index);
          if (Number.isFinite(index) && index > maxIndex) maxIndex = index;
        }
        config.index = maxIndex + 1;
      }
      setup.bodywriting[key] = {
        key,
        type: 'text',
        arrow: 0,
        special: 'none',
        gender: 'n',
        lewd: 0,
        degree: 0,
        featSkip: true,
        ...config
      };
      setup.bodywriting_namebyindex[config.index] = key;
    }
  }

  // prettier-ignore
  return {
    traitsData,
    locationData,
    bodywritingData,
    addTraits        : Traits.add.bind(Traits),
    injectTraits     : Traits.inject.bind(Traits),
    configureLocation: Location.configure.bind(Location),
    applyLocation    : Location.apply.bind(Location),
    addBodywriting   : Bodywriting.add.bind(Bodywriting),
    applyBodywriting : Bodywriting.apply.bind(Bodywriting)
  };
})(maplebirch);

export default otherTools;
