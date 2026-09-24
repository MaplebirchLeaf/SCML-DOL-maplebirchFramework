// ./src/modules/TimeStateWeather/TimeEvents.ts

import { TimeConstants } from '../../constants';
import Diagnostics from '../../infra/Diagnostics';
import Catalog from '../../infra/Catalog';
import Hooks from '../../infra/Hooks';
import type DoLDynamic from '../DoL/Dynamic';
import Event, { type EventOptions } from '../Event';
import patchDateTime from './DateTime';
import patchTime, { bindTimeHandlers, vanillaTime } from './Time';
import dol from '../../host/DoL';

export type TimeEventType = 'onSec' | 'onMin' | 'onHour' | 'onDay' | 'onWeek' | 'onMonth' | 'onYear' | 'onBefore' | 'onThread' | 'onAfter' | 'onTimeTravel';

type TimeUnit = 'sec' | 'min' | 'hour' | 'day' | 'week' | 'month' | 'year';

const secondsPerUnit: Partial<Record<TimeUnit, number>> = {
  sec: 1,
  min: TimeConstants.secondsPerMinute,
  hour: TimeConstants.secondsPerHour,
  day: TimeConstants.secondsPerDay,
  week: TimeConstants.secondsPerDay * 7
};

interface AccumulateConfig {
  unit: TimeUnit;
  target?: number;
}

export interface TimeData {
  prevDate?: DateTime;
  currentDate?: DateTime;
  changes?: Record<TimeUnit, number>;

  triggeredByAccumulator?: {
    unit: TimeUnit;
    target: number;
    count: number;
  };

  exactPoints?: {
    min: boolean;
    hour: boolean;
    day: boolean;
    week: boolean;
    month: boolean;
    year: boolean;
  };

  passed?: number;
  sec?: number;
  min?: number;
  hour?: number;
  day?: number;
  week?: number;
  month?: number;
  year?: number;
  weekday?: [number, number];
  detailedDiff?: ReturnType<DateTime['compareWith']>;
  timeStamp?: number;
  prev?: DateTime;
  current?: DateTime;
  diffSeconds?: number;
  direction?: 'forward' | 'backward';
  isLeap?: boolean;
}

export interface TimeEventOptions extends EventOptions {
  action?: (data: TimeData) => void;
  cond?: (data: TimeData) => boolean;
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

class TimeEvent extends Event {
  protected override readonly eventName = 'TimeEvent';
  private action?: (data: TimeData) => void;
  private cond: (data: TimeData) => boolean;
  private exact: boolean;
  private accumulate?: AccumulateConfig;
  private accumulated = 0;
  private target = 1;

  public constructor(
    id: string,
    public readonly type: TimeEventType,
    options: TimeEventOptions,
    log: DoLDynamic['log']
  ) {
    super(id, options, log);
    this.action = options.action;
    this.cond = options.cond ?? (() => true);
    this.exact = !!options.exact;
    this.accumulate = options.accumulate;
    if (this.accumulate) this.target = Math.max(1, Math.floor(this.accumulate.target ?? 1));
  }

  public tryRun(data: TimeData, accumulatedOnly = false): boolean {
    if (this.accumulate) return this.runAccumulated(data);
    if (accumulatedOnly || (this.exact && !this.isExactPoint(data))) return false;
    return this.execute(data);
  }

  private runAccumulated(data: TimeData): boolean {
    const accumulate = this.accumulate!;
    const seconds = secondsPerUnit[accumulate.unit];
    const delta = seconds ? Math.abs(data.diffSeconds ?? (data.changes?.[accumulate.unit] ?? 0) * seconds) : (data.changes?.[accumulate.unit] ?? 0);
    if (!Number.isFinite(delta) || delta <= 0) return false;
    this.accumulated += delta;
    const target = this.target * (seconds ?? 1);
    if (this.accumulated < target || (this.exact && !this.isExactPoint(data))) return false;
    const count = Math.floor(this.accumulated / target);
    this.accumulated %= target;
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
    return this.evaluate('cond', this.cond, data);
  }

  private runAction(data: TimeData): void {
    this.invoke('action', this.action, data);
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
      case 'onMin':
        return !!data.exactPoints?.min;
      case 'onSec':
        return (data.diffSeconds ?? 0) !== 0;
      default:
        return true;
    }
  }
}

export class TimeManager {
  private readonly timeEvents = Object.fromEntries(
    (['onSec', 'onMin', 'onHour', 'onDay', 'onWeek', 'onMonth', 'onYear', 'onBefore', 'onThread', 'onAfter', 'onTimeTravel'] as const).map(type => [type, new Catalog<string, TimeEvent>()])
  ) as Record<TimeEventType, Catalog<string, TimeEvent>>;
  private readonly travelHooks = new Hooks<[TimeData], void>();

  public readonly log: DoLDynamic['log'];
  public readonly TimeConstants = TimeConstants;

  public constructor(private readonly manager: DoLDynamic) {
    this.log = (...args) => manager.log(...args);
  }

  public get events(): Readonly<Record<string, ReadonlyMap<string, TimeEvent>>> {
    return Object.fromEntries(Object.entries(this.timeEvents).map(([type, events]) => [type, events.entries]));
  }

  public Init(): void {
    try {
      bindTimeHandlers(Time, {
        pass: (seconds: number) => this.handleTimePass(seconds),
        timeTravel: (date: DateTime) => this.handleTimeTravel(date)
      });
      this.log('时间事件系统已激活', 'DEBUG');
    } catch (error) {
      this.log(`初始化时间事件系统失败: ${Diagnostics.message(error)}`, 'ERROR');
    }
  }

  public patchDateTime(DateTimeClass: typeof DateTime): typeof DateTime {
    return patchDateTime(DateTimeClass);
  }

  public patchTime(TimeObject: typeof Time): void {
    patchTime(TimeObject);
  }

  public register(type: TimeEventType, eventId: string, options: TimeEventOptions): boolean {
    const events = this.timeEvents[type];
    if (!events) {
      this.log(`未知的时间事件类型: ${type}`, 'ERROR');
      return false;
    }
    if (!events.add(eventId, new TimeEvent(eventId, type, options, this.log))) {
      this.log(`事件ID已存在: ${type}.${eventId}`, 'WARN');
      return false;
    }
    this.log(`注册时间事件: ${type}.${eventId}`, 'DEBUG');
    return true;
  }

  public unregister(type: string, eventId: string): boolean {
    const events = this.timeEvents[type as TimeEventType];
    if (!events) {
      this.log(`事件类型不存在: ${type}`, 'WARN');
      return false;
    }
    const deleted = events.remove(eventId);
    if (deleted) {
      this.log(`注销时间事件: ${type}.${eventId}`, 'DEBUG');
      return true;
    }
    this.log(`未找到事件: ${type}.${eventId}`, 'WARN');
    return false;
  }

  public onTravel(name: string, callback: (data: TimeData) => void): boolean {
    return this.travelHooks.add(name, callback);
  }

  public timeTravel(options: TimeTravelOptions = {}): boolean {
    try {
      this.handleTimeTravel(this.targetDate(options));
      return true;
    } catch (error) {
      this.log(`时间跳转失败: ${Diagnostics.message(error)}`, 'ERROR');
      return false;
    }
  }

  public updateTimeLanguage(choice?: 'JournalTime'): string | boolean {
    if (choice !== 'JournalTime') return false;
    const date = new window.DateTime(Time.date);
    const year = Math.abs(date.year);
    const eraEN = date.year > 0 ? 'AD' : 'BC';
    const eraCN = date.year > 0 ? '公元' : '公元前';
    return lanSwitch(`It is ${getFormattedDate(date)}, ${year}${eraEN}.`, `今天是${eraCN}${year}年${date.month}月${date.day}日。`);
  }

  private handleTimePass(seconds: number): unknown {
    const pass = vanillaTime.pass;
    const setDate = vanillaTime.setDate;
    if (!pass || !setDate) return;
    if (!Number.isFinite(seconds) || seconds < 0) return;
    const prevDate = new window.DateTime(Time.date);
    const targetDate = new window.DateTime(prevDate).addSeconds(seconds);
    this.trigger('onBefore', {
      passed: seconds,
      timeStamp: dol.variables.timeStamp,
      prev: prevDate,
      prevDate
    });
    let passResult: unknown;
    const useVanilla = prevDate.timeStamp >= TimeConstants.MIN_DATE.timeStamp && targetDate.timeStamp >= TimeConstants.MIN_DATE.timeStamp && targetDate.timeStamp <= TimeConstants.MAX_DATE.timeStamp;
    if (useVanilla) {
      setDate(prevDate);
      passResult = pass(seconds);
    }
    Time.setDate(targetDate);
    const currentDate = new window.DateTime(Time.date);
    const eventData = this.timeData(prevDate, currentDate, seconds);
    void this.manager.core.trigger(':timeChange', eventData);
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
    let currentDate: DateTime;
    let elapsedSeconds: number;
    let eventData: TimeData;
    try {
      currentDate = new window.DateTime(Time.date);
      elapsedSeconds = currentDate.timeStamp - prevDate.timeStamp;
      eventData = this.timeData(prevDate, currentDate, elapsedSeconds);
      this.travelHooks.execute(eventData);
    } catch (error) {
      Time.setDate(prevDate);
      throw error;
    }
    void this.manager.core.trigger(':timeChange', eventData);
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
    const weekCrossed = Math.floor(prevDate.timeStamp / TimeConstants.secondsPerDay) - prevDate.weekDay !== Math.floor(currentDate.timeStamp / TimeConstants.secondsPerDay) - currentDate.weekDay;
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
        min: prevDate.minute !== currentDate.minute || prevDate.hour !== currentDate.hour || dayCrossed,
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
      { type: 'onMin'  , unit: 'min'  , exact: 'min' },
      { type: 'onSec'  , unit: 'sec' }
    ];

    for (const item of unitEvents) {
      const hasElapsed = (eventData.changes?.[item.unit] || 0) > 0;
      const hasCrossed = item.exact ? !!eventData.exactPoints?.[item.exact] : false;
      this.trigger(item.type, eventData, !hasElapsed && !hasCrossed);
    }
  }

  private trigger(type: TimeEventType, eventData: TimeData, accumulatedOnly = false): void {
    const events = this.timeEvents[type];
    if (!events) {
      this.log(`事件类型未注册: ${type}`, 'WARN');
      return;
    }
    const eventsToRemove: string[] = [];
    for (const event of events.list().sort((a, b) => b.priority - a.priority)) {
      try {
        if (event.tryRun(eventData, accumulatedOnly)) eventsToRemove.push(event.id);
      } catch (error) {
        this.log(`事件执行错误: ${type}.${event.id} - ${Diagnostics.message(error)}`, 'ERROR');
      }
    }
    for (const eventId of eventsToRemove) {
      events.remove(eventId);
      this.log(`移除一次性事件: ${type}.${eventId}`, 'DEBUG');
    }
  }
}
