// .src/modules/TimeStateWeather/DateTime.ts
import { TimeConstants } from '../../constants';

let dateTimePatched = false;

function patchDateTime(): void {
  if (dateTimePatched) return;
  const BaseDateTime = window.DateTime as any;

  class PatchedDateTime extends BaseDateTime {
    public year!: number;
    public month!: number;
    public day!: number;
    public hour!: number;
    public minute!: number;
    public second!: number;
    public timeStamp!: number;

    public static get MIN_DATE() {
      return Object.freeze(Object.assign(Object.create(PatchedDateTime.prototype), TimeConstants.MIN_DATE));
    }

    public static get MAX_DATE() {
      return Object.freeze(Object.assign(Object.create(PatchedDateTime.prototype), TimeConstants.MAX_DATE));
    }

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
      this.toTimestamp(year as number, month, day, hour, minute, second);
    }

    private clone(): PatchedDateTime {
      return new PatchedDateTime(this as any);
    }

    private static toSerialYear(year: number): number {
      if (year === 0) throw new Error('Invalid year: year 0 is not supported.');
      return year > 0 ? year : year + 1;
    }

    private static fromSerialYear(serialYear: number): number {
      return serialYear > 0 ? serialYear : serialYear - 1;
    }

    public static getTotalDaysSinceStart(year: number): number {
      const yearsBefore = PatchedDateTime.toSerialYear(year) - 1;
      return yearsBefore * 365 + Math.floor(yearsBefore / 4) - Math.floor(yearsBefore / 100) + Math.floor(yearsBefore / 400);
    }

    public static isLeapYear(year: number): boolean {
      if (year === 0) return false;
      const serialYear = PatchedDateTime.toSerialYear(year);
      return serialYear % 4 === 0 && (serialYear % 100 !== 0 || serialYear % 400 === 0);
    }

    public static getDaysOfMonthFromYear(year: number): readonly number[] {
      return PatchedDateTime.isLeapYear(year) ? TimeConstants.leapYearMonths : TimeConstants.standardYearMonths;
    }

    public static getDaysOfYear(year: number): number {
      return PatchedDateTime.isLeapYear(year) ? 366 : 365;
    }

    public toTimestamp(year: number, month: number, day: number, hour: number, minute: number, second: number): this {
      if (!Number.isFinite(year) || Math.trunc(year) !== year) throw new Error('Invalid year: Year must be an integer.');
      if (year === 0) throw new Error('Invalid year: year 0 is not supported.');
      if (year < TimeConstants.MIN_DATE.year || year > TimeConstants.MAX_DATE.year) {
        throw new Error(`Invalid year: Year must be between ${TimeConstants.MIN_DATE.year}-${TimeConstants.MAX_DATE.year}.`);
      }
      if (month < 1 || month > 12) throw new Error('Invalid month: Month must be between 1-12.');
      if (hour < 0 || hour > 23) throw new Error('Invalid hour: Hour must be between 0-23.');
      if (minute < 0 || minute > 59) throw new Error('Invalid minute: Minute must be between 0-59.');
      if (second < 0 || second > 59) throw new Error('Invalid second: Second must be between 0-59.');
      const daysInMonth = PatchedDateTime.getDaysOfMonthFromYear(year);
      if (day < 1 || day > daysInMonth[month - 1]) throw new Error(`Invalid date: Day must be between 1-${daysInMonth[month - 1]}.`);
      const dayNumber = PatchedDateTime.getTotalDaysSinceStart(year) + daysInMonth.slice(0, month - 1).reduce((sum, value) => sum + value, 0) + day - 1;
      const timeStamp = dayNumber * TimeConstants.secondsPerDay + hour * TimeConstants.secondsPerHour + minute * TimeConstants.secondsPerMinute + second;
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

      let minSerialYear = PatchedDateTime.toSerialYear(TimeConstants.MIN_DATE.year);
      let maxSerialYear = PatchedDateTime.toSerialYear(TimeConstants.MAX_DATE.year);

      while (minSerialYear <= maxSerialYear) {
        const middleSerialYear = Math.floor((minSerialYear + maxSerialYear) / 2);
        const year = PatchedDateTime.fromSerialYear(middleSerialYear);
        const nextYear = PatchedDateTime.fromSerialYear(middleSerialYear + 1);

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

        while (dayOfYear >= daysInMonth[month]) {
          dayOfYear -= daysInMonth[month];
          month++;
        }

        this.timeStamp = timestamp;
        this.year = year;
        this.month = month + 1;
        this.day = dayOfYear + 1;

        return this;
      }

      throw new Error(`Invalid timestamp: ${timestamp}`);
    }

    public getFirstWeekdayOfMonth(weekDay: number): DateTime {
      if (weekDay < 1 || weekDay > 7) throw new Error('Invalid weekDay: Must be between 1-7');
      const date = new PatchedDateTime(this.year, this.month, 1);
      return date.addDays((weekDay - date.weekDay + 7) % 7) as unknown as DateTime;
    }

    public getNextWeekdayDate(weekDay: number): DateTime {
      if (weekDay < 1 || weekDay > 7) throw new Error('Invalid weekDay: Must be between 1-7');
      const days = ((7 + weekDay - this.weekDay - 1) % 7) + 1;
      return this.clone().addDays(days) as unknown as DateTime;
    }

    public getPreviousWeekdayDate(weekDay: number): DateTime {
      if (weekDay < 1 || weekDay > 7) throw new Error('Invalid weekDay: Must be between 1-7');
      const days = ((7 + weekDay - this.weekDay) % 7) - 7;
      return this.clone().addDays(days) as unknown as DateTime;
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
      const totalMonth = PatchedDateTime.toSerialYear(this.year) * 12 + (this.month - 1) + months;
      const serialYear = Math.floor(totalMonth / 12);
      const month = (((totalMonth % 12) + 12) % 12) + 1;
      const year = PatchedDateTime.fromSerialYear(serialYear);
      const day = Math.min(this.day, PatchedDateTime.getDaysOfMonthFromYear(year)[month - 1]);
      return this.toTimestamp(year, month, day, this.hour, this.minute, this.second);
    }

    public isLastDayOfMonth(): boolean {
      return this.day === this.lastDayOfMonth;
    }

    public get midnight(): DateTime {
      const midnight = this.clone();
      midnight.timeStamp -= this.hour * TimeConstants.secondsPerHour + this.minute * TimeConstants.secondsPerMinute + this.second;
      midnight.hour = 0;
      midnight.minute = 0;
      midnight.second = 0;
      return midnight as unknown as DateTime;
    }

    public get weekDay(): number {
      const dayNumber = Math.floor(this.timeStamp / TimeConstants.secondsPerDay);
      const weekDayOffset = V.weekDayOffset !== undefined ? V.weekDayOffset : 6;
      return ((((dayNumber + weekDayOffset + 2) % 7) + 7) % 7) + 1;
    }

    public get lastDayOfMonth(): number {
      return PatchedDateTime.getDaysOfMonthFromYear(this.year)[this.month - 1];
    }

    public get yearDay(): number {
      const daysInMonth = PatchedDateTime.getDaysOfMonthFromYear(this.year);
      return daysInMonth.slice(0, this.month - 1).reduce((sum, value) => sum + value, 0) + this.day;
    }

    public get fractionOfYear(): number {
      return this.yearDay / PatchedDateTime.getDaysOfYear(this.year);
    }

    public get seasonFactor(): number {
      const summerSolstice = new PatchedDateTime(this.year, 6, 21);
      const winterSolstice = new PatchedDateTime(this.year, 12, 21);
      const previousSolstice =
        this.timeStamp < summerSolstice.timeStamp ? new PatchedDateTime(this.year, 12, 21).addYears(-1) : this.timeStamp < winterSolstice.timeStamp ? summerSolstice : winterSolstice;
      const nextSolstice = this.timeStamp < summerSolstice.timeStamp ? summerSolstice : this.timeStamp < winterSolstice.timeStamp ? winterSolstice : new PatchedDateTime(this.year, 6, 21).addYears(1);
      const nextSolsticeFactor = nextSolstice === winterSolstice ? 1 : 0;
      const totalSecondsBetweenSolstices = nextSolstice.timeStamp - previousSolstice.timeStamp;
      const secondsSinceLastSolstice = this.timeStamp - previousSolstice.timeStamp;
      const factor = secondsSinceLastSolstice / totalSecondsBetweenSolstices;
      return nextSolsticeFactor === 1 ? factor : 1 - factor;
    }
  }
  window.DateTime = PatchedDateTime as unknown as typeof DateTime;
  dateTimePatched = true;
}

export default patchDateTime;
