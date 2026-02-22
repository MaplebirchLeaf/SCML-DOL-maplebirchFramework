// .src/modules/Frameworks/zonesManager.ts

import { createlog } from '../../core';
import { clone, merge } from '../../utils';
import ToolCollection from '../ToolCollection';
import { specialWidget, defaultData, locationPassage, widgetPassage } from '../../database/FrameworksReplace';
import AddonPlugin from '../AddonPlugin';

export interface ZoneWidgetConfig {
  exclude?: string[];
  match?: RegExp;
  passage?: string | string[];
  widget: string;
  type?: 'function';
  func?: () => string;
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

export type InitFunction = Function | { init: Function } | { name: string; func: Function };

export class zonesManager {
  readonly log: ReturnType<typeof createlog>;
  core: ToolCollection['core'];
  data: Record<string, Array<string | ZoneWidgetConfig | CustomLinkZoneItem>>;
  initFunction: InitFunction[] = [];
  specialWidget: (string | Function)[] = specialWidget;
  defaultData: Record<string, string | Function> = defaultData;
  locationPassage: Record<string, PatchSet[]> = locationPassage;
  widgetPassage: Record<string, PatchSet[]> = widgetPassage;
  patchedPassage: Set<string> = new Set();
  widgethtml: string = '';

  constructor(manager: ToolCollection) {
    this.log = createlog('zone');
    this.core = manager.core;
    // prettier-ignore
    this.data = {
      Init                   : [], // 初始化脚本-静态变量(如setup)
      State                  : [], // 初始化变量-存档变量(如V.money)
      Header                 : [], // 页眉
      Footer                 : [], // 页脚
      Information            : [], // 信息栏
      Options                : [], // 选项栏
      Cheats                 : [], // 作弊栏
      Statistics             : [], // 统计栏
      Journal                : [], // 日志尾部
      BeforeLinkZone         : [], // 链接前区域
      AfterLinkZone          : [], // 链接后区域
      CustomLinkZone         : [], // 自定义位置链接区域
      CaptionDescription     : [], // 标题描述
      StatusBar              : [], // 状态栏
      MenuBig                : [], // 大菜单
      MenuSmall              : [], // 小菜单
      CaptionAfterDescription: [], // 标题描述后
      HintMobile             : [], // 移动端图标(即疼痛上方)
      StatsMobile            : [], // 移动端状态(即疼痛等)
      CharaDescription       : [], // 角色描述
      DegreesBonusDisplay    : [], // 属性加成显示
      DegreesBox             : [], // 属性
      SkillsBonusDisplay     : [], // 技能加成显示
      SkillsBox              : [], // 技能
      SubjectBoxBonusDisplay : [], // 学科加成显示
      SchoolSubjectsBox      : [], // 学科
      SchoolMarksText        : [], // 成绩
      WeaponBox              : [], // 武器
      ReputationModify       : [], // 声誉显示修改区
      Reputation             : [], // 声誉
      FameModify             : [], // 知名度显示修改区
      Fame                   : [], // 知名度
      StatusSocial           : [], // 自定义社交状态
      NPCinit                : [], // NPC初遇初始化(详情看原版<<initnpc>>宏)
      NPCinject              : [], // NPC生成初始化(详情看原版<<npc>>宏)
    };
  }

  inject(...databases: Partial<Pick<zonesManager, 'specialWidget' | 'defaultData' | 'locationPassage' | 'widgetPassage'>>[]) {
    this.core.lodash.forEach(databases, db => {
      this.core.lodash.forIn(db, (value, key) => {
        if (!this.core.lodash.isNil(value)) {
          const current = this[key];
          const base = key === 'specialWidget' ? [] : {};
          this[key] = merge(base, current, value, { mode: 'concat' });
        }
      });
    });
  }

  onInit(...widgets: InitFunction[]) {
    this.core.lodash.forEach(widgets, widget => {
      if (this.core.lodash.isString(widget)) {
        this.data.Init.push(widget);
      } else {
        this.initFunction.push(widget);
      }
    });
  }

  addTo(zone: string, ...widgets: (string | Function | ZoneWidgetConfig | [number, string | ZoneWidgetConfig])[]) {
    if (!this.data[zone]) {
      this.log(`区域 ${zone} 不存在`, 'ERROR');
      return;
    }
    this.core.lodash.forEach(widgets, widget => {
      if (zone === 'CustomLinkZone') {
        let position = 0;
        let pureWidget: string | ZoneWidgetConfig | null = null;
        if (Array.isArray(widget) && widget.length === 2) {
          position = widget[0] as number;
          pureWidget = widget[1] as string | ZoneWidgetConfig;
        } else if (this.core.lodash.isObject(widget) && 'widget' in widget) {
          const w = widget as any;
          if (w.widget && Array.isArray(w.widget) && w.widget.length === 2) {
            position = w.widget[0];
            pureWidget = {
              widget: w.widget[1],
              passage: w.passage,
              exclude: w.exclude,
              match: w.match
            };
          }
        }
        if (!this.core.lodash.isNil(pureWidget)) this.data[zone].push({ position, widget: pureWidget });
      } else {
        if (this.core.lodash.isString(widget)) {
          this.data[zone].push(widget);
        } else if (this.core.lodash.isFunction(widget)) {
          const funcName = widget.name || `func_${this.#hashCode(widget.toString())}`;
          this.initFunction.push({ name: funcName, func: widget });
          this.data[zone].push(`run ${funcName}()`);
        } else if (this.core.lodash.isObject(widget) && !this.core.lodash.isNil(widget) && 'widget' in widget) {
          this.data[zone].push(widget as ZoneWidgetConfig);
        }
      }
    });
  }

  #hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  storyInit() {
    if (this.initFunction.length === 0) return;
    this.log(`执行 ${this.initFunction.length} 个初始化函数`, 'DEBUG');
    this.core.lodash.forEach(this.initFunction, initfunc => {
      try {
        if (this.core.lodash.isFunction(initfunc)) {
          initfunc();
        } else if (this.core.lodash.isObject(initfunc) && 'init' in initfunc) {
          (initfunc as { init: Function }).init();
        } else if (this.core.lodash.isObject(initfunc) && 'func' in initfunc) {
          (initfunc as { func: Function }).func();
        }
      } catch (error: any) {
        this.log(`初始化函数执行失败: ${error.message}`, 'ERROR', error.stack);
      }
    });
  }

  get #widgets(): string {
    const print = {
      start: (zone: string) => {
        let html = `<<widget 'maplebirch${zone}'>>\n\t`;
        const defaultValue = this.defaultData[zone];
        if (this.core.lodash.isFunction(defaultValue)) {
          html += `${(defaultValue as Function)()}\n\t`;
        } else if (this.core.lodash.isString(defaultValue)) {
          html += `${defaultValue}\n\t`;
        }
        return html;
      },
      end: (zone: string, length: number) => {
        let html = '\n<</widget>>\n\n';
        const br = ['CaptionAfterDescription'];
        if (br.includes(zone) && length > 0) html = `<br>\n\t${html}`;
        return html;
      }
    };

    return this.core.lodash
      .chain(this.data)
      .keys()
      .reject((zone: string) => ['BeforeLinkZone', 'AfterLinkZone', 'CustomLinkZone'].includes(zone))
      .map((zone: string) => {
        const length = this.data[zone].length;
        let _html = print.start(zone);
        _html += `<<= maplebirch.tool.zone.play('${zone}')>>`;
        _html += print.end(zone, length);
        return _html;
      })
      .join('')
      .thru((html: string) => `\r\n${html}`)
      .value();
  }

  get #specials(): string {
    return this.core.lodash
      .chain(this.specialWidget)
      .map((widget: string | Function) => {
        if (this.core.lodash.isFunction(widget)) {
          return (widget as Function)();
        } else if (this.core.lodash.isString(widget)) {
          return widget;
        }
        return '';
      })
      .join('')
      .thru((html: string) => `\r\n${html}`)
      .value();
  }

  play(zone: string, passageTitle?: string): any {
    if (this.core.lodash.isEmpty(this.data[zone])) return zone === 'CustomLinkZone' ? [] : '';
    const title = passageTitle ?? this.core.passage?.title;
    if (zone === 'CustomLinkZone') {
      const sorted = this.core.lodash
        .chain(this.data[zone] as CustomLinkZoneItem[])
        .sortBy('position')
        .value();
      const position = this.core.lodash.groupBy(sorted, 'position');
      return this.core.lodash.map(position, (items, posStr) => {
        const widgets = this.core.lodash.map(items, 'widget');
        const macro = this.core.lodash
          .chain(widgets)
          .map((w: string | ZoneWidgetConfig) => this.#render(w, title))
          .join('')
          .value();
        return {
          position: parseInt(posStr),
          macro
        };
      });
    }
    return this.core.lodash.reduce(this.data[zone] as string[], (result: string, widget: string) => result + this.#render(widget, title), '');
  }

  #render(widget: string | ZoneWidgetConfig, title: string): string {
    if (this.core.lodash.isString(widget)) return `<<${widget}>>`;
    if (this.core.lodash.isObject(widget)) {
      if ('type' in widget && widget.type === 'function') return `<<run (${(widget as any).func?.toString()})()>>`;

      const { exclude, match, passage, widget: widgetName } = widget as ZoneWidgetConfig;

      if (!this.core.lodash.isNil(exclude)) {
        if (!this.core.lodash.includes(exclude, title)) return `<<${widgetName}>>`;
        return '';
      }

      if (!this.core.lodash.isNil(match) && match instanceof RegExp && match.test(title)) return `<<${widgetName}>>`;

      if (!this.core.lodash.isNil(passage)) {
        const shouldInclude = (this.core.lodash.isString(passage) && passage === title) || (Array.isArray(passage) && this.core.lodash.includes(passage, title)) || this.core.lodash.isEmpty(passage);
        if (shouldInclude) return `<<${widgetName}>>`;
        return '';
      }
      if (!this.core.lodash.isNil(widgetName)) return `<<${widgetName}>>`;
    }
    return '';
  }

  #matchAndApply(set: PatchSet, source: string): string {
    const patterns = [
      { type: 'src', pattern: set.src },
      { type: 'srcmatch', pattern: set.srcmatch },
      { type: 'srcmatchgroup', pattern: set.srcmatchgroup }
    ];
    for (const { type, pattern } of patterns) {
      if (this.core.lodash.isNil(pattern)) continue;
      let matched = false;
      switch (type) {
        case 'src':
          if (this.core.lodash.isString(pattern) && source.includes(pattern)) matched = true;
          break;
        case 'srcmatch':
        case 'srcmatchgroup':
          if (pattern instanceof RegExp) matched = pattern.test(source);
          break;
      }
      if (!matched) continue;
      let result = source;
      switch (type) {
        case 'src':
          if (set.to) result = source.replace(pattern, set.to);
          if (set.applyafter) result = source.replace(pattern, match => match + set.applyafter);
          if (set.applybefore) result = source.replace(pattern, match => set.applybefore + match);
          break;
        case 'srcmatch':
          if (set.to) result = source.replace(pattern, set.to);
          if (set.applyafter) result = source.replace(pattern, match => match + set.applyafter);
          if (set.applybefore) result = source.replace(pattern, match => set.applybefore + match);
          break;
        case 'srcmatchgroup':
          if (pattern instanceof RegExp) {
            const matches = source.match(pattern) || [];
            this.core.lodash.forEach(matches, (match: string) => {
              if (set.to) {
                result = result.replace(match, set.to);
              } else if (set.applyafter) {
                result = result.replace(match, match + set.applyafter);
              } else if (set.applybefore) {
                result = result.replace(match, set.applybefore + match);
              }
            });
          }
          break;
      }
      if (result !== source) return result;
    }
    const patternType = set.src ? '字符串' : set.srcmatch ? '正则' : set.srcmatchgroup ? '正则组' : '未知';
    const pattern = set.src || set.srcmatch?.toString() || set.srcmatchgroup?.toString() || '无';
    this.log(`替换失败: 未找到匹配 (${patternType}: ${pattern})`, 'WARN');
    return source;
  }

  #wrapSpecialPassages(passage: { content: string }, title: string) {
    const wrappers: Record<string, (content: string) => string> = {
      StoryCaption: this.core.lodash.identity,
      PassageHeader: (content: string) => `<div id='passage-header'>\n${content}\n<<maplebirchHeader>>\n</div>`,
      PassageFooter: (content: string) => `<div id='passage-footer'>\n<<maplebirchFooter>>\n${content}\n</div>`,
      default: (content: string) => `<div id='passage-content'>\n<<= maplebirch.dynamic.trigger('interrupt')>>\n${content}\n<<= maplebirch.dynamic.trigger('overlay')>>\n</div>`
    };
    const wrapper = wrappers[title] || wrappers['default'];
    passage.content = wrapper(passage.content);
    return passage;
  }

  #applyContentPatches(passage: { content: string }, title: string, patchSets: Record<string, PatchSet[]>) {
    if (!patchSets || !patchSets[title]) return passage;
    let source = String(passage.content);
    for (const set of patchSets[title]) source = this.#matchAndApply(set, source);
    passage.content = source;
    return passage;
  }

  async #patchPassage(type: 'before' | 'after', passage: any, title: string) {
    if (!this.patchedPassage.has(title) && type === 'before') {
      if (this.core.lodash.includes(passage.tags, 'widget')) {
        if (!this.core.lodash.isEmpty(this.widgetPassage)) this.#applyContentPatches(passage, title, this.widgetPassage);
      } else {
        if (!this.core.lodash.isEmpty(this.locationPassage)) this.#applyContentPatches(passage, title, this.locationPassage);
      }
      this.patchedPassage.add(title);
    }
    if (type === 'after' && !this.core.lodash.includes(passage.tags, 'widget')) this.#wrapSpecialPassages(passage, title);
    return passage;
  }

  async #widgetInit(passageData: Map<string, any>) {
    this.widgethtml = this.#widgets + this.#specials;
    // prettier-ignore
    const data = {
      id       : 0,
      name     : 'Maplebirch Frameworks Widgets',
      position : '100,100',
      size     : '100,100',
      tags     : ['widget'],
      content  : this.widgethtml
    };
    passageData.set('Maplebirch Frameworks Widgets', data);
    this.log('创建宏部件段落: Maplebirch Frameworks Widgets', 'DEBUG', [clone(this.widgethtml)]);
    const storyInit = passageData.get('StoryInit');
    if (!this.core.lodash.isNil(storyInit)) {
      storyInit.content += '\n<<maplebirchInit>>\n';
      passageData.set('StoryInit', storyInit);
    }
    return passageData;
  }

  async patchModToGame(manager: AddonPlugin, type: 'before' | 'after') {
    const oldSCdata = manager.gSC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const passageData = SCdata.passageDataItems.map;
    if (type === 'before') await this.#widgetInit(passageData).then(() => (this.widgethtml = ''));
    for (const [title, passage] of passageData) {
      try {
        await this.#patchPassage(type, passage, title);
      } catch (e: any) {
        const errorMsg = this.core.lodash.has(e, 'message') ? e.message : e;
        this.log(`处理段落 ${title} 时出错: ${errorMsg}`, 'ERROR');
        manager.log(`PatchScene: ${title} ${errorMsg}`);
      } finally {
        this.patchedPassage.clear();
      }
    }
    SCdata.passageDataItems.back2Array();
    manager.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
    this.log('框架补丁应用完成', 'DEBUG');
  }
}
