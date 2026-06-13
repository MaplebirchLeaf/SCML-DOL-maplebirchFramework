import type { Passage } from '@scml/types/sugarcube-2-ModLoader/SugarCube2';
import type { BrowserAPI } from '@scml/sc2-verlnir/src/browser';
import type { ConfigAPI } from '@scml/sc2-verlnir/src/config';
import type { DebugBarAPI } from '@scml/sc2-verlnir/src/debugbar';
import type { DialogAPI } from '@scml/sc2-verlnir/src/dialog';
import type { EngineAPI } from '@scml/sc2-verlnir/src/engine';
import type { FullscreenAPI } from '@scml/sc2-verlnir/src/fullscreen';
import type { HasAPI } from '@scml/sc2-verlnir/src/has';
import type { IdbAPI } from '@scml/sc2-verlnir/src/idb';
import type { L10nAPI } from '@scml/sc2-verlnir/src/l10n';
import type { LinksAPI } from '@scml/sc2-verlnir/src/links';
import type { LoadScreenAPI } from '@scml/sc2-verlnir/src/loadscreen';
import type { MacroAPI } from '@scml/sc2-verlnir/src/macro';
import type { PassageAPI, PassageConstructor } from '@scml/sc2-verlnir/src/passage';
import type { SaveAPI as VerlnirSaveAPI } from '@scml/sc2-verlnir/src/save';
import type { ScriptingAPI } from '@scml/sc2-verlnir/src/scripting';
import type { SettingAPI } from '@scml/sc2-verlnir/src/setting';
import type { SimpleAudioAPI } from '@scml/sc2-verlnir/src/simpleaudio';
import type { SimpleStoreAPI, SimpleStoreInstanceAPI } from '@scml/sc2-verlnir/src/simplestore';
import type { StateAPI as VerlnirStateAPI } from '@scml/sc2-verlnir/src/state';
import type { StoryAPI } from '@scml/sc2-verlnir/src/story';
import type { TemplateAPI } from '@scml/sc2-verlnir/src/template';
import type { UIAPI } from '@scml/sc2-verlnir/src/ui';
import type { UIBarAPI } from '@scml/sc2-verlnir/src/uibar';
import type { UtilAPI } from '@scml/sc2-verlnir/src/util';
import type { VersionInfo } from '@scml/sc2-verlnir/src/version';
import type { VisibilityAPI } from '@scml/sc2-verlnir/src/visibility';
import type { WikifierAPI as VerlnirWikifierAPI, WikifierStaticAPI, WikifierParserAPI, WikifierHelpersAPI } from '@scml/sc2-verlnir/src/wikifier';

declare module 'twine-sugarcube/userdata' {
  export interface SugarCubeSetupObject {
    [x: string]: any;
  }

  export interface SugarCubeStoryVariables {
    [x: string]: any;
  }

  export interface SugarCubeTemporaryVariables {
    [x: string]: any;
  }
}

declare module 'twine-sugarcube' {
  export interface WikifierAPI {
    wikifyEval(text: string, passageObj?: { title: string }, passageTitle?: string): DocumentFragment;
  }

  export interface MacroDefinition {
    isAsync?: boolean;
    isWidget?: boolean;
  }
}

export interface DolStateAPI extends VerlnirStateAPI {
  show(): void;
}

export interface DolSaveAPI extends VerlnirSaveAPI {
  serialize(metadata?: any): string;
  deserialize(saveStr: string): any;
}

export type WikifierAPI = VerlnirWikifierAPI & {
  wikifyEval(text: string, passageObj?: { title: string }, passageTitle?: string): DocumentFragment;
};

export interface SugarCubeUtilAPI extends UtilAPI {
  [key: string]: any;
}

export interface TwineSugarCube {
  Browser: BrowserAPI;
  Config: ConfigAPI;
  Dialog: DialogAPI;
  Engine: EngineAPI;
  Fullscreen: FullscreenAPI;
  Has: HasAPI;
  L10n: L10nAPI;
  Links: LinksAPI;
  LoadScreen: LoadScreenAPI;
  Macro: MacroAPI;
  Passage: PassageConstructor;
  Save: DolSaveAPI;
  Scripting: ScriptingAPI;
  Setting: SettingAPI;
  SimpleAudio: SimpleAudioAPI;
  SimpleStore: SimpleStoreAPI;
  State: DolStateAPI;
  Story: StoryAPI;
  Template: TemplateAPI;
  UI: UIAPI;
  UIBar: UIBarAPI;
  DebugBar: DebugBarAPI;
  Util: SugarCubeUtilAPI;
  Visibility: VisibilityAPI;
  Wikifier: WikifierAPI;
  idb: IdbAPI;
  session: SimpleStoreInstanceAPI | null;
  settings: Record<string, unknown>;
  setup: Record<string, unknown>;
  storage: SimpleStoreInstanceAPI | null;
  version: VersionInfo;
}

declare global {
  const V: Record<string, any>;
  const C: Record<string, any>;
  const T: Record<string, any>;

  interface DateTimeData {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    second?: number;
    timeStamp: number;
  }

  interface DateTimeDiff {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }

  interface DateTimeConstructor {
    readonly MIN_DATE: DateTime;
    readonly MAX_DATE: DateTime;
    new (timestamp?: number): DateTime;
    new (date: DateTimeData): DateTime;
    new (year?: number, month?: number, day?: number, hour?: number, minute?: number, second?: number): DateTime;
    toSerialYear(year: number): number;
    fromSerialYear(serialYear: number): number;
    getTotalDaysSinceStart(year: number): number;
    isLeapYear(year: number): boolean;
    getDaysOfMonthFromYear(year: number): readonly number[];
    getDaysOfYear(year: number): number;
  }

  class DateTime implements DateTimeData {
    static readonly MIN_DATE: DateTime;
    static readonly MAX_DATE: DateTime;

    constructor(timestamp?: number);
    constructor(date: DateTimeData);
    constructor(year?: number, month?: number, day?: number, hour?: number, minute?: number, second?: number);

    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    timeStamp: number;

    static toSerialYear(year: number): number;
    static fromSerialYear(serialYear: number): number;
    static getTotalDaysSinceStart(year: number): number;
    static isLeapYear(year: number): boolean;
    static getDaysOfMonthFromYear(year: number): readonly number[];
    static getDaysOfYear(year: number): number;

    toTimestamp(year: number, month: number, day: number, hour: number, minute: number, second: number): this;
    fromTimestamp(timestamp: number): this;
    compareWith(otherDateTime: DateTime, getSeconds?: boolean): number | DateTimeDiff;
    dayDifference(otherDateTime: DateTime): number;
    getFirstWeekdayOfMonth(weekDay: number): DateTime;
    getNextWeekdayDate(weekDay: number): DateTime;
    getPreviousWeekdayDate(weekDay: number): DateTime;

    addYears(years: number): this;
    addMonths(months: number): this;
    addDays(days: number): this;
    addHours(hours: number): this;
    addMinutes(minutes: number): this;
    addSeconds(seconds: number): this;

    isLastDayOfMonth(): boolean;
    isFirstDayOfMonth(): boolean;
    between(startDate: DateTime, endDate: DateTime): boolean;

    readonly midnight: DateTime;
    readonly dayState: string;
    readonly weekDay: number;
    readonly weekDayName: string;
    readonly monthName: string;
    readonly weekEnd: boolean;
    readonly lastDayOfMonth: number;
    readonly yearDay: number;
    readonly moonPhaseFraction: number;
    readonly fractionOfDay: number;
    readonly fractionOfDayFromNoon: number;
    readonly simplifiedDayFactor: number;
    readonly fractionOfYear: number;
    readonly seasonFactor: number;
  }

  interface MoonPhase {
    start: number;
    end: number;
    endAlt?: number;
    description: string;
  }

  interface TimeAPI {
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
    moonPhases: Record<string, MoonPhase>;

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
  }

  const Time: TimeAPI;

  type CanvasLayerMap = Record<string, LayerConfig>;
  type CanvasLayerFilter = string | Record<string, any>;

  type CanvasLayerSrc = string | string[] | undefined;

  type CanvasLayerValueFn<T = any> = (options: any) => T;

  interface CanvasModelOptionsData {
    filters?: Record<string, any>;
    generatedLayers?: CanvasLayerMap;
    [key: string]: any;
  }

  interface LayerConfig {
    name?: string;
    model?: CanvasModel;
    defaultOptions?: LayerConfig;

    show?: boolean;
    src?: CanvasLayerSrc;
    z?: number;
    alpha?: number;
    maskAlpha?: number;
    brightness?: number;
    contrast?: number;
    blend?: string;
    blendMode?: string;
    maskBlendMode?: string;
    compositeOperation?: string;
    desaturate?: boolean;
    masksrc?: CanvasLayerSrc;
    animation?: any;
    filters?: CanvasLayerFilter[];
    dx?: number;
    dy?: number;
    width?: number;
    height?: number;
    worn?: string;
    scale?: boolean | number;
    frameDx?: number;
    frameDy?: number;

    showfn?: CanvasLayerValueFn<boolean>;
    srcfn?: CanvasLayerValueFn<CanvasLayerSrc>;
    zfn?: CanvasLayerValueFn<number>;
    alphafn?: CanvasLayerValueFn<number>;
    maskAlphafn?: CanvasLayerValueFn<number>;
    brightnessfn?: CanvasLayerValueFn<number>;
    contrastfn?: CanvasLayerValueFn<number>;
    blendfn?: CanvasLayerValueFn<string | undefined>;
    blendModefn?: CanvasLayerValueFn<string | undefined>;
    maskBlendModefn?: CanvasLayerValueFn<string | undefined>;
    compositeOperationfn?: CanvasLayerValueFn<string | undefined>;
    desaturatefn?: CanvasLayerValueFn<boolean>;
    masksrcfn?: CanvasLayerValueFn<CanvasLayerSrc>;
    animationfn?: CanvasLayerValueFn<any>;
    filtersfn?: CanvasLayerValueFn<CanvasLayerFilter[] | undefined>;
    dxfn?: CanvasLayerValueFn<number>;
    dyfn?: CanvasLayerValueFn<number>;
    widthfn?: CanvasLayerValueFn<number>;
    heightfn?: CanvasLayerValueFn<number>;
    wornfn?: CanvasLayerValueFn<string | undefined>;
    scalefn?: CanvasLayerValueFn<boolean | number | undefined>;

    [key: string]: any;
  }

  interface CanvasModelOptions {
    name: string;
    width: number;
    height: number;
    layers: CanvasLayerMap;
    frames?: number;
    metadata?: Record<string, any>;
    scale?: boolean | number;

    generatedOptions?: (this: CanvasModel) => any[];
    defaultOptions?: (this: CanvasModel) => CanvasModelOptionsData;
    preprocess?: (this: CanvasModel, options: any) => void;
    postprocess?: (this: CanvasModel, options: any) => void;

    [key: string]: any;
  }

  interface CanvasModelConstructor {
    new (...args: any[]): CanvasModel;
    create(id: string, slot?: string): CanvasModel;
  }

  class CanvasModel {
    static create(id: string, slot?: string): CanvasModel;

    constructor(...args: any[]);

    name: string;
    width: number;
    height: number;
    frames: number;
    metadata: Record<string, any>;
    scale: boolean | number;

    layers: CanvasLayerMap;
    layerList: LayerConfig[];
    options: CanvasModelOptionsData;

    animated: boolean;
    canvas: CanvasRenderingContext2D | null;
    listener?: any;
    rendererListener?: any;

    generatedOptions(): any[];
    defaultOptions(): CanvasModelOptionsData;
    createCanvas(cssAnimated?: boolean): CanvasRenderingContext2D;
    reset(): void;
    showLayer(name: string, filters: CanvasLayerFilter[]): void;
    hideLayer(name: string): void;
    render(canvas: CanvasRenderingContext2D, options?: any, listener?: any): void;
    animate(canvas: CanvasRenderingContext2D, options?: any, listener?: any): any;
    redraw(): any;
    preprocess(options: any): void;
    postprocess(options: any): void;
    compile(options?: any): LayerConfig[];
  }

  export interface JQueryAriaClickOptions {
    role?: string;
  }
}
