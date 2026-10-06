import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { mock } from 'bun:test';

const constantsSource = `const TimeConstants = (() => {
  const secondsPerDay = 86400, secondsPerHour = 3600, secondsPerMinute = 60, minutesPerHour = 60;
  const standardYearMonths = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
  const leapYearMonths = Object.freeze([31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
  const synodicMonth = 30;
  const MIN_DATE = Object.freeze({
    timeStamp: 0,
    year: 1,
    month: 1, day: 1, hour: 0, minute: 0, second: 0, sourceExtension: 'other-mod'
  });
  const MAX_DATE = Object.freeze({timeStamp: 315537897599, year: 9999, month: 12, day: 31, hour: 23, minute: 59, second: 59});
  return Object.freeze({secondsPerDay, secondsPerHour, secondsPerMinute, minutesPerHour, standardYearMonths, leapYearMonths, synodicMonth, MIN_DATE, MAX_DATE, sourceExtension: 'other-mod'});
})();
window.TimeConstants = TimeConstants;
window.otherModLoaded = true;`;

const constants = runInNewContext(`${constantsSource}\nTimeConstants`, { window: {} });
const extendedConstants = {
  secondsPerDay: 86400,
  secondsPerHour: 3600,
  secondsPerMinute: 60,
  minutesPerHour: 60,
  standardYearMonths: constants.standardYearMonths,
  leapYearMonths: constants.leapYearMonths,
  synodicMonth: 29.53058867,
  MIN_DATE: { timeStamp: -315537984000, year: -9999, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
  MAX_DATE: constants.MAX_DATE
};
const core = {
  host: { modLoader: { replace: (content: string, replacements: [RegExp, string][]) => replacements.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), content) } }
};
mock.module('../../src/constants', () => ({ TimeConstants: extendedConstants }));
mock.module('../../src/core', () => ({ default: core }));
const { default: patchDateTime, patchDateTimeAsset, patchTimeConstantsAsset } = await import('../../src/modules/TimeStateWeather/DateTime');
const { default: patchTime, patchTimeAsset, bindTimeHandlers, vanillaTime } = await import('../../src/modules/TimeStateWeather/Time');

const dateTimeSource = `class DateTime {
  static get MIN_DATE() { return Object.freeze(Object.assign(Object.create(DateTime.prototype), TimeConstants.MIN_DATE)); }
  static get MAX_DATE() { return Object.freeze(Object.assign(Object.create(DateTime.prototype), TimeConstants.MAX_DATE)); }
  constructor(year = 2020, month = 1, day = 1, hour = 0, minute = 0, second = 0) {
    if (arguments.length === 1) {
      if (year instanceof DateTime) { Object.assign(this, year); return; }
      this.fromTimestamp(year); return;
    }
    this.toTimestamp(year, month, day, hour, minute, second);
  }
  static getTotalDaysSinceStart(year) { return (year - 1) * 365 + Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400); }
  static isLeapYear(year) { return year !== 0 && year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); }
  static getDaysOfMonthFromYear(year) { return DateTime.isLeapYear(year) ? TimeConstants.leapYearMonths : TimeConstants.standardYearMonths; }
  static getDaysOfYear(year) { return DateTime.isLeapYear(year) ? 366 : 365; }
  toTimestamp(year, month, day, hour, minute, second) {
    if (year < 1 || year > 9999) throw new Error('Native AD date only');
    const months = DateTime.getDaysOfMonthFromYear(year);
    if (month < 1 || month > 12 || day < 1 || day > months[month - 1]) throw new Error('Invalid date');
    const totalDays = DateTime.getTotalDaysSinceStart(year) + months.slice(0, month - 1).reduce((a, b) => a + b, 0) + day - 1;
    Object.assign(this, {year, month, day, hour, minute, second, timeStamp: totalDays * 86400 + hour * 3600 + minute * 60 + second}); return this;
  }
  fromTimestamp(timestamp) {
    if (timestamp < 0) throw new Error('Native AD timestamp only');
    const date = new Date((timestamp - 62135596800) * 1000);
    Object.assign(this, {year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes(), second: date.getUTCSeconds(), timeStamp: timestamp}); return this;
  }
  addDays(days) { if (!days) return this; this.fromTimestamp(this.timeStamp + days * TimeConstants.secondsPerDay); return this; }
  addSeconds(seconds) { if (!seconds) return this; this.fromTimestamp(this.timeStamp + seconds); return this; }
  addHours(hours) { return this.addSeconds(hours * 3600); }
  addMinutes(minutes) { return this.addSeconds(minutes * 60); }
  addYears(years) { if (!years) return this; const year = this.year + years; return this.toTimestamp(year, this.month, Math.min(this.day, DateTime.getDaysOfMonthFromYear(year)[this.month - 1]), this.hour, this.minute, this.second); }
  addMonths(months) { if (!months) return this; const added = this.month + months; const year = this.year + Math.floor((added - 1) / 12); const month = added <= 0 ? added + 12 : ((added - 1) % 12) + 1; return this.toTimestamp(year, month, Math.min(this.day, DateTime.getDaysOfMonthFromYear(year)[month - 1]), this.hour, this.minute, this.second); }
  get lastDayOfMonth() { return DateTime.getDaysOfMonthFromYear(this.year)[this.month - 1]; }
  get yearDay() { return DateTime.getDaysOfMonthFromYear(this.year).slice(0, this.month - 1).reduce((a, b) => a + b, 0) + this.day; }
  get fractionOfYear() { return this.yearDay / DateTime.getDaysOfYear(this.year); }
  get weekDay() { return ((Math.floor(this.timeStamp / 86400) + 8) % 7) + 1; }
  get weekEnd() { return this.weekDay === 1 || this.weekDay === 7; }
}
window.NativeDateTime = DateTime;
window.DateTime = DateTime;`;

const timeSource = `const Time = (() => {
  let currentDate = {};
  function set(time = V.timeStamp) {
    V.startDate ??= new DateTime(2022, 9, 4, 7).timeStamp;
    if (time instanceof DateTime) { currentDate = time; V.timeStamp = time.timeStamp - V.startDate; }
    else { currentDate = new DateTime(V.startDate + time); V.timeStamp = time; }
  }
  function setDate(date) { set(date.timeStamp - V.startDate); }
  function setTime(hour, minute) { setDate(new DateTime(currentDate.year, currentDate.month, currentDate.day, hour || 0, minute || 0)); }
  function setTimeRelative(hour, minute) { setDate(new DateTime(currentDate.year, currentDate.month, currentDate.day, currentDate.hour + (hour || 0), currentDate.minute + (minute || 0))); }
  function isBloodMoon(date) { date ??= currentDate; return (date.day === date.lastDayOfMonth && date.hour >= 21) || (date.day === 1 && date.hour < 6) || true; }
  function getDayOfYear(date) { return Math.floor((date.timeStamp - new DateTime(date.year, 1, 1).timeStamp) / 86400); }
  function getSecondsSinceMidnight(date) { return date.hour * 3600 + date.minute * 60; }
  function getSeason(date) { return date.month > 11 || date.month < 3 ? 'winter' : date.month > 8 ? 'autumn' : date.month > 5 ? 'summer' : 'spring'; }
  function betweenHours(from, to) { return to >= from ? currentDate.hour >= from && currentDate.hour <= to : currentDate.hour >= from || currentDate.hour <= to; }
  function pass(seconds) { window.nativePasses++; set(V.timeStamp + seconds); }
  return Object.create({
    set, setDate, setTime, setTimeRelative, isBloodMoon, getDayOfYear, getSecondsSinceMidnight, getSeason, betweenHours, pass,
    timeTravel: date => setDate(date), otherMod: () => 'retained',
    get date() { return currentDate; }, get year() { return currentDate.year; }, get month() { return currentDate.month; }, get monthDay() { return currentDate.day; },
    get hour() { return currentDate.hour; }, get minute() { return currentDate.minute; }, get second() { return currentDate.second; },
    get weekDay() { return currentDate.weekDay; }, get season() { return getSeason(currentDate); }, get lastDayOfMonth() { return currentDate.lastDayOfMonth; },
    get dayOfYear() { return getDayOfYear(currentDate); }, get secondsSinceMidnight() { return getSecondsSinceMidnight(currentDate); },
    get currentMoonPhase() { return isBloodMoon() ? 'other-mod-blood-moon' : 'native-moon'; },
    get startDate() { return new DateTime(V.startDate); }, set startDate(date) { V.startDate = date.timeStamp; },
    get tomorrow() { return new DateTime(currentDate).addDays(1); }, get yesterday() { return new DateTime(currentDate).addDays(-1); }
  });
})();
window.nativeDescriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(Time));
window.nativePasses = 0;
window.Time = Time;`;

const scope: Record<string, any> = { V: {}, maplebirch: { dynamic: { Time: { patchDateTime, patchTime, TimeConstants: extendedConstants } } } };
scope.window = scope;
Object.defineProperty(globalThis, 'window', { value: scope, configurable: true });
Object.defineProperty(globalThis, 'V', { value: scope.V, configurable: true });
runInNewContext(patchTimeConstantsAsset(constantsSource), scope);

function parts(date: DateTime): number[] {
  return [date.year, date.month, date.day, date.hour, date.minute, date.second];
}

switch (process.argv[2]) {
  case 'constants': {
    assert.equal(scope.TimeConstants.synodicMonth, 30);
    assert.equal(scope.TimeConstants.sourceExtension, 'other-mod');
    assert.equal(scope.TimeConstants.MIN_DATE.sourceExtension, 'other-mod');
    assert.equal(scope.otherModLoaded, true);
    assert.equal(scope.TimeConstants.MIN_DATE.timeStamp, -315537984000);
    assert.equal(scope.TimeConstants.MIN_DATE.year, -9999);
    assert.equal(scope.TimeConstants.MAX_DATE.timeStamp, 315537897599);
    const patched = patchTimeConstantsAsset(constantsSource);
    assert.equal(patchTimeConstantsAsset(patched), patched);
    break;
  }
  case 'datetime': {
    const otherModPatch = `
const nativeToTimestamp = DateTime.prototype.toTimestamp, nativeFromTimestamp = DateTime.prototype.fromTimestamp;
DateTime.prototype.toTimestamp = function(...args) { this.otherModComponents = true; return nativeToTimestamp.apply(this, args); };
DateTime.prototype.fromTimestamp = function(timestamp) { this.otherModTimestamp = true; return nativeFromTimestamp.call(this, timestamp); };
const nativeAddDays = DateTime.prototype.addDays, nativeAddYears = DateTime.prototype.addYears, nativeAddMonths = DateTime.prototype.addMonths;
DateTime.prototype.addDays = function(days) { this.otherModDays = (this.otherModDays || 0) + 1; return nativeAddDays.call(this, days); };
DateTime.prototype.addYears = function(years) { this.otherModYears = true; return nativeAddYears.call(this, years); };
DateTime.prototype.addMonths = function(months) { this.otherModMonths = true; return nativeAddMonths.call(this, months); };
DateTime.isLeapYear = function(year) { return year === 2023 || (year !== 0 && year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)); };
Object.defineProperty(DateTime.prototype, 'fractionOfYear', {get() { return 0.314; }, configurable: true});
`;
    const source = dateTimeSource.replace('window.DateTime = DateTime;', `${otherModPatch}\nwindow.DateTime = DateTime;`);
    runInNewContext(patchDateTimeAsset(source), scope);
    const DateClass = scope.DateTime as DateTimeConstructor;
    const native = scope.NativeDateTime as DateTimeConstructor;
    assert.equal(DateClass.prototype.addDays, native.prototype.addDays);
    assert.equal(DateClass.isLeapYear(2023), true);
    assert.equal(DateClass.getDaysOfYear(2023), 366);
    const positive = new DateClass(2024, 2, 28, 12, 0, 7).addDays(1);
    assert.equal(positive.day, 29);
    assert.equal((positive as any).otherModDays, 1);
    assert.equal((positive as any).otherModComponents, true);
    assert.equal((positive as any).otherModTimestamp, true);
    assert.equal(positive.fractionOfYear, 0.314);
    assert.equal((new DateClass(2024, 1, 1).addYears(1) as any).otherModYears, true);
    assert.equal((new DateClass(2024, 1, 1).addMonths(1) as any).otherModMonths, true);
    assert.deepEqual(parts(new DateClass(-1, 12, 31, 23, 59, 59).addSeconds(1)), [1, 1, 1, 0, 0, 0]);
    assert.deepEqual(parts(new DateClass(1, 1, 1).addDays(-1)), [-1, 12, 31, 0, 0, 0]);
    assert.deepEqual(parts(new DateClass(-1, 12, 31).addMonths(1)), [1, 1, 31, 0, 0, 0]);
    assert.deepEqual(parts(new DateClass(1, 1, 31).addMonths(-1)), [-1, 12, 31, 0, 0, 0]);
    assert.equal(new DateClass(-1, 2, 29).addYears(1).day, 28);
    assert.equal(new DateClass(-1, 2, 29).lastDayOfMonth, 29);
    assert.equal(new DateClass(-1, 2, 29).yearDay, 60);
    assert.equal(DateClass.MIN_DATE.year, -9999);
    assert.ok(DateClass.MIN_DATE instanceof DateClass);
    assert.ok(Number.isFinite(DateClass.MIN_DATE.seasonFactor));
    assert.ok(Number.isFinite(DateClass.MAX_DATE.seasonFactor));
    assert.equal(DateClass.MAX_DATE.year, 9999);
    assert.deepEqual(parts(new DateClass(-1)), [-1, 12, 31, 23, 59, 59]);
    assert.deepEqual(parts(new DateClass(extendedConstants.MIN_DATE.timeStamp)), [-9999, 1, 1, 0, 0, 0]);
    assert.throws(() => new DateClass(0, 1, 1), /year/i);
    break;
  }
  case 'startup': {
    runInNewContext(patchDateTimeAsset(dateTimeSource), scope);
    runInNewContext(patchTimeAsset(timeSource), scope);
    const time = scope.Time as TimeAPI;
    assert.equal(scope.V.timeStamp, undefined);
    assert.doesNotThrow(() => time.set());
    assert.ok(Number.isNaN(time.date.timeStamp));
    assert.equal(scope.V.timeStamp, undefined);
    scope.V.timeStamp = 0;
    time.set();
    assert.deepEqual(parts(time.date), [2022, 9, 4, 7, 0, 0]);
    assert.equal(scope.V.timeStamp, 0);
    break;
  }
  case 'time': {
    runInNewContext(patchDateTimeAsset(dateTimeSource), scope);
    runInNewContext(patchTimeAsset(timeSource), scope);
    const time = scope.Time as TimeAPI;
    const DateClass = scope.DateTime as DateTimeConstructor;
    const descriptors = scope.nativeDescriptors as Record<string, PropertyDescriptor>;
    for (const [name, descriptor] of Object.entries(descriptors)) {
      assert.equal(Object.hasOwn(time, name), false, `${name} must retain its native descriptor`);
      if ('value' in descriptor) assert.equal((time as any)[name], descriptor.value, `${name} native method identity`);
    }
    time.set(new DateClass(2024, 2, 28, 12, 34, 56));
    assert.equal(time.isBloodMoon(), true);
    assert.equal(time.isBloodMoon(new DateClass(2024, 2, 15, 12)), true);
    assert.equal(time.currentMoonPhase, 'other-mod-blood-moon');
    assert.equal(time.secondsSinceMidnight, 12 * 3600 + 34 * 60);
    time.setDate(new DateClass(-1, 12, 31, 23, 59, 59));
    assert.deepEqual(parts(time.date), [-1, 12, 31, 23, 59, 59]);
    assert.equal(time.year, -1);
    assert.equal(time.lastDayOfMonth, 31);
    assert.deepEqual({ parts: parts(time.tomorrow), stamp: time.tomorrow.timeStamp }, { parts: [1, 1, 1, 23, 59, 59], stamp: 86399 });
    time.setDate(new DateClass(-1, 12, 31, 23, 55));
    time.setTimeRelative(1, 10);
    assert.deepEqual(parts(time.date), [1, 1, 1, 1, 5, 0]);
    time.setDate(new DateClass(2024, 2, 28));
    time.setTime(23, 55);
    time.setTimeRelative(1, 10);
    assert.deepEqual(parts(time.date), [2024, 2, 29, 1, 5, 0]);
    assert.equal(time.dayOfYear, 59);
    assert.equal(time.season, 'winter');
    assert.equal(time.weekDay, time.date.weekDay);
    time.set(scope.V.timeStamp + 86400);
    assert.deepEqual(parts(time.date), [2024, 3, 1, 1, 5, 0]);
    const pass = (seconds: number) => vanillaTime.pass!(seconds);
    const travel = (date: DateTime) => time.setDate(date);
    bindTimeHandlers(time, { pass, timeTravel: travel });
    assert.equal(time.pass, pass);
    assert.equal(time.timeTravel, travel);
    time.pass(60);
    assert.equal(scope.nativePasses, 1);
    assert.equal(time.minute, 6);
    time.timeTravel(new DateClass(-1, 12, 31));
    assert.equal(time.year, -1);
    assert.equal(time.date.day, 31);
    for (const [name, descriptor] of Object.entries(descriptors)) {
      if (name !== 'pass' && name !== 'timeTravel') assert.equal(Object.hasOwn(time, name), false, `${name} after framework event binding`);
      if (descriptor.get) assert.equal(Object.getOwnPropertyDescriptor(Object.getPrototypeOf(time), name)?.get, descriptor.get);
    }
    break;
  }
  default:
    throw new Error(`Unknown compatibility scenario: ${process.argv[2]}`);
}
