import { UseStore } from 'idb-keyval';
import { ModBootJson, ModInfo } from "./ModLoader";
import { LogWrapper, ModLoadControllerCallback } from "./ModLoadController";
import { JSZipLikeReadOnlyInterface } from "./JSZipLikeReadOnlyInterface";
export declare function getXxHash(): Promise<import("xxhash-wasm").XXHashAPI>;
export interface Twee2PassageR {
    name: string;
    tags: string[];
    content: string;
}
export declare function Twee2Passage2(s: string): Twee2PassageR[];
export declare function Twee2Passage(s: string): Twee2PassageR[];
export declare function imgWrapBase64Url(fileName: string, base64: string): string;
export declare function blobToBase64(blob: Blob): Promise<string>;
export declare class ModZipReaderHash {
    _hash: string | undefined;
    _zipBase64String: string | undefined;
    constructor(zipBase64String: string | undefined, hash?: string | undefined);
    protected digestMessage(message: string): Promise<string>;
    protected XxHashH64Bigint2String(h64: bigint): string;
    protected XxHashH32Number2String(h32: bigint): string;
    init(): Promise<void>;
    compare(h: ModZipReaderHash): boolean;
    compareWithString(h: string): boolean;
    toString(): string;
    fromString(hash: string): (typeof this._hash);
}
export declare class ModZipReader {
    loaderBase: LoaderBase;
    modLoadControllerCallback: ModLoadControllerCallback;
    log: LogWrapper;
    private gcFinalizationRegistry;
    private _zip;
    private _zipIsExist;
    get zip(): JSZipLikeReadOnlyInterface;
    modZipReaderHash: ModZipReaderHash;
    constructor(zip: JSZipLikeReadOnlyInterface, zipBase64String: string, loaderBase: LoaderBase, modLoadControllerCallback: ModLoadControllerCallback);
    get isModPack(): boolean;
    get isJsZip(): boolean;
    modInfo?: ModInfo;
    getModInfo(): ModInfo | undefined;
    getZipFile(): JSZipLikeReadOnlyInterface | undefined;
    /**
     * use this to release zip object ref, try to remove the object from memory.
     */
    gcReleaseZip(): void;
    /**
     * use this to debug check if the zip object is really released.
     * @return [isRefExist(true), isWeakRefExist(false), isWeakRefCleanBeCall(true/(null if not support))]
     *       only when the return is [true, false, true] the zip object is really released.
     */
    gcCheckReleased(): [boolean, /* boolean,*/ /* boolean,*/ boolean | null];
    gcIsReleased(): boolean;
    static validateBootJson(bootJ: any, log?: LogWrapper): bootJ is ModBootJson;
    static modBootFilePath: string;
    init(): Promise<boolean>;
    refillCacheStyleFileItems(styleFileList: string[], keepOld: boolean): Promise<void>;
    refillCachePassageDataItems(tweeFileList: string[], keepOld: boolean): Promise<void>;
    refillCacheScriptFileItems(scriptFileList: string[], keepOld: boolean): Promise<void>;
    constructModInfoCache(bootJ: ModBootJson, keepOld: boolean): Promise<void>;
}
export declare class LoaderBase {
    log: ModLoadControllerCallback;
    loaderKeyConfig: LoaderKeyConfig;
    modList: ModZipReader[];
    modZipList: Map<string, ModZipReader[]>;
    logger: Record<'log' | 'warn' | 'error', ((s: string) => void)>;
    constructor(log: ModLoadControllerCallback, loaderKeyConfig: LoaderKeyConfig);
    init(): void;
    getZipFile(name: string): ModZipReader[] | undefined;
    addZipFile(name: string, zip: ModZipReader): void;
    load(): Promise<boolean>;
}
export declare class LocalStorageLoader extends LoaderBase {
    static modDataLocalStorageZipList: string;
    static modDataLocalStorageZipPrefix: string;
    init(): void;
    load(): Promise<boolean>;
    static listMod(): string[] | undefined;
    static calcModNameKey(name: string): string;
    static addMod(name: string, modBase64String: string): void;
    static removeMod(name: string): void;
    static checkModZipFile(modBase64String: string): Promise<string | ModBootJson>;
    setConfigKey(modDataLocalStorageZipListKey?: string, modDataLocalStorageZipPrefix?: string): void;
}
export declare class IndexDBLoader extends LoaderBase {
    modLoadControllerCallback: ModLoadControllerCallback;
    loaderKeyConfig: LoaderKeyConfig;
    static dbName: string;
    static storeName: string;
    static modDataIndexDBZipListHidden: string;
    static modDataIndexDBZipList: string;
    static modDataIndexDBZipPrefix: string;
    init(): void;
    customStore: UseStore;
    constructor(modLoadControllerCallback: ModLoadControllerCallback, loaderKeyConfig: LoaderKeyConfig);
    load(): Promise<boolean>;
    /**
     * @param modeList must have same items as the list in listMod()
     */
    static reorderModList(modeList: string[]): Promise<void>;
    static setModList(modeList: string[]): Promise<void>;
    static setHiddenModList(modeList: string[]): Promise<void>;
    static loadHiddenModList(): Promise<string[] | undefined>;
    static listMod(): Promise<string[] | undefined>;
    static calcModNameKey(name: string): string;
    static addMod(name: string, modBase64String: string | Uint8Array): Promise<void>;
    static removeMod(name: string): Promise<void>;
    static checkModZipFile(modBase64String: string | Uint8Array): Promise<string | ModBootJson>;
    setConfigKey(dbName?: string, storeName?: string, modDataIndexDBZipList?: string, modDataIndexDBZipListHidden?: string): void;
}
export declare class Base64ZipStringLoader extends LoaderBase {
    modLoadControllerCallback: ModLoadControllerCallback;
    loaderKeyConfig: LoaderKeyConfig;
    base64ZipStringList: string[];
    constructor(modLoadControllerCallback: ModLoadControllerCallback, loaderKeyConfig: LoaderKeyConfig, base64ZipStringList: string[]);
    load(): Promise<boolean>;
}
export declare class LocalLoader extends LoaderBase {
    modLoadControllerCallback: ModLoadControllerCallback;
    loaderKeyConfig: LoaderKeyConfig;
    thisWin: Window;
    modDataValueZipListPath: string;
    init(): void;
    constructor(modLoadControllerCallback: ModLoadControllerCallback, loaderKeyConfig: LoaderKeyConfig, thisWin: Window);
    load(): Promise<boolean>;
    setConfigKey(modDataValueZipListPath?: string): void;
}
export declare class RemoteLoader extends LoaderBase {
    modDataRemoteListPath: string;
    init(): void;
    load(): Promise<boolean>;
    setConfigKey(modDataRemoteListPath: string): void;
}
export declare class LazyLoader extends LoaderBase {
    add(modeZip: JSZipLikeReadOnlyInterface): Promise<ModZipReader>;
    load(): Promise<boolean>;
}
export declare const getModZipReaderStaticClassRef: () => {
    LocalStorageLoader: typeof LocalStorageLoader;
    IndexDBLoader: typeof IndexDBLoader;
    LocalLoader: typeof LocalLoader;
    RemoteLoader: typeof RemoteLoader;
};
export declare class LoaderKeyConfig {
    log: ModLoadControllerCallback;
    modLoaderKeyConfigWinHookFunctionName: string;
    logger: Record<'log' | 'warn' | 'error', ((s: string) => void)>;
    constructor(log: ModLoadControllerCallback);
    config: Map<string, string>;
    getLoaderKey(k: string, d: string): string;
    protected isInit: boolean;
    protected init(): void;
    /**
     * @example
     * @code
     * ```
     * window.modLoaderKeyConfigWinHookFunction = (loaderKeyConfig: LoaderKeyConfig) => {
     *    loaderKeyConfig.config.set('modDataIndexDBZipList', 'modDataIndexDBZipList123456789');
     * };
     * ```
     *
     * @protected
     */
    protected callWinHookFunction(): void;
    /**
     * @example   URL:  ./Degrees of Lewdity VERSION.html.mod.html?modDataIndexDBZipList=modDataIndexDBZipList123456789
     * @protected
     */
    protected getConfigFromUrlHash(): void;
}
