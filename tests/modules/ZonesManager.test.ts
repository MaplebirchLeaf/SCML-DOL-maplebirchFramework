import '../support/runtime';
import { expect, test } from 'bun:test';
import type { PassageDataItem } from '@scml/types/sugarcube-2-ModLoader/SC2DataInfoCache';
import type { MaplebirchCore } from '../../src/core';
import type AddonPlugin from '../../src/services/AddonPlugin';
import prototypeUtils from '../../src/compat/Prototype';
import { ZonesManager } from '../../src/modules/Frameworks/ZonesManager';

function harness() {
  prototypeUtils();
  const core = {
    infra: { diagnostics: { scoped: () => () => {}, recordPatch() {} } },
    host: { sugarcube: { passage: { title: 'Home' } } }
  } as unknown as MaplebirchCore;
  const zone = Object.seal(new ZonesManager(core));
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

test('zone callbacks can change state without producing output', () => {
  const { zone } = harness();
  let calls = 0;
  zone.addTo('Header', () => {
    calls++;
  });
  zone.addTo(
    'Header',
    () => null,
    () => false,
    () => 0,
    () => 'header text'
  );
  expect(zone.play('Header')).toContain('maplebirch.tool.zone.call');
  expect(calls).toBe(0);
  expect(zone.call('maplebirch:zone:1')).toBe('');
  expect(calls).toBe(1);
  expect(zone.call('maplebirch:zone:2')).toBe('');
  expect(zone.call('maplebirch:zone:3')).toBe(false);
  expect(zone.call('maplebirch:zone:4')).toBe(0);
  expect(zone.call('maplebirch:zone:5')).toBe('header text');
  expect(zone.call('missing')).toBe('');
});

test('void default callbacks do not generate literal undefined in widgets', () => {
  const { zone, addon, passage } = harness();
  let calls = 0;
  zone.inject({
    defaultData: {
      Header: () => {
        calls++;
      },
      Footer: () => null
    }
  });
  zone.patchModToGame(addon, 'before');
  expect(calls).toBe(1);
  const source = passage('Maplebirch Frameworks Widgets').content;
  expect(source).not.toContain('undefined');
  expect(source).not.toContain('null');
  expect(source).toContain("<<widget 'maplebirchHeader'>>");
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

test('custom link zones preserve negative positions and passage filters', () => {
  const { zone } = harness();
  zone.addTo('CustomLinkZone', [-1, 'lastLink'], { widget: [-2, 'secondLastLink'], passage: 'Home' }, { widget: [-1, 'otherPassage'], passage: 'Other' }, [0, 'firstLink']);
  expect(zone.play('CustomLinkZone')).toEqual([
    { position: -2, macro: '<<secondLastLink>>' },
    { position: -1, macro: '<<lastLink>>' },
    { position: 0, macro: '<<firstLink>>' }
  ]);
});
