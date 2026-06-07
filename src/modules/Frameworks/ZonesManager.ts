// .src/modules/Frameworks/ZonesManager.ts

import { createlog } from '../../core';
import ToolCollection from '../ToolCollection';
import { specialWidget, defaultData, locationPassage, widgetPassage } from '../../replace';
import AddonPlugin from '../AddonPlugin';

export interface ZoneWidgetConfig {
  exclude?: string[];
  match?: RegExp;
  passage?: string | string[];
  widget: string;
  type?: 'function';
  func?: () => any;
}

interface CustomLinkZoneItem {
  position: number;
  widget: string | ZoneWidgetConfig;
}

interface PatchSet {
  src?: string;
  srcmatch?: RegExp;
  srcmatchgroup?: RegExp;
  to?: string;
  applyafter?: string;
  applybefore?: string;
}

type ZoneItem = string | ZoneWidgetConfig | CustomLinkZoneItem;
type InitObject = { init: Function } | { name: string; func: Function };

export type InitFunction = string | Function | InitObject;

export class zonesManager {
  public readonly log: ReturnType<typeof createlog>;
  public readonly core: ToolCollection['core'];

  public data: Record<string, ZoneItem[]>;
  public initFunction: InitFunction[] = [];
  public specialWidget: (string | Function)[] = specialWidget;
  public defaultData: Record<string, string | Function> = defaultData;
  public locationPassage: Record<string, PatchSet[]> = locationPassage;
  public widgetPassage: Record<string, PatchSet[]> = widgetPassage;
  public widgethtml = '';

  private functions = new Map<string, Function>();

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

  public addTo(zone: string, ...widgets: (string | Function | ZoneWidgetConfig | [number, string | ZoneWidgetConfig])[]): void {
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
        const name = widget.name || `func_${this.hash(widget.toString())}`;
        this.functions.set(name, widget);
        target.push({ widget: name, type: 'function' });
        continue;
      }
      if (widget && typeof widget === 'object' && 'widget' in widget) target.push(widget as ZoneWidgetConfig);
    }
  }

  public storyInit(): void {
    if (this.initFunction.length === 0) return;
    this.log(`执行 ${this.initFunction.length} 个初始化函数`, 'DEBUG');
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
      } catch (error: any) {
        this.log(`初始化函数执行失败: ${error?.message || error}`, 'ERROR', error);
      }
    }
  }

  public call(name: string): any {
    const fn = this.functions.get(name);
    if (!fn) {
      this.log(`区域函数不存在: ${name}`, 'WARN');
      return;
    }
    return fn();
  }

  public play(zone: string, passageTitle?: string): any {
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
      this.widgetInit(passageData);
      this.widgethtml = '';
    }
    for (const [title, passage] of passageData) {
      try {
        this.patchPassage(type, passage, title);
      } catch (error: any) {
        const message = error?.message || error;
        this.log(`处理段落 ${title} 时出错: ${message}`, 'ERROR', error);
        manager.log(`PatchScene: ${title} ${message}`);
      }
    }
    SCdata.passageDataItems.back2Array();
    manager.modUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
    this.log('框架补丁应用完成', 'DEBUG');
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
    if (widget.type === 'function') {
      if (widget.func) this.functions.set(widget.widget, widget.func);
      return `<<run maplebirch.tool.zone.call(${JSON.stringify(widget.widget)})>>`;
    }
    if (!this.shouldRender(widget, title)) return '';
    return widget.widget ? `<<${widget.widget}>>` : '';
  }

  private shouldRender(config: ZoneWidgetConfig, title: string): boolean {
    if (config.exclude?.includes(title)) return false;
    if (config.match instanceof RegExp) {
      config.match.lastIndex = 0;
      if (!config.match.test(title)) return false;
    }
    if (config.passage == null) return true;
    if (typeof config.passage === 'string') return config.passage === '' || config.passage === title;
    if (Array.isArray(config.passage)) return config.passage.length === 0 || config.passage.includes(title);
    return true;
  }

  private customLinkItem(widget: string | Function | ZoneWidgetConfig | [number, string | ZoneWidgetConfig]): CustomLinkZoneItem | null {
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
      const raw = widget as any;
      if (Array.isArray(raw.widget) && raw.widget.length === 2) {
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
        widget: widget as ZoneWidgetConfig
      };
    }
    return null;
  }

  private matchAndApply(set: PatchSet, source: string): string {
    if (set.src && source.includes(set.src)) return this.applyPatch(source, set.src, set);
    if (set.srcmatch instanceof RegExp) {
      set.srcmatch.lastIndex = 0;
      if (set.srcmatch.test(source)) return this.applyPatch(source, set.srcmatch, set);
    }
    if (set.srcmatchgroup instanceof RegExp) {
      set.srcmatchgroup.lastIndex = 0;
      const matches = source.match(set.srcmatchgroup);
      if (matches?.length) {
        let result = source;
        for (const match of matches) result = this.applyPatch(result, match, set);
        return result;
      }
    }
    const pattern = [set.src, set.srcmatch, set.srcmatchgroup].find(Boolean)?.toString() ?? '';
    this.log(`替换失败: 未找到匹配 (${pattern})`, 'WARN');
    return source;
  }

  private applyPatch(source: string, pattern: string | RegExp, set: PatchSet): string {
    if (set.to != null) return source.replace(pattern, set.to);
    if (set.applyafter != null) return source.replace(pattern, match => match + set.applyafter);
    if (set.applybefore != null) return source.replace(pattern, match => set.applybefore + match);
    return source;
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
    for (const set of sets) content = this.matchAndApply(set, content);
    passage.content = content;
  }

  private patchPassage(type: 'before' | 'after', passage: any, title: string): void {
    const isWidget = Array.isArray(passage.tags) && passage.tags.includes('widget');
    if (type === 'before') {
      this.applyContentPatches(passage, title, isWidget ? this.widgetPassage : this.locationPassage);
      return;
    }
    if (!isWidget) this.wrapSpecialPassage(passage, title);
  }

  private widgetInit(passageData: Map<string, any>): Map<string, any> {
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
    this.log('创建宏部件段落: Maplebirch Frameworks Widgets', 'DEBUG', [this.widgethtml.clone()]);
    const storyInit = passageData.get('StoryInit');
    if (storyInit && !String(storyInit.content).includes('<<maplebirchInit>>')) {
      storyInit.content += '\n<<maplebirchInit>>\n';
      passageData.set('StoryInit', storyInit);
    }
    return passageData;
  }

  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).slice(0, 8);
  }
}
