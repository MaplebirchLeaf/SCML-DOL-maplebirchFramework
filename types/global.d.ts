import { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import { GameOriginalImagePack } from '@scml/types/GameOriginalImagePackMod/GameOriginalImagePack';
import { BeautySelectorAddon } from '@scml/types/AddonMod_BeautySelector/BeautySelectorAddon';
import { ImgLoaderHooker } from '@scml/types/Hook_ImgLoader/ImgLoaderHooker';
import { Gui } from '@scml/types/Mod_LoaderGui/Gui';
import { ModUtils } from '@scml/types/sugarcube-2-ModLoader/Utils';
import { _languageSwitch } from '../src/database/SugarCubeMacros';

declare global {
  interface Window {
    readonly modSC2DataManager: SC2DataManager;
    readonly modGameOriginalImagePack: GameOriginalImagePack;
    readonly modImgLoaderHooker: ImgLoaderHooker;
    readonly modLoaderGui: Gui;
    readonly modUtils: ModUtils;
    readonly addonBeautySelectorAddon: BeautySelectorAddon;
    readonly Time: typeof Time;
    DateTime: typeof DateTime;
    closeOverlay(): void;
    updateOptions(): void;
    lanSwitch: typeof _languageSwitch;
    readonly V: typeof V;
    readonly C: typeof C;
    readonly T: typeof T;
  }

  const lanSwitch: typeof _languageSwitch;

  const Links: any;
  const StartConfig: any;

  const Time: {
    readonly date: DateTime;
    readonly holidayMonths: number[];
    readonly second: number;
    readonly minute: number;
    readonly hour: number;
    readonly weekDay: number;
    readonly weekDayName: string;
    readonly monthDay: number;
    readonly month: number;
    readonly monthName: string;
    readonly year: number;
    readonly days: number;
    readonly season: string;
    readonly tomorrow: DateTime;
    readonly yesterday: DateTime;
    readonly schoolTerm: boolean;
    readonly schoolDay: boolean;
    readonly schoolTime: boolean;
    readonly dayState: string;
    readonly nextSchoolTermStartDate: DateTime;
    readonly nextSchoolTermEndDate: DateTime;
    readonly lastDayOfMonth: number;
    readonly dayOfYear: number;
    readonly secondsSinceMidnight: number;
    readonly currentMoonPhase: string;
    startDate: DateTime;
    monthNames: string[];
    daysOfWeek: string[];
    moonPhases: Record<
      string,
      {
        start: number;
        end: number;
        endAlt?: number;
        description: string;
      }
    >;

    set(time?: number | DateTime): void;
    setDate(date: DateTime): void;
    setTime(hour: number, minute?: number): void;
    setTimeRelative(hour?: number, minute?: number): void;
    pass(seconds: number): any;
    timeTravel(date: DateTime): any;
    isSchoolTerm(date: DateTime): boolean;
    isSchoolDay(date: DateTime): boolean;
    isSchoolTime(date: DateTime): boolean;
    getDayOfYear(date: DateTime): number;
    getSecondsSinceMidnight(date: DateTime): number;
    nextMoonPhase(targetPhase: string): DateTime;
    previousMoonPhase(targetPhase: string): DateTime;
    isBloodMoon(date?: DateTime): boolean;
    getSeason(date: DateTime): string;
    getNextSchoolTermStartDate(date: DateTime): DateTime;
    getNextSchoolTermEndDate(date: DateTime): DateTime;
    getNextWeekdayDate(weekDay: number): DateTime;
    getPreviousWeekdayDate(weekDay: number): DateTime;
    isWeekEnd(): boolean;
    hasDatePassed(month: number, day: number): boolean;
    betweenHours(from: number, to: number, pass?: number): boolean;
    openingHours(minutes?: number): boolean;
    readonly oxygenResaturationDuration: number;
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
