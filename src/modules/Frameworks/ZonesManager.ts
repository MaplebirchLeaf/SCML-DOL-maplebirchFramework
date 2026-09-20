// .src/modules/Frameworks/ZonesManager.ts

import { errorMessage } from '../../utils/error';
import type { PassageDataItem } from '@scml/types/sugarcube-2-ModLoader/SC2DataInfoCache';
import { createlog } from '../../core';
import type ToolCollection from '../ToolCollection';
import { specialWidget, defaultData, locationPassage, widgetPassage } from '../../replace';
import type AddonPlugin from '../AddonPlugin';
import { applySourcePatch, type SourcePatch } from './SourcePatch';

export interface ZoneWidgetConfig {
  exclude?: string[];
  match?: RegExp;
  passage?: string | string[];
  widget: string;
  type?: 'function';
  func?: () => unknown;
}

interface CustomLinkZoneItem {
  position: number;
  widget: string | ZoneWidgetConfig;
}

type PatchSet = SourcePatch;

type ZoneItem = string | ZoneWidgetConfig | CustomLinkZoneItem;
export type ZoneFunction = () => unknown;
type InitObject = { init: ZoneFunction } | { name: string; func: ZoneFunction };
export type PositionedZoneWidgetConfig = Omit<ZoneWidgetConfig, 'widget'> & { widget: [number, string] };
export type ZoneWidget = string | ZoneFunction | ZoneWidgetConfig | PositionedZoneWidgetConfig | [number, string | ZoneWidgetConfig];
export interface CustomLinkGroup {
  position: number;
  macro: string;
}

export type InitFunction = string | ZoneFunction | InitObject;

export class zonesManager {
  public readonly log: ReturnType<typeof createlog>;
  public readonly core: ToolCollection['core'];

  public data: Record<string, ZoneItem[]>;
  public initFunction: InitFunction[] = [];
  public specialWidget: (string | ZoneFunction)[] = specialWidget;
  public defaultData: Record<string, string | ZoneFunction> = defaultData;
  public locationPassage: Record<string, PatchSet[]> = locationPassage;
  public widgetPassage: Record<string, PatchSet[]> = widgetPassage;
  public widgethtml = '';

  private readonly functions = new Map<string, ZoneFunction>();
  private readonly functionNames = new WeakMap<ZoneFunction, string>();
  private nextFunction = 0;

  public constructor(manager: ToolCollection) {
    this.log = createlog('zone');
    this.core = manager.core;
    // prettier-ignore
    this.data = {
      Init                   : [],
      State                  : [],
      Header                 : [],
      Footer                 : [],
      Information            : [],
      Options                : [],
      Cheats                 : [],
      Statistics             : [],
      CloudSave              : [],
      Journal                : [],
      BeforeLinkZone         : [],
      AfterLinkZone          : [],
      CustomLinkZone         : [],
      CaptionDescription     : [],
      StatusBar              : [],
      MenuBig                : [],
      MenuSmall              : [],
      CaptionAfterDescription: [],
      HintMobile             : [],
      MobileStats            : [],
      CharaDescription       : [],
      DegreesBonusDisplay    : [],
      DegreesBox             : [],
      SkillsBonusDisplay     : [],
      SkillsBox              : [],
      SubjectBoxBonusDisplay : [],
      SchoolSubjectsBox      : [],
      SchoolMarksText        : [],
      WeaponBox              : [],
      ReputationModify       : [],
      Reputation             : [],
      FameModify             : [],
      Fame                   : [],
      StatusSocial           : [],
      NPCinit                : [],
      NPCinject              : [],
    };
  }

  public inject(...databases: Partial<Pick<zonesManager, 'specialWidget' | 'defaultData' | 'locationPassage' | 'widgetPassage'>>[]): void {
    for (const db of databases) {
      if (db.specialWidget) this.specialWidget = Array.append(this.specialWidget, db.specialWidget);
      if (db.defaultData) this.defaultData = Object.append(this.defaultData, db.defaultData);
      if (db.locationPassage) this.locationPassage = Object.append(this.locationPassage, db.locationPassage);
      if (db.widgetPassage) this.widgetPassage = Object.append(this.widgetPassage, db.widgetPassage);
    }
  }

  public onInit(...widgets: InitFunction[]): void {
    for (const widget of widgets) {
      if (typeof widget === 'string') {
        this.data.Init.push(widget);
      } else {
        this.initFunction.push(widget);
      }
    }
  }

  public addTo(zone: string, ...widgets: ZoneWidget[]): void {
    const target = this.data[zone];
    if (!target) {
      this.log(`区域 ${zone} 不存在`, 'ERROR');
      return;
    }
    for (const widget of widgets) {
      if (zone === 'CustomLinkZone') {
        const item = this.customLinkItem(widget);
        if (item) target.push(item);
        continue;
      }
      if (typeof widget === 'string') {
        target.push(widget);
        continue;
      }
      if (typeof widget === 'function') {
        let name = this.functionNames.get(widget);
        if (!name) {
          name = `maplebirch:zone:${++this.nextFunction}`;
          this.functionNames.set(widget, name);
        }
        this.functions.set(name, widget);
        target.push({ widget: name, type: 'function' });
        continue;
      }
      if (widget && typeof widget === 'object' && 'widget' in widget && typeof widget.widget === 'string') target.push({ ...widget, widget: widget.widget });
    }
  }

  public storyInit(): void {
    if (this.initFunction.length === 0) return;
    for (const item of this.initFunction) {
      try {
        if (typeof item === 'function') {
          item();
          continue;
        }
        if (item && typeof item === 'object' && 'init' in item) {
          item.init();
          continue;
        }
        if (item && typeof item === 'object' && 'func' in item) item.func();
      } catch (error) {
        this.log(`初始化函数执行失败: ${errorMessage(error)}`, 'ERROR', error);
      }
    }
  }

  public call(name: string): unknown {
    const fn = this.functions.get(name);
    if (!fn) {
      this.log(`区域函数不存在: ${name}`, 'WARN');
      return;
    }
    return fn();
  }

  public play(zone: 'CustomLinkZone', passageTitle?: string): CustomLinkGroup[];
  public play(zone: 'BeforeLinkZone' | 'AfterLinkZone', passageTitle?: string): string;
  public play(zone: string, passageTitle?: string): string | CustomLinkGroup[];
  public play(zone: string, passageTitle?: string): string | CustomLinkGroup[] {
    const items = this.data[zone];
    if (!items || items.length === 0) return zone === 'CustomLinkZone' ? [] : '';
    const title = passageTitle ?? this.core.passage?.title ?? '';
    if (zone !== 'CustomLinkZone') return items.map(item => this.render(item as string | ZoneWidgetConfig, title)).join('');
    const groups = new Map<number, CustomLinkZoneItem[]>();
    for (const item of items as CustomLinkZoneItem[]) {
      if (!groups.has(item.position)) groups.set(item.position, []);
      groups.get(item.position)!.push(item);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([position, links]) => ({
        position,
        macro: links.map(item => this.render(item.widget, title)).join('')
      }));
  }

  public patchModToGame(manager: AddonPlugin, type: 'before' | 'after'): void {
    const oldSCdata = manager.SC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const passageData = SCdata.passageDataItems.map;
    if (type === 'before') {
      for (const [patches, widget] of [
        [this.locationPassage, false],
        [this.widgetPassage, true]
      ] as const) {
        for (const [title, sets] of Object.entries(patches)) {
          const passage = passageData.get(title);
          if (passage && passage.tags.includes('widget') === widget) continue;
          sets.forEach((set, index) =>
            this.core.addon.diagnostics.recordPatch({
              kind: 'passage',
              target: title,
              index: index + 1,
              pattern: String(set.src ?? set.srcmatch ?? set.srcmatchgroup ?? ''),
              matches: 0,
              applied: 0,
              status: passage ? 'invalid' : 'missing',
              error: passage ? 'Passage is registered in the wrong patch group' : 'Passage not found'
            })
          );
          this.log(`补丁目标不可用: ${title}`, 'WARN');
        }
      }
      this.widgetInit(passageData);
      this.widgethtml = '';
    }
    for (const [title, passage] of passageData) {
      try {
        this.patchPassage(type, passage, title);
      } catch (error) {
        const message = errorMessage(error);
        this.log(`处理段落 ${title} 时出错: ${message}`, 'ERROR', error);
      }
    }
    SCdata.passageDataItems.back2Array();
    manager.modUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
  }

  private get widgets(): string {
    const zones = Object.keys(this.data).filter(zone => !['BeforeLinkZone', 'AfterLinkZone', 'CustomLinkZone'].includes(zone));
    return (
      '\r\n' +
      zones
        .map(zone => {
          const content = this.defaultContent(zone);
          const br = zone === 'CaptionAfterDescription' && this.data[zone].length > 0 ? '<br>\n\t' : '';
          return `${br}<<widget 'maplebirch${zone}'>>\n\t${content}<<= maplebirch.tool.zone.play('${zone}')>>\n<</widget>>\n\n`;
        })
        .join('')
    );
  }

  private get specials(): string {
    return (
      '\r\n' +
      this.specialWidget
        .map(widget => {
          if (typeof widget === 'function') return widget();
          if (typeof widget === 'string') return widget;
          return '';
        })
        .join('')
    );
  }

  private defaultContent(zone: string): string {
    const value = this.defaultData[zone];
    if (typeof value === 'function') return `${value()}\n\t`;
    if (typeof value === 'string') return `${value}\n\t`;
    return '';
  }

  private render(widget: string | ZoneWidgetConfig | CustomLinkZoneItem, title: string): string {
    if (typeof widget === 'string') return `<<${widget}>>`;
    if (!widget || typeof widget !== 'object') return '';
    if ('position' in widget) return this.render(widget.widget, title);
    if (!this.shouldRender(widget, title)) return '';
    if (widget.type === 'function') {
      if (widget.func) this.functions.set(widget.widget, widget.func);
      return `<<= maplebirch.tool.zone.call(${JSON.stringify(widget.widget)})>>`;
    }
    return widget.widget ? `<<${widget.widget}>>` : '';
  }

  private shouldRender(config: ZoneWidgetConfig, title: string): boolean {
    if (config.exclude?.includes(title)) return false;
    if (config.match instanceof RegExp && !new RegExp(config.match.source, config.match.flags).test(title)) return false;
    if (config.passage == null) return true;
    if (typeof config.passage === 'string') return config.passage === '' || config.passage === title;
    if (Array.isArray(config.passage)) return config.passage.length === 0 || config.passage.includes(title);
    return true;
  }

  private customLinkItem(widget: ZoneWidget): CustomLinkZoneItem | null {
    if (Array.isArray(widget) && widget.length === 2) {
      return {
        position: Number(widget[0]) || 0,
        widget: widget[1]
      };
    }
    if (typeof widget === 'string') {
      return {
        position: 0,
        widget
      };
    }
    if (widget && typeof widget === 'object' && 'widget' in widget) {
      const raw = widget;
      if (Array.isArray(raw.widget)) {
        const [position, widgetName] = raw.widget;
        return {
          position: Number(position) || 0,
          widget: {
            ...raw,
            widget: widgetName
          }
        };
      }
      return {
        position: 0,
        widget: { ...raw, widget: raw.widget }
      };
    }
    return null;
  }

  private wrapSpecialPassage(passage: { content: string }, title: string): void {
    if (title === 'StoryCaption') return;
    if (title === 'PassageHeader') {
      passage.content = `<div id='passage-header'>\n${passage.content}\n<<maplebirchHeader>>\n</div>`;
      return;
    }
    if (title === 'PassageFooter') {
      passage.content = `<div id='passage-footer'>\n<<maplebirchFooter>>\n${passage.content}\n</div>`;
      return;
    }
    passage.content = `<div id='passage-content'>\n<<= maplebirch.dynamic.trigger('gate')>>\n${passage.content}\n<div id='append'></div>\n</div>`;
  }

  private applyContentPatches(passage: { content: string }, title: string, patchSets: Record<string, PatchSet[]>): void {
    const sets = patchSets[title];
    if (!sets?.length) return;
    let content = String(passage.content);
    sets.forEach((set, index) => {
      const { content: next, ...result } = applySourcePatch(content, set);
      this.core.addon.diagnostics.recordPatch({ kind: 'passage', target: title, index: index + 1, ...result });
      if (result.status !== 'applied') this.log(`补丁 ${title} #${index + 1}: ${result.status}，匹配 ${result.matches} (${result.pattern})`, 'WARN');
      content = next;
    });
    passage.content = content;
  }

  private patchPassage(type: 'before' | 'after', passage: PassageDataItem, title: string): void {
    const isWidget = Array.isArray(passage.tags) && passage.tags.includes('widget');
    if (type === 'before') {
      this.applyContentPatches(passage, title, isWidget ? this.widgetPassage : this.locationPassage);
      return;
    }
    if (!isWidget) this.wrapSpecialPassage(passage, title);
  }

  private widgetInit(passageData: Map<string, PassageDataItem>): Map<string, PassageDataItem> {
    this.widgethtml = this.widgets + this.specials;
    // prettier-ignore
    const data = {
      id      : 0,
      name    : 'Maplebirch Frameworks Widgets',
      position: '100,100',
      size    : '100,100',
      tags    : ['widget'],
      content : this.widgethtml
    };
    passageData.set('Maplebirch Frameworks Widgets', data);
    const storyInit = passageData.get('StoryInit');
    if (storyInit && !String(storyInit.content).includes('<<maplebirchInit>>')) {
      storyInit.content += '\n<<maplebirchInit>>\n';
      passageData.set('StoryInit', storyInit);
    }
    return passageData;
  }
}
