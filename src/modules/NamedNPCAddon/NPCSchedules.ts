// ./src/modules/NamedNPCAddon/NPCSchedules.ts

import maplebirch from '../../core';
import type NPCManager from '../NamedNPC';

export interface ScheduleCondition {
  (date: EnhancedDate): boolean;
}

export type ScheduleTime = number | [number, number?];
export type ScheduleLocation = string | ((date: EnhancedDate) => string | Schedule | void | null | undefined);
export type ScheduleBuilder = (schedule: Schedule) => void | Schedule;

export interface SpecialSchedule {
  id: string | number;
  condition: ScheduleCondition;
  location: ScheduleLocation;
  before?: string | number;
  after?: string | number;
  insteadOf?: string | number;
  override?: boolean;
}

export interface DailyScheduleConfig {
  time: ScheduleTime;
  location: string;
}

export interface SpecialScheduleConfig extends Partial<Omit<SpecialSchedule, 'condition' | 'location'>> {
  condition: ScheduleCondition;
  location: ScheduleLocation;
}

export interface ScheduleConfig {
  daily?: DailyScheduleConfig[];
  special?: SpecialScheduleConfig[];
}

export interface EnhancedDate extends DateTime {
  schedule: Schedule;
  schoolDay: boolean;
  spring: boolean;
  summer: boolean;
  autumn: boolean;
  winter: boolean;
  dawn: boolean;
  daytime: boolean;
  dusk: boolean;
  night: boolean;
  weekEnd: boolean;
  isAt(time: ScheduleTime): boolean;
  isAfter(time: ScheduleTime): boolean;
  isBefore(time: ScheduleTime): boolean;
  isBetween(start: ScheduleTime, end: ScheduleTime): boolean;
  isHour(...hours: number[]): boolean;
  isHourBetween(start: number, end: number): boolean;
  isMinuteBetween(start: number, end: number): boolean;
  [key: string]: any;
}

const schedules = new Map<string, Schedule>();
let nextId = 0;
let enhancedDateProto: EnhancedDate | null = null;

export class Schedule {
  daily: string[] = Array(24).fill('');
  specials: SpecialSchedule[] = [];
  sortedSpecials: SpecialSchedule[] | null = null;

  at(scheduleConfig: ScheduleTime, location: string): this {
    const setHour = (hour: number) => {
      if (Number.isInteger(hour) && hour >= 0 && hour <= 23) this.daily[hour] = location;
    };

    if (Array.isArray(scheduleConfig)) {
      const [start, end = start] = scheduleConfig;
      if (start > end) {
        maplebirch.npc.log('起始时间不能大于结束时间', 'ERROR');
        return this;
      }
      for (let hour = start; hour <= end; hour++) setHour(hour);
    } else {
      setHour(scheduleConfig);
    }

    return this;
  }

  when(condition: ScheduleCondition, location: ScheduleLocation, options: Partial<Omit<SpecialSchedule, 'condition' | 'location'>> = {}): this {
    this.specials.push({
      id: options.id ?? nextId++,
      condition,
      location,
      before: options.before,
      after: options.after,
      insteadOf: options.insteadOf,
      override: options.override
    });
    this.sortedSpecials = null;
    return this;
  }

  update(specialId: string | number, updates: Partial<Omit<SpecialSchedule, 'id'>>): this {
    const special = this.specials.find(s => s.id === specialId);
    if (special) {
      Object.assign(special, updates);
      this.sortedSpecials = null;
    }
    return this;
  }

  remove(specialId: string | number): this {
    this.specials = this.specials.filter(s => s.id !== specialId);
    this.sortedSpecials = null;
    return this;
  }

  sortSpecials() {
    if (this.sortedSpecials) return;
    const overrides = this.specials.filter(s => s.override);
    const nonOverrides = this.specials.filter(s => !s.override);
    this.sortedSpecials = [...overrides, ...this.topologicalSort(nonOverrides)];
  }

  topologicalSort(items: SpecialSchedule[]) {
    const graph = new Map<string | number, Set<string | number>>();
    const inDegree = new Map<string | number, number>();
    const idToItem = new Map<string | number, SpecialSchedule>();

    items.forEach(item => {
      graph.set(item.id, new Set());
      inDegree.set(item.id, 0);
      idToItem.set(item.id, item);
    });

    const addEdge = (from: string | number, to: string | number) => {
      graph.get(from)?.add(to);
      inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
    };

    items.forEach(item => {
      if (item.before != null && idToItem.has(item.before)) addEdge(item.id, item.before);
      if (item.after != null && idToItem.has(item.after)) addEdge(item.after, item.id);
      if (item.insteadOf != null && idToItem.has(item.insteadOf)) addEdge(item.id, item.insteadOf);
    });

    const queue = Array.from(inDegree.entries())
      .filter(([, degree]) => degree === 0)
      .map(([id]) => id);
    const sorted: SpecialSchedule[] = [];

    while (queue.length) {
      const current = queue.shift()!;
      const item = idToItem.get(current);
      if (item) sorted.push(item);
      for (const neighbor of graph.get(current) ?? []) {
        const degree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, degree);
        if (degree === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== items.length) {
      maplebirch.npc.log('NPCSchedules: 条件依赖存在环', 'WARN');
      return items;
    }

    return sorted;
  }

  get location(): string {
    const date = new DateTime(Time.date);
    if (this.specials.length > 0) {
      this.sortSpecials();
      for (const special of this.sortedSpecials ?? []) {
        const enhancedDate = this.createEnhancedDate(date);
        try {
          if (special.condition(enhancedDate)) return this.resolveLocation(special.location, enhancedDate);
        } catch (e) {
          maplebirch.npc.log('NPCSchedules: condition', 'ERROR', e);
        }
      }
    }
    return this.daily[Time.date.hour] ?? '';
  }

  resolveLocation(loc: ScheduleLocation, date: EnhancedDate): string {
    try {
      if (typeof loc === 'function') {
        const result = loc(date);
        if (result instanceof Schedule) return result.location;
        if (typeof result === 'string') return result;
        if (result != null) return String(result);
        return date.schedule instanceof Schedule ? date.schedule.location : '';
      }
      return typeof loc === 'string' ? loc : String(loc ?? '');
    } catch (e) {
      maplebirch.npc.log('NPCSchedules: resolveLocation', 'ERROR', e);
      return '';
    }
  }

  createEnhancedDate(date: DateTime): EnhancedDate {
    if (!enhancedDateProto) enhancedDateProto = this.buildEnhancedDateProto();
    const enhancedDate = Object.create(enhancedDateProto) as EnhancedDate;
    Object.defineProperty(enhancedDate, 'schedule', {
      value: new Schedule(),
      configurable: true
    });

    // prettier-ignore
    const specialProps = {
      schoolDay: () => Time.schoolDay,
      spring   : () => Time.season === 'spring',
      summer   : () => Time.season === 'summer',
      autumn   : () => Time.season === 'autumn',
      winter   : () => Time.season === 'winter',
      dawn     : () => Time.dayState === 'dawn',
      daytime  : () => Time.dayState === 'day',
      dusk     : () => Time.dayState === 'dusk',
      night    : () => Time.dayState === 'night',
      weekEnd  : () => Time.date.weekEnd
    };

    for (const [prop, getter] of Object.entries(specialProps)) {
      Object.defineProperty(enhancedDate, prop, {
        get: getter,
        configurable: true
      });
    }

    for (const key in date) {
      if (Object.prototype.hasOwnProperty.call(enhancedDate, key)) continue;
      Object.defineProperty(enhancedDate, key, {
        get: () => (date as any)[key],
        configurable: true
      });
    }

    for (const key in Time) {
      if (typeof (Time as any)[key] === 'function') continue;
      if (Object.prototype.hasOwnProperty.call(enhancedDate, key)) continue;
      Object.defineProperty(enhancedDate, key, {
        get: () => (Time as any)[key],
        configurable: true
      });
    }

    return enhancedDate;
  }

  buildEnhancedDateProto(): EnhancedDate {
    const proto = Object.create(null) as EnhancedDate;
    const toMinutes = (time: ScheduleTime): number => {
      return Array.isArray(time) ? time[0] * 60 + (time[1] ?? 0) : time * 60;
    };

    proto.isAt = function (time: ScheduleTime): boolean {
      const [hour, minute = 0] = Array.isArray(time) ? time : [time, 0];
      return this.hour === hour && this.minute === minute;
    };

    proto.isAfter = function (time: ScheduleTime): boolean {
      return this.hour * 60 + this.minute > toMinutes(time);
    };

    proto.isBefore = function (time: ScheduleTime): boolean {
      return this.hour * 60 + this.minute < toMinutes(time);
    };

    proto.isBetween = function (start: ScheduleTime, end: ScheduleTime): boolean {
      const current = this.hour * 60 + this.minute;
      return current >= toMinutes(start) && current <= toMinutes(end);
    };

    proto.isHour = function (...hours: number[]): boolean {
      return hours.includes(this.hour);
    };

    proto.isHourBetween = function (start: number, end: number): boolean {
      return this.hour >= start && this.hour <= end;
    };

    proto.isMinuteBetween = function (start: number, end: number): boolean {
      return this.minute >= start && this.minute <= end;
    };

    return proto;
  }
}

const NPCSchedules = ((core: typeof maplebirch) => {
  function initData(manager: NPCManager) {
    if (!Array.isArray(manager.NPCNameList)) {
      manager.log('NPCSchedules: 需要传入NPC名称数组', 'WARN');
      return false;
    }
    for (const npcName of manager.NPCNameList) if (!schedules.has(npcName)) schedules.set(npcName, new Schedule());
    return true;
  }

  function setData(npcName: string, config: ScheduleConfig | ScheduleBuilder) {
    const schedule = new Schedule();
    schedules.set(npcName, schedule);
    if (typeof config === 'function') {
      const result = config(schedule);
      return result instanceof Schedule ? result : schedule;
    }
    config.daily?.forEach(({ time, location }) => {
      schedule.at(time, location);
    });
    config.special?.forEach(({ condition, location, ...options }) => {
      schedule.when(condition, location, options);
    });
    return schedule;
  }

  function getData(npcName: string) {
    if (!schedules.has(npcName)) schedules.set(npcName, new Schedule());
    return schedules.get(npcName)!;
  }

  function updateData(npcName: string, specialId: string | number, updates: Partial<Omit<SpecialSchedule, 'id'>>) {
    if (!schedules.has(npcName)) schedules.set(npcName, new Schedule());
    const schedule = schedules.get(npcName)!;
    schedule.update(specialId, updates);
    return schedule;
  }

  function removeData(npcName: string, specialId: string | number) {
    if (!schedules.has(npcName)) schedules.set(npcName, new Schedule());
    const schedule = schedules.get(npcName)!;
    schedule.remove(specialId);
    return schedule;
  }

  function clearSchedule(npcName: string) {
    schedules.set(npcName, new Schedule());
    return schedules.get(npcName)!;
  }

  function npcSchedule() {
    const result: Record<string, string> = {};
    for (const [npcName, schedule] of schedules) result[npcName] = schedule.location;
    return result;
  }

  // prettier-ignore
  Object.defineProperties(Schedule, {
    schedules: { get: () => schedules },
    init     : { value: initData },
    set      : { value: setData },
    get      : { value: getData },
    update   : { value: updateData },
    remove   : { value: removeData },
    clear    : { value: clearSchedule },
    clearAll : { value: () => schedules.clear() },
    npcList  : { get: () => Array.from(schedules.keys()) },
    location : { get: npcSchedule }
  });

  // prettier-ignore
  return Schedule as typeof Schedule & {
    readonly schedules: Map<string, Schedule>;
    init    : typeof initData;
    set     : typeof setData;
    get     : typeof getData;
    update  : typeof updateData;
    remove  : typeof removeData;
    clear   : typeof clearSchedule;
    clearAll: () => void;
    readonly npcList: string[];
    readonly location: Record<string, string>;
  };
})(maplebirch);

export default NPCSchedules;
