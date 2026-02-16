// .src/modules/TimeStateWeather/TimeEvents.ts

import { TimeConstants } from '../../constants';
import maplebirch from '../../core';
import DynamicManager from '../Dynamic';

export interface TimeData {
  prevDate?: DateLike;
  currentDate?: DateLike;
  changes?: Record<string, number>;
  triggeredByAccumulator?: { unit: string; target: number; count: number };
  exactPoints?: { hour: boolean; day: boolean; week: boolean; month: boolean; year: boolean };
  cumulative?: Record<string, number>;
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
  unit: 'sec' | 'min' | 'hour' | 'day' | 'week' | 'month' | 'year';
  target?: number;
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

function createDateFormatters() {
  const getFormattedDate = function (date: DateTime, includeWeekday = false): string {
    const lang = maplebirch.Language || 'EN';
    if (lang === 'CN') {
      const formattedDate = `${date.month}月${date.day}日`;
      return includeWeekday ? `${formattedDate} ${date.weekDayName}` : formattedDate;
    }
    const dateFormat = maplebirch.lodash.get(V, 'options.dateFormat', 'en-US');
    switch (dateFormat) {
      case 'en-US':
      case 'zh-CN': {
        const formattedDate = `${date.monthName} ${ordinalSuffixOf(date.day)}`;
        return includeWeekday ? `${date.weekDayName}, ${formattedDate}` : formattedDate;
      }
      case 'en-GB': {
        const formattedDate = `the ${ordinalSuffixOf(date.day)} of ${date.monthName}`;
        return includeWeekday ? `${date.weekDayName} ${formattedDate}` : formattedDate;
      }
      default:
        throw new Error(`Invalid date format: ${dateFormat}`);
    }
  };

  const getShortFormattedDate = function (date: DateTime): string {
    const lang = maplebirch.Language || 'EN';
    if (lang === 'CN') return `${date.month}月${date.day}日`;
    const dateFormat = maplebirch.lodash.get(V, 'options.dateFormat', 'en-US');
    switch (dateFormat) {
      case 'en-US':
      case 'zh-CN':
        return `${date.monthName.slice(0, 3)} ${ordinalSuffixOf(date.day)}`;
      case 'en-GB':
        return `${ordinalSuffixOf(date.day)} ${date.monthName.slice(0, 3)}`;
      default:
        throw new Error(`Invalid date format: ${dateFormat}`);
    }
  };

  return {
    getFormattedDate,
    getShortFormattedDate
  };
}

class TimeEvent {
  constructor(
    public readonly id: string,
    public readonly type: string,
    options: TimeEventOptions = {}
  ) {
    this.action = options.action;
    this.cond = options.cond || (() => true);
    this.priority = options.priority || 0;
    this.once = !!options.once;
    this.accumulate = options.accumulate;
    this.exact = !!options.exact;
    if (this.accumulate) {
      if (!maplebirch.lodash.includes(['sec', 'min', 'hour', 'day', 'week', 'month', 'year'], this.accumulate.unit)) maplebirch.log(`TimeEvent(${id}): 无效累积单位: ${this.accumulate.unit}`, 'WARN');
      this.accumulator = 0;
      this.target = Math.max(1, Math.floor(this.accumulate.target || 1));
    }
  }

  private action?: (data: TimeData) => void;
  private cond: (data: TimeData) => boolean = () => true;
  priority: number = 0;
  private once: boolean = false;
  private accumulate?: AccumulateConfig;
  private exact: boolean = false;
  private accumulator: number = 0;
  private target: number = 1;

  tryRun(data: TimeData): boolean {
    if (this.exact) return this._handleExact(data);
    if (this.accumulate) return this._handleAccumulate(data);
    return this._execute(data);
  }

  private _handleExact(data: TimeData): boolean {
    const { prevDate, currentDate } = data;
    if (!this._isExactPointCrossed(prevDate, currentDate)) return false;
    return this._execute(data);
  }

  private _handleAccumulate(data: TimeData): boolean {
    if (!this.accumulate) return false;
    const delta = maplebirch.lodash.get(data.changes, this.accumulate.unit, 0);
    if (delta <= 0) return false;
    this.accumulator += delta;
    if (this.accumulator < this.target) return false;
    const triggerCount = Math.floor(this.accumulator / this.target);
    this.accumulator %= this.target;
    data.triggeredByAccumulator = { unit: this.accumulate.unit, target: this.target, count: triggerCount };
    return this._execute(data);
  }

  private _execute(data: TimeData): boolean {
    let ok = false;
    try {
      ok = !!this.cond(data);
    } catch (e) {
      maplebirch.log(`[TimeEvent:${this.id}] cond error:`, 'ERROR', e);
    }
    if (!ok || !this.action) return false;
    try {
      this.action(data);
    } catch (e) {
      maplebirch.log(`[TimeEvent:${this.id}] action error:`, 'ERROR', e);
    }
    return !!this.once;
  }

  private _isExactPointCrossed(prev?: DateLike, current?: DateLike): boolean {
    if (!prev || !current) return false;
    switch (this.type) {
      case 'onHour':
        return prev.hour !== current.hour;
      case 'onDay':
        return prev.day !== current.day || prev.month !== current.month || prev.year !== current.year;
      case 'onWeek':
        return Math.floor(prev.timeStamp / 604800) !== Math.floor(current.timeStamp / 604800);
      case 'onMonth':
        return prev.month !== current.month || prev.year !== current.year;
      case 'onYear':
        return prev.year !== current.year;
      default:
        return true;
    }
  }
}

export class TimeManager {
  // prettier-ignore
  private static readonly moonPhases = {
    new:            { EN: 'New Moon',         CN: '新月'   },
    waxingCrescent: { EN: 'Waxing Crescent',  CN: '蛾眉月' },
    firstQuarter:   { EN: 'First Quarter',    CN: '上弦月' },
    waxingGibbous:  { EN: 'Waxing Gibbous',   CN: '盈凸月' },
    full:           { EN: 'Full Moon',        CN: '满月'   },
    waningGibbous:  { EN: 'Waning Gibbous',   CN: '亏凸月' },
    lastQuarter:    { EN: 'Last Quarter',     CN: '下弦月' },
    waningCrescent: { EN: 'Waning Crescent',  CN: '残月'   },
  };

  private static readonly monthNames = {
    EN: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    CN: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  };

  private static readonly daysOfWeek = {
    EN: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    CN: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  };

  private readonly timeEvents: Record<string, Map<string, TimeEvent>> = {};
  private sortedEventsCache: Record<string, TimeEvent[] | null> = {};
  private prevDate: DateTime | null = null;
  private currentDate: DateTime | null = null;
  private originalTimePass: ((seconds: number) => DocumentFragment) | null = null;
  private cumulativeTime = { sec: 0, min: 0, hour: 0, day: 0, week: 0, month: 0, year: 0 };
  private lastReportedCumulative = { ...this.cumulativeTime };
  readonly log: (message: string, level?: string, ...objects: any[]) => void;

  constructor(private readonly manager: DynamicManager) {
    this.log = manager.log;
    const eventTypes = ['onSec', 'onMin', 'onHour', 'onDay', 'onWeek', 'onMonth', 'onYear', 'onBefore', 'onThread', 'onAfter', 'onTimeTravel'];
    this.manager.core.lodash.forEach(eventTypes, type => {
      this.timeEvents[type] = new Map();
      this.sortedEventsCache[type] = null;
    });
  }

  register(type: string, eventId: string, options: TimeEventOptions): boolean {
    if (!(type in this.timeEvents)) {
      this.log(`未知的时间事件类型: ${type}`, 'ERROR');
      return false;
    }
    if (this.timeEvents[type].has(eventId)) {
      this.log(`事件ID已存在: ${type}.${eventId}`, 'WARN');
      return false;
    }
    this.timeEvents[type].set(eventId, new TimeEvent(eventId, type, options));
    this.sortedEventsCache[type] = null;
    this.log(`注册时间事件: ${type}.${eventId}`, 'DEBUG');
    return true;
  }

  unregister(type: string, eventId: string): boolean {
    if (!this.timeEvents[type]) {
      this.log(`事件类型不存在: ${type}`, 'WARN');
      return false;
    }
    if (this.timeEvents[type].delete(eventId)) {
      this.sortedEventsCache[type] = null;
      this.log(`注销时间事件: ${type}.${eventId}`, 'DEBUG');
      return true;
    }
    this.log(`未找到事件: ${type}.${eventId}`, 'DEBUG');
    return false;
  }

  timeTravel(options: TimeTravelOptions = {}): boolean {
    try {
      let targetDate: DateTime;
      const currentDate = new DateTime(Time.date);
      if (options.target || (options.year !== undefined && options.month !== undefined && options.day !== undefined)) {
        if (options.target instanceof DateTime) {
          targetDate = new DateTime(options.target);
        } else {
          const { year, month, day, hour = 0, minute = 0, second = 0 } = options;
          targetDate = new DateTime(year!, month!, day!, hour, minute, second);
        }
      } else if (options.addYears || options.addMonths || options.addDays || options.addHours || options.addMinutes || options.addSeconds) {
        targetDate = new DateTime(currentDate);
        if (options.addYears) targetDate.addYears(options.addYears);
        if (options.addMonths) targetDate.addMonths(options.addMonths);
        if (options.addDays) targetDate.addDays(options.addDays);
        if (options.addHours) targetDate.addHours(options.addHours);
        if (options.addMinutes) targetDate.addMinutes(options.addMinutes);
        if (options.addSeconds) targetDate.addSeconds(options.addSeconds);
      } else {
        throw new Error('无效的时间旅行参数');
      }
      const prevDate = new DateTime(Time.date);
      const diffSeconds = targetDate.timeStamp - prevDate.timeStamp;
      Time.setDate(targetDate);
      this.prevDate = prevDate;
      this.currentDate = targetDate;
      this.manager.core.lodash.forEach(maplebirch.lodash.keys(this.cumulativeTime), key => (this.cumulativeTime[key as keyof typeof this.cumulativeTime] = 0));
      this.manager.core.lodash.forEach(maplebirch.lodash.keys(this.lastReportedCumulative), k => (this.lastReportedCumulative[k as keyof typeof this.lastReportedCumulative] = 0));
      this._trigger('onTimeTravel', { prev: prevDate, current: targetDate, diffSeconds, direction: diffSeconds >= 0 ? 'forward' : 'backward', isLeap: DateTime.isLeapYear(targetDate.year) });
      this.log(`时间穿越完成: ${prevDate as any} → ${targetDate as any} (${diffSeconds}秒)`, 'DEBUG');
      return true;
    } catch (error: any) {
      this.log(`时间穿越失败: ${error.message}`, 'ERROR');
      return false;
    }
  }

  updateTimeLanguage(choice?: 'JournalTime'): string | boolean {
    if (choice === 'JournalTime') {
      const en_text = 'It is ' + getFormattedDate(Time.date) + ', ' + Math.abs(Time.year) + (Time.year > 0 ? 'AD' : 'BC') + '.';
      const cn_text = '今天是' + (Time.year > 0 ? '公元' : '公元前') + Math.abs(Time.year) + '年' + getFormattedDate(Time.date) + '。';
      return lanSwitch(en_text, cn_text);
    }
    if (!choice) {
      const lang = this.manager.core.Language || 'EN';
      const useLang = lang === 'CN' ? 'CN' : 'EN';
      this.manager.core.lodash.forEach(maplebirch.lodash.keys(Time.moonPhases), phase => {
        if (TimeManager.moonPhases[phase as keyof typeof TimeManager.moonPhases] && TimeManager.moonPhases[phase as keyof typeof TimeManager.moonPhases][useLang])
          (Time.moonPhases as any)[phase].description = TimeManager.moonPhases[phase as keyof typeof TimeManager.moonPhases][useLang];
      });
      if (TimeManager.monthNames[useLang]) Time.monthNames = [...TimeManager.monthNames[useLang]];
      if (TimeManager.daysOfWeek[useLang]) Time.daysOfWeek = [...TimeManager.daysOfWeek[useLang]];
    }
    return false;
  }

  _handleTimePass(passedSeconds: number): DocumentFragment {
    try {
      this.log(`处理时间流逝: ${passedSeconds}秒`, 'DEBUG');
      this.prevDate = new DateTime(Time.date);
      this._trigger('onBefore', { passed: passedSeconds, timeStamp: this.manager.core.lodash.get(V, 'timeStamp'), prev: Object.freeze(this.prevDate) });
      const fragment = this.originalTimePass!(passedSeconds);
      this.currentDate = Time.date as DateTime;
      const timeData = this._calculateTimeDifference(this.prevDate, this.currentDate, passedSeconds);
      this._updateCumulativeTime(passedSeconds);
      this._trigger('onThread', timeData);
      this._triggerTimeEventsWithCumulative(timeData);
      this._trigger('onAfter', timeData);
      return fragment;
    } catch (error: any) {
      this.log(`时间流逝处理错误: ${error.message}`, 'ERROR');
      return this.originalTimePass!(passedSeconds);
    }
  }

  private _trigger(type: string, timeData: TimeData) {
    if (!this.timeEvents[type]) {
      this.log(`事件类型未注册: ${type}`, 'WARN');
      return;
    }
    if (!this.sortedEventsCache[type]) this.sortedEventsCache[type] = Array.from(this.timeEvents[type].values()).sort((a, b) => b.priority - a.priority);
    const events = this.sortedEventsCache[type]!;
    const toRemove: string[] = [];
    for (const event of events) {
      try {
        if (event.tryRun(timeData)) toRemove.push(event.id);
      } catch (error: any) {
        this.log(`事件执行错误: ${type}.${event.id} - ${error.message}`, 'ERROR');
      }
    }
    this.manager.core.lodash.forEach(toRemove, eventId => {
      this.timeEvents[type].delete(eventId);
      this.sortedEventsCache[type] = null;
      this.log(`移除一次性事件: ${type}.${eventId}`, 'DEBUG');
    });
  }

  private _updateCumulativeTime(passedSeconds: number) {
    if (passedSeconds <= 0) return;
    this.cumulativeTime.sec += passedSeconds;
    const minGained = Math.floor(this.cumulativeTime.sec / 60);
    this.cumulativeTime.sec %= 60;
    this.cumulativeTime.min += minGained;
    const hourGained = Math.floor(this.cumulativeTime.min / 60);
    this.cumulativeTime.min %= 60;
    this.cumulativeTime.hour += hourGained;
    const dayGained = Math.floor(this.cumulativeTime.hour / 24);
    this.cumulativeTime.hour %= 24;
    this.cumulativeTime.day += dayGained;
    const weekGained = Math.floor(this.cumulativeTime.day / 7);
    this.cumulativeTime.day %= 7;
    this.cumulativeTime.week += weekGained;
    if (dayGained > 0 && this.prevDate) {
      const tempDate = new DateTime(this.prevDate);
      tempDate.addDays(dayGained);
      let monthDiff = (tempDate.year - this.prevDate.year) * 12 + (tempDate.month - this.prevDate.month);
      if (monthDiff > 0) this.cumulativeTime.month += monthDiff;
    }
    if (this.cumulativeTime.month >= 12) {
      this.cumulativeTime.year += Math.floor(this.cumulativeTime.month / 12);
      this.cumulativeTime.month %= 12;
    }
  }

  private _triggerTimeEventsWithCumulative(timeData: TimeData) {
    const triggeredThisCycle = new Set<string>();
    const safeTrigger = (type: string, data: TimeData) => {
      if (!this.timeEvents[type]) return;
      if (!this.sortedEventsCache[type]) this.sortedEventsCache[type] = Array.from(this.timeEvents[type].values()).sort((a, b) => b.priority - a.priority);
      const events = this.sortedEventsCache[type]!;
      const toRemove: string[] = [];
      for (const event of events) {
        if (triggeredThisCycle.has(event.id)) continue;
        try {
          if (event.tryRun(data)) {
            toRemove.push(event.id);
            triggeredThisCycle.add(event.id);
          } else {
            triggeredThisCycle.add(event.id);
          }
        } catch (error: any) {
          this.log(`事件执行错误(safeTrigger): ${type}.${event.id} - ${error.message}`, 'ERROR');
        }
      }
      this.manager.core.lodash.forEach(toRemove, eventId => {
        if (this.timeEvents[type].delete(eventId)) {
          this.sortedEventsCache[type] = null;
          this.log(`移除一次性事件: ${type}.${eventId}`, 'DEBUG');
        }
      });
    };
    const changes: Record<string, number> = {};
    this.manager.core.lodash.forEach(
      this.manager.core.lodash.keys(this.cumulativeTime),
      key => (changes[key] = Math.max(0, (this.cumulativeTime as any)[key] - (this.lastReportedCumulative as any)[key]))
    );
    this.manager.core.lodash.forEach(this.manager.core.lodash.keys(this.lastReportedCumulative), k => ((this.lastReportedCumulative as any)[k] = (this.cumulativeTime as any)[k] || 0));
    const enhancedData: TimeData = { ...timeData, changes, cumulative: { ...this.cumulativeTime } };
    enhancedData.exactPoints = {
      hour: timeData.prevDate && timeData.currentDate ? timeData.prevDate.hour !== timeData.currentDate.hour : false,
      day:
        timeData.prevDate && timeData.currentDate
          ? timeData.prevDate.day !== timeData.currentDate.day || timeData.prevDate.month !== timeData.currentDate.month || timeData.prevDate.year !== timeData.currentDate.year
          : false,
      week: timeData.prevDate && timeData.currentDate ? Math.floor(timeData.prevDate.timeStamp / 604800) !== Math.floor(timeData.currentDate.timeStamp / 604800) : false,
      month: timeData.prevDate && timeData.currentDate ? timeData.prevDate.month !== timeData.currentDate.month || timeData.prevDate.year !== timeData.currentDate.year : false,
      year: timeData.prevDate && timeData.currentDate ? timeData.prevDate.year !== timeData.currentDate.year : false
    };
    const unitEvents = [
      { event: 'onYear', unit: 'year' },
      { event: 'onMonth', unit: 'month' },
      { event: 'onWeek', unit: 'week' },
      { event: 'onDay', unit: 'day' },
      { event: 'onHour', unit: 'hour' },
      { event: 'onMin', unit: 'min' },
      { event: 'onSec', unit: 'sec' }
    ];
    this.manager.core.lodash.forEach(unitEvents, ({ event, unit }) => {
      if ((changes[unit] || 0) > 0) safeTrigger(event, enhancedData);
    });
    const compositeEvents = [
      { triggerUnits: ['year', 'month', 'week', 'day', 'hour', 'min'], event: 'onSec', unit: 'sec' },
      { triggerUnits: ['year', 'month', 'week', 'day', 'hour'], event: 'onMin', unit: 'min' },
      { triggerUnits: ['year', 'month', 'week', 'day'], event: 'onHour', unit: 'hour' },
      { triggerUnits: ['year', 'month', 'week'], event: 'onDay', unit: 'day' },
      { triggerUnits: ['year', 'month'], event: 'onWeek', unit: 'week' },
      { triggerUnits: ['year'], event: 'onMonth', unit: 'month' }
    ];
    this.manager.core.lodash.forEach(compositeEvents, ({ triggerUnits, event, unit }) => {
      if (this.manager.core.lodash.some(triggerUnits, u => (changes[u] || 0) > 0)) {
        safeTrigger(event, { ...enhancedData, changes: { ...changes, [unit]: changes[unit] > 0 ? changes[unit] : 1 } });
      }
    });
    if (enhancedData.exactPoints!.hour) safeTrigger('onHour', enhancedData);
    if (enhancedData.exactPoints!.day) safeTrigger('onDay', enhancedData);
    if (enhancedData.exactPoints!.week) safeTrigger('onWeek', enhancedData);
    if (enhancedData.exactPoints!.month) safeTrigger('onMonth', enhancedData);
    if (enhancedData.exactPoints!.year) safeTrigger('onYear', enhancedData);
  }

  private _calculateTimeDifference(prev: DateTime, current: DateTime, passedSec: number): TimeData {
    const diffSeconds = prev.compareWith(current, true) as number;
    const detailedDiff = prev.compareWith(current) as { years: number; months: number; days: number; hours: number; minutes: number; seconds: number };
    return {
      passed: passedSec,
      sec: diffSeconds,
      min: Math.floor(diffSeconds / 60),
      hour: Math.floor(diffSeconds / 3600),
      day: Math.floor(diffSeconds / 86400),
      week: Math.floor(diffSeconds / 604800),
      month: Math.abs(detailedDiff.months || 0),
      year: Math.abs(detailedDiff.years || 0),
      weekday: [prev.weekDay, current.weekDay] as [number, number],
      prevDate: prev,
      currentDate: current,
      detailedDiff
    };
  }

  private _updateDateTime() {
    const OriginalDateTime = window.DateTime;
    class DateTime extends OriginalDateTime {
      constructor(year: number | DateTime = 2020, month?: number, day?: number, hour?: number, minute?: number, second?: number) {
        if (arguments.length === 1 && year && typeof year === 'object') {
          const date = year as DateTime;
          super(date.year, date.month, date.day, date.hour || 0, date.minute || 0, date.second || 0);
          return;
        }
        if (arguments.length === 1 && typeof year === 'number') {
          super();
          if (year < -62135596800 || year > 315569437199) throw new Error('Invalid timestamp: Timestamp out of range.');
          this.fromTimestamp(year as number);
          return;
        }
        super(year as number, month || 1, day || 1, hour || 0, minute || 0, second || 1);
      }
      static getTotalDaysSinceStart(year: number): number {
        if (year === 0) return DateTime.getTotalDaysSinceStart(-1);
        let astronomicalYear = year > 0 ? year : year + 1;
        if (astronomicalYear >= 1) {
          const years = astronomicalYear - 1;
          return years * 365 + Math.floor(years / 4) - Math.floor(years / 100) + Math.floor(years / 400);
        } else {
          const years = -astronomicalYear;
          const leapCount = Math.floor((years + 3) / 4) - Math.floor((years + 99) / 100) + Math.floor((years + 399) / 400);
          return -(years * 365 + leapCount + 366);
        }
      }
      static isLeapYear(year: number): boolean {
        if (year === 0) return false;
        let targetYear = Math.abs(year);
        const isDiv4 = targetYear % 4 === 0;
        const isDiv100 = targetYear % 100 === 0;
        const isDiv400 = targetYear % 400 === 0;
        return (isDiv4 && !isDiv100) || isDiv400;
      }
      toTimestamp(year: number, month: number, day: number, hour: number, minute: number, second: number) {
        if (year < -9999 || year > 9999) throw new Error('Invalid year: Year must be between -9999 to 9999.');
        if (month < 1 || month > 12) throw new Error('Invalid month: Month must be 1-12.');
        const daysInMonth = DateTime.getDaysOfMonthFromYear(year);
        if (day < 1 || day > daysInMonth[month - 1]) throw new Error(`Invalid date: Day must be 1-${daysInMonth[month - 1]}.`);
        const totalDays = DateTime.getTotalDaysSinceStart(year) + daysInMonth.slice(0, month - 1).reduce((a, b) => a + b, 0) + day - 1;
        const totalSeconds = totalDays * TimeConstants.secondsPerDay + hour * TimeConstants.secondsPerHour + minute * TimeConstants.secondsPerMinute + second;
        this.timeStamp = totalSeconds;
        this.year = year;
        this.month = month;
        this.day = day;
        this.hour = hour;
        this.minute = minute;
        this.second = second;
      }
      fromTimestamp(timestamp: number) {
        let totalDays = Math.floor(timestamp / TimeConstants.secondsPerDay);
        const remainingSeconds = timestamp - totalDays * TimeConstants.secondsPerDay;
        this.hour = Math.floor(remainingSeconds / TimeConstants.secondsPerHour) % 24;
        this.minute = Math.floor(remainingSeconds / TimeConstants.secondsPerMinute) % 60;
        this.second = remainingSeconds % 60;
        let approxYear = Math.floor(totalDays / 365.2425);
        let year = 1 + approxYear;
        if (year <= 0) year = year <= 0 ? year - 1 : year;
        let daysSinceStart = DateTime.getTotalDaysSinceStart(year);
        while (totalDays < daysSinceStart) {
          year--;
          if (year === 0) year = -1;
          daysSinceStart = DateTime.getTotalDaysSinceStart(year);
        }
        while (totalDays >= daysSinceStart + DateTime.getDaysOfYear(year)) {
          daysSinceStart += DateTime.getDaysOfYear(year);
          year++;
          if (year === 0) year = 1;
        }
        this.year = year;
        if (this.year === 0) {
          this.year = timestamp >= 0 ? 1 : -1;
          daysSinceStart = DateTime.getTotalDaysSinceStart(this.year);
        }
        totalDays -= daysSinceStart;
        const daysPerMonth = DateTime.getDaysOfMonthFromYear(this.year);
        let month = 0;
        let dayCount = totalDays;
        while (dayCount >= daysPerMonth[month]) {
          dayCount -= daysPerMonth[month];
          month++;
        }
        this.month = month + 1;
        this.day = dayCount + 1;
        this.timeStamp = timestamp;
      }
      compareWith(otherDateTime: DateTime, getSeconds = false): any {
        let diffSeconds = otherDateTime.timeStamp - this.timeStamp;
        if (getSeconds) return diffSeconds;
        const sign = Math.sign(diffSeconds);
        diffSeconds = Math.abs(diffSeconds);
        const totalDays = Math.floor(diffSeconds / TimeConstants.secondsPerDay);
        const years = Math.floor(totalDays / 365.25);
        let remainingDays = totalDays - years * 365;
        const months = Math.floor(remainingDays / 30);
        remainingDays -= months * 30;
        const days = remainingDays;
        diffSeconds -= totalDays * TimeConstants.secondsPerDay;
        const hours = Math.floor(diffSeconds / TimeConstants.secondsPerHour);
        diffSeconds -= hours * TimeConstants.secondsPerHour;
        const minutes = Math.floor(diffSeconds / TimeConstants.secondsPerMinute);
        diffSeconds -= minutes * TimeConstants.secondsPerMinute;
        const seconds = diffSeconds;
        return { years: years * sign, months: months * sign, days: days * sign, hours: hours * sign, minutes: minutes * sign, seconds: seconds * sign };
      }
      addYears(years: number) {
        if (!years) return this;
        let newYear = this.year + years;
        if ((this.year < 0 && newYear >= 0) || (this.year > 0 && newYear <= 0)) newYear += Math.sign(years) * (newYear === 0 ? 1 : 0);
        if (newYear === 0) newYear = Math.sign(years) > 0 ? 1 : -1;
        const daysInMonth = DateTime.getDaysOfMonthFromYear(newYear);
        const newDay = Math.min(this.day, daysInMonth[this.month - 1]);
        this.toTimestamp(newYear, this.month, newDay, this.hour, this.minute, this.second);
        return this;
      }
      addMonths(months: number) {
        if (!months) return this;
        const addedMonths = this.month + months;
        let newYear = this.year + Math.floor((addedMonths - 1) / 12);
        const newMonth = ((addedMonths - 1) % 12) + 1;
        if (newYear === 0) newYear = Math.sign(months) > 0 ? 1 : -1;
        const newDay = Math.min(this.day, DateTime.getDaysOfMonthFromYear(newYear)[newMonth - 1]);
        this.toTimestamp(newYear, newMonth, newDay, this.hour, this.minute, this.second);
        return this;
      }
      get weekDay() {
        let y = this.year;
        let m = this.month;
        if (y < 0) y = y + 1;
        if (m < 3) {
          m += 12;
          y--;
        }
        const h = (this.day + Math.floor((13 * (m + 1)) / 5) + y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)) % 7;
        return h === 0 ? 7 : h;
      }
      get moonPhaseFraction() {
        const referenceNewMoon = new DateTime(-4713, 1, 1, 12, 0, 0);
        let phaseFraction = ((this.timeStamp - referenceNewMoon.timeStamp) / (TimeConstants.synodicMonth * TimeConstants.secondsPerDay)) % 1;
        return phaseFraction < 0 ? phaseFraction + 1 : phaseFraction;
      }
      get fractionOfDay() {
        return (this.hour * 3600 + this.minute * 60 + this.second) / TimeConstants.secondsPerDay;
      }
      get fractionOfDayFromNoon() {
        return (((this.hour + 12) % 24) * 3600 + this.minute * 60 + this.second) / TimeConstants.secondsPerDay;
      }
    }
    Object.defineProperty(Time, 'monthName', {
      get: function () {
        return TimeManager.monthNames.EN[this.month - 1];
      }
    });
    Object.defineProperty(Time, 'monthNameCN', {
      get: function () {
        return TimeManager.monthNames.CN[this.month - 1];
      }
    });
    window.DateTime = DateTime as Window['DateTime'];
  }

  init(): void {
    try {
      this._updateDateTime();
      this.updateTimeLanguage();
      if (typeof window.Time.pass === 'function') {
        this.originalTimePass = window.Time.pass.bind(window);
      } else {
        this.originalTimePass = function (passedSeconds: number) {
          V.timeStamp += passedSeconds;
          return document.createDocumentFragment();
        };
      }
      window.Time.pass = (passedSeconds: number) => {
        try {
          return this._handleTimePass(passedSeconds);
        } catch (error: any) {
          this.log(`时间流逝处理错误: ${error.message}`, 'ERROR');
          return this.originalTimePass!(passedSeconds);
        }
      };
      this.log('时间事件系统已激活', 'INFO');
      try {
        window.getFormattedDate = createDateFormatters().getFormattedDate;
      } catch (e: any) {
        this.log(`getFormattedDate错误: ${e.message}`, 'WARN');
      }
      try {
        window.getShortFormattedDate = createDateFormatters().getShortFormattedDate;
      } catch (e: any) {
        this.log(`getShortFormattedDate错误: ${e.message}`, 'WARN');
      }
      this.manager.core.on(':language', () => this.updateTimeLanguage());
    } catch (e: any) {
      this.log(`初始化时间系统失败: ${e.message}`, 'ERROR');
    }
  }
}
