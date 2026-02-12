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
}

interface LocationUpdate {
  overwrite: boolean;
  config: LocationConfig;
  customMapping: any | null;
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

const otherTools = ((core) => {
  const _ = core.lodash;
  const traitsTitle: string[] = [];
  const traitsData: Array<{
    title: string;
    name: string;
    colour: string;
    has: boolean;
    text: string;
  }> = [];

  class Traits {
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

    static #titleMap(data: TraitCategory[]): Record<string, number> {
      const titleMap: Record<string, number> = {};
      const traitLists = clone(data);
      _.forEach(traitLists, (category: TraitCategory, index: number) => {
        const mappedTitle = Traits.categories[category.title] || category.title;
        titleMap[mappedTitle] = index;
        if (!_.includes(traitsTitle, mappedTitle)) traitsTitle.push(mappedTitle);
      });
      return titleMap;
    }

    static add(...traits: Partial<TraitConfig>[]): void {
      _.forEach(traits, trait => {
        if (trait && trait.title && trait.name) {
          const mappedTitle = Traits.categories[trait.title] || trait.title;
          const nameValue = _.isFunction(trait.name) ? trait.name() : trait.name as string;
          const existingIndex = _.findIndex(traitsData, t => t.title === mappedTitle && t.name === nameValue);
          if (existingIndex >= 0) {
            traitsData[existingIndex] = {
              title: mappedTitle,
              name: nameValue,
              colour: _.isFunction(trait.colour) ? trait.colour() : trait.colour || '',
              has   : _.isFunction(trait.has) ? trait.has() : trait.has || false,
              text  : _.isFunction(trait.text) ? trait.text() : trait.text || ''
            };
          } else {
            traitsData.push({
              title: mappedTitle,
              name: nameValue,
              colour: _.isFunction(trait.colour) ? trait.colour() : trait.colour || '',
              has   : _.isFunction(trait.has) ? trait.has() : trait.has || false,
              text  : _.isFunction(trait.text) ? trait.text() : trait.text || ''
            });
          }
        }
      });
    }

    static inject(data: TraitCategory[]): TraitCategory[] {
      const titleMap = Traits.#titleMap(data);
      const result = clone(data);
      _.forEach(traitsData, trait => {
        const title = trait.title;
        const colourValue = trait.colour;
        const hasValue = trait.has;
        const textValue = trait.text;
        if (_.has(titleMap, title)) {
          result[titleMap[title]].traits.push({
            name: trait.name,
            colour: colourValue,
            has: hasValue,
            text: textValue
          });
        } else {
          result.push({
            title: title,
            traits: [{
              name: trait.name,
              colour: colourValue,
              has: hasValue,
              text: textValue
            }]
          });
          titleMap[title] = result.length - 1;
          if (!_.includes(traitsTitle, title)) {
            traitsTitle.push(title);
          }
        }
      });
      return T.traitLists = result;
    }
  }

  const locationData: Record<string, LocationUpdate> = {};

  class Location {
    static configure(locationId: string, config: LocationConfig, options: LocationConfigOptions = {}): boolean {
      const { overwrite = false, layer, element } = options;
      if (!locationData[locationId]) locationData[locationId] = { overwrite: false, config: {}, customMapping: null };
      const update = locationData[locationId];
      if (overwrite) {
        update.overwrite = true;
        update.config = clone(config);
        update.customMapping = config.customMapping || null;
      } else if (layer && element) {
        if (!update.config[layer]) update.config[layer] = {};
        update.config[layer][element] = { ...(update.config[layer][element] || {}), ...config };
      } else {
        update.config = Location.#deepMerge(update.config, config);
        if (config.customMapping) update.customMapping = config.customMapping;
      }
      return true;
    }

    static apply(): void {
      _.forIn(locationData, (update, locationId) => {
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
          setup.LocationImages[locationId] = Location.#deepMerge(current, update.config);
        }
        if (update.customMapping) setup.Locations[locationId] = update.customMapping;
      });
      _.keys(locationData).forEach(key => delete locationData[key]);
    }

    static #deepMerge(target: any, source: any): any {
      const filterFn = (key: string, value: any, depth: number): boolean => {
        if (depth === 1) return key === 'folder' || _.includes(['base', 'emissive', 'reflective', 'layerTop'], key);
        return true;
      };
      return merge(target, source, { mode: 'merge', filterFn });
    }
  }

  const bodywritingData: Record<string, BodywritingData> = {};

  class Bodywriting {
    static add(key: string, config: BodywritingConfig): void {
      bodywritingData[key] = {
        operation: 'add',
        config: clone(config)
      };
    }

    static delete(key: string): void {
      bodywritingData[key] = { operation: 'del' };
    }

    static apply(): void {
      _.forIn(bodywritingData, (data, key) => {
        if (data.operation === 'del') {
          if (setup.bodywriting[key]) {
            const index = setup.bodywriting[key].index as number;
            delete setup.bodywriting[key];
            if (setup.bodywriting_namebyindex[index] === key) delete setup.bodywriting_namebyindex[index];
          }
        } else if (data.operation === 'add') {
          const config = data.config!;
          if (config.index === undefined) {
            let maxIndex = 0;
            for (const writingKey in setup.bodywriting) if (setup.bodywriting[writingKey].index! > maxIndex) maxIndex = setup.bodywriting[writingKey].index!;
            config.index = maxIndex + 1;
          }
          const defaultConfig: BodywritingConfig = {
            key: key,
            type: 'text',
            arrow: 0,
            special: 'none',
            gender: 'n',
            lewd: 0,
            degree: 0,
            featSkip: true
          };
          setup.bodywriting[key] = { ...defaultConfig, ...config };
          setup.bodywriting_namebyindex[config.index] = key;
        }
      });
      _.keys(bodywritingData).forEach(key => delete bodywritingData[key]);
    }
  }

  return {
    addTraits: Traits.add,
    configureLocation: Location.configure,
    addBodywriting: Bodywriting.add,
    injectTraits: Traits.inject,
    applyLocation: Location.apply,
    applyBodywriting: Bodywriting.apply,
  };
})(maplebirch);

export default otherTools;