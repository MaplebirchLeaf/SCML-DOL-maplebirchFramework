declare global {
  interface Window {
    jQuery: typeof jQuery;
    $: typeof $;
    DateTime: typeof DateTime;
    getFormattedDate: any;
    getShortFormattedDate: any;
    lanSwitch: typeof lanSwitch;
    between: typeof between;
  }

  const JSZip: any;

  interface Math {
    clamp(value: number, min: number, max: number): number;
  }

  interface SugarCube {
    Macro: MacroModule;
    Wikifier: typeof Wikifier;
    Engine: { go(): any; show(): void; play(title: string, noHistory?: boolean): void };
    Save: SaveModule;
    setup: typeof setup;
    State: typeof State;
    Story: typeof Story;
    Config: typeof Config;
    Scripting: typeof Scripting;
    Util: typeof Util;
  }

  interface MacroModule {
    add(name: string | string[], def: any): void;
    delete(name: string | string[]): void;
    isEmpty(): boolean;
    has(name: string): boolean;
    get(name: string): any;
    init(handler?: string): void;
    hooks: { on(event: string, fn: Function): void; off(event: string, fn?: Function): void; emit(event: string, payload: any): void };
    tags: { register(parent: string, bodyTags?: string[]): void; unregister(parent: string): void; has(name: string): boolean; get(name: string): string[] | null };
    evalStatements(...args: any[]): any;
  }

  interface SaveModule {
    init: () => boolean;
    get: () => { autosave: SaveData | null; slots: (SaveData | null)[] };
    clear: () => boolean;
    ok: () => boolean;
    autosave: { ok: () => boolean; has: () => boolean; get: () => SaveData | null; load: () => boolean; save: (title?: string, metadata?: Record<string, any>) => boolean; delete: () => boolean };
    slots: { ok: () => boolean; readonly length: number; isEmpty: () => boolean; count: () => number; has: (slot: number) => boolean; get: (slot: number) => SaveData | null; load: (slot: number) => boolean; save: (slot: number, title?: string, metadata?: Record<string, any>) => boolean; delete: (slot: number) => boolean };
    export: (filename?: string, metadata?: Record<string, any>) => void;
    import: (event: Event) => void;
    serialize: (metadata?: Record<string, any>) => string | null;
    deserialize: (base64Str: string) => Record<string, any> | null;
    onLoad: { add: (handler: SaveEventHandler) => void; clear: () => void; delete: (handler: SaveEventHandler) => boolean; readonly size: number; readonly handlers: Set<SaveEventHandler> };
    onSave: { add: (handler: SaveEventHandler) => void; clear: () => void; delete: (handler: SaveEventHandler) => boolean; readonly size: number; readonly handlers: Set<SaveEventHandler> };
    readonly meta: Record<string, any>;
  }

  type SaveEventHandler = (saveObj: SaveData, details: { type: 'autosave' | 'disk' | 'serialize' | 'slot' }) => void;
  interface SaveData { id: string; state: { delta?: any; history?: any; idx: string }; idx: number | string; version?: string; title?: string; date?: number; metadata?: Record<string, any>; [key: string]: any }

  class Wikifier {
    constructor(destination: HTMLElement | DocumentFragment | JQuery | null, source: string, options?: object, passageObj?: { title: string }, passageTitle?: string);
    source: string; options: object; output: HTMLElement | DocumentFragment | null;
    static Option: { readonly length: number; readonly options: object; clear(): void; get(index: number): object | undefined; pop(): object | undefined; push(options: object): number };
    static Parser: { parsers: Array<{ name: string; match: string; handler: Function }>; add(parser: { name: string; match: string; handler: Function }): void; delete(name: string): void; has(name: string): boolean; get(name: string): { name: string; match: string; handler: Function } | null; Profile: { compile(): { all: any; core: any }; isEmpty(): boolean; has(profile: string): boolean; get(profile: string): any } };
    static helpers: { inlineCss: Function; evalText: (text: string) => string | number; evalPassageId: (passage: string) => string; hasBlockContext: (nodes: Node[]) => boolean; createShadowSetterCallback: (code: string) => () => any; parseSquareBracketedMarkup: (w: any) => any };
    static stopWikify: boolean;
    static wikifyEval(text: string, passageObj?: { title: string }, passageTitle?: string): DocumentFragment;
    static createInternalLink(destination: any, passage: string | null, text: string, callback?: Function): HTMLElement;
    static createExternalLink(destination: any, url: string | null, text: string): HTMLElement;
    static isExternalLink(link: string): boolean;
    static getPassageTitleLast(): string;
    static getPassageObjLast(): { title: string } | undefined;
  }

  const SugarCube: SugarCube;
  const setup: any;
  const Macro: { add(name: string, definition: any): void; delete(name: string): void; get(name: string): any; has(name: string): boolean; [key: string]: any };
  const Engine: { States: object; go(): any; show(): void; play(title: string, noHistory: boolean): void };
  const Story: { title: string; get(title: string): any; has(title: string): boolean };
  const Save: SaveModule;
  const State: { variables: any; temporary: any; active: any; passage: any; title: string; [key: string]: any };
  const Config: {
    api: { save: { autosave: boolean; autosaveSlots: number; id: string; onSave: () => void; onLoad: () => void }; ui: { stowBarInitially: boolean; updateStoryElements: boolean } };
    debug: boolean;
    macros: Record<string, any>;
    passages: { descriptions: boolean; displayTitles: boolean; start: string };
    saves: { autosave: boolean; autoload: boolean; slots: number };
    addVisitedLinkClass: boolean;
    history: { controls: boolean; maxStates: number };
    navigation: { override: (passage: string) => string };
  };
  const Scripting: { evalJavaScript(code: any, output: any, data: any): any; evalTwineScript(code: any, output: any, data: any): any; parse(rawCodeString: any): any };
  const Util: {
    escape: (str: string) => string;
    unescape: (str: string) => string;
    parse: (text: string) => DocumentFragment;
    wiki: (text: string) => DocumentFragment;
    entity: { encode: (str: string) => string; decode: (str: string) => string };
    random: { chance: (probability: number) => boolean; integer: (min: number, max: number) => number; float: (min: number, max: number) => number; pick: <T>(array: T[]) => T; shuffle: <T>(array: T[]) => T[] };
    time: { format: (date: Date, format: string) => string; parse: (str: string) => Date };
  };
  const V: any;
  const T: any;
  const C: any;

  readonly var maplebirch: MaplebirchCore;
  class MaplebirchCore {
    meta: typeof MaplebirchCore.meta;
    modList: string[];
    onLoad: boolean;
    readonly logger: Logger;
    readonly events: EventEmitter;
    readonly idb: IndexedDBService;
    readonly lang: LanguageManager;
    readonly modules: ModuleSystem;
    readonly state: TimeStateManager;
    readonly tool: tools;
    readonly audio: AudioManager;
    readonly var: variables;
    readonly char: CharacterManager;
    readonly npc: NPCManager;
    readonly combat: CombatManager;
    readonly shop: ShopManager;
    readonly modLoader: any;
    readonly modUtils: any;
    readonly SugarCube: SugarCube;
    readonly addonPlugin: FrameworkAddon;
    constructor();
    log(msg: string, level?: string, ...objs: any[]): void;
    on(evt: string, handler: Function, desc?: string): boolean;
    off(evt: string, identifier: string | Function): boolean;
    once(evt: string, handler: Function, desc?: string): boolean;
    trigger(evt: string, ...args: any[]): Promise<void>;
    register(name: string, module: any, dependencies?: string[], isExtension?: boolean|undefined): Promise<boolean>;
    preInit(): Promise<void>;
    init(): Promise<void>;
    loadInit(): Promise<void>;
    postInit(): Promise<void>;
    t(key: string, space?: boolean): string;
    autoTranslate(text: string): string;
    set Language(lang: string);
    set LogLevel(level: string);
    set ExModCount(count: number);
    getModule(name: string): any;
    get Language(): 'CN' | 'EN';
    get LogLevel(): string;
    get expectedModuleCount(): number;
    get registeredModuleCount(): number;
    get dependencyGraph(): any;
    get yaml(): typeof yaml;
    get gameVersion(): string;
    #Ready(): void;
    static meta: { version: string; name: string; author: string; modifiedby: string; UpdateDate: string; availableLanguages: string[]; coreModules: string[]; earlyMount: string[] };
    readonly Expansion: Expansion;
  }

  class Logger {
    constructor(core: MaplebirchCore);
    log(message: string, levelName?: string | number, ...objects: any[]): void;
    set LevelName(levelName: string);
    get LevelName(): string;
    static LogConfig: Record<string, {level: number, tag: string, style: string}>;
    static LogLevel: Record<string | number, string | number>;
  }

  class EventEmitter {
    constructor(core: MaplebirchCore);
    on(eventName: string, callback: Function, description?: string): boolean;
    off(eventName: string, identifier: Function | string): boolean;
    once(eventName: string, callback: Function, description?: string): boolean;
    trigger(eventName: string, ...args: any[]): void;
    static streamConfig: { batchSize: number; yieldInterval: number };
  }

  class IndexedDBService {
    static DATABASE_NAME: string;
    static DATABASE_VERSION: number;
    constructor(core: MaplebirchCore);
    register(name: string, options?: IDBObjectStoreParameters, indexes?: Array<{name: string, keyPath: string|string[], options?: IDBIndexParameters}>): boolean;
    init(): Promise<void>;
    withTransaction(storeNames: string|string[], mode: IDBTransactionMode, callback: (tx: any) => Promise<any>): Promise<any>;
    clearStore(storeName: string): Promise<void>;
  }

  class LanguageManager {
    static DEFAULT_LANGS: string[];
    static DEFAULT_IMPORT_CONCURRENCY: number;
    static DEFAULT_BATCH_SIZE: number;
    static DEFAULT_PRELOAD_YIELD: number;
    constructor(core: MaplebirchCore);
    translations: Map<string, string>;
    setLanguage(lang: string): void;
    t(key: string, space?: boolean): string;
    autoTranslate(sourceText: string): string;
    importAllLanguages(modName: string, languages?: string[]): Promise<boolean>;
    loadTranslations(modName: string, languageCode: string, filePath: string): Promise<boolean>;
    preloadAllTranslations(): Promise<void>;
    clearDatabase(): Promise<void>;
    cleanOldVersions(): Promise<void>;
    get language(): string;
  }

  class ModuleSystem {
    static streamConfig: { batchSize: number; yieldInterval: number };
    constructor(core: MaplebirchCore);
    initPhase: { preInitCompleted: boolean; mainInitCompleted: boolean; loadInitExecuted: boolean; postInitExecuted: boolean; expectedModuleCount: number; registeredModuleCount: number; allModuleRegisteredTriggered: boolean };
    register(name: string, module: any, dependencies?: string[], isExtension?: boolean|undefined): Promise<boolean>;
    setExpectedModuleCount(count: number): void;
    getDependencyGraph(): Record<string, { dependencies: string[]; dependents: string[]; state: string; allDependencies: string[] }>;
    preInit(): Promise<void>;
    init(): Promise<void>;
    loadInit(): Promise<void>;
    postInit(): Promise<void>;
  }

  class FrameworkAddon {
    constructor(core: MaplebirchCore, gSC2DataManager: typeof modSC2DataManager, gModUtils: typeof modUtils);
    core: MaplebirchCore;
    readonly gSC2DataManager: typeof modSC2DataManager;
    readonly gModUtils: typeof modUtils;
    readonly addonTweeReplacer: any;
    readonly addonReplacePatcher: any;
    info: Map<string, { addonName: string; mod: any; modZip: any }>;
    logger: { log: (message: string) => void; error: (message: string) => void };
    supportedConfigs: string[];
    queue: Record<string, Array<{ modName: string; modZip: any; config: any }>>;
    processed: Record<string, boolean>;
    jsFiles: string[];
    moduleFiles: Array<{ modName: string; filePath: string; content: string }>;
    nowModName: string;
    registerMod(addonName: string, modInfo: { name: string; bootJson: { addonPlugin: any[] } }, modZip: any): Promise<void>;
    canLoadThisMod(bootJson: { addonPlugin: any[]; name: string }, modZip: any): Promise<boolean>;
    afterInjectEarlyLoad(): Promise<void>;
    InjectEarlyLoad_start(modName: string, fileName: string): Promise<void>;
    afterRegisterMod2Addon(): Promise<void>;
    afterPatchModToGame(): Promise<void>;
    beforePatchModToGame(): Promise<void>;
    #vanillaDataReplace(): Promise<void>;
    #loadFiles(modName: string, modZip: any, files: string[], isModule: boolean): Promise<void>;
    #executeScripts(files: Array<string | {modName?: string, filePath?: string, content: string}>, type: string): Promise<void>;
    #simpleFrameworkCheck(): Promise<boolean>;
    #processInit(): Promise<void>;
  }

  class Process {
    static Language(addon: FrameworkAddon): Promise<void>;
    static Audio(addon: FrameworkAddon): Promise<void>;
    static Framework(addon: FrameworkAddon): Promise<void>;
    static NPC(addon: FrameworkAddon): Promise<void>;
    static NPCSidebar(addon: FrameworkAddon): Promise<void>;
    static Shop(addon: FrameworkAddon): Promise<void>;
    static Script(addon: FrameworkAddon): Promise<void>;
    static #addTrait(addon: FrameworkAddon, traitConfig: { title: string | Function; name: string | Function; colour?: string | Function; has?: boolean | Function; text?: string | Function }): void;
    static #addWidget(addon: FrameworkAddon, modName: string, zone: string, widget: string | { widget: string; exclude?: string[]; match?: RegExp; passage?: string[] }): void;
    static #injectBSAImages(addon: FrameworkAddon, modName: string, modZip: any, imgPaths: string[]): Promise<void>;
    static #loadScriptFile(addon: FrameworkAddon, modName: string, modZip: any, filePath: string): Promise<void>;
  }

  class TimeStateManager {
    logger: Logger;
    log: (message: string, level?: string, ...objects: any[]) => void;
    TimeManager: TimeManager;
    StateManager: StateManager;
    modifyWeather: modifyWeather;
    passage: any;
    constructor();
    get Passage(): any;
    regTimeEvent(type: string, eventId: string, options: any): void;
    delTimeEvent(type: string, eventId: string): void;
    timeTravel(options?: any): void;
    get TimeEvents(): any;
    regStateEvent(type: string, eventId: string, options: any): void;
    delStateEvent(type: string, eventId: string): void;
    get StateEvents(): any;
    preInit(): Promise<void>;
    Init(): void;
    #shouldCollectPassage(passage: any): boolean;
  }

  class StateEvent {
    id: string;
    type: string;
    output: string;
    action: Function;
    cond: Function;
    priority: number;
    once: boolean;
    forceExit: boolean;
    extra: any;
    constructor(id: string, type: string, options?: any);
    tryRun(): [boolean, boolean, boolean] | null;
    #checkPassage(passageName: string): boolean;
    #check(): boolean;
  }

  class StateManager {
    static StateEvent: typeof StateEvent;
    manager: TimeStateManager;
    log: (message: string, level?: string, ...objects: any[]) => void;
    eventTypes: string[];
    stateEvents: { [key: string]: Map<string, StateEvent> };
    constructor(manager: TimeStateManager);
    trigger(type: string): string;
    #processInterruptEvents(passageName: string): string;
    #processOverlayEvents(passageName: string): string;
    register(type: string, eventId: string, options: any): boolean;
    unregister(type: string, eventId: string): boolean;
    _makeMacroHandler(): Function;
    initialize(): void;
  }

  class TimeEvent {
    id: string;
    type: string;
    action: Function;
    cond: Function;
    priority: number;
    once: boolean;
    accumulate: any;
    exact: boolean;
    accumulator: number;
    target: number;
    constructor(id: string, type: string, options?: any);
    tryRun(enhancedTimeData: any): boolean;
    #handleExactEvent(timeData: any): boolean;
    #handleAccumulateEvent(timeData: any): boolean;
    #handleRegularEvent(timeData: any): boolean;
    #executeEvent(timeData: any): boolean;
    #isExactPointCrossed(prevDate: any, currentDate: any): boolean;
  }

  class TimeManager {
    static TimeEvent: typeof TimeEvent;
    static moonPhases: any;
    static monthNames: any;
    static daysOfWeek: any;
    log: (message: string, level?: string, ...objects: any[]) => void;
    eventTypes: string[];
    timeEvents: { [key: string]: Map<string, TimeEvent> };
    prevDate: any;
    currentDate: any;
    originalTimePass: Function;
    cumulativeTime: any;
    lastReportedCumulative: any;
    constructor(manager: TimeStateManager);
    #trigger(type: string, timeData: any): void;
    #updateCumulativeTime(passedSeconds: number): void;
    #triggerTimeEventsWithCumulative(timeData: any): void;
    #calculateTimeDifference(prev: any, current: any, passedSec: number): any;
    register(type: string, eventId: string, options: any): boolean;
    unregister(type: string, eventId: string): boolean;
    #handleTimePass(passedSeconds: number): string;
    timeTravel(options?: any): boolean;
    #updateDateTime(): void;
    updateTimeLanguage(choice?: string | boolean): string | boolean | void;
    initialize(): void;
  }

  class modifyWeather {
    constructor(core: MaplebirchCore, modSC2DataManager: any, addonReplacePatcher: any);
    core: MaplebirchCore;
    modSC2DataManager: any;
    addonReplacePatcher: any;
    layerModifications: Map<string, Array<{ patch: object; mode: string }>>;
    effectModifications: Map<string, Array<{ patch: object; mode: string }>>;
    weathertrigger: boolean;
    addEffect(effectName: string, patch: object, mode?: string): this;
    addLayer(layerName: string, patch: object, mode?: string): this;
    trigger(params: { name: any }): { name: any };
    modifyWeatherJavaScript(): Promise<void>;
  }

  class DateTime {
    constructor(year?: number, month?: number, day?: number, hour?: number, minute?: number, second?: number);
    constructor(timestamp: number);
    constructor(dateTime: DateTime);
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly hour: number;
    readonly minute: number;
    readonly second: number;
    readonly timeStamp: number;
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

  function getFormattedDate(date: any, includeWeekday?: boolean): string;
  function getShortFormattedDate(date: any): string;
  function ordinalSuffixOf(i: number): string;

  class AudioManager {
    static ModAudioPlayer: typeof ModAudioPlayer;
    constructor(core: MaplebirchCore);
    log: (message: string, level?: string, ...objects: any[]) => void;
    audioContext: AudioContext | null;
    idbManager: AudioIDBManager;
    modPlayers: Map<string, ModAudioPlayer>;
    allAudioKeysCache: string[];
    volume: number;
    initAudioContext(): void;
    decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer>;
    loadAudio(key: string, arrayBuffer: ArrayBuffer, modName?: string): Promise<boolean>;
    importAllAudio(modName: string, audioFolder?: string): Promise<boolean>;
    addAudioFromFile(file: File, modName?: string): Promise<boolean>;
    getPlayer(modName: string): ModAudioPlayer;
    getModAudioKeys(modName: string): Promise<string[]>;
    refreshCache(modName?: string): Promise<void>;
    refreshAllCache(): Promise<void>;
    set Volume(volume: number);
    get Volume(): number;
    get allAudioKeys(): string[];
    preInit(): Promise<void>;
    #refreshAllAudioKeys(): Promise<void>;
    #playWithBuffer(audioBuffer: AudioBuffer, key: string, options: any): any;
  }

  class AudioIDBManager {
    static DATABASE_NAME: string;
    static DATABASE_VERSION: number;
    constructor(core: MaplebirchCore);
    init(): Promise<void>;
    store(key: string, arrayBuffer: ArrayBuffer, modName: string): Promise<boolean>;
    get(key: string): Promise<ArrayBuffer | null>;
    getModKeys(modName: string): Promise<string[]>;
    clearStore(storeName?: string): Promise<void>;
    withTransaction(storeNames: string|string[], mode: IDBTransactionMode, callback: (tx: any) => Promise<any>): Promise<any>;
    #initIndexedDB(): void;
  }

  class ModAudioPlayer {
    audioManager: AudioManager;
    modName: string;
    activeSources: Map<string, any>;
    pausedStates: Map<string, any>;
    volume: number;
    globalGainNode: GainNode | null;
    loopCounters: Map<string, number>;
    defaultLoopCount: number;
    bufferCache: Map<string, AudioBuffer>;
    audioKeysCache: string[];
    constructor(audioManager: AudioManager, modName: string);
    initGainNode(): void;
    getAudioBuffer(key: string): Promise<AudioBuffer>;
    play(key: string, options?: AudioPlayOptions): Promise<any | null>;
    stop(key: string): void;
    stopAll(): void;
    set Volume(volume: number);
    setVolumeFor(key: string, volume: number): void;
    togglePause(key: string): Promise<{ status: string; offset?: number; audioSource?: any }>;
    isPlaying(): string[];
    get audioKeys(): string[];
    getDuration(key: string): number;
    setLoopCount(key: string, count: number): void;
    refreshCache(): Promise<void>;
    refreshAudioKeys(): Promise<void>;
  }

  interface AudioPlayOptions {
    allowOverlap?: boolean;
    stopOthers?: boolean;
    volume?: number;
    offset?: number;
    duration?: number;
    loop?: boolean;
    loopCount?: number;
    loopStart?: number;
    loopEnd?: number;
    onEnded?: Function;
  }

  class tools {
    migration: typeof migration;
    rand: typeof randSystem;
    widget: defineWidget;
    text: htmlTools;
    framework: frameworks;
    linkzone: typeof applyLinkZone;
    other: others;
    console: consoleTools;
    clone: typeof clone;
    merge: typeof merge;
    equal: typeof equal;
    contains: typeof contains;
    SelectCase: typeof SelectCase;
    random: typeof random;
    either: typeof either;
    loadImage: typeof loadImage;
    convert: typeof convert;
    constructor();
    core: MaplebirchCore;
    createLog(prefix: string): (message: string, level?: string, ...objects: any[]) => void;
    preInit(): Promise<void>;
    Init(): void;
    postInit(): void;
  }

  class migration {
    static create(): migration;
    static logger: (message: string, level?: string, ...objects: any[]) => void;
    static init(createLog: (logname: string) => (message: string, level?: string, ...objects: any[]) => void): void;
    constructor();
    log: (message: string, level?: string, ...objects: any[]) => void;
    migrations: Array<{ fromVersion: string; toVersion: string; migrationFn: (data: any, utils: MigrationUtils) => void }>;
    utils: MigrationUtils;
    add(fromVersion: string, toVersion: string, migrationFn: (data: any, utils: MigrationUtils) => void): void;
    run(data: any, targetVersion: string): void;
    #compareVersions(a: string, b: string): number;
  }

  interface MigrationUtils {
    resolvePath(obj: any, path: string, createIfMissing?: boolean): { parent: any; key: string } | null;
    rename: (data: any, oldPath: string, newPath: string) => boolean;
    move: (data: any, oldPath: string, newPath: string) => boolean;
    remove: (data: any, path: string) => boolean;
    transform: (data: any, path: string, transformer: (value: any) => any) => boolean;
    fill: (target: any, defaults: any, options?: { arr?: string }) => void;
  }

  class randSystem {
    static logger: (message: string, level?: string, ...objects: any[]) => void;
    static init(createLog: (logname: string) => (message: string, level?: string, ...objects: any[]) => void): void;
    constructor();
    log: (message: string, level?: string, ...objects: any[]) => void;
    state: { seed: number | null; history: number[]; pointer: number };
    Seed: number | null;
    get(max: number): number;
    readonly rng: number;
    readonly history: number[];
    readonly pointer: number;
    backtrack(steps?: number): void;
  }

  class defineWidget {
    constructor(logger: (message: string, level?: string, ...objects: any[]) => void);
    _getMacro(data: any): boolean;
    defineMacro(macroName: string, macroFunction: Function, tags?: any[], skipArgs?: boolean, isAsync?: boolean): void;
    defineMacroS(macroName: string, macroFunction: Function, tags?: any, skipArgs?: boolean, maintainContext?: boolean): void;
    statChange(statType: string, amount: number, colorClass: string, condition?: () => boolean): DocumentFragment;
    create(name: string, fn: Function): void;
    callStatFunction(name: string, ...args: any[]): DocumentFragment;
  }

  class htmlTools {
    constructor(logger: (message: string, level?: string, ...objects: any[]) => void);
    _getWikifier(wikifier: any): boolean;
    reg(key: string, handler: Function, id?: string): string | false;
    unreg(key: string, idOrHandler?: string | Function): boolean;
    clear(): void;
    renderFragment(keys: string | string[], context?: any): DocumentFragment;
    renderToMacroOutput(macro: any, keys: string | string[]): void;
    makeMacroHandler(options?: { allowCSV?: boolean }): Function;
  }

  class frameworks {
    constructor(logger: (message: string, level?: string, ...objects: any[]) => void);
    data: FrameworkData;
    initFunction: any[];
    specialWidget: any[];
    default: any;
    widgethtml: string;
    patchedPassage: Set<string>;
    locationPassage: any;
    widgetPassage: any;
    onInit(...widgets: any[]): void;
    addTo(zone: string, ...widgets: any[]): void;
    storyInit(): void;
    play(zone: string, passageTitle?: string): string;
    patchPassage(type: 'before'|'after', passage: any, title: string): Promise<any>;
    widgetInit(passageData: any): Promise<any>;
    patchModToGame(type: 'before'|'after'): Promise<void>;
  }

  interface FrameworkData {
    Init: any[];
    DataInit: any[];
    Header: any[];
    Footer: any[];
    Information: any[];
    Options: any[];
    Cheats: any[];
    Statistics: any[];
    Journal: any[];
    BeforeLinkZone: any[];
    AfterLinkZone: any[];
    CustomLinkZone: any[];
    CaptionDescription: any[];
    StatusBar: any[];
    MenuBig: any[];
    MenuSmall: any[];
    CaptionAfterDescription: any[];
    HintMobile: any[];
    StatsMobile: any[];
    CharaDescription: any[];
    DegreesBonusDisplay: any[];
    DegreesBox: any[];
    SkillsBonusDisplay: any[];
    SkillsBox: any[];
    SubjectBoxBonusDisplay: any[];
    SchoolSubjectsBox: any[];
    SchoolMarksText: any[];
    WeaponBox: any[];
    ReputationModify: any[];
    Reputation: any[];
    FameModify: any[];
    Fame: any[];
    StatusSocial: any[];
    NPCinit: any[];
    NPCspawn: any[];
  }

  const applyLinkZone: typeof LinkZoneManager & { apply(userConfig?: Partial<LinkZoneConfig>): boolean; add(config: LinkZoneConfig): void; removeZones(): void; readonly defaultConfig: LinkZoneConfig };
  class LinkZoneManager {
    constructor(containerId?: string, linkSelector?: string, logger?: (message: string, level?: string, ...objects: any[]) => void);
    detectLinks(): LinkDetectionResult | null;
    applyZones(config: LinkZoneConfig): boolean;
    #resetState(): void;
    #detectLineBreakBeforeFirstLink(): void;
    #isLineBreakNode(node: Node): boolean;
    #isElementVisible(element: Element): boolean;
    #createZoneElement(id: string | null, config: LinkZoneConfig): HTMLDivElement;
    #applyCustomLinkZone(position: number, config: LinkZoneConfig): HTMLDivElement | null;
    #applyBeforeLinkZone(config: LinkZoneConfig): void;
    #applyAfterLinkZone(config: LinkZoneConfig): void;
  }

  interface LinkDetectionResult { firstLink: Element; lastLink: Element; totalLinks: number; lineBreakBeforeFirstLink: Node | null }
  interface LinkZoneConfig {
    containerId?: string;
    linkSelector?: string;
    beforeMacro?: string | (() => string);
    afterMacro?: string | (() => string);
    customMacro?: string | (() => Array<{ position: number; macro: string }>);
    zoneStyle?: Partial<CSSStyleDeclaration> | Record<string, string>;
    onBeforeApply?: () => void;
    onAfterApply?: (result: boolean, config: LinkZoneConfig) => void;
    debug?: boolean;
  }

  class others {
    constructor(logger: (message: string, level?: string, ...objects: any[]) => void);
    static traitCategories: { [key: string]: string };
    static getTraitCategory(englishName: string): string;
    traitsTitle: string[];
    traitsData: any[];
    locationUpdates: any;
    addTraits(...data: any[]): void;
    initTraits(data: any): boolean;
    configureLocation(locationId: string, config: any, options?: { overwrite?: boolean; layer?: string; element?: string }): boolean;
    applyLocation(): boolean;
    addBodywriting(key: string, config: any): void;
    delBodywriting(key: string): void;
    applyBodywriting(): boolean;
  }

  class modhint {
    constructor(logger: (message: string, level?: string, ...objects: any[]) => void);
    hintClicked(): void;
    searchButtonClicked(): void;
    clearButtonClicked(): void;
  }

  class consoleTools {
    constructor(logger: (message: string, level?: string, ...objects: any[]) => void);
    execute(type: 'javascript' | 'twine'): { success: boolean; error?: string; message?: string; result?: any };
  }

  class cheat {
    constructor();
    cache: CheatEntry[];
    initDB(): Promise<void>;
    refreshCache(): Promise<void>;
    add(name: string, code: string): Promise<boolean>;
    remove(name: string): Promise<boolean>;
    execute(name: string): Promise<boolean>;
    search(term: string): CheatEntry[];
    searchAndDisplay(): void;
    displayAll(): Promise<void>;
    createFromForm(): Promise<void>;
    clearAll(confirm?: boolean): string | void;
    clearAllAsync(): Promise<void>;
    deleteConfirm(name: string): string;
    cancelDelete(name: string): void;
    updateContainer(containerId: string, content: string): void;
    HTML(cheats?: CheatEntry[]): string;
  }

  interface CheatEntry { name: string; code: string; type: 'javascript' | 'twine' }

  class variables {
    optionsCheck(): void;
    version: string;
    tool: tools;
    log: (message: string, level?: string, ...objects: any[]) => void;
    migration: migration;
    preInit(): void;
    Init(): void;
    loadInit(): void;
    postInit(): void;
    #mapProcessing(): void;
  }

  class CharacterManager {
    core: MaplebirchCore;
    log: (message: string, level?: string, ...objects: any[]) => void;
    transformation: Transformation;
    constructor(core: MaplebirchCore);
    modifyPCModel(manager: any): Promise<void>;
    use(...args: any[]): this;
    process(type: 'pre' | 'post', options: any): void;
    faceStyleImagePaths(): Promise<void>;
    render(): Promise<void>;
    Init(): void;
    loadInit(): void;
    readonly get ZIndices(): typeof ZIndices;
  }

  class Transformation {
    add(name: string, type: 'physical'|'special', options: any): this;
    inject(): void;
    modifyEffect(manager: any): Promise<void>;
    message(key: string, tools: { element: Function, wikifier: Function }): boolean;
    get icon(): string;
    setTransform(name: string, level: number | null): void;
  }

  class NPCManager {
    core: MaplebirchCore;
    tool: tools;
    log: (message: string, level?: string, ...objects: any[]) => void;
    data: Map<string, { Data: NamedNPC; Config: NPCConfig }>;
    NamedNPC: typeof NamedNPC;
    Schedules: typeof NPCSchedules;
    pregnancy: { infertile: string[]; typesEnabled: string[]; canBePregnant: string[] };
    type: { loveInterestNpcs: string[]; importantNPCs: string[]; specialNPCs: string[] };
    romanceConditions: { [x: string]: (() => any)[] };
    NPCNameList: string[];
    customStats: Record<string, NPCStatConfig>;
    Sidebar: typeof NPCSidebar;
    Clothes: typeof NPCClothes;
    constructor(manager: any);
    add(npcData: NPCData, config?: NPCConfig, translationsData?: Record<string, any>): boolean;
    addStats(statsObject: Record<string, NPCStatConfig>): void;
    addClothes(...configs: NPCClothesConfig[]): void;
    injectModNPCs(): void;
    vanillaNPCConfig(npcConfig: Record<string, any>): Record<string, any>;
    applyStatDefaults(statDefaults: Record<string, any>): Record<string, any>;
    _vanillaNPCInit(...args: any[]): void;
    NPCSpawn(...args: any[]): void;
    Init(): void;
    loadInit(): void;
    postInit(): void;
    addSchedule(npcName: string, scheduleConfig: ScheduleConfig, location: string | ((date: EnhancedDate) => string), options?: ScheduleOptions): Schedule;
    getSchedule(npcName: string): Schedule;
    updateSchedule(npcName: string, specialId: number, updates: Partial<ScheduleSpecial>): Schedule;
    removeSchedule(npcName: string, specialId: number): Schedule;
    checkSchedules(): Record<string, string>;
    clearSchedule(npcName: string): Schedule;
    clearAllSchedules(): void;
  }

  class NPCSchedules {
    static schedules: Map<string, Schedule>;
    static init(manager: NPCManager): boolean;
    static add(npcName: string, scheduleConfig: ScheduleConfig, location: string | ((date: EnhancedDate) => string) | ((date: EnhancedDate) => Schedule), id?: string | number, options?: ScheduleOptions): Schedule;
    static get(npcName: string): Schedule;
    static update(npcName: string, specialId: string | number, updates: ScheduleUpdateOptions): Schedule;
    static remove(npcName: string, specialId: string | number): Schedule;
    static clear(npcName: string): Schedule;
    static clearAll(): void;
    static npcList: string[];
    static location: Record<string, string>;
  }

  class Schedule {
    constructor();
    daily: string[];
    specials: ScheduleSpecial[];
    sortedSpecials: ScheduleSpecial[] | null;
    readonly location: string;
    
    at(scheduleConfig: [number, number] | number, location: string): this;
    when(condition: (date: EnhancedDate) => boolean, location: string | ((date: EnhancedDate) => string) | ((date: EnhancedDate) => Schedule), id?: string | number, options?: ScheduleOptions): this;
    update(specialId: string | number, updates: ScheduleUpdateOptions): this;
    remove(specialId: string | number): this;
    resolveLocation(loc: string | ((date: EnhancedDate) => string) | ((date: EnhancedDate) => Schedule), date: DateTime): string;
    createEnhancedDate(date: DateTime): EnhancedDate;
    buildEnhancedDateProto(): EnhancedDateProto;
  }

  interface ScheduleSpecial { 
    id: string | number; 
    condition: (date: EnhancedDate) => boolean; 
    location: string | ((date: EnhancedDate) => string) | ((date: EnhancedDate) => Schedule); 
    before?: string | number; 
    after?: string | number; 
    insteadOf?: string | number; 
    override?: boolean; 
  }
  
  interface ScheduleOptions { 
    id?: string | number; 
    before?: string | number; 
    after?: string | number; 
    insteadOf?: string | number; 
    override?: boolean; 
  }
  
  interface ScheduleUpdateOptions {
    condition?: (date: EnhancedDate) => boolean;
    location?: string | ((date: EnhancedDate) => string) | ((date: EnhancedDate) => Schedule);
    before?: string | number;
    after?: string | number;
    insteadOf?: string | number;
    override?: boolean;
  }

  type ScheduleConfig = [number, number] | number | ((date: EnhancedDate) => boolean);

  interface EnhancedDate extends DateTime {
    readonly schedule: Schedule;
    isAt(time: [number, number] | number): boolean;
    isAfter(time: [number, number] | number): boolean;
    isBefore(time: [number, number] | number): boolean;
    isBetween(startTime: [number, number] | number, endTime: [number, number] | number): boolean;
    isHour(...hours: number[]): boolean;
    isHourBetween(start: number, end: number): boolean;
    isMinuteBetween(start: number, end: number): boolean;
    readonly schoolDay: boolean;
    readonly spring: boolean;
    readonly summer: boolean;
    readonly autumn: boolean;
    readonly winter: boolean;
    readonly dawn: boolean;
    readonly day: boolean;
    readonly dusk: boolean;
    readonly night: boolean;
    readonly weekEnd: boolean;
    [key: string]: any;
  }

  interface EnhancedDateProto {
    isAt(time: [number, number] | number): boolean;
    isAfter(time: [number, number] | number): boolean;
    isBefore(time: [number, number] | number): boolean;
    isBetween(startTime: [number, number] | number, endTime: [number, number] | number): boolean;
    isHour(...hours: number[]): boolean;
    isHourBetween(start: number, end: number): boolean;
    isMinuteBetween(start: number, end: number): boolean;
    readonly schoolDay: boolean;
    readonly spring: boolean;
    readonly summer: boolean;
    readonly autumn: boolean;
    readonly winter: boolean;
    readonly dawn: boolean;
    readonly day: boolean;
    readonly dusk: boolean;
    readonly night: boolean;
    readonly weekEnd: boolean;
  }

  class NPCClothes {
    static log: (msg: string, level?: string) => void;
    manager: NPCManager;
    clothes: Array<object>;
    static layers: Map<string,any>;
    constructor(manager?: NPCManager);
    static add(...configs: NPCClothesConfig[]): void;
    static init(manager: { log: (msg: string, level?: string) => void }): void;
    static import(modeName:string, modZip:JSZip, filePaths:string|string[]): Promise<string[]>;
    static load(modName?:string, filePath?:string): Promise<void>;
  }

  interface NPCData {
    nam: string;
    title?: string;
    gender?: 'm'|'f'|'h'|'n'|'t';
    type?: string;
    adult?: number;
    teen?: number;
    insecurity?: string;
    chastity?: { penis: string; vagina: string; anus: string };
    virginity?: Record<string, boolean>;
    eyeColour?: string;
    hairColour?: string;
    pronoun?: string;
    penissize?: number;
    breastsize?: number;
    ballssize?: number;
    bottomsize?: number;
    penisdesc?: string;
    breastdesc?: string;
    outfits?: string[];
    pregnancy?: any;
    skincolour?: number;
    init?: number;
    intro?: number;
    description?: string;
    [key: string]: any;
  }

  interface NPCConfig { love?: { maxValue: number }; loveAlias?: [string, string] | (() => string); important?: boolean | (() => boolean); special?: boolean | (() => boolean); loveInterest?: boolean | (() => boolean); [key: string]: any }
  interface NPCStatConfig { position?: number | 'first' | 'last' | 'secondLast' | false; [key: string]: any }

  interface NPCClothesConfig {
    name: string;
    type?: string;
    gender?: 'm' | 'f' | 'n';
    outfit?: number;
    upper: string | { name: string; integrity_max?: number; word?: 'a' | 'n'; action?: string; desc?: string };
    lower: string | { name: string; integrity_max?: number; word?: 'a' | 'n'; action?: string; desc?: string };
    desc?: string;
  }

  class NamedNPC {
    nam: string;
    gender: 'm'|'f'|'h'|'n';
    title: string;
    description: string;
    type: string;
    adult: number;
    teen: number;
    insecurity: string;
    chastity: { penis: string; vagina: string; anus: string };
    virginity: Record<string, boolean>;
    eyeColour: string;
    hairColour: string;
    pronoun: 'm'|'f'|'i'|'n'|'t';
    penissize: number;
    breastsize: number;
    ballssize: number;
    bottomsize: number;
    penisdesc: string;
    breastdesc: string;
    outfits: string[];
    pregnancy: any;
    skincolour: number;
    init: number;
    intro: number;
    pronouns: Record<string, string>;
    static add: (manager: any, npcData: NPCData, config?: NPCConfig, translationsData?: Record<string, any>) => boolean;
    static get: (manager: any) => NPCData[];
    static clear: (manager: any) => boolean;
    static update: (manager: any) => boolean;
    static setup: (manager: any) => void;
  }

  class NPCSidebar { 
    init(force?: boolean): void; 
    static display: Set;
    static loadFromMod: (modZip:JSZip, npcNames:string) => string[];
  }

  class CombatManager {
    constructor(core: MaplebirchCore);
    log: (msg: string, level?: string, ...objs: any[]) => void;
    Reaction: {
      Triggers: { herm: Array<{ npc: string; cond: Function; action: Function }>; crossdress: Array<{ npc: string; cond: Function; action: Function }> };
      HermNameList: string[];
      CDNameList: string[];
      reg: (type: 'herm'|'crossdress', npc: string, cond: Function, action: Function) => void;
      regReaction: (type:'herm'|'crossdress', npc: string, config: any) => void;
      check: (type: 'herm'|'crossdress') => string;
      init: () => void;
    };
    CombatAction: {
      actions: Map<string, { actionType: string; cond: any; display: any; value: any; color?: string; difficulty?: string; combatType?: string; order?: number }>;
      reg: (...actionConfigs: Array<{ id: string; actionType: string; cond: any; display: any; value: any; color?: string; difficulty?: string; combatType?: string; order?: number }>) => any;
      _eval: (fnOrValue: Function | any, ctx: any) => any;
      action: (optionsTable: { [key: string]: any }, actionType: string, combatType: string) => { [key: string]: any };
      color: (action: string, encounterType: string) => string | null;
      difficulty: (action: string, combatType: string) => string | null;
    };
    Speech: {
      speechs: Map<string, Array<{ cond: Function; speech: string; cd: number; current: number }>>;
      reg: (npc: string, cond: Function, speech: string, cd: number) => void;
      output: (npc: string) => string;
      init: () => void;
    };
    _generateCombatAction: () => Function;
    _combatListColor: (name: any, value: any, type: string) => string;
    _combatButtonAdjustments: (name: string, extra: any) => string;
    ejaculation: (index: number, ...args: string[]) => string;
    Init: () => void;
  }

  class ShopManager {
    static categoryMap: { [key: string]: { icon: string; text: string; widget: string } };
    tool: any;
    log: (message: string, level?: string, ...objects: any[]) => void;
    widgets: string[];
    passages: Array<{ name: string; content: string }>;
    shopText: Record<string, string[]>;
    constructor();
    loadShopFromJson(modName: string, path: string): Promise<boolean>;
    regShop(shopName: string, clothesType: string[], type?: string[], content?: Record<string, any>, options?: Record<string, any>): void;
    #Text(shopName: string, type?: string[], content?: Record<string, any>): void;
    #processContentItem(item: any, output: any): void;
    #shopPassageCreate(shopName: string): string;
    #shopWidgetCreate(shopName: string, clothesType: string[], options?: Record<string, any>): string;
    #widgetInit(passageData: Map<string, any>): Promise<Map<string, any>>;
    #passageInit(passageData: Map<string, any>): Promise<Map<string, any>>;
    beforePatchModToGame(): Promise<void>;
    preInit(): void;
  }

  class Expansion {
    modhint: modhint;
    cheat: cheat;
  }

  const yaml: {
    load: (str: string) => any;
    loadAll: (str: string) => any[];
    dump: (obj: any, options?: any) => string;
    safeLoad: (str: string) => any;
    safeLoadAll: (str: string) => any[];
    safeDump: (obj: any, options?: any) => string;
    DEFAULT_FULL_SCHEMA: any;
    DEFAULT_SAFE_SCHEMA: any;
    JSON_SCHEMA: any;
    CORE_SCHEMA: any;
  };

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
    readonly startDate: DateTime;
    readonly tomorrow: DateTime;
    readonly yesterday: DateTime;
    readonly schoolTerm: boolean;
    readonly schoolDay: boolean;
    readonly schoolTime: boolean;
    readonly dayState: 'night' | 'dusk' | 'day' | 'dawn';
    readonly nextSchoolTermStartDate: DateTime;
    readonly nextSchoolTermEndDate: DateTime;
    readonly lastDayOfMonth: number;
    readonly dayOfYear: number;
    readonly secondsSinceMidnight: number;
    readonly currentMoonPhase: string;
    readonly moonPhases: Record<string, { start: number; end: number; description: string; endAlt?: number }>;
    readonly daysOfWeek: string[];
    set(time: number | DateTime): void;
    setDate(date: DateTime): void;
    setTime(hour: number, minute?: number): void;
    setTimeRelative(hour: number, minute?: number): void;
    pass(seconds: number): void;
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
    readonly monthNames: string[];
  };
  const Weather: { rain: boolean; thunder: boolean; snow: boolean; cloud: boolean; windy: boolean; fog: boolean; [key: string]: any };
  const Dynamic: { [key: string]: any };
  const TimeConstants: { standardYearMonths: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; leapYearMonths: [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; secondsPerDay: 86400; secondsPerHour: 3600; secondsPerMinute: 60; synodicMonth: 29.530588 };

  const $: JQueryStatic;
  const jQuery: JQueryStatic;
  interface JQueryStatic {
    (selector: string, context?: Element | Document | JQuery): JQuery;
    (element: Element | Document | Window): JQuery;
    (html: string, ownerDocument?: Document): JQuery;
    (callback: (this: Document, $: JQueryStatic) => void): JQuery;
    (arrayLike: ArrayLike<Element>): JQuery;
    (): JQuery;
    ajax?: any;
    get?: any;
    post?: any;
    wiki(wikitext: string, ...args: any[]): JQuery;
    wiki(executor: (fragment: DocumentFragment) => void): JQuery;
    wiki(element: HTMLElement, wikitext: string, ...args: any[]): HTMLElement;
    wiki(element: DocumentFragment, wikitext: string, ...args: any[]): DocumentFragment;
  }

  interface JQuery {
    html(): string;
    html(htmlString: string | ((index: number, oldhtml: string) => string)): this;
    text(): string;
    text(textString: string | ((index: number, text: string) => string)): this;
    val(): any;
    val(value: any | ((index: number, value: any) => any)): this;
    addClass(className: string | ((index: number, currentClassName: string) => string)): this;
    removeClass(className?: string | ((index: number, className: string) => string)): this;
    toggleClass(className: string, state?: boolean): this;
    hasClass(className: string): boolean;
    css(propertyName: string): string;
    css(propertyName: string, value: string | number): this;
    css(properties: Record<string, string | number>): this;
    on(events: string, handler: (event: JQueryEventObject, ...args: any[]) => void): this;
    on(events: string, selector: string, handler: (event: JQueryEventObject, ...args: any[]) => void): this;
    on(events: string, data: any, handler: (event: JQueryEventObject, ...args: any[]) => void): this;
    on(events: string, selector: string, data: any, handler: (event: JQueryEventObject, ...args: any[]) => void): this;
    off(events?: string, selector?: string, handler?: Function): this;
    click(handler?: (event: JQueryEventObject) => void): this;
    trigger(eventType: string, extraParameters?: any[] | object): this;
    find(selector: string): JQuery;
    children(selector?: string): JQuery;
    parent(selector?: string): JQuery;
    parents(selector?: string): JQuery;
    closest(selector: string): JQuery;
    next(selector?: string): JQuery;
    prev(selector?: string): JQuery;
    siblings(selector?: string): JQuery;
    append(content: string | JQuery | Element | ArrayLike<Element>): this;
    prepend(content: string | JQuery | Element | ArrayLike<Element>): this;
    before(content: string | JQuery | Element | ArrayLike<Element>): this;
    after(content: string | JQuery | Element | ArrayLike<Element>): this;
    remove(): this;
    empty(): this;
    replaceWith(newContent: string | JQuery | Element): this;
    attr(attributeName: string): string;
    attr(attributeName: string, value: string | number | boolean): this;
    removeAttr(attributeName: string): this;
    prop(propertyName: string): any;
    prop(propertyName: string, value: any): this;
    data(key: string, value: any): this;
    data(key: string): any;
    removeData(name?: string): this;
    show(): this;
    hide(): this;
    toggle(display?: boolean): this;
    animate(properties: object, duration?: number | string, easing?: string, complete?: Function): this;
    fadeIn(duration?: number | string, complete?: Function): this;
    fadeOut(duration?: number | string, complete?: Function): this;
    slideUp(duration?: number | string, complete?: Function): this;
    slideDown(duration?: number | string, complete?: Function): this;
    each(callback: (index: number, element: Element) => void | false): this;
    map(callback: (index: number, element: Element) => any): JQuery;
    get(): Element[];
    get(index: number): Element;
    index(selector?: string | JQuery | Element): number;
    is(selector: string | JQuery | Element | ((index: number, element: Element) => boolean)): boolean;
    length: number;
    [index: number]: Element;
    [key: string]: any;
  }

  interface JQueryEventObject extends Event {
    data?: any;
    result?: any;
    currentTarget: Element;
    delegateTarget: Element;
    metaKey: boolean;
    pageX: number;
    pageY: number;
    preventDefault(): void;
    stopPropagation(): void;
    stopImmediatePropagation(): void;
    target: Element;
    timeStamp: number;
    type: string;
    which: number;
    originalEvent: Event;
  }

  function ordinalSuffixOf(i: number): number;
  function wikifier(widget: any, ...args: any[]): any;
  function drawCondition(): boolean;
  const ColourUtils: any;
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

  const Renderer: { CanvasModels: { main: any }; [key: string]: any };
  const StartConfig: { debug: boolean; enableImages: boolean; enableLinkNumberify: boolean; version: string; versionName: string; sneaky: boolean; socialMediaEnabled: boolean; sourceLinkEnabled: boolean };
  const modSC2DataManager: any;
  const modUtils: any;
  const addonBeautySelectorAddon: any;
  const addonTweeReplacer: any;
  const addonReplacePatcher: any;
  function lanSwitch(text: any): string;
  function lanSwitch(english: string, chinese: string, ...args: any[]): string;
  function lanSwitch(options: { EN: string; CN: string; [key: string]: string }): string;
  const playerNormalPregnancyType: () => string;
  function between(x: any, min: number, max: number): boolean;
  function getRobinLocation(): string;
  function sydneySchedule(): void;
  const combatActionColours: CombatActionColours;
  interface CombatActionColours { [category: string]: { [attitude: string]: string[] } }
  let combatListColor: (name: any, value: any, type?: any) => any;
  function hasSexStat(input: string, required: number, modifiers?: boolean): boolean;
  let isPossibleLoveInterest: (name: string) => boolean;
  const ZIndices: { [key: string]: number };
  function clothesIndex(slot:string, itemToIndex:object): number;
  function integrityKeyword(worn:object, slot:string): string;
  function getKylarLocation(): {area:string,state:string};
}

export {};