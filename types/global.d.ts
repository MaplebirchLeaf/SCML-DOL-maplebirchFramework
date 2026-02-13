import { BeautySelectorAddon } from "./BeautySelectorAddon/BeautySelectorAddon";
import { Gui } from "./ml-gui/Gui";
import { SC2DataManager } from "./ml/SC2DataManager";
import { ModUtils } from "./ml/Utils";
import { ReplacePatcher } from "./ReplacePatch/ReplacePatcher";
import { TweeReplacer } from "./TweeReplacer/TweeReplacer";

declare global {
  const JSZip: any;
  const Links: any;
  const StartConfig: any;
  const modSC2DataManager: SC2DataManager;
  const modLoaderGui: Gui;
  const modUtils: ModUtils;
  const modImgLoaderHooker: any;
  const modGameOriginalImagePack:any;
  const addonBeautySelectorAddon: BeautySelectorAddon;
  const addonTweeReplacer: TweeReplacer;
  const addonReplacePatcher: ReplacePatcher;

  interface JSZip {
    zip: {
      [x: string]: any;
      file(path: string): { async(type: string): Promise<string> } | null;
    };
  }

  function lanSwitch(text: any): string;
  function lanSwitch(english: string, chinese: string, ...args: any[]): string;
  function lanSwitch(options: { EN: string; CN: string; [key: string]: string }): string;
  function clone<T>(source: T, opt?: { deep?: boolean; proto?: boolean }, map?: WeakMap<any, any>): T;
  function merge(target: any, ...sources: any[]): any;
  function equal(a: any, b: any): boolean;
  function contains<T>(arr: T[], value: T, mode?: 'all' | 'any' | 'none', opt?: ContainsOptions<T>): boolean;
  function contains<T>(arr: T[], value: T[], mode?: 'all' | 'any' | 'none', opt?: ContainsOptions<T>): boolean;
  function random(): number;
  function random(max: number): number;
  function random(min: number, max: number, float?: boolean): number;
  function random(opt: { min?: number; max?: number; float?: boolean }): number;
  function either(items: any[], opt?: { weights?: number[]; null?: boolean }): any;
  function either(...args: any[]): any;
  function loadImage(src: string): Promise<string>;
  function convert(str: string, mode?: 'upper' | 'lower' | 'capitalize' | 'title' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant', opt?: { delimiter?: string; acronym?: boolean }): string;
  interface ContainsOptions<T> { case?: boolean; compare?: (item: T, value: T) => boolean; deep?: boolean }
  class SelectCase {
    constructor();
    case(condition: any, result: any): SelectCase;
    casePredicate(fn: (input: any, meta: any) => boolean, result: any): SelectCase;
    caseRange(min: number, max: number, result: any): SelectCase;
    caseIn(values: any[], result: any): SelectCase;
    caseIncludes(substrings: string | string[], result: any): SelectCase;
    caseRegex(regex: RegExp, result: any): SelectCase;
    caseCompare(comparator: '<' | '<=' | '>' | '>=', value: number, result: any): SelectCase;
    else(result: any): SelectCase;
    match(input: any, meta?: any): any;
  }

  class DateTime {
    static isLeapYear(year: number): boolean;
    constructor(year?: number, month?: number, day?: number, hour?: number, minute?: number, second?: number);
    constructor(timestamp: number);
    constructor(dateTime: DateTime);
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    timeStamp: number;
    weekDay: number;
    weekDayName: string;
    monthName: string;
    weekEnd: boolean;
    lastDayOfMonth: number;
    yearDay: number;
    moonPhaseFraction: number;
    fractionOfDay: number;
    fractionOfDayFromNoon: number;
    simplifiedDayFactor: number;
    fractionOfYear: number;
    seasonFactor: number;
    compareWith(otherDateTime: DateTime, getSeconds?: boolean): { years: number; months: number; days: number; hours: number; minutes: number; seconds: number } | number;
    dayDifference(otherDateTime: DateTime): number;
    getFirstWeekdayOfMonth(weekDay: number): DateTime;
    getNextWeekdayDate(weekDay: number): DateTime;
    getPreviousWeekdayDate(weekDay: number): DateTime;
    addYears(years: number): DateTime;
    addMonths(months: number): DateTime;
    addDays(days: number): DateTime;
    addHours(hours: number): DateTime;
    addMinutes(minutes: number): DateTime;
    addSeconds(seconds: number): DateTime;
    isLastDayOfMonth(): boolean;
    isFirstDayOfMonth(): boolean;
    between(startDate: DateTime, endDate: DateTime): boolean;
  }

  const Time: {
    date: DateTime;
    holidayMonths: number[];
    second: number;
    minute: number;
    hour: number;
    weekDay: number;
    weekDayName: string;
    monthDay: number;
    month: number;
    monthName: string;
    year: number;
    days: number;
    season: string;
    startDate: DateTime;
    tomorrow: DateTime;
    yesterday: DateTime;
    schoolTerm: boolean;
    schoolDay: boolean;
    schoolTime: boolean;
    dayState: 'night' | 'dusk' | 'day' | 'dawn';
    nextSchoolTermStartDate: DateTime;
    nextSchoolTermEndDate: DateTime;
    lastDayOfMonth: number;
    dayOfYear: number;
    secondsSinceMidnight: number;
    currentMoonPhase: string;
    moonPhases: Record<string, { start: number; end: number; description: string; endAlt?: number }>;
    daysOfWeek: string[];
    set(time: number | DateTime): void;
    setDate(date: DateTime): void;
    setTime(hour: number, minute?: number): void;
    setTimeRelative(hour: number, minute?: number): void;
    pass(seconds: number): DocumentFragment;
    isSchoolTerm(date: DateTime): boolean;
    isSchoolDay(date: DateTime): boolean;
    isSchoolTime(date: DateTime): boolean;
    getDayOfYear(date: DateTime): number;
    getSecondsSinceMidnight(date: DateTime): number;
    getNextSchoolTermStartDate(date: DateTime): DateTime;
    getNextSchoolTermEndDate(date: DateTime): DateTime;
    nextMoonPhase(targetPhase: string): DateTime;
    previousMoonPhase(targetPhase: string): DateTime;
    isBloodMoon(date?: DateTime): boolean;
    getSeason(date: DateTime): 'winter' | 'spring' | 'summer' | 'autumn';
    getNextWeekdayDate(weekDay: number): DateTime;
    getPreviousWeekdayDate(weekDay: number): DateTime;
    isWeekEnd(): boolean;
    monthNames: string[];
  };

  const Weather: { rain: boolean; thunder: boolean; snow: boolean; cloud: boolean; windy: boolean; fog: boolean; [key: string]: any };
  function getFormattedDate(date: any, includeWeekday?: boolean): string;
  function getShortFormattedDate(date: any): string;
  function ordinalSuffixOf(i: number): string;
  const Dynamic: { [key: string]: any };
  function hairLengthStringToNumber(lengthStr: string): number;
  const Renderer: { CanvasModels: { main: any }; [key: string]: any };
  const ZIndices: { [key: string]: number };
  function wikifier(widget: string, ...args: any): DocumentFragment;
  function playerNormalPregnancyType(): string;
  function hasSexStat(input: string, required: number, modifiers?: boolean): boolean;
  function clothesIndex(slot:string, itemToIndex:object): number;
  function integrityKeyword(worn:object, slot:string): string;
  let isPossibleLoveInterest: (name: string) => boolean;
  let combatListColor: (name: any, value: any, type?: any) => any;
  const combatActionColours: CombatActionColours;
  interface CombatActionColours { [category: string]: { [attitude: string]: string[] } }
}

export {};