// .src/modules/Frameworks/OtherTools/Location.ts

export interface LocationConfigOptions {
  overwrite?: boolean;
  layer?: string;
  element?: string;
}

export interface LocationConfig {
  condition?: (...object: any[]) => boolean;
  folder?: string;
  base?: Record<string, any>;
  emissive?: Record<string, any>;
  reflective?: Record<string, any>;
  layerTop?: Record<string, any>;
  customMapping?: any;
  [key: string]: any;
}

export interface LocationUpdate {
  overwrite: boolean;
  config: LocationConfig;
  customMapping: any;
}

export const locationData: Record<string, LocationUpdate> = {};

const mergeLocationLayer = (key: string, _value: any, depth: number) => depth !== 1 || key === 'folder' || key === 'base' || key === 'emissive' || key === 'reflective' || key === 'layerTop';

class Location {
  public static configure(locationId: string, config: LocationConfig, options: LocationConfigOptions = {}): boolean {
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
      update.config = config.clone();
      update.customMapping = config.customMapping || null;
      return true;
    }
    if (layer && element) {
      update.config[layer] ??= {};
      update.config[layer][element] = Object.merge(update.config[layer][element] || {}, config);
      return true;
    }
    update.config.mergefn(mergeLocationLayer, config);
    if (config.customMapping) update.customMapping = config.customMapping;
    return true;
  }

  public static apply(): void {
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
        setup.LocationImages[locationId] = current.mergefn(mergeLocationLayer, update.config);
      }
      if (update.customMapping) setup.Locations[locationId] = update.customMapping;
      delete locationData[locationId];
    }
  }
}

export default Location;
