// .src/modules/Frameworks/Patches/Location.ts

import { isKey, isRecord } from './config';

export interface LocationConfigOptions {
  overwrite?: boolean;
  layer?: string;
  element?: string;
}

export interface LocationElement {
  condition?: () => boolean;
  image?: string;
  frame?: number | (() => number);
  animation?: { frameDelay?: number; cycleDelay?: number | (() => number) };
  [key: string]: unknown;
}

export interface LocationConfig extends LocationElement {
  folder?: string;
  base?: Record<string, LocationElement> | LocationElement;
  emissive?: Record<string, LocationElement> | LocationElement;
  reflective?: Record<string, LocationElement> | LocationElement;
  layerTop?: Record<string, LocationElement> | LocationElement;
  weather?: Record<string, unknown>;
  particles?: Record<string, unknown>[];
  customMapping?: () => string;
}

export interface LocationUpdate {
  overwrite: boolean;
  config: LocationConfig;
  customMapping: (() => string) | null;
}

export const locationData: Record<string, LocationUpdate> = Object.create(null);

import { clone, coverFn } from '../../../utils/object';

const mergeLocation = (key: string, _value: unknown, depth: number) => depth !== 1 || key !== 'customMapping';

class Location {
  public static configure(locationId: string, config: LocationConfig, options: LocationConfigOptions = {}): boolean {
    if (!isKey(locationId) || !isRecord(config)) return false;
    const { overwrite = false, layer, element } = options;
    if ((layer || element) && (!isKey(layer) || !isKey(element))) return false;
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
      const target = update.config[layer];
      const entries: Record<string, unknown> = isRecord(target) ? target : {};
      entries[element] = coverFn(isRecord(entries[element]) ? entries[element] : {}, null, clone(config));
      update.config[layer] = entries;
      return true;
    }
    update.config = coverFn(update.config, mergeLocation, clone(config));
    if (config.customMapping) update.customMapping = config.customMapping;
    return true;
  }

  public static apply(): void {
    setup.LocationImages ??= {};
    setup.Locations ??= {};
    for (const [locationId, update] of Object.entries(locationData)) {
      const current = setup.LocationImages[locationId] || {};
      if (update.overwrite || !setup.LocationImages[locationId]) {
        const { customMapping: _mapping, ...config } = clone(update.config);
        setup.LocationImages[locationId] = { folder: 'default', base: {}, ...config };
      } else {
        setup.LocationImages[locationId] = coverFn(current, mergeLocation, clone(update.config));
      }
      if (update.customMapping) setup.Locations[locationId] = clone(update.customMapping);
      delete locationData[locationId];
    }
  }
}

export default Location;
