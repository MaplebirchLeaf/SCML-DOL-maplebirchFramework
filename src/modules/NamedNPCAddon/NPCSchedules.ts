// ./src/modules/NamedNPCAddon/NPCSchedules.ts

import maplebirch from '../../core';
import NPCManager from '../NamedNPC';

export interface ScheduleCondition {
  (date: EnhancedDate): boolean;
}

export type ScheduleTime = number | [number, number?];
export type ScheduleLocation = string | ((date: EnhancedDate) => string | Schedule);

export interface SpecialSchedule {
  id: string | number;
  condition: ScheduleCondition;
  location: ScheduleLocation;
  before?: string | number;
  after?: string | number;
  insteadOf?: string | number;
  override?: boolean;
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

const _ = maplebirch.lodash;
const schedules = new Map<string, Schedule>();
let nextId = 0;
let enhancedDateProto: EnhancedDate | null = null;

class Schedule {
  daily: string[] = Array(24).fill('');
  specials: SpecialSchedule[] = [];
  sortedSpecials: SpecialSchedule[] | null = null;

  at(scheduleConfig: ScheduleTime, location: string): this {
    if (Array.isArray(scheduleConfig) && scheduleConfig.length === 2) {
      const [start, end] = scheduleConfig as [number, number?];
      if (start > (end ?? start)) {
        maplebirch.npc.log('起始时间不能大于结束时间', 'ERROR');
        return this;
      }
      _.range(start, (end ?? start) + 1).forEach(hour => {
        if (hour >= 0 && hour <= 23) this.daily[hour] = location;
      });
    } else if (_.isNumber(scheduleConfig)) {
      if (scheduleConfig >= 0 && scheduleConfig <= 23) this.daily[scheduleConfig] = location;
    }
    return this;
  }

  when(condition: ScheduleCondition, location: ScheduleLocation, id?: string | number, options: Partial<Omit<SpecialSchedule, 'condition' | 'location'>> = {}): this {
    this.specials.push({ id: id || (nextId++).toString(), condition, location, ...options });
    this.sortedSpecials = null;
    return this;
  }

  update(specialId: string | number, updates: Partial<Omit<SpecialSchedule, 'id'>>): this {
    const special = _.find(this.specials, s => s.id === specialId);
    if (special) {
      _.assign(special, updates);
      this.sortedSpecials = null;
    }
    return this;
  }

  remove(specialId: string | number): this {
    this.specials = _.filter(this.specials, s => s.id !== specialId);
    this.sortedSpecials = null;
    return this;
  }

  sortSpecials() {
    if (this.sortedSpecials) return;
    const overrides = _.filter(this.specials, s => s.override);
    const nonOverrides = _.filter(this.specials, s => !s.override);
    this.sortedSpecials = [...overrides, ...this.topologicalSort(nonOverrides)];
  }

  topologicalSort(items: SpecialSchedule[]) {
    const graph = new Map<string | number, Set<string | number>>();
    const inDegree = new Map<string | number, number>();
    const idToItem = new Map<string | number, SpecialSchedule>();

    _.forEach(items, item => {
      graph.set(item.id, new Set());
      inDegree.set(item.id, 0);
      idToItem.set(item.id, item);
    });

    _.forEach(items, item => {
      const addEdge = (from: string | number, to: string | number) => {
        graph.get(from)!.add(to);
        inDegree.set(to, (inDegree.get(to) || 0) + 1);
      };
      if (item.before && idToItem.has(item.before)) addEdge(item.id, item.before);
      if (item.after && idToItem.has(item.after)) addEdge(item.after, item.id);
      if (item.insteadOf && idToItem.has(item.insteadOf)) addEdge(item.id, item.insteadOf);
    });

    const queue = _.chain(Array.from(inDegree.entries()))
      .filter(([_, degree]) => degree === 0)
      .map(([id]) => id)
      .value();
    const sorted: SpecialSchedule[] = [];

    while (queue.length) {
      const current = queue.shift()!;
      sorted.push(idToItem.get(current)!);
      for (const neighbor of graph.get(current) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== items.length) maplebirch.npc.log('NPCSchedules: 条件依赖存在环', 'WARN');
    return sorted.length === items.length ? sorted : items;
  }

  get location(): string {
    const date = new DateTime(Time.date);
    if (this.specials.length > 0) {
      this.sortSpecials();
      for (const special of this.sortedSpecials!) {
        const enhancedDate = this.createEnhancedDate(date);
        if (special.condition(enhancedDate)) return this.resolveLocation(special.location, date);
      }
    }
    return this.daily[Time.date.hour] ?? '';
  }

  resolveLocation(loc: ScheduleLocation, date: DateTime): string {
    try {
      if (_.isFunction(loc)) {
        const enhancedDate = this.createEnhancedDate(date);
        const result = loc(enhancedDate);
        if (!_.isNil(result)) {
          if (result instanceof Schedule) return result.location;
          if (_.isString(result)) return result;
          return String(result);
        }
        if (enhancedDate.schedule && enhancedDate.schedule instanceof Schedule) return enhancedDate.schedule.location;
        return '';
      }
      return _.isString(loc) ? loc : String(loc || '');
    } catch (e) {
      maplebirch.npc.log('NPCSchedules: resolveLocation', 'ERROR', e);
      return '';
    }
  }

  createEnhancedDate(date: DateTime): EnhancedDate {
    if (!enhancedDateProto) enhancedDateProto = this.buildEnhancedDateProto();
    const enhancedDate = Object.create(enhancedDateProto) as EnhancedDate;
    const schedule = new Schedule();
    Object.defineProperty(enhancedDate, 'schedule', { value: schedule });

    // prettier-ignore
    const specialProps = {
			schoolDay: () => Time.schoolDay,
			spring:    () => Time.season === 'spring',
			summer:    () => Time.season === 'summer',
			autumn:    () => Time.season === 'autumn',
			winter:    () => Time.season === 'winter',
			dawn:      () => Time.dayState === 'dawn',
			daytime:   () => Time.dayState === 'day',
			dusk:      () => Time.dayState === 'dusk',
			night:     () => Time.dayState === 'night',
			weekEnd:   () => Time.date.weekEnd
		};

    for (const [prop, getter] of Object.entries(specialProps)) {
      if (!Object.prototype.hasOwnProperty.call(enhancedDate, prop)) {
        Object.defineProperty(enhancedDate, prop, { get: getter });
      }
    }

    for (const key in date) {
      if (!Object.prototype.hasOwnProperty.call(enhancedDate, key)) {
        Object.defineProperty(enhancedDate, key, {
          get: function () {
            return (date as any)[key];
          }
        });
      }
    }

    for (const key in Time) {
      if (typeof (Time as any)[key] !== 'function' && !Object.prototype.hasOwnProperty.call(enhancedDate, key)) {
        Object.defineProperty(enhancedDate, key, {
          get: function () {
            return (Time as any)[key];
          }
        });
      }
    }

    return enhancedDate;
  }

  buildEnhancedDateProto(): EnhancedDate {
    const proto = Object.create(null) as EnhancedDate;
    const toMinutes = (time: ScheduleTime): number => {
      return Array.isArray(time) ? time[0] * 60 + (time[1] || 0) : time * 60;
    };

    proto.isAt = function (time: ScheduleTime): boolean {
      return this.hour === (Array.isArray(time) ? time[0] : time) && this.minute === (Array.isArray(time) ? time[1] || 0 : 0);
    };

    proto.isAfter = function (time: ScheduleTime): boolean {
      return this.hour * 60 + this.minute > toMinutes(time);
    };

    proto.isBefore = function (time: ScheduleTime): boolean {
      return this.hour * 60 + this.minute < toMinutes(time);
    };

    proto.isBetween = function (start: ScheduleTime, end: ScheduleTime): boolean {
      return this.hour * 60 + this.minute >= toMinutes(start) && this.hour * 60 + this.minute <= toMinutes(end);
    };

    proto.isHour = function (...hours: number[]): boolean {
      return _.includes(hours, this.hour);
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
    if (!_.isArray(manager.NPCNameList)) {
      manager.log('NPCSchedules: 需要传入NPC名称数组', 'WARN');
      return false;
    }
    for (const npcName of manager.NPCNameList) if (!schedules.has(npcName)) schedules.set(npcName, new Schedule());
    return true;
  }

  function addData(
    npcName: string,
    scheduleConfig: ScheduleTime | ScheduleCondition,
    location: string | ScheduleLocation,
    id?: string | number,
    options: Partial<Omit<SpecialSchedule, 'condition' | 'location'>> = {}
  ) {
    if (!schedules.has(npcName)) schedules.set(npcName, new Schedule());
    const schedule = schedules.get(npcName)!;

    if (_.isFunction(scheduleConfig)) {
      schedule.when(scheduleConfig, location, id, options);
    } else {
      if (_.isString(location)) {
        schedule.at(scheduleConfig, location);
      } else {
        core.npc.log('使用 at 方法时，location 必须为字符串', 'ERROR');
      }
    }
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
    if (schedules.has(npcName)) schedules.set(npcName, new Schedule());
    return schedules.get(npcName)!;
  }

  function npcSchedule() {
    const result: Record<string, string> = {};
    for (const [npcName, schedule] of schedules) result[npcName] = schedule.location;
    return result;
  }

  // prettier-ignore
  Object.defineProperties(Schedule, {
		schedules:  { get: () => schedules },
		init:       { value: initData },
		add:        { value: addData },
		get:        { value: getData },
		update:     { value: updateData },
		remove:     { value: removeData },
		clear:      { value: clearSchedule },
		clearAll:   { value: schedules.clear.bind(schedules) },
		npcList:    { get: () => Array.from(schedules.keys()) },
		location:   { get: npcSchedule },
	});

  // prettier-ignore
  return Schedule as typeof Schedule & {
		readonly schedules: Map<string, Schedule>;
		init:   typeof initData;
		add:    typeof addData;
		get:    typeof getData;
		update: typeof updateData;
		remove: typeof removeData;
		clear:  typeof clearSchedule;
		clearAll: () => void;
		readonly npcList: string[];
		readonly location: Record<string, string>;
	};
})(maplebirch);

export default NPCSchedules;
