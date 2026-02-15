import { SC2DataManager } from "./sugarcube-2-ModLoader/SC2DataManager";
import { GameOriginalImagePack } from "./GameOriginalImagePackMod/GameOriginalImagePack";
import { BeautySelectorAddon } from "./BeautySelectorAddon/BeautySelectorAddon";
import { ImgLoaderHooker } from "./ImageLoaderHook/ImgLoaderHooker";
import { Gui } from "./Mod_LoaderGui/Gui";
import { ModInfo } from "./sugarcube-2-ModLoader/ModLoader";
import { SC2DataManager } from "./sugarcube-2-ModLoader/SC2DataManager";
import { ModUtils } from "./sugarcube-2-ModLoader/Utils";
import { ReplacePatcher } from './Mod_ReplacePatch/ReplacePatcher';
import { TweeReplacer } from "./TweeReplacer/TweeReplacer";
import { _languageSwitch } from "../src/database/SugarCubeMacros";

declare global {
  interface Window {
    modSC2DataManager: SC2DataManager;
    modGameOriginalImagePack: GameOriginalImagePack;
    addonTweeReplacer: TweeReplacer;
    addonReplacePatcher: ReplacePatcher;
    DateTime: typeof DateTime;
    closeOverlay(): void;
    updateOptions(): void;
    lanSwitch: typeof _languageSwitch;
  }

  const lanSwitch = _languageSwitch;

  const Links: any;
  const StartConfig: any;

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
    get weekDay(): number;
    weekDayName: string;
    monthName: string;
    weekEnd: boolean;
    lastDayOfMonth: number;
    yearDay: number;
    get moonPhaseFraction(): number;
    get fractionOfDay(): number;
    get fractionOfDayFromNoon(): number;
    simplifiedDayFactor: number;
    fractionOfYear: number;
    seasonFactor: number;
    static getDaysOfYear(year: number): number;
    static getDaysOfMonthFromYear(year: number): Array<number>;
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