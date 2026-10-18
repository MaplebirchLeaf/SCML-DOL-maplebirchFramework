import '../support/runtime';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import Location, { locationData, type LocationConfig } from '../../src/modules/DoL/Patches/Location';

const originalSetup = Object.getOwnPropertyDescriptor(globalThis, 'setup');
let images: Record<string, LocationConfig>;
let mappings: Record<string, () => string>;

beforeEach(() => {
  images = {};
  mappings = {};
  Object.defineProperty(globalThis, 'setup', { value: { LocationImages: images, Locations: mappings }, configurable: true });
  for (const key of Object.keys(locationData)) delete locationData[key];
});

afterEach(() => {
  for (const key of Object.keys(locationData)) delete locationData[key];
  if (originalSetup) Object.defineProperty(globalThis, 'setup', originalSetup);
  else Reflect.deleteProperty(globalThis, 'setup');
});

// These are the direct boundary reads made by vanilla fog, rain and snow effects.
function effectBounds(config: LocationConfig): number[] {
  const weather = config.weather as { groundBounds: { fog: { top: number; bottom: number }; splashes: { top: number; bottom: number } } };
  return [
    weather.groundBounds.fog.top,
    weather.groundBounds.fog.bottom - 1,
    weather.groundBounds.splashes.top,
    weather.groundBounds.splashes.bottom - 1,
    weather.groundBounds.splashes.top,
    weather.groundBounds.splashes.bottom
  ];
}

test('new locations have safe weather and readable fog, rain and snow boundaries', () => {
  Location.configure('shrine', { folder: 'shrine', base: { image: 'base.png' } });
  Location.apply();

  expect(images.shrine.weather).toEqual({
    rainSplashEnabled: false,
    fogEnabled: false,
    fogDistributionCurve: 1,
    groundBounds: { splashes: { top: 0, bottom: 0 }, fog: { top: 0, bottom: 0 } }
  });
  expect(effectBounds(images.shrine)).toEqual([0, -1, 0, -1, 0, 0]);
  expect(images.shrine.base).toEqual({ image: 'base.png' });
});

test('overwriting a location replaces old art and weather before supplying defaults', () => {
  images.shophouse = { folder: 'old', base: { image: 'old.png' }, emissive: { image: 'old-light.png' }, weather: { fogEnabled: true, fogDistributionCurve: 8 } };
  Location.configure('shophouse', { folder: 'new', base: { image: 'new.png' }, weather: { rainSplashEnabled: true } }, { overwrite: true });
  Location.apply();

  expect(images.shophouse.folder).toBe('new');
  expect(images.shophouse.base).toEqual({ image: 'new.png' });
  expect(images.shophouse.emissive).toBeUndefined();
  expect(images.shophouse.weather).toMatchObject({ rainSplashEnabled: true, fogEnabled: false, fogDistributionCurve: 1 });
  expect(effectBounds(images.shophouse)).toEqual([0, -1, 0, -1, 0, 0]);
});

test('partial weather bounds retain explicit zeroes, flags, curves and extension fields', () => {
  Location.configure('courtyard', {
    weather: { fogEnabled: true, rainSplashEnabled: false, fogDistributionCurve: 0, fogOpacity: 0.4, groundBounds: { fog: { top: 19 }, splashes: { bottom: 0 } } }
  });
  Location.apply();

  expect(images.courtyard.weather).toEqual({
    fogEnabled: true,
    rainSplashEnabled: false,
    fogDistributionCurve: 0,
    fogOpacity: 0.4,
    groundBounds: { fog: { top: 19, bottom: 0 }, splashes: { top: 0, bottom: 0 } }
  });
  expect(effectBounds(images.courtyard)).toEqual([19, -1, 0, -1, 0, 0]);
});

test('ordinary partial updates preserve an existing location and its weather semantics', () => {
  const condition = () => true;
  const existing = { folder: 'forest', base: { default: { image: 'base.png' }, snow: { image: 'snow.png' } }, weather: { fogEnabled: true, fogDistributionCurve: 3 } };
  images.forest = existing;
  Location.configure('forest', { condition }, { layer: 'base', element: 'default' });
  Location.configure('forest', { weather: { fogOpacity: 0.6 } });
  Location.apply();

  expect(images.forest).toBe(existing);
  expect(images.forest.base).toEqual({ default: { image: 'base.png', condition }, snow: { image: 'snow.png' } });
  expect(images.forest.weather).toEqual({ fogEnabled: true, fogDistributionCurve: 3, fogOpacity: 0.6 });
});

test('mapping-only locations retain their mapping and safe fallback weather', () => {
  const mapping = () => 'courtyard';
  Location.configure('courtyard', { folder: 'shrine', weather: { fogEnabled: true, groundBounds: { fog: { top: 17, bottom: 2 }, splashes: { top: 5, bottom: 1 } } } });
  Location.configure('bedroom', { customMapping: mapping });
  Location.apply();

  expect(mappings.bedroom).toBe(mapping);
  expect(images.bedroom.customMapping).toBeUndefined();
  expect(effectBounds(images.bedroom)).toEqual([0, -1, 0, -1, 0, 0]);
  expect(effectBounds(images[mappings.bedroom()])).toEqual([17, 1, 5, 0, 5, 1]);
});

test('default and supplied weather objects are isolated between locations and callers', () => {
  const supplied = { groundBounds: { fog: { top: 12 } } };
  Location.configure('first', {});
  Location.configure('second', {});
  Location.configure('third', { weather: supplied });
  supplied.groundBounds.fog.top = 100;
  Location.apply();

  expect(images.first.weather).not.toBe(images.second.weather);
  expect(images.first.weather!.groundBounds).not.toBe(images.second.weather!.groundBounds);
  expect(images.third.weather).not.toBe(supplied);
  expect(effectBounds(images.third)[0]).toBe(12);
  const first = images.first.weather!.groundBounds as { fog: { top: number } };
  first.fog.top = 7;
  expect(effectBounds(images.second)[0]).toBe(0);
  expect(effectBounds(images.third)[0]).toBe(12);
});

test('undefined optional values keep defaults when creating a location', () => {
  Location.configure('empty', { folder: undefined, weather: undefined });
  Location.configure('partial', { weather: { fogEnabled: undefined, groundBounds: { fog: { top: undefined } } } });
  Location.apply();

  expect(images.empty.folder).toBe('default');
  expect(effectBounds(images.empty)).toEqual([0, -1, 0, -1, 0, 0]);
  expect(images.partial.weather!.fogEnabled).toBe(false);
  expect(effectBounds(images.partial)).toEqual([0, -1, 0, -1, 0, 0]);
});
