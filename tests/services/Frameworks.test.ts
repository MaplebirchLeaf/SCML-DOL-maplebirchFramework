import './runtime';
import { expect, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';
import OptionEvents from '../../src/modules/Frameworks/OptionEvents';
import TextStore from '../../src/modules/Frameworks/TextStore';
import { zonesManager } from '../../src/modules/Frameworks/ZonesManager';
import Dynamic from '../../src/modules/Dynamic';
import { StateManager } from '../../src/modules/State';
import NPCSidebarWardrobe from '../../src/modules/NamedNPCAddon/NPCClothes/NPCSidebarWardrobe';
import type NPCManager from '../../src/modules/NamedNPC';
import prototypeUtils from '../../src/compat/Prototype';

test('text stores keep insertion order and ignore duplicate values', () => {
  const store = new TextStore();
  store.push('first', 'first', 0, false, null, undefined);
  expect(store.play).toBe('first0false');
});

test('state events work without DoL time and weather managers', () => {
  const actions: string[] = [];
  const manager = {
    log() {},
    core: { host: { sugarcube: { passage: { title: 'Home' } } } }
  } as unknown as Dynamic;
  const state = new StateManager(manager);
  expect(state.register('gate', 'home', { output: 'homeWidget', extra: { passage: ['Home'] }, action: () => actions.push('home') })).toBe(true);
  expect(state.register('gate', 'other', { output: 'otherWidget', extra: { passage: ['Other'] } })).toBe(true);
  expect(state.trigger('gate')).toBe('<<homeWidget>>');
  expect(actions).toEqual(['home']);
});

test('dynamic registers independent capabilities and initializes each through Lifecycle', () => {
  const calls: string[] = [];
  const core = { host: { modLoader: undefined }, infra: { diagnostics: { scoped: () => () => {} } } } as unknown as MaplebirchCore;
  const dynamic = new Dynamic(core);
  expect(dynamic.add('first', { Init: () => void calls.push('first') })).toBe(true);
  expect(dynamic.add('second', { Init: () => void calls.push('second') })).toBe(true);
  expect(dynamic.add('first', { Init: () => void calls.push('duplicate') })).toBe(false);
  dynamic.Init();
  expect(calls).toEqual(['first', 'second']);
});

test('zones start without DoL replacement data', () => {
  const core = { infra: { diagnostics: { scoped: () => () => {} } }, host: { sugarcube: { passage: { title: 'Home' } } } } as unknown as MaplebirchCore;
  const zone = new zonesManager(core);
  expect(zone.locationPassage).toEqual({});
  expect(zone.widgetPassage).toEqual({});
  zone.addTo('Header', 'hello');
  expect(zone.play('Header')).toBe('<<hello>>');
});

test('zone accepts passage patch registrations', () => {
  prototypeUtils();
  const core = { infra: { diagnostics: { scoped: () => () => {} } }, host: { sugarcube: { passage: { title: 'Home' } } } } as unknown as MaplebirchCore;
  const zone = new zonesManager(core);
  zone.inject({ locationPassage: { Home: [{ src: 'old', to: 'new' }] } });
  expect(zone.locationPassage.Home).toHaveLength(1);
});

test('wardrobe applies typed clothing and filters put by slot', () => {
  const wardrobe = new NPCSidebarWardrobe({ log() {} } as unknown as NPCManager);
  wardrobe.set('uniform', { upper: { name: 'shirt' }, lower: { name: 'skirt' } });
  const clothes = { upper: { name: 'old' }, lower: { name: 'old' } };
  wardrobe.put(clothes, 'uniform', 'upper');
  expect(clothes).toEqual({ upper: { name: 'shirt' }, lower: { name: 'old' } });
  const item = { name: 'new' };
  wardrobe.apply(clothes, 'lower', item);
  item.name = 'changed';
  expect(clothes.lower.name).toBe('new');
});

test('wardrobe reuses named conditions across location, passage, overnight hours and story state', () => {
  const originalV = Object.getOwnPropertyDescriptor(globalThis, 'V');
  const variables = { location: 'library', time: { hour: 22 } };
  Object.defineProperty(globalThis, 'V', { value: variables, configurable: true });
  try {
    const core = { host: { sugarcube: { passage: { title: 'Study' } } }, npc: { log() {} } } as unknown as MaplebirchCore;
    const wardrobe = new NPCSidebarWardrobe({ core, log() {} } as unknown as NPCManager);
    const state = { allowed: true };
    const condition = wardrobe.when('night-study', { location: ['library', 'school'], passage: 'Study', hours: [21, 5] }, () => state.allowed);
    expect(wardrobe.when('night-study')).toBe(condition);
    expect(condition()).toBe(true);
    variables.time.hour = 12;
    expect(condition()).toBe(false);
    variables.time.hour = 2;
    state.allowed = false;
    expect(condition()).toBe(false);
    state.allowed = true;
    variables.location = 'home';
    expect(condition()).toBe(false);
    expect(() => wardrobe.when('missing')).toThrow();
    expect(() => wardrobe.when('night-study', {})).toThrow();
    expect(() => wardrobe.when('invalid-hours', { hours: [-1, 24] })).toThrow();
  } finally {
    if (originalV) Object.defineProperty(globalThis, 'V', originalV);
    else Reflect.deleteProperty(globalThis, 'V');
  }
});

test('option events install once and wait until module pre-initialization completes', () => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalJQuery = Object.getOwnPropertyDescriptor(globalThis, '$');
  const handlers = new Map<string, () => void>();
  const wiki: string[] = [];
  const phase = { preInitCompleted: false };
  const core = { services: { modules: { initPhase: phase } }, infra: { diagnostics: { write() {} } } } as unknown as MaplebirchCore;
  const jquery = Object.assign(
    () => ({
      on(_event: string, selector: string, handler: () => void) {
        handlers.set(selector, handler);
      }
    }),
    { wiki: (text: string) => wiki.push(text) }
  );
  Object.defineProperty(globalThis, 'document', { value: {}, configurable: true });
  Object.defineProperty(globalThis, '$', { value: jquery, configurable: true });
  try {
    const events = new OptionEvents(core);
    events.install();
    events.install();
    expect(handlers.size).toBe(9);
    const refresh = handlers.get('select[name="lanListbox-optionsmaplebirchnpcsidebarnnpc"]')!;
    refresh();
    expect(wiki).toEqual([]);
    phase.preInitCompleted = true;
    refresh();
    expect(wiki).toEqual(['<<replace #customOverlayContent>><<maplebirchOptions>><</replace>>']);
  } finally {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    if (originalJQuery) Object.defineProperty(globalThis, '$', originalJQuery);
    else Reflect.deleteProperty(globalThis, '$');
  }
});
