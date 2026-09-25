import { Passage } from '@scml/types/sugarcube-2-ModLoader/SugarCube2';
import { BrowserAPI } from '@scml/sc2-verlnir/src/browser';
import { ConfigAPI } from '@scml/sc2-verlnir/src/config';
import { DebugBarAPI } from '@scml/sc2-verlnir/src/debugbar';
import { DialogAPI } from '@scml/sc2-verlnir/src/dialog';
import { EngineAPI } from '@scml/sc2-verlnir/src/engine';
import { FullscreenAPI } from '@scml/sc2-verlnir/src/fullscreen';
import { HasAPI } from '@scml/sc2-verlnir/src/has';
import { L10nAPI } from '@scml/sc2-verlnir/src/l10n';
import { MacroAPI } from '@scml/sc2-verlnir/src/macro';
import { PassageConstructor } from '@scml/sc2-verlnir/src/passage';
import { SaveAPI } from '@scml/sc2-verlnir/src/save';
import { ScriptingAPI } from '@scml/sc2-verlnir/src/scripting';
import { SettingAPI } from '@scml/sc2-verlnir/src/setting';
import { SimpleAudioAPI } from '@scml/sc2-verlnir/src/simpleaudio';
import { SimpleStoreInstanceAPI } from '@scml/sc2-verlnir/src/simplestore';
import { StoryAPI } from '@scml/sc2-verlnir/src/story';
import { UIAPI } from '@scml/sc2-verlnir/src/ui';
import { UIBarAPI } from '@scml/sc2-verlnir/src/uibar';
import { UtilAPI } from '@scml/sc2-verlnir/src/util';
import { VersionInfo } from '@scml/sc2-verlnir/src/version';
import { VisibilityAPI } from '@scml/sc2-verlnir/src/visibility';
import { WikifierAPI } from '@scml/sc2-verlnir/src/wikifier';
import { SugarCubeStoryVariables, SugarCubeTemporaryVariables } from 'twine-sugarcube/userdata';
import { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import { Gui } from '@scml/types/Mod_LoaderGui/Gui';
import * as marked from 'marked';
import jsyaml from 'js-yaml';
import { Howl, HowlOptions } from 'howler';
import { InputFileFormat, JSZipLikeReadOnlyInterface } from '@scml/types/sugarcube-2-ModLoader/JSZipLikeReadOnlyInterface';
import { ModBootJson, ModInfo } from '@scml/types/sugarcube-2-ModLoader/ModLoader';
import { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';
import { ModUtils } from '@scml/types/sugarcube-2-ModLoader/Utils';
import { MacroContext } from 'twine-sugarcube';
//#endregion
//#region src/utils/object.d.ts
type MergeMode = 'replace' | 'concat' | 'merge';
type MergeFilterFn = (key: string, value: unknown, depth: number, targetValue: unknown) => boolean;
type MergeTuple<T extends readonly unknown[], S extends readonly unknown[]> = S extends readonly [infer Head, ...infer Rest]
  ? T extends readonly [infer Previous, ...infer Tail]
    ? [Merged<Previous, Head, 'merge'>, ...MergeTuple<Tail, Rest>]
    : [...S]
  : [...T];
type Merged<T, S, Mode extends MergeMode> = S extends readonly unknown[]
  ? T extends readonly unknown[]
    ? Mode extends 'replace'
      ? [...S]
      : Mode extends 'concat'
        ? [...T, ...S]
        : number extends T['length'] | S['length']
          ? (T[number] | S[number])[]
          : MergeTuple<T, S>
    : [...S]
  : S extends Record<string, unknown>
    ? Omit<T, keyof S> & { [Key in keyof S]: Key extends keyof T ? Merged<T[Key], S[Key], Mode> : S[Key] }
    : S;
type MergeResult<T, Sources extends readonly unknown[], Mode extends MergeMode = 'merge'> = Sources extends readonly [infer Source, ...infer Rest]
  ? MergeResult<Merged<T, Source, Mode>, Rest, Mode>
  : T;
declare function clone<T>(source: T, deep?: boolean, proto?: boolean, map?: WeakMap<object, unknown>): T;
declare function equal(a: unknown, b: unknown): boolean;
declare function merge<T, Sources extends unknown[]>(target: T, ...sources: Sources): MergeResult<T, Sources>;
declare function append<T, Sources extends unknown[]>(target: T, ...sources: Sources): MergeResult<T, Sources, 'concat'>;
declare function cover<T, Sources extends unknown[]>(target: T, ...sources: Sources): MergeResult<T, Sources, 'replace'>;
declare function mergeFn<T, Sources extends unknown[]>(target: T, filter: MergeFilterFn | null, ...sources: Sources): MergeResult<T, Sources>;
declare function appendFn<T, Sources extends unknown[]>(target: T, filter: MergeFilterFn | null, ...sources: Sources): MergeResult<T, Sources, 'concat'>;
declare function coverFn<T, Sources extends unknown[]>(target: T, filter: MergeFilterFn | null, ...sources: Sources): MergeResult<T, Sources, 'replace'>;
//#endregion
//#region src/utils/array.d.ts
type ContainsMode = 'all' | 'any' | 'none';
type ContainsOptions = {
  case?: boolean;
  compare?: (item: unknown, value: unknown) => boolean;
  deep?: boolean;
};
declare function contains(array: readonly unknown[], value: unknown, mode?: ContainsMode, options?: ContainsOptions): boolean;
declare function randomNumber(min?: number, max?: number, float?: boolean): number;
declare function randomPick<T>(items: readonly T[], weights?: readonly number[] | null, allowNull?: boolean): T | null | undefined;
declare function clamp(value: unknown, min: number, max: number, fallback?: number): number;
//#endregion
//#region src/utils/string.d.ts
type ConvertMode$1 = 'lower' | 'upper' | 'capitalize' | 'title' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant';
declare function convert(
  value: string,
  mode?: ConvertMode$1,
  options?: {
    delimiter?: string;
    acronym?: boolean;
  }
): string;
declare function escapeHtmlText(value: string): string;
declare function widgets(content: string): string;
declare function widgets(...contents: string[]): string[];
//#endregion
//#region src/compat/Prototype.d.ts
declare global {
  interface ObjectConstructor {
    merge<T extends object = Record<string, unknown>>(...sources: unknown[]): T;
    append<T extends object = Record<string, unknown>>(...sources: unknown[]): T;
    cover<T extends object = Record<string, unknown>>(...sources: unknown[]): T;
    mergefn<T extends object = Record<string, unknown>>(filterFn: MergeFilterFn | null, ...sources: unknown[]): T;
    appendfn<T extends object = Record<string, unknown>>(filterFn: MergeFilterFn | null, ...sources: unknown[]): T;
    coverfn<T extends object = Record<string, unknown>>(filterFn: MergeFilterFn | null, ...sources: unknown[]): T;
  }
  interface Array<T> {
    contains(value: unknown, mode?: ContainsMode, options?: ContainsOptions): boolean;
    either(weights?: number[], allowNull?: boolean): T | null | undefined;
  }
  interface ArrayConstructor {
    merge<T>(...sources: readonly T[][]): T[];
    append<T>(...sources: readonly T[][]): T[];
    cover<T>(...sources: readonly T[][]): T[];
  }
  interface ReadonlyArray<T> {
    contains(value: unknown, mode?: ContainsMode, options?: ContainsOptions): boolean;
    either(weights?: number[], allowNull?: boolean): T | null | undefined;
  }
  interface String {
    contains(
      value: string,
      options?: {
        case?: boolean;
      }
    ): boolean;
    convert(
      mode?: ConvertMode$1,
      options?: {
        delimiter?: string;
        acronym?: boolean;
      }
    ): string;
  }
  interface Math {
    random(): number;
    random(max: number): number;
    random(min: number, max: number, float?: boolean): number;
    clamp(value: unknown, min: number, max: number, fallback?: number): number;
  }
}
//#endregion
//#region src/modules/DoL/Patches/Bodywriting.d.ts
interface BodywritingConfig {
  writing?: string;
  writ_cn?: string;
  type?: 'text' | 'object';
  arrow?: 0 | 1;
  special?: string;
  gender?: 'n' | 'f' | 'm' | 'h';
  lewd?: 0 | 1;
  degree?: number;
  featSkip?: boolean;
  sprites?: string[];
  index?: number;
  key?: string;
}
type BodywritingData =
  | {
      operation: 'add';
      config: BodywritingConfig;
    }
  | {
      operation: 'del';
    };
type BodywritingItem = BodywritingConfig & {
  index: number;
  key: string;
};
declare class Bodywriting {
  static add(key: string, config: BodywritingConfig): void;
  static delete(key: string): void;
  static apply(): void;
  private static remove;
  private static set;
}
//#endregion
//#region src/modules/DoL/Patches/Foodstuff.d.ts
type FoodstuffSeason = 'spring' | 'summer' | 'autumn' | 'winter';
type FoodstuffPlantingBed = 'earth' | 'water';
type FoodstuffStallSize = 'small' | 'large';
interface FoodstuffConfig {
  key?: string;
  index?: number;
  is_fishing_bait?: boolean;
  name?: string;
  singular?: string;
  plural?: string;
  icon?: string;
  category?: string;
  kitchen_item_type_icon?: string;
  prop_folder?: string;
  ingredient_alternatives?: Partial<Record<'normal' | 'lewd', string[]>>;
  tending?: {
    planting_bed?: FoodstuffPlantingBed;
    growth_days?: number;
    featCost?: number;
    yield_multiplier?: number;
    has_seeds?: boolean;
    seed_name?: string;
    seasons?: FoodstuffSeason[];
    affected_by_tending_skill?: boolean;
    tags?: string[];
    [key: string]: unknown;
  };
  shop?: {
    sell_price?: number;
    available_in?: string[];
    bought_in_bulk?: number;
    stall_size?: FoodstuffStallSize;
    [key: string]: unknown;
  };
  recipe?: {
    recipe_name?: string;
    difficulty?: number;
    cook_minutes?: number;
    servings?: number;
    ingredients?: string[];
    ingredient_alternatives?: Partial<Record<'normal' | 'lewd', Record<string, string[]>>>;
    tags?: string[];
    [key: string]: unknown;
  };
  food?: {
    handheld_gift?: boolean;
    tags?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
type FoodstuffItem = FoodstuffConfig & Required<Pick<FoodstuffConfig, 'index' | 'name' | 'singular' | 'plural' | 'icon' | 'category' | 'kitchen_item_type_icon' | 'prop_folder'>>;
declare class Foodstuff {
  static add(key: string, config: FoodstuffConfig): void;
  static apply(): void;
  static syncState(): void;
  static applySetup(): void;
  private static set;
  private static nextIndex;
  private static sort;
  private static ensureState;
}
//#endregion
//#region src/modules/DoL/Patches/Location.d.ts
interface LocationConfigOptions {
  overwrite?: boolean;
  layer?: string;
  element?: string;
}
interface LocationElement {
  condition?: () => boolean;
  image?: string;
  frame?: number | (() => number);
  animation?: {
    frameDelay?: number;
    cycleDelay?: number | (() => number);
  };
  [key: string]: unknown;
}
interface LocationConfig extends LocationElement {
  folder?: string;
  base?: Record<string, LocationElement> | LocationElement;
  emissive?: Record<string, LocationElement> | LocationElement;
  reflective?: Record<string, LocationElement> | LocationElement;
  layerTop?: Record<string, LocationElement> | LocationElement;
  weather?: Record<string, unknown>;
  particles?: Record<string, unknown>[];
  customMapping?: () => string;
}
interface LocationUpdate {
  overwrite: boolean;
  config: LocationConfig;
  customMapping: (() => string) | null;
}
declare class Location {
  static configure(locationId: string, config: LocationConfig, options?: LocationConfigOptions): boolean;
  static apply(): void;
}
//#endregion
//#region src/modules/DoL/Patches/Fishing.d.ts
type FishingLocation = 'fishingBeach' | 'fishingPier' | 'fishingCoastPath' | 'fishingForestLake' | 'fishingMoor';
type FishingSeason = 'spring' | 'summer' | 'autumn' | 'winter';
type FishBehavior = 'runner' | 'darter' | 'panicked' | 'anchor' | 'thrasher' | 'slipper';
interface FishConfig {
  minSize: number;
  maxSize: number;
  locations: Partial<Record<FishingLocation, number>>;
  icon: string;
  preferredSeason?: FishingSeason[];
  preferredLocation?: FishingLocation[];
  preferredBait?: string;
  cookable?: boolean;
  requiresBaitFish?: boolean;
  isBaitFish?: boolean;
  minigame?: {
    behavior: FishBehavior;
    maxStamina: number;
    armFatigueDifficulty: number;
  };
  foodstuff?: FoodstuffConfig;
}
type FishData = Omit<FishConfig, 'foodstuff'> & Required<Pick<FishConfig, 'preferredSeason' | 'preferredLocation' | 'cookable'>>;
declare class Fishing {
  static addFish(key: string, config: FishConfig): boolean;
  static addBait(key: string, config: FoodstuffConfig): void;
  static configureLocation(location: FishingLocation, weights: Record<string, number>): boolean;
  static apply(): void;
}
//#endregion
//#region src/modules/DoL/Patches/Antiques.d.ts
interface AntiqueConfig {
  hint: string;
  museum: string;
  name: string;
  cn_name?: string;
  journal: string;
  journalName?: string;
  icon: string;
  key?: string;
}
declare class Antiques {
  static add(key: string, config: AntiqueConfig): void;
  static inject(data: Record<string, AntiqueConfig>): Record<string, AntiqueConfig>;
  static syncState(): void;
}
//#endregion
//#region src/modules/DoL/Patches/Traits.d.ts
interface TraitCategory {
  title: string;
  traits: Trait[];
}
interface Trait {
  name: string;
  colour: string;
  has: boolean;
  text: string;
}
interface TraitConfig {
  title: string;
  name: string | (() => string);
  colour: string | (() => string);
  has: boolean | (() => boolean);
  text: string | (() => string);
}
declare class Traits {
  static add(...traits: Partial<TraitConfig>[]): void;
  static inject(data: TraitCategory[], translate: (text: string) => string): TraitCategory[];
  private static resolve;
}
//#endregion
//#region types/twine-sugarcube.d.ts
declare module 'twine-sugarcube/userdata' {
  export interface SugarCubeSetupObject {
    bodywriting: Record<string, BodywritingItem>;
    bodywriting_namebyindex: (string | undefined)[];
    foodstuff: Record<string, FoodstuffItem>;
    LocationImages: Record<string, LocationConfig>;
    Locations: Record<string, () => string>;
    tips: Record<string, string[]>;
    tipsList: string[];
    fishing?: {
      lootTables: {
        fish: Record<string, FishData>;
      };
    };
    [x: string]: any;
  }
  export interface SugarCubeStoryVariables {
    foodstuff: Record<
      string,
      {
        amount: number;
        [key: string]: unknown;
      }
    >;
    museumAntiques?: {
      antiques: Record<string, string>;
      maxCount: number;
      [key: string]: unknown;
    };
    [x: string]: any;
  }
  export interface SugarCubeTemporaryVariables {
    traitLists: TraitCategory[];
    museumAntiqueText: Record<string, AntiqueConfig>;
    [x: string]: any;
  }
}
declare module 'twine-sugarcube' {
  export interface WikifierAPI {
    wikifyEval(
      text: string,
      passageObj?: {
        title: string;
      },
      passageTitle?: string
    ): DocumentFragment;
  }
  export interface MacroDefinition {
    isAsync?: boolean;
    isWidget?: boolean;
  }
}
interface DolStateMoment {
  readonly title: string;
  readonly variables: Record<string, unknown>;
}
interface DolStateMetadataAPI {
  clear(): void;
  delete(key: string): boolean;
  entries(): Iterable<[string, unknown]>;
  get(key: string): unknown;
  has(key: string): boolean;
  keys(): Iterable<string>;
  set(key: string, value: unknown): void;
  readonly size: number;
}
interface DolStatePRNGAPI {
  init(seed: string | number): void;
  isEnabled(): boolean;
  pull: number;
  readonly seed: string | number;
  str2int(str: string): number;
  test(seed: string | number): boolean;
  peek(): number;
}
interface DolStateAPI {
  reset(): void;
  restore(soft?: boolean): boolean;
  marshalForSave(): unknown;
  unmarshalForSave(stateObj: unknown): void;
  readonly expired: string[];
  readonly passages: string[];
  getSessionState(): unknown;
  setSessionState(state: unknown): void;
  readonly active: DolStateMoment;
  readonly activeIndex: number;
  readonly current: DolStateMoment | undefined;
  readonly top: DolStateMoment | undefined;
  readonly bottom: DolStateMoment | undefined;
  readonly history: DolStateMoment[];
  readonly passage: string;
  readonly variables: Record<string, unknown>;
  readonly temporary: Record<string, unknown>;
  readonly length: number;
  readonly size: number;
  readonly turns: number;
  create(): DolStateMoment;
  goTo(index: number): void;
  go(delta: number): void;
  deltaEncode(moments: DolStateMoment[]): unknown;
  deltaDecode(data: unknown): DolStateMoment[];
  readonly prng: DolStatePRNGAPI;
  clearTemporary(): void;
  pushLocal(): void;
  popLocal(): Record<string, unknown> | undefined;
  peekLocal(): Record<string, unknown> | undefined;
  readonly local: Record<string, unknown>;
  clearLocal(): void;
  getVar(path: string): unknown;
  setVar(path: string, value: unknown): void;
  has(offset: number): boolean;
  hasPlayed(passage: string): boolean;
  index(offset?: number): number;
  isEmpty(): boolean;
  peek(offset?: number): DolStateMoment | undefined;
  random(): number;
  readonly metadata: DolStateMetadataAPI;
  readonly qc: unknown;
  qcadd(fn: (...args: unknown[]) => void): void;
  initPRNG(seed: string | number): void;
  restart(): void;
  backward(): void;
  forward(): void;
  display(...args: unknown[]): void;
  show(...args: unknown[]): void;
  play(...args: unknown[]): void;
}
interface DolSaveAPI extends SaveAPI {
  serialize(metadata?: unknown): string;
  deserialize(saveStr: string): unknown;
}
type WikifierAPI$1 = WikifierAPI & {
  wikifyEval(
    text: string,
    passageObj?: {
      title: string;
    },
    passageTitle?: string
  ): DocumentFragment;
};
type SugarCubeUtilAPI = UtilAPI;
interface TwineSugarCube {
  Browser: BrowserAPI;
  Config: ConfigAPI;
  Dialog: DialogAPI;
  Engine: EngineAPI;
  Fullscreen: FullscreenAPI;
  Has: HasAPI;
  L10n: L10nAPI;
  Macro: MacroAPI;
  Passage: PassageConstructor;
  Save: DolSaveAPI;
  Scripting: ScriptingAPI;
  Setting: SettingAPI;
  SimpleAudio: SimpleAudioAPI;
  State: DolStateAPI;
  Story: StoryAPI;
  UI: UIAPI;
  UIBar: UIBarAPI;
  DebugBar: DebugBarAPI;
  Util: SugarCubeUtilAPI;
  Visibility: VisibilityAPI;
  Wikifier: WikifierAPI$1;
  session: SimpleStoreInstanceAPI | null;
  settings: Record<string, unknown>;
  setup: Record<string, unknown>;
  storage: SimpleStoreInstanceAPI | null;
  version: VersionInfo;
}
declare global {
  const V: SugarCubeStoryVariables;
  const C: Record<string, any>;
  const T: SugarCubeTemporaryVariables;
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
  type CanvasLayerMask =
    | string
    | {
        path: string;
        offsetX?: number;
        offsetY?: number;
        convert?: boolean;
      };
  type CanvasLayerMaskSrc = CanvasLayerMask | CanvasLayerMask[] | undefined;
  interface CanvasLayerWorn {
    slot: string;
    integrity: string | number;
    alt?: string;
    index: number;
  }
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
    masksrc?: CanvasLayerMaskSrc;
    animation?: any;
    filters?: CanvasLayerFilter[];
    dx?: number;
    dy?: number;
    width?: number;
    height?: number;
    worn?: CanvasLayerWorn;
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
    masksrcfn?: CanvasLayerValueFn<CanvasLayerMaskSrc>;
    animationfn?: CanvasLayerValueFn<any>;
    filtersfn?: CanvasLayerValueFn<CanvasLayerFilter[] | undefined>;
    dxfn?: CanvasLayerValueFn<number>;
    dyfn?: CanvasLayerValueFn<number>;
    widthfn?: CanvasLayerValueFn<number>;
    heightfn?: CanvasLayerValueFn<number>;
    wornfn?: CanvasLayerValueFn<CanvasLayerWorn | undefined>;
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
//#endregion
//#region src/utils/binary.d.ts
declare function textToBytes(value: string): Uint8Array;
declare function jsonToBytes(value: unknown): Uint8Array;
declare function bytesToJson<T = unknown>(bytes: Uint8Array | ArrayBuffer): T;
declare function toArrayBuffer(bytes: Uint8Array): ArrayBuffer;
declare function bytesToBase64(bytes: Uint8Array): string;
declare function base64ToBytes(value: string): Uint8Array;
declare function base64ToArrayBuffer(value: string): ArrayBuffer;
declare function basicAuth(username: string, password: string): string;
//#endregion
//#region src/utils/selector.d.ts
type Comparator = '<' | '<=' | '>' | '>=';
type ResultValue<Input, Result, Meta> = Result | ((input: Input, meta: Meta) => Result);
declare class SelectCase<Input = unknown, Result = unknown, Meta = Record<string, unknown>> {
  private readonly cases;
  private defaultResult;
  private valueType;
  private allowMixedTypes;
  case(condition: string | number | ((input: Input, meta: Meta) => boolean), result: ResultValue<Input, Result, Meta>): this;
  casePredicate(fn: (input: Input, meta: Meta) => boolean, result: ResultValue<Input, Result, Meta>): this;
  caseRange(min: number, max: number, result: ResultValue<Input, Result, Meta>): this;
  caseIn(values: readonly (string | number)[], result: ResultValue<Input, Result, Meta>): this;
  caseIncludes(values: string | readonly string[], result: ResultValue<Input, Result, Meta>): this;
  caseRegex(regex: RegExp, result: ResultValue<Input, Result, Meta>): this;
  caseCompare(operator: Comparator, value: number, result: ResultValue<Input, Result, Meta>): this;
  else(result: ResultValue<Input, Result, Meta>): this;
  match(input: Input, meta?: Meta): Result | null;
  private resolve;
  private validateType;
}
declare namespace index_d_exports {
  export {
    SelectCase,
    append,
    appendFn as appendfn,
    base64ToArrayBuffer,
    base64ToBytes,
    basicAuth,
    bytesToBase64,
    bytesToJson,
    clamp,
    clone,
    contains,
    convert,
    cover,
    coverFn as coverfn,
    randomPick as either,
    equal,
    escapeHtmlText,
    jsonToBytes,
    merge,
    mergeFn as mergefn,
    publicUtils,
    randomNumber as random,
    textToBytes,
    toArrayBuffer,
    widgets
  };
}
declare const publicUtils: Readonly<{
  clone: typeof clone;
  equal: typeof equal;
  merge: typeof merge;
  append: typeof append;
  cover: typeof cover;
  mergefn: typeof mergeFn;
  appendfn: typeof appendFn;
  coverfn: typeof coverFn;
  contains: typeof contains;
  random: typeof randomNumber;
  either: typeof randomPick;
  SelectCase: typeof SelectCase;
  convert: typeof convert;
  clamp: typeof clamp;
}>;
//#endregion
//#region src/infra/Logger.d.ts
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export declare class Logger {
  readonly modloader?: ModLoader | undefined;
  private static readonly LEVELS;
  private static readonly CONFIG;
  private static readonly FORWARD;
  private static level;
  constructor(modloader?: ModLoader | undefined);
  static toLevel(level: string | number): LogLevel;
  log(message: string, levelName?: string | number, ...objects: unknown[]): void;
  set LevelName(levelName: string);
  get LevelName(): string;
}
//#endregion
//#region src/infra/Diagnostics.d.ts
interface DiagnosticRecord {
  at: string;
  level: LogLevel;
  scope?: string;
  message: string;
  data?: unknown;
}
interface PatchResult {
  kind: 'passage' | 'script' | 'style' | 'source';
  target: string;
  index: number;
  pattern: string;
  matches: number;
  applied: number;
  status: 'applied' | 'unmatched' | 'missing' | 'invalid' | 'mismatch' | 'error';
  expected?: number;
  error?: string;
}
interface ModConflict {
  source: string;
  dataSource: string;
  passages: string[];
  scripts: string[];
  styles: string[];
}
type ScopedLog = (message: string, level?: string, ...objects: unknown[]) => void;
export declare class Diagnostics extends Logger {
  readonly scope: string;
  private static readonly entries;
  private static readonly patchResults;
  constructor(modloader?: ModLoader, scope?: string);
  static message(error: unknown): string;
  log(message: string, levelName?: string | number, ...objects: unknown[]): void;
  record(message: string, level?: string, scope?: string, ...objects: unknown[]): void;
  write(message: string, level?: string, scope?: string, ...objects: unknown[]): void;
  scoped(scope: string): ScopedLog;
  get history(): readonly DiagnosticRecord[];
  get errors(): DiagnosticRecord[];
  get patches(): PatchResult[];
  recordPatch(result: PatchResult): void;
  clearPatches(): void;
  get conflicts(): ModConflict[] | undefined;
  export(): string;
  reset(): void;
}
//#endregion
//#region src/host/Resources.d.ts
type ImageResult = string | false;
declare class Resources {
  private readonly manager;
  private readonly report;
  private readonly cache;
  private readonly pending;
  constructor(manager: SC2DataManager, report: (path: string, error: unknown) => void);
  normalize(path: string): string;
  has(path: string): boolean | undefined;
  load(path: string): ImageResult | Promise<ImageResult>;
  clear(path?: string): void;
  private resolve;
}
//#endregion
//#region src/host/ModLoader.d.ts
type Replacement = [RegExp, string];
type TwineAssetMode = 'append' | 'replace' | 'patch';
interface SourcePatch {
  src?: string;
  srcmatch?: RegExp;
  srcmatchgroup?: RegExp;
  to?: string;
  applyafter?: string;
  applybefore?: string;
  expected?: number;
}
export declare class ModLoader {
  readonly modSC2DataManager: SC2DataManager;
  readonly modLoaderGui: Gui;
  static getLodash(): ReturnType<ReturnType<SC2DataManager['getModUtils']>['getLodash']>;
  readonly diagnostics: Diagnostics;
  readonly resources: Resources;
  constructor(modSC2DataManager: SC2DataManager, modLoaderGui: Gui);
  replace(content: string, replacements: Replacement[], label?: string): string;
  defineTwineAsset(type: 'script' | 'style', name: string, content: string | ((current: string) => string), mode?: TwineAssetMode): void;
  disabled(modNames: string | string[], reload?: boolean): Promise<boolean>;
  get modUtils(): ReturnType<SC2DataManager['getModUtils']>;
  get modLoader(): ReturnType<SC2DataManager['getModLoader']>;
  get loadController(): ReturnType<SC2DataManager['getModLoadController']>;
  get dependence(): ReturnType<SC2DataManager['getDependenceChecker']>;
  get conflict(): ReturnType<SC2DataManager['getConflictResult']>;
  get lodash(): ReturnType<ReturnType<SC2DataManager['getModUtils']>['getLodash']>;
}
//#endregion
//#region src/host/SugarCube.d.ts
interface SaveObject {
  state: {
    history: DolStateMoment[];
    index?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
export declare class Save {
  private readonly state;
  readonly details?: unknown;
  readonly saveObj: SaveObject;
  constructor(state: DolStateAPI, saveObj: unknown, details?: unknown);
  get V(): Record<string, unknown>;
  use<Result>(variables: Record<string, unknown>, callback: () => Result): Result;
}
export declare class SugarCube {
  runtime: TwineSugarCube | undefined;
  passage: Passage;
  require(): TwineSugarCube;
  save(saveObj: unknown, details?: unknown): Save;
}
//#endregion
//#region src/infra/Emitter.d.ts
type EventCallback<Args extends unknown[] = unknown[]> = (...args: Args) => unknown;
export declare class Emitter extends Diagnostics {
  private readonly events;
  private readonly afters;
  private readonly triggering;
  private readonly stickyEvents;
  private readonly stickyArgs;
  private readonly synchronousEvents;
  on<Args extends unknown[]>(eventName: string, callback: EventCallback<Args>, description?: string): boolean;
  off<Args extends unknown[]>(eventName: string, identifier: EventCallback<Args> | string): boolean;
  once<Args extends unknown[]>(eventName: string, callback: EventCallback<Args>, description?: string): boolean;
  trigger(eventName: string, ...args: unknown[]): Promise<void>;
  after<Args extends unknown[]>(eventName: string, callback: EventCallback<Args>): void;
  private pending;
  private callSticky;
}
//#endregion
//#region node_modules/idb/build/entry.d.ts
type KeyToKeyNoIndex<T> = { [K in keyof T]: string extends K ? never : number extends K ? never : K };
type ValuesOf<T> = T extends { [K in keyof T]: infer U } ? U : never;
type KnownKeys<T> = ValuesOf<KeyToKeyNoIndex<T>>;
type Omit$1<T, K> = Pick<T, Exclude<keyof T, K>>;
interface DBSchema {
  [s: string]: DBSchemaValue;
}
interface IndexKeys {
  [s: string]: IDBValidKey;
}
interface DBSchemaValue {
  key: IDBValidKey;
  value: any;
  indexes?: IndexKeys;
}
/**
 * Extract known object store names from the DB schema type.
 *
 * @template DBTypes DB schema type, or unknown if the DB isn't typed.
 */
type StoreNames<DBTypes extends DBSchema | unknown> = DBTypes extends DBSchema ? KnownKeys<DBTypes> : string;
/**
 * Extract database value types from the DB schema type.
 *
 * @template DBTypes DB schema type, or unknown if the DB isn't typed.
 * @template StoreName Names of the object stores to get the types of.
 */
type StoreValue<DBTypes extends DBSchema | unknown, StoreName extends StoreNames<DBTypes>> = DBTypes extends DBSchema ? DBTypes[StoreName]['value'] : any;
/**
 * Extract database key types from the DB schema type.
 *
 * @template DBTypes DB schema type, or unknown if the DB isn't typed.
 * @template StoreName Names of the object stores to get the types of.
 */
type StoreKey<DBTypes extends DBSchema | unknown, StoreName extends StoreNames<DBTypes>> = DBTypes extends DBSchema ? DBTypes[StoreName]['key'] : IDBValidKey;
/**
 * Extract the names of indexes in certain object stores from the DB schema type.
 *
 * @template DBTypes DB schema type, or unknown if the DB isn't typed.
 * @template StoreName Names of the object stores to get the types of.
 */
type IndexNames<DBTypes extends DBSchema | unknown, StoreName extends StoreNames<DBTypes>> = DBTypes extends DBSchema ? keyof DBTypes[StoreName]['indexes'] & string : string;
/**
 * Extract the types of indexes in certain object stores from the DB schema type.
 *
 * @template DBTypes DB schema type, or unknown if the DB isn't typed.
 * @template StoreName Names of the object stores to get the types of.
 * @template IndexName Names of the indexes to get the types of.
 */
type IndexKey<DBTypes extends DBSchema | unknown, StoreName extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName>> = DBTypes extends DBSchema
  ? IndexName extends keyof DBTypes[StoreName]['indexes']
    ? DBTypes[StoreName]['indexes'][IndexName]
    : IDBValidKey
  : IDBValidKey;
type CursorSource<
  DBTypes extends DBSchema | unknown,
  TxStores extends ArrayLike<StoreNames<DBTypes>>,
  StoreName extends StoreNames<DBTypes>,
  IndexName extends IndexNames<DBTypes, StoreName> | unknown,
  Mode extends IDBTransactionMode = 'readonly'
> = IndexName extends IndexNames<DBTypes, StoreName> ? IDBPIndex<DBTypes, TxStores, StoreName, IndexName, Mode> : IDBPObjectStore<DBTypes, TxStores, StoreName, Mode>;
type CursorKey<DBTypes extends DBSchema | unknown, StoreName extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> | unknown> =
  IndexName extends IndexNames<DBTypes, StoreName> ? IndexKey<DBTypes, StoreName, IndexName> : StoreKey<DBTypes, StoreName>;
type IDBPDatabaseExtends = Omit$1<IDBDatabase, 'createObjectStore' | 'deleteObjectStore' | 'transaction' | 'objectStoreNames'>;
type DOMStringListSymbolIteratorType = DOMStringList extends {
  [Symbol.iterator](): infer R;
}
  ? R
  : IterableIterator<string>;
/**
 * A variation of DOMStringList with precise string types
 */
interface TypedDOMStringList<T extends string> extends DOMStringList {
  contains(string: T): boolean;
  item(index: number): T | null;
  [index: number]: T;
  /**
   * To resolve https://github.com/jakearchibald/idb/issues/327,
   * and for compatibility with TypeScript >= 5.6 with ArrayIterator.
   */
  [Symbol.iterator](): IterableIterator<string> extends DOMStringListSymbolIteratorType ? IterableIterator<T> : DOMStringListSymbolIteratorType & Iterator<T>;
}
interface IDBTransactionOptions {
  /**
   * The durability of the transaction.
   *
   * The default is "default". Using "relaxed" provides better performance, but with fewer
   * guarantees. Web applications are encouraged to use "relaxed" for ephemeral data such as caches
   * or quickly changing records, and "strict" in cases where reducing the risk of data loss
   * outweighs the impact to performance and power.
   */
  durability?: 'default' | 'strict' | 'relaxed';
}
interface IDBPDatabase<DBTypes extends DBSchema | unknown = unknown> extends IDBPDatabaseExtends {
  /**
   * The names of stores in the database.
   */
  readonly objectStoreNames: TypedDOMStringList<StoreNames<DBTypes>>;
  /**
   * Creates a new object store.
   *
   * Throws a "InvalidStateError" DOMException if not called within an upgrade transaction.
   */
  createObjectStore<Name extends StoreNames<DBTypes>>(name: Name, optionalParameters?: IDBObjectStoreParameters): IDBPObjectStore<DBTypes, ArrayLike<StoreNames<DBTypes>>, Name, 'versionchange'>;
  /**
   * Deletes the object store with the given name.
   *
   * Throws a "InvalidStateError" DOMException if not called within an upgrade transaction.
   */
  deleteObjectStore(name: StoreNames<DBTypes>): void;
  /**
   * Start a new transaction.
   *
   * @param storeNames The object store(s) this transaction needs.
   * @param mode
   * @param options
   */
  transaction<Name extends StoreNames<DBTypes>, Mode extends IDBTransactionMode = 'readonly'>(storeNames: Name, mode?: Mode, options?: IDBTransactionOptions): IDBPTransaction<DBTypes, [Name], Mode>;
  transaction<Names extends ArrayLike<StoreNames<DBTypes>>, Mode extends IDBTransactionMode = 'readonly'>(
    storeNames: Names,
    mode?: Mode,
    options?: IDBTransactionOptions
  ): IDBPTransaction<DBTypes, Names, Mode>;
  /**
   * Add a value to a store.
   *
   * Rejects if an item of a given key already exists in the store.
   *
   * This is a shortcut that creates a transaction for this single action. If you need to do more
   * than one action, create a transaction instead.
   *
   * @param storeName Name of the store.
   * @param value
   * @param key
   */
  add<Name extends StoreNames<DBTypes>>(storeName: Name, value: StoreValue<DBTypes, Name>, key?: StoreKey<DBTypes, Name> | IDBKeyRange): Promise<StoreKey<DBTypes, Name>>;
  /**
   * Deletes all records in a store.
   *
   * This is a shortcut that creates a transaction for this single action. If you need to do more
   * than one action, create a transaction instead.
   *
   * @param storeName Name of the store.
   */
  clear(name: StoreNames<DBTypes>): Promise<void>;
  /**
   * Retrieves the number of records matching the given query in a store.
   *
   * This is a shortcut that creates a transaction for this single action. If you need to do more
   * than one action, create a transaction instead.
   *
   * @param storeName Name of the store.
   * @param key
   */
  count<Name extends StoreNames<DBTypes>>(storeName: Name, key?: StoreKey<DBTypes, Name> | IDBKeyRange | null): Promise<number>;
  /**
   * Retrieves the number of records matching the given query in an index.
   *
   * This is a shortcut that creates a transaction for this single action. If you need to do more
   * than one action, create a transaction instead.
   *
   * @param storeName Name of the store.
   * @param indexName Name of the index within the store.
   * @param key
   */
  countFromIndex<Name extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, Name>>(
    storeName: Name,
    indexName: IndexName,
    key?: IndexKey<DBTypes, Name, IndexName> | IDBKeyRange | null
  ): Promise<number>;
  /**
   * Deletes records in a store matching the given query.
   *
   * This is a shortcut that creates a transaction for this single action. If you need to do more
   * than one action, create a transaction instead.
   *
   * @param storeName Name of the store.
   * @param key
   */
  delete<Name extends StoreNames<DBTypes>>(storeName: Name, key: StoreKey<DBTypes, Name> | IDBKeyRange): Promise<void>;
  /**
   * Retrieves the value of the first record in a store matching the query.
   *
   * Resolves with undefined if no match is found.
   *
   * This is a shortcut that creates a transaction for this single action. If you need to do more
   * than one action, create a transaction instead.
   *
   * @param storeName Name of the store.
   * @param query
   */
  get<Name extends StoreNames<DBTypes>>(storeName: Name, query: StoreKey<DBTypes, Name> | IDBKeyRange): Promise<StoreValue<DBTypes, Name> | undefined>;
  /**
   * Retrieves the value of the first record in an index matching the query.
   *
   * Resolves with undefined if no match is found.
   *
   * This is a shortcut that creates a transaction for this single action. If you need to do more
   * than one action, create a transaction instead.
   *
   * @param storeName Name of the store.
   * @param indexName Name of the index within the store.
   * @param query
   */
  getFromIndex<Name extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, Name>>(
    storeName: Name,
    indexName: IndexName,
    query: IndexKey<DBTypes, Name, IndexName> | IDBKeyRange
  ): Promise<StoreValue<DBTypes, Name> | undefined>;
  /**
   * Retrieves all values in a store that match the query.
   *
   * This is a shortcut that creates a transaction for this single action. If you need to do more
   * than one action, create a transaction instead.
   *
   * @param storeName Name of the store.
   * @param query
   * @param count Maximum number of values to return.
   */
  getAll<Name extends StoreNames<DBTypes>>(storeName: Name, query?: StoreKey<DBTypes, Name> | IDBKeyRange | null, count?: number): Promise<StoreValue<DBTypes, Name>[]>;
  /**
   * Retrieves all values in an index that match the query.
   *
   * This is a shortcut that creates a transaction for this single action. If you need to do more
   * than one action, create a transaction instead.
   *
   * @param storeName Name of the store.
   * @param indexName Name of the index within the store.
   * @param query
   * @param count Maximum number of values to return.
   */
  getAllFromIndex<Name extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, Name>>(
    storeName: Name,
    indexName: IndexName,
    query?: IndexKey<DBTypes, Name, IndexName> | IDBKeyRange | null,
    count?: number
  ): Promise<StoreValue<DBTypes, Name>[]>;
  /**
   * Retrieves the keys of records in a store matching the query.
   *
   * This is a shortcut that creates a transaction for this single action. If you need to do more
   * than one action, create a transaction instead.
   *
   * @param storeName Name of the store.
   * @param query
   * @param count Maximum number of keys to return.
   */
  getAllKeys<Name extends StoreNames<DBTypes>>(storeName: Name, query?: StoreKey<DBTypes, Name> | IDBKeyRange | null, count?: number): Promise<StoreKey<DBTypes, Name>[]>;
  /**
   * Retrieves the keys of records in an index matching the query.
   *
   * This is a shortcut that creates a transaction for this single action. If you need to do more
   * than one action, create a transaction instead.
   *
   * @param storeName Name of the store.
   * @param indexName Name of the index within the store.
   * @param query
   * @param count Maximum number of keys to return.
   */
  getAllKeysFromIndex<Name extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, Name>>(
    storeName: Name,
    indexName: IndexName,
    query?: IndexKey<DBTypes, Name, IndexName> | IDBKeyRange | null,
    count?: number
  ): Promise<StoreKey<DBTypes, Name>[]>;
  /**
   * Retrieves the key of the first record in a store that matches the query.
   *
   * Resolves with undefined if no match is found.
   *
   * This is a shortcut that creates a transaction for this single action. If you need to do more
   * than one action, create a transaction instead.
   *
   * @param storeName Name of the store.
   * @param query
   */
  getKey<Name extends StoreNames<DBTypes>>(storeName: Name, query: StoreKey<DBTypes, Name> | IDBKeyRange): Promise<StoreKey<DBTypes, Name> | undefined>;
  /**
   * Retrieves the key of the first record in an index that matches the query.
   *
   * Resolves with undefined if no match is found.
   *
   * This is a shortcut that creates a transaction for this single action. If you need to do more
   * than one action, create a transaction instead.
   *
   * @param storeName Name of the store.
   * @param indexName Name of the index within the store.
   * @param query
   */
  getKeyFromIndex<Name extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, Name>>(
    storeName: Name,
    indexName: IndexName,
    query: IndexKey<DBTypes, Name, IndexName> | IDBKeyRange
  ): Promise<StoreKey<DBTypes, Name> | undefined>;
  /**
   * Put an item in the database.
   *
   * Replaces any item with the same key.
   *
   * This is a shortcut that creates a transaction for this single action. If you need to do more
   * than one action, create a transaction instead.
   *
   * @param storeName Name of the store.
   * @param value
   * @param key
   */
  put<Name extends StoreNames<DBTypes>>(storeName: Name, value: StoreValue<DBTypes, Name>, key?: StoreKey<DBTypes, Name> | IDBKeyRange): Promise<StoreKey<DBTypes, Name>>;
}
type IDBPTransactionExtends = Omit$1<IDBTransaction, 'db' | 'objectStore' | 'objectStoreNames'>;
interface IDBPTransaction<
  DBTypes extends DBSchema | unknown = unknown,
  TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>,
  Mode extends IDBTransactionMode = 'readonly'
> extends IDBPTransactionExtends {
  /**
   * The transaction's mode.
   */
  readonly mode: Mode;
  /**
   * The names of stores in scope for this transaction.
   */
  readonly objectStoreNames: TypedDOMStringList<TxStores[number]>;
  /**
   * The transaction's connection.
   */
  readonly db: IDBPDatabase<DBTypes>;
  /**
   * Promise for the completion of this transaction.
   */
  readonly done: Promise<void>;
  /**
   * The associated object store, if the transaction covers a single store, otherwise undefined.
   */
  readonly store: TxStores[1] extends undefined ? IDBPObjectStore<DBTypes, TxStores, TxStores[0], Mode> : undefined;
  /**
   * Returns an IDBObjectStore in the transaction's scope.
   */
  objectStore<StoreName extends TxStores[number]>(name: StoreName): IDBPObjectStore<DBTypes, TxStores, StoreName, Mode>;
}
type IDBPObjectStoreExtends = Omit$1<
  IDBObjectStore,
  'transaction' | 'add' | 'clear' | 'count' | 'createIndex' | 'delete' | 'get' | 'getAll' | 'getAllKeys' | 'getKey' | 'index' | 'openCursor' | 'openKeyCursor' | 'put' | 'indexNames'
>;
interface IDBPObjectStore<
  DBTypes extends DBSchema | unknown = unknown,
  TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>,
  StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>,
  Mode extends IDBTransactionMode = 'readonly'
> extends IDBPObjectStoreExtends {
  /**
   * The names of indexes in the store.
   */
  readonly indexNames: TypedDOMStringList<IndexNames<DBTypes, StoreName>>;
  /**
   * The associated transaction.
   */
  readonly transaction: IDBPTransaction<DBTypes, TxStores, Mode>;
  /**
   * Add a value to the store.
   *
   * Rejects if an item of a given key already exists in the store.
   */
  add: Mode extends 'readonly' ? undefined : (value: StoreValue<DBTypes, StoreName>, key?: StoreKey<DBTypes, StoreName> | IDBKeyRange) => Promise<StoreKey<DBTypes, StoreName>>;
  /**
   * Deletes all records in store.
   */
  clear: Mode extends 'readonly' ? undefined : () => Promise<void>;
  /**
   * Retrieves the number of records matching the given query.
   */
  count(key?: StoreKey<DBTypes, StoreName> | IDBKeyRange | null): Promise<number>;
  /**
   * Creates a new index in store.
   *
   * Throws an "InvalidStateError" DOMException if not called within an upgrade transaction.
   */
  createIndex: Mode extends 'versionchange'
    ? <IndexName extends IndexNames<DBTypes, StoreName>>(name: IndexName, keyPath: string | string[], options?: IDBIndexParameters) => IDBPIndex<DBTypes, TxStores, StoreName, IndexName, Mode>
    : undefined;
  /**
   * Deletes records in store matching the given query.
   */
  delete: Mode extends 'readonly' ? undefined : (key: StoreKey<DBTypes, StoreName> | IDBKeyRange) => Promise<void>;
  /**
   * Retrieves the value of the first record matching the query.
   *
   * Resolves with undefined if no match is found.
   */
  get(query: StoreKey<DBTypes, StoreName> | IDBKeyRange): Promise<StoreValue<DBTypes, StoreName> | undefined>;
  /**
   * Retrieves all values that match the query.
   *
   * @param query
   * @param count Maximum number of values to return.
   */
  getAll(query?: StoreKey<DBTypes, StoreName> | IDBKeyRange | null, count?: number): Promise<StoreValue<DBTypes, StoreName>[]>;
  /**
   * Retrieves the keys of records matching the query.
   *
   * @param query
   * @param count Maximum number of keys to return.
   */
  getAllKeys(query?: StoreKey<DBTypes, StoreName> | IDBKeyRange | null, count?: number): Promise<StoreKey<DBTypes, StoreName>[]>;
  /**
   * Retrieves the key of the first record that matches the query.
   *
   * Resolves with undefined if no match is found.
   */
  getKey(query: StoreKey<DBTypes, StoreName> | IDBKeyRange): Promise<StoreKey<DBTypes, StoreName> | undefined>;
  /**
   * Get a query of a given name.
   */
  index<IndexName extends IndexNames<DBTypes, StoreName>>(name: IndexName): IDBPIndex<DBTypes, TxStores, StoreName, IndexName, Mode>;
  /**
   * Opens a cursor over the records matching the query.
   *
   * Resolves with null if no matches are found.
   *
   * @param query If null, all records match.
   * @param direction
   */
  openCursor(query?: StoreKey<DBTypes, StoreName> | IDBKeyRange | null, direction?: IDBCursorDirection): Promise<IDBPCursorWithValue<DBTypes, TxStores, StoreName, unknown, Mode> | null>;
  /**
   * Opens a cursor over the keys matching the query.
   *
   * Resolves with null if no matches are found.
   *
   * @param query If null, all records match.
   * @param direction
   */
  openKeyCursor(query?: StoreKey<DBTypes, StoreName> | IDBKeyRange | null, direction?: IDBCursorDirection): Promise<IDBPCursor<DBTypes, TxStores, StoreName, unknown, Mode> | null>;
  /**
   * Put an item in the store.
   *
   * Replaces any item with the same key.
   */
  put: Mode extends 'readonly' ? undefined : (value: StoreValue<DBTypes, StoreName>, key?: StoreKey<DBTypes, StoreName> | IDBKeyRange) => Promise<StoreKey<DBTypes, StoreName>>;
  /**
   * Iterate over the store.
   */
  [Symbol.asyncIterator](): AsyncIterableIterator<IDBPCursorWithValueIteratorValue<DBTypes, TxStores, StoreName, unknown, Mode>>;
  /**
   * Iterate over the records matching the query.
   *
   * @param query If null, all records match.
   * @param direction
   */
  iterate(
    query?: StoreKey<DBTypes, StoreName> | IDBKeyRange | null,
    direction?: IDBCursorDirection
  ): AsyncIterableIterator<IDBPCursorWithValueIteratorValue<DBTypes, TxStores, StoreName, unknown, Mode>>;
}
type IDBPIndexExtends = Omit$1<IDBIndex, 'objectStore' | 'count' | 'get' | 'getAll' | 'getAllKeys' | 'getKey' | 'openCursor' | 'openKeyCursor'>;
interface IDBPIndex<
  DBTypes extends DBSchema | unknown = unknown,
  TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>,
  StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>,
  IndexName extends IndexNames<DBTypes, StoreName> = IndexNames<DBTypes, StoreName>,
  Mode extends IDBTransactionMode = 'readonly'
> extends IDBPIndexExtends {
  /**
   * The IDBObjectStore the index belongs to.
   */
  readonly objectStore: IDBPObjectStore<DBTypes, TxStores, StoreName, Mode>;
  /**
   * Retrieves the number of records matching the given query.
   */
  count(key?: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange | null): Promise<number>;
  /**
   * Retrieves the value of the first record matching the query.
   *
   * Resolves with undefined if no match is found.
   */
  get(query: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange): Promise<StoreValue<DBTypes, StoreName> | undefined>;
  /**
   * Retrieves all values that match the query.
   *
   * @param query
   * @param count Maximum number of values to return.
   */
  getAll(query?: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange | null, count?: number): Promise<StoreValue<DBTypes, StoreName>[]>;
  /**
   * Retrieves the keys of records matching the query.
   *
   * @param query
   * @param count Maximum number of keys to return.
   */
  getAllKeys(query?: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange | null, count?: number): Promise<StoreKey<DBTypes, StoreName>[]>;
  /**
   * Retrieves the key of the first record that matches the query.
   *
   * Resolves with undefined if no match is found.
   */
  getKey(query: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange): Promise<StoreKey<DBTypes, StoreName> | undefined>;
  /**
   * Opens a cursor over the records matching the query.
   *
   * Resolves with null if no matches are found.
   *
   * @param query If null, all records match.
   * @param direction
   */
  openCursor(query?: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange | null, direction?: IDBCursorDirection): Promise<IDBPCursorWithValue<DBTypes, TxStores, StoreName, IndexName, Mode> | null>;
  /**
   * Opens a cursor over the keys matching the query.
   *
   * Resolves with null if no matches are found.
   *
   * @param query If null, all records match.
   * @param direction
   */
  openKeyCursor(query?: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange | null, direction?: IDBCursorDirection): Promise<IDBPCursor<DBTypes, TxStores, StoreName, IndexName, Mode> | null>;
  /**
   * Iterate over the index.
   */
  [Symbol.asyncIterator](): AsyncIterableIterator<IDBPCursorWithValueIteratorValue<DBTypes, TxStores, StoreName, IndexName, Mode>>;
  /**
   * Iterate over the records matching the query.
   *
   * Resolves with null if no matches are found.
   *
   * @param query If null, all records match.
   * @param direction
   */
  iterate(
    query?: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange | null,
    direction?: IDBCursorDirection
  ): AsyncIterableIterator<IDBPCursorWithValueIteratorValue<DBTypes, TxStores, StoreName, IndexName, Mode>>;
}
type IDBPCursorExtends = Omit$1<IDBCursor, 'key' | 'primaryKey' | 'source' | 'advance' | 'continue' | 'continuePrimaryKey' | 'delete' | 'update'>;
interface IDBPCursor<
  DBTypes extends DBSchema | unknown = unknown,
  TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>,
  StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>,
  IndexName extends IndexNames<DBTypes, StoreName> | unknown = unknown,
  Mode extends IDBTransactionMode = 'readonly'
> extends IDBPCursorExtends {
  /**
   * The key of the current index or object store item.
   */
  readonly key: CursorKey<DBTypes, StoreName, IndexName>;
  /**
   * The key of the current object store item.
   */
  readonly primaryKey: StoreKey<DBTypes, StoreName>;
  /**
   * Returns the IDBObjectStore or IDBIndex the cursor was opened from.
   */
  readonly source: CursorSource<DBTypes, TxStores, StoreName, IndexName, Mode>;
  /**
   * Advances the cursor a given number of records.
   *
   * Resolves to null if no matching records remain.
   */
  advance<T>(this: T, count: number): Promise<T | null>;
  /**
   * Advance the cursor by one record (unless 'key' is provided).
   *
   * Resolves to null if no matching records remain.
   *
   * @param key Advance to the index or object store with a key equal to or greater than this value.
   */
  continue<T>(this: T, key?: CursorKey<DBTypes, StoreName, IndexName>): Promise<T | null>;
  /**
   * Advance the cursor by given keys.
   *
   * The operation is 'and' – both keys must be satisfied.
   *
   * Resolves to null if no matching records remain.
   *
   * @param key Advance to the index or object store with a key equal to or greater than this value.
   * @param primaryKey and where the object store has a key equal to or greater than this value.
   */
  continuePrimaryKey<T>(this: T, key: CursorKey<DBTypes, StoreName, IndexName>, primaryKey: StoreKey<DBTypes, StoreName>): Promise<T | null>;
  /**
   * Delete the current record.
   */
  delete: Mode extends 'readonly' ? undefined : () => Promise<void>;
  /**
   * Updated the current record.
   */
  update: Mode extends 'readonly' ? undefined : (value: StoreValue<DBTypes, StoreName>) => Promise<StoreKey<DBTypes, StoreName>>;
  /**
   * Iterate over the cursor.
   */
  [Symbol.asyncIterator](): AsyncIterableIterator<IDBPCursorIteratorValue<DBTypes, TxStores, StoreName, IndexName, Mode>>;
}
type IDBPCursorIteratorValueExtends<
  DBTypes extends DBSchema | unknown = unknown,
  TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>,
  StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>,
  IndexName extends IndexNames<DBTypes, StoreName> | unknown = unknown,
  Mode extends IDBTransactionMode = 'readonly'
> = Omit$1<IDBPCursor<DBTypes, TxStores, StoreName, IndexName, Mode>, 'advance' | 'continue' | 'continuePrimaryKey'>;
interface IDBPCursorIteratorValue<
  DBTypes extends DBSchema | unknown = unknown,
  TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>,
  StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>,
  IndexName extends IndexNames<DBTypes, StoreName> | unknown = unknown,
  Mode extends IDBTransactionMode = 'readonly'
> extends IDBPCursorIteratorValueExtends<DBTypes, TxStores, StoreName, IndexName, Mode> {
  /**
   * Advances the cursor a given number of records.
   */
  advance<T>(this: T, count: number): void;
  /**
   * Advance the cursor by one record (unless 'key' is provided).
   *
   * @param key Advance to the index or object store with a key equal to or greater than this value.
   */
  continue<T>(this: T, key?: CursorKey<DBTypes, StoreName, IndexName>): void;
  /**
   * Advance the cursor by given keys.
   *
   * The operation is 'and' – both keys must be satisfied.
   *
   * @param key Advance to the index or object store with a key equal to or greater than this value.
   * @param primaryKey and where the object store has a key equal to or greater than this value.
   */
  continuePrimaryKey<T>(this: T, key: CursorKey<DBTypes, StoreName, IndexName>, primaryKey: StoreKey<DBTypes, StoreName>): void;
}
interface IDBPCursorWithValue<
  DBTypes extends DBSchema | unknown = unknown,
  TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>,
  StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>,
  IndexName extends IndexNames<DBTypes, StoreName> | unknown = unknown,
  Mode extends IDBTransactionMode = 'readonly'
> extends IDBPCursor<DBTypes, TxStores, StoreName, IndexName, Mode> {
  /**
   * The value of the current item.
   */
  readonly value: StoreValue<DBTypes, StoreName>;
  /**
   * Iterate over the cursor.
   */
  [Symbol.asyncIterator](): AsyncIterableIterator<IDBPCursorWithValueIteratorValue<DBTypes, TxStores, StoreName, IndexName, Mode>>;
}
type IDBPCursorWithValueIteratorValueExtends<
  DBTypes extends DBSchema | unknown = unknown,
  TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>,
  StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>,
  IndexName extends IndexNames<DBTypes, StoreName> | unknown = unknown,
  Mode extends IDBTransactionMode = 'readonly'
> = Omit$1<IDBPCursorWithValue<DBTypes, TxStores, StoreName, IndexName, Mode>, 'advance' | 'continue' | 'continuePrimaryKey'>;
interface IDBPCursorWithValueIteratorValue<
  DBTypes extends DBSchema | unknown = unknown,
  TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>,
  StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>,
  IndexName extends IndexNames<DBTypes, StoreName> | unknown = unknown,
  Mode extends IDBTransactionMode = 'readonly'
> extends IDBPCursorWithValueIteratorValueExtends<DBTypes, TxStores, StoreName, IndexName, Mode> {
  /**
   * Advances the cursor a given number of records.
   */
  advance<T>(this: T, count: number): void;
  /**
   * Advance the cursor by one record (unless 'key' is provided).
   *
   * @param key Advance to the index or object store with a key equal to or greater than this value.
   */
  continue<T>(this: T, key?: CursorKey<DBTypes, StoreName, IndexName>): void;
  /**
   * Advance the cursor by given keys.
   *
   * The operation is 'and' – both keys must be satisfied.
   *
   * @param key Advance to the index or object store with a key equal to or greater than this value.
   * @param primaryKey and where the object store has a key equal to or greater than this value.
   */
  continuePrimaryKey<T>(this: T, key: CursorKey<DBTypes, StoreName, IndexName>, primaryKey: StoreKey<DBTypes, StoreName>): void;
}
//#endregion
//#region src/infra/Catalog.d.ts
export declare class Catalog<Key, Value> extends Diagnostics {
  protected readonly items: Map<Key, Value>;
  constructor(modloader?: ModLoader, entries?: Iterable<readonly [Key, Value]>);
  add(key: Key, value: Value): boolean;
  remove(key: Key): boolean;
  get(key: Key): Value | undefined;
  has(key: Key): boolean;
  list(): Value[];
  clear(): void;
  get entries(): ReadonlyMap<Key, Value>;
}
//#endregion
//#region src/services/IndexedDB.d.ts
interface StoreIndex {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
}
interface StoreDefinition {
  options: IDBObjectStoreParameters;
  indexes: StoreIndex[];
}
type Transaction<Mode extends IDBTransactionMode = IDBTransactionMode> = IDBPTransaction<unknown, string[], Mode>;
export declare class IndexedDB extends Catalog<string, StoreDefinition> {
  static readonly DATABASE_NAME = 'maplebirch';
  static readonly DATABASE_VERSION: number;
  private db;
  private opening;
  constructor(modloader?: ModLoader);
  define(name: string, options?: IDBObjectStoreParameters, indexes?: StoreIndex[]): boolean;
  loadLogLevel(): Promise<string | boolean | undefined>;
  init(): Promise<void>;
  private open;
  with<T, Mode extends IDBTransactionMode>(storeNames: string | string[], mode: Mode, callback: (tx: Transaction<Mode>) => T | Promise<T>): Promise<T>;
  clearStore(storeName: string): Promise<void>;
  deleteDatabase(): Promise<boolean>;
}
//#endregion
//#region src/services/CredentialVault.d.ts
type CredentialPeriod = 'day' | 'month';
interface AuthConfig {
  key: string;
  subject?: string;
  name?: string;
  publicKey: JsonWebKey | string;
  prompt?: {
    title?: string;
    label?: string;
    placeholder?: string;
    hint?: string;
  };
  date?: {
    period?: CredentialPeriod;
    timezone?: string;
    graceDays?: number;
  };
}
interface AuthPayload {
  subject: string;
  key: string;
  date?: string;
  password: string;
  expiresAt?: number;
}
interface CryptContext {
  modName: string;
  credential?: string;
  payload?: AuthPayload;
}
interface CryptResult {
  data: Awaited<InputFileFormat>;
  auth?: AuthConfig | boolean | void;
}
interface CryptOptions {
  modName?: string;
  cache?: {
    subject: string;
    key: string;
  };
  password?: string;
  prompt?: AuthConfig['prompt'] & {
    name?: string;
  };
  lazyOptions?: unknown;
  decrypt(password: string, context: CryptContext): Promise<CryptResult | Awaited<InputFileFormat>>;
}
export declare class CredentialVault {
  readonly idb: IndexedDB;
  readonly modloader: ModLoader;
  readonly events: Emitter;
  readonly diagnostics: Diagnostics;
  readonly translate: (key: string) => string;
  private static readonly STORE;
  private static readonly TOKEN_PREFIX;
  private dialogQueue;
  private storageKey;
  constructor(idb: IndexedDB, modloader: ModLoader, events: Emitter, diagnostics: Diagnostics, translate: (key: string) => string);
  loadCrypt(options: CryptOptions): Promise<boolean>;
  private loadCredential;
  private decryptAndLoad;
  private decodeCredential;
  private verify;
  private credentialDate;
  private readStored;
  private storeStored;
  private forget;
  private ensurePromptStyle;
  private promptCredential;
  private ensureStorageKey;
  private loadStorageKey;
  private encryptRecord;
  private decryptRecord;
}
//#endregion
//#region src/services/CloudSave.d.ts
type CloudSaveSlot = number;
type PanelAction = 'connectRemote' | 'uploadSlot' | 'downloadSlot' | 'refreshRemoteList' | 'deleteRemoteSlot' | 'exportCurrentCode' | 'exportSlotCode' | 'uploadCode' | 'downloadCode' | 'importCode';
interface CloudSaveConfig {
  endpoint: string;
  token: string;
  remember?: boolean;
}
interface CloudSaveRecord {
  slot: CloudSaveSlot;
  details: SaveDetails | null;
  save: SaveState;
  exportedAt: number;
  gameId?: string;
}
interface CloudSaveCodeRecord {
  code: string;
  exportedAt: number;
  gameId?: string;
}
interface CloudSaveRemoteItem {
  slot: CloudSaveSlot;
  updatedAt: number;
  payload?: CloudSaveRecord;
}
interface CloudSaveRemoteCode {
  updatedAt: number;
  payload?: CloudSaveCodeRecord;
}
interface SaveDetails {
  date?: number;
  title?: string;
  idx?: unknown;
  metadata?: {
    saveName?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
interface SaveState {
  history?: DolStateMoment[];
  delta?: unknown;
  [key: string]: unknown;
}
interface CloudSaveTools {
  isPlainObject(value: unknown): value is Record<string, unknown>;
  isFinite(value: unknown): boolean;
  isInteger(value: unknown): boolean;
  inRange(value: number, start: number, end: number): boolean;
}
export declare class CloudSave {
  readonly sugarcube: SugarCube;
  readonly translate: (key: string) => string;
  readonly tools: CloudSaveTools;
  readonly diagnostics: Diagnostics;
  private static readonly PANEL_STORAGE_KEY;
  private static readonly REQUEST_TIMEOUT;
  private config;
  private mountFrame;
  private busy;
  constructor(sugarcube: SugarCube, translate: (key: string) => string, tools: CloudSaveTools, diagnostics: Diagnostics);
  configure(config: CloudSaveConfig): this;
  /** 验证 Worker 与 Token 是否可用。 */
  connect(): Promise<void>;
  /** 从 DoL 原生 IndexedDB 读取本地存档。 */
  exportSlot(slot: CloudSaveSlot): Promise<CloudSaveRecord>;
  /** 将云端存档写回 DoL 原生 IndexedDB。 */
  importSlot(record: CloudSaveRecord, targetSlot?: CloudSaveSlot): Promise<boolean>;
  /** 上传本地存档。 */
  upload(slot: CloudSaveSlot): Promise<CloudSaveRemoteItem>;
  /** 下载云端存档。 */
  download(slot: CloudSaveSlot, targetSlot?: CloudSaveSlot): Promise<boolean>;
  /** 获取远端存档列表。 */
  listRemote(): Promise<CloudSaveRemoteItem[]>;
  /** 删除远端存档。 */
  deleteRemote(slot: CloudSaveSlot): Promise<void>;
  /** 导出当前 SugarCube 存档码。 */
  exportCode(): string;
  /** 将指定本地槽位转换为 SugarCube 存档码。 */
  exportSlotCode(slot: CloudSaveSlot): Promise<string>;
  /** 导入 SugarCube 存档码。 */
  importCode(code: string): boolean;
  /** 上传 SugarCube 存档码。 */
  uploadCode(code?: string): Promise<CloudSaveRemoteCode>;
  /** 下载 SugarCube 存档码。 */
  downloadCode(): Promise<string>;
  /** 初始化云存档面板。 */
  mountPanel(): void;
  /** Twee 面板动作入口。 */
  panelAction(action: PanelAction, slot?: CloudSaveSlot): Promise<void>;
  private runPanelAction;
  private done;
  private complete;
  private refreshPanel;
  private remoteRow;
  private readPanel;
  private loadPanelConfig;
  private savePanelConfig;
  /** Worker 请求统一入口。 */
  private request;
  /** SugarCube delta 存档还原为完整 history。 */
  private normalizeSave;
  private validateRecord;
  private validateCodeRecord;
  private isSlot;
  private validateSlot;
  private validateGame;
  private invalidResponse;
  private field;
  private setField;
  private panelSlot;
  /** 动态填充本地存档槽位选项。 */
  populateSlotOptions(panel?: HTMLElement | null): Promise<void>;
  private status;
  private get saveDB();
  private get panel();
  private get current();
  private get endpoint();
  private get token();
}
//#endregion
//#region src/constants.d.ts
type LanguageCode = (typeof Languages)[number];
declare const Languages: readonly ['EN', 'CN'];
declare enum ModuleState {
  REGISTERED = 0,
  MOUNTED = 1,
  ERROR = 2,
  EXPOSED = 3,
  DISABLED = 4
}
//#endregion
//#region src/services/Translator.d.ts
type Translation = Record<string, string>;
interface ImportProgress {
  type: 'process' | 'complete' | 'error' | 'not_found';
  language: LanguageCode;
  progress?: number;
  current?: number;
  total?: number;
  count?: number;
  error?: Error | null;
}
interface TranslationAddon {
  hook<T>(name: string, handler: (task: { modName: string; config: T }) => void | Promise<void>): boolean;
}
export declare class Translator extends Catalog<string, Translation> {
  readonly idb: IndexedDB;
  readonly events: Emitter;
  private readonly addon;
  static readonly DEFAULT_LANGS: readonly LanguageCode[];
  static readonly BATCH_SIZE = 500;
  language: LanguageCode;
  private readonly STORE;
  private readonly cache;
  private readonly sourceOrders;
  private preloaded;
  constructor(idb: IndexedDB, modloader: ModLoader, events: Emitter, addon: () => TranslationAddon | undefined);
  private initDB;
  setLanguage(language?: string): Promise<LanguageCode>;
  import(modName: string, languages?: readonly LanguageCode[]): AsyncGenerator<ImportProgress>;
  importFile(modName: string, language: LanguageCode, paths: string | readonly string[]): AsyncGenerator<ImportProgress>;
  t(translationKey: string, space?: boolean): string;
  auto(text: string): string;
  has(translationKey: string): boolean;
  set(translationKey: string, translations: Record<string, unknown>): boolean;
  preload(): Promise<void>;
  clearStorage(): Promise<void>;
  private loadBundledTranslations;
  private writeTranslations;
  private writeBatch;
  private removeOldTranslations;
  private updateSource;
  private activeSources;
  private visibleTranslations;
  private syncTranslation;
  private readFileRecord;
  private writeFileRecord;
  private loadTranslation;
  private parseTranslations;
  private computeHash;
  private getModFile;
  private rebuild;
}
//#endregion
//#region src/infra/Lifecycle.d.ts
type LifecyclePhase = 'preInit' | 'Init' | 'loadInit' | 'postInit';
interface LifecycleTarget {
  preInit?(): void | Promise<void>;
  Init?(): void;
  loadInit?(): void;
  postInit?(): void;
}
interface LifecycleResult {
  called: boolean;
  ok: boolean;
  error?: unknown;
}
export declare class Lifecycle<Key = string, Target extends LifecycleTarget = LifecycleTarget> extends Catalog<Key, Target> {
  preInit(): void | Promise<void>;
  Init(): void;
  loadInit(): void;
  postInit(): void;
  execute(target: Target, phase: 'preInit', scope?: string): Promise<LifecycleResult>;
  execute(target: Target, phase: Exclude<LifecyclePhase, 'preInit'>, scope?: string): LifecycleResult;
  execute(target: Target, phase: LifecyclePhase, scope?: string): LifecycleResult | Promise<LifecycleResult>;
  private failure;
}
//#endregion
//#region src/services/Modules.d.ts
interface Module {
  log?: ScopedLog;
  dependencies?: string[];
  exposed?: boolean | 'window';
  preInit?(): void | Promise<void>;
  Init?(): void;
  loadInit?(): void;
  postInit?(): void;
}
interface ModuleRegistry {
  modules: Map<string, Module>;
  states: Map<string, ModuleState>;
  sources: Map<string, string>;
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
}
interface DependencyInfo {
  protected: boolean;
  mounted: boolean;
  exposed: boolean;
  lifecycle: boolean;
  dependencies: string[];
  dependents: string[];
  allDependencies: string[];
  state: string;
  source: string;
}
type DependencyGraph = Record<string, DependencyInfo>;
interface ModulesMeta {
  core: readonly string[];
  protected: readonly string[];
}
export declare class Modules extends Lifecycle<string, Module> {
  readonly owner: Record<string, unknown>;
  readonly meta: ModulesMeta;
  readonly idb: IndexedDB;
  readonly registry: ModuleRegistry;
  readonly initPhase: {
    preInitCompleted: boolean;
    mainInitCompleted: boolean;
  };
  private readonly sourceStack;
  private readonly preInitialized;
  private disabledNames;
  private preInitTask;
  private late;
  private preRunning;
  private preQueued;
  constructor(owner: Record<string, unknown>, meta: ModulesMeta, idb: IndexedDB, modloader?: ModLoader);
  static traverse(roots: Iterable<string>, links: ReadonlyMap<string, Iterable<string>>, excluded?: ReadonlySet<string>): Set<string>;
  with<T>(source: string, callback: () => T | Promise<T>): Promise<T>;
  register<T extends object>(name: string, module: T & Module, dependencies?: string[]): boolean;
  get(name: string): Module | undefined;
  get dependencyGraph(): DependencyGraph;
  run(phase: 'pre'): Promise<void>;
  run(phase: 'init' | 'load' | 'post'): void;
  private prepare;
  private queuePre;
  private disable;
  private pre;
  private init;
  private phase;
  private ready;
  private flush;
  private topologicalOrder;
  private collect;
  private circular;
  private hasLifecycle;
}
//#endregion
//#region src/services/GUIControl.d.ts
type ModuleType = 'protected' | 'mounted' | 'exposed' | 'module';
interface ModuleInfo {
  name: string;
  type: ModuleType;
  source: string;
  protected: boolean;
  lifecycle: boolean;
  dependencies: string[];
}
interface ModulesSettings {
  enabled: ModuleInfo[];
  disabled: ModuleInfo[];
}
interface ScriptSource {
  jsFiles: Array<{
    modName: string;
    filePath: string;
  }>;
}
export declare class GUIControl {
  readonly idb: IndexedDB;
  readonly modloader: ModLoader;
  readonly events: Emitter;
  readonly modules: Modules;
  readonly translator: Translator;
  private readonly addon;
  enabledModules: ModuleInfo[];
  disabledModules: ModuleInfo[];
  enabledScripts: string[];
  disabledScripts: string[];
  private modSubUiAngularJsService;
  constructor(idb: IndexedDB, modloader: ModLoader, events: Emitter, modules: Modules, translator: Translator, addon: () => ScriptSource | undefined);
  private initSettings;
  init(): Promise<void>;
  private loadSettings;
  private modNames;
  private currentModules;
  typeLabel(type: ModuleType): string;
  private modulesStore;
  private scriptsStore;
  saveModules(enabled: ModuleInfo[], disabled: ModuleInfo[]): Promise<void>;
  setModuleStates(states: Readonly<Record<string, boolean>>): Promise<boolean>;
  saveScripts(enabled: string[], disabled: string[]): Promise<void>;
  cascadeModules(action: 'enable' | 'disable', moduleName: string, modules: ModulesSettings): string[];
  private moduleLinks;
  get moduleList(): string;
  private whenCreate;
}
//#endregion
//#region src/infra/Hooks.d.ts
type HookCallback<Args extends unknown[] = unknown[], Result = unknown> = (...args: Args) => Result | Promise<Result>;
type HookErrorPolicy = 'throw' | 'continue';
export declare class Hooks<Args extends unknown[] = unknown[], Result = unknown> extends Catalog<string, HookCallback<Args, Result>> {
  private readonly onError;
  private readonly order;
  constructor(modloader?: ModLoader, onError?: HookErrorPolicy);
  add(name: string, callback: HookCallback<Args, Result>, order?: number): boolean;
  remove(name: string): boolean;
  clear(): void;
  execute(...args: Args): Result[];
  call(name: string, ...args: Args): Promise<Awaited<Result> | undefined>;
}
//#endregion
//#region src/services/AddonPlugin.d.ts
interface FileItem {
  modName: string;
  filePath: string;
  content: string;
}
interface BootTask<T = unknown> {
  modName: string;
  modInfo: ModInfo;
  modZip: ModZipReader;
  config: T;
}
type BootHandler<T = unknown> = (task: BootTask<T>) => void | Promise<void>;
interface AddonServices {
  translator(): Translator;
  gui(): GUIControl;
  credential(): CredentialVault;
}
export declare class AddonPlugin extends Hooks<[BootTask], void> {
  readonly sugarcube: SugarCube;
  readonly events: Emitter;
  readonly idb: IndexedDB;
  readonly modules: Modules;
  private readonly services;
  onStart: boolean;
  get resources(): Resources;
  replace(content: string, replacements: Replacement[], label?: string): string;
  readonly info: Catalog<
    string,
    {
      addonName: string;
      mod: ModInfo;
      modZip: ModZipReader;
    }
  >;
  readonly modList: string[];
  readonly jsFiles: FileItem[];
  readonly moduleFiles: FileItem[];
  private readonly disabledMods;
  readonly blockedPassages: Set<string>;
  readonly excludedMods: Set<string>;
  private readonly bootQueue;
  private onSaveLoadTracer;
  private moduleFilesExecuted;
  private scriptFilesExecuted;
  private bootReady;
  constructor(modloader: ModLoader, sugarcube: SugarCube, events: Emitter, idb: IndexedDB, modules: Modules, services: AddonServices);
  get SC2DataManager(): SC2DataManager;
  get modUtils(): ModUtils;
  hook<T>(name: string, handler: BootHandler<T>): boolean;
  canLoadThisMod(bootJson: ModBootJson, _zip: JSZipLikeReadOnlyInterface): Promise<boolean>;
  afterInjectEarlyLoad(): Promise<void>;
  ModLoaderLoadEnd(): Promise<void>;
  afterEarlyLoad(): Promise<void>;
  registerMod(addonName: string, modInfo: ModInfo, modZip: ModZipReader): Promise<void>;
  afterRegisterMod2Addon(): Promise<void>;
  beforePatchModToGame(): Promise<void>;
  PatchModToGame_start(): Promise<void>;
  afterPatchModToGame(): Promise<void>;
  afterPreload(): Promise<void>;
  whenSC2StoryReady(): Promise<void>;
  whenSC2PassageInit(passage: Passage): Promise<void>;
  whenSC2PassageStart(passage: Passage, content: HTMLDivElement): Promise<void>;
  whenSC2PassageRender(passage: Passage, content: HTMLDivElement): Promise<void>;
  whenSC2PassageDisplay(passage: Passage, content: HTMLDivElement): Promise<void>;
  whenSC2PassageEnd(passage: Passage, content: HTMLDivElement): Promise<void>;
  loadCrypt(options: CryptOptions): Promise<boolean>;
  private scriptFiles;
  private loadFiles;
  private executeScripts;
  private process;
  private queue;
  private flush;
  private run;
  private config;
}
//#endregion
//#region src/core.d.ts
declare global {
  interface MaplebirchExtensions {}
}
interface Extensions extends MaplebirchExtensions {}
interface CoreEvents {
  ':indexedDB': [];
  ':idbReady': [];
  ':import': [];
  ':variable': [];
  ':onSave': [save: Save];
  ':onLoad': [save: Save];
  ':language': [];
  ':storyready': [];
  ':passageinit': [passage: Passage];
  ':passagestart': [passage: Passage, content: HTMLDivElement];
  ':passagerender': [passage: Passage, content: HTMLDivElement];
  ':passagedisplay': [passage: Passage, content: HTMLDivElement];
  ':passageend': [passage: Passage, content: HTMLDivElement];
  ':sugarcube': [];
  ':modLoaderEnd': [];
}
interface FrameworkHost {
  readonly sugarcube: SugarCube;
  readonly modLoader: ModLoader;
}
interface FrameworkInfra {
  readonly diagnostics: Diagnostics;
  readonly events: Emitter;
}
interface FrameworkServices {
  readonly indexedDB: IndexedDB;
  readonly modules: Modules;
  readonly addonPlugin: AddonPlugin;
  readonly translator: Translator;
  readonly credentialVault: CredentialVault;
  readonly cloudSave: CloudSave;
  readonly gui: GUIControl;
}
type MaplebirchCore = InstanceType<typeof MaplebirchCore> & Extensions;
declare const MaplebirchCore: {
  new (
    modSC2DataManager: SC2DataManager,
    modLoaderGui: Gui
  ): {
    readonly meta: {
      name: 'maplebirch Frameworks';
      author: string;
      version: string;
      modifiedby: string;
      updateDate: string;
      Languages: readonly ['EN', 'CN'];
      core: readonly string[];
      protected: readonly string[];
    };
    readonly host: Readonly<FrameworkHost>;
    readonly infra: Readonly<FrameworkInfra>;
    readonly services: Readonly<FrameworkServices>;
    readonly utils: Readonly<{
      clone: typeof clone;
      equal: typeof equal;
      merge: typeof merge;
      append: typeof append;
      cover: typeof cover;
      mergefn: typeof mergeFn;
      appendfn: typeof appendFn;
      coverfn: typeof coverFn;
      contains: typeof contains;
      random: typeof randomNumber;
      either: typeof randomPick;
      SelectCase: typeof SelectCase;
      convert: typeof convert;
      clamp: typeof clamp;
    }>;
    readonly yaml: Readonly<typeof jsyaml>;
    readonly howler: Readonly<{
      Howl: typeof Howl;
      Howler: HowlerGlobal;
    }>;
    log(message: string, level?: string, ...objects: unknown[]): void;
    get export(): string;
    get passage(): Passage;
    set passage(passage: Passage);
    get SugarCube(): TwineSugarCube;
    set SugarCube(runtime: TwineSugarCube);
    get modUtils(): ReturnType<SC2DataManager['getModUtils']>;
    get modLoader(): ReturnType<SC2DataManager['getModLoader']>;
    get lodash(): ModLoader['lodash'];
    get marked(): typeof marked;
    get Language(): string;
    set Language(language: string);
    get LogLevel(): string;
    set LogLevel(level: string);
    get dependencyGraph(): DependencyGraph;
    get modList(): string[];
    on<Name extends keyof CoreEvents>(eventName: Name, callback: EventCallback<CoreEvents[Name]>, description?: string): boolean;
    on<Name extends string, Args extends unknown[]>(eventName: Name extends keyof CoreEvents ? never : Name, callback: EventCallback<Args>, description?: string): boolean;
    off<Args extends unknown[]>(eventName: string, identifier: string | EventCallback<Args>): boolean;
    once<Name extends keyof CoreEvents>(eventName: Name, callback: EventCallback<CoreEvents[Name]>, description?: string): boolean;
    once<Name extends string, Args extends unknown[]>(eventName: Name extends keyof CoreEvents ? never : Name, callback: EventCallback<Args>, description?: string): boolean;
    after<Name extends keyof CoreEvents>(eventName: Name, callback: EventCallback<CoreEvents[Name]>): void;
    after<Name extends string, Args extends unknown[]>(eventName: Name extends keyof CoreEvents ? never : Name, callback: EventCallback<Args>): void;
    trigger<Name extends keyof CoreEvents>(eventName: Name, ...args: CoreEvents[Name]): Promise<void>;
    trigger<Name extends string>(eventName: Name extends keyof CoreEvents ? never : Name, ...args: unknown[]): Promise<void>;
    define<T extends object>(name: string, module: T & Module, dependencies?: string[]): boolean;
    idb(name: string, options?: IDBObjectStoreParameters, indexes?: StoreIndex[]): boolean;
    with<T, Mode extends IDBTransactionMode>(storeNames: string | string[], mode: Mode, callback: (tx: Transaction<Mode>) => T | Promise<T>): Promise<T>;
    t(key: string, space?: boolean): string;
    auto(text: string): string;
    get<K extends keyof Extensions>(name: K): Extensions[K] | undefined;
    get(name: string): Module | undefined;
  };
  meta: {
    name: 'maplebirch Frameworks';
    author: string;
    version: string;
    modifiedby: string;
    updateDate: string;
    Languages: readonly ['EN', 'CN'];
    core: readonly string[];
    protected: readonly string[];
  };
};
declare var maplebirch: MaplebirchCore;
//#endregion
//#region src/modules/Dynamic.d.ts
declare class Dynamic extends Lifecycle<string, LifecycleTarget> {
  readonly core: MaplebirchCore;
  readonly log: ScopedLog;
  constructor(core: MaplebirchCore);
  Init(): void;
}
//#endregion
//#region src/modules/Event.d.ts
interface EventOptions {
  priority?: number;
  once?: boolean;
}
declare abstract class Event {
  readonly id: string;
  protected readonly log: ScopedLog;
  readonly priority: number;
  readonly once: boolean;
  protected abstract readonly eventName: string;
  protected constructor(id: string, options: EventOptions, log: ScopedLog);
  protected evaluate<T extends unknown[]>(label: string, callback: (...args: T) => boolean, ...args: T): boolean;
  protected invoke<T extends unknown[]>(label: string, callback: ((...args: T) => void) | undefined, ...args: T): void;
}
//#endregion
//#region src/modules/State.d.ts
interface StateEventOptions extends EventOptions {
  output?: string;
  action?: () => void;
  cond?: () => boolean;
  forceExit?: boolean | (() => boolean);
  extra?: {
    passage?: string[];
    exclude?: string[];
    match?: RegExp;
  };
}
interface StateEventResult {
  hasOutput: boolean;
  remove: boolean;
}
declare class StateEvent extends Event {
  readonly type: 'gate' | 'append';
  protected readonly eventName = 'StateEvent';
  output?: string;
  private action?;
  private cond;
  private forceExit;
  private extra;
  constructor(id: string, type: 'gate' | 'append', options: StateEventOptions, log: Dynamic['log']);
  private checkPassage;
  tryRun(passageName?: string): StateEventResult | null;
  private match;
  private runAction;
  shouldForceExit(): boolean;
}
export declare class StateManager {
  private readonly manager;
  private readonly stateEvents;
  private readonly log;
  constructor(manager: Dynamic);
  get events(): Readonly<Record<'gate' | 'append', ReadonlyMap<string, StateEvent>>>;
  trigger(type: 'gate' | 'append'): string;
  private processGateEvents;
  private processAppendEvents;
  register(type: 'gate' | 'append', eventId: string, options: StateEventOptions): boolean;
  unregister(type: 'gate' | 'append', eventId: string): boolean;
  Init(): void;
}
//#endregion
//#region src/modules/Frameworks/ConsoleCheat.d.ts
interface JSExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  message: string;
  globals?: Record<string, any>;
}
interface TwineExecutionResult {
  success: boolean;
  error?: string;
  message: string;
  hasNavigation?: boolean;
  parsedContent?: string;
}
interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  message: string;
  globals?: Record<string, any>;
  hasNavigation?: boolean;
  parsedContent?: string;
}
declare class CheatConsole {
  readonly manager: ToolCollection;
  private readonly log;
  private readonly core;
  private readonly globals;
  private readonly jsStatus;
  private readonly twineStatus;
  private readonly twineOutputs;
  constructor(manager: ToolCollection);
  executeJS(code?: string): JSExecutionResult;
  executeTwine(code?: string): TwineExecutionResult;
  execute(type: 'javascript' | 'twine', code?: string): ExecutionResult;
  private runJavaScript;
  private linkTarget;
  private html;
  private format;
  private showStatus;
}
//#endregion
//#region src/modules/Frameworks/migration.d.ts
interface Step {
  from: string;
  to: string;
  apply: (data: Record<string, unknown>, utils: Utils) => void;
}
interface PathRef {
  parent: Record<string, unknown>;
  key: string;
}
interface Utils {
  readonly log: ScopedLog;
  path: (obj: Record<string, unknown>, path: string, create?: boolean) => PathRef | null;
  move: (data: Record<string, unknown>, from: string, to: string) => boolean;
  remove: (data: Record<string, unknown>, path: string) => boolean;
  transform: (data: Record<string, unknown>, path: string, fn: (value: unknown) => unknown) => boolean;
  fill: (target: Record<string, unknown>, defaults: Record<string, unknown>, mode?: 'merge' | 'cover') => void;
}
declare class migration {
  static readonly log: ScopedLog;
  static create(): migration;
  readonly log: ScopedLog;
  readonly utils: Utils;
  steps: Step[];
  private readonly unsafeKeys;
  constructor();
  add(from: string, to: string, apply: Step['apply']): void;
  run(data: Record<string, unknown>, targetVersion: string): void;
  private path;
  private move;
  private compare;
}
//#endregion
//#region src/modules/Frameworks/RandSystem.d.ts
interface RandState {
  seed: number | null;
  history: number[];
  index: number;
}
declare class randSystem {
  static readonly log: ScopedLog;
  static create(state?: Partial<RandState>): randSystem;
  readonly log: ScopedLog;
  readonly state: RandState;
  private readonly maxHistory;
  private readonly modulus;
  constructor(state?: Partial<RandState>);
  reset(seed?: number): void;
  int(max: number): number;
  percent(): number;
  back(steps?: number): void;
  forward(steps?: number): void;
  get seed(): number | null;
  set seed(value: number);
  get history(): number[];
  get index(): number;
  private next;
  private normalize;
}
//#endregion
//#region src/macros/helpers.d.ts
declare const CONVERT_MODES: readonly ['lower', 'upper', 'capitalize', 'title', 'camel', 'pascal', 'snake', 'kebab', 'constant'];
type ConvertMode = (typeof CONVERT_MODES)[number];
type MacroArgs = unknown[] & {
  full?: string;
  raw?: string;
};
interface MacroPayload {
  name: string;
  args: MacroArgs;
  contents?: string;
}
interface MacroContext$1 extends Omit<MacroContext, 'args' | 'createShadowWrapper' | 'error' | 'payload'> {
  args: MacroArgs;
  payload?: MacroPayload[] | null;
  error(msg: string): void;
  createShadowWrapper(callback: (...args: never[]) => unknown, doneCallback?: (...args: never[]) => unknown, startCallback?: (...args: never[]) => unknown): (...args: unknown[]) => void;
  passageObj?: {
    title: string;
  };
  lanListboxCache?: Record<
    string,
    {
      options: ListboxOption[];
      selectedIdx: number;
    }
  >;
}
interface ListboxOption {
  label: string;
  value: unknown;
  type: 'static' | 'dynamic';
  exprIndex?: number;
  convertMode: ConvertMode | null;
}
//#endregion
//#region src/modules/Frameworks/macros.d.ts
type MacroFunction<Args extends unknown[] = unknown[]> = (this: MacroContext$1, ...args: Args) => unknown;
type SimpleMacroFunction<Args extends unknown[]> = (this: MacroContext$1 | null, ...args: Args) => unknown;
type StatFunction<Args extends unknown[] = unknown[]> = (...args: Args) => DocumentFragment;
type MacroTags = string[] | null | undefined;
type SkipArgs = string[] | boolean | null | undefined;
type MacroPhase = 'sugarcube' | 'storyready';
declare class defineMacros {
  readonly manager: ToolCollection;
  readonly log: ScopedLog;
  readonly macros: string[];
  readonly statFunctions: Record<string, StatFunction>;
  private readonly definitions;
  private sugarcube;
  private story;
  constructor(manager: ToolCollection);
  get Macro(): ReturnType<MaplebirchCore['host']['sugarcube']['require']>['Macro'];
  define<Args extends unknown[]>(macroName: string, macroFunction: MacroFunction<Args>, tags?: MacroTags, skipArgs?: SkipArgs, isAsync?: boolean, phase?: MacroPhase): void;
  private installAll;
  private install;
  defineS<Args extends unknown[]>(macroName: string, macroFunction: SimpleMacroFunction<Args>, tags?: MacroTags, skipArgs?: SkipArgs, maintainContext?: boolean, phase?: MacroPhase): void;
  create<Args extends unknown[]>(name: string, fn: StatFunction<Args>): void;
  callStatFunction(name: string, ...args: unknown[]): DocumentFragment;
}
//#endregion
//#region src/modules/Frameworks/HtmlTools.d.ts
type HtmlRoot = Element | DocumentFragment;
interface TextContext {
  readonly macro?: MacroContext$1;
  readonly args?: readonly unknown[];
  readonly name?: string;
  readonly widgetName?: string;
  readonly passageTitle?: string;
  readonly [key: string]: unknown;
}
type TextContent = string | number | boolean | null | undefined;
type RawContent = TextContent | Node;
declare class Builder {
  readonly parent: htmlTools;
  readonly auto: (text: string) => string;
  readonly fragment: HtmlRoot;
  readonly context: TextContext;
  constructor(parent: htmlTools, fragment: HtmlRoot, context?: TextContext);
  text(content: TextContent, style?: string): this;
  line(content?: TextContent, style?: string): this;
  wikify(content: TextContent): this;
  raw(content: RawContent): this;
  box(content: RawContent, style?: string): this;
}
declare class htmlTools {
  readonly core: MaplebirchCore;
  readonly log: ScopedLog;
  private uid;
  private readonly store;
  constructor(core: MaplebirchCore);
  get Wikifier(): ReturnType<MaplebirchCore['host']['sugarcube']['require']>['Wikifier'];
  replaceText(oldText: string, newText: string, root?: HtmlRoot | null): number;
  renameLink(target: string | Element, label: string, root?: HtmlRoot | null): boolean;
  replaceLink(target: string | Element, source: string, root?: HtmlRoot | null): boolean;
  private findLink;
  add(key: string, handler: (tools: Builder) => void, id?: string): string | false;
  delete(key: string, idOrHandler?: string | ((tools: Builder) => void)): boolean;
  clear(): void;
  renderFragment(keys: string | string[], context?: TextContext): DocumentFragment;
  renderInto(root: HtmlRoot, keys: string | string[], context?: TextContext): void;
  render(macro: MacroContext$1, keys: string | string[]): void;
  makeTextOutput(options?: { CSV?: boolean }): MacroFunction;
}
//#endregion
//#region src/modules/Frameworks/ZonesManager.d.ts
interface ZoneWidgetConfig {
  exclude?: string[];
  match?: RegExp;
  passage?: string | string[];
  widget: string;
  type?: 'function';
  func?: () => unknown;
}
interface CustomLinkZoneItem {
  position: number;
  widget: string | ZoneWidgetConfig;
}
type PatchSet = SourcePatch;
type ZoneItem = string | ZoneWidgetConfig | CustomLinkZoneItem;
type ZoneFunction = () => unknown;
type InitObject =
  | {
      init: ZoneFunction;
    }
  | {
      name: string;
      func: ZoneFunction;
    };
type PositionedZoneWidgetConfig = Omit<ZoneWidgetConfig, 'widget'> & {
  widget: [number, string];
};
type ZoneWidget = string | ZoneFunction | ZoneWidgetConfig | PositionedZoneWidgetConfig | [number, string | ZoneWidgetConfig];
interface CustomLinkGroup {
  position: number;
  macro: string;
}
type InitFunction = string | ZoneFunction | InitObject;
declare class zonesManager {
  readonly log: ScopedLog;
  readonly core: MaplebirchCore;
  data: Record<string, ZoneItem[]>;
  initFunction: InitFunction[];
  specialWidget: (string | ZoneFunction)[];
  defaultData: Record<string, string | ZoneFunction>;
  locationPassage: Record<string, PatchSet[]>;
  widgetPassage: Record<string, PatchSet[]>;
  widgethtml: string;
  private readonly functions;
  private readonly functionNames;
  private nextFunction;
  constructor(core: MaplebirchCore);
  inject(...databases: Partial<Pick<zonesManager, 'specialWidget' | 'defaultData' | 'locationPassage' | 'widgetPassage'>>[]): void;
  onInit(...widgets: InitFunction[]): void;
  addTo(zone: string, ...widgets: ZoneWidget[]): void;
  storyInit(): void;
  call(name: string): unknown;
  play(zone: 'CustomLinkZone', passageTitle?: string): CustomLinkGroup[];
  play(zone: 'State' | 'BeforeLinkZone' | 'AfterLinkZone', passageTitle?: string): string;
  play(zone: string, passageTitle?: string): string | CustomLinkGroup[];
  patchModToGame(manager: AddonPlugin, type: 'before' | 'after'): void;
  private get widgets();
  private get specials();
  private defaultContent;
  private render;
  private shouldRender;
  private customLinkItem;
  private wrapSpecialPassage;
  private applyContentPatches;
  private patchPassage;
  private widgetInit;
}
//#endregion
//#region src/modules/Frameworks/ApplyLinkZone.d.ts
interface CustomZone {
  position: number;
  macro: string;
}
interface LinkZoneConfig {
  containerId: string;
  linkSelector: string;
  beforeMacro: () => string;
  afterMacro: () => string;
  customMacro: () => CustomZone[];
  zoneStyle: Partial<CSSStyleDeclaration>;
  onBeforeApply?: (() => void) | null;
  onAfterApply?: ((result: boolean, config: LinkZoneConfig) => void) | null;
  debug: boolean;
}
declare class LinkZoneManager {
  readonly containerId: string;
  readonly linkSelector: string;
  static readonly apply: (config?: Partial<LinkZoneConfig>) => boolean;
  static readonly add: (config: LinkZoneConfig, customZones: CustomZone[]) => void;
  static readonly defaultConfig: LinkZoneConfig;
  firstLink: Element | null;
  lastLink: Element | null;
  links: Element[];
  breakBeforeFirst: ChildNode | null;
  readonly log: ScopedLog;
  constructor(containerId: string | undefined, linkSelector: string | undefined, logger: ScopedLog);
  detect(): boolean;
  applyZones(config: LinkZoneConfig, customZones: CustomZone[]): boolean;
  private applyBefore;
  private applyAfter;
  private applyCustom;
  private zone;
  private insertAfterBreak;
  private findBreakBefore;
  private isBreak;
  private visible;
}
declare const applyLinkZone: typeof LinkZoneManager;
//#endregion
//#region src/modules/Frameworks/Patch.d.ts
type PatchPhase = 'init' | 'state';
interface PatchDefinition<T extends object = object, Flat extends object = T> {
  api: T;
  legacy?: Flat;
  available?: () => boolean;
  init?: () => void;
  state?: () => void;
}
declare class Patch<Extensions extends Record<string, object> = Record<never, never>> {
  private readonly report;
  private readonly definitions;
  constructor(report: (name: string, error: unknown) => void);
  add<T extends object, Flat extends object = T>(name: string, definition: PatchDefinition<T, Flat>): this & Flat;
  get<Name extends keyof Extensions>(name: Name): Extensions[Name] | undefined;
  get<T extends object = object>(name: string): T | undefined;
  require<Name extends keyof Extensions>(name: Name): Extensions[Name];
  require<T extends object = object>(name: string): T;
  has(name: string): boolean;
  names(): string[];
  private available;
  private run;
  apply(phase: PatchPhase): void;
}
//#endregion
//#region src/modules/ToolCollection.d.ts
type ToolConstructors = {
  console?: new (manager: ToolCollection) => CheatConsole;
  macro?: new (manager: ToolCollection) => defineMacros;
};
declare class ToolCollection {
  readonly core: MaplebirchCore;
  readonly log: ScopedLog;
  readonly console: CheatConsole;
  readonly migration: typeof migration;
  readonly rand: typeof randSystem;
  readonly macro: defineMacros;
  readonly text: htmlTools;
  readonly zone: zonesManager;
  readonly link: typeof applyLinkZone;
  readonly patch: Patch;
  constructor(core: MaplebirchCore, constructors?: ToolConstructors);
  onInit(...widgets: InitFunction[]): void;
  define<Args extends unknown[]>(name: string, fn: MacroFunction<Args>, tags?: MacroTags, skipArgs?: SkipArgs, isAsync?: boolean, phase?: MacroPhase): void;
  defineS<Args extends unknown[]>(name: string, fn: SimpleMacroFunction<Args>, tags?: MacroTags, skipArgs?: SkipArgs, maintainContext?: boolean, phase?: MacroPhase): void;
  addTo(zone: string, ...widgets: ZoneWidget[]): void;
  inject(...databases: Parameters<zonesManager['inject']>): void;
}
//#endregion
//#region src/host/DoL.d.ts
type DoLVariables = typeof V;
type DoLTemporary = typeof T;
type DoLCharacters = typeof C;
type DoLSetup = typeof setup;
type DoLRenderer = typeof Renderer;
type DoLGlobalName = 'V' | 'T' | 'C' | 'setup' | 'Renderer' | 'variables' | 'temporary' | 'characters' | 'renderer';
interface DoLHost {
  readonly V: DoLVariables;
  readonly T: DoLTemporary;
  readonly C: DoLCharacters;
  readonly setup: DoLSetup;
  readonly Renderer: DoLRenderer;
  readonly variables: DoLVariables;
  readonly temporary: DoLTemporary;
  readonly characters: DoLCharacters;
  readonly renderer: DoLRenderer;
  readonly gameVersion: string;
  has(name: DoLGlobalName): boolean;
}
interface DoLGlobalScope {
  V?: DoLVariables;
  T?: DoLTemporary;
  C?: DoLCharacters;
  setup?: DoLSetup;
  Renderer?: DoLRenderer;
}
export declare class DoL implements DoLHost {
  private readonly scope;
  constructor(scope?: DoLGlobalScope);
  get V(): DoLVariables;
  get T(): DoLTemporary;
  get C(): DoLCharacters;
  get setup(): DoLSetup;
  get Renderer(): DoLRenderer;
  get variables(): DoLVariables;
  get temporary(): DoLTemporary;
  get characters(): DoLCharacters;
  get renderer(): DoLRenderer;
  get gameVersion(): string;
  has(name: DoLGlobalName): boolean;
  private require;
}
declare const dol: DoL;
//#endregion
//#region src/modules/TimeStateWeather/TimeEvents.d.ts
type TimeEventType = 'onSec' | 'onMin' | 'onHour' | 'onDay' | 'onWeek' | 'onMonth' | 'onYear' | 'onBefore' | 'onThread' | 'onAfter' | 'onTimeTravel';
type TimeUnit = 'sec' | 'min' | 'hour' | 'day' | 'week' | 'month' | 'year';
interface AccumulateConfig {
  unit: TimeUnit;
  target?: number;
}
interface TimeData {
  prevDate?: DateTime;
  currentDate?: DateTime;
  changes?: Record<TimeUnit, number>;
  triggeredByAccumulator?: {
    unit: TimeUnit;
    target: number;
    count: number;
  };
  exactPoints?: {
    min: boolean;
    hour: boolean;
    day: boolean;
    week: boolean;
    month: boolean;
    year: boolean;
  };
  passed?: number;
  sec?: number;
  min?: number;
  hour?: number;
  day?: number;
  week?: number;
  month?: number;
  year?: number;
  weekday?: [number, number];
  detailedDiff?: ReturnType<DateTime['compareWith']>;
  timeStamp?: number;
  prev?: DateTime;
  current?: DateTime;
  diffSeconds?: number;
  direction?: 'forward' | 'backward';
  isLeap?: boolean;
}
interface TimeEventOptions extends EventOptions {
  action?: (data: TimeData) => void;
  cond?: (data: TimeData) => boolean;
  accumulate?: AccumulateConfig;
  exact?: boolean;
}
interface TimeTravelOptions {
  target?: DateTime;
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  addYears?: number;
  addMonths?: number;
  addDays?: number;
  addHours?: number;
  addMinutes?: number;
  addSeconds?: number;
}
declare class TimeEvent extends Event {
  readonly type: TimeEventType;
  protected readonly eventName = 'TimeEvent';
  private action?;
  private cond;
  private exact;
  private accumulate?;
  private accumulated;
  private target;
  constructor(id: string, type: TimeEventType, options: TimeEventOptions, log: DoLDynamic['log']);
  tryRun(data: TimeData, accumulatedOnly?: boolean): boolean;
  private runAccumulated;
  private execute;
  private match;
  private runAction;
  private isExactPoint;
}
declare class TimeManager {
  private readonly manager;
  private readonly timeEvents;
  private readonly travelHooks;
  readonly log: DoLDynamic['log'];
  readonly TimeConstants: Readonly<{
    secondsPerDay: 86400;
    secondsPerHour: 3600;
    secondsPerMinute: 60;
    minutesPerHour: 60;
    standardYearMonths: readonly number[];
    leapYearMonths: readonly number[];
    synodicMonth: 29.53058867;
    MIN_DATE: Readonly<{
      timeStamp: -315537984000;
      year: -9999;
      month: 1;
      day: 1;
      hour: 0;
      minute: 0;
      second: 0;
    }>;
    MAX_DATE: Readonly<{
      timeStamp: 315537897599;
      year: 9999;
      month: 12;
      day: 31;
      hour: 23;
      minute: 59;
      second: 59;
    }>;
  }>;
  constructor(manager: DoLDynamic);
  get events(): Readonly<Record<string, ReadonlyMap<string, TimeEvent>>>;
  Init(): void;
  patchDateTime(DateTimeClass: typeof DateTime): typeof DateTime;
  patchTime(TimeObject: typeof Time): void;
  register(type: TimeEventType, eventId: string, options: TimeEventOptions): boolean;
  unregister(type: string, eventId: string): boolean;
  onTravel(name: string, callback: (data: TimeData) => void): boolean;
  timeTravel(options?: TimeTravelOptions): boolean;
  updateTimeLanguage(choice?: 'JournalTime'): string | boolean;
  private handleTimePass;
  private handleTimeTravel;
  private targetDate;
  private timeData;
  private triggerUnitEvents;
  private trigger;
}
//#endregion
//#region src/modules/TimeStateWeather/WeatherEvents.d.ts
interface WeatherEventOptions extends EventOptions {
  condition?: () => boolean;
  onEnter?: () => void;
  onExit?: () => void;
  [key: string]: any;
}
interface WeatherTypeConfig {
  name: string;
  iconType?: string | (() => string);
  value: number;
  probability: {
    summer: number;
    winter: number;
    spring: number;
    autumn: number;
  };
  cloudCount: {
    small: () => number;
    large: () => number;
  };
  tanningModifier: number;
  overcast: number | (() => number);
  precipitationIntensity: number;
  visibility: number;
}
interface WeatherException {
  date: () => DateTime;
  duration: number;
  weatherType: string;
  temperature?: number;
}
declare class WeatherManager {
  private readonly manager;
  private readonly weatherEvents;
  private readonly activeEvents;
  private readonly Exceptions;
  private readonly WeatherTypes;
  private readonly layerModifications;
  private readonly effectModifications;
  private weatherTriggered;
  private readonly log;
  constructor(manager: DoLDynamic);
  private refresh;
  private checkEvents;
  register(eventId: string, options: WeatherEventOptions): boolean;
  unregister(eventId: string): boolean;
  addLayer(layerName: string, patch: any, mode?: 'concat' | 'replace' | 'merge'): this;
  addEffect(effectName: string, patch: any, mode?: 'concat' | 'replace' | 'merge'): this;
  applyModifications(params: any): any;
  addWeatherData(data: WeatherException | WeatherTypeConfig): boolean | void;
  Init(): void;
  modifyWeatherJavaScript(manager: AddonPlugin): void;
}
//#endregion
//#region src/modules/DoL/Dynamic.d.ts
declare class DoLDynamic extends Dynamic {
  get State(): StateManager;
  get Time(): TimeManager;
  get Weather(): WeatherManager;
  regStateEvent(type: 'gate' | 'append', eventId: string, options: StateEventOptions): boolean;
  delStateEvent(type: 'gate' | 'append', eventId: string): boolean;
  trigger(type: 'gate' | 'append'): string;
  get StateEvents(): StateManager['events'];
  regTimeEvent(type: TimeEventType, eventId: string, options: TimeEventOptions): boolean;
  delTimeEvent(type: TimeEventType, eventId: string): boolean;
  timeTravel(options?: TimeTravelOptions): boolean;
  get TimeEvents(): TimeManager['events'];
  regWeatherEvent(eventId: string, options: WeatherEventOptions): boolean;
  delWeatherEvent(eventId: string): boolean;
  addWeather(data: WeatherException | WeatherTypeConfig): boolean | void;
  Init(): void;
  private fixDynamicTask;
}
//#endregion
//#region src/modules/Frameworks/TimeTravelCheat.d.ts
declare class TimeTravelCheat {
  private readonly core;
  private readonly ids;
  constructor(core: MaplebirchCore);
  fragment(): DocumentFragment;
  private createRoot;
  private bind;
  private render;
  private fieldInput;
  private setFields;
  private readFields;
  private syncDayLimit;
  private travel;
  private status;
}
//#endregion
//#region src/modules/Frameworks/DoLConsole.d.ts
declare class DoLConsole extends CheatConsole {
  readonly timeTravel: TimeTravelCheat;
  constructor(manager: ToolCollection);
}
//#endregion
//#region src/modules/Frameworks/DoLMacros.d.ts
declare class DoLMacros extends defineMacros {
  statChange(statType: string, amount: number, colorClass: string, condition?: () => boolean): DocumentFragment;
  grace(amount: number, expectedRank?: string): DocumentFragment;
}
//#endregion
//#region src/modules/DoL/Patches/Tips.d.ts
declare class Tips {
  static add(category: string, ...tips: string[]): void;
  static apply(): void;
  static inject(data: string[]): string[];
}
//#endregion
//#region src/modules/DoL/Patches/index.d.ts
declare function register(
  core: MaplebirchCore,
  patch: Patch
): (Patch<Record<never, never>> & {
  traitsData: TraitConfig[];
  addTraits: typeof Traits.add;
  injectTraits: (data: Parameters<typeof Traits.inject>[0]) => TraitCategory[];
} & {
  locationData: Record<string, LocationUpdate>;
  configureLocation: typeof Location.configure;
  applyLocation: typeof Location.apply;
} & {
  bodywritingData: Record<string, BodywritingData>;
  addBodywriting: typeof Bodywriting.add;
  deleteBodywriting: typeof Bodywriting.delete;
  applyBodywriting: typeof Bodywriting.apply;
} & {
  fishData: Record<string, FishConfig>;
  fishingLocationData: Partial<Record<FishingLocation, Record<string, number>>>;
  addFish: typeof Fishing.addFish;
  addBait: typeof Fishing.addBait;
  configureFishingLocation: typeof Fishing.configureLocation;
  applyFishing: typeof Fishing.apply;
} & {
  foodstuffData: Record<string, FoodstuffConfig>;
  addFoodstuff: typeof Foodstuff.add;
  applyFoodstuff: typeof Foodstuff.apply;
} & {
  antiquesData: Record<string, AntiqueConfig>;
  addAntiques: typeof Antiques.add;
  injectAntiques: typeof Antiques.inject;
} & {
  tipsData: Record<string, string[]>;
  addTips: typeof Tips.add;
  applyTips: typeof Tips.apply;
  injectTips: typeof Tips.inject;
}) & {
  traits: {
    data: TraitConfig[];
    add: typeof Traits.add;
    inject: (data: Parameters<typeof Traits.inject>[0]) => TraitCategory[];
  };
  location: {
    data: Record<string, LocationUpdate>;
    configure: typeof Location.configure;
    apply: typeof Location.apply;
  };
  bodywriting: {
    data: Record<string, BodywritingData>;
    add: typeof Bodywriting.add;
    delete: typeof Bodywriting.delete;
    apply: typeof Bodywriting.apply;
  };
  fishing: {
    data: Record<string, FishConfig>;
    locations: Partial<Record<FishingLocation, Record<string, number>>>;
    add: typeof Fishing.addFish;
    addBait: typeof Fishing.addBait;
    configure: typeof Fishing.configureLocation;
    apply: typeof Fishing.apply;
  };
  foodstuff: {
    data: Record<string, FoodstuffConfig>;
    add: typeof Foodstuff.add;
    apply: typeof Foodstuff.apply;
  };
  antiques: {
    data: Record<string, AntiqueConfig>;
    add: typeof Antiques.add;
    inject: typeof Antiques.inject;
  };
  tips: {
    data: Record<string, string[]>;
    add: typeof Tips.add;
    apply: typeof Tips.apply;
    inject: typeof Tips.inject;
  };
};
type Patches = ReturnType<typeof register>;
//#endregion
//#region src/modules/DoL/ToolCollection.d.ts
declare class DoLToolCollection extends ToolCollection {
  readonly console: DoLConsole;
  readonly macro: DoLMacros;
  readonly patch: Patches;
  private readonly macros;
  private readonly optionEvents;
  private readonly modI18N;
  constructor(core: MaplebirchCore);
  preInit(): void;
  Init(): void;
}
//#endregion
//#region src/modules/AudioAddon/Track.d.ts
type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'm4a' | 'flac' | 'webm';
interface TrackMeta {
  title?: string;
  artist?: string;
}
declare class Track {
  readonly audioName: string;
  readonly modName: string;
  title: string;
  artist: string;
  duration: number;
  format: AudioFormat;
  constructor(audioName: string, modName: string, meta?: TrackMeta);
}
//#endregion
//#region src/modules/AudioAddon/Playlist.d.ts
declare const PlayMode: {
  readonly SEQUENTIAL: 'sequential';
  readonly LOOP_ALL: 'loop_all';
  readonly LOOP_ONE: 'loop_one';
  readonly SHUFFLE: 'shuffle';
};
type PlayModeType = (typeof PlayMode)[keyof typeof PlayMode];
declare class Playlist {
  readonly name: string;
  tracks: Track[];
  currentIndex: number;
  playMode: PlayModeType;
  private shuffleOrder;
  private shuffleIndex;
  constructor(name: string);
  add(input: Track | Track[]): void;
  removeAt(index: number): boolean;
  remove(audioName: string): boolean;
  clear(): void;
  setMode(mode: PlayModeType): void;
  select(index: number): Track | null;
  next(): Track | null;
  previous(): Track | null;
  get length(): number;
  private resetShuffle;
  private shuffle;
}
//#endregion
//#region src/modules/AudioAddon/Ambience.d.ts
declare class Ambience {
  private readonly modloader;
  private active;
  private request;
  constructor(modloader: ModLoader);
  protected create(options: HowlOptions): Howl;
  play(modName: string, path: string, volume?: number, fadeMs?: number): Promise<boolean>;
  setVolume(volume: number, fadeMs?: number): void;
  stop(fadeMs?: number): void;
  private fadeOut;
  private dispose;
  private clamp;
  private duration;
}
//#endregion
//#region src/modules/Audio.d.ts
declare const PlayState: {
  readonly IDLE: 'idle';
  readonly LOADING: 'loading';
  readonly PLAYING: 'playing';
  readonly PAUSED: 'paused';
  readonly STOPPED: 'stopped';
};
type PlayStateType = (typeof PlayState)[keyof typeof PlayState];
interface AudioEventData {
  type: string;
  data?: unknown[];
  [key: string]: unknown;
}
type AudioEventHandler = (eventData: AudioEventData) => void;
interface AudioProgress {
  currentTime: number;
  duration: number;
  percent: number;
}
interface AudioSnapshot {
  state: PlayStateType;
  track: Track | null;
  playlist: string;
  index: number;
  length: number;
  mode: PlayModeType;
  volume: number;
  muted: boolean;
  progress: AudioProgress;
}
declare class Audio {
  readonly core: MaplebirchCore;
  readonly log: ScopedLog;
  readonly ambience: Ambience;
  private readonly STORE;
  private readonly playlists;
  private readonly playlistLoads;
  private readonly eventListeners;
  private readonly cache;
  private readonly pendingLoads;
  private activePlaylist;
  private currentTrack;
  private loadingTrack;
  private currentHowl;
  private state;
  private volume;
  private muted;
  private autoNext;
  private maxCache;
  private cacheCount;
  private playRequestId;
  private progressTimer;
  private progressBindings;
  constructor(core: MaplebirchCore);
  private initDB;
  protected on(event: string, handler: AudioEventHandler): void;
  protected off(event: string, handler: AudioEventHandler): boolean;
  protected once(event: string, handler: AudioEventHandler): void;
  play(track: Track): Promise<boolean>;
  pause(): boolean;
  resume(): boolean;
  stop(): boolean;
  togglePlayPause(): void;
  next(): Promise<boolean>;
  previous(): Promise<boolean>;
  playAt(modName: string, index: number): Promise<boolean>;
  seek(percent: number): boolean;
  seekTo(seconds: number): boolean;
  getPlaylist(modName: string): Promise<Playlist>;
  playFromMod(modName: string, audioName?: string): Promise<boolean | string>;
  import(modName: string, audioFolder?: string): Promise<boolean>;
  addFile(file: File, modName?: string): Promise<boolean | string>;
  delete(modName: string, audioName: string): Promise<boolean>;
  clearAudio(modName: string): Promise<boolean | string>;
  clearCache(): void;
  destroy(): void;
  playlist(modName: string): Playlist;
  get Mute(): boolean;
  set Mute(value: boolean);
  get Volume(): number;
  set Volume(value: number);
  get PlayMode(): PlayModeType;
  set PlayMode(mode: PlayModeType);
  cyclePlayMode(): PlayModeType;
  get AutoNext(): boolean;
  set AutoNext(value: boolean);
  get State(): PlayStateType;
  get CurrentTrack(): Track | null;
  get ActivePlaylist(): Playlist | null;
  get currentTime(): number;
  get duration(): number;
  get progress(): AudioProgress;
  get snapshot(): AudioSnapshot;
  formatTime(seconds: number): string;
  bindProgress(sliderId: string, timeId: string, interval?: number): void;
  unbindProgress(sliderId: string, timeId: string): void;
  preInit(): Promise<void>;
  private load;
  private save;
  private readRecords;
  private cacheAudio;
  private unloadCache;
  private trimCache;
  private release;
  private stopCurrent;
  private get outputVolume();
  private startProgressTimer;
  private stopProgressTimer;
  private handleTrackEnd;
  private dispatch;
  private emit;
}
//#endregion
//#region src/modules/Variables.d.ts
declare class Options {
  define(...args: any[]): any;
}
interface HairGradientsReturn {
  fringe: Record<string, string[]>;
  sides: Record<string, string[]>;
}
declare function hairgradients(): HairGradientsReturn;
declare class Variables {
  readonly core: MaplebirchCore;
  private static readonly OPTIONS_STORAGE_KEY;
  private static moduleOptions;
  static add(key: string, value: any): void;
  static get options(): Record<string, any>;
  version: string;
  readonly tool: MaplebirchCore['tool'];
  readonly log: ScopedLog;
  readonly migration: migration;
  readonly options: Options;
  constructor(core: MaplebirchCore);
  hairgradients: typeof hairgradients;
  optionsStorage(action: 'save' | 'restore' | 'reset' | 'load'): any | null;
  check(): void;
  Init(): void;
  loadInit(): void;
  postInit(): void;
  private run;
}
//#endregion
//#region src/modules/CharacterAddon/Pet.d.ts
interface PetOptions {
  mask?: number;
  rotation?: number;
  animated?: boolean;
  floating?: boolean;
  scale?: number;
}
type PetTarget = string | HTMLElement;
interface PetHost {
  mask(x?: number, rotation?: number): string;
}
interface FloatingPetConfig {
  elementId: string;
  storageKey: string;
  className: string;
  fallback(size: number): {
    left: number;
    top: number;
  };
}
declare abstract class FloatingPet {
  protected readonly host: PetHost;
  protected readonly petConfig: FloatingPetConfig;
  protected canvas?: HTMLCanvasElement;
  protected model?: CanvasModel;
  protected container?: HTMLElement;
  protected options: Required<PetOptions>;
  private cleanupDrag?;
  protected constructor(host: PetHost, petConfig: FloatingPetConfig);
  configure(options?: PetOptions): this;
  unmount(): void;
  refresh(): boolean;
  protected abstract draw(model: CanvasModel, context: CanvasRenderingContext2D): void;
  protected mount(container: HTMLElement, model: CanvasModel, canvas: HTMLCanvasElement): void;
  protected stopAnimation(): void;
  private get displaySize();
  private clearBox;
  private enableDrag;
}
declare class Pet extends FloatingPet {
  private manager;
  readonly modelName: string;
  private readonly layers;
  private syncing;
  private rendering;
  private syncFrame;
  constructor(manager: Character);
  sync(): boolean;
  use(layers: CanvasLayerMap): this;
  capture(mainModel?: CanvasModelOptions): void;
  render(target: PetTarget, options?: PetOptions): boolean;
  unmount(): void;
  private cancel;
  private readSettings;
  protected draw(model: CanvasModel, context: CanvasRenderingContext2D): void;
}
//#endregion
//#region src/modules/CharacterAddon/TransformationConfig.d.ts
type DecayCondition = () => boolean;
type SuppressCondition = (sourceName: string) => boolean;
type BuildUpdater = (change: number) => void;
//#endregion
//#region src/modules/CharacterAddon/Transformation.d.ts
interface Part {
  name: string;
  tfRequired: number;
  default?: string;
  [key: string]: any;
}
type TransformHook = (options: any, model?: CanvasModel) => void;
type TransformMessage = Record<
  string,
  {
    up: string[];
    down: string[];
  }
>;
type TranslationInput$1 = Record<string, Translation> | Map<string, Translation>;
interface EntryOptions {
  build?: number;
  level?: number;
  update?: number[];
  icon?: string;
  message?: TransformMessage;
  decay?: boolean;
  decayConditions?: DecayCondition[];
  suppress?: boolean;
  suppressConditions?: SuppressCondition[];
  pre?: TransformHook;
  post?: TransformHook;
  layers?: CanvasLayerMap;
  translations?: TranslationInput$1;
}
interface TransformationOption extends EntryOptions {
  parts: Part[];
  traits?: Part[];
}
declare class Transformation {
  private manager;
  private get log();
  private config;
  readonly decayConditions: Record<string, DecayCondition[]>;
  readonly suppressConditions: Record<string, SuppressCondition[]>;
  readonly buildUpdaters: Record<string, BuildUpdater>;
  constructor(manager: Character);
  private get isDoLP();
  private get animalTransforms();
  private get animalMacros();
  private get historyTransforms();
  wikifier(widget: string, ...args: any[]): any;
  modifyEffect(manager: AddonPlugin): void;
  add(name: string, type: string, options: TransformationOption): this;
  inject(): void;
  private _update;
  state(): void;
  private _clear;
  private suppress;
  _transform(name: string, change: number): void;
  updateTransform(name: string): void;
  _updateParts(name: string, oldLevel: number, newLevel: number): void;
  _transformationAlteration(): void;
  _transformationStateUpdate(): void;
  private handleHiddenTransformParts;
  message(
    key: string,
    tools: {
      element: (tag: string, text: any, className?: string) => void;
      wikifier: (macro: string, param: string) => void;
    }
  ): boolean;
  get icon(): string;
  setTransform(name: string, level?: number | null): void;
  part(partName: string): boolean;
}
//#endregion
//#region src/modules/Character.d.ts
type ProcessType = 'pre' | 'post';
type ModelTarget<TModel = CanvasModel | CanvasModelOptions> = string | string[] | ((modelName: string, model?: TModel) => boolean);
type ProcessHandler = (options: any, model?: CanvasModel) => void;
interface LayerUseOptions {
  pet?: boolean;
}
declare function mask(x?: number, rotation?: number, swap?: boolean, width?: number, height?: number): string;
declare class Character {
  readonly core: MaplebirchCore;
  readonly log: ScopedLog;
  readonly mask: typeof mask;
  readonly faceStyleMap: Map<string, string[]>;
  private readonly processors;
  private nextProcessor;
  private readonly layers;
  readonly pet: Pet;
  readonly transformation: Transformation;
  constructor(core: MaplebirchCore);
  get ZIndices(): {
    [key: string]: number;
  };
  modifyFaceStyle(manager: AddonPlugin): void;
  faceStyleImagePaths(files: Record<string, unknown>): void;
  private faceStyleSetupOption;
  modifyCanvasModel(manager: AddonPlugin): void;
  patchCanvasModel<T extends CanvasModelConstructor>(BaseCanvasModel: T): T;
  use(type: ProcessType, handler: ProcessHandler, target?: ModelTarget<CanvasModel>): this;
  use(layers: CanvasLayerMap, target?: ModelTarget<CanvasModelOptions>, options?: LayerUseOptions): this;
  process(type: ProcessType, options: CanvasModelOptionsData, model?: CanvasModel): void;
  preInit(): void;
  Init(): void;
  loadInit(): void;
}
//#endregion
//#region src/modules/NamedNPCAddon/NPCSchedules.d.ts
interface ScheduleCondition {
  (date: EnhancedDate): boolean;
}
type ScheduleTime = number | [number, number?];
type ScheduleLocation = string | ((date: EnhancedDate) => string | Schedule | void | null | undefined);
type ScheduleBuilder = (schedule: Schedule) => void | Schedule;
interface SpecialSchedule {
  id: string | number;
  condition: ScheduleCondition;
  location: ScheduleLocation;
  before?: string | number;
  after?: string | number;
  insteadOf?: string | number;
  override?: boolean;
}
interface DailyScheduleConfig {
  time: ScheduleTime;
  location: string;
}
interface SpecialScheduleConfig extends Partial<Omit<SpecialSchedule, 'condition' | 'location'>> {
  condition: ScheduleCondition;
  location: ScheduleLocation;
}
interface ScheduleConfig {
  daily?: DailyScheduleConfig[];
  special?: SpecialScheduleConfig[];
}
interface EnhancedDate extends DateTime {
  schedule: Schedule;
  schoolDay: boolean;
  spring: boolean;
  summer: boolean;
  autumn: boolean;
  winter: boolean;
  dawn: boolean;
  daytime: boolean;
  dusk: boolean;
  night: boolean;
  weekEnd: boolean;
  isAt(time: ScheduleTime): boolean;
  isAfter(time: ScheduleTime): boolean;
  isBefore(time: ScheduleTime): boolean;
  isBetween(start: ScheduleTime, end: ScheduleTime): boolean;
  isHour(...hours: number[]): boolean;
  isHourBetween(start: number, end: number): boolean;
  isMinuteBetween(start: number, end: number): boolean;
}
declare class Schedule {
  daily: string[];
  specials: SpecialSchedule[];
  sortedSpecials: SpecialSchedule[] | null;
  at(scheduleConfig: ScheduleTime, location: string): this;
  when(condition: ScheduleCondition, location: ScheduleLocation, options?: Partial<Omit<SpecialSchedule, 'condition' | 'location'>>): this;
  update(specialId: string | number, updates: Partial<Omit<SpecialSchedule, 'id'>>): this;
  remove(specialId: string | number): this;
  sortSpecials(): void;
  topologicalSort(items: SpecialSchedule[]): SpecialSchedule[];
  get location(): string;
  resolveLocation(loc: ScheduleLocation, date: EnhancedDate): string;
  createEnhancedDate(date: DateTime): EnhancedDate;
  buildEnhancedDateProto(): EnhancedDate;
  private dailyLocation;
}
declare const NPCSchedules: typeof Schedule & {
  readonly schedules: Map<string, Schedule>;
  init: (manager: NPCManager) => boolean;
  set: (npcName: string, config: ScheduleConfig | ScheduleBuilder) => Schedule;
  get: (npcName: string) => Schedule;
  update: (npcName: string, specialId: string | number, updates: Partial<Omit<SpecialSchedule, 'id'>>) => Schedule;
  remove: (npcName: string, specialId: string | number) => Schedule;
  clear: (npcName: string) => Schedule;
  clearAll: () => void;
  readonly npcList: string[];
  readonly location: Record<string, string>;
};
//#endregion
//#region src/modules/NamedNPCAddon/NPCClothes/NPCOutfitSets.d.ts
interface OutfitPartConfig {
  name: string;
  integrity_max?: number;
  word?: string;
  action?: string;
  readonly desc?: string;
}
interface OutfitSetConfig {
  name: string;
  type?: string;
  gender?: string;
  outfit?: number;
  upper: string | OutfitPartConfig;
  lower: string | OutfitPartConfig;
  desc?: string;
}
interface OutfitSet {
  name: string;
  type: string;
  gender: string;
  outfit: number;
  clothes: {
    upper: Required<OutfitPartConfig>;
    lower: Required<OutfitPartConfig>;
  };
  desc: string;
}
declare class NPCOutfitSets {
  private readonly manager;
  constructor(manager: NPCManager);
  init(): void;
  add(...configs: OutfitSetConfig[]): void;
  get data(): OutfitSet[];
  private create;
  private createPart;
}
//#endregion
//#region src/modules/NamedNPCAddon/NPCClothes/NPCSidebarArt.d.ts
interface ResolvedArtLayer {
  zIndex: number | string;
  img: string;
}
type ArtPart = 'head' | 'face' | 'neck' | 'upper' | 'lower' | 'legs' | 'feet' | 'hands';
interface ResolvedArt {
  key: string;
  body: string;
  parts: Partial<Record<ArtPart, ResolvedArtLayer>>;
}
declare class NPCSidebarArt {
  private readonly manager;
  private readonly configs;
  constructor(manager: NPCManager);
  import(modName: string, modZip: ModZipReader, filePaths: string | string[]): Promise<string[]>;
  has(npcName: string, key: string): boolean;
  keys(npcName: string): string[];
  get(npcName: string, key: string): ResolvedArt | undefined;
  get layers(): Map<string, Map<string, ResolvedArt>>;
  private setConfig;
  private resolve;
}
//#endregion
//#region src/modules/NamedNPCAddon/NPCClothes/Condition.d.ts
type Condition = boolean | string | (() => boolean) | Condition[];
//#endregion
//#region src/modules/NamedNPCAddon/NPCSidebarConfig/transformation_layers.d.ts
declare const transformationDefaults: {
  show_tf: boolean;
  tf_ears_layer: string;
  angel_wings_type: string;
  angel_wing_right: string;
  angel_wing_left: string;
  angel_wings_layer: string;
  angel_halo_type: string;
  angel_halo_lower: boolean;
  fallen_wings_type: string;
  fallen_wing_right: string;
  fallen_wing_left: string;
  fallen_wings_layer: string;
  fallen_halo_type: string;
  demon_wings_type: string;
  demon_wings_state: string;
  demon_wings_layer: string;
  demon_tail_type: string;
  demon_tail_state: string;
  demon_tail_layer: string;
  demon_horns_type: string;
  demon_horns_layer: string;
  wolf_tail_type: string;
  wolf_tail_layer: string;
  wolf_ears_type: string;
  wolf_pits_type: string;
  wolf_pubes_type: string;
  wolf_cheeks_type: string;
  cat_tail_type: string;
  cat_tail_layer: string;
  cat_ears_type: string;
  cow_horns_type: string;
  cow_horns_layer: string;
  cow_tail_type: string;
  cow_tail_layer: string;
  cow_ears_type: string;
  bird_wings_type: string;
  bird_wing_right: string;
  bird_wing_left: string;
  bird_wings_layer: string;
  bird_tail_type: string;
  bird_tail_layer: string;
  bird_eyes_type: string;
  bird_malar_type: string;
  bird_plumage_type: string;
  bird_pubes_type: string;
  fox_tail_type: string;
  fox_tail_layer: string;
  fox_ears_type: string;
  fox_cheeks_type: string;
};
//#endregion
//#region src/modules/NamedNPCAddon/NPCSidebarConfig/types.d.ts
type NPCBodyData = Pick<
  NPCData,
  | 'penis'
  | 'vagina'
  | 'virginity'
  | 'hair_side_type'
  | 'hair_fringe_type'
  | 'hair_position'
  | 'hair_sides_length'
  | 'hair_fringe_length'
  | 'eyeColour'
  | 'hairColour'
  | 'penissize'
  | 'breastsize'
  | 'ballssize'
>;
type NPCClothesSlot = 'head' | 'face' | 'neck' | 'upper' | 'lower' | 'feet' | 'legs' | 'handheld' | 'genitals' | 'under_upper' | 'under_lower' | 'over_head' | 'over_upper' | 'over_lower' | 'hands';
interface NPCSidebarClothing {
  index: number;
  name: string;
  variable: string;
  type: string[];
  integrity: string;
  setup?: NPCSidebarClothing;
  alpha?: number;
  alt?: string;
  altposition?: string;
  altdisabled?: string[];
  altsleeve?: string;
  state?: string;
  state_top?: string;
  colour?: string;
  colourCustom?: string;
  accessory_colour?: string;
  accessory_colourCustom?: string;
  accessory_colour_sidebar?: string;
  accessory?: number;
  accessory_integrity_img?: number;
  mainImage?: number;
  accImage?: number;
  leftImage?: number;
  rightImage?: number;
  coverImage?: number;
  coverBackImage?: number;
  back_img?: number;
  back_img_acc?: number;
  back_img_colour?: string;
  back_img_acc_colour?: string;
  back_integrity_img?: number;
  breast_img?: number | Record<number, number>;
  breast_acc_img?: number | Record<number, number>;
  breast_pattern?: number;
  sleeve_img?: number;
  sleeve_acc_img?: number;
  sleeve_colour?: string;
  penis_img?: number;
  penis_acc_img?: number;
  mask_img?: number;
  pattern?: string;
  pattern_layer?: string;
  holdPosition?: string;
  hoodposition?: string;
  hood?: number;
  has_collar?: number;
  high_img?: number;
  notuck?: number;
  outfitPrimary?: Partial<Record<NPCClothesSlot, string>>;
  outfitSecondary?: string[];
  set?: string;
  zIndex?: string | number;
}
interface NPCSidebarState extends Partial<typeof transformationDefaults> {
  name: string;
  show: boolean;
  model: boolean;
  position: number;
  dxfn: number;
  dyfn: number;
  tan: number;
  skin_type: string;
  freckles: boolean;
  facestyle: string;
  facevariant: string;
  ears_position: string;
  close_up_mask: string;
  hide_all: boolean;
  hide_head_acc: boolean;
  hide_leash: boolean;
  hood_down: boolean;
  show_hair: boolean;
  clothes: Record<NPCClothesSlot, NPCSidebarClothing>;
  bodydata: NPCBodyData;
  tf_filters?: Record<string, CanvasLayerFilter>;
  head_mask: string[];
  upper_mask: string[];
  lower_mask: string[];
  legs_mask: string[];
  feet_mask: string[];
  fringe_mask_src: string | null;
  feet_clip_src: string | null;
  upper_tucked: boolean;
  lower_tucked: boolean;
  crotch_visible: boolean;
  crotch_exposed: boolean;
  arm_left: string;
  arm_right: string;
  handheld_position: string | null;
  handheld_animation: string;
  handheld_overhead: boolean | null;
  alt_sleeve_state: boolean | null;
  high_waist_suspenders: boolean | null;
  hood_mask: boolean | null;
  zarms: number;
  zupper: number;
  zupperleft: number;
  zupperright: number;
  lust: number;
  breasts: string;
  breast_size: number;
  penis: string | false;
  penis_size: number;
  balls: boolean;
  genitals_chastity: boolean;
  eye_colour: string;
  hair_colour: string;
  hair_sides_type: string;
  hair_fringe_type: string;
  hair_position: string;
  hair_sides_position: string;
  hair_sides_length: string;
  hair_fringe_length: string;
  drip_mouth: string;
  calculate_penis_bulge(target?: NPCSidebarState): number;
  [key: string]: unknown;
}
//#endregion
//#region src/modules/NamedNPCAddon/NPCClothes/NPCSidebarWardrobe.d.ts
type WardrobeClothing = Partial<NPCSidebarClothing>;
type WardrobeItem = Partial<Record<NPCClothesSlot, WardrobeClothing>>;
type WardrobeWetness = 'dry' | 'damp' | 'wet' | 'soaked';
type WardrobeWetnessResolver = WardrobeWetness | (() => WardrobeWetness);
interface WardrobeWearOptions {
  when?: Condition;
  wetness?: WardrobeWetnessResolver;
}
interface WardrobeConditionGroup {
  location?: string | readonly string[];
  passage?: string | readonly string[];
  hours?: readonly [from: number, to: number];
}
type WardrobeWeightedChoice = readonly [key: string, weight: number];
type WardrobeChoice = string | readonly WardrobeWeightedChoice[];
type WardrobeLayerResolver = string | (() => string);
interface WardrobeContext {
  npcName: string;
  location: string;
  key: string;
  wetness: WardrobeWetness;
}
type WardrobeModifier = (clothes: WardrobeItem, context: WardrobeContext) => void;
declare class NPCSidebarWardrobe {
  private readonly manager;
  private readonly templates;
  private readonly profiles;
  private readonly conditions;
  constructor(manager: NPCManager);
  init(): void;
  load(modName: string, filePath: string): Promise<void>;
  get(key: string): WardrobeItem | undefined;
  set(key: string, template: WardrobeItem): void;
  has(key: string): boolean;
  when(name: string, group?: WardrobeConditionGroup, condition?: Condition): () => boolean;
  wear(npcName: string, location: string | readonly string[], choice: WardrobeChoice, options?: Condition | WardrobeWearOptions): void;
  wet(npcName: string, wetness: WardrobeWetnessResolver, cond?: Condition): void;
  layer(npcName: string, source: WardrobeLayerResolver, cond?: Condition): void;
  apply(clothes: WardrobeItem, slot: NPCClothesSlot, item: WardrobeClothing): void;
  put(clothes: WardrobeItem, key: string, slots?: NPCClothesSlot | readonly NPCClothesSlot[]): void;
  strip(clothes: WardrobeItem, slot: NPCClothesSlot | readonly NPCClothesSlot[]): void;
  base(npcName: string, modifier: WardrobeModifier): void;
  modify(npcName: string, modifier: WardrobeModifier): void;
  worn(npcName: string): WardrobeItem;
  private run;
  private add;
  private merge;
  private select;
  private find;
  private choose;
  private findWet;
  private resolveWet;
  private applyWet;
  private profile;
  private location;
}
//#endregion
//#region src/modules/NamedNPCAddon/NPCClothes.d.ts
declare class NPCClothes {
  readonly outfitSets: NPCOutfitSets;
  readonly art: NPCSidebarArt;
  readonly wardrobe: NPCSidebarWardrobe;
  constructor(manager: NPCManager);
  init(): void;
}
//#endregion
//#region src/modules/NamedNPCAddon/NPCSidebar.d.ts
interface NPCSidebarBootConfig {
  clothes?: string[];
  image?: string[];
  config?: string[];
}
declare function config(manager: NPCManager, modName: string, modZip: ModZipReader, config: NPCSidebarBootConfig): Promise<void>;
declare function loadFromMod(modZip: ModZipReader, npc_names: string[]): string[];
declare class NPCPet {
  private readonly pets;
  private frame;
  private syncing;
  sync(): boolean;
  private render;
  reset(): void;
  private cancel;
}
declare const NPCSidebar: {
  new (): {};
  readonly pet: NPCPet;
  get display(): Map<string, Set<string>>;
  config: typeof config;
  loadFromMod: typeof loadFromMod;
  hair_type(type: 'sides' | 'fringe'): Record<string, string>;
  init(manager: NPCManager): void;
};
//#endregion
//#region src/modules/NamedNPCAddon/NPCFluids.d.ts
type NPCFluidPart = 'vagina' | 'vaginaoutside' | 'anus' | 'mouth' | 'penis' | 'chest' | 'face' | 'hair' | 'bottom' | 'feet' | 'leftarm' | 'rightarm' | 'neck' | 'thigh' | 'tummy';
type NPCFluidType = 'goo' | 'semen';
type NPCFluidAmount = [goo: number, semen: number];
type NPCFluidData = Record<NPCFluidPart, NPCFluidAmount>;
declare class NPCFluids {
  readonly parts: NPCFluidPart[];
  ensure(npcName: string): NPCFluidData;
  get(npcName: string): NPCFluidData;
  combined(npcName: string, part: NPCFluidPart): number;
  set(npcName: string, part: NPCFluidPart, value: number, type?: NPCFluidType): NPCFluidData;
  add(npcName: string, part: NPCFluidPart, value?: number, type?: NPCFluidType): NPCFluidData;
  reduce(npcName: string, part: NPCFluidPart, value?: number, type?: NPCFluidType): NPCFluidData;
  clear(npcName: string, part?: NPCFluidPart, type?: NPCFluidType): NPCFluidData;
  decay(value?: number): void;
  apply(nnpc: Record<string, any>, npcData: any): void;
}
//#endregion
//#region src/modules/NamedNPCAddon/NPCTransformation.d.ts
interface NPCTransformationState {
  build: number;
  level: number;
}
type NPCTransformationPart = { [Key in keyof typeof transformationDefaults]: Key extends `${infer Part}_type` ? Part : never }[keyof typeof transformationDefaults];
interface NPCTransformationPartConfig {
  level?: number;
  style?: string;
  filter?: {
    blend?: string;
    blendMode?: string;
    brightness?: number;
    contrast?: number;
    desaturate?: boolean;
  };
}
interface NPCTransformationConfig {
  levels?: readonly number[];
  type?: string;
  parts?: Partial<Record<NPCTransformationPart, NPCTransformationPartConfig>>;
  body?: (bodydata: NPCBodyData, state: Readonly<NPCTransformationState>, npcName: string) => void;
  sidebar?: (nnpc: Partial<NPCSidebarState>, state: Readonly<NPCTransformationState>, npcName: string) => void;
  layers?: CanvasLayerMap;
}
declare class NPCTransformation {
  private readonly manager;
  private readonly configs;
  constructor(manager: NPCManager);
  add(npcName: string, type: string, config?: NPCTransformationConfig): this;
  ensure(npcName: string, type?: string): Record<string, NPCTransformationState>;
  get(npcName: string, type: string): NPCTransformationState;
  build(npcName: string, type: string, value: number): NPCTransformationState;
  set(npcName: string, type: string, level: number): NPCTransformationState;
  clear(npcName: string, type?: string): void;
  level(npcName: string, type: string): number;
  type(npcName: string): string;
  applyBody(
    nnpc: Partial<NPCSidebarState>,
    npcData: {
      bodydata?: NPCBodyData;
    }
  ): void;
  applySidebar(nnpc: Partial<NPCSidebarState>): void;
  private read;
  private entries;
  private config;
  private active;
}
//#endregion
//#region src/modules/NamedNPCAddon/NPCPregnancy.d.ts
type NPCPregnancySpecies = 'human' | 'wolf' | 'wolfboy' | 'wolfgirl' | 'hawk' | 'harpy';
type NPCPregnancyOrifice = 'vagina' | 'anus';
type NPCPregnancyRange = number | readonly [min: number, max: number];
interface NPCPregnancyState {
  enabled?: boolean;
  analEnabled?: boolean;
  cycleDaysTotal?: number;
  cycleDay?: number;
  cycleDangerousDay?: number;
  fertileLeadDays?: number;
  pills?: 'contraceptive' | 'fertility' | null;
  [key: string]: unknown;
}
interface NPCPregnancyRecord {
  pregnancyId: number;
  carrier: string;
  carrierSpecies: string;
  donor: string;
  donorSpecies: NPCPregnancySpecies;
  possibleDonors: {
    name: string;
    species: NPCPregnancySpecies;
  }[];
  conceivedDate: number;
  conceivedLocation: string;
  gestationVariance: number;
  orifice: NPCPregnancyOrifice;
  deliveredDate: number | null;
  deliveredLocation: string | null;
  awareOfPregnancy: string[];
  awareOfCarrier: string[];
  awareOfDonor: string[];
  talkedAbout: Record<string, boolean>;
  playerLearnedFrom: string | null;
  hatchDelay?: number;
  layCare?: number;
  waterBreaking?: boolean;
}
interface NPCPregnancyCycleConfig {
  days?: NPCPregnancyRange;
  dangerousDay?: number;
  fertileLeadDays?: NPCPregnancyRange;
  pills?: 'contraceptive' | 'fertility' | null;
  analEnabled?: boolean;
  avoidance?: number;
}
interface NPCPregnancyConfig {
  canBePregnant?: boolean;
  canImpregnatePlayer?: boolean;
  cycle?: NPCPregnancyCycleConfig;
}
interface NPCTryConceiveOptions {
  donor?: string;
  donorSpecies?: NPCPregnancySpecies;
  orifice?: NPCPregnancyOrifice;
  depth?: 'outside' | 'imminent' | 'deep';
  location?: string;
  fertility?: number;
  aware?: boolean;
  donorKnown?: boolean;
}
interface NPCPregnancySnapshot {
  cycle: {
    enabled: boolean;
    day: number | null;
    days: number | null;
    dangerousDay: number | null;
    fertileLeadDays: number | null;
    fertility: number;
    pills: NPCPregnancyState['pills'];
    analEnabled: boolean;
    avoidance: number | null;
  };
  pregnancies: NPCPregnancyRecord[];
  progress: number | null;
  dueDate: number | null;
  belly: number;
}
declare class NPCPregnancy {
  private readonly manager;
  private readonly configs;
  private initialized;
  constructor(manager: NPCManager);
  get available(): boolean;
  add(npcName: string, config?: NPCPregnancyConfig): this;
  init(): void;
  inject(): void;
  get(npcName: string): NPCPregnancySnapshot;
  tryConceive(npcName: string, options?: NPCTryConceiveOptions): NPCPregnancyRecord | null;
  private applyRegistration;
  private applyCycle;
  private validateCycle;
  private validateRange;
  private cycleConfigured;
  private markCycleConfigured;
  private species;
  private name;
  private npc;
  private requireRuntime;
  private range;
  private random;
}
//#endregion
//#region src/modules/NamedNPC.d.ts
type PronounCode = 'm' | 'f' | 'i' | 'n' | 't';
type TranslationInput = Map<string, Translation> | Record<string, Translation>;
interface NPCData {
  nam: string;
  gender?: 'm' | 'f' | 'h' | 'n' | 'none';
  pronoun?: PronounCode;
  title?: string;
  description?: string;
  type?: string;
  adult?: number;
  teen?: number;
  age?: number;
  insecurity?: string;
  chastity?: {
    penis: string;
    vagina: string;
    anus: string;
  };
  virginity?: Record<string, boolean>;
  hair_side_type?: string;
  hair_fringe_type?: string;
  hair_position?: string;
  hair_sides_length?: number;
  hair_fringe_length?: number;
  eyeColour?: string;
  hairColour?: string;
  bottomsize?: number;
  skincolour?: number;
  init?: number;
  intro?: number;
  penis?: string;
  penissize?: number;
  penisdesc?: string;
  vagina?: string;
  breastsize?: number;
  breastdesc?: string;
  ballssize?: number;
  outfits?: string[];
  pregnancy?: NPCPregnancyState | null;
  pregnancyAvoidance?: number;
  [key: string]: any;
}
interface NPCConfig {
  love?: {
    maxValue: number;
  };
  loveAlias?: [string, string] | (() => string | [string, string]);
  important?: boolean | (() => boolean);
  special?: boolean | (() => boolean);
  loveInterest?: boolean | (() => boolean);
  romance?: (() => boolean)[];
  [key: string]: unknown;
}
interface NPCStatConfig {
  min?: number;
  max?: number;
  default?: number;
  position?: number | 'first' | 'last' | false;
  [key: string]: unknown;
}
declare const NamedNPC: {
  new (
    manager: NPCManager,
    data: NPCData
  ): {
    nam: string;
    gender: 'm' | 'f' | 'h' | 'n' | 'none';
    title: string;
    description: string;
    type: string;
    adult: number;
    teen: number;
    age: number;
    insecurity: string;
    chastity: {
      penis: string;
      vagina: string;
      anus: string;
    };
    virginity: Record<string, boolean>;
    hair_side_type: string;
    hair_fringe_type: string;
    hair_position: string;
    hair_sides_length: number;
    hair_fringe_length: number;
    eyeColour: string;
    hairColour: string;
    pronoun: PronounCode;
    pronouns: Record<string, string>;
    bottomsize: number;
    skincolour: number;
    init: number;
    intro: number;
    penis: string;
    penissize: number;
    penisdesc: string;
    vagina: string;
    breastsize: number;
    breastdesc: string;
    breastsdesc: string;
    bottomdesc: string;
    ballsdesc: string;
    ballssize: number;
    outfits: string[];
    pregnancy: NPCPregnancyState;
    pregnancyAvoidance?: number;
    descCache: Record<string, string>;
    setPronouns(): void;
    setBodyTraits(data: NPCData): void;
    bodyPartdescription(): void;
  };
} & {
  add: (manager: NPCManager, npcData: NPCData, config?: NPCConfig, translationsData?: TranslationInput) => boolean;
  get: (manager: NPCManager) => string[];
  clear: (manager: NPCManager) => boolean;
  update: (manager: NPCManager) => boolean;
  setup: (manager: NPCManager) => void;
  proxy: (manager: NPCManager) => void;
  convert: (manager: NPCManager) => void;
};
declare class NPCManager {
  readonly core: MaplebirchCore;
  readonly log: ScopedLog;
  readonly data: Map<
    string,
    {
      Data: InstanceType<typeof NamedNPC>;
      Config: NPCConfig;
    }
  >;
  NPCNameList: string[];
  readonly Transformation: NPCTransformation;
  readonly Pregnancy: NPCPregnancy;
  readonly type: Record<'loveInterestNpcs' | 'importantNPCs' | 'specialNPCs', string[]>;
  readonly customStats: Record<string, NPCStatConfig>;
  readonly romanceConditions: {
    [key: string]: (() => boolean)[];
  };
  readonly NamedNPC: typeof NamedNPC;
  readonly Schedule: typeof NPCSchedules;
  readonly Clothes: NPCClothes;
  readonly Sidebar: typeof NPCSidebar;
  readonly fluids: NPCFluids;
  constructor(core: MaplebirchCore);
  add(npcData: NPCData, config?: NPCConfig, translationsData?: TranslationInput): boolean;
  addSchedule(npcName: string, config: ScheduleConfig | ScheduleBuilder): Schedule;
  addStats(statsObject: Record<string, NPCStatConfig>): void;
  addClothes(...configs: OutfitSetConfig[]): void;
  injectModNPCs(): void;
  vanillaNPCConfig(npcConfig: Record<string, NPCConfig>): Record<string, NPCConfig>;
  applyStatDefaults(statDefaults: Record<string, NPCStatConfig>): Record<string, NPCStatConfig>;
  vanillaInit(npcName: string): void;
  vanillaInject(npcName: string, npcno: number): void;
  private config;
  preInit(): void;
  Init(): void;
  loadInit(): void;
  postInit(): void;
}
//#endregion
//#region src/modules/CombatAddon/CombatTypes.d.ts
declare const actionTypes: readonly ['leftaction', 'rightaction', 'feetaction', 'mouthaction', 'penisaction', 'vaginaaction', 'anusaction', 'chestaction', 'thighaction'];
type ActionType = (typeof actionTypes)[number];
declare const combatTypes: readonly ['Default', 'Self', 'Struggle', 'Swarm', 'Vore', 'Machine', 'Tentacle'];
type CombatType = (typeof combatTypes)[number];
//#endregion
//#region src/modules/CombatAddon/CombatAction.d.ts
type OptionType = ActionType | 'ask';
type ActionValue = string | number;
interface Context {
  actionType?: OptionType;
  combatType?: CombatType;
  encounterType?: CombatType;
  action?: ActionValue;
  id?: string;
  originalCount?: number;
  label?: string;
}
interface ActionEntry {
  id: string;
  actionType: ActionType;
  cond: (ctx: Context) => boolean;
  display: (ctx: Context) => string;
  value: (ctx: Context) => ActionValue;
  color: (ctx: Context) => string;
  difficulty: (ctx: Context) => string;
  effect: (ctx: Context) => string;
  combatType: (ctx: Context) => CombatType | CombatType[];
  order: (ctx: Context) => number;
}
interface ActionConfig {
  id: string;
  actionType: ActionType | ActionType[];
  cond: (ctx: Context) => boolean;
  display: (ctx: Context) => string;
  value: (ctx: Context) => ActionValue;
  color?: string | ((ctx: Context) => string);
  difficulty?: string | ((ctx: Context) => string);
  effect?: string | ((ctx: Context) => string);
  combatType?: CombatType | CombatType[] | ((ctx: Context) => CombatType | CombatType[]);
  order?: number | ((ctx: Context) => number);
}
interface ModificationConfig {
  id: string;
  actionType: OptionType | OptionType[];
  value: ActionValue;
  combatType?: CombatType | CombatType[] | ((ctx: Context) => CombatType | CombatType[]);
  cond?: (ctx: Context) => boolean;
  display?: string | ((ctx: Context) => string);
  order?: number | ((ctx: Context) => number);
}
interface OptionsTable {
  [key: string]: ActionValue;
}
declare class CombatActions {
  readonly actions: ActionEntry[];
  private readonly modifications;
  private matches;
  reg(...configs: ActionConfig[]): this;
  modify(...configs: ModificationConfig[]): this;
  private eval;
  patchOptions(optionsTable: OptionsTable, actionType: OptionType, combatType?: CombatType): OptionsTable;
  color(action: ActionValue, encounterType?: CombatType): string | null;
  difficulty(action: ActionValue, combatType?: CombatType): string | null;
  effect(combatType: CombatType | undefined, ...actionTypes: ActionType[]): string;
}
//#endregion
//#region src/modules/Combat.d.ts
declare class Combat {
  readonly core: MaplebirchCore;
  readonly log: ScopedLog;
  readonly CombatAction: CombatActions;
  constructor(core: MaplebirchCore);
  preInit(): void;
  private _generateCombatAction;
  private _combatListColor;
  private _combatButtonAdjustments;
  Init(): void;
}
//#endregion
//#region src/modules/DoL/types.d.ts
interface CoreModules {
  readonly dynamic: DoLDynamic;
  readonly tool: DoLToolCollection;
  readonly audio: Audio;
  readonly var: Variables;
  readonly char: Character;
  readonly npc: NPCManager;
  readonly combat: Combat;
}
declare global {
  interface MaplebirchExtensions extends CoreModules {}
}
//#endregion
//#region src/modules/Frameworks/ImageLoader.d.ts
declare class ImageLoader {
  private static refreshTimer;
  static load(src: string): string | false | Promise<string | false>;
  private static queueRefresh;
}
//#endregion
export {
  type AddonServices,
  type BootHandler,
  type BootTask,
  type CloudSaveConfig,
  type CloudSaveRecord,
  type CloudSaveRemoteCode,
  type CloudSaveRemoteItem,
  type CoreEvents,
  type CoreModules,
  type DependencyGraph,
  type DependencyInfo,
  type DiagnosticRecord,
  DoLDynamic,
  type DoLGlobalScope,
  type DoLHost,
  DoLToolCollection,
  Dynamic,
  type EventCallback,
  type Extensions,
  type FrameworkHost,
  type FrameworkInfra,
  type FrameworkServices,
  type HookCallback,
  ImageLoader,
  type LifecyclePhase,
  type LifecycleResult,
  type LifecycleTarget,
  type LogLevel,
  type MaplebirchCore,
  type ModConflict,
  type Module,
  type ModulesMeta,
  type PatchResult,
  Resources,
  type SaveObject,
  type StateEventOptions,
  ToolCollection,
  type Translation,
  maplebirch as default,
  dol,
  index_d_exports as utils
};
