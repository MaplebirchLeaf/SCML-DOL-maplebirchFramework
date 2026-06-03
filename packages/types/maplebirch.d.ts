import { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import { ModUtils } from '@scml/types/sugarcube-2-ModLoader/Utils';
import { Gui } from '@scml/types/Mod_LoaderGui/Gui';
import jsyaml from 'js-yaml';
import { Howl, Howler } from 'howler';
import * as marked from 'marked';
import { Passage } from '@scml/types/sugarcube-2-ModLoader/SugarCube2';
import { ModInfo, ModBootJson } from '@scml/types/sugarcube-2-ModLoader/ModLoader';
import { JSZipLikeReadOnlyInterface } from '@scml/types/sugarcube-2-ModLoader/JSZipLikeReadOnlyInterface';
import { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';

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

  // DOL 的 src / masksrc 有时可能是 string[]，所以单独抽出来
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

type CloudSaveSlot = number;
type CloudSaveBackend = 'webdav' | 'server';
interface CloudSaveConfig {
    /** 已连接的存储后端。由连接流程自动写入，外部通常不需要传。 */
    mode?: CloudSaveBackend;
    /** WebDAV 根地址，或 Go 服务地址。 */
    endpoint: string;
    /** WebDAV 账号，或 Go 服务登录账号。 */
    username?: string;
    /** 面板中临时输入的密码，不会保存到 localStorage。 */
    password?: string;
    userId?: string;
    /** 用于加密/解密云存档的口令，默认与 password 相同。 */
    passphrase?: string;
    token?: string;
}
interface CloudSaveRecord {
    slot: CloudSaveSlot;
    details: any;
    save: any;
    exportedAt: number;
    gameId?: string;
    frameworkVersion?: string;
}
interface CloudSaveEncryptedPayload {
    version: 1;
    compression?: 'gzip';
    salt: string;
    iv: string;
    data: string;
}
interface CloudSaveRemoteItem {
    slot: CloudSaveSlot;
    updatedAt: number;
    payload?: CloudSaveEncryptedPayload;
}
interface CloudSaveRemoteCode {
    updatedAt: number;
    payload?: CloudSaveEncryptedPayload;
}
interface CloudSaveAuthResponse {
    userId: number;
    username: string;
    token: string;
    expiresAt: number;
}
declare class CloudSaveService {
    readonly core: MaplebirchCore;
    constructor(core: MaplebirchCore);
    /** 写入并标准化云存档配置。后端模式由连接流程自动确定。 */
    configure(config: CloudSaveConfig): this;
    /** 调用 Go 后端注册账号，成功后保存登录 token 和加密口令。 */
    register(username: string, password: string, passphrase?: string): Promise<CloudSaveAuthResponse>;
    /** 调用 Go 后端登录账号，成功后保存登录 token 和加密口令。 */
    login(username: string, password: string, passphrase?: string): Promise<CloudSaveAuthResponse>;
    /** 删除 Go 服务账号及其所有云端存档。WebDAV 没有账户删除接口。 */
    deleteAccount(password: string): Promise<boolean>;
    /** 从游戏 indexedDB 中导出指定本地槽位，整理成可加密上传的记录。 */
    exportSlot(slot: CloudSaveSlot): Promise<CloudSaveRecord>;
    /** 把云端下载得到的存档记录写回指定本地槽位。 */
    importSlot(record: CloudSaveRecord, targetSlot?: CloudSaveSlot): Promise<boolean>;
    /** 统一上传入口；根据当前后端模式分发到 Go 服务或 WebDAV。 */
    upload(slot: CloudSaveSlot): Promise<CloudSaveRemoteItem>;
    /** 统一下载入口；根据当前后端模式从远端取回存档并导入本地槽位。 */
    download(slot: CloudSaveSlot, targetSlot?: number): Promise<boolean>;
    /** 统一远端列表入口；返回当前后端保存的所有远端槽位信息。 */
    listRemote(): Promise<CloudSaveRemoteItem[]>;
    /** 统一远端删除入口；删除指定远端槽位。 */
    deleteRemote(slot: CloudSaveSlot): Promise<boolean>;
    /** 使用 Go 服务后端上传指定槽位：先导出本地存档，再加密并 PUT 到 /saves/{slot}。 */
    /** 使用 Go 服务后端下载指定槽位：读取密文、解密后导入本地槽位。 */
    /** 调用 SugarCube 的序列化接口导出当前游戏存档码。 */
    exportCode(): string;
    /** 把指定 indexedDB 槽位转换成 SugarCube 可导入的存档码文本。 */
    exportSlotCode(slot: CloudSaveSlot): Promise<string>;
    /** 调用 SugarCube 的反序列化接口，把存档码导入游戏。 */
    importCode(code: string): boolean;
    /** 统一存档码上传入口；根据当前后端模式保存一段加密后的存档码文本。 */
    uploadCode(code?: string): Promise<CloudSaveRemoteCode>;
    /** 统一存档码下载入口；根据当前后端模式取回并解密存档码文本。 */
    downloadCode(): Promise<string>;
    /** 使用 Go 服务后端上传存档码，内容会先按云存档口令加密。 */
    /** 使用 Go 服务后端下载存档码，并在解密后返回原始文本。 */
    /** 初始化云存档设置面板，把已保存的非敏感配置回填到输入框。 */
    mountPanel(): void;
    /** 处理面板按钮动作，是 UI 与云存档服务之间的统一调度入口。 */
    panelAction(action: 'connectRemote' | 'registerServer' | 'deleteServerAccount' | 'uploadSlot' | 'downloadSlot' | 'refreshRemoteList' | 'deleteRemoteSlot' | 'exportCurrentCode' | 'exportSlotCode' | 'uploadCode' | 'downloadCode' | 'importCode', slot?: CloudSaveSlot): Promise<void>;
    /** 获取游戏当前启用的 indexedDB 存档接口，并在不可用时抛错。 */
    /** 从云存档面板中读取指定字段的字符串值。 */
    /** 向云存档面板中的指定字段写入字符串值。 */
    /** 读取并校验面板中选择的本地槽位编号。 */
    /** 从 localStorage 读取面板的非敏感配置。 */
    /** 把面板的非敏感配置保存到 localStorage，避免保存密码。 */
    /** 刷新远端存档列表，并为每个槽位生成下载和删除按钮。 */
    /** 更新面板状态提示，并根据成功或失败切换样式。 */
    /** 把捕获到的异常转换成适合显示在面板上的错误文本。 */
    /** 调用项目核心翻译函数，统一取得本地化文本。 */
    /** 把云端存档整理成 indexedDB 可写入的 SugarCube 状态格式。 */
    /** 要求云存档配置已经存在，否则直接抛出明确错误。 */
    /** 要求配置中存在服务地址或 WebDAV 地址，并返回标准化后的地址。 */
    /** 把后端认证结果写入当前配置，保存 userId、token 和加密口令。 */
    /** 封装 Go 后端注册和登录请求，减少 register/login 的重复代码。 */
    /** 自动连接远端：地址像 Go 服务时登录账号，否则按 WebDAV 初始化。 */
    /** 用健康检查判断当前地址是否为框架提供的 Go + SQL 服务。 */
    /** 把本地槽位打包成远端可保存的加密记录。 */
    /** 把远端槽位解密后写回本地槽位。 */
    /** 把存档码打包成远端可保存的加密记录。 */
    /** 把远端存档码解密成原始文本。 */
    /** 当前面板密码就是云存档加密口令。 */
    /** 向 Go 服务后端发送 JSON 请求，并自动附带 userId 与 Bearer token。 */
    /** 使用 WebDAV 上传指定槽位，并同步更新 manifest.json 索引。 */
    /** 使用 WebDAV 下载指定槽位，解密后导入本地槽位。 */
    /** 从 WebDAV manifest.json 中读取远端槽位列表。 */
    /** 删除 WebDAV 上的指定槽位文件，并同步更新 manifest.json。 */
    /** 使用 WebDAV 上传加密后的存档码，并记录存档码更新时间。 */
    /** 使用 WebDAV 下载并解密远端存档码。 */
    /** 读取并清洗 WebDAV 远端索引文件；不存在时返回空索引。 */
    /** 写回 WebDAV 远端索引文件，并刷新 updatedAt 时间。 */
    /** 创建一个空的 WebDAV 远端索引对象。 */
    /** 检查 WebDAV 配置和凭据，并确保 slots 目录存在。 */
    /** 调用 WebDAV MKCOL 创建目录；目录已存在时视为成功。 */
    /** 发送 WebDAV JSON 请求，统一处理 404、错误状态和 JSON 解析。 */
    /** 发送底层 WebDAV fetch 请求，并自动附加 Basic Auth 认证头。 */
    /** 把相对 WebDAV 路径拼接成完整请求 URL。 */
    /** 根据文件片段生成已编码的 WebDAV 远端路径。 */
    /** 把 WebDAV 用户名和密码编码成 Basic Auth 所需的 Base64 字符串。 */
    /** 使用 PBKDF2 派生密钥并用 AES-GCM 加密云存档数据。 */
    /** 校验云存档密文版本，派生密钥后解密并还原 JSON 数据。 */
    /** 用 fflate 尝试 gzip 压缩数据，只在压缩后更小时使用压缩结果。 */
    /** 解压 gzip 数据；优先用 fflate，旧环境异常时再尝试浏览器原生解压。 */
    /** 使用 PBKDF2-SHA256 从口令和 salt 派生 AES-GCM 密钥。 */
    /** 把 Uint8Array 精确裁剪成 WebCrypto 需要的 ArrayBuffer。 */
    /** 把字节数组转换成 Base64 字符串，便于写入 JSON。 */
    /** 把 Base64 字符串还原成字节数组。 */
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
    constructor(core: MaplebirchCore);
    init(): Promise<void>;
    typeLabel(type: ModuleType): string;
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
    modifyWeatherJavaScript(manager: AddonPlugin): void;
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
    Init(): Promise<void>;
}

type ContainsMode = 'all' | 'any' | 'none';
type ContainsOptions = {
    case?: boolean;
    compare?: (item: unknown, value: unknown) => boolean;
    deep?: boolean;
};
declare function clone(source: any, opt?: {
    deep?: boolean;
    proto?: boolean;
}, map?: WeakMap<object, any>): any;
declare function equal(a: any, b: any): boolean;
declare function merge(target: any, ...sources: any[]): any;
declare function contains(arr: unknown[], value: unknown, mode?: ContainsMode, opt?: ContainsOptions): boolean;
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

declare class TimeTravelCheat {
    constructor(core: MaplebirchCore);
    fragment(): DocumentFragment;
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
    readonly timeTravel: TimeTravelCheat;
    constructor(manager: ToolCollection);
    executeJS(code?: string): JSExecutionResult;
    executeTwine(code?: string): TwineExecutionResult;
    execute(type: 'javascript' | 'twine', code?: string): ExecutionResult;
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
    forward(steps?: number): void;
    get seed(): number | null;
    set seed(value: number);
    get history(): number[];
    get index(): number;
}

declare const CONVERT_MODES: readonly ["lower", "upper", "capitalize", "title", "camel", "pascal", "snake", "kebab", "constant"];
type ConvertMode = (typeof CONVERT_MODES)[number];
interface MacroPayload {
    name: string;
    args: any;
    contents?: string;
}
interface MacroContext {
    args: any[];
    payload?: MacroPayload[] | null;
    output: HTMLElement;
    error: (msg: string) => any;
    createShadowWrapper: (fn?: Function | null, fn2?: Function | null) => (event: JQuery.Event) => void;
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

type MacroFunction = (this: MacroContext, ...args: any[]) => any;
type SimpleMacroFunction = (this: MacroContext | null, ...args: any[]) => any;
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
    }): MacroFunction;
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

declare const PlayMode: {
    readonly SEQUENTIAL: "sequential";
    readonly LOOP_ALL: "loop_all";
    readonly LOOP_ONE: "loop_one";
    readonly SHUFFLE: "shuffle";
};
type PlayModeType = (typeof PlayMode)[keyof typeof PlayMode];
declare class Playlist {
    readonly name: string;
    tracks: Track[];
    currentIndex: number;
    playMode: PlayModeType;
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
}

declare const PlayState: {
    readonly IDLE: "idle";
    readonly LOADING: "loading";
    readonly PLAYING: "playing";
    readonly PAUSED: "paused";
    readonly STOPPED: "stopped";
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
    constructor(core: MaplebirchCore);
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
    optionsStorage(action: 'save' | 'restore' | 'reset' | 'load'): any | null;
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
type TransformHook = (options: any, model?: CanvasModel) => void;
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
    readonly decayConditions: Record<string, DecayCondition[]>;
    readonly suppressConditions: Record<string, SuppressCondition[]>;
    constructor(manager: Character);
    wikifier(widget: string, ...args: any[]): any;
    modifyEffect(manager: AddonPlugin): void;
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
type FaceStyleNameFn = (options: FaceStyleOptions) => string | string[];
type FaceStyleName = string | string[];
type ProcessType = 'pre' | 'post';
type ModelTarget<TModel = CanvasModel | CanvasModelOptions> = string | string[] | ((modelName: string, model?: TModel) => boolean);
type ProcessHandler = (options: any, model?: CanvasModel) => void;
declare function faceStyleSrcFn(name: FaceStyleNameFn | FaceStyleName): (layerOptions: FaceStyleOptions) => string;
declare function mask(x?: number, rotation?: number, swap?: boolean, width?: number, height?: number): string;
declare class Character {
    readonly core: MaplebirchCore;
    readonly log: ReturnType<typeof createlog>;
    readonly mask: typeof mask;
    readonly faceStyleSrcFn: typeof faceStyleSrcFn;
    readonly faceStyleMap: Map<string, string[]>;
    readonly transformation: Transformation;
    constructor(core: MaplebirchCore);
    get ZIndices(): {
        [key: string]: number;
    };
    modifyCanvasModel(manager: AddonPlugin): void;
    patchCanvasModel<T extends CanvasModelConstructor>(BaseCanvasModel: T): T;
    use(type: ProcessType, handler: ProcessHandler, target?: ModelTarget<CanvasModel>): this;
    use(layers: CanvasLayerMap, target?: ModelTarget<CanvasModelOptions>): this;
    process(type: ProcessType, options: CanvasModelOptionsData, model?: CanvasModel): void;
    modifyFaceStyle(manager: AddonPlugin): void;
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
    loadWardrobe: (modName: string, filePath: string) => Promise<void>;
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
    combatType?: CombatType | ((ctx: Context) => CombatType);
    order?: number | ((ctx: Context) => number);
}
interface OptionsTable {
    [key: string]: any;
}
interface CombatActionApi {
    actions: ActionEntry[];
    reg(...configs: ActionConfig[]): CombatActionApi;
    _eval<T>(fnOrValue: T | ((ctx: Context) => T), ctx: Context): T | null;
    action(optionsTable: OptionsTable, actionType: ActionType, combatType?: CombatType): OptionsTable;
    color(action: any, encounterType?: CombatType): string | null;
    difficulty(action: any, combatType?: CombatType): string | null;
}
declare const CombatAction: CombatActionApi;

declare class CombatManager {
    readonly core: MaplebirchCore;
    readonly log: ReturnType<typeof createlog>;
    readonly CombatAction: typeof CombatAction;
    constructor(core: MaplebirchCore);
    Init(): void;
}

interface Extensions {
}
type Instance = MaplebirchCore & Extensions;
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
    loadCrypt(options: CryptOptions): Promise<boolean>;
}

interface Task<T = any> {
    modName: string;
    config: T;
    modZip?: ModZipReader;
}
type Replacement = [RegExp, string];
declare function replace(content: string, replacements: Replacement[], label?: string): string;

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
    whenSC2PassageInit(passage: Passage): Promise<any>;
    whenSC2PassageStart(passage: Passage, content: HTMLDivElement): Promise<any>;
    whenSC2PassageRender(passage: Passage, content: HTMLDivElement): Promise<any>;
    whenSC2PassageDisplay(passage: Passage, content: HTMLDivElement): Promise<any>;
    whenSC2PassageEnd(passage: Passage, content: HTMLDivElement): Promise<any>;
    loadCrypt(options: CryptOptions): Promise<boolean>;
}

export { type Extensions, MaplebirchCore, maplebirch as default, utils };
