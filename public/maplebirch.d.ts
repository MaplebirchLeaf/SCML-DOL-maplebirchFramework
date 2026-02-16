import { Howl as Howl$1, Howler } from 'howler';
import jsyaml$1 from 'js-yaml';
import * as lodash from 'lodash-es';
import { SugarCubeObject } from 'twine-sugarcube';
import { TweeReplacer } from '@scml/mod-twee-replacer/TweeReplacer';

declare class AddonPlugin {
  readonly core: MaplebirchCore;
  readonly addonTweeReplacer: TweeReplacer;
  readonly addonReplacePatcher: any;
  replace: (content: string, replacements: (string | RegExp)[][]) => string;
  readonly gSC2DataManager: any;
  readonly gModUtils: any;
  info: Map<
    string,
    {
      addonName: string;
      mod: ModInfo;
      modZip: any;
    }
  >;
  readonly log: ReturnType<typeof createlog>;
  nowModName: string;
  supportedConfigs: string[];
  queue: {
    [key: string]: any[];
  };
  processed: {
    [key: string]: boolean;
  };
  jsFiles: FileItem[];
  moduleFiles: FileItem[];
  constructor(core: MaplebirchCore, addonTweeReplacer: TweeReplacer, addonReplacePatcher: any);
  registerMod(addonName: string, modInfo: ModInfo, modZip: any): Promise<void>;
  InjectEarlyLoad_start(_modName: string, _fileName: string): Promise<void>;
  ModLoaderLoadEnd(): Promise<void>;
  afterInjectEarlyLoad(): Promise<void>;
  afterRegisterMod2Addon(): Promise<void>;
  beforePatchModToGame(): Promise<void>;
  afterPatchModToGame(): Promise<void>;
  private _dataReplace;
  private _loadFilesArray;
  scriptFiles(): Promise<void>;
  private _executeScripts;
  private _processInit;
}
declare class AudioManager {
  readonly core: MaplebirchCore;
  readonly log: ReturnType<typeof createlog>;
  private readonly playlists;
  private activePlaylist;
  private currentTrack;
  private currentHowl;
  private state;
  private volume;
  private muted;
  private autoNext;
  private cache;
  private maxCache;
  private progressTimer;
  private events;
  constructor(core: MaplebirchCore);
  private initDB;
  private handleAudioEvent;
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): boolean;
  once(event: string, handler: Function): void;
  private emit;
  private store;
  private get;
  private modKeys;
  private delete;
  modAudioClear(modName: string): Promise<boolean>;
  private loadTrack;
  private cacheAdd;
  play(track: Track): Promise<boolean>;
  pause(): boolean;
  resume(): boolean;
  stop(): boolean;
  togglePlayPause(): void;
  next(): Promise<boolean>;
  previous(): Promise<boolean>;
  seek(percent: number): boolean;
  seekTo(seconds: number): boolean;
  get Mute(): boolean;
  set Mute(mute: boolean);
  get Volume(): number;
  set Volume(vol: number);
  get currentTime(): number;
  get duration(): number;
  private startProgress;
  private stopProgress;
  private onEnd;
  modPlaylist(modName: string): Promise<Playlist>;
  modPlay(modName: string, key?: string): Promise<void>;
  set PlayMode(mode: PlayMode);
  set AutoNext(enabled: boolean);
  importAllAudio(modName: string, audioFolder?: string): Promise<boolean>;
  addAudioFromFile(file: File, modName?: string): Promise<boolean>;
  deleteAudio(key: string, modName: string): Promise<boolean>;
  modAudioClearAll(modName: string): Promise<boolean>;
  clearCache(): void;
  destroy(): void;
}
declare class Builder {
  parent: htmlTools;
  auto: (text: string) => string;
  fragment: DocumentFragment;
  context: Record<string, any>;
  constructor(parent: htmlTools, fragment: DocumentFragment, context?: Record<string, any>);
  text(content: string | null, style?: string): this;
  line(content: string | null, style?: string): this;
  wikify(content: string | null): this;
  raw(content: Node | string | null): this;
  box(content: Node | string | null, style?: string): this;
}
declare class Character {
  #private;
  readonly core: MaplebirchCore;
  readonly log: ReturnType<typeof createlog>;
  readonly mask: typeof mask;
  readonly faceStyleSrcFn: typeof faceStyleSrcFn;
  readonly faceStyleMap: Map<string, string[]>;
  readonly handlers: {
    [x: string]: any;
  };
  layers: object;
  readonly transformation: Transformation;
  constructor(core: MaplebirchCore);
  get ZIndices(): {
    [key: string]: number;
  };
  modifyPCModel(manager: AddonPlugin): Promise<void>;
  use(...args: any): this;
  process(type: 'pre' | 'post', options: any): void;
  modifyFaceStyle(manager: AddonPlugin): Promise<void>;
  faceStyleImagePaths(): Promise<void>;
  private _faceStyleSetupOption;
  render(): Promise<void>;
  preInit(): void;
  Init(): void;
  loadInit(): void;
}
declare class CombatManager {
  readonly core: MaplebirchCore;
  readonly log: ReturnType<typeof createlog>;
  readonly Reaction: typeof Reaction;
  readonly CombatAction: typeof CombatAction;
  readonly Speech: typeof Speech;
  private readonly _;
  constructor(core: MaplebirchCore);
  _generateCombatAction(): () => void;
  _combatListColor(name: string | number, value: any, type: string): any;
  _combatButtonAdjustments(name: string, extra: any): string;
  ejaculation(index: string | number, ...args: string[]): string | false;
  Init(): void;
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
  trigger(type: 'interrupt' | 'overlay'): string;
  get StateEvents(): any;
  regWeatherEvent(eventId: string, options: WeatherEventOptions): boolean;
  delWeatherEvent(eventId: string): boolean;
  addWeather(data: WeatherException | WeatherTypeConfig): boolean | void;
  preInit(): Promise<void>;
}
declare class EventEmitter {
  readonly core: MaplebirchCore;
  private readonly events;
  private readonly afters;
  constructor(core: MaplebirchCore);
  on(eventName: string, callback: EventCallback, description?: string): boolean;
  off(eventName: string, identifier: EventCallback | string): boolean;
  once(eventName: string, callback: EventCallback, description?: string): boolean;
  trigger(eventName: string, ...args: any[]): Promise<void>;
  after(eventName: string, callback: EventCallback): void;
}
declare class GUIControl {
  readonly core: MaplebirchCore;
  enabledModules: ModuleInfo[];
  disabledModules: ModuleInfo[];
  enabledScripts: string[];
  disabledScripts: string[];
  private modSubUiAngularJsService;
  constructor(core: MaplebirchCore);
  initDB(): Promise<void>;
  init(): Promise<void>;
  canToggleModule(action: 'enable' | 'disable', moduleName: string, Extension: ExtensionSettings): boolean;
  cascadeModules(action: 'enable' | 'disable', moduleName: string, Extension: ExtensionSettings): string[];
  get moduleList(): string;
  private whenCreate;
}
declare class IndexedDBService {
  readonly core: MaplebirchCore;
  static DATABASE_NAME: string;
  static DATABASE_VERSION: number;
  private db;
  private ready;
  private stores;
  constructor(core: MaplebirchCore);
  register(
    name: string,
    options?: IDBObjectStoreParameters,
    indexes?: Array<{
      name: string;
      keyPath: string | string[];
      options?: IDBIndexParameters;
    }>
  ): void;
  init(): Promise<void>;
  private createStores;
  private checkStore;
  withTransaction<T>(storeNames: string | string[], mode: IDBTransactionMode, callback: (tx: any) => Promise<T>): Promise<T>;
  clearStore(storeName: string): Promise<void>;
  deleteDatabase(): Promise<boolean>;
  resetDatabase(): Promise<void>;
}
declare class LanguageManager {
  readonly core: MaplebirchCore;
  static readonly DEFAULT_LANGS: readonly LanguageCode[];
  static readonly BATCH_SIZE = 500;
  language: LanguageCode;
  translations: Map<string, Translation>;
  private cache;
  private preloaded;
  private fileHashes;
  constructor(core: MaplebirchCore);
  detectLang(): Promise<void>;
  initDB(): void;
  setLanguage(lang: string): void;
  importAll(
    modName: string,
    langs?: readonly string[]
  ): AsyncGenerator<
    | {
        lang: string;
        type: string;
        progress: number;
        current: number;
        total: number;
        count?: undefined;
        error?: undefined;
      }
    | {
        lang: string;
        count: number;
        error: Error;
        type: string;
      },
    void,
    unknown
  >;
  load(
    modName: string,
    lang: string,
    path: string
  ): AsyncGenerator<
    | {
        lang: string;
        type: string;
        progress: number;
        current: number;
        total: number;
        count?: undefined;
        error?: undefined;
      }
    | {
        lang: string;
        count: number;
        error: any;
        type: string;
      },
    void,
    unknown
  >;
  private processStream;
  t(key: string, space?: boolean): string;
  auto(text: string): string;
  preload(): Promise<void>;
  clearDB(): Promise<void>;
  cleanOld(): Promise<void>;
  private parseFile;
  private computeHash;
  private getFileHash;
  private saveFileHash;
  private storeBatch;
  private retrySmall;
  private getKeysForMod;
  private cleanOldKeys;
  private loadFromDB;
  private findKeyAsync;
  private isCurrentLang;
}
declare class LinkZoneManager {
  firstLink: Element | null;
  lastLink: Element | null;
  allLinks: Element[];
  lineBreakBeforeFirstLink: ChildNode | null;
  containerId: string;
  linkSelector: string;
  readonly log: ReturnType<typeof createlog>;
  private readonly _;
  constructor(containerId: string, linkSelector: string, logger: typeof log);
  private _resetState;
  detectLinks(): {
    firstLink: Element;
    lastLink: Element;
    totalLinks: number;
    lineBreakBeforeFirstLink: Node | null;
  } | null;
  private _detectLineBreakBeforeFirstLink;
  private _isLineBreakNode;
  private _isElementVisible;
  private _createZoneElement;
  private _applyCustomLinkZone;
  applyZones(config: LinkZoneConfig): boolean;
  private _applyBeforeLinkZone;
  private _applyAfterLinkZone;
}
declare class Logger {
  readonly core: MaplebirchCore;
  private static readonly LogConfig;
  private static readonly LogLevel;
  private level;
  constructor(core: MaplebirchCore);
  fromIDB(): Promise<void>;
  log(message: string, levelName?: string | number, ...objects: any[]): void;
  set LevelName(levelName: string);
  get LevelName(): string;
}
declare class MaplebirchCore {
  static meta: {
    name: 'maplebirch Frameworks';
    author: '\u6953\u6A3A\u8449';
    version: any;
    modifiedby: string;
    updateDate: string;
    Languages: readonly ['EN', 'CN'];
    early: readonly ['addon', 'dynamic', 'tool'];
    core: readonly ['addon', 'dynamic', 'tool', 'audio', 'var', 'char', 'npc', 'combat'];
  };
  readonly meta: typeof MaplebirchCore.meta;
  modList: string[];
  readonly manager: {
    modSC2DataManager: any;
    modLoaderGui: any;
  };
  passage: any;
  onLoad: boolean;
  readonly lodash: typeof lodash;
  readonly yaml: typeof jsyaml$1;
  readonly howler: {
    Howl: typeof Howl$1;
    Howler: typeof Howler;
  };
  readonly logger: Logger;
  readonly tracer: EventEmitter;
  readonly idb: IndexedDBService;
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
  constructor(modSC2DataManager: any, modLoaderGui: any);
  log(msg: string, level?: string, ...objs: any[]): void;
  on(eventName: string, callback: (...args: any[]) => any, description?: string): boolean;
  off(eventName: string, identifier: string | ((...args: any[]) => any)): boolean;
  once(eventName: string, callback: (...args: any[]) => any, description?: string): boolean;
  after(eventName: string, callback: (...args: any[]) => any): void;
  trigger(evt: string, ...args: any[]): Promise<void>;
  register(name: string, module: any, dependencies?: string[], source?: string): Promise<boolean>;
  pre(): Promise<void>;
  init(): Promise<void>;
  load(): Promise<void>;
  post(): Promise<void>;
  t(key: string, space?: boolean): string;
  auto(text: string): string;
  disabled(modName: string): Promise<boolean>;
  set SugarCube(parts: SugarCubeObject);
  get SugarCube(): SugarCubeObject;
  set Language(lang: string);
  get Language(): string;
  set LogLevel(level: string);
  get LogLevel(): string;
  set ExModCount(count: number);
  getModule(name: string): any;
  get expected(): number;
  get registered(): number;
  get dependencyGraph(): any;
  get modLoader(): any;
  get modUtils(): any;
  get gameVersion(): string;
}
declare class ModuleSystem {
  readonly core: MaplebirchCore;
  readonly registry: Registry;
  readonly initPhase: InitPhase;
  private preInitialized;
  private waitingResolvers;
  private depthMemo;
  private circularCheckCache;
  constructor(core: MaplebirchCore);
  register(name: string, module: any, dependencies?: string[], source?: string): Promise<boolean>;
  private logModuleRegistration;
  private registerExtension;
  private handleEarlyMount;
  private scheduleEarlyMountCheck;
  private collectAllDependencies;
  private storeModuleRegistration;
  private processWaitingQueue;
  set ExpectedModuleCount(count: number);
  get dependencyGraph(): any;
  preInit(): Promise<void>;
  init(): Promise<void>;
  loadInit(): Promise<void>;
  postInit(): Promise<void>;
  private checkModuleRegistration;
  private waitForModule;
  private resolveWaiters;
  private checkDependencies;
  private addToWaitingQueue;
  private initAllModules;
  private initModule;
  private executeModuleInit;
  private handlePreInitComplete;
  private executePhaseInit;
  private getTopologicalOrder;
  private hasCircularDependency;
  private detectCircularDependency;
  private getModuleDepth;
}
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
  add(npcData: NPCData, config: NPCConfig, translationsData: Map<string, Translation>): boolean;
  addSchedule(
    npcName: string,
    scheduleConfig: ScheduleTime | ScheduleCondition,
    location: string | ScheduleLocation,
    id?: string | number,
    options?: Partial<Omit<SpecialSchedule, 'condition' | 'location'>>
  ): {
    daily: string[];
    specials: SpecialSchedule[];
    sortedSpecials: SpecialSchedule[] | null;
    at(scheduleConfig: ScheduleTime, location: string): any;
    when(condition: ScheduleCondition, location: ScheduleLocation, id?: string | number, options?: Partial<Omit<SpecialSchedule, 'condition' | 'location'>>): any;
    update(specialId: string | number, updates: Partial<Omit<SpecialSchedule, 'id'>>): any;
    remove(specialId: string | number): any;
    sortSpecials(): void;
    topologicalSort(items: SpecialSchedule[]): SpecialSchedule[];
    get location(): string;
    resolveLocation(loc: ScheduleLocation, date: DateTime): string;
    createEnhancedDate(date: DateTime): EnhancedDate;
    buildEnhancedDateProto(): EnhancedDate;
  };
  addStats(statsObject: { [x: string]: any; hasOwnProperty: (arg0: string) => any }): void;
  addClothes(...configs: ClothesConfig[]): void;
  injectModNPCs(): void;
  vanillaNPCConfig(npcConfig: NPCConfig): any;
  applyStatDefaults(statDefaults: { [x: string]: any }): {
    [x: string]: any;
  };
  vanillaNPCInit(...args: any[]): void;
  preInit(): void;
  Init(): Promise<void>;
  loadInit(): void;
  postInit(): void;
}
declare class Playlist {
  readonly name: string;
  tracks: Track[];
  currentIndex: number;
  playMode: PlayMode;
  shuffleOrder: number[];
  shuffleIndex: number;
  constructor(name: string);
  add(track: Track | Track[]): void;
  remove(index: number): boolean;
  clear(): void;
  mode(mode: PlayMode): void;
  private _shuffleNow;
  next(): Track | null;
  previous(): Track | null;
  get length(): number;
}
declare class Schedule {
  daily: string[];
  specials: SpecialSchedule[];
  sortedSpecials: SpecialSchedule[] | null;
  at(scheduleConfig: ScheduleTime, location: string): this;
  when(condition: ScheduleCondition, location: ScheduleLocation, id?: string | number, options?: Partial<Omit<SpecialSchedule, 'condition' | 'location'>>): this;
  update(specialId: string | number, updates: Partial<Omit<SpecialSchedule, 'id'>>): this;
  remove(specialId: string | number): this;
  sortSpecials(): void;
  topologicalSort(items: SpecialSchedule[]): SpecialSchedule[];
  get location(): string;
  resolveLocation(loc: ScheduleLocation, date: DateTime): string;
  createEnhancedDate(date: DateTime): EnhancedDate;
  buildEnhancedDateProto(): EnhancedDate;
}
declare class SelectCase$1 {
  #private;
  private cases;
  private defaultResult;
  private valueType;
  private allowMixedTypes;
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
declare class StateManager {
  private readonly manager;
  private readonly stateEvents;
  private readonly log;
  constructor(manager: DynamicManager);
  trigger(type: 'interrupt' | 'overlay'): string;
  private _processInterruptEvents;
  private _processOverlayEvents;
  register(type: string, eventId: string, options: StateEventOptions): boolean;
  unregister(type: string, eventId: string): boolean;
  init(): void;
}
declare class TimeManager {
  private readonly manager;
  private static readonly moonPhases;
  private static readonly monthNames;
  private static readonly daysOfWeek;
  private readonly timeEvents;
  private sortedEventsCache;
  private prevDate;
  private currentDate;
  private originalTimePass;
  private cumulativeTime;
  private lastReportedCumulative;
  readonly log: (message: string, level?: string, ...objects: any[]) => void;
  constructor(manager: DynamicManager);
  register(type: string, eventId: string, options: TimeEventOptions): boolean;
  unregister(type: string, eventId: string): boolean;
  timeTravel(options?: TimeTravelOptions): boolean;
  updateTimeLanguage(choice?: 'JournalTime'): string | boolean;
  _handleTimePass(passedSeconds: number): DocumentFragment;
  private _trigger;
  private _updateCumulativeTime;
  private _triggerTimeEventsWithCumulative;
  private _calculateTimeDifference;
  private _updateDateTime;
  init(): void;
}
declare class ToolCollection {
  readonly core: MaplebirchCore;
  readonly utils: typeof utils;
  readonly migration: typeof migration;
  readonly rand: typeof randSystem;
  readonly macro: defineMacros;
  readonly text: htmlTools;
  readonly zone: zonesManager;
  readonly link: typeof applyLinkZone;
  readonly other: typeof otherTools;
  constructor(core: MaplebirchCore);
  onInit(...widgets: InitFunction[]): void;
  addTo(zone: string, ...widgets: (string | Function | ZoneWidgetConfig | [number, string | ZoneWidgetConfig])[]): void;
  preInit(): void;
}
declare class Track {
  readonly key: string;
  readonly modName: string;
  title: string;
  artist: string;
  duration: number;
  constructor(key: string, modName: string, meta?: TrackMeta);
  get id(): string;
}
declare class Transformation {
  #private;
  private manager;
  private log;
  private config;
  readonly decayConditions: {
    [key: string]: Array<() => boolean>;
  };
  private suppressConditions;
  constructor(manager: Character);
  modifyEffect(manager: any): Promise<void>;
  add(name: string, type: string, options: TransformationOption): this;
  inject(): void;
  _update(): void;
  _clear(): void;
  _transform(name: string, change: number): void;
  updateTransform(name: string): void;
  _updateParts(name: string, oldLevel: number, newLevel: number): void;
  _transformationAlteration(): void;
  _transformationStateUpdate(): void;
  message(
    key: string,
    tools: {
      element: (tag: string, text: any, className?: string) => void;
      wikifier: (macro: string, param: string) => void;
    }
  ): boolean;
  get icon(): string;
  setTransform(name: string, level: number | null): void;
}
declare class Variables {
  #private;
  static get options(): {
    character: {
      mask: number;
      charArt: {
        type: 'fringe';
        select: string;
        value: any;
      };
      closeUp: {
        type: 'fringe';
        select: string;
        value: any;
      };
    };
    npcsidebar: {
      show: boolean;
      model: boolean;
      position: 'back';
      dxfn: number;
      dyfn: number;
      skin_type: string;
      tan: number;
      facestyle: string;
      facevariant: string;
      freckles: boolean;
      ears: string;
      mask: number;
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
declare class WardrobeClothing {
  name: string;
  outfits: string[];
  private location;
  private global;
  constructor(name: string, outfits?: string[], location?: Record<string, RegisterItem[]>, global?: RegisterItem[]);
  register(location: string, key: string, cond?: any): void;
  get worn(): WardrobeItem;
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
  private _checkEvents;
  register(eventId: string, options: WeatherEventOptions): boolean;
  unregister(eventId: string): boolean;
  addLayerModification(layerName: string, patch: any, mode?: 'replace' | 'merge'): this;
  addEffectModification(effectName: string, patch: any, mode?: 'replace' | 'merge'): this;
  applyModifications(params: any): any;
  addWeatherData(data: WeatherException | WeatherTypeConfig): boolean | void;
  init(): void;
  modifyWeatherJavaScript(manager: AddonPlugin): Promise<void>;
}
declare class defineMacros {
  readonly manager: ToolCollection;
  readonly log: ReturnType<typeof createlog>;
  readonly macros: string[];
  readonly statFunctions: {
    [x: string]: Function;
  };
  constructor(manager: ToolCollection);
  get Macro(): typeof Macro;
  define(macroName: string, macroFunction: Function, tags?: string[], skipArgs?: string[] | boolean, isAsync?: boolean): void;
  defineS(macroName: string, macroFunction: Function, tags?: string[], skipArgs?: string[] | boolean, maintainContext?: boolean): void;
  statChange(statType: string, amount: number, colorClass: string, condition?: () => boolean): DocumentFragment;
  create(name: string, fn: Function): void;
  callStatFunction(name: string, ...args: any[]): DocumentFragment;
}
declare class htmlTools {
  core: ToolCollection['core'];
  readonly log: ReturnType<typeof createlog>;
  store: Map<string, TextHandler[]>;
  constructor(manager: ToolCollection);
  get Wikifier(): typeof Wikifier;
  replaceText(oldText: string | any, newText: string): void;
  replaceLink(oldLink: string | any, newLink: string): void;
  add(key: string, handler: (tools: Builder) => void, id?: string): string | false;
  delete(key: string, idOrHandler?: string | ((tools: Builder) => void)): boolean;
  clear(): void;
  renderFragment(keys: string | string[], context?: Record<string, any>): DocumentFragment;
  render(macro: any, keys: string | string[]): void;
  makeTextOutput(options?: { CSV?: boolean }): (this: any) => void;
}
declare class migration {
  static log: (message: string, level?: string, ...objects: any[]) => void;
  static create(): migration;
  log: (message: string, level?: string, ...objects: any[]) => void;
  migrations: step[];
  utils: MigrationUtils;
  constructor();
  private _compareVersions;
  add(fromVersion: string, toVersion: string, migrationFn: (data: any, utils: MigrationUtils) => void): void;
  run(data: Record<string, any>, targetVersion: string): void;
}
declare class randSystem {
  static log: (message: string, level?: string, ...objects: any[]) => void;
  static create(): randSystem;
  log: (message: string, level?: string, ...objects: any[]) => void;
  state: randState;
  constructor();
  set Seed(seed: number);
  get Seed(): number;
  get(max: number): number;
  get rng(): number;
  get history(): number[];
  get pointer(): number;
  backtrack(steps?: number): void;
}
declare class zonesManager {
  #private;
  readonly log: ReturnType<typeof createlog>;
  core: ToolCollection['core'];
  data: Record<string, Array<string | ZoneWidgetConfig | CustomLinkZoneItem>>;
  initFunction: InitFunction[];
  specialWidget: (string | Function)[];
  defaultData: Record<string, string | Function>;
  locationPassage: Record<string, PatchSet[]>;
  widgetPassage: Record<string, PatchSet[]>;
  patchedPassage: Set<string>;
  widgethtml: string;
  constructor(manager: ToolCollection);
  inject(...databases: Partial<Pick<zonesManager, 'specialWidget' | 'defaultData' | 'locationPassage' | 'widgetPassage'>>[]): void;
  onInit(...widgets: InitFunction[]): void;
  addTo(zone: string, ...widgets: (string | Function | ZoneWidgetConfig | [number, string | ZoneWidgetConfig])[]): void;
  storyInit(): void;
  play(zone: string, passageTitle?: string): any;
  patchModToGame(manager: AddonPlugin, type: 'before' | 'after'): Promise<void>;
}
declare const CombatAction: any;
declare const NPCClothes: {
  add: (...c: ClothesConfig[]) => void;
  init: (manager: NPCManager) => Promise<void>;
  import: (m: string, z: any, p: string | string[]) => Promise<string[]>;
  load: (m?: string, f?: string) => Promise<void>;
  register: (n: string, l: string, k: string, c?: any) => WardrobeClothing;
  worn: (n: string) => WardrobeItem;
  readonly layers: Map<any, any>;
  readonly wardrobe: Record<string, WardrobeItem>;
  readonly clothes: Record<string, WardrobeClothing>;
};
declare const NPCSchedules: typeof Schedule & {
  readonly schedules: Map<string, Schedule>;
  init: (manager: NPCManager) => boolean;
  add: (
    npcName: string,
    scheduleConfig: ScheduleTime | ScheduleCondition,
    location: string | ScheduleLocation,
    id?: string | number,
    options?: Partial<Omit<SpecialSchedule, 'condition' | 'location'>>
  ) => Schedule;
  get: (npcName: string) => Schedule;
  update: (npcName: string, specialId: string | number, updates: Partial<Omit<SpecialSchedule, 'id'>>) => Schedule;
  remove: (npcName: string, specialId: string | number) => Schedule;
  clear: (npcName: string) => Schedule;
  clearAll: () => void;
  readonly npcList: string[];
  readonly location: Record<string, string>;
};
declare const NPCSidebar: {
  new (): {};
  get display(): Map<any, any>;
  loadFromMod: typeof loadFromMod;
  hair_type(type: 'sides' | 'fringe'): Record<string, string>;
  init(manager: NPCManager): void;
};
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
    hairlength: number;
    eyeColour: string;
    hairColour: string;
    pronoun: 'm' | 'f' | 'i' | 'n' | 't';
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
    ballssize: number;
    outfits: string[];
    pregnancy: any;
    pregnancyAvoidance: number;
    descCache: Record<string, any>;
    setPronouns(data: NPCData): void;
    applyVanillaPregnancySystem(manager: NPCManager): void;
    bodyPartdescription(): void;
  };
} & {
  add: (manager: NPCManager, npcData: NPCData, config: NPCConfig, translationsData?: Map<string, Translation>) => boolean;
  get: (manager: NPCManager) => any[];
  clear: (manager: NPCManager) => boolean;
  update: (manager: NPCManager) => boolean;
  setup: (manager: NPCManager) => void;
};
declare const PlayMode: {
  readonly SEQUENTIAL: 'sequential';
  readonly LOOP_ALL: 'loop_all';
  readonly LOOP_ONE: 'loop_one';
  readonly SHUFFLE: 'shuffle';
};
declare const Reaction: {
  Triggers: Triggers;
  HermNameList: string[];
  CDNameList: string[];
  reg(type: 'herm' | 'crossdress', npc: string, cond: () => boolean, action: () => string): void;
  regReaction(type: 'herm' | 'crossdress', npc: string, config: ReactionConfig): void;
  check(type: 'herm' | 'crossdress'): string;
  init(): void;
};
declare const Speech: {
  speechs: Map<string, SpeechEntry[]>;
  reg: (npc: string, cond: () => boolean, speech: string, cd: number) => void;
  output: (npc: string) => string;
  init: () => void;
};
declare const applyLinkZone: typeof LinkZoneManager;
declare const log: (message: string, level?: string, ...objects: any[]) => void;
declare const otherTools: {
  addTraits: (...traits: Partial<TraitConfig>[]) => void;
  configureLocation: (locationId: string, config: LocationConfig, options?: LocationConfigOptions) => boolean;
  addBodywriting: (key: string, config: BodywritingConfig) => void;
  injectTraits: (data: TraitCategory[]) => TraitCategory[];
  applyLocation: () => void;
  applyBodywriting: () => void;
};
declare function clone$1(
  source: any,
  opt?: {
    deep?: boolean;
    proto?: boolean;
  },
  map?: WeakMap<object, any>
): any;
declare function contains$1(
  arr: any[],
  value: any | any[],
  mode?: 'all' | 'any' | 'none',
  opt?: {
    case?: boolean;
    compare?: Function;
    deep?: boolean;
  }
): boolean;
declare function convert$1(
  str: string,
  mode?: 'lower' | 'upper' | 'capitalize' | 'title' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant',
  opt?: {
    delimiter?: string;
    acronym?: boolean;
  }
): string;
declare function createlog(prefix: string): (message: string, level?: string, ...objects: any[]) => void;
declare function either$1(itemsOrA: any, ...rest: any[]): any;
declare function equal$1(a: any, b: any): boolean;
declare function faceStyleSrcFn(name: Function | string): (layerOptions: FaceStyleOptions) => string;
declare function loadFromMod(modZip: JSZip, npcName: string): any[];
declare function loadImage$1(src: string): string | boolean | Promise<string | boolean>;
declare function mask(x?: number, swap?: boolean, width?: number, height?: number): string;
declare function merge$1(target: any, ...sources: any[]): any;
declare function random$1(
  min?:
    | number
    | {
        min: number;
        max: number;
        float?: boolean;
      },
  max?: number,
  float?: boolean
): number;
declare var maplebirch: MaplebirchCore;
export interface AccumulateConfig {
  unit: 'sec' | 'min' | 'hour' | 'day' | 'week' | 'month' | 'year';
  target?: number;
}
export interface BodywritingConfig {
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
export interface ClothesConfig {
  name: string;
  type?: string;
  gender?: string;
  outfit?: number;
  upper: string | UpperConfig;
  lower: string | LowerConfig;
  desc?: string;
}
export interface CustomLinkZoneItem {
  position: number;
  widget: string | ZoneWidgetConfig;
}
export interface DateLike {
  hour: number;
  day: number;
  month: number;
  year: number;
  timeStamp: number;
  minute?: number;
  second?: number;
}
export interface EnhancedDate extends DateTime {
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
export interface ExtensionSettings {
  enabled: ModuleInfo[];
  disabled: ModuleInfo[];
}
export interface FaceStyleOptions {
  facestyle: string;
  facevariant: string;
  [key: string]: any;
}
export interface FileItem {
  modName: string;
  filePath: string;
  content: string;
}
export interface HairGradientsReturn {
  fringe: Record<string, string[]>;
  sides: Record<string, string[]>;
}
export interface InitPhase {
  preInitCompleted: boolean;
  mainInitCompleted: boolean;
  loadInitExecuted: boolean;
  postInitExecuted: boolean;
  expectedCount: number;
  registeredCount: number;
  allRegisteredTriggered: boolean;
}
export interface LinkZoneConfig {
  containerId: string;
  linkSelector: string;
  beforeMacro: () => string;
  afterMacro: () => string;
  customMacro: () => {
    position: number;
    macro: string;
  }[];
  zoneStyle: Partial<CSSStyleDeclaration>;
  onBeforeApply?: () => void;
  onAfterApply?: (result: boolean, config: LinkZoneConfig) => void;
  debug: boolean;
}
export interface LocationConfig {
  condition?: (...object: any[]) => boolean;
  folder?: string;
  base?: Record<string, any>;
  emissive?: Record<string, any>;
  reflective?: Record<string, any>;
  layerTop?: Record<string, any>;
  customMapping?: any;
}
export interface LocationConfigOptions {
  overwrite?: boolean;
  layer?: string;
  element?: string;
}
export interface LowerConfig {
  name: string;
  integrity_max?: number;
  word?: string;
  action?: string;
  readonly desc?: string;
}
export interface MigrationUtils {
  readonly log: ReturnType<typeof createlog>;
  resolvePath: (obj: Record<string, any>, path: string, createIfMissing?: boolean) => result | null;
  rename: (data: Record<string, any>, oldPath: string, newPath: string) => boolean;
  move: (data: Record<string, any>, oldPath: string, newPath: string) => boolean;
  remove: (data: Record<string, any>, path: string) => boolean;
  transform: (data: Record<string, any>, path: string, transformer: (value: any) => any) => boolean;
  fill: (
    target: Record<string, any>,
    defaults: Record<string, any>,
    options?: {
      mode?: 'merge' | 'replace';
    }
  ) => void;
}
export interface ModInfo {
  name: string;
  bootJson?: {
    addonPlugin?: Array<{
      modName: string;
      addonName: string;
      params?: any;
    }>;
  };
  modRef?: any;
}
export interface ModuleInfo {
  name: string;
  source: string;
  dependencies?: string[];
}
export interface NPCConfig {
  love?: {
    maxValue: number;
  };
  loveAlias?: [string, string] | (() => string);
  important?: boolean | (() => boolean);
  special?: boolean | (() => boolean);
  loveInterest?: boolean | (() => boolean);
  romance?: (() => boolean)[];
  [key: string]: any;
}
export interface NPCData {
  nam: string;
  gender?: 'm' | 'f' | 'h' | 'n' | 'none';
  pronoun?: 'm' | 'f' | 'i' | 'n' | 't';
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
  [key: string]: any;
}
export interface Part {
  name: string;
  tfRequired: number;
  [x: string]: any;
  default?: string;
}
export interface PatchSet {
  src?: string;
  srcmatch?: RegExp;
  srcmatchgroup?: RegExp;
  to?: string;
  applyafter?: string;
  applybefore?: string;
}
export interface ReactionConfig {
  texts: TextsType;
  before?: string | (() => string);
  affter?: string | (() => string);
}
export interface RegisterItem {
  key: string;
  cond?: any;
}
export interface Registry {
  modules: Map<string, any>;
  states: Map<string, number | string>;
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
  allDependencies: Map<string, Set<string>>;
  waitingQueue: Map<string, Set<string>>;
  source: Map<string, string>;
}
export interface ScheduleCondition {
  (date: EnhancedDate): boolean;
}
export interface SpecialSchedule {
  id: string | number;
  condition: ScheduleCondition;
  location: ScheduleLocation;
  before?: string | number;
  after?: string | number;
  insteadOf?: string | number;
  override?: boolean;
}
export interface SpeechEntry {
  cond: () => boolean;
  speech: string;
  cd: number;
  current: number;
}
export interface StateEventOptions {
  output?: string;
  action?: () => void;
  cond?: () => boolean;
  priority?: number;
  once?: boolean;
  forceExit?: boolean;
  extra?: {
    passage?: string[];
    exclude?: string[];
    match?: RegExp;
  };
}
export interface TextConfig {
  CN: {
    s: string;
    m: string;
  };
  EN: {
    s: string;
    m: string;
  };
}
export interface TextHandler {
  id: string;
  fn: (tools: Builder) => void;
}
export interface TimeData {
  prevDate?: DateLike;
  currentDate?: DateLike;
  changes?: Record<string, number>;
  triggeredByAccumulator?: {
    unit: string;
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
  cumulative?: Record<string, number>;
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
export interface TimeEventOptions {
  action?: (data: TimeData) => void;
  cond?: (data: TimeData) => boolean;
  priority?: number;
  once?: boolean;
  accumulate?: AccumulateConfig;
  exact?: boolean;
}
export interface TimeTravelOptions {
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
export interface TrackMeta {
  title?: string;
  artist?: string;
}
export interface Trait {
  name: string;
  colour: string;
  has: boolean;
  text: string;
}
export interface TraitCategory {
  title: string;
  traits: Trait[];
}
export interface TraitConfig {
  title: string;
  name: string | (() => string);
  colour: string | (() => string);
  has: boolean | (() => boolean);
  text: string | (() => string);
}
export interface TransformationOption {
  parts: Part[];
  traits?: Part[];
  decay?: boolean;
  decayConditions?: (() => boolean)[];
  suppress?: boolean;
  suppressConditions?: ((sourceName: string) => boolean)[];
  pre?: Function;
  post?: Function;
  layers?: any;
  translations?: Map<string, Translation>;
}
export interface TriggerItem {
  npc: string;
  cond: () => boolean;
  action: () => string;
}
export interface Triggers {
  herm: TriggerItem[];
  crossdress: TriggerItem[];
}
export interface UpperConfig {
  name: string;
  integrity_max?: number;
  word?: string;
  action?: string;
  readonly desc?: string;
}
export interface Util {
  /** 获取值的类型字符串表示 */
  readonly getType: (value: any) => string;
  /** 检查是否为布尔值 */
  readonly isBoolean: (value: any) => boolean;
  /** 检查是否为可迭代对象 */
  readonly isIterable: (value: any) => boolean;
  /** 检查是否为数字 */
  readonly isNumeric: (value: any) => boolean;
  /** SameValueZero 比较算法 (同值零比较) */
  readonly sameValueZero: (a: any, b: any) => boolean;
  /** 将对象转换为枚举 */
  readonly toEnum: (obj: Array<any> | Set<any> | Map<any, any> | Record<string, any>) => Readonly<Record<string, any>>;
  /** 获取对象的内部 [[Class]] 属性 */
  readonly toStringTag: (obj: any) => string;
  /** 将字符串转换为 URL 友好的 slug */
  readonly slugify: (str: string) => string;
  /** 清理文件名，移除非法字符 */
  readonly sanitizeFilename: (str: string) => string;
  /** 转义标记字符 */
  readonly escapeMarkup: (str: string) => string;
  /** HTML 实体编码 */
  readonly escape: (str: string) => string;
  /** HTML 实体解码 */
  readonly unescape: (str: string) => string;
  /** 获取指定位置的字符及其边界 */
  readonly charAndPosAt: (
    text: string,
    position: number
  ) => {
    char: string;
    start: number;
    end: number;
  };
  /** 高精度时间戳 */
  readonly now: () => number;
  /** 转换 CSS 时间值为毫秒 */
  readonly fromCssTime: (cssTime: string) => number;
  /** 转换毫秒为 CSS 时间值 */
  readonly toCssTime: (msec: number) => string;
  /** 转换 CSS 属性名（连字符转驼峰） */
  readonly fromCssProperty: (cssName: string) => string;
  /** 解析 URL 字符串为对象 */
  readonly parseUrl: (url: string) => {
    href: string;
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    path: string;
    pathname: string;
    query: string;
    search: string;
    queries: Record<string, string>;
    searches: Record<string, string>;
    hash: string;
  };
  /** 从现有错误创建新类型的错误 */
  readonly newExceptionFrom: (original: Error, exceptionType: new (message: string) => Error, override?: string | Record<string, any>) => Error;
  /** 规范化事件键名 */
  readonly scrubEventKey: (key: string) => string;
  /** 检查媒体查询是否匹配 */
  readonly hasMediaQuery: (mediaQuery: string) => boolean;
  /** 生成随机数 */
  readonly random: () => number;
  /** HTML 实体编码（escape 的别名） */
  readonly entityEncode: (str: string) => string;
  /** HTML 实体解码（unescape 的别名） */
  readonly entityDecode: (str: string) => string;
  /** 评估 JavaScript 表达式 */
  readonly evalExpression: (...args: any[]) => any;
  /** 评估 JavaScript 语句 */
  readonly evalStatements: (...args: any[]) => any;
}
export interface WardrobeItem {
  [key: string]: any;
}
export interface WeatherEventOptions {
  condition?: () => boolean;
  onEnter?: () => void;
  onExit?: () => void;
  once?: boolean;
  priority?: number;
  [key: string]: any;
}
export interface WeatherException {
  date: () => DateTime;
  duration: number;
  weatherType: string;
  temperature?: number;
}
export interface WeatherTypeConfig {
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
export interface ZoneWidgetConfig {
  exclude?: string[];
  match?: RegExp;
  passage?: string | string[];
  widget: string;
  type?: 'function';
  func?: () => string;
}
export interface randState {
  seed: number | null;
  history: number[];
  pointer: number;
}
export interface result {
  parent: Record<string, any>;
  key: string;
}
export interface step {
  fromVersion: string;
  toVersion: string;
  migrationFn: (data: any, utils: MigrationUtils) => void;
}
export type EventCallback = (...args: any[]) => any;
export type InitFunction =
  | Function
  | {
      init: Function;
    }
  | {
      name: string;
      func: Function;
    };
export type LanguageCode = 'EN' | 'CN';
export type PlayMode = (typeof PlayMode)[keyof typeof PlayMode];
export type ScheduleLocation = string | ((date: EnhancedDate) => string | Schedule);
export type ScheduleTime = number | [number, number?];
export type TextsType = TextConfig | ((lang: 'CN' | 'EN', single: boolean) => string);
export type Translation = Record<string, string>;

declare namespace utils {
  export {
    SelectCase$1 as SelectCase,
    clone$1 as clone,
    contains$1 as contains,
    convert$1 as convert,
    either$1 as either,
    equal$1 as equal,
    loadImage$1 as loadImage,
    merge$1 as merge,
    random$1 as random
  };
}

export { maplebirch as default };
