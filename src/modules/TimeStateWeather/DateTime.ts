// .src/modules/TimeStateWeather/DateTime.ts

import { TimeConstants } from '../../constants';
import { replace } from '../AddonPluginProcess';

export function patchTimeConstantsAsset(content: string): string {
  const patch = `const TimeConstants = maplebirch.dynamic.Time.TimeConstants;\nwindow.TimeConstants = TimeConstants;`;
  if (content.includes('maplebirch.dynamic.Time.TimeConstants')) return content;
  return patch;
}

export function patchDateTimeAsset(content: string): string {
  if (content.includes('maplebirch.dynamic.Time.patchDateTime(DateTime)')) return content;
  return replace(content, [[/(\r?\n?window\.DateTime\s*=\s*DateTime\s*;)/, `\nDateTime = maplebirch.dynamic.Time.patchDateTime(DateTime);$1`]], 'DateTime asset patch');
}

function patchDateTime(BaseDateTime: DateTimeConstructor): DateTimeConstructor {
  const toSerialYear = (year: number): number => {
    if (year === 0) throw new Error('Invalid year: year 0 is not supported.');
    return year > 0 ? year : year + 1;
  };

  const fromSerialYear = (serialYear: number): number => {
    return serialYear > 0 ? serialYear : serialYear - 1;
  };

  class PatchedDateTime extends BaseDateTime {
    public constructor(year: any = 2020, month = 1, day = 1, hour = 0, minute = 0, second = 0) {
      super();
      if (arguments.length === 1) {
        if (year && typeof year === 'object' && typeof year.timeStamp === 'number') {
          this.year = year.year;
          this.month = year.month;
          this.day = year.day;
          this.hour = year.hour ?? 0;
          this.minute = year.minute ?? 0;
          this.second = year.second ?? 0;
          this.timeStamp = year.timeStamp;
          return;
        }
        this.fromTimestamp(Number(year));
        return;
      }

      this.toTimestamp(year, month, day, hour, minute, second);
    }

    public static toSerialYear(year: number): number {
      return toSerialYear(year);
    }

    public static fromSerialYear(serialYear: number): number {
      return fromSerialYear(serialYear);
    }

    public static getTotalDaysSinceStart(year: number): number {
      const yearsBefore = toSerialYear(year) - 1;
      return yearsBefore * 365 + Math.floor(yearsBefore / 4) - Math.floor(yearsBefore / 100) + Math.floor(yearsBefore / 400);
    }

    public static isLeapYear(year: number): boolean {
      if (year === 0) return false;
      const serialYear = toSerialYear(year);
      return serialYear % 4 === 0 && (serialYear % 100 !== 0 || serialYear % 400 === 0);
    }

    public toTimestamp(year: number, month: number, day: number, hour: number, minute: number, second: number): this {
      if (!Number.isFinite(year) || Math.trunc(year) !== year) throw new Error('Invalid year: Year must be an integer.');
      if (year === 0) throw new Error('Invalid year: year 0 is not supported.');
      if (year < TimeConstants.MIN_DATE.year || year > TimeConstants.MAX_DATE.year)
        throw new Error(`Invalid year: Year must be between ${TimeConstants.MIN_DATE.year}-${TimeConstants.MAX_DATE.year}.`);
      if (month < 1 || month > 12) throw new Error('Invalid month: Month must be between 1-12.');
      if (hour < 0 || hour > 23) throw new Error('Invalid hour: Hour must be between 0-23.');
      if (minute < 0 || minute > 59) throw new Error('Invalid minute: Minute must be between 0-59.');
      if (second < 0 || second > 59) throw new Error('Invalid second: Second must be between 0-59.');
      const daysInMonth = PatchedDateTime.getDaysOfMonthFromYear(year);
      if (day < 1 || day > daysInMonth[month - 1]) throw new Error(`Invalid date: Day must be between 1-${daysInMonth[month - 1]}.`);

      const totalDays = PatchedDateTime.getTotalDaysSinceStart(year) + daysInMonth.slice(0, month - 1).reduce((sum, value) => sum + value, 0) + day - 1;
      const timeStamp = totalDays * TimeConstants.secondsPerDay + hour * TimeConstants.secondsPerHour + minute * TimeConstants.secondsPerMinute + second;
      if (timeStamp < TimeConstants.MIN_DATE.timeStamp || timeStamp > TimeConstants.MAX_DATE.timeStamp) {
        throw new Error(`Invalid timestamp: Timestamp cannot be lower than ${TimeConstants.MIN_DATE.timeStamp} or higher than ${TimeConstants.MAX_DATE.timeStamp}.`);
      }
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
      if (!Number.isFinite(timestamp)) throw new Error('Invalid timestamp: Timestamp must be finite.');
      timestamp = Math.trunc(timestamp);
      if (timestamp < TimeConstants.MIN_DATE.timeStamp || timestamp > TimeConstants.MAX_DATE.timeStamp) {
        throw new Error(`Invalid timestamp: Timestamp cannot be lower than ${TimeConstants.MIN_DATE.timeStamp} or higher than ${TimeConstants.MAX_DATE.timeStamp}.`);
      }

      const dayNumber = Math.floor(timestamp / TimeConstants.secondsPerDay);
      const secondsInDay = timestamp - dayNumber * TimeConstants.secondsPerDay;

      this.hour = Math.floor(secondsInDay / TimeConstants.secondsPerHour);
      this.minute = Math.floor((secondsInDay % TimeConstants.secondsPerHour) / TimeConstants.secondsPerMinute);
      this.second = secondsInDay % TimeConstants.secondsPerMinute;

      let minSerialYear = toSerialYear(TimeConstants.MIN_DATE.year);
      let maxSerialYear = toSerialYear(TimeConstants.MAX_DATE.year);

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
      if (!years) return this;
      let year = this.year + years;
      if (this.year < 0 && year >= 0) year += 1;
      if (this.year > 0 && year <= 0) year -= 1;
      const daysInMonth = PatchedDateTime.getDaysOfMonthFromYear(year);
      const day = Math.min(this.day, daysInMonth[this.month - 1]);
      return this.toTimestamp(year, this.month, day, this.hour, this.minute, this.second);
    }

    public addMonths(months: number): this {
      if (!months) return this;
      const totalMonth = toSerialYear(this.year) * 12 + (this.month - 1) + months;
      const serialYear = Math.floor(totalMonth / 12);
      const month = (((totalMonth % 12) + 12) % 12) + 1;
      const year = fromSerialYear(serialYear);
      const day = Math.min(this.day, PatchedDateTime.getDaysOfMonthFromYear(year)[month - 1]);
      return this.toTimestamp(year, month, day, this.hour, this.minute, this.second);
    }

    public addDays(days: number): this {
      return this.addSeconds((days || 0) * TimeConstants.secondsPerDay);
    }

    public addHours(hours: number): this {
      return this.addSeconds((hours || 0) * TimeConstants.secondsPerHour);
    }

    public addMinutes(minutes: number): this {
      return this.addSeconds((minutes || 0) * TimeConstants.secondsPerMinute);
    }

    public addSeconds(seconds: number): this {
      if (!seconds) return this;
      return this.fromTimestamp(this.timeStamp + seconds);
    }

    public getFirstWeekdayOfMonth(weekDay: number): DateTime {
      if (weekDay < 1 || weekDay > 7) throw new Error('Invalid weekDay: Must be between 1-7');
      const date = new PatchedDateTime(this.year, this.month, 1);
      return date.addDays((weekDay - date.weekDay + 7) % 7) as unknown as DateTime;
    }

    public getNextWeekdayDate(weekDay: number): DateTime {
      if (weekDay < 1 || weekDay > 7) throw new Error('Invalid weekDay: Must be between 1-7');
      const days = ((7 + weekDay - this.weekDay - 1) % 7) + 1;
      return new PatchedDateTime(this).addDays(days) as unknown as DateTime;
    }

    public getPreviousWeekdayDate(weekDay: number): DateTime {
      if (weekDay < 1 || weekDay > 7) throw new Error('Invalid weekDay: Must be between 1-7');
      const days = ((7 + weekDay - this.weekDay) % 7) - 7;
      return new PatchedDateTime(this).addDays(days) as unknown as DateTime;
    }
  }

  Object.defineProperties(PatchedDateTime.prototype, {
    midnight: {
      get(this: DateTime) {
        return new PatchedDateTime(this.timeStamp - this.hour * TimeConstants.secondsPerHour - this.minute * TimeConstants.secondsPerMinute - this.second);
      },
      configurable: true
    },
    weekDay: {
      get(this: DateTime) {
        const dayNumber = Math.floor(this.timeStamp / TimeConstants.secondsPerDay);
        const weekDayOffset = V.weekDayOffset !== undefined ? V.weekDayOffset : 6;
        return ((((dayNumber + weekDayOffset + 2) % 7) + 7) % 7) + 1;
      },
      configurable: true
    },
    seasonFactor: {
      get(this: DateTime) {
        const summerSolstice = new PatchedDateTime(this.year, 6, 21);
        const winterSolstice = new PatchedDateTime(this.year, 12, 21);
        const previousSolstice =
          this.timeStamp < summerSolstice.timeStamp ? new PatchedDateTime(this.year, 12, 21).addYears(-1) : this.timeStamp < winterSolstice.timeStamp ? summerSolstice : winterSolstice;
        const nextSolstice =
          this.timeStamp < summerSolstice.timeStamp ? summerSolstice : this.timeStamp < winterSolstice.timeStamp ? winterSolstice : new PatchedDateTime(this.year, 6, 21).addYears(1);
        const nextSolsticeFactor = nextSolstice === winterSolstice ? 1 : 0;
        const totalSecondsBetweenSolstices = nextSolstice.timeStamp - previousSolstice.timeStamp;
        const secondsSinceLastSolstice = this.timeStamp - previousSolstice.timeStamp;
        const factor = secondsSinceLastSolstice / totalSecondsBetweenSolstices;

        return nextSolsticeFactor === 1 ? factor : 1 - factor;
      },
      configurable: true
    }
  });

  return PatchedDateTime as unknown as DateTimeConstructor;
}

export default patchDateTime;
