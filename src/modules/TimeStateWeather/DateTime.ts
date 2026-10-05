// .src/modules/TimeStateWeather/DateTime.ts

import { TimeConstants } from '../../constants';
import maplebirch from '../../core';
import dol from '../../host/DoL';

export function patchTimeConstantsAsset(content: string): string {
  if (content.includes(`timeStamp: ${TimeConstants.MIN_DATE.timeStamp}`)) return content;
  return maplebirch.host.modLoader.replace(
    content,
    [[/(const\s+MIN_DATE\s*=\s*Object\.freeze\(\{\s*)timeStamp:\s*0,(\s*)year:\s*1,/, `$1timeStamp: ${TimeConstants.MIN_DATE.timeStamp},$2year: ${TimeConstants.MIN_DATE.year},`]],
    'TimeConstants minimum date'
  );
}

export function patchDateTimeAsset(content: string): string {
  if (content.includes('maplebirch.dynamic.Time.patchDateTime(DateTime)')) return content;
  return maplebirch.host.modLoader.replace(content, [[/(\r?\n?window\.DateTime\s*=\s*DateTime\s*;)/, `\nDateTime = maplebirch.dynamic.Time.patchDateTime(DateTime);$1`]], 'DateTime asset patch');
}

function patchDateTime(BaseDateTime: DateTimeConstructor): DateTimeConstructor {
  const constants = window.TimeConstants ?? TimeConstants;
  const original = Object.getOwnPropertyDescriptors(BaseDateTime.prototype);
  const totalDays = BaseDateTime.getTotalDaysSinceStart;
  const leapYear = BaseDateTime.isLeapYear;
  const toSerialYear = (year: number): number => {
    if (year === 0) throw new Error('Invalid year: year 0 is not supported.');
    return year > 0 ? year : year + 1;
  };

  const fromSerialYear = (serialYear: number): number => {
    return serialYear > 0 ? serialYear : serialYear - 1;
  };

  class PatchedDateTime extends BaseDateTime {
    public constructor(...args: [year?: number | DateTimeData, month?: number, day?: number, hour?: number, minute?: number, second?: number]) {
      if (args.length === 1 && args[0] && typeof args[0] === 'object' && !(args[0] instanceof PatchedDateTime)) args[0] = args[0].timeStamp;
      super(...(args as [number?, number?, number?, number?, number?, number?]));
    }

    public static [Symbol.hasInstance](value: unknown): boolean {
      return value instanceof BaseDateTime;
    }

    public static toSerialYear(year: number): number {
      return toSerialYear(year);
    }

    public static fromSerialYear(serialYear: number): number {
      return fromSerialYear(serialYear);
    }

    public static getTotalDaysSinceStart(year: number): number {
      if (year > 0) return totalDays.call(this, year);
      const yearsBefore = toSerialYear(year) - 1;
      return yearsBefore * 365 + Math.floor(yearsBefore / 4) - Math.floor(yearsBefore / 100) + Math.floor(yearsBefore / 400);
    }

    public static isLeapYear(year: number): boolean {
      if (year >= 0) return leapYear.call(this, year);
      const serialYear = toSerialYear(year);
      return serialYear % 4 === 0 && (serialYear % 100 !== 0 || serialYear % 400 === 0);
    }

    public toTimestamp(year: number, month: number, day: number, hour: number, minute: number, second: number): this {
      if (year > 0) return original.toTimestamp.value.call(this, year, month, day, hour, minute, second);
      for (const [name, value] of Object.entries({ year, month, day, hour, minute, second })) {
        if (!Number.isInteger(value)) throw new Error(`Invalid ${name}: Value must be a finite integer.`);
      }
      if (year === 0) throw new Error('Invalid year: year 0 is not supported.');
      if (year < constants.MIN_DATE.year || year > constants.MAX_DATE.year) throw new Error(`Invalid year: Year must be between ${constants.MIN_DATE.year}-${constants.MAX_DATE.year}.`);
      if (month < 1 || month > 12) throw new Error('Invalid month: Month must be between 1-12.');
      const daysInMonth = PatchedDateTime.getDaysOfMonthFromYear(year);
      if (day < 1 || day > daysInMonth[month - 1]) throw new Error(`Invalid date: Day must be between 1-${daysInMonth[month - 1]}.`);

      const totalDays = PatchedDateTime.getTotalDaysSinceStart(year) + daysInMonth.slice(0, month - 1).reduce((sum, value) => sum + value, 0) + day - 1;
      const timeStamp = totalDays * constants.secondsPerDay + hour * constants.secondsPerHour + minute * constants.secondsPerMinute + second;
      if (timeStamp < constants.MIN_DATE.timeStamp || timeStamp > constants.MAX_DATE.timeStamp) {
        throw new Error(`Invalid timestamp: Timestamp cannot be lower than ${constants.MIN_DATE.timeStamp} or higher than ${constants.MAX_DATE.timeStamp}.`);
      }
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return this.fromTimestamp(timeStamp);
      this.timeStamp = timeStamp;
      this.year = year;
      this.month = month;
      this.day = day;
      this.hour = hour;
      this.minute = minute;
      this.second = second;
      return this;
    }

    public fromTimestamp(timestamp: number): this {
      if (timestamp >= 0) return original.fromTimestamp.value.call(this, timestamp);
      if (!Number.isFinite(timestamp)) throw new Error('Invalid timestamp: Timestamp must be finite.');
      timestamp = Math.trunc(timestamp);
      if (timestamp < constants.MIN_DATE.timeStamp || timestamp > constants.MAX_DATE.timeStamp) {
        throw new Error(`Invalid timestamp: Timestamp cannot be lower than ${constants.MIN_DATE.timeStamp} or higher than ${constants.MAX_DATE.timeStamp}.`);
      }

      const dayNumber = Math.floor(timestamp / constants.secondsPerDay);
      const secondsInDay = timestamp - dayNumber * constants.secondsPerDay;

      this.hour = Math.floor(secondsInDay / constants.secondsPerHour);
      this.minute = Math.floor((secondsInDay % constants.secondsPerHour) / constants.secondsPerMinute);
      this.second = secondsInDay % constants.secondsPerMinute;

      let minSerialYear = toSerialYear(constants.MIN_DATE.year);
      let maxSerialYear = toSerialYear(constants.MAX_DATE.year);

      while (minSerialYear <= maxSerialYear) {
        const middleSerialYear = Math.floor((minSerialYear + maxSerialYear) / 2);
        const year = fromSerialYear(middleSerialYear);
        const nextYear = fromSerialYear(middleSerialYear + 1);
        const yearStart = PatchedDateTime.getTotalDaysSinceStart(year);
        const nextYearStart = PatchedDateTime.getTotalDaysSinceStart(nextYear);

        if (dayNumber < yearStart) {
          maxSerialYear = middleSerialYear - 1;
          continue;
        }

        if (dayNumber >= nextYearStart) {
          minSerialYear = middleSerialYear + 1;
          continue;
        }

        const daysInMonth = PatchedDateTime.getDaysOfMonthFromYear(year);
        let month = 0;
        let dayOfYear = dayNumber - yearStart;
        while (dayOfYear >= daysInMonth[month]) dayOfYear -= daysInMonth[month++];

        this.timeStamp = timestamp;
        this.year = year;
        this.month = month + 1;
        this.day = dayOfYear + 1;

        return this;
      }

      throw new Error(`Invalid timestamp: ${timestamp}`);
    }

    public addYears(years: number): this {
      if (this.year > 0 && this.year + years > 0) return original.addYears.value.call(this, years);
      if (!years) return this;
      let year = this.year + years;
      if (this.year < 0 && year >= 0) year += 1;
      if (this.year > 0 && year <= 0) year -= 1;
      const daysInMonth = PatchedDateTime.getDaysOfMonthFromYear(year);
      const day = Math.min(this.day, daysInMonth[this.month - 1]);
      return this.toTimestamp(year, this.month, day, this.hour, this.minute, this.second);
    }

    public addMonths(months: number): this {
      if (this.year > 0 && toSerialYear(this.year) * 12 + this.month - 1 + months >= 12) return original.addMonths.value.call(this, months);
      if (!months) return this;
      const totalMonth = toSerialYear(this.year) * 12 + (this.month - 1) + months;
      const serialYear = Math.floor(totalMonth / 12);
      const month = (((totalMonth % 12) + 12) % 12) + 1;
      const year = fromSerialYear(serialYear);
      const day = Math.min(this.day, PatchedDateTime.getDaysOfMonthFromYear(year)[month - 1]);
      return this.toTimestamp(year, month, day, this.hour, this.minute, this.second);
    }
  }

  Object.defineProperties(PatchedDateTime.prototype, {
    weekDay: {
      get(this: DateTime) {
        if (this.year > 0) return original.weekDay.get!.call(this);
        const dayNumber = Math.floor(this.timeStamp / constants.secondsPerDay);
        const weekDayOffset = dol.variables.weekDayOffset ?? 6;
        return ((((dayNumber + weekDayOffset + 2) % 7) + 7) % 7) + 1;
      },
      configurable: true
    },
    seasonFactor: {
      get(this: DateTime) {
        const crossesStart = this.year === 1 && (this.month < 6 || (this.month === 6 && this.day < 21));
        const crossesEnd = this.year === constants.MAX_DATE.year && this.month === 12 && this.day >= 21;
        if (this.year > 0 && !crossesStart && !crossesEnd) return original.seasonFactor.get!.call(this);
        const solstice = (year: number, month: number) => {
          const days =
            PatchedDateTime.getTotalDaysSinceStart(year) +
            PatchedDateTime.getDaysOfMonthFromYear(year)
              .slice(0, month - 1)
              .reduce((sum, days) => sum + days, 0) +
            20;
          return days * constants.secondsPerDay;
        };
        const summer = solstice(this.year, 6);
        const winter = solstice(this.year, 12);
        const beforeSummer = this.timeStamp < summer;
        const afterWinter = this.timeStamp >= winter;
        const serialYear = toSerialYear(this.year);
        const previous = beforeSummer ? solstice(fromSerialYear(serialYear - 1), 12) : afterWinter ? winter : summer;
        const next = beforeSummer ? summer : afterWinter ? solstice(fromSerialYear(serialYear + 1), 6) : winter;
        const factor = (this.timeStamp - previous) / (next - previous);
        return beforeSummer || afterWinter ? 1 - factor : factor;
      },
      configurable: true
    }
  });
  for (const name of ['toSerialYear', 'fromSerialYear', 'getTotalDaysSinceStart', 'isLeapYear']) Object.defineProperty(BaseDateTime, name, Object.getOwnPropertyDescriptor(PatchedDateTime, name)!);
  for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(PatchedDateTime.prototype))) {
    if (name !== 'constructor') Object.defineProperty(BaseDateTime.prototype, name, descriptor);
  }

  return PatchedDateTime as unknown as DateTimeConstructor;
}

export default patchDateTime;
