import { Passage } from "@scml/types/sugarcube-2-ModLoader/SugarCube2";
import { ModBootJson, ModInfo } from "@scml/types/sugarcube-2-ModLoader/ModLoader";
import { JSZipLikeReadOnlyInterface } from "@scml/types/sugarcube-2-ModLoader/JSZipLikeReadOnlyInterface";
import { ModZipReader } from "@scml/types/sugarcube-2-ModLoader/ModZipReader";
import { SC2DataManager } from "@scml/types/sugarcube-2-ModLoader/SC2DataManager";
import { ModUtils } from "@scml/types/sugarcube-2-ModLoader/Utils";
import { BrowserAPI } from "@scml/sc2-verlnir/src/browser";
import { ConfigAPI } from "@scml/sc2-verlnir/src/config";
import { DebugBarAPI } from "@scml/sc2-verlnir/src/debugbar";
import { DialogAPI } from "@scml/sc2-verlnir/src/dialog";
import { EngineAPI } from "@scml/sc2-verlnir/src/engine";
import { FullscreenAPI } from "@scml/sc2-verlnir/src/fullscreen";
import { HasAPI } from "@scml/sc2-verlnir/src/has";
import { IdbAPI } from "@scml/sc2-verlnir/src/idb";
import { L10nAPI } from "@scml/sc2-verlnir/src/l10n";
import { LinksAPI } from "@scml/sc2-verlnir/src/links";
import { LoadScreenAPI } from "@scml/sc2-verlnir/src/loadscreen";
import { MacroAPI } from "@scml/sc2-verlnir/src/macro";
import { PassageConstructor } from "@scml/sc2-verlnir/src/passage";
import { SaveAPI } from "@scml/sc2-verlnir/src/save";
import { ScriptingAPI } from "@scml/sc2-verlnir/src/scripting";
import { SettingAPI } from "@scml/sc2-verlnir/src/setting";
import { SimpleAudioAPI } from "@scml/sc2-verlnir/src/simpleaudio";
import { SimpleStoreAPI, SimpleStoreInstanceAPI } from "@scml/sc2-verlnir/src/simplestore";
import { StateAPI } from "@scml/sc2-verlnir/src/state";
import { StoryAPI } from "@scml/sc2-verlnir/src/story";
import { TemplateAPI } from "@scml/sc2-verlnir/src/template";
import { UIAPI } from "@scml/sc2-verlnir/src/ui";
import { UIBarAPI } from "@scml/sc2-verlnir/src/uibar";
import { UtilAPI } from "@scml/sc2-verlnir/src/util";
import { VersionInfo } from "@scml/sc2-verlnir/src/version";
import { VisibilityAPI } from "@scml/sc2-verlnir/src/visibility";
import { WikifierAPI } from "@scml/sc2-verlnir/src/wikifier";
import { Gui } from "@scml/types/Mod_LoaderGui/Gui";
import jsyaml from "js-yaml";
import { Howl, Howler } from "howler";
import * as marked from "marked";
import { MacroContext } from "twine-sugarcube";
//#endregion
//#region types/twine-sugarcube.d.ts
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
    wikifyEval(text: string, passageObj?: {
      title: string;
    }, passageTitle?: string): DocumentFragment;
  }
  export interface MacroDefinition {
    isAsync?: boolean;
    isWidget?: boolean;
  }
}
interface DolStateAPI extends StateAPI {
  show(): void;
}
interface DolSaveAPI extends SaveAPI {
  serialize(metadata?: any): string;
  deserialize(saveStr: string): any;
}
type WikifierAPI$1 = WikifierAPI & {
  wikifyEval(text: string, passageObj?: {
    title: string;
  }, passageTitle?: string): DocumentFragment;
};
interface SugarCubeUtilAPI extends UtilAPI {
  [key: string]: any;
}
interface TwineSugarCube {
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
  Wikifier: WikifierAPI$1;
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
//#endregion
//#region src/constants.d.ts
type LanguageCode = (typeof Languages)[number];
declare const Languages: readonly ['EN', 'CN'];
//#endregion
//#region src/utils/object.d.ts
type MergeFilterFn = (key: string, value: any, depth: number, targetValue: any) => boolean;
declare function clone(source: any, deep?: boolean, proto?: boolean, map?: WeakMap<object, any>): any;
declare function equal(a: any, b: any): boolean;
declare function merge(target: any, ...sources: any[]): any;
declare function append(target: any, ...sources: any[]): any;
declare function cover(target: any, ...sources: any[]): any;
declare function mergeFn(target: any, filterFn: MergeFilterFn | null, ...sources: any[]): any;
declare function appendFn(target: any, filterFn: MergeFilterFn | null, ...sources: any[]): any;
declare function coverFn(target: any, filterFn: MergeFilterFn | null, ...sources: any[]): any;
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
declare function clamp(value: any, min: number, max: number, fallback?: number): number;
//#endregion
//#region src/utils/string.d.ts
type ConvertMode$1 = 'lower' | 'upper' | 'capitalize' | 'title' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant';
declare function convert(value: string, mode?: ConvertMode$1, options?: {
  delimiter?: string;
  acronym?: boolean;
}): string;
declare function escapeHtmlText(value: string): string;
declare function widgets(content: string): string;
declare function widgets(...contents: string[]): string[];
//#endregion
//#region src/utils/binary.d.ts
declare function textToBytes(value: string): Uint8Array;
declare function jsonToBytes(value: unknown): Uint8Array;
declare function bytesToJson<T = any>(bytes: Uint8Array | ArrayBuffer): T;
declare function toArrayBuffer(bytes: Uint8Array): ArrayBuffer;
declare function bytesToBase64(bytes: Uint8Array): string;
declare function base64ToBytes(value: string): Uint8Array;
declare function base64ToArrayBuffer(value: string): ArrayBuffer;
declare function basicAuth(username: string, password: string): string;
//#endregion
//#region src/utils/path.d.ts
declare function joinEncodedPath(...parts: string[]): string;
//#endregion
//#region src/utils/selector.d.ts
declare class SelectCase {
  private cases;
  private defaultResult;
  private valueType;
  private allowMixedTypes;
  case(condition: string | number, result: any): this;
  case(condition: (input: any, meta?: any) => boolean, result: any): this;
  casePredicate(fn: (input: any, meta?: any) => boolean, result: any): this;
  caseRange(min: number, max: number, result: any): this;
  caseIn(values: any[], result: any): this;
  caseIncludes(values: string | string[], result: any): this;
  caseRegex(regex: RegExp, result: any): this;
  caseCompare(operator: '<' | '<=' | '>' | '>=', value: number, result: any): this;
  else(result: any): this;
  match(input: any, meta?: any): any;
  private validateType;
}
//#endregion
//#region src/utils/image.d.ts
declare function loadImage(src: string): string | boolean | Promise<string | boolean>;
//#endregion
//#region src/utils/prototype.d.ts
declare global {
  interface ObjectConstructor {
    merge<T extends object = any>(...sources: any[]): T;
    append<T extends object = any>(...sources: any[]): T;
    cover<T extends object = any>(...sources: any[]): T;
    mergefn<T extends object = any>(filterFn: MergeFilterFn | null, ...sources: any[]): T;
    appendfn<T extends object = any>(filterFn: MergeFilterFn | null, ...sources: any[]): T;
    coverfn<T extends object = any>(filterFn: MergeFilterFn | null, ...sources: any[]): T;
  }
  interface Array<T> {
    contains(value: unknown, mode?: ContainsMode, options?: ContainsOptions): boolean;
    either(weights?: number[], allowNull?: boolean): T | null | undefined;
  }
  interface ArrayConstructor {
    merge<T = any>(...sources: any[]): T[];
    append<T = any>(...sources: any[]): T[];
    cover<T = any>(...sources: any[]): T[];
  }
  interface ReadonlyArray<T> {
    contains(value: unknown, mode?: ContainsMode, options?: ContainsOptions): boolean;
    either(weights?: number[], allowNull?: boolean): T | null | undefined;
  }
  interface String {
    contains(value: string, options?: {
      case?: boolean;
    }): boolean;
    convert(mode?: ConvertMode$1, options?: {
      delimiter?: string;
      acronym?: boolean;
    }): string;
  }
  interface Math {
    random(): number;
    random(max: number): number;
    random(min: number, max: number, float?: boolean): number;
    clamp(value: any, min: number, max: number, fallback?: number): number;
  }
}
declare function prototypeUtils(): void;
declare namespace index_d_exports {
  export { SelectCase, append, appendFn as appendfn, base64ToArrayBuffer, base64ToBytes, basicAuth, bytesToBase64, bytesToJson, clamp, clone, contains, convert, cover, coverFn as coverfn, randomPick as either, equal, escapeHtmlText, joinEncodedPath, jsonToBytes, loadImage, merge, mergeFn as mergefn, prototypeUtils, publicUtils, randomNumber as random, textToBytes, toArrayBuffer, widgets };
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
  loadImage: typeof loadImage;
}>;
//#endregion
//#region src/services/Logger.d.ts
declare class Logger {
  readonly core: MaplebirchCore;
  private static readonly LEVELS;
  private static readonly CONFIG;
  private level;
  constructor(core: MaplebirchCore);
  fromIDB(): Promise<void>;
  log(message: string, levelName?: string | number, ...objects: unknown[]): void;
  set LevelName(levelName: string);
  get LevelName(): string;
}
//#endregion
//#region src/services/EventEmitter.d.ts
type EventCallback = (...args: any[]) => unknown;
declare class EventEmitter {
  readonly core: MaplebirchCore;
  private readonly events;
  private readonly afters;
  private readonly stickyEvents;
  private readonly stickyArgs;
  constructor(core: MaplebirchCore);
  on(eventName: string, callback: EventCallback, description?: string): boolean;
  off(eventName: string, identifier: EventCallback | string): boolean;
  once(eventName: string, callback: EventCallback, description?: string): boolean;
  trigger(eventName: string, ...args: any[]): Promise<void>;
  after(eventName: string, callback: EventCallback): void;
  private callSticky;
  private error;
}
//#endregion
//#region node_modules/idb/build/entry.d.ts
type KeyToKeyNoIndex<T> = { [K in keyof T]: string extends K ? never : number extends K ? never : K; };
type ValuesOf<T> = T extends { [K in keyof T]: infer U; } ? U : never;
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
type IndexKey<DBTypes extends DBSchema | unknown, StoreName extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName>> = DBTypes extends DBSchema ? IndexName extends keyof DBTypes[StoreName]['indexes'] ? DBTypes[StoreName]['indexes'][IndexName] : IDBValidKey : IDBValidKey;
type CursorSource<DBTypes extends DBSchema | unknown, TxStores extends ArrayLike<StoreNames<DBTypes>>, StoreName extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> | unknown, Mode extends IDBTransactionMode = 'readonly'> = IndexName extends IndexNames<DBTypes, StoreName> ? IDBPIndex<DBTypes, TxStores, StoreName, IndexName, Mode> : IDBPObjectStore<DBTypes, TxStores, StoreName, Mode>;
type CursorKey<DBTypes extends DBSchema | unknown, StoreName extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> | unknown> = IndexName extends IndexNames<DBTypes, StoreName> ? IndexKey<DBTypes, StoreName, IndexName> : StoreKey<DBTypes, StoreName>;
type IDBPDatabaseExtends = Omit$1<IDBDatabase, 'createObjectStore' | 'deleteObjectStore' | 'transaction' | 'objectStoreNames'>;
type DOMStringListSymbolIteratorType = DOMStringList extends {
  [Symbol.iterator](): infer R;
} ? R : IterableIterator<string>;
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
  transaction<Names extends ArrayLike<StoreNames<DBTypes>>, Mode extends IDBTransactionMode = 'readonly'>(storeNames: Names, mode?: Mode, options?: IDBTransactionOptions): IDBPTransaction<DBTypes, Names, Mode>;
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
  countFromIndex<Name extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, Name>>(storeName: Name, indexName: IndexName, key?: IndexKey<DBTypes, Name, IndexName> | IDBKeyRange | null): Promise<number>;
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
  getFromIndex<Name extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, Name>>(storeName: Name, indexName: IndexName, query: IndexKey<DBTypes, Name, IndexName> | IDBKeyRange): Promise<StoreValue<DBTypes, Name> | undefined>;
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
  getAllFromIndex<Name extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, Name>>(storeName: Name, indexName: IndexName, query?: IndexKey<DBTypes, Name, IndexName> | IDBKeyRange | null, count?: number): Promise<StoreValue<DBTypes, Name>[]>;
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
  getAllKeysFromIndex<Name extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, Name>>(storeName: Name, indexName: IndexName, query?: IndexKey<DBTypes, Name, IndexName> | IDBKeyRange | null, count?: number): Promise<StoreKey<DBTypes, Name>[]>;
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
  getKeyFromIndex<Name extends StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, Name>>(storeName: Name, indexName: IndexName, query: IndexKey<DBTypes, Name, IndexName> | IDBKeyRange): Promise<StoreKey<DBTypes, Name> | undefined>;
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
interface IDBPTransaction<DBTypes extends DBSchema | unknown = unknown, TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>, Mode extends IDBTransactionMode = 'readonly'> extends IDBPTransactionExtends {
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
type IDBPObjectStoreExtends = Omit$1<IDBObjectStore, 'transaction' | 'add' | 'clear' | 'count' | 'createIndex' | 'delete' | 'get' | 'getAll' | 'getAllKeys' | 'getKey' | 'index' | 'openCursor' | 'openKeyCursor' | 'put' | 'indexNames'>;
interface IDBPObjectStore<DBTypes extends DBSchema | unknown = unknown, TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>, StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>, Mode extends IDBTransactionMode = 'readonly'> extends IDBPObjectStoreExtends {
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
  createIndex: Mode extends 'versionchange' ? <IndexName extends IndexNames<DBTypes, StoreName>>(name: IndexName, keyPath: string | string[], options?: IDBIndexParameters) => IDBPIndex<DBTypes, TxStores, StoreName, IndexName, Mode> : undefined;
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
  iterate(query?: StoreKey<DBTypes, StoreName> | IDBKeyRange | null, direction?: IDBCursorDirection): AsyncIterableIterator<IDBPCursorWithValueIteratorValue<DBTypes, TxStores, StoreName, unknown, Mode>>;
}
type IDBPIndexExtends = Omit$1<IDBIndex, 'objectStore' | 'count' | 'get' | 'getAll' | 'getAllKeys' | 'getKey' | 'openCursor' | 'openKeyCursor'>;
interface IDBPIndex<DBTypes extends DBSchema | unknown = unknown, TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>, StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> = IndexNames<DBTypes, StoreName>, Mode extends IDBTransactionMode = 'readonly'> extends IDBPIndexExtends {
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
  iterate(query?: IndexKey<DBTypes, StoreName, IndexName> | IDBKeyRange | null, direction?: IDBCursorDirection): AsyncIterableIterator<IDBPCursorWithValueIteratorValue<DBTypes, TxStores, StoreName, IndexName, Mode>>;
}
type IDBPCursorExtends = Omit$1<IDBCursor, 'key' | 'primaryKey' | 'source' | 'advance' | 'continue' | 'continuePrimaryKey' | 'delete' | 'update'>;
interface IDBPCursor<DBTypes extends DBSchema | unknown = unknown, TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>, StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> | unknown = unknown, Mode extends IDBTransactionMode = 'readonly'> extends IDBPCursorExtends {
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
type IDBPCursorIteratorValueExtends<DBTypes extends DBSchema | unknown = unknown, TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>, StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> | unknown = unknown, Mode extends IDBTransactionMode = 'readonly'> = Omit$1<IDBPCursor<DBTypes, TxStores, StoreName, IndexName, Mode>, 'advance' | 'continue' | 'continuePrimaryKey'>;
interface IDBPCursorIteratorValue<DBTypes extends DBSchema | unknown = unknown, TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>, StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> | unknown = unknown, Mode extends IDBTransactionMode = 'readonly'> extends IDBPCursorIteratorValueExtends<DBTypes, TxStores, StoreName, IndexName, Mode> {
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
interface IDBPCursorWithValue<DBTypes extends DBSchema | unknown = unknown, TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>, StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> | unknown = unknown, Mode extends IDBTransactionMode = 'readonly'> extends IDBPCursor<DBTypes, TxStores, StoreName, IndexName, Mode> {
  /**
   * The value of the current item.
   */
  readonly value: StoreValue<DBTypes, StoreName>;
  /**
   * Iterate over the cursor.
   */
  [Symbol.asyncIterator](): AsyncIterableIterator<IDBPCursorWithValueIteratorValue<DBTypes, TxStores, StoreName, IndexName, Mode>>;
}
type IDBPCursorWithValueIteratorValueExtends<DBTypes extends DBSchema | unknown = unknown, TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>, StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> | unknown = unknown, Mode extends IDBTransactionMode = 'readonly'> = Omit$1<IDBPCursorWithValue<DBTypes, TxStores, StoreName, IndexName, Mode>, 'advance' | 'continue' | 'continuePrimaryKey'>;
interface IDBPCursorWithValueIteratorValue<DBTypes extends DBSchema | unknown = unknown, TxStores extends ArrayLike<StoreNames<DBTypes>> = ArrayLike<StoreNames<DBTypes>>, StoreName extends StoreNames<DBTypes> = StoreNames<DBTypes>, IndexName extends IndexNames<DBTypes, StoreName> | unknown = unknown, Mode extends IDBTransactionMode = 'readonly'> extends IDBPCursorWithValueIteratorValueExtends<DBTypes, TxStores, StoreName, IndexName, Mode> {
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
//#region src/services/IndexedDBService.d.ts
interface StoreIndex {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
}
type Transaction<Mode extends IDBTransactionMode = IDBTransactionMode> = IDBPTransaction<unknown, string[], Mode>;
declare class IndexedDBService {
  readonly core: MaplebirchCore;
  static readonly DATABASE_NAME = "maplebirch";
  static readonly DATABASE_VERSION: number;
  private db;
  private opening;
  private readonly stores;
  constructor(core: MaplebirchCore);
  register(name: string, options?: IDBObjectStoreParameters, indexes?: StoreIndex[]): void;
  init(): Promise<void>;
  private open;
  withTransaction<T, Mode extends IDBTransactionMode>(storeNames: string | string[], mode: Mode, callback: (tx: Transaction<Mode>) => T | Promise<T>): Promise<T>;
  clearStore(storeName: string): Promise<void>;
  deleteDatabase(): Promise<boolean>;
  private error;
}
//#endregion
//#region src/services/CloudSaveService.d.ts
type CloudSaveSlot = number;
type PanelAction = 'connectRemote' | 'uploadSlot' | 'downloadSlot' | 'refreshRemoteList' | 'deleteRemoteSlot' | 'exportCurrentCode' | 'exportSlotCode' | 'uploadCode' | 'downloadCode' | 'importCode';
interface CloudSaveConfig {
  endpoint: string;
  token: string;
}
interface CloudSaveRecord {
  slot: CloudSaveSlot;
  details: any;
  save: any;
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
declare class CloudSaveService {
  readonly core: MaplebirchCore;
  private static readonly PANEL_STORAGE_KEY;
  private config;
  constructor(core: MaplebirchCore);
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
  private refreshPanel;
  private remoteRow;
  private readPanel;
  private loadPanelConfig;
  private savePanelConfig;
  /** Worker 请求统一入口。 */
  private request;
  /** SugarCube delta 存档还原为完整 history。 */
  private normalizeSave;
  private field;
  private setField;
  private panelSlot;
  private status;
  private error;
  private get saveDB();
  private get panel();
  private get current();
  private get endpoint();
  private get token();
}
//#endregion
//#region src/services/LanguageManager.d.ts
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
declare class LanguageManager {
  readonly core: MaplebirchCore;
  static readonly DEFAULT_LANGS: readonly LanguageCode[];
  static readonly BATCH_SIZE = 500;
  language: LanguageCode;
  private readonly STORE;
  private readonly translations;
  private readonly cache;
  private preloaded;
  constructor(core: MaplebirchCore);
  private initDB;
  setLanguage(language?: string): Promise<LanguageCode>;
  import(modName: string, languages?: readonly LanguageCode[]): AsyncGenerator<ImportProgress>;
  importFile(modName: string, language: LanguageCode, path: string): AsyncGenerator<ImportProgress>;
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
  private readFileRecord;
  private writeFileRecord;
  private loadFileTranslations;
  private loadTranslation;
  private parseTranslations;
  private computeHash;
  private getModFile;
  private rebuild;
  private error;
}
//#endregion
//#region src/services/ModuleSystem.d.ts
interface Module {
  dependencies?: string[];
  exposed?: boolean;
  preInit?(): void | Promise<void>;
  Init?(): void;
  loadInit?(): void;
  postInit?(): void;
  [key: string]: unknown;
}
interface ModuleRegistry {
  modules: Map<string, Module>;
  states: Map<string, string | number>;
  sources: Map<string, string>;
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
}
interface DependencyInfo {
  protected: boolean;
  mounted: boolean;
  early: boolean;
  exposed: boolean;
  lifecycle: boolean;
  dependencies: string[];
  dependents: string[];
  allDependencies: string[];
  state: string;
  source: string;
}
type DependencyGraph = Record<string, DependencyInfo>;
declare class ModuleSystem {
  readonly core: MaplebirchCore;
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
  constructor(core: MaplebirchCore);
  with<T>(source: string, callback: () => T | Promise<T>): Promise<T>;
  register(name: string, module: Module, dependencies?: string[]): boolean;
  get dependencyGraph(): DependencyGraph;
  run(phase: 'pre'): Promise<void>;
  run(phase: 'init' | 'load' | 'post'): void;
  private preInit;
  private pre;
  private init;
  private phase;
  private callHook;
  private ready;
  private flushEarly;
  private topologicalOrder;
  private collect;
  private circular;
  private lifecycle;
  private promiseLike;
  private error;
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
declare class GUIControl {
  readonly core: MaplebirchCore;
  enabledModules: ModuleInfo[];
  disabledModules: ModuleInfo[];
  enabledScripts: string[];
  disabledScripts: string[];
  private modSubUiAngularJsService;
  constructor(core: MaplebirchCore);
  private initSettings;
  init(): Promise<void>;
  private loadSettings;
  private modNames;
  private currentModules;
  typeLabel(type: ModuleType): string;
  private modulesStore;
  private scriptsStore;
  saveModules(enabled: ModuleInfo[], disabled: ModuleInfo[]): Promise<void>;
  saveScripts(enabled: string[], disabled: string[]): Promise<void>;
  cascadeModules(action: 'enable' | 'disable', moduleName: string, modules: ModulesSettings): string[];
  get moduleList(): string;
  private whenCreate;
}
//#endregion
//#region src/modules/TimeStateWeather/Event.d.ts
interface EventOptions {
  priority?: number;
  once?: boolean;
}
//#endregion
//#region src/modules/TimeStateWeather/TimeEvents.d.ts
type TimeEventType = 'onSec' | 'onMin' | 'onHour' | 'onDay' | 'onWeek' | 'onMonth' | 'onYear' | 'onBefore' | 'onThread' | 'onAfter' | 'onTimeTravel';
type TimeUnit = 'sec' | 'min' | 'hour' | 'day' | 'week' | 'month' | 'year';
interface DateLike {
  hour: number;
  day: number;
  month: number;
  year: number;
  timeStamp: number;
  minute?: number;
  second?: number;
}
interface AccumulateConfig {
  unit: TimeUnit;
  target?: number;
}
interface TimeData {
  prevDate?: DateLike;
  currentDate?: DateLike;
  changes?: Record<TimeUnit, number>;
  triggeredByAccumulator?: {
    unit: TimeUnit;
    target: number;
    count: number;
  };
  exactPoints?: {
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
  detailedDiff?: any;
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
declare class TimeManager {
  private readonly manager;
  private readonly eventTypes;
  private readonly timeEvents;
  private readonly sortedEventsCache;
  readonly log: (message: string, level?: string, ...objects: any[]) => void;
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
  constructor(manager: DynamicManager);
  init(): void;
  patchDateTime(DateTimeClass: typeof DateTime): typeof DateTime;
  patchTime(TimeObject: typeof Time): void;
  register(type: TimeEventType, eventId: string, options: TimeEventOptions): boolean;
  unregister(type: string, eventId: string): boolean;
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
//#region src/modules/TimeStateWeather/StateEvents.d.ts
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
declare class StateManager {
  private readonly manager;
  private readonly stateEvents;
  private readonly log;
  constructor(manager: DynamicManager);
  trigger(type: 'gate' | 'append'): string;
  private processGateEvents;
  private processAppendEvents;
  register(type: 'gate' | 'append', eventId: string, options: StateEventOptions): boolean;
  unregister(type: 'gate' | 'append', eventId: string): boolean;
  init(): void;
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
  private sortedEventsCache;
  private readonly Exceptions;
  private readonly WeatherTypes;
  private readonly layerModifications;
  private readonly effectModifications;
  private weatherTriggered;
  private readonly log;
  constructor(manager: DynamicManager);
  private checkEvents;
  register(eventId: string, options: WeatherEventOptions): boolean;
  unregister(eventId: string): boolean;
  addLayer(layerName: string, patch: any, mode?: 'concat' | 'replace' | 'merge'): this;
  addEffect(effectName: string, patch: any, mode?: 'concat' | 'replace' | 'merge'): this;
  applyModifications(params: any): any;
  addWeatherData(data: WeatherException | WeatherTypeConfig): boolean | void;
  init(): void;
  modifyWeatherJavaScript(manager: AddonPlugin): void;
}
//#endregion
//#region src/modules/Dynamic.d.ts
declare class DynamicManager {
  readonly core: MaplebirchCore;
  readonly Time: TimeManager;
  readonly State: StateManager;
  readonly Weather: WeatherManager;
  readonly log: ReturnType<typeof createlog>;
  constructor(core: MaplebirchCore);
  regTimeEvent(type: TimeEventType, eventId: string, options: TimeEventOptions): boolean;
  delTimeEvent(type: TimeEventType, eventId: string): boolean;
  timeTravel(options?: TimeTravelOptions): boolean;
  get TimeEvents(): any;
  regStateEvent(type: 'gate' | 'append', eventId: string, options: StateEventOptions): boolean;
  delStateEvent(type: 'gate' | 'append', eventId: string): boolean;
  trigger(type: 'gate' | 'append'): string;
  get StateEvents(): any;
  regWeatherEvent(eventId: string, options: WeatherEventOptions): boolean;
  delWeatherEvent(eventId: string): boolean;
  addWeather(data: WeatherException | WeatherTypeConfig): boolean | void;
  Init(): void;
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
  readonly timeTravel: TimeTravelCheat;
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
  apply: (data: Record<string, any>, utils: Utils) => void;
}
interface PathRef {
  parent: Record<string, any>;
  key: string;
}
interface Utils {
  readonly log: ReturnType<typeof createlog>;
  path: (obj: Record<string, any>, path: string, create?: boolean) => PathRef | null;
  move: (data: Record<string, any>, from: string, to: string) => boolean;
  remove: (data: Record<string, any>, path: string) => boolean;
  transform: (data: Record<string, any>, path: string, fn: (value: any) => any) => boolean;
  fill: (target: Record<string, any>, defaults: Record<string, any>, mode?: 'merge' | 'cover') => void;
}
declare class migration {
  static readonly log: (message: string, level?: string, ...objects: any[]) => void;
  static create(): migration;
  readonly log: (message: string, level?: string, ...objects: any[]) => void;
  readonly utils: Utils;
  steps: Step[];
  private readonly unsafeKeys;
  constructor();
  add(from: string, to: string, apply: Step['apply']): void;
  run(data: Record<string, any>, targetVersion: string): void;
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
  static readonly log: (message: string, level?: string, ...objects: any[]) => void;
  static create(state?: Partial<RandState>): randSystem;
  readonly log: (message: string, level?: string, ...objects: any[]) => void;
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
interface MacroPayload {
  name: string;
  args: any;
  contents?: string;
}
interface MacroContext$1 extends Omit<MacroContext, 'createShadowWrapper' | 'error' | 'payload'> {
  payload?: MacroPayload[] | null;
  error(msg: string): any;
  createShadowWrapper(callback: Function, doneCallback?: Function, startCallback?: Function): (...args: any[]) => void;
  passageObj?: any;
  lanListboxCache?: Record<string, {
    options: ListboxOption[];
    selectedIdx: number;
  }>;
}
interface ListboxOption {
  label: string;
  value: any;
  type: 'static' | 'dynamic';
  exprIndex?: number;
  convertMode: ConvertMode | null;
}
//#endregion
//#region src/modules/Frameworks/macros.d.ts
type MacroFunction = (this: MacroContext$1, ...args: any[]) => any;
type SimpleMacroFunction = (this: MacroContext$1 | null, ...args: any[]) => any;
type StatFunction = (...args: any[]) => DocumentFragment;
type MacroTags = string[] | null | undefined;
type SkipArgs = string[] | boolean | null | undefined;
declare class defineMacros {
  readonly manager: ToolCollection;
  readonly log: ReturnType<typeof createlog>;
  readonly macros: string[];
  readonly statFunctions: Record<string, StatFunction>;
  constructor(manager: ToolCollection);
  get Macro(): MaplebirchCore['SugarCube']['Macro'];
  define(macroName: string, macroFunction: MacroFunction, tags?: MacroTags, skipArgs?: SkipArgs, isAsync?: boolean): void;
  defineS(macroName: string, macroFunction: SimpleMacroFunction, tags?: MacroTags, skipArgs?: SkipArgs, maintainContext?: boolean): void;
  statChange(statType: string, amount: number, colorClass: string, condition?: () => boolean): DocumentFragment;
  grace(amount: number, expectedRank?: string): DocumentFragment;
  create(name: string, fn: StatFunction): void;
  callStatFunction(name: string, ...args: any[]): DocumentFragment;
}
//#endregion
//#region src/modules/Frameworks/HtmlTools.d.ts
type TextContent = string | number | boolean | null | undefined;
type RawContent = TextContent | Node;
declare class Builder {
  readonly parent: htmlTools;
  readonly auto: (text: string) => string;
  readonly fragment: DocumentFragment;
  readonly context: Record<string, any>;
  constructor(parent: htmlTools, fragment: DocumentFragment, context?: Record<string, any>);
  text(content: TextContent, style?: string): this;
  line(content?: TextContent, style?: string): this;
  wikify(content: TextContent): this;
  raw(content: RawContent): this;
  box(content: RawContent, style?: string): this;
}
declare class htmlTools {
  readonly core: ToolCollection['core'];
  readonly log: ReturnType<typeof createlog>;
  private uid;
  private readonly store;
  constructor(manager: ToolCollection);
  get Wikifier(): any;
  replaceText(oldText: string, newText: string): void;
  replaceLink(oldLink: string, newLink: string): void;
  add(key: string, handler: (tools: Builder) => void, id?: string): string | false;
  delete(key: string, idOrHandler?: string | ((tools: Builder) => void)): boolean;
  clear(): void;
  renderFragment(keys: string | string[], context?: Record<string, any>): DocumentFragment;
  render(macro: any, keys: string | string[]): void;
  makeTextOutput(options?: {
    CSV?: boolean;
  }): MacroFunction;
}
//#endregion
//#region src/modules/Frameworks/ZonesManager.d.ts
interface ZoneWidgetConfig {
  exclude?: string[];
  match?: RegExp;
  passage?: string | string[];
  widget: string;
  type?: 'function';
  func?: () => any;
}
interface CustomLinkZoneItem {
  position: number;
  widget: string | ZoneWidgetConfig;
}
interface PatchSet {
  src?: string;
  srcmatch?: RegExp;
  srcmatchgroup?: RegExp;
  to?: string;
  applyafter?: string;
  applybefore?: string;
}
type ZoneItem = string | ZoneWidgetConfig | CustomLinkZoneItem;
type InitObject = {
  init: Function;
} | {
  name: string;
  func: Function;
};
type InitFunction = string | Function | InitObject;
declare class zonesManager {
  readonly log: ReturnType<typeof createlog>;
  readonly core: ToolCollection['core'];
  data: Record<string, ZoneItem[]>;
  initFunction: InitFunction[];
  specialWidget: (string | Function)[];
  defaultData: Record<string, string | Function>;
  locationPassage: Record<string, PatchSet[]>;
  widgetPassage: Record<string, PatchSet[]>;
  widgethtml: string;
  private functions;
  constructor(manager: ToolCollection);
  inject(...databases: Partial<Pick<zonesManager, 'specialWidget' | 'defaultData' | 'locationPassage' | 'widgetPassage'>>[]): void;
  onInit(...widgets: InitFunction[]): void;
  addTo(zone: string, ...widgets: (string | Function | ZoneWidgetConfig | [number, string | ZoneWidgetConfig])[]): void;
  storyInit(): void;
  call(name: string): any;
  play(zone: string, passageTitle?: string): any;
  patchModToGame(manager: AddonPlugin, type: 'before' | 'after'): void;
  private get widgets();
  private get specials();
  private defaultContent;
  private render;
  private shouldRender;
  private customLinkItem;
  private matchAndApply;
  private applyPatch;
  private wrapSpecialPassage;
  private applyContentPatches;
  private patchPassage;
  private widgetInit;
  private hash;
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
declare const log: (message: string, level?: string, ...objects: any[]) => void;
declare class LinkZoneManager {
  readonly containerId: string;
  readonly linkSelector: string;
  firstLink: Element | null;
  lastLink: Element | null;
  links: Element[];
  breakBeforeFirst: ChildNode | null;
  readonly log: ReturnType<typeof createlog>;
  constructor(containerId?: string, linkSelector?: string, logger?: typeof log);
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
//#region src/modules/Frameworks/OtherTools/Traits.d.ts
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
//#endregion
//#region src/modules/Frameworks/OtherTools/Location.d.ts
interface LocationConfigOptions {
  overwrite?: boolean;
  layer?: string;
  element?: string;
}
interface LocationConfig {
  condition?: (...object: any[]) => boolean;
  folder?: string;
  base?: Record<string, any>;
  emissive?: Record<string, any>;
  reflective?: Record<string, any>;
  layerTop?: Record<string, any>;
  customMapping?: any;
  [key: string]: any;
}
interface LocationUpdate {
  overwrite: boolean;
  config: LocationConfig;
  customMapping: any;
}
//#endregion
//#region src/modules/Frameworks/OtherTools/Bodywriting.d.ts
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
interface BodywritingData {
  operation: 'add' | 'del';
  config?: BodywritingConfig;
}
//#endregion
//#region src/modules/Frameworks/OtherTools/Foodstuff.d.ts
type FoodstuffSeason = 'spring' | 'summer' | 'autumn' | 'winter';
type FoodstuffPlantingBed = 'earth' | 'water';
type FoodstuffStallSize = 'small' | 'large';
interface FoodstuffConfig {
  key?: string;
  index?: number;
  name?: string;
  singular?: string;
  plural?: string;
  icon?: string;
  category?: string;
  kitchen_item_type_icon?: string;
  prop_folder?: string;
  ingredient_alternatives?: Record<string, string[]>;
  tending?: {
    planting_bed?: FoodstuffPlantingBed;
    growth_days?: number;
    yield_multiplier?: number;
    has_seeds?: boolean;
    seed_name?: string;
    seasons?: FoodstuffSeason[];
    affected_by_tending_skill?: boolean;
    tags?: string[];
    [key: string]: any;
  };
  shop?: {
    sell_price?: number;
    available_in?: string[];
    bought_in_bulk?: number;
    stall_size?: FoodstuffStallSize;
    [key: string]: any;
  };
  recipe?: {
    recipe_name?: string;
    difficulty?: number;
    cook_minutes?: number;
    servings?: number;
    ingredients?: string[];
    ingredient_alternatives?: Record<string, string[]>;
    tags?: string[];
    [key: string]: any;
  };
  food?: {
    handheld_gift?: boolean;
    tags?: string[];
    [key: string]: any;
  };
  [key: string]: any;
}
//#endregion
//#region src/modules/Frameworks/OtherTools/Antiques.d.ts
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
//#endregion
//#region src/modules/Frameworks/patch.d.ts
type AddTraits = (...traits: Partial<TraitConfig>[]) => void;
type InjectTraits = (data: TraitCategory[]) => TraitCategory[];
type ConfigureLocation = (locationId: string, config: LocationConfig, options?: LocationConfigOptions) => boolean;
type ApplyLocation = () => void;
type AddBodywriting = (key: string, config: BodywritingConfig) => void;
type ApplyBodywriting = () => void;
type AddFoodstuff = (key: string, config: FoodstuffConfig) => void;
type ApplyFoodstuff = () => void;
type AddAntiques = (key: string, config: AntiqueConfig) => void;
type InjectAntiques = (data: Record<string, AntiqueConfig>) => Record<string, AntiqueConfig>;
declare class Patch {
  readonly traitsData: TraitConfig[];
  readonly locationData: Record<string, LocationUpdate>;
  readonly bodywritingData: Record<string, BodywritingData>;
  readonly foodstuffData: Record<string, FoodstuffConfig>;
  readonly antiquesData: Record<string, AntiqueConfig>;
  addTraits: AddTraits;
  injectTraits: InjectTraits;
  configureLocation: ConfigureLocation;
  applyLocation: ApplyLocation;
  addBodywriting: AddBodywriting;
  applyBodywriting: ApplyBodywriting;
  addFoodstuff: AddFoodstuff;
  applyFoodstuff: ApplyFoodstuff;
  addAntiques: AddAntiques;
  injectAntiques: InjectAntiques;
}
declare const _default$1: Patch;
//#endregion
//#region src/modules/ToolCollection.d.ts
declare class ToolCollection {
  readonly core: MaplebirchCore;
  readonly console: CheatConsole;
  readonly migration: typeof migration;
  readonly rand: typeof randSystem;
  readonly macro: defineMacros;
  readonly text: htmlTools;
  readonly zone: zonesManager;
  readonly link: typeof applyLinkZone;
  readonly patch: typeof _default$1;
  readonly createlog: typeof createlog;
  constructor(core: MaplebirchCore);
  onInit(...widgets: InitFunction[]): void;
  addTo(zone: string, ...widgets: (string | Function | ZoneWidgetConfig | [number, string | ZoneWidgetConfig])[]): void;
  preInit(): void;
  private config;
  private loadConfig;
  private addTrait;
  private addKeyedConfig;
  private error;
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
  data?: any[];
  [key: string]: any;
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
declare class AudioManager {
  readonly core: MaplebirchCore;
  readonly log: ReturnType<typeof createlog>;
  private readonly STORE;
  private readonly playlists;
  private readonly eventListeners;
  private readonly cache;
  private activePlaylist;
  private currentTrack;
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
declare class Variables {
  readonly core: MaplebirchCore;
  private static readonly OPTIONS_STORAGE_KEY;
  private static moduleOptions;
  static add(key: string, value: any): void;
  static get options(): Record<string, any>;
  version: string;
  readonly tool: MaplebirchCore['tool'];
  readonly log: ReturnType<typeof createlog>;
  readonly migration: migration;
  readonly options: Options;
  constructor(core: MaplebirchCore);
  optionsStorage(action: 'save' | 'restore' | 'reset' | 'load'): any | null;
  check(): void;
  Init(): void;
  loadInit(): void;
  postInit(): void;
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
declare class Pet {
  private manager;
  readonly modelName: string;
  private canvas?;
  private model?;
  private container?;
  private options;
  private readonly layers;
  private cleanupDrag?;
  private syncing;
  private rendering;
  private syncFrame;
  constructor(manager: Character);
  sync(): boolean;
  use(layers: CanvasLayerMap): this;
  capture(mainModel?: CanvasModelOptions): void;
  render(target: PetTarget, options?: PetOptions): boolean;
  unmount(): void;
  refresh(): boolean;
  configure(options?: PetOptions): this;
  private cancel;
  private get displaySize();
  private readSettings;
  private draw;
  private clearBox;
  private enableDrag;
  private stopAnimation;
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
type TransformMessage = Record<string, {
  up: string[];
  down: string[];
}>;
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
  private log;
  private config;
  readonly decayConditions: Record<string, DecayCondition[]>;
  readonly suppressConditions: Record<string, SuppressCondition[]>;
  readonly buildUpdaters: Record<string, BuildUpdater>;
  constructor(manager: Character);
  private isDoLP;
  private get animalTransforms();
  private get animalMacros();
  private get historyTransforms();
  wikifier(widget: string, ...args: any[]): any;
  modifyEffect(manager: AddonPlugin): void;
  add(name: string, type: string, options: TransformationOption): this;
  inject(): void;
  private _update;
  private _clear;
  private suppress;
  _transform(name: string, change: number): void;
  updateTransform(name: string): void;
  _updateParts(name: string, oldLevel: number, newLevel: number): void;
  _transformationAlteration(): void;
  _transformationStateUpdate(): void;
  private handleHiddenTransformParts;
  message(key: string, tools: {
    element: (tag: string, text: any, className?: string) => void;
    wikifier: (macro: string, param: string) => void;
  }): boolean;
  get icon(): string;
  setTransform(name: string, level: number | null): void;
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
  readonly log: ReturnType<typeof createlog>;
  readonly mask: typeof mask;
  readonly faceStyleMap: Map<string, string[]>;
  private readonly handlers;
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
  [key: string]: any;
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
//#region src/modules/NamedNPCAddon/NPCClothes.d.ts
type Condition = boolean | string | (() => boolean) | Condition[];
interface OutfitSetConfig {
  name: string;
  type?: string;
  gender?: string;
  outfit?: number;
  upper: string | OutfitPartConfig;
  lower: string | OutfitPartConfig;
  desc?: string;
}
type ClothesConfig = OutfitSetConfig;
interface OutfitPartConfig {
  name: string;
  integrity_max?: number;
  word?: string;
  action?: string;
  readonly desc?: string;
}
interface WardrobeItem {
  [key: string]: any;
}
interface WearRule {
  key: string;
  cond?: Condition;
}
declare class NPCSidebarWardrobeProfile {
  name: string;
  outfits: string[];
  private location;
  private global;
  constructor(name: string, outfits?: string[], location?: Record<string, WearRule[]>, global?: WearRule[]);
  wear(location: string, key: string, cond?: Condition): this;
  get worn(): WardrobeItem;
}
declare const NPCClothes: {
  init: (manager: NPCManager) => void;
  addOutfitSet: (...configs: OutfitSetConfig[]) => void;
  importArt: (modName: string, modZip: ModZipReader, filePaths: string | string[]) => Promise<string[]>;
  loadWardrobe: (modName: string, filePath: string) => Promise<void>;
  wear: (npcName: string, location: string, key: string, cond?: Condition) => NPCSidebarWardrobeProfile;
  worn: (npcName: string) => WardrobeItem;
  readonly outfitSets: any;
  readonly art: Map<string, any>;
  readonly wardrobe: Record<string, WardrobeItem>;
  readonly profiles: Record<string, NPCSidebarWardrobeProfile>;
};
//#endregion
//#region src/modules/NamedNPCAddon/NPCSidebar.d.ts
interface NPCSidebarBootConfig {
  clothes?: string[];
  image?: string[];
  config?: string[];
}
declare function config(manager: NPCManager, modName: string, modZip: ModZipReader, config: NPCSidebarBootConfig): Promise<void>;
declare function loadFromMod(modZip: ModZipReader, npcNames: string[]): string[];
declare const NPCSidebar: {
  new (): {};
  get display(): Map<string, Set<string>>;
  config: typeof config;
  loadFromMod: typeof loadFromMod;
  hair_type(type: 'sides' | 'fringe'): Record<string, string>;
  init(manager: NPCManager): void;
};
//#endregion
//#region src/modules/NamedNPCAddon/NPCFluids.d.ts
type NPCFluidPart = 'vagina' | 'anus' | 'mouth' | 'chest' | 'face' | 'feet' | 'leftarm' | 'rightarm' | 'neck' | 'thigh' | 'tummy';
type NPCFluidData = Record<NPCFluidPart, number>;
declare class NPCFluids {
  readonly parts: NPCFluidPart[];
  ensure(npcName: string): NPCFluidData;
  get(npcName: string): NPCFluidData;
  set(npcName: string, part: NPCFluidPart, value: number): NPCFluidData;
  add(npcName: string, part: NPCFluidPart, value?: number): NPCFluidData;
  reduce(npcName: string, part: NPCFluidPart, value?: number): NPCFluidData;
  clear(npcName: string, part?: NPCFluidPart): NPCFluidData;
  decay(value?: number): void;
  apply(nnpc: Record<string, any>, npcData: any): void;
}
declare const _default: NPCFluids;
//#endregion
//#region src/modules/NamedNPCAddon/NPCTransformation.d.ts
interface NPCTransformationState {
  build: number;
  level: number;
}
interface NPCTransformationConfig {
  levels?: number[];
  type?: string;
  pregnancy?: string;
  body?: (bodydata: Record<string, any>, state: NPCTransformationState, npcName: string) => void;
  sidebar?: (nnpc: Record<string, any>, state: NPCTransformationState, npcName: string) => void;
  layers?: CanvasLayerMap;
}
declare class NPCTransformation {
  private readonly manager;
  private readonly configs;
  constructor(manager: NPCManager);
  add(type: string, config?: NPCTransformationConfig): this;
  ensure(npcName: string, type?: string): Record<string, NPCTransformationState>;
  get(npcName: string, type: string): NPCTransformationState;
  build(npcName: string, type: string, value: number): NPCTransformationState;
  set(npcName: string, type: string, level: number): NPCTransformationState;
  clear(npcName: string, type?: string): void;
  level(npcName: string, type: string): number;
  type(npcName: string): string;
  pregnancyType(npcName: string): string;
  applyBody(nnpc: Record<string, any>, npcData: any): void;
  applySidebar(nnpc: Record<string, any>): void;
  private active;
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
  hairlength?: number;
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
  pregnancy?: any;
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
  [key: string]: any;
}
declare const NamedNPC: {
  new (manager: NPCManager, data: NPCData): {
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
    hairlength: number;
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
    pregnancy: any;
    pregnancyAvoidance?: number;
    descCache: Record<string, any>;
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
  convert: (manager: NPCManager) => void;
};
declare class NPCManager {
  readonly core: MaplebirchCore;
  readonly log: ReturnType<typeof createlog>;
  readonly data: Map<string, any>;
  NPCNameList: string[];
  readonly Transformation: NPCTransformation;
  readonly type: {
    [x: string]: Array<string>;
  };
  readonly customStats: {
    [x: string]: any;
  };
  readonly romanceConditions: {
    [key: string]: (() => boolean)[];
  };
  readonly NamedNPC: typeof NamedNPC;
  readonly Schedule: typeof NPCSchedules;
  readonly Clothes: typeof NPCClothes;
  readonly Sidebar: typeof NPCSidebar;
  readonly fluids: typeof _default;
  constructor(core: MaplebirchCore);
  add(npcData: NPCData, config?: NPCConfig, translationsData?: TranslationInput): boolean;
  addSchedule(npcName: string, config: ScheduleConfig | ScheduleBuilder): Schedule;
  addStats(statsObject: {
    [x: string]: any;
  }): void;
  addClothes(...configs: ClothesConfig[]): void;
  injectModNPCs(): void;
  vanillaNPCConfig(npcConfig: NPCConfig): any;
  applyStatDefaults(statDefaults: {
    [x: string]: any;
  }): {
    [x: string]: any;
  };
  vanillaInit(npcName: string): void;
  vanillaInject(npcName: string, npcno: number): void;
  private config;
  preInit(): void;
  Init(): void;
  loadInit(): void;
  postInit(): void;
}
//#endregion
//#region src/modules/CombatAddon/CombatAction.d.ts
type ActionType = 'leftaction' | 'rightaction' | 'feetaction' | 'mouthaction' | 'penisaction' | 'vaginaaction' | 'anusaction' | 'chestaction' | 'thighaction';
type CombatType = 'Default' | 'Self' | 'Struggle' | 'Swarm' | 'Vore' | 'Machine' | 'Tentacle';
interface Context {
  actionType?: ActionType;
  combatType?: CombatType;
  encounterType?: CombatType;
  action?: any;
  originalCount?: number;
  [key: string]: any;
}
interface ActionEntry {
  id: string;
  actionType: ActionType;
  cond: (ctx: Context) => boolean;
  display: (ctx: Context) => string;
  value: (ctx: Context) => any;
  color: (ctx: Context) => string;
  difficulty: (ctx: Context) => string;
  effect: (ctx: Context) => string;
  combatType: (ctx: Context) => CombatType;
  order: (ctx: Context) => number;
}
interface ActionConfig {
  id: string;
  actionType: ActionType | ActionType[];
  cond: (ctx: Context) => boolean;
  display: (ctx: Context) => string;
  value: (ctx: Context) => any;
  color?: string | ((ctx: Context) => string);
  difficulty?: string | ((ctx: Context) => string);
  effect?: string | ((ctx: Context) => string);
  combatType?: CombatType | ((ctx: Context) => CombatType);
  order?: number | ((ctx: Context) => number);
}
interface OptionsTable {
  [key: string]: any;
}
declare class CombatActions {
  readonly actions: ActionEntry[];
  reg(...configs: ActionConfig[]): this;
  private eval;
  patchOptions(optionsTable: OptionsTable, actionType: ActionType, combatType?: CombatType): OptionsTable;
  color(action: any, encounterType?: CombatType): string | null;
  difficulty(action: any, combatType?: CombatType): string | null;
  effect(...actionTypes: ActionType[]): string;
}
//#endregion
//#region src/modules/Combat.d.ts
declare class CombatManager {
  readonly core: MaplebirchCore;
  readonly log: ReturnType<typeof createlog>;
  readonly CombatAction: CombatActions;
  constructor(core: MaplebirchCore);
  private _generateCombatAction;
  private _combatListColor;
  private _combatButtonAdjustments;
  Init(): void;
}
//#endregion
//#region src/core.d.ts
interface Extensions {}
type Instance = MaplebirchCore & Extensions;
declare class MaplebirchCore {
  static meta: {
    name: 'maplebirch Frameworks';
    author: string;
    version: string;
    modifiedby: string;
    updateDate: string;
    Languages: typeof Languages;
    early: readonly string[];
    core: readonly string[];
    protected: readonly string[];
  };
  readonly meta: typeof MaplebirchCore.meta;
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
    loadImage: typeof loadImage;
  }>;
  modList: string[];
  readonly manager: {
    modSC2DataManager: SC2DataManager;
    modLoaderGui: Gui;
  };
  passage: any;
  readonly yaml: typeof jsyaml;
  readonly howler: {
    Howl: typeof Howl;
    Howler: typeof Howler;
  };
  readonly logger: Logger;
  readonly tracer: EventEmitter;
  readonly idb: IndexedDBService;
  readonly credential: CredentialVault;
  readonly cloudSave: CloudSaveService;
  readonly lang: LanguageManager;
  readonly modules: ModuleSystem;
  readonly gui: GUIControl;
  readonly addon: AddonPlugin;
  readonly dynamic: DynamicManager;
  readonly tool: ToolCollection;
  readonly audio: AudioManager;
  readonly var: Variables;
  readonly char: Character;
  readonly npc: NPCManager;
  readonly combat: CombatManager;
  constructor(modSC2DataManager: SC2DataManager, modLoaderGui: Gui);
  log(msg: string, level?: string, ...objs: any[]): void;
  on(eventName: string, callback: (...args: any[]) => any, description?: string): boolean;
  off(eventName: string, identifier: string | ((...args: any[]) => any)): boolean;
  once(eventName: string, callback: (...args: any[]) => any, description?: string): boolean;
  after(eventName: string, callback: (...args: any[]) => any): void;
  trigger(evt: string, ...args: any[]): Promise<void>;
  register(name: string, module: any, dependencies?: string[]): boolean;
  t(key: string, space?: boolean): string;
  auto(text: string): string;
  disabled(modNames: string | string[], reload?: boolean): Promise<boolean>;
  get lodash(): ReturnType<ModUtils['getLodash']>;
  get marked(): typeof marked;
  set SugarCube(parts: TwineSugarCube);
  get SugarCube(): TwineSugarCube;
  set Language(lang: string);
  get Language(): string;
  set LogLevel(level: string);
  get LogLevel(): string;
  get(name: string): any;
  get dependencyGraph(): any;
  get modLoader(): ReturnType<SC2DataManager['getModLoader']>;
  get modUtils(): ModUtils;
  get gameVersion(): string;
}
declare var maplebirch: Instance;
declare function createlog(prefix: string): (message: string, level?: string, ...objects: any[]) => void;
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
  data: any;
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
  lazyOptions?: any;
  decrypt(password: string, context: CryptContext): Promise<CryptResult | Uint8Array | ArrayBuffer | Blob | string>;
}
declare class CredentialVault {
  readonly core: MaplebirchCore;
  private static readonly STORE;
  private static readonly TOKEN_PREFIX;
  private dialogQueue;
  private storageKey;
  constructor(core: MaplebirchCore);
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
//#region src/utils/twine.d.ts
type Replacement = [RegExp, string];
declare function replace(content: string, replacements: Replacement[], label?: string): string;
//#endregion
//#region src/modules/AddonPlugin.d.ts
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
declare class AddonPlugin {
  readonly core: MaplebirchCore;
  onStart: boolean;
  readonly replace: typeof replace;
  readonly SC2DataManager: SC2DataManager;
  readonly modUtils: ModUtils;
  readonly info: Map<string, {
    addonName: string;
    mod: ModInfo;
    modZip: ModZipReader;
  }>;
  readonly log: ReturnType<typeof createlog>;
  readonly jsFiles: FileItem[];
  readonly moduleFiles: FileItem[];
  private readonly disabledMods;
  private readonly blockedPassages;
  private readonly bootHooks;
  private readonly bootQueue;
  private onSaveLoadTracer;
  private moduleFilesExecuted;
  private scriptFilesExecuted;
  private bootReady;
  constructor(core: MaplebirchCore);
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
  private dataReplace;
  private loadFiles;
  private executeScripts;
  private process;
  private queue;
  private flush;
  private run;
  private config;
  private modifyOptionsDateFormat;
  private saveHandle;
  private error;
}
//#endregion
export { type Extensions, type MaplebirchCore, maplebirch as default, index_d_exports as utils };