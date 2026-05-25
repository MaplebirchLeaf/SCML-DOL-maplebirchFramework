import { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import { ModUtils } from '@scml/types/sugarcube-2-ModLoader/Utils';
import { Gui } from '@scml/types/Mod_LoaderGui/Gui';
import jsyaml from 'js-yaml';
import { Howl, Howler } from 'howler';
import * as marked from 'marked';
import { ModInfo, ModBootJson } from '@scml/types/sugarcube-2-ModLoader/ModLoader';
import { JSZipLikeReadOnlyInterface } from '@scml/types/sugarcube-2-ModLoader/JSZipLikeReadOnlyInterface';
import { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';

declare function clone(source: any, opt?: {
    deep?: boolean;
    proto?: boolean;
}, map?: WeakMap<object, any>): any;
declare function equal(a: any, b: any): boolean;
declare function merge(target: any, ...sources: any[]): any;
declare function contains(arr: any[], value: any, mode?: 'all' | 'any' | 'none', opt?: {
    case?: boolean;
    compare?: (item: any, value: any) => boolean;
    deep?: boolean;
}): boolean;
declare function random(min?: number | {
    min: number;
    max: number;
    float?: boolean;
}, max?: number, float?: boolean): number;
declare function either(itemsOrA: any, ...rest: any[]): any;
declare class SelectCase {
    case(cond: string | number, result: any): this;
    case(cond: (input: any, meta?: any) => boolean, result: any): this;
    casePredicate(fn: (input: any, meta?: any) => boolean, result: any): this;
    caseRange(min: number, max: number, result: any): this;
    caseIn(values: any[], result: any): this;
    caseIncludes(subs: string | string[], result: any): this;
    caseRegex(regex: RegExp, result: any): this;
    caseCompare(op: '<' | '<=' | '>' | '>=', val: number, result: any): this;
    else(result: any): this;
    match(input: any, meta?: any): any;
}
declare function convert(str: string, mode?: 'lower' | 'upper' | 'capitalize' | 'title' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant', opt?: {
    delimiter?: string;
    acronym?: boolean;
}): string;
declare function number(value: any, fallback?: number, min?: number, max?: number, mode?: 'none' | 'floor' | 'ceil' | 'round' | 'trunc', opt?: {
    step?: number;
    percent?: boolean;
    loop?: boolean;
}): number;
declare function loadImage(src: string): string | boolean | Promise<string | boolean>;
declare function widgets(content: string): string;
declare function widgets(...contents: string[]): string[];

type utils_SelectCase = SelectCase;
declare const utils_SelectCase: typeof SelectCase;
declare const utils_clone: typeof clone;
declare const utils_contains: typeof contains;
declare const utils_convert: typeof convert;
declare const utils_either: typeof either;
declare const utils_equal: typeof equal;
declare const utils_loadImage: typeof loadImage;
declare const utils_merge: typeof merge;
declare const utils_number: typeof number;
declare const utils_random: typeof random;
declare const utils_widgets: typeof widgets;
declare namespace utils {
  export { utils_SelectCase as SelectCase, utils_clone as clone, utils_contains as contains, utils_convert as convert, utils_either as either, utils_equal as equal, utils_loadImage as loadImage, utils_merge as merge, utils_number as number, utils_random as random, utils_widgets as widgets };
}

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

declare global {
  const V: Record<string, any>;
  const C: Record<string, any>;
  const T: Record<string, any>;

  class DateTime {
    static readonly MIN_DATE: DateTime;
    static readonly MAX_DATE: DateTime;

    constructor(year?: number | DateTime, month?: number, day?: number, hour?: number, minute?: number, second?: number);

    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    timeStamp: number;

    static getTotalDaysSinceStart(year: number): number;
    static isLeapYear(year: number): boolean;
    static getDaysOfMonthFromYear(year: number): readonly number[];
    static getDaysOfYear(year: number): number;

    toTimestamp(year: number, month: number, day: number, hour: number, minute: number, second: number): this;
    fromTimestamp(timestamp: number): this;
    compareWith(
      otherDateTime: DateTime,
      getSeconds?: boolean
    ):
      | number
      | {
          years: number;
          months: number;
          days: number;
          hours: number;
          minutes: number;
          seconds: number;
        };
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

  export interface JQueryAriaClickOptions {
    role?: string;
  }
}

interface WikifierAPI {
  new (destination: Node | DocumentFragment | string | null, source?: string): any;
  wikifyEval(text: string, passageObj?: { title: string }, passageTitle?: string): DocumentFragment;
}

type TwineSugarCube = any & {
  Wikifier: WikifierAPI;
};

declare class Logger {
    readonly core: MaplebirchCore;
    constructor(core: MaplebirchCore);
    fromIDB(): Promise<void>;
    log(message: string, levelName?: string | number, ...objects: any[]): void;
    set LevelName(levelName: string);
    get LevelName(): string;
}

type EventCallback = (...args: any[]) => any;
declare class EventEmitter {
    readonly core: MaplebirchCore;
    constructor(core: MaplebirchCore);
    on(eventName: string, callback: EventCallback, description?: string): boolean;
    off(eventName: string, identifier: EventCallback | string): boolean;
    once(eventName: string, callback: EventCallback, description?: string): boolean;
    trigger(eventName: string, ...args: any[]): Promise<void>;
    after(eventName: string, callback: EventCallback): void;
}

declare class IndexedDBService {
    readonly core: MaplebirchCore;
    static DATABASE_NAME: string;
    static DATABASE_VERSION: number;
    constructor(core: MaplebirchCore);
    register(name: string, options?: IDBObjectStoreParameters, indexes?: Array<{
        name: string;
        keyPath: string | string[];
        options?: IDBIndexParameters;
    }>): void;
    init(): Promise<void>;
    checkStore(): Promise<void>;
    withTransaction<T>(storeNames: string | string[], mode: IDBTransactionMode, callback: (tx: any) => T | Promise<T>): Promise<T>;
    clearStore(storeName: string): Promise<void>;
    deleteDatabase(): Promise<boolean>;
    resetDatabase(): Promise<void>;
}

type LanguageCode = (typeof Languages)[number];
declare const Languages: readonly ["EN", "CN"];

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
    constructor(core: MaplebirchCore);
    setLanguage(language?: string): Promise<LanguageCode>;
    import(modName: string, languages?: readonly LanguageCode[]): AsyncGenerator<ImportProgress>;
    importFile(modName: string, language: LanguageCode, path: string): AsyncGenerator<ImportProgress>;
    t(translationKey: string, space?: boolean): string;
    auto(text: string): string;
    preload(): Promise<void>;
    clearStorage(): Promise<void>;
    has(translationKey: string): boolean;
    set(translationKey: string, translations: Record<string, unknown>): boolean;
}

interface ModuleRegistry {
    modules: Map<string, any>;
    states: Map<string, string | number>;
    sources: Map<string, string>;
    dependencies: Map<string, Set<string>>;
    dependents: Map<string, Set<string>>;
    allDependencies: Map<string, Set<string>>;
    waitingQueue: Map<string, Set<string>>;
}
interface InitPhase {
    preInitCompleted: boolean;
    mainInitCompleted: boolean;
    loadInitExecuted: boolean;
    postInitExecuted: boolean;
}
declare class ModuleSystem {
    readonly core: MaplebirchCore;
    readonly registry: ModuleRegistry;
    readonly initPhase: InitPhase;
    constructor(core: MaplebirchCore);
    runWithSource<T>(source: string, callback: () => T | Promise<T>): Promise<T>;
    register(name: string, module: any, dependencies?: string[]): boolean;
    get dependencyGraph(): any;
    init(phase: 'pre' | 'init' | 'load' | 'post'): Promise<void>;
}

type ModuleType = 'protected' | 'mounted' | 'exposed' | 'module';
interface ModuleInfo {
    name: string;
    type: ModuleType;
    source: string;
    protected: boolean;
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
    constructor(core: MaplebirchCore);
    initSettings(): Promise<void>;
    init(): Promise<void>;
    typeLabel(type: ModuleType): string;
    canBeDisabled(mod: Pick<ModuleInfo, 'protected' | 'type'>): boolean;
    saveModules(enabled: ModuleInfo[], disabled: ModuleInfo[]): Promise<void>;
    saveScripts(enabled: string[], disabled: string[]): Promise<void>;
    cascadeModules(action: 'enable' | 'disable', moduleName: string, modules: ModulesSettings): string[];
    get moduleList(): string;
}

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
interface TimeEventOptions {
    action?: (data: TimeData) => void;
    cond?: (data: TimeData) => boolean;
    priority?: number;
    once?: boolean;
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
    readonly log: (message: string, level?: string, ...objects: any[]) => void;
    constructor(manager: DynamicManager);
    init(): void;
    register(type: string, eventId: string, options: TimeEventOptions): boolean;
    unregister(type: string, eventId: string): boolean;
    timeTravel(options?: TimeTravelOptions): boolean;
    updateTimeLanguage(choice?: 'JournalTime'): string | boolean;
}

interface StateEventOptions {
    output?: string;
    action?: () => void;
    cond?: () => boolean;
    priority?: number;
    once?: boolean;
    forceExit?: boolean | (() => boolean);
    extra?: {
        passage?: string[];
        exclude?: string[];
        match?: RegExp;
    };
}
declare class StateManager {
    constructor(manager: DynamicManager);
    trigger(type: 'gate' | 'append'): string;
    register(type: string, eventId: string, options: StateEventOptions): boolean;
    unregister(type: string, eventId: string): boolean;
    init(): void;
}

interface WeatherEventOptions {
    condition?: () => boolean;
    onEnter?: () => void;
    onExit?: () => void;
    once?: boolean;
    priority?: number;
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
    constructor(manager: DynamicManager);
    register(eventId: string, options: WeatherEventOptions): boolean;
    unregister(eventId: string): boolean;
    addLayer(layerName: string, patch: any, mode?: 'concat' | 'replace' | 'merge'): this;
    addEffect(effectName: string, patch: any, mode?: 'concat' | 'replace' | 'merge'): this;
    applyModifications(params: any): any;
    addWeatherData(data: WeatherException | WeatherTypeConfig): boolean | void;
    init(): void;
    modifyWeatherJavaScript(manager: AddonPlugin): Promise<void>;
}

declare class DynamicManager {
    readonly core: MaplebirchCore;
    readonly Time: TimeManager;
    readonly State: StateManager;
    readonly Weather: WeatherManager;
    readonly log: ReturnType<typeof createlog>;
    constructor(core: MaplebirchCore);
    regTimeEvent(type: string, eventId: string, options: TimeEventOptions): boolean;
    delTimeEvent(type: string, eventId: string): boolean;
    timeTravel(options?: TimeTravelOptions): boolean;
    get TimeEvents(): any;
    regStateEvent(type: string, eventId: string, options: StateEventOptions): boolean;
    delStateEvent(type: string, eventId: string): boolean;
    trigger(type: 'gate' | 'append'): string;
    get StateEvents(): any;
    regWeatherEvent(eventId: string, options: WeatherEventOptions): boolean;
    delWeatherEvent(eventId: string): boolean;
    addWeather(data: WeatherException | WeatherTypeConfig): boolean | void;
    preInit(): Promise<void>;
}

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
    constructor(manager: ToolCollection);
    executeJS(): JSExecutionResult;
    executeTwine(): TwineExecutionResult;
    execute(type: 'javascript' | 'twine'): ExecutionResult;
}

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
    fill: (target: Record<string, any>, defaults: Record<string, any>, options?: {
        mode?: 'merge' | 'replace';
    }) => void;
}
declare class migration {
    static readonly log: (message: string, level?: string, ...objects: any[]) => void;
    static create(): migration;
    readonly log: (message: string, level?: string, ...objects: any[]) => void;
    readonly utils: Utils;
    steps: Step[];
    constructor();
    add(from: string, to: string, apply: Step['apply']): void;
    run(data: Record<string, any>, targetVersion: string): void;
}

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
    constructor(state?: Partial<RandState>);
    reset(seed?: number): void;
    int(max: number): number;
    percent(): number;
    back(steps?: number): void;
    get seed(): number | null;
    set seed(value: number);
    get history(): number[];
    get index(): number;
}

type MacroFunction = Function;
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
    defineS(macroName: string, macroFunction: MacroFunction, tags?: MacroTags, skipArgs?: SkipArgs, maintainContext?: boolean): void;
    statChange(statType: string, amount: number, colorClass: string, condition?: () => boolean): DocumentFragment;
    grace(amount: number, expectedRank?: string): DocumentFragment;
    create(name: string, fn: StatFunction): void;
    callStatFunction(name: string, ...args: any[]): DocumentFragment;
}

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
    }): Function;
}

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
    constructor(manager: ToolCollection);
    inject(...databases: Partial<Pick<zonesManager, 'specialWidget' | 'defaultData' | 'locationPassage' | 'widgetPassage'>>[]): void;
    onInit(...widgets: InitFunction[]): void;
    addTo(zone: string, ...widgets: (string | Function | ZoneWidgetConfig | [number, string | ZoneWidgetConfig])[]): void;
    storyInit(): void;
    call(name: string): any;
    play(zone: string, passageTitle?: string): any;
    patchModToGame(manager: AddonPlugin, type: 'before' | 'after'): void;
}

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
}
declare const applyLinkZone: typeof LinkZoneManager;

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
declare const _default: Patch;

declare class ToolCollection {
    readonly core: MaplebirchCore;
    readonly console: CheatConsole;
    readonly migration: typeof migration;
    readonly rand: typeof randSystem;
    readonly macro: defineMacros;
    readonly text: htmlTools;
    readonly zone: zonesManager;
    readonly link: typeof applyLinkZone;
    readonly patch: typeof _default;
    readonly createlog: typeof createlog;
    constructor(core: MaplebirchCore);
    onInit(...widgets: InitFunction[]): void;
    addTo(zone: string, ...widgets: (string | Function | ZoneWidgetConfig | [number, string | ZoneWidgetConfig])[]): void;
    preInit(): void;
    get utils(): typeof utils;
}

declare const PlayMode: {
    readonly SEQUENTIAL: "sequential";
    readonly LOOP_ALL: "loop_all";
    readonly LOOP_ONE: "loop_one";
    readonly SHUFFLE: "shuffle";
};
type PlayMode = (typeof PlayMode)[keyof typeof PlayMode];
declare const PlayState: {
    readonly IDLE: "idle";
    readonly LOADING: "loading";
    readonly PLAYING: "playing";
    readonly PAUSED: "paused";
    readonly STOPPED: "stopped";
};
type PlayState = (typeof PlayState)[keyof typeof PlayState];
declare const SUPPORTED_FORMATS: readonly ["mp3", "wav", "ogg", "m4a", "flac", "webm"];
type AudioFormat = (typeof SUPPORTED_FORMATS)[number];
interface TrackMeta {
    title?: string;
    artist?: string;
}
interface AudioEventData {
    type: string;
    data?: any[];
    [key: string]: any;
}
type AudioEventHandler = (eventData: AudioEventData) => void;
declare class Track {
    readonly audioName: string;
    readonly modName: string;
    title: string;
    artist: string;
    duration: number;
    format: AudioFormat;
    constructor(audioName: string, modName: string, meta?: TrackMeta);
}
declare class Playlist {
    readonly name: string;
    tracks: Track[];
    currentIndex: number;
    playMode: PlayMode;
    constructor(name: string);
    add(input: Track | Track[]): void;
    removeAt(index: number): boolean;
    remove(audioName: string): boolean;
    clear(): void;
    setMode(mode: PlayMode): void;
    select(index: number): Track | null;
    next(): Track | null;
    previous(): Track | null;
    get length(): number;
}
declare class AudioManager {
    readonly core: MaplebirchCore;
    readonly log: ReturnType<typeof createlog>;
    constructor(core: MaplebirchCore);
    on(event: string, handler: AudioEventHandler): void;
    off(event: string, handler: AudioEventHandler): boolean;
    once(event: string, handler: AudioEventHandler): void;
    play(track: Track): Promise<boolean>;
    pause(): boolean;
    resume(): boolean;
    stop(): boolean;
    togglePlayPause(): void;
    next(): Promise<boolean>;
    previous(): Promise<boolean>;
    seek(percent: number): boolean;
    seekTo(seconds: number): boolean;
    getPlaylist(modName: string): Promise<Playlist>;
    playFromMod(modName: string, audioName?: string): Promise<boolean>;
    import(modName: string, audioFolder?: string): Promise<boolean>;
    addFile(file: File, modName?: string): Promise<boolean>;
    delete(modName: string, audioName: string): Promise<boolean>;
    clearAudio(modName: string): Promise<boolean>;
    clearCache(): void;
    destroy(): void;
    playlist(modName: string): Playlist;
    get Mute(): boolean;
    set Mute(value: boolean);
    get Volume(): number;
    set Volume(value: number);
    get PlayMode(): PlayMode;
    set PlayMode(mode: PlayMode);
    get AutoNext(): boolean;
    set AutoNext(value: boolean);
    get State(): PlayState;
    get CurrentTrack(): Track | null;
    get ActivePlaylist(): Playlist | null;
    get currentTime(): number;
    get duration(): number;
    preInit(): Promise<void>;
}

interface HairGradientsReturn {
    fringe: Record<string, string[]>;
    sides: Record<string, string[]>;
}
declare class Variables {
    readonly core: MaplebirchCore;
    static get options(): {
        character: {
            mask: number;
            rotation: number;
            charArt: {
                type: "fringe";
                select: string;
                value: any;
            };
            closeUp: {
                type: "fringe";
                select: string;
                value: any;
            };
        };
        npcsidebar: {
            show: boolean;
            model: boolean;
            position: "back";
            dxfn: number;
            dyfn: number;
            skin_type: string;
            tan: number;
            facestyle: string;
            facevariant: string;
            freckles: boolean;
            ears: string;
            mask: number;
            rotation: number;
            nnpc: boolean;
            display: {};
        };
        relationcount: number;
        npcschedules: boolean;
    };
    version: string;
    readonly tool: MaplebirchCore['tool'];
    readonly log: ReturnType<typeof createlog>;
    readonly migration: migration;
    hairgradients: () => HairGradientsReturn;
    constructor(core: MaplebirchCore);
    optionsCheck(): void;
    Init(): void;
    loadInit(): void;
    postInit(): void;
}

interface Part {
    name: string;
    tfRequired: number;
    default?: string;
    [key: string]: any;
}
type TransformHook = (options: any) => void;
type DecayCondition = () => boolean;
type SuppressCondition = (sourceName: string) => boolean;
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
    pre?: TransformHook | Function;
    post?: TransformHook | Function;
    layers?: any;
    translations?: TranslationInput$1;
}
interface TransformationOption extends EntryOptions {
    parts: Part[];
    traits?: Part[];
}
declare class Transformation {
    readonly decayConditions: Record<string, DecayCondition[]>;
    readonly suppressConditions: Record<string, SuppressCondition[]>;
    constructor(manager: Character);
    wikifier(widget: string, ...args: any[]): any;
    modifyEffect(manager: AddonPlugin): Promise<void>;
    add(name: string, type: string, options: TransformationOption): this;
    inject(): void;
    _update(): void;
    _clear(): void;
    _transform(name: string, change: number): void;
    updateTransform(name: string): void;
    _updateParts(name: string, oldLevel: number, newLevel: number): void;
    _transformationAlteration(): void;
    _transformationStateUpdate(): void;
    message(key: string, tools: {
        element: (tag: string, text: any, className?: string) => void;
        wikifier: (macro: string, param: string) => void;
    }): boolean;
    get icon(): string;
    setTransform(name: string, level: number | null): void;
}

interface FaceStyleOptions {
    facestyle: string;
    facevariant: string;
    [key: string]: any;
}
interface LayerConfig {
    masksrcfn?: (options: any) => any;
    srcfn?: (options: any) => string;
    showfn?: (options: any) => boolean;
    zfn?: (options: any) => number;
    filtersfn?: (options: any) => string[];
    animation?: string;
    [key: string]: any;
}
type FaceStyleNameFn = (options: FaceStyleOptions) => string;
type CharacterProcessType = 'pre' | 'post';
type CharacterProcessHandler = (options: any) => void;
type CharacterProcessInput = CharacterProcessHandler | Function;
type CharacterLayerMap = Record<string, LayerConfig>;
declare function faceStyleSrcFn(name: FaceStyleNameFn | string): (layerOptions: FaceStyleOptions) => string;
declare function mask(x?: number, rotation?: number, swap?: boolean, width?: number, height?: number): string;
declare class Character {
    readonly core: MaplebirchCore;
    readonly log: ReturnType<typeof createlog>;
    readonly mask: typeof mask;
    readonly faceStyleSrcFn: typeof faceStyleSrcFn;
    readonly faceStyleMap: Map<string, string[]>;
    readonly handlers: Record<CharacterProcessType, CharacterProcessHandler[]>;
    readonly transformation: Transformation;
    layers: CharacterLayerMap;
    constructor(core: MaplebirchCore);
    get ZIndices(): {
        [key: string]: number;
    };
    modifyPCModel(manager: AddonPlugin): Promise<void>;
    use(type: CharacterProcessType, fn: CharacterProcessInput): this;
    use(layerMap: CharacterLayerMap): this;
    process(type: CharacterProcessType, options: any): void;
    modifyFaceStyle(manager: AddonPlugin): Promise<void>;
    faceStyleImagePaths(): Promise<void>;
    render(): Promise<void>;
    preInit(): void;
    Init(): void;
    loadInit(): void;
}

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
}
declare const NPCSchedules: typeof Schedule & {
    readonly schedules: Map<string, Schedule>;
    init: (manager: NPCManager) => boolean;
    set: (npcName: string, config: ScheduleConfig | ScheduleBuilder) => Schedule;
    get: (npcName: string) => Schedule;
    update: (npcName: string, specialId: string | number, updates: Partial<Omit<SpecialSchedule, "id">>) => Schedule;
    remove: (npcName: string, specialId: string | number) => Schedule;
    clear: (npcName: string) => Schedule;
    clearAll: () => void;
    readonly npcList: string[];
    readonly location: Record<string, string>;
};

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
    constructor(name: string, outfits?: string[], location?: Record<string, WearRule[]>, global?: WearRule[]);
    wear(location: string, key: string, cond?: Condition): this;
    get worn(): WardrobeItem;
}
declare const NPCClothes: {
    init: (manager: NPCManager) => Promise<void>;
    addOutfitSet: (...configs: OutfitSetConfig[]) => void;
    importArt: (modName: string, modZip: ModZipReader, filePaths: string | string[]) => Promise<string[]>;
    loadWardrobe: (modName?: string, filePath?: string) => Promise<void>;
    wear: (npcName: string, location: string, key: string, cond?: Condition) => NPCSidebarWardrobeProfile;
    worn: (npcName: string) => WardrobeItem;
    readonly outfitSets: any;
    readonly art: Map<string, any>;
    readonly wardrobe: Record<string, WardrobeItem>;
    readonly profiles: Record<string, NPCSidebarWardrobeProfile>;
};

declare function loadFromMod(modZip: ModZipReader, npcNames: string[]): string[];
declare const NPCSidebar: {
    new (): {};
    get display(): Map<string, Set<string>>;
    loadFromMod: typeof loadFromMod;
    hair_type(type: "sides" | "fringe"): Record<string, string>;
    init(manager: NPCManager): void;
};

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
        gender: "m" | "f" | "h" | "n" | "none";
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
        applyVanillaPregnancySystem(manager: NPCManager): void;
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
    readonly pregnancy: {
        [x: string]: Array<string>;
    };
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
    preInit(): void;
    Init(): Promise<void>;
    loadInit(): void;
    postInit(): void;
}

declare const CombatAction: any;

declare class CombatManager {
    readonly core: MaplebirchCore;
    readonly log: ReturnType<typeof createlog>;
    readonly CombatAction: typeof CombatAction;
    constructor(core: MaplebirchCore);
    _generateCombatAction(): () => void;
    _combatListColor(name: string | number | false, value?: any, type?: string): any;
    _combatButtonAdjustments(name: string, extra: any): string;
    Init(): void;
}

declare class MaplebirchCore {
    static meta: {
        name: "maplebirch Frameworks";
        author: string;
        version: string;
        modifiedby: string;
        updateDate: string;
        Languages: readonly ["EN", "CN"];
        early: readonly ["addon", "dynamic", "tool", "char", "npc"];
        core: readonly ["addon", "dynamic", "tool", "audio", "var", "char", "npc", "combat"];
        protected: readonly ["addon", "dynamic", "tool", "audio", "var", "char", "npc", "combat", "internals"];
    };
    readonly meta: typeof MaplebirchCore.meta;
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
declare var maplebirch: MaplebirchCore;
declare function createlog(prefix: string): (message: string, level?: string, ...objects: any[]) => void;

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
    prompt?: AuthConfig['prompt'] & {
        name?: string;
    };
    lazyOptions?: any;
    decrypt(password: string, context: CryptContext): Promise<CryptResult | Uint8Array | ArrayBuffer | Blob | string>;
}
declare class CredentialVault {
    readonly core: MaplebirchCore;
    constructor(core: MaplebirchCore);
    readPassword(subject: string, key: string): Promise<string | null>;
    unlock(modName: string, config: AuthConfig, credential: string): Promise<string>;
    loadCrypt(options: CryptOptions): Promise<boolean>;
    verify(modName: string, config: AuthConfig, credential: string): Promise<AuthPayload>;
    forget(subject: string, key: string): Promise<void>;
}

interface Task<T = any> {
    modName: string;
    config: T;
    modZip?: ModZipReader;
}

type ConfigType = 'language' | 'audio' | 'framework' | 'npc';
interface FileItem {
    modName: string;
    filePath: string;
    content: string;
}
declare class AddonPlugin {
    readonly core: MaplebirchCore;
    onLoad: boolean;
    readonly replace: typeof replace;
    readonly SC2DataManager: SC2DataManager;
    readonly modUtils: ModUtils;
    readonly info: Map<string, {
        addonName: string;
        mod: ModInfo;
        modZip: ModZipReader;
    }>;
    readonly log: ReturnType<typeof createlog>;
    readonly supportedConfigs: ConfigType[];
    queue: Record<ConfigType, Task[]>;
    processed: Record<ConfigType | 'script', boolean>;
    jsFiles: FileItem[];
    moduleFiles: FileItem[];
    constructor(core: MaplebirchCore);
    canLoadThisMod(bootJson: ModBootJson, zip: JSZipLikeReadOnlyInterface): Promise<boolean>;
    afterInjectEarlyLoad(): Promise<void>;
    ModLoaderLoadEnd(): Promise<void>;
    afterEarlyLoad(): Promise<any>;
    registerMod(addonName: string, modInfo: ModInfo, modZip: ModZipReader): Promise<void>;
    afterRegisterMod2Addon(): Promise<void>;
    beforePatchModToGame(): Promise<void>;
    PatchModToGame_start(): Promise<any>;
    afterPatchModToGame(): Promise<void>;
    afterPreload(): Promise<any>;
    whenSC2StoryReady(): Promise<any>;
    whenSC2PassageInit(passage: any): Promise<any>;
    whenSC2PassageStart(passage: any, content: any): Promise<any>;
    whenSC2PassageRender(passage: any, content: any): Promise<any>;
    whenSC2PassageDisplay(passage: any, content: any): Promise<any>;
    whenSC2PassageEnd(passage: any, content: any): Promise<any>;
    loadCrypt(options: CryptOptions): Promise<boolean>;
}
declare function replace(content: string, replacements: [RegExp, string][]): string;

export { SelectCase, clone, contains, convert, maplebirch as default, either, equal, loadImage, merge, number, random };
