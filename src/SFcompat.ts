// ./src/SFcompat.ts

import maplebirch from './core';

interface TimeData {
  prevDate?: Date;
  prev?: Date;
  currentDate?: Date;
  current?: Date;
  option?: any;
  [key: string]: any;
}

interface TimeEventOptions {
  once?: boolean;
  exact?: boolean;
  priority?: number;
}

const _ = maplebirch.lodash;

// prettier-ignore
const zoneMap: Record<string, string> = {
  ModStatusBar  : 'StatusBar',
  ModMenuBig    : 'MenuBig',
  ModMenuSmall  : 'MenuSmall',
  iModInit      : 'Init',
  iModHeader    : 'Header',
  iModFooter    : 'Footer',
  iModOptions   : 'Options',
  iModSettings  : 'Settings',
  iModCheats    : 'Cheats',
  iModStatus    : 'Status',
  iModFame      : 'Fame',
  iModStatist   : 'Statistics',
  iModReady     : 'State',
  iModExtraStatist: 'Statistics',
  iModInformation : 'Information',
  ExtraLinkZone   : 'AfterLinkZone',
  ModCaptionAfterDescription: 'CaptionAfterDescription',
};

// prettier-ignore
const methodPaths: Record<string, string> = {
  addTimeEvent   :'dynamic.regTimeEvent'      , // 添加时间事件
  addStateEvent  :'dynamic.regStateEvent'     , // 添加状态事件
  addWeatherEvent:'dynamic.regWeatherEvent'   , // 添加天气事件
  timeTravel     :'dynamic.timeTravel'        , // 时间旅行
  useLayer       :'char.use'                  , // 图层注册
  migration      :'tool.migration.create'     , // 创建迁移实例
  rand           :'tool.rand.create'          , // 创建随机实例
  addText        :'tool.text.reg'             , // 注册文本片段
  addto          :'tool.addTo'                , // 添加到区域
  onInit         :'tool.onInit'               , // 初始化回调
  addTraits      :'tool.other.addTraits'      , // 添加特质
  addLocation    :'tool.other.configureLocation', // 配置位置
  addBodywriting :'tool.other.addBodywriting' , // 添加涂鸦
  addNPC         :'npc.add'                   , // 添加NPC
  addNPCStats    :'npc.addStats'              , // 添加状态
  addNPCClothes  :'npc.addClothes'            , // 添加服装
  addNPCSchedule :'npc.addSchedule'           , // 添加日程
  addTransform   :'char.transformation.add'   , // 添加转化
  addAction      :'combat.CombatAction.reg'   , // 添加战斗按钮
};

interface SimpleFrameworks {
  addTimeEvent: (...args: any[]) => any;
  addStateEvent: (...args: any[]) => any;
  addWeatherEvent: (...args: any[]) => any;
  timeTravel: (...args: any[]) => any;
  migration: (...args: any[]) => any;
  rand: (...args: any[]) => any;
  addText: (...args: any[]) => any;
  addto: (zoneName: string, ...args: any[]) => any;
  onInit: (...args: any[]) => any;
  addTraits: (...args: any[]) => any;
  addLocation: (...args: any[]) => any;
  addBodywriting: (...args: any[]) => any;
  addNPC: (...args: any[]) => any;
  addNPCStats: (...args: any[]) => any;
  addNPCClothes: (...args: any[]) => any;
  addNPCSchedule: (...args: any[]) => any;
  addTransform: (...args: any[]) => any;
  addAction: (...args: any[]) => any;
  [key: string]: any;
}

const createFrameworkProxy = (): SimpleFrameworks => {
  const _ = maplebirch.lodash;

  return new Proxy({} as SimpleFrameworks, {
    get: (target, prop: string) => {
      if (_.has(methodPaths, prop)) {
        return (...args: any[]) => {
          const path = methodPaths[prop];
          const method = _.get(maplebirch, path);
          if (!_.isFunction(method)) return false;
          if (prop === 'addto') {
            const [zoneName, ...restArgs] = args;
            const targetZone = _.get(zoneMap, zoneName, zoneName);
            return method.call(_.get(maplebirch, path.split('.').slice(0, -1).join('.')), targetZone, ...restArgs);
          }
          const contextPath = path.split('.').slice(0, -1).join('.');
          const context = contextPath ? _.get(maplebirch, contextPath) : maplebirch;
          return method.call(context || maplebirch, ...args);
        };
      }
      return _.get(maplebirch, prop);
    },

    set: (target, prop: string, value: any) => {
      _.set(maplebirch, prop, value);
      return true;
    }
  });
};

class TimeEvent {
  private type: string;
  private eventId: string;
  private _cond: (timeData: TimeData) => boolean;
  private _action: (timeData: TimeData) => void;
  private _options: TimeEventOptions;
  private readonly _: any;

  constructor(type: string, eventId: string) {
    this.type = type;
    this.eventId = eventId;
    this._cond = () => true;
    this._action = () => {};
    this._options = { exact: true };
  }

  Cond(func: (timeData: TimeData) => boolean): TimeEvent {
    this._cond = func;
    return this;
  }

  Action(func: (timeData: TimeData) => void): TimeEvent {
    this._action = func;
    this._register();
    return this;
  }

  once(isOnce: boolean = true): TimeEvent {
    this._options.once = isOnce;
    return this;
  }

  priority(priority: number): TimeEvent {
    this._options.priority = priority;
    return this;
  }

  private _register(): void {
    const convertTimeData = (timeData: any): TimeData => {
      const result = _.clone(timeData);
      result.prev = timeData.prevDate || timeData.prev;
      result.current = timeData.currentDate || timeData.current;
      result.option = {};
      return result;
    };

    maplebirch.dynamic.regTimeEvent(
      this.type,
      this.eventId,
      _.assign(
        {
          cond: (timeData: any) => this._cond(convertTimeData(timeData)),
          action: (timeData: any) => this._action(convertTimeData(timeData))
        },
        this._options
      )
    );
  }
}

(() => {
  'use strict';
  _.set(window, 'simpleFrameworks', createFrameworkProxy());
  _.set(window, 'maplebirchFrameworks', createFrameworkProxy());
  _.set(window, 'TimeEvent', TimeEvent);
})();
