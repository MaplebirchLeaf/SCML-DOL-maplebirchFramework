// .src/modules/TimeStateWeather/Time.ts

import { TimeConstants } from '../../constants';
import { replace } from '../AddonPluginProcess';

export function patchTimeAsset(content: string): string {
  if (content.includes('maplebirch.dynamic.Time.patchTime(Time)')) return content;
  return replace(content, [[/(\nwindow\.Time = Time;)/, `\nmaplebirch.dynamic.Time.patchTime(Time);$1`]], 'Time asset patch');
}

interface TimeHandlers {
  pass?: (seconds: number) => any;
  timeTravel?: (date: DateTime) => any;
}

export interface VanillaTimeHandlers {
  set?: (value?: number | DateTime) => void;
  pass?: (seconds: number) => any;
  setDate?: (date: DateTime) => void;
}

export const vanillaTime: VanillaTimeHandlers = {};

export function bindTimeHandlers(time: any, handlers: TimeHandlers): void {
  if (!time) return;
  Object.defineProperties(time, {
    ...(handlers.pass && {
      pass: {
        value: handlers.pass,
        writable: true,
        configurable: true
      }
    }),
    ...(handlers.timeTravel && {
      timeTravel: {
        value: handlers.timeTravel,
        writable: true,
        configurable: true
      }
    })
  });
}

function patchTime(time: any): void {
  if (!time) return;
  vanillaTime.set ??= typeof time.set === 'function' ? time.set.bind(time) : undefined;
  vanillaTime.pass ??= typeof time.pass === 'function' ? time.pass.bind(time) : undefined;
  vanillaTime.setDate ??= typeof time.setDate === 'function' ? time.setDate.bind(time) : undefined;
  let cachedDate: DateTime | null = null;
  let cachedAbsoluteTimestamp: number | null = null;

  const set = (value: number | DateTime = 0): void => {
    if (value && typeof value === 'object' && typeof (value as any).timeStamp === 'number') {
      vanillaTime.setDate?.(value);
      cachedDate = new window.DateTime(value);
      cachedAbsoluteTimestamp = cachedDate.timeStamp;
      return;
    }
    const elapsedTimestamp = Number(value);
    vanillaTime.set?.(Number.isFinite(elapsedTimestamp) ? elapsedTimestamp : 0);
    cachedDate = null;
    cachedAbsoluteTimestamp = null;
  };

  const date = (): DateTime => {
    const startDate = V.startDate ?? (V.startDate = new window.DateTime(2022, 9, 4, 7).timeStamp);
    const absoluteTimestamp = startDate + (V.timeStamp || 0);

    if (!cachedDate || cachedAbsoluteTimestamp !== absoluteTimestamp) {
      cachedDate = new window.DateTime(absoluteTimestamp);
      cachedAbsoluteTimestamp = absoluteTimestamp;
    }

    return cachedDate;
  };

  const setTime = (hour: number, minute = 0): void => {
    const current = date();
    time.setDate(new window.DateTime(current.year, current.month, current.day, hour || 0, minute || 0, 0));
  };

  const setTimeRelative = (hour = 0, minute = 0): void => {
    time.setDate(new window.DateTime(date()).addHours(hour).addMinutes(minute));
  };

  const getSeason = (targetDate: DateTime): string => {
    return targetDate.month > 11 || targetDate.month < 3 ? 'winter' : targetDate.month > 8 ? 'autumn' : targetDate.month > 5 ? 'summer' : 'spring';
  };

  const getDayOfYear = (targetDate: DateTime): number => {
    return Math.floor((targetDate.timeStamp - new window.DateTime(targetDate.year, 1, 1).timeStamp) / TimeConstants.secondsPerDay);
  };

  const getSecondsSinceMidnight = (targetDate: DateTime): number => {
    return targetDate.hour * TimeConstants.secondsPerHour + targetDate.minute * TimeConstants.secondsPerMinute + targetDate.second;
  };

  const getNextSchoolTermStartDate = (targetDate: DateTime): DateTime => {
    const schoolStartDate = new window.DateTime(targetDate);
    while (schoolStartDate.weekEnd) schoolStartDate.addDays(1);
    while (time.holidayMonths.includes(schoolStartDate.month)) schoolStartDate.addMonths(1);
    return schoolStartDate.getFirstWeekdayOfMonth(2);
  };

  const getNextSchoolTermEndDate = (targetDate: DateTime): DateTime => {
    const schoolEndDate = new window.DateTime(targetDate);
    const nextHolidayMonth = time.holidayMonths.find((month: number) => month >= schoolEndDate.month) ?? time.holidayMonths[0];
    schoolEndDate.addMonths(nextHolidayMonth - schoolEndDate.month);
    return schoolEndDate.getFirstWeekdayOfMonth(2).addDays(-3).addHours(15);
  };

  const isSchoolTerm = (targetDate: DateTime): boolean => {
    const firstMonday = targetDate.getFirstWeekdayOfMonth(2);
    const prevMonth = ((targetDate.month - 2 + 12) % 12) + 1;
    const schoolEndDate = getNextSchoolTermEndDate(targetDate);
    const schoolEndNextDay = new window.DateTime(schoolEndDate.year, schoolEndDate.month, schoolEndDate.day).addDays(1);

    return !(
      targetDate.timeStamp >= schoolEndNextDay.timeStamp ||
      (time.holidayMonths.includes(targetDate.month) && targetDate.day >= firstMonday.day) ||
      (time.holidayMonths.includes(prevMonth) && targetDate.day < firstMonday.day)
    );
  };

  const isSchoolDay = (targetDate: DateTime): boolean => {
    return isSchoolTerm(targetDate) && targetDate.weekDay > 1 && targetDate.weekDay < 7;
  };

  const isSchoolTime = (targetDate: DateTime): boolean => {
    return isSchoolDay(targetDate) && targetDate.hour > 8 && targetDate.hour < 15;
  };

  const getMoonPhase = (targetDate: DateTime): string | undefined => {
    const phaseFraction = targetDate.moonPhaseFraction;
    for (const phase in time.moonPhases) {
      const range = time.moonPhases[phase];
      if ((phaseFraction >= range.start && phaseFraction < range.end) || (range.endAlt && phaseFraction >= 0.97)) return phase;
    }
    return undefined;
  };

  const findMoonPhase = (targetPhase: string, direction: 1 | -1): DateTime => {
    if (!(targetPhase in time.moonPhases)) throw new Error(`Invalid moon phase: ${targetPhase}`);
    const current = date();
    const searchDate = new window.DateTime(current.year, current.month, current.day, 0, 0, 0);
    for (let i = 0; i < 60; i++) {
      searchDate.addDays(direction);
      if (getMoonPhase(searchDate) === targetPhase) return searchDate;
    }
    throw new Error(`Moon phase not found: ${targetPhase}`);
  };

  const nextMoonPhase = (targetPhase: string): DateTime => {
    return findMoonPhase(targetPhase, 1);
  };

  const previousMoonPhase = (targetPhase: string): DateTime => {
    return findMoonPhase(targetPhase, -1);
  };

  const isBloodMoon = (targetDate = date()): boolean => {
    return (targetDate.day === targetDate.lastDayOfMonth && targetDate.hour >= 21) || (targetDate.day === 1 && targetDate.hour < 6);
  };

  const hasDatePassed = (month: number, day: number): boolean => {
    let eventDate = new window.DateTime(time.startDate.year, month, day);

    if (eventDate.timeStamp < time.startDate.timeStamp) {
      eventDate = new window.DateTime(eventDate).addYears(1);
    }

    return eventDate.timeStamp <= date().timeStamp;
  };

  const betweenHours = (from: number, to: number, passMinutes?: number): boolean => {
    const targetDate = passMinutes ? new window.DateTime(date().timeStamp + passMinutes * TimeConstants.secondsPerMinute) : date();

    if (to >= from) return targetDate.hour >= from && targetDate.hour <= to;
    return targetDate.hour >= from || targetDate.hour <= to;
  };

  Object.defineProperties(time, {
    date: {
      get: date,
      configurable: true
    },

    second: {
      get: () => date().second,
      configurable: true
    },

    minute: {
      get: () => date().minute,
      configurable: true
    },

    hour: {
      get: () => date().hour,
      configurable: true
    },

    weekDay: {
      get: () => date().weekDay,
      configurable: true
    },

    weekDayName: {
      get: () => date().weekDayName,
      configurable: true
    },

    monthDay: {
      get: () => date().day,
      configurable: true
    },

    month: {
      get: () => date().month,
      configurable: true
    },

    monthName: {
      get: () => date().monthName,
      configurable: true
    },

    year: {
      get: () => date().year,
      configurable: true
    },

    days: {
      get: () => Math.floor((date().timeStamp - time.startDate.timeStamp) / TimeConstants.secondsPerDay),
      configurable: true
    },

    season: {
      get: () => getSeason(date()),
      configurable: true
    },

    startDate: {
      get: () => {
        V.startDate ??= new window.DateTime(2022, 9, 4, 7).timeStamp;
        return new window.DateTime(V.startDate);
      },
      set: (value: DateTime) => {
        V.startDate = value.timeStamp;
        cachedDate = null;
        cachedAbsoluteTimestamp = null;
      },
      configurable: true
    },

    tomorrow: {
      get: () => new window.DateTime(date()).addDays(1),
      configurable: true
    },

    yesterday: {
      get: () => new window.DateTime(date()).addDays(-1),
      configurable: true
    },

    schoolTerm: {
      get: () => isSchoolTerm(date()),
      configurable: true
    },

    schoolDay: {
      get: () => isSchoolDay(date()),
      configurable: true
    },

    schoolTime: {
      get: () => isSchoolTime(date()),
      configurable: true
    },

    dayState: {
      get: () => date().dayState,
      configurable: true
    },

    nextSchoolTermStartDate: {
      get: () => getNextSchoolTermStartDate(date()),
      configurable: true
    },

    nextSchoolTermEndDate: {
      get: () => getNextSchoolTermEndDate(date()),
      configurable: true
    },

    lastDayOfMonth: {
      get: () => date().lastDayOfMonth,
      configurable: true
    },

    dayOfYear: {
      get: () => getDayOfYear(date()),
      configurable: true
    },

    secondsSinceMidnight: {
      get: () => getSecondsSinceMidnight(date()),
      configurable: true
    },

    currentMoonPhase: {
      get: () => getMoonPhase(date()),
      configurable: true
    },

    set: {
      value: set,
      writable: true,
      configurable: true
    },

    setTime: {
      value: setTime,
      writable: true,
      configurable: true
    },

    setTimeRelative: {
      value: setTimeRelative,
      writable: true,
      configurable: true
    },

    isSchoolTerm: {
      value: isSchoolTerm,
      writable: true,
      configurable: true
    },

    isSchoolDay: {
      value: isSchoolDay,
      writable: true,
      configurable: true
    },

    isSchoolTime: {
      value: isSchoolTime,
      writable: true,
      configurable: true
    },

    getDayOfYear: {
      value: getDayOfYear,
      writable: true,
      configurable: true
    },

    getSecondsSinceMidnight: {
      value: getSecondsSinceMidnight,
      writable: true,
      configurable: true
    },

    nextMoonPhase: {
      value: nextMoonPhase,
      writable: true,
      configurable: true
    },

    previousMoonPhase: {
      value: previousMoonPhase,
      writable: true,
      configurable: true
    },

    isBloodMoon: {
      value: isBloodMoon,
      writable: true,
      configurable: true
    },

    getSeason: {
      value: getSeason,
      writable: true,
      configurable: true
    },

    getNextSchoolTermStartDate: {
      value: getNextSchoolTermStartDate,
      writable: true,
      configurable: true
    },

    getNextSchoolTermEndDate: {
      value: getNextSchoolTermEndDate,
      writable: true,
      configurable: true
    },

    getNextWeekdayDate: {
      value: (weekDay: number) => date().getNextWeekdayDate(weekDay),
      writable: true,
      configurable: true
    },

    getPreviousWeekdayDate: {
      value: (weekDay: number) => date().getPreviousWeekdayDate(weekDay),
      writable: true,
      configurable: true
    },

    isWeekEnd: {
      value: () => date().weekEnd,
      writable: true,
      configurable: true
    },

    hasDatePassed: {
      value: hasDatePassed,
      writable: true,
      configurable: true
    },

    betweenHours: {
      value: betweenHours,
      writable: true,
      configurable: true
    },

    openingHours: {
      value: (minutes?: number) => betweenHours(7, 20, minutes),
      writable: true,
      configurable: true
    }
  });
}

export default patchTime;
