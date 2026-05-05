// .src/modules/TimeStateWeather/Time.ts

import { TimeConstants } from '../../constants';

let timePatched = false;
let currentDate: DateTime | null = null;

function date(): DateTime {
  if (!currentDate) {
    V.startDate ??= new window.DateTime(2022, 9, 4, 7).timeStamp;
    currentDate = new window.DateTime(V.startDate + (V.timeStamp || 0));
  }
  return currentDate;
}

function patchTime(): void {
  if (timePatched) return;
  const time = window.Time as any;

  try {
    currentDate = new window.DateTime(time.date);
  } catch {
    V.startDate ??= new window.DateTime(2022, 9, 4, 7).timeStamp;
    currentDate = new window.DateTime(V.startDate + (V.timeStamp || 0));
  }

  const set = (value: number | DateTime = V.timeStamp): void => {
    V.startDate ??= new window.DateTime(2022, 9, 4, 7).timeStamp;
    if (value && typeof value === 'object' && typeof (value as any).timeStamp === 'number') {
      currentDate = new window.DateTime(value);
      V.timeStamp = currentDate.timeStamp - V.startDate;
      return;
    }
    const timeStamp = Number(value);
    currentDate = new window.DateTime(V.startDate + timeStamp);
    V.timeStamp = timeStamp;
  };

  const setDate = (newDate: DateTime): void => {
    set(newDate);
  };

  const setTime = (hour: number, minute = 0): void => {
    setDate(new window.DateTime(date().year, date().month, date().day, hour || 0, minute || 0, 0));
  };

  const setTimeRelative = (hour = 0, minute = 0): void => {
    setDate(new window.DateTime(date()).addHours(hour).addMinutes(minute));
  };

  const getSeason = (targetDate: DateTime): string => {
    return targetDate.month > 11 || targetDate.month < 3 ? 'winter' : targetDate.month > 8 ? 'autumn' : targetDate.month > 5 ? 'summer' : 'spring';
  };

  const getDayOfYear = (targetDate: DateTime): number => {
    const start = new window.DateTime(targetDate.year, 1, 1);
    return Math.floor((targetDate.timeStamp - start.timeStamp) / TimeConstants.secondsPerDay);
  };

  const getSecondsSinceMidnight = (targetDate: DateTime): number => {
    return targetDate.hour * TimeConstants.secondsPerHour + targetDate.minute * TimeConstants.secondsPerMinute;
  };

  const getNextSchoolTermStartDate = (targetDate: DateTime): DateTime => {
    const newDate = new window.DateTime(targetDate);
    while (newDate.weekEnd) newDate.addDays(1);
    while (time.holidayMonths.includes(newDate.month)) newDate.addMonths(1);
    return newDate.getFirstWeekdayOfMonth(2);
  };

  const getNextSchoolTermEndDate = (targetDate: DateTime): DateTime => {
    const newDate = new window.DateTime(targetDate);
    const nextHolidayMonth = time.holidayMonths.find((month: number) => month >= newDate.month) ?? time.holidayMonths[0];
    newDate.addMonths(nextHolidayMonth - newDate.month);
    return newDate.getFirstWeekdayOfMonth(2).addDays(-3).addHours(15);
  };

  const isSchoolTerm = (targetDate: DateTime): boolean => {
    let termEndDate = getNextSchoolTermEndDate(targetDate);
    termEndDate = new window.DateTime(termEndDate.year, termEndDate.month, termEndDate.day);
    termEndDate.addDays(1);
    const firstMonday = targetDate.getFirstWeekdayOfMonth(2);
    const prevMonth = ((targetDate.month - 2 + 12) % 12) + 1;
    return !(
      targetDate.timeStamp >= termEndDate.timeStamp ||
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

  const currentMoonPhase = (targetDate: DateTime): string | undefined => {
    const phaseFraction = targetDate.moonPhaseFraction;
    for (const phase in time.moonPhases) {
      const range = time.moonPhases[phase];
      if ((phaseFraction >= range.start && phaseFraction < range.end) || (range.endAlt && phaseFraction >= 0.97)) return phase;
    }
    return undefined;
  };

  const previousMoonPhase = (targetPhase: string): DateTime => {
    if (!(targetPhase in time.moonPhases)) throw new Error(`Invalid moon phase: ${targetPhase}`);
    const targetDate = new window.DateTime(date().year, date().month, date().day, 0, 0, 0);
    for (let i = 0; i < 60; i++) {
      targetDate.addDays(-1);
      if (currentMoonPhase(targetDate) === targetPhase) return targetDate;
    }
    throw new Error(`Moon phase not found: ${targetPhase}`);
  };

  const nextMoonPhase = (targetPhase: string): DateTime => {
    if (!(targetPhase in time.moonPhases)) throw new Error(`Invalid moon phase: ${targetPhase}`);
    const targetDate = new window.DateTime(date().year, date().month, date().day, 0, 0, 0);
    for (let i = 0; i < 60; i++) {
      targetDate.addDays(1);
      if (currentMoonPhase(targetDate) === targetPhase) return targetDate;
    }
    throw new Error(`Moon phase not found: ${targetPhase}`);
  };

  const isBloodMoon = (targetDate = date()): boolean => {
    return (targetDate.day === targetDate.lastDayOfMonth && targetDate.hour >= 21) || (targetDate.day === 1 && targetDate.hour < 6);
  };

  const hasDatePassed = (month: number, day: number): boolean => {
    let eventDate = new window.DateTime(time.startDate.year, month, day);
    if (eventDate.timeStamp < time.startDate.timeStamp) eventDate = new window.DateTime(eventDate).addYears(1);
    return eventDate.timeStamp <= date().timeStamp;
  };

  const betweenHours = (from: number, to: number, pass?: number): boolean => {
    const targetHour = pass ? new window.DateTime(date().timeStamp + pass * TimeConstants.secondsPerMinute).hour : date().hour;
    if (to >= from) return targetHour >= from && targetHour <= to;
    return targetHour >= from || targetHour <= to;
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
      get: () => currentMoonPhase(date()),
      configurable: true
    },

    set: {
      value: set,
      writable: true,
      configurable: true
    },

    setDate: {
      value: setDate,
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
  timePatched = true;
}

export default patchTime;
