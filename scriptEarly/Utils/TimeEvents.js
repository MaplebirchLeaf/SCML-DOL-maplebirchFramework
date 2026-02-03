// @ts-expect-error
/// <reference path='../../maplebirch.d.ts' />
(async() => {
  'use strict';

  const createDateFormatters = () => {
    const getFormattedDate = function(date, includeWeekday = false) {
      const lang = maplebirch.Language || 'EN';
      if (lang === 'CN') {
        const formattedDate = `${date.month}月${date.day}日`;
        return includeWeekday ? `${formattedDate} ${date.weekDayName}` : formattedDate;
      }
      switch (V.options.dateFormat) {
        case 'en-US':
        case 'zh-CN': {
          const formattedDate = `${date.monthName} ${ordinalSuffixOf(date.day)}`;
          return includeWeekday ? `${date.weekDayName}, ${formattedDate}` : formattedDate;
        }
        case 'en-GB': {
          const formattedDate = `the ${ordinalSuffixOf(date.day)} of ${date.monthName}`;
          return includeWeekday ? `${date.weekDayName} ${formattedDate}` : formattedDate;
        }
        default: throw new Error(`Invalid date format: ${V.options.dateFormat}`);
      }
    };
    const getShortFormattedDate = function(date) {
      const lang = maplebirch.Language || 'EN';
      if (lang === 'CN') return `${date.month}月${date.day}日`;
      switch (V.options.dateFormat) {
        case 'en-US':
        case 'zh-CN': return `${date.monthName.slice(0, 3)} ${ordinalSuffixOf(date.day)}`;
        case 'en-GB': return `${ordinalSuffixOf(date.day)} ${date.monthName.slice(0, 3)}`;
        default: throw new Error(`Invalid date format: ${V.options.dateFormat}`);
      }
    };
    return {
      getFormattedDate,
      getShortFormattedDate
    };
  };

  /**
   * 时间事件
   * @param {string} id - 事件唯一标识符
   * @param {string} type - 事件类型（如'onSec', 'onMin'等）
   * @param {Object} [options={}] - 事件配置选项
   */
  class TimeEvent {
    constructor(id, type, options = {}) {
      this.id = id;
      this.type = type;
      this.action = options.action;             // 事件触发时执行的回调函数
      this.cond = options.cond || (() => true); // 事件触发条件检查函数
      this.priority = options.priority || 0;    // 事件优先级（数值越大优先级越高）
      this.once = !!options.once;               // 是否一次性事件
      this.accumulate = options.accumulate || null; // 累积触发配置
      this.exact = !!options.exact;             // 是否在精确时间点触发
      if (this.accumulate) {
        const validUnits = ['sec','min','hour','day','week','month','year'];
        if (!validUnits.includes(this.accumulate.unit)) if (window.maplebirch && maplebirch.log) maplebirch.log(`TimeEvent(${id}): 无效累积单位: ${this.accumulate.unit}`, 'WARN');
        this.accumulator = 0;
        this.target = Math.max(1, Math.floor(this.accumulate.target || 1));
      }
    }

    tryRun(enhancedTimeData) {
      if (this.exact) return this.#handleExactEvent(enhancedTimeData);
      if (this.accumulate) return this.#handleAccumulateEvent(enhancedTimeData);
      return this.#handleRegularEvent(enhancedTimeData);
    }

    #handleExactEvent(timeData) {
      const { prevDate, currentDate } = timeData;
      const exactPointCrossed = this.#isExactPointCrossed(prevDate, currentDate);
      if (!exactPointCrossed) return false;
      return this.#executeEvent(timeData);
    }

    #handleAccumulateEvent(timeData) {
      const unit = this.accumulate.unit;
      const delta = (timeData.changes && (timeData.changes[unit] || 0)) || 0;
      if (delta <= 0) return false;
      this.accumulator += delta;
      if (this.accumulator < this.target) return false;
      const triggerCount = Math.floor(this.accumulator / this.target);
      this.accumulator %= this.target;
      timeData.triggeredByAccumulator = {
        unit: unit,
        target: this.target,
        count: triggerCount
      };
      return this.#executeEvent(timeData);
    }

    #handleRegularEvent(timeData) {
      return this.#executeEvent(timeData);
    }

    #executeEvent(timeData) {
      let ok = false;
      try { ok = !!this.cond(timeData); }
      catch (e) { maplebirch.log(`[TimeEvent:${this.id}] cond error:`, 'ERROR', e); }
      if (!ok) return false;
      try { this.action(timeData); }
      catch (e) { maplebirch.log(`[TimeEvent:${this.id}] action error:`, 'ERROR', e); }
      return !!this.once;
    }

    #isExactPointCrossed(prevDate, currentDate) {
      if (!prevDate || !currentDate) return false;
      switch(this.type) {
        case 'onHour': return prevDate.hour !== currentDate.hour;
        case 'onDay':  return prevDate.day !== currentDate.day || prevDate.month !== currentDate.month || prevDate.year !== currentDate.year;
        case 'onWeek': return Math.floor(prevDate.timeStamp / 604800) !== Math.floor(currentDate.timeStamp / 604800);
        case 'onMonth':return prevDate.month !== currentDate.month || prevDate.year !== currentDate.year;
        case 'onYear': return prevDate.year !== currentDate.year;
        default:       return true;
      }
    }
  }

  class TimeManager {
    static TimeEvent = TimeEvent;

    static moonPhases = {
      new:            { EN: 'New Moon',         CN: '新月'   },
      waxingCrescent: { EN: 'Waxing Crescent',  CN: '蛾眉月' },
      firstQuarter:   { EN: 'First Quarter',    CN: '上弦月' },
      waxingGibbous:  { EN: 'Waxing Gibbous',   CN: '盈凸月' },
      full:           { EN: 'Full Moon',        CN: '满月'   },
      waningGibbous:  { EN: 'Waning Gibbous',   CN: '亏凸月' },
      lastQuarter:    { EN: 'Last Quarter',     CN: '下弦月' },
      waningCrescent: { EN: 'Waning Crescent',  CN: '残月'   },
    };

    static monthNames = {
      EN: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      CN: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    }

    static daysOfWeek = {
      EN: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      CN: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
    }

    constructor(manager) {
      this.log = manager.log;

      this.eventTypes = [
        'onSec',     // 每秒事件
        'onMin',     // 每分钟事件
        'onHour',    // 每小时事件
        'onDay',     // 每日事件
        'onWeek',    // 每周事件
        'onMonth',   // 每月事件
        'onYear',    // 每年事件
        'onBefore',  // 时间流逝前事件
        'onThread',  // 时间流逝中事件
        'onAfter',   // 时间流逝后事件
        'onTimeTravel', // 时空穿越事件
      ];

      this.timeEvents = {};
      this.sortedEventsCache = {};
      this.eventTypes.forEach(type => {
        this.timeEvents[type] = new Map();
        this.sortedEventsCache[type] = null;
      });

      this.prevDate = null;
      this.currentDate = null;
      this.originalTimePass = null;

      this.cumulativeTime = {
        sec:    0,
        min:    0,
        hour:   0,
        day:    0,
        week:   0,
        month:  0,
        year:   0
      };
      this.lastReportedCumulative = {...this.cumulativeTime};
    }

    #trigger(type, timeData) {
      if (!this.timeEvents[type]) { this.log(`事件类型未注册: ${type}`, 'WARN'); return; }
      if (!this.sortedEventsCache[type]) this.sortedEventsCache[type] = Array.from(this.timeEvents[type].values()).sort((a, b) => b.priority - a.priority);
      const events = this.sortedEventsCache[type];
      const toRemove = [];
      for (const event of events) {
        try { if (event.tryRun(timeData)) toRemove.push(event.id); }
        catch (error) { this.log(`事件执行错误: ${type}.${event.id} - ${error.message}`, 'ERROR'); }
      }
      toRemove.forEach(eventId => {
        this.timeEvents[type].delete(eventId);
        this.sortedEventsCache[type] = null;
        this.log(`移除一次性事件: ${type}.${eventId}`, 'DEBUG');
      });
    }

    #updateCumulativeTime(passedSeconds) {
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

    #triggerTimeEventsWithCumulative(timeData) {
      const triggeredThisCycle = new Set();
      const safeTrigger = (type, data) => {
        if (!this.timeEvents[type]) return;
        if (!this.sortedEventsCache[type]) this.sortedEventsCache[type] = Array.from(this.timeEvents[type].values()).sort((a, b) => b.priority - a.priority);
        const events = this.sortedEventsCache[type];
        const toRemove = [];
        for (const event of events) {
          if (triggeredThisCycle.has(event.id)) continue;
          try {
            if (event.tryRun(data)) {
              toRemove.push(event.id);
              triggeredThisCycle.add(event.id);
            } else {
              triggeredThisCycle.add(event.id);
            }
          } catch (error) {
            this.log(`事件执行错误(safeTrigger): ${type}.${event.id} - ${error.message}`, 'ERROR');
          }
        }
        toRemove.forEach(eventId => {
          if (this.timeEvents[type].delete(eventId)) { this.sortedEventsCache[type] = null; this.log(`移除一次性事件: ${type}.${eventId}`, 'DEBUG'); }
        });
      };

      const changes = {};
      Object.keys(this.cumulativeTime).forEach(key => changes[key] = Math.max(0, (this.cumulativeTime[key] - (this.lastReportedCumulative[key] || 0))));
      Object.keys(this.lastReportedCumulative).forEach(k => this.lastReportedCumulative[k] = this.cumulativeTime[k] || 0);
      const enhancedTimeData = {
        ...timeData,
        changes,
        cumulative: { ...this.cumulativeTime }
      };

      enhancedTimeData.exactPoints = {
        hour: timeData.prevDate && timeData.currentDate ? timeData.prevDate.hour !== timeData.currentDate.hour : false,
        day: timeData.prevDate && timeData.currentDate ? (timeData.prevDate.day !== timeData.currentDate.day || timeData.prevDate.month !== timeData.currentDate.month || timeData.prevDate.year !== timeData.currentDate.year) : false,
        week: timeData.prevDate && timeData.currentDate ? Math.floor(timeData.prevDate.timeStamp / 604800) !== Math.floor(timeData.currentDate.timeStamp / 604800) : false,
        month: timeData.prevDate && timeData.currentDate ? (timeData.prevDate.month !== timeData.currentDate.month || timeData.prevDate.year !== timeData.currentDate.year) : false,
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

      unitEvents.forEach(({ event, unit }) => {
        if ((changes[unit] || 0) > 0) safeTrigger(event, enhancedTimeData);
      });

      const compositeEvents = [
        { triggerUnits: ['year', 'month', 'week', 'day', 'hour', 'min'], event: 'onSec', unit: 'sec' },
        { triggerUnits: ['year', 'month', 'week', 'day', 'hour'], event: 'onMin', unit: 'min' },
        { triggerUnits: ['year', 'month', 'week', 'day'], event: 'onHour', unit: 'hour' },
        { triggerUnits: ['year', 'month', 'week'], event: 'onDay', unit: 'day' },
        { triggerUnits: ['year', 'month'], event: 'onWeek', unit: 'week' },
        { triggerUnits: ['year'], event: 'onMonth', unit: 'month' }
      ];

      compositeEvents.forEach(({ triggerUnits, event, unit }) => {
        if (triggerUnits.some(u => (changes[u] || 0) > 0)) {
          safeTrigger(event, {
            ...enhancedTimeData,
            changes: {
              ...changes,
              [unit]: (changes[unit] > 0 ? changes[unit] : 1)
            }
          });
        }
      });

      if (enhancedTimeData.exactPoints.hour) safeTrigger('onHour', enhancedTimeData);
      if (enhancedTimeData.exactPoints.day) safeTrigger('onDay', enhancedTimeData);
      if (enhancedTimeData.exactPoints.week) safeTrigger('onWeek', enhancedTimeData);
      if (enhancedTimeData.exactPoints.month) safeTrigger('onMonth', enhancedTimeData);
      if (enhancedTimeData.exactPoints.year) safeTrigger('onYear', enhancedTimeData);
    }

    #calculateTimeDifference(prev, current, passedSec) {
      const diffSeconds = prev.compareWith(current, true);
      const detailedDiff = prev.compareWith(current);
      return {
        passed: passedSec,
        sec: diffSeconds,
        min: Math.floor(diffSeconds / 60),
        hour: Math.floor(diffSeconds / 3600),
        day: Math.floor(diffSeconds / 86400),
        week: Math.floor(diffSeconds / 604800),
        month: Math.abs(detailedDiff.months || 0),
        year: Math.abs(detailedDiff.years || 0),
        weekday: [prev.weekDay, current.weekDay],
        prevDate: prev,
        currentDate: current,
        detailedDiff
      };
    }

    register(type, eventId, options) {
      if (!this.eventTypes.includes(type)) { this.log(`未知的时间事件类型: ${type}`, 'ERROR'); return false; }
      if (this.timeEvents[type].has(eventId)) { this.log(`事件ID已存在: ${type}.${eventId}`, 'WARN'); return false; }
      this.timeEvents[type].set(eventId, new TimeEvent(eventId, type, options));
      this.sortedEventsCache[type] = null;
      this.log(`注册时间事件: ${type}.${eventId}`, 'DEBUG');
      return true;
    }

    unregister(type, eventId) {
      if (!this.timeEvents[type]) { this.log(`事件类型不存在: ${type}`, 'WARN'); return false; }
      if (this.timeEvents[type].delete(eventId)) { this.sortedEventsCache[type] = null; this.log(`注销时间事件: ${type}.${eventId}`, 'DEBUG'); return true; }
      this.log(`未找到事件: ${type}.${eventId}`, 'DEBUG');
      return false;
    }

    #handleTimePass(passedSeconds) {
      try {
        this.log(`处理时间流逝: ${passedSeconds}秒`, 'DEBUG');
        this.prevDate = new DateTime(Time.date);
        this.#trigger('onBefore', {
          passed: passedSeconds,
          timeStamp: V.timeStamp,
          prev: Object.freeze(this.prevDate)
        });
        const fragment = this.originalTimePass(passedSeconds);
        this.currentDate = Time.date;
        const timeData = this.#calculateTimeDifference(
          this.prevDate,
          this.currentDate,
          passedSeconds
        );
        this.#updateCumulativeTime(passedSeconds);
        this.#trigger('onThread', timeData);
        this.#triggerTimeEventsWithCumulative(timeData);
        this.#trigger('onAfter', timeData);
        return fragment;
      } catch (error) {
        this.log(`时间流逝处理错误: ${error.message}`, 'ERROR');
        return this.originalTimePass(passedSeconds);
      }
    }

    /**
     * 时间旅行功能
     * @param {object} options - 时间旅行选项
     * @param {DateTime} [options.target] - 目标时间点（DateTime对象）
     * @param {number} [options.year] - 目标年份
     * @param {number} [options.month] - 目标月份 (1-12)
     * @param {number} [options.day] - 目标日期 (1-31)
     * @param {number} [options.hour=0] - 目标小时 (0-23)
     * @param {number} [options.minute=0] - 目标分钟 (0-59)
     * @param {number} [options.second=0] - 目标秒数 (0-59)
     * @param {number} [options.addYears=0] - 增加的年数（可负）
     * @param {number} [options.addMonths=0] - 增加的月数（可负）
     * @param {number} [options.addDays=0] - 增加的天数（可负）
     * @param {number} [options.addHours=0] - 增加的小时数（可负）
     * @param {number} [options.addMinutes=0] - 增加的分钟数（可负）
     * @param {number} [options.addSeconds=0] - 增加的秒数（可负）
     * @returns {boolean} 时间旅行是否成功
     */
    timeTravel(options = {}) {
      try {
        let targetDate;
        const currentDate = new DateTime(Time.date);

        if (options.target || (options.year !== undefined && options.month !== undefined && options.day !== undefined)) {
          if (options.target instanceof DateTime) {
            targetDate = new DateTime(options.target);
          } else {
            const { year, month, day, hour = 0, minute = 0, second = 0 } = options;
            targetDate = new DateTime(year, month, day, hour, minute, second);
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
        Object.keys(this.cumulativeTime).forEach(key => this.cumulativeTime[key] = 0);
        Object.keys(this.lastReportedCumulative).forEach(k => this.lastReportedCumulative[k] = 0);

        this.#trigger('onTimeTravel', {
          prev: prevDate,
          current: targetDate,
          diffSeconds,
          direction: diffSeconds >= 0 ? 'forward' : 'backward',
          isLeap: DateTime.isLeapYear(targetDate.year)
        });
        this.log(`时间穿越完成: ${prevDate} → ${targetDate} (${diffSeconds}秒)`, 'DEBUG');
        return true;
      } catch (error) {
        this.log(`时间穿越失败: ${error.message}`, 'ERROR');
        return false;
      }
    }

    #updateDateTime() {
      const OriginalDateTime = window.DateTime;
      class DateTime extends OriginalDateTime {
        constructor(year = 2020, month = 1, day = 1, hour = 0, minute = 0, second = 1) {
          if (arguments.length === 1 && year && typeof year === 'object') {
            if (year instanceof DateTime || (year.timeStamp != null && year.year != null)) {
              super(year.year, year.month, year.day, year.hour || 0, year.minute || 0, year.second || 0);
              return;
            }
          }
          if (arguments.length === 1 && typeof year === 'number') {
            super();
            if (year < -62135596800 || year > 315569437199) throw new Error('Invalid timestamp: Timestamp out of range.');
            this.fromTimestamp(year);
            return;
          }
          super(year, month, day, hour, minute, second);
        }

        static getTotalDaysSinceStart(year) {
          if (year === 0) return DateTime.getTotalDaysSinceStart(-1);
          let astronomicalYear;
          if (year > 0) {
            astronomicalYear = year;
          } else {
            astronomicalYear = year + 1;
          }
          if (astronomicalYear >= 1) {
            const years = astronomicalYear - 1;
            return years * 365 + Math.floor(years / 4) - Math.floor(years / 100) + Math.floor(years / 400);
          } else {
            const years = -astronomicalYear;
            const leapCount = Math.floor((years + 3) / 4) - Math.floor((years + 99) / 100) + Math.floor((years + 399) / 400);
            return -(years * 365 + leapCount + 366);
          }
        }

        static isLeapYear(year) {
          if (year === 0) return false;
          let targetYear = year;
          if (year < 0) {
            targetYear = Math.abs(year);
            return targetYear % 4 === 0;
          }
          const isDiv4 = targetYear % 4 === 0;
          const isDiv100 = targetYear % 100 === 0;
          const isDiv400 = targetYear % 400 === 0;
          return (isDiv4 && !isDiv100) || isDiv400;
        }

        toTimestamp(year, month, day, hour, minute, second) {
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

        fromTimestamp(timestamp) {
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
            this.year = (timestamp >= 0) ? 1 : -1;
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

        compareWith(otherDateTime, getSeconds = false) {
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
          return {
            years: years * sign,
            months: months * sign,
            days: days * sign,
            hours: hours * sign,
            minutes: minutes * sign,
            seconds: seconds * sign,
          };
        }

        addYears(years) {
          if (!years) return this;
          let newYear = this.year + years;
          if ((this.year < 0 && newYear >= 0) || (this.year > 0 && newYear <= 0)) newYear += Math.sign(years) * (newYear === 0 ? 1 : 0);
          if (newYear === 0) newYear = Math.sign(years) > 0 ? 1 : -1;
          const daysInMonth = DateTime.getDaysOfMonthFromYear(newYear);
          const newDay = Math.min(this.day, daysInMonth[this.month - 1]);
          this.toTimestamp(newYear, this.month, newDay, this.hour, this.minute, this.second);
          return this;
        }

        addMonths(months) {
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
      Object.defineProperty(Time, 'monthName', { get: function() { return TimeManager.monthNames.EN[this.month - 1]; } });
      Object.defineProperty(Time, 'monthNameCN', { get: function() { return TimeManager.monthNames.CN[Time.month - 1]; } });
      window.DateTime = DateTime;
    }

    updateTimeLanguage(choice=false) {
      if (choice) {
        switch (choice) {
          case 'JournalTime':
            const en_text = 'It is ' + getFormattedDate(Time.date) + ', ' + Math.abs(Time.year) + (Time.year > 0 ? 'AD' : 'BC') + '.';
            const cn_text = '今天是' + (Time.year > 0 ? '公元' : '公元前') + Math.abs(Time.year) + '年' + getFormattedDate(Time.date) + '。';
            return lanSwitch(en_text,cn_text);
        }
        return false;
      }
      const lang = maplebirch.Language || 'EN';
      const useLang = lang === 'CN' ? 'CN' : 'EN';
      Object.keys(Time.moonPhases).forEach(phase => {if (TimeManager.moonPhases[phase] && TimeManager.moonPhases[phase][useLang]) Time.moonPhases[phase].description = TimeManager.moonPhases[phase][useLang];});
      if (TimeManager.monthNames[useLang]) Time.monthNames = [...TimeManager.monthNames[useLang]];
      if (TimeManager.daysOfWeek[useLang]) Time.daysOfWeek = [...TimeManager.daysOfWeek[useLang]];
      this.log(`时间系统语言已更新: ${useLang}`, 'DEBUG');
    }

    initialize() {
      maplebirch.once(':passagestart', () => {
        try {
          this.#updateDateTime();
          this.updateTimeLanguage();
          if (typeof Time.pass === 'function') { this.originalTimePass = Time.pass; }
          else { this.originalTimePass = function (passedSeconds) { V.timeStamp += passedSeconds; return ''; }; }
          Time.pass = (passedSeconds) => {
            try { return this.#handleTimePass(passedSeconds); }
            catch (error) { this.log(`时间流逝处理错误: ${error.message}`, 'ERROR'); return this.originalTimePass(passedSeconds); }
          };
          this.log('时间事件系统已激活', 'INFO');
          try { getFormattedDate = createDateFormatters().getFormattedDate; } catch(e) { this.log(`getFormattedDate错误: ${e.message}`, 'WARN')};
          try { getShortFormattedDate = createDateFormatters().getShortFormattedDate; } catch(e) { this.log(`getShortFormattedDate错误: ${e.message}`, 'WARN')};
          maplebirch.on(':language', () => this.updateTimeLanguage());
        } catch (e) { this.log(`初始化时间系统失败: ${e.message}`, 'ERROR'); }
      });
    }
  }

  maplebirch.once(':state-init', (data) => Object.assign(data, { TimeManager: new TimeManager(data) }));
})();