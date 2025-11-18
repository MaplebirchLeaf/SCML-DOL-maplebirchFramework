// maplebirch.d.ts
declare global {
  interface Window {
    maplebirch: MaplebirchCore;
    jsyaml: any;
    modSC2DataManager: any;
    modUtils: any;
    addonBeautySelectorAddon: any;
    addonTweeReplacer: any;
    addonReplacePatcher: any;
    DateTime: new () => any;
    getFormattedDate: any;
    getShortFormattedDate: any;
  }

  class MaplebirchCore {
    meta: {
      state: number;
      coreModules: string[];
      initializedAt: string;
    };
    modList: string[];
    logger: Logger;
    lang: LanguageManager;
    events: EventEmitter;
    modules: ModuleManager;
    modLoader: any;
    modUtils: any;
    SugarCube: {
      Macro: {
        add(name: string, definition: any): void;
        delete(name: string): void;
        get(name: string): any;
        has(name: string): boolean;
        [key: string]: any;
      };
      Wikifier: new (...args: any[]) => any;
      Engine: {
        go(): any;
        show(): void;
        play(title: string, noHistory: boolean): void;
      };
      Save: {
        autosave: any;
        onSave: any;
        onLoad: any;
      };
      setup: any;
      State: any;
      Story: {
        title: string;
        get(title: string): any;
        has(title: string): boolean;
      }
      Config: any;
    };
    addonPlugin: any;
    onLoad: boolean;
    state: TimeStateManager;
    audio: AudioManager;
    tool: tools;
    var: variablesModule;
    npc: NPCManager;
    shop: ShopManager;

    constructor();

    log(msg: string, level?: string, ...objs: any[]): void;
    on(evt: string, handler: Function, desc?: string): boolean;
    off(evt: string, identifier: string | Function): boolean;
    once(evt: string, handler: Function, desc?: string): boolean;
    trigger(evt: string, ...args: any[]): void;
    register(name: string, module: any, dependencies?: string[]): Promise<boolean>;
    
    preInit(): Promise<void>;
    init(): Promise<void>;
    loadInit(): Promise<void>;
    postInit(): Promise<void>;
    
    t(key: string, space?: boolean): string;
    autoTranslate(text: string): string;
    
    setModLoader(modLoader: any, modUtils: any): void;
    
    set Language(lang: string);
    set LogLevel(level: string);
    set ExModCount(count: number);
    
    getModule(name: string): any;
    get Language(): string;
    get LogLevel(): string;
    get expectedModuleCount(): number;
    get registeredModuleCount(): number;
    get dependencyGraph(): any;
    get yaml(): any;

    static Manager: {
      Logger: typeof Logger;
      LanguageManager: typeof LanguageManager;
      EventEmitter: typeof EventEmitter;
      ModuleManager: typeof ModuleManager;
    };

    static constants: {
      ModuleState: typeof ModuleState;
      LogLevel: any;
    };

    static meta: {
      version: string;
      name: string;
      author: string;
      modifiedby: string;
      UpdateDate: string;
      availableLanguages: string[];
    };
  }

  class Logger {
    constructor(core: MaplebirchCore);
    
    log(message: string, levelName?: string | number, ...objects: any[]): void;
    
    set LevelName(levelName: string);
    get LevelName(): string;
    
    static LogConfig: any;
    static LogLevel: any;
  }

  class LanguageManager {
    constructor(core: MaplebirchCore);
    translations: Map<string,string>;
    
    setLanguage(lang: string): void;
    initDatabase(): Promise<void>;
    importAllLanguages(modName: string, languages?: string[]): Promise<boolean>;
    loadTranslations(modName: string, languageCode: string, filePath: string): Promise<boolean>;
    t(key: string, space?: boolean): string;
    autoTranslate(sourceText: string): string;
    preloadAllTranslations(): Promise<void>;
    clearDatabase(): Promise<void>;
    cleanOldVersions(): Promise<void>;
    
    get language(): string;
    
    static DEFAULT_LANGS: string[];
    static DEFAULT_IMPORT_CONCURRENCY: number;
    static DEFAULT_BATCH_SIZE: number;
    static DEFAULT_PRELOAD_YIELD: number;
  }

  class EventEmitter {
    constructor(core: MaplebirchCore);
    
    on(eventName: string, callback: Function, description?: string): boolean;
    off(eventName: string, identifier: Function | string): boolean;
    once(eventName: string, callback: Function, description?: string): boolean;
    trigger(eventName: string, ...args: any[]): void;
    
    static streamConfig: {
      batchSize: number;
      yieldInterval: number;
    };
  }

  class ModuleManager {
    constructor(core: MaplebirchCore);
    initPhase: {
      preInitCompleted: boolean;
      mainInitCompleted: boolean;
      loadInitExecuted: boolean;
      postInitExecuted: boolean;
      expectedModuleCount: number;
      registeredModuleCount: number;
      allModuleRegisteredTriggered: boolean;
    };
    
    register(name: string, module: any, dependencies?: string[]): Promise<boolean>;
    setExpectedModuleCount(count: number): void;
    getDependencyGraph(): any;
    preInit(): Promise<void>;
    init(): Promise<void>;
    loadInit(): Promise<void>;
    postInit(): Promise<void>;
    
    static streamConfig: {
      batchSize: number;
      yieldInterval: number;
    };
  }

  class TimeStateManager {
    logger: Logger;
    log: (message: string, level?: string, ...objects: any[]) => void;
    TimeManager: TimeManager;
    StateManager: StateManager;
    passage: any;
    savedata: any;
    solarEclipse: any;
    
    constructor();
    
    receiveVariables(variables: { saveId?: number | string }): void;
    get Passage(): any;
    get modifyWeather(): any;
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

  interface DateTime {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    timeStamp: number;
    weekDay: number;
    monthName: string;
    monthCNName: string;
    moonPhaseFraction: number;
    fractionOfDay: number;
    fractionOfDayFromNoon: number;
    
    compareWith(other: DateTime, getSeconds?: boolean): any;
    addYears(years: number): DateTime;
    addMonths(months: number): DateTime;
    toTimestamp(year: number, month: number, day: number, hour: number, minute: number, second: number): void;
    fromTimestamp(timestamp: number): void;
  }

  function getFormattedDate(date: any, includeWeekday?: boolean): string;
  function getShortFormattedDate(date: any): string;
  function ordinalSuffixOf(i: number): string;

  class AudioManager {
    static ModAudioPlayer: typeof ModAudioPlayer;
    static arrayBufferToBase64(buffer: ArrayBuffer): string;
    static base64ToArrayBuffer(base64: string): ArrayBuffer;
    
    audioContext: AudioContext | null;
    audioBuffers: Map<string, AudioBuffer>;
    modPlayers: Map<string, ModAudioPlayer>;
    
    constructor();
    
    initAudioContext(): void;
    initStorage(): void;
    #saveToStorage(key: string, arrayBuffer: ArrayBuffer): void;
    loadAudio(key: string, arrayBuffer: ArrayBuffer): Promise<boolean>;
    importAllAudio(modName: string, audioFolder?: string): Promise<boolean>;
    addAudioFromFile(file: File, modName?: string): Promise<boolean>;
    getPlayer(modName: string): ModAudioPlayer | null;
    getModAudioKeys(modName: string): string[];
    get allAudioKeys(): string[];
    
    Init(): void;
    loadInit(): void;
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
    
    constructor(audioManager: AudioManager, modName: string);
    
    initGainNode(): void;
    play(key: string, options?: {
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
    }): any | null;
    stop(key: string): void;
    stopAll(): void;
    setVolume(volume: number): void;
    setVolumeFor(key: string, volume: number): void;
    togglePause(key: string): { status: string; offset?: number; audioSource?: any };
    isPlaying(): string[];
    get audioKeys(): string[];
    getDuration(key: string): number;
    setLoopCount(key: string, count: number): void;
  }

  class tools {
    migration: migrationSystem;
    rand: randomSystem;
    widget: widgetSystem;
    text: textSystem;
    framework: frameworks;
    linkzone: typeof applyLinkZone;
    other: othersSystem;
    
    modhint: modhintSystem;
    console: consoleTools;

    clone: typeof clone;
    merge: typeof merge;
    equal: typeof equal;
    contains: typeof contains;
    SelectCase: typeof SelectCase;
    random: typeof random;
    either: typeof either;
    loadImage: typeof loadImageWithModLoader;
    convert: typeof convert;
    
    constructor();
    
    createLog(prefix: string): (message: string, level?: string, ...objects: any[]) => void;
    preInit(): Promise<void>;
    Init(): void;
    postInit(): void;
    
    static proto: {
      modhit: typeof modhintSystem;
      console: typeof consoleTools;
      migration?: typeof migrationSystem;
      rand?: typeof randomSystem;
      widget?: typeof widgetSystem;
      text?: typeof textSystem;
      framework?: typeof frameworks;
      other?: typeof othersSystem;
    };
  }

  class migrationSystem {
    constructor(logger: (message: string, level?: string, ...objects: any[]) => void);
    create(): MigrationInstance;
  }

  interface MigrationInstance {
    add(fromVersion: string, toVersion: string, migrationFn: (data: any, utils: MigrationUtils) => void): void;
    run(data: any, targetVersion: string): void;
    utils: MigrationUtils;
    migrations: any[];
  }

  interface MigrationUtils {
    resolvePath(obj: any, path: string, createIfMissing?: boolean): { parent: any; key: string } | null;
    rename: (data: any, oldPath: string, newPath: string) => boolean;
    move: (data: any, oldPath: string, newPath: string) => boolean;
    remove: (data: any, path: string) => boolean;
    transform: (data: any, path: string, transformer: (value: any) => any) => boolean;
    fill: (target: any, defaults: any, options?: { arrayBehaviour?: string }) => void;
  }

  class randomSystem {
    constructor(logger: (message: string, level?: string, ...objects: any[]) => void);
    
    get(options?: number | any[] | { min?: number; max?: number; float?: boolean }): number;
    set Seed(newSeed: number);
    get Seed(): number;
    get State(): RandomState;
    reset(): RandomState;
    debug(): string;
  }

  interface RandomState {
    seed: number;
    callCount: number;
    nextSeed: number | null;
    history: RandomHistoryEntry[];
  }

  interface RandomHistoryEntry {
    call: number;
    value: number;
    seed: number;
    options: any;
  }

  class widgetSystem {
    constructor(logger: (message: string, level?: string, ...objects: any[]) => void);
    
    _getMacro(data: any): boolean;
    defineMacro(macroName: string, macroFunction: Function, tags?: any[], skipArgs?: boolean, isAsync?: boolean): void;
    defineMacroS(macroName: string, macroFunction: Function, tags?: any, skipArgs?: boolean, maintainContext?: boolean): void;
    statChange(statType: string, amount: number, colorClass: string, condition?: () => boolean): DocumentFragment;
    create(name: string, fn: Function): void;
    callStatFunction(name: string, ...args: any[]): DocumentFragment;
  }

  class textSystem {
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
    patchPassage(passage: any, title: string): Promise<any>;
    widgetInit(passageData: any): Promise<any>;
    afterPatchModToGame(): Promise<void>;
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

  class LinkZoneManager {
    constructor(containerId?: string, linkSelector?: string, logger?: any);
    
    detectLinks(): LinkDetectionResult | null;
    applyZones(config: LinkZoneConfig): boolean;
  }

  interface LinkDetectionResult {
    firstLink: Element;
    lastLink: Element;
    totalLinks: number;
    lineBreakBeforeFirstLink: Node | null;
  }

  interface LinkZoneConfig {
    containerId: string;
    linkSelector: string;
    beforeMacro: () => any;
    afterMacro: () => any;
    customMacro: () => any;
    zoneStyle: any;
    onBeforeApply?: () => void;
    onAfterApply?: (result: boolean, config: LinkZoneConfig) => void;
    debug: boolean;
  }

  class othersSystem {
    constructor(logger: (message: string, level?: string, ...objects: any[]) => void);
    
    static traitCategories: { [key: string]: string };
    static getTraitCategory(englishName: string): string;
    
    traitsTitle: string[];
    traitsData: any[];
    locationUpdates: any;
    
    addTraits(...data: any[]): void;
    initTraits(data: any): boolean;
    configureLocation(locationId: string, config: any, options?: { overwrite?: boolean; layer?: string; element?: string }): boolean;
    applyLocationUpdates(): boolean;
  }

  class modhintSystem {
    constructor(logger: (message: string, level?: string, ...objects: any[]) => void);
    
    hintClicked(): void;
    searchButtonClicked(): void;
    clearButtonClicked(): void;
  }

  class consoleTools {
    constructor(logger: (message: string, level?: string, ...objects: any[]) => void, allowedObjects?: string[]);
    
    enableFullAccess(): boolean;
    disableFullAccess(): boolean;
    allowObject(objectName: string): boolean;
    disallowObject(objectName: string): boolean;
    setAllowedObjects(objects: string[]): boolean;
    execute(type: 'javascript' | 'twine'): { success: boolean; error?: string; message?: string; result?: any };
  }

  const applyLinkZone: {
    apply(userConfig?: any): boolean;
    manager: typeof LinkZoneManager;
    addContentToZones(config: any): void;
    defaultConfig: any;
    removeZones(): void;
  };

  class NPCManager {
    add(npcData: object, config: object, translationsData: object): void;
    addStats(statsObject: object): void;
    addClothes(...configs: object[]): void;
    injectModNPCs(): void;
    vanillaNPCConfig(npcConfig: object): object;
    applyStatDefaults(statDefaults: object): object;
    Sidebar: NPCSidebar
  }

  class NPCSidebar {
    display: object;
  }

  class ShopManager {
    static categoryMap: {
      [key: string]: {
        icon: string;
        text: string;
        widget: string;
      };
    };

    tool: any; // 根据实际使用情况，可以更具体地定义类型
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
  
  const SugarCube: {
    Macro: {
      add(name: string, definition: any): void;
      delete(name: string): void;
      get(name: string): any;
      has(name: string): boolean;
      [key: string]: any;
    };
    Wikifier: new (...args: any[]) => any;
    Engine: {
      go(): any;
      show(): void;
      play(title: string, noHistory: boolean): void;
    };
    Save: {
      autosave: any;
      onSave: any;
      onLoad: any;
    };
    setup: any;
    State: any;
    Story: {
      title: string;
      get(title: string): any;
      has(title: string): boolean;
    }
    Config: any;
  };
  
  const setup: any;
  const Macro: {
    add(name: string, definition: any): void;
    delete(name: string): void;
    get(name: string): any;
    has(name: string): boolean;
    [key: string]: any;
  };
  const Engine: {
    States: object;
    go(): any;
    show(): void;
    play(title: string, noHistory: boolean): void;
  };
  const Story: {
    title: string;
    get(title: string): any;
    has(title: string): boolean;
  }
  const State: {
    variables: any;
    temporary: any;
    active: any;
    passage: any;
    title: string;
    [key: string]: any;
  };
  const Config: any;
  const Wikifier: new (destination:any, source:string, options:Object|undefined, passageObj:Object|undefined, passageTitle:string|undefined) => any;
  const V: any;
  const T: any;
  const Time: {
    date: {
      year: number;
      month: number;
      day: number;
      hour: number;
      minute: number;
      second: number;
    }
    monthNames: any;
    moonPhases: string[];
    daysOfWeek: string[];
    pass: any;
  };
  const Weather: any;
  const Dynamic: any;
  const TimeConstants: any;
  
  const $: JQueryStatic;
  
  interface JQueryStatic {
    (selector: string, context?: Element | JQuery): JQuery;
    (element: Element): JQuery;
    (object: any): JQuery;
    (func: Function): JQuery;
    (array: any[]): JQuery;
    (): JQuery;
    ajax?: any;
    get?: any;
    post?: any;
  }
  
  interface JQuery {
    html(): string;
    html(htmlString: string): this;
    text(): string;
    text(textString: string): this;
    val(): any;
    val(value: any): this;
    
    addClass(className: string): this;
    removeClass(className?: string): this;
    
    css(propertyName: string): string;
    css(propertyName: string, value: string|number): this;
    
    on(event: string, handler: Function): this;
    off(event: string, handler?: Function): this;
    click(handler: Function): this;
    
    [key: string]: any;
  }
  
  class DateTime {
    constructor(...any:any);
    addDays: any;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  } 

  function ordinalSuffixOf(i:number): number;
  function wikifier(widget: any, ...args: any[]): any;
  function drawCondition(): boolean;

  const ColourUtils: any;

  function clone(source: any, options?: CloneOptions, map?: WeakMap<any, any>): any;
  function merge(target: any, ...sources: any[]): any;
  function equal(a: any, b: any): boolean;
  function contains(arr: any[], value: any, options?: ContainsOptions): boolean;
  function random(min?: any, max?: any, float?: boolean): number;
  function either(itemsOrA: any, ...rest: any[]): any;
  function loadImageWithModLoader(src: string): Promise<string>;
  function convert(str: string, mode?: string, options?: ConvertOptions): string;

  interface CloneOptions {
    deep?: boolean;
    preservePrototype?: boolean;
  }

  interface ContainsOptions {
    mode?: 'any' | 'all' | 'none';
    caseSensitive?: boolean;
    comparator?: (item: any, value: any) => boolean;
    deepEqual?: boolean;
  }

  interface ConvertOptions {
    delimiter?: string;
    preserveAcronyms?: boolean;
  }

  class SelectCase {
    constructor();
    
    case(condition: any, result: any): SelectCase;
    casePredicate(fn: (input: any, meta: any) => boolean, result: any): SelectCase;
    caseRange(min: number, max: number, result: any): SelectCase;
    caseIn(values: any[], result: any): SelectCase;
    caseIncludes(substrings: string | string[], result: any): SelectCase;
    caseRegex(regex: RegExp, result: any): SelectCase;
    caseCompare(comparator: string, value: number, result: any): SelectCase;
    else(result: any): SelectCase;
    match(input: any, meta?: any): any;
  }

  const Renderer: {
    CanvasModels: object;
  }
}

export {};