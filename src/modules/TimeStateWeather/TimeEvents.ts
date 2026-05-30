// .src/modules/TimeStateWeather/TimeEvents.ts

import { TimeConstants } from '../../constants';
import maplebirch from '../../core';
import type DynamicManager from '../Dynamic';
import patchDateTime from './DateTime';
import patchTime from './Time';

type TimeEventType = 'onSec' | 'onMin' | 'onHour' | 'onDay' | 'onWeek' | 'onMonth' | 'onYear' | 'onBefore' | 'onThread' | 'onAfter' | 'onTimeTravel';

type TimeUnit = 'sec' | 'min' | 'hour' | 'day' | 'week' | 'month' | 'year';

interface DateLike {
  hour: number;
  day: number;
  month: number;
  year: number;
  timeStamp: number;
  minute?: number;
  second?: number;
}

interface AccumulateConfig {
  unit: TimeUnit;
  target?: number;
}

interface PassSnapshot {
  prevDate: DateTime;
  seconds: number;
}

export interface TimeData {
  prevDate?: DateLike;
  currentDate?: DateLike;
  changes?: Record<TimeUnit, number>;
  triggeredByAccumulator?: { unit: TimeUnit; target: number; count: number };
  exactPoints?: { hour: boolean; day: boolean; week: boolean; month: boolean; year: boolean };
  passed?: number;
  sec?: number;
  min?: number;
  hour?: number;
  day?: number;
  week?: number;
  month?: number;
  year?: number;
  weekday?: [number, number];
  detailedDiff?: any;
  timeStamp?: number;
  prev?: DateTime;
  current?: DateTime;
  diffSeconds?: number;
  direction?: 'forward' | 'backward';
  isLeap?: boolean;
}

export interface TimeEventOptions {
  action?: (data: TimeData) => void;
  cond?: (data: TimeData) => boolean;
  priority?: number;
  once?: boolean;
  accumulate?: AccumulateConfig;
  exact?: boolean;
}

export interface TimeTravelOptions {
  target?: DateTime;
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  addYears?: number;
  addMonths?: number;
  addDays?: number;
  addHours?: number;
  addMinutes?: number;
  addSeconds?: number;
}

class TimeEvent {
  private action?: (data: TimeData) => void;
  private cond: (data: TimeData) => boolean;
  private once: boolean;
  private exact: boolean;
  private accumulate?: AccumulateConfig;
  private accumulated = 0;
  private target = 1;
  readonly priority: number;

  constructor(
    readonly id: string,
    readonly type: TimeEventType,
    options: TimeEventOptions = {}
  ) {
    this.action = options.action;
    this.cond = options.cond || (() => true);
    this.priority = options.priority ?? 0;
    this.once = !!options.once;
    this.exact = !!options.exact;
    this.accumulate = options.accumulate;
    if (this.accumulate) this.target = Math.max(1, Math.floor(this.accumulate.target || 1));
  }

  tryRun(data: TimeData): boolean {
    if (this.exact && !this.isExactPoint(data)) return false;
    if (this.accumulate) return this.runAccumulated(data);
    return this.execute(data);
  }

  private runAccumulated(data: TimeData): boolean {
    const accumulate = this.accumulate!;
    const delta = data.changes?.[accumulate.unit] || 0;
    if (delta <= 0) return false;
    this.accumulated += delta;
    if (this.accumulated < this.target) return false;
    const count = Math.floor(this.accumulated / this.target);
    this.accumulated %= this.target;
    return this.execute({
      ...data,
      triggeredByAccumulator: {
        unit: accumulate.unit,
        target: this.target,
        count
      }
    });
  }

  private execute(data: TimeData): boolean {
    if (!this.match(data) || !this.action) return false;
    this.runAction(data);
    return this.once;
  }

  private match(data: TimeData): boolean {
    try {
      return !!this.cond(data);
    } catch (e) {
      maplebirch.log(`[TimeEvent:${this.id}] cond error:`, 'ERROR', e);
      return false;
    }
  }

  private runAction(data: TimeData): void {
    try {
      this.action?.(data);
    } catch (e) {
      maplebirch.log(`[TimeEvent:${this.id}] action error:`, 'ERROR', e);
    }
  }

  private isExactPoint(data: TimeData): boolean {
    if (!data.prevDate || !data.currentDate) return false;
    switch (this.type) {
      case 'onHour':
        return !!data.exactPoints?.hour;
      case 'onDay':
        return !!data.exactPoints?.day;
      case 'onWeek':
        return !!data.exactPoints?.week;
      case 'onMonth':
        return !!data.exactPoints?.month;
      case 'onYear':
        return !!data.exactPoints?.year;
      case 'onSec':
      case 'onMin':
        return (data.diffSeconds || 0) !== 0;
      default:
        return true;
    }
  }
}

export class TimeManager {
  private readonly eventTypes: TimeEventType[] = ['onSec', 'onMin', 'onHour', 'onDay', 'onWeek', 'onMonth', 'onYear', 'onBefore', 'onThread', 'onAfter', 'onTimeTravel'];
  private readonly timeEvents: Record<string, Map<string, TimeEvent>> = {};
  private readonly sortedEventsCache: Record<string, TimeEvent[] | null> = {};

  private readonly vanillaTime = {
    pass: null as ((seconds: number) => any) | null,
    setDate: null as ((date: DateTime) => void) | null
  };

  private doLPassHookInstalled = false;
  private passSnapshots: PassSnapshot[] = [];

  readonly log: (message: string, level?: string, ...objects: any[]) => void;

  constructor(private readonly manager: DynamicManager) {
    this.log = manager.log;
    for (const type of this.eventTypes) {
      this.timeEvents[type] = new Map();
      this.sortedEventsCache[type] = null;
    }
  }

  init(): void {
    try {
      patchDateTime();
      patchTime();
      this.saveTime();
      Time.pass = (seconds: number) => this.handleTimePass(seconds);
      Time.timeTravel = (date: DateTime) => this.handleTimeTravel(date);
      this.log('时间事件系统已激活', 'INFO');
    } catch (e: any) {
      this.log(`初始化时间事件系统失败: ${e.message}`, 'ERROR');
    }
  }

  register(type: string, eventId: string, options: TimeEventOptions): boolean {
    if (!this.timeEvents[type]) {
      this.log(`未知的时间事件类型: ${type}`, 'ERROR');
      return false;
    }
    if (this.timeEvents[type].has(eventId)) {
      this.log(`事件ID已存在: ${type}.${eventId}`, 'WARN');
      return false;
    }
    this.timeEvents[type].set(eventId, new TimeEvent(eventId, type as TimeEventType, options));
    this.sortedEventsCache[type] = null;
    this.log(`注册时间事件: ${type}.${eventId}`, 'DEBUG');
    return true;
  }

  unregister(type: string, eventId: string): boolean {
    if (!this.timeEvents[type]) {
      this.log(`事件类型不存在: ${type}`, 'WARN');
      return false;
    }
    const deleted = this.timeEvents[type].delete(eventId);
    if (deleted) {
      this.sortedEventsCache[type] = null;
      this.log(`注销时间事件: ${type}.${eventId}`, 'DEBUG');
      return true;
    }
    this.log(`未找到事件: ${type}.${eventId}`, 'WARN');
    return false;
  }

  timeTravel(options: TimeTravelOptions = {}): boolean {
    try {
      this.handleTimeTravel(this.targetDate(options));
      return true;
    } catch (e: any) {
      this.log(`时间跳转失败: ${e.message}`, 'ERROR');
      return false;
    }
  }

  updateTimeLanguage(choice?: 'JournalTime'): string | boolean {
    if (choice !== 'JournalTime') return false;
    const date = new window.DateTime(Time.date);
    const year = Math.abs(date.year);
    const eraEN = date.year > 0 ? 'AD' : 'BC';
    const eraCN = date.year > 0 ? '公元' : '公元前';
    return lanSwitch(`It is ${getFormattedDate(date)}, ${year}${eraEN}.`, `今天是${eraCN}${year}年${date.month}月${date.day}日。`);
  }

  private saveTime(): void {
    if (!this.vanillaTime.pass && typeof Time.pass === 'function') this.vanillaTime.pass = Time.pass.bind(time);
    if (!this.vanillaTime.setDate && typeof Time.setDate === 'function') this.vanillaTime.setDate = Time.setDate.bind(time);
  }

  private handleTimePass(seconds: number): any {
    const pass = this.vanillaTime.pass;
    const setDate = this.vanillaTime.setDate;
    if (!pass || !setDate) return;
    if (!Number.isFinite(seconds) || seconds < 0) return;
    const prevDate = new window.DateTime(Time.date);
    const targetDate = new window.DateTime(prevDate).addSeconds(seconds);
    this.trigger('onBefore', {
      passed: seconds,
      timeStamp: V.timeStamp,
      prev: prevDate,
      prevDate
    });
    let passResult: any;
    const useVanilla = prevDate.timeStamp >= TimeConstants.MIN_DATE.timeStamp && targetDate.timeStamp >= TimeConstants.MIN_DATE.timeStamp && targetDate.timeStamp <= TimeConstants.MAX_DATE.timeStamp;
    if (useVanilla) {
      setDate(prevDate);
      passResult = pass(seconds);
    }
    Time.setDate(targetDate);
    const currentDate = new window.DateTime(Time.date);
    const eventData = this.timeData(prevDate, currentDate, seconds);
    this.trigger('onThread', eventData);
    this.triggerUnitEvents(eventData);
    this.trigger('onAfter', eventData);
    return passResult;
  }

  private handleTimeTravel(targetDate: DateTime): void {
    const prevDate = new window.DateTime(Time.date);
    const target = new window.DateTime(targetDate);
    if (target.timeStamp < TimeConstants.MIN_DATE.timeStamp || target.timeStamp > TimeConstants.MAX_DATE.timeStamp) throw new Error(`Invalid time travel target: ${target.timeStamp}`);
    Time.setDate(target);
    const currentDate = new window.DateTime(Time.date);
    const elapsedSeconds = currentDate.timeStamp - prevDate.timeStamp;
    const eventData = this.timeData(prevDate, currentDate, elapsedSeconds);
    this.trigger('onTimeTravel', {
      ...eventData,
      prev: prevDate,
      current: currentDate,
      diffSeconds: elapsedSeconds,
      direction: elapsedSeconds >= 0 ? 'forward' : 'backward',
      isLeap: window.DateTime.isLeapYear(currentDate.year)
    });
  }

  private targetDate(options: TimeTravelOptions): DateTime {
    const current = new window.DateTime(Time.date);
    if (options.target) return new window.DateTime(options.target);
    if (['year', 'month', 'day', 'hour', 'minute', 'second'].some(key => options[key as keyof TimeTravelOptions] !== undefined)) {
      return new window.DateTime(
        options.year ?? current.year,
        options.month ?? current.month,
        options.day ?? current.day,
        options.hour ?? current.hour,
        options.minute ?? current.minute,
        options.second ?? current.second
      );
    }
    if (['addYears', 'addMonths', 'addDays', 'addHours', 'addMinutes', 'addSeconds'].some(key => options[key as keyof TimeTravelOptions] !== undefined)) {
      return new window.DateTime(current)
        .addYears(options.addYears ?? 0)
        .addMonths(options.addMonths ?? 0)
        .addDays(options.addDays ?? 0)
        .addHours(options.addHours ?? 0)
        .addMinutes(options.addMinutes ?? 0)
        .addSeconds(options.addSeconds ?? 0);
    }
    throw new Error('无效的时间跳转参数');
  }

  private timeData(prevDate: DateTime, currentDate: DateTime, passedSeconds: number): TimeData {
    const elapsedSeconds = currentDate.timeStamp - prevDate.timeStamp;
    const absoluteSeconds = Math.abs(elapsedSeconds);
    const prevYear = prevDate.year > 0 ? prevDate.year : prevDate.year + 1;
    const currentYear = currentDate.year > 0 ? currentDate.year : currentDate.year + 1;
    const dayCrossed = prevDate.day !== currentDate.day || prevDate.month !== currentDate.month || prevDate.year !== currentDate.year;
    const monthCrossed = prevDate.month !== currentDate.month || prevDate.year !== currentDate.year;
    const yearCrossed = prevDate.year !== currentDate.year;
    const weekCrossed = Math.floor(prevDate.timeStamp / (TimeConstants.secondsPerDay * 7)) !== Math.floor(currentDate.timeStamp / (TimeConstants.secondsPerDay * 7));
    const changes: Record<TimeUnit, number> = {
      sec: absoluteSeconds,
      min: Math.floor(absoluteSeconds / TimeConstants.secondsPerMinute),
      hour: Math.floor(absoluteSeconds / TimeConstants.secondsPerHour),
      day: Math.floor(absoluteSeconds / TimeConstants.secondsPerDay),
      week: Math.floor(absoluteSeconds / (TimeConstants.secondsPerDay * 7)),
      month: Math.abs((currentYear - prevYear) * 12 + currentDate.month - prevDate.month),
      year: Math.abs(currentYear - prevYear)
    };

    return {
      passed: passedSeconds,
      sec: elapsedSeconds,
      min: changes.min,
      hour: changes.hour,
      day: changes.day,
      week: changes.week,
      month: changes.month,
      year: changes.year,
      weekday: [prevDate.weekDay, currentDate.weekDay],
      prevDate,
      currentDate,
      prev: prevDate,
      current: currentDate,
      diffSeconds: elapsedSeconds,
      direction: elapsedSeconds >= 0 ? 'forward' : 'backward',
      detailedDiff: prevDate.compareWith(currentDate),
      changes,
      exactPoints: {
        hour: prevDate.hour !== currentDate.hour || dayCrossed,
        day: dayCrossed,
        week: weekCrossed,
        month: monthCrossed,
        year: yearCrossed
      },
      isLeap: window.DateTime.isLeapYear(currentDate.year)
    };
  }

  private triggerUnitEvents(eventData: TimeData): void {
    // prettier-ignore
    const unitEvents: Array<{ type: TimeEventType; unit: TimeUnit; exact?: keyof NonNullable<TimeData['exactPoints']> }> = [
      { type: 'onYear' , unit: 'year' , exact: 'year' },
      { type: 'onMonth', unit: 'month', exact: 'month' },
      { type: 'onWeek' , unit: 'week' , exact: 'week' },
      { type: 'onDay'  , unit: 'day'  , exact: 'day' },
      { type: 'onHour' , unit: 'hour' , exact: 'hour' },
      { type: 'onMin'  , unit: 'min' },
      { type: 'onSec'  , unit: 'sec' }
    ];

    for (const item of unitEvents) {
      const hasElapsed = (eventData.changes?.[item.unit] || 0) > 0;
      const hasCrossed = item.exact ? !!eventData.exactPoints?.[item.exact] : false;
      if (hasElapsed || hasCrossed) this.trigger(item.type, eventData);
    }
  }

  private trigger(type: TimeEventType, eventData: TimeData): void {
    const eventMap = this.timeEvents[type];
    if (!eventMap) {
      this.log(`事件类型未注册: ${type}`, 'WARN');
      return;
    }
    if (!this.sortedEventsCache[type]) this.sortedEventsCache[type] = Array.from(eventMap.values()).sort((a, b) => b.priority - a.priority);
    const events = this.sortedEventsCache[type]!;
    const eventsToRemove: string[] = [];
    for (const event of events) {
      try {
        if (event.tryRun(eventData)) eventsToRemove.push(event.id);
      } catch (e: any) {
        this.log(`事件执行错误: ${type}.${event.id} - ${e.message}`, 'ERROR');
      }
    }
    for (const eventId of eventsToRemove) {
      eventMap.delete(eventId);
      this.sortedEventsCache[type] = null;
      this.log(`移除一次性事件: ${type}.${eventId}`, 'DEBUG');
    }
  }
}
