import './runtime';
import { expect, test } from 'bun:test';
import type { PassageDataItem } from '@scml/types/sugarcube-2-ModLoader/SC2DataInfoCache';
import type { MaplebirchCore } from '../../src/core';
import type AddonPlugin from '../../src/services/AddonPlugin';
import prototypeUtils from '../../src/compat/Prototype';
import { zonesManager } from '../../src/modules/Frameworks/ZonesManager';

function harness() {
  prototypeUtils();
  const core = {
    infra: { diagnostics: { scoped: () => () => {}, recordPatch() {} } },
    host: { sugarcube: { passage: { title: 'Home' } } }
  } as unknown as MaplebirchCore;
  const zone = Object.seal(new zonesManager(core));
  let passages = new Map<string, PassageDataItem>([
    ['Home', { id: 1, name: 'Home', tags: [], content: 'old location' }],
    ['Widgets', { id: 2, name: 'Widgets', tags: ['widget'], content: 'old widget' }],
    ['StoryInit', { id: 3, name: 'StoryInit', tags: [], content: 'original init' }]
  ]);
  const manager = {
    SC2DataManager: {
      getSC2DataInfoAfterPatch: () => ({
        cloneSC2DataInfo: () => ({
          passageDataItems: { map: new Map([...passages].map(([title, passage]) => [title, { ...passage }])), back2Array() {} }
        })
      })
    },
    modUtils: {
      replaceFollowSC2DataInfo: (data: { passageDataItems: { map: Map<string, PassageDataItem> } }) => {
        passages = data.passageDataItems.map;
      }
    }
  };
  zone.inject({
    specialWidget: ['<<widget "special">>special content<</widget>>'],
    defaultData: { Header: 'default header' },
    locationPassage: { Home: [{ src: 'old location', to: 'new location' }] },
    widgetPassage: { Widgets: [{ src: 'old widget', to: 'new widget' }] }
  });
  return { zone, manager, addon: manager as unknown as AddonPlugin, passage: (title: string) => passages.get(title)! };
}

test('zone releases consumed patch inputs while generated widgets and runtime callbacks remain usable', () => {
  const { zone, addon, passage } = harness();
  const inputs = [zone.defaultData, zone.locationPassage, zone.widgetPassage];
  const specials = zone.specialWidget;
  let calls = 0;
  zone.onInit(() => calls++);
  zone.addTo('Header', 'runtimeHeader');
  zone.addTo('State', () => 'runtime state');
  zone.patchModToGame(addon, 'before');
  expect(passage('Home').content).toBe('new location');
  expect(passage('Widgets').content).toBe('new widget');
  expect(passage('StoryInit').content).toContain('<<maplebirchInit>>');
  expect(passage('Maplebirch Frameworks Widgets').content).toContain('default header');
  expect(passage('Maplebirch Frameworks Widgets').content).toContain('special content');
  expect(specials).toEqual([]);
  for (const input of inputs) expect(input).toEqual({});
  expect(zone.widgethtml).toBe('');
  zone.patchModToGame(addon, 'after');
  expect(passage('Home').content).toContain("id='passage-content'");
  expect(passage('Home').content).toContain('new location');
  expect(zone.play('Header')).toBe('<<runtimeHeader>>');
  expect(zone.play('State')).toContain('maplebirch.tool.zone.call');
  expect(zone.call('maplebirch:zone:1')).toBe('runtime state');
  zone.storyInit();
  zone.storyInit();
  expect(calls).toBe(2);
});

test('zone releases patch inputs when special widget generation throws', () => {
  const { zone, addon, passage } = harness();
  zone.specialWidget.push(() => {
    throw new Error('special widget failed');
  });
  expect(() => zone.patchModToGame(addon, 'before')).toThrow('special widget failed');
  expect(zone.specialWidget).toEqual([]);
  expect(zone.defaultData).toEqual({});
  expect(zone.locationPassage).toEqual({});
  expect(zone.widgetPassage).toEqual({});
  expect(zone.widgethtml).toBe('');
  expect(passage('Home').content).toBe('old location');
});

test('zone clears generated widget text even when publishing patched passages fails', () => {
  const { zone, addon, manager } = harness();
  manager.modUtils.replaceFollowSC2DataInfo = () => {
    throw new Error('publish failed');
  };
  expect(() => zone.patchModToGame(addon, 'before')).toThrow('publish failed');
  expect(zone.specialWidget).toEqual([]);
  expect(zone.defaultData).toEqual({});
  expect(zone.locationPassage).toEqual({});
  expect(zone.widgetPassage).toEqual({});
  expect(zone.widgethtml).toBe('');
});
