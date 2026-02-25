// types/global.d.ts

import { SC2DataManager } from '@scml/sc2-modloader/SC2DataManager';
import { GameOriginalImagePack } from '@scml/game-original-image-pack-mod/GameOriginalImagePack';
import { BeautySelectorAddon } from '@scml/addon-mod-beauty-selector/BeautySelectorAddon';
import { ImgLoaderHooker } from '@scml/hook-img-loader/ImgLoaderHooker';
import { Gui } from '@scml/mod-loader-gui/Gui';
import { ModInfo } from '@scml/sc2-modloader/ModLoader';
import { ModUtils } from '@scml/sc2-modloader/Utils';
import { _languageSwitch } from '../src/database/SugarCubeMacros';

declare global {
  interface Window {
    readonly modSC2DataManager: SC2DataManager;
    readonly modGameOriginalImagePack: GameOriginalImagePack;
    readonly modImgLoaderHooker: ImgLoaderHooker;
    readonly Time: typeof Time;
    DateTime: typeof DateTime;
    closeOverlay(): void;
    updateOptions(): void;
    lanSwitch: typeof _languageSwitch;
    readonly V: typeof V;
    readonly C: typeof C;
    readonly T: typeof T;
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

  interface ErrorsConfig {
    debug: boolean;
    maxLogs: number;
    showReporterSelector: string;
  }

  interface ErrorLogEntry {
    message: string;
    copyData?: any;
  }

  interface ErrorsReporter {
    visible(): boolean;
    reporterContainer(): HTMLElement;
    messagesContainer(): HTMLElement;
    paneContainer(): HTMLElement;
    copyArea(): HTMLTextAreaElement;
    toggle(): void;
    show(): void;
    update(): void;
    hide(andClear?: boolean): void;
    createEntry(error: ErrorLogEntry): HTMLElement;
    copyAll(): void;
  }

  interface Errors {
    config: ErrorsConfig;
    log: ErrorLogEntry[];
    registerMessage(message: string, copyData?: any, noClone?: boolean): ErrorLogEntry;
    report(message: string, copyData?: any, noClone?: boolean): void;
    Reporter: ErrorsReporter;
  }

  declare const Errors: Errors;

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
  function clothesIndex(slot: string, itemToIndex: object): number;
  function integrityKeyword(worn: object, slot: string): string;
  let isPossibleLoveInterest: (name: string) => boolean;
  let combatListColor: (name: any, value: any, type?: any) => any;
  const combatActionColours: CombatActionColours;
  interface CombatActionColours {
    [category: string]: { [attitude: string]: string[] };
  }
}

export {};
