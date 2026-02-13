import { SC2DataInfo } from "./SC2DataInfoCache";
import { SimulateMergeResult } from "./SimulateMerge";
import { IndexDBLoader, LazyLoader, LoaderKeyConfig, LocalLoader, LocalStorageLoader, ModZipReader, RemoteLoader } from "./ModZipReader";
import { SC2DataManager } from "./SC2DataManager";
import { LogWrapper, ModLoadControllerCallback } from "./ModLoadController";
import { ReplacePatcher } from "./ReplacePatcher";
import { ModLoadFromSourceType, ModOrderContainer, ModOrderContainer_One_ReadonlyMap, ModOrderContainer_OneAlias_ReadonlyMap, ModOrderItem } from "./ModOrderContainer";
import { LRUCache } from 'lru-cache';
import { JSZipLikeReadOnlyInterface } from "./JSZipLikeReadOnlyInterface";
export interface IModImgGetter {
    /**
     * @return Promise<string>   base64 img string
     */
    getBase64Image(): Promise<string | undefined>;
    imgCache?: string;
    invalid: boolean;
    forceCache(): Promise<any>;
}
export interface ImgLruCacheItemType {
    imageBase64: string;
    invalid: boolean;
}
export declare const StaticModImgLruCache: LRUCache<string, ImgLruCacheItemType, unknown>;
export interface IModImgGetterLRUCache {
    get(path: string): ImgLruCacheItemType | undefined;
    set(path: string, data: ImgLruCacheItemType): IModImgGetterLRUCache;
}
export declare class ModImgGetterDefault implements IModImgGetter {
    modName: string;
    zip: ModZipReader;
    imgPath: string;
    logger: LogWrapper;
    constructor(modName: string, zip: ModZipReader, imgPath: string, logger: LogWrapper);
    invalid: boolean;
    imgCache?: string;
    forceCache(): Promise<void>;
    getBase64Image(): Promise<string | undefined>;
}
export interface ModImg {
    getter: IModImgGetter;
    path: string;
}
export interface ModBootJsonAddonPlugin {
    modName: string;
    addonName: string;
    modVersion: string;
    params?: any[] | {
        [key: string]: any;
    };
}
export declare function checkModBootJsonAddonPlugin(v: any): v is ModBootJsonAddonPlugin;
export interface DependenceInfo {
    modName: string;
    version: string;
}
export declare function checkDependenceInfo(v: any): v is DependenceInfo;
export type ModNickName = ({
    [key in string]?: string;
} & {
    cn?: string;
    en?: string;
}) | string | undefined;
export interface ModBootJson {
    name: string;
    nickName?: ModNickName;
    alias?: string[];
    version: string;
    styleFileList: string[];
    scriptFileList: string[];
    scriptFileList_preload?: string[];
    scriptFileList_earlyload?: string[];
    scriptFileList_inject_early?: string[];
    tweeFileList: string[];
    imgFileList: string[];
    replacePatchList?: string[];
    additionFile: string[];
    additionBinaryFile?: string[];
    addonPlugin?: ModBootJsonAddonPlugin[];
    dependenceInfo?: DependenceInfo[];
}
export interface ModInfo {
    name: string;
    nickName?: ModNickName;
    alias: string[];
    version: string;
    cache: SC2DataInfo;
    imgs: ModImg[];
    /**
     * origin path, replace path
     *
     * @deprecated the imgFileReplaceList not work and never implemented, don't use it.
     *             Please use `ImageLoaderAddon` or `BeautySelectorAddon` instead.
     * @see `ImageLoaderAddon` https://github.com/Lyoko-Jeremie/DoL_ImgLoaderHooker
     * @see `BeautySelectorAddon` https://github.com/Lyoko-Jeremie/DoL_BeautySelectorAddonMod
     */
    imgFileReplaceList: [string, string][];
    /**
     * file name, file content
     */
    scriptFileList_preload: [string, string][];
    /**
     * file name, file content
     */
    scriptFileList_earlyload: [string, string][];
    /**
     * file name, file content
     */
    scriptFileList_inject_early: [string, string][];
    replacePatcher: ReplacePatcher[];
    bootJson: ModBootJson;
    modRef: {
        [key: string]: any;
    } | undefined;
}
export declare enum ModDataLoadType {
    'Remote' = "Remote",
    'Local' = "Local",
    'LocalStorage' = "LocalStorage",
    'IndexDB' = "IndexDB"
}
export declare class ModLoader {
    gSC2DataManager: SC2DataManager;
    modLoadControllerCallback: ModLoadControllerCallback;
    thisWin: Window;
    logger: LogWrapper;
    constructor(gSC2DataManager: SC2DataManager, modLoadControllerCallback: ModLoadControllerCallback, thisWin: Window);
    /**
     * 已读取的mod列表（加载但没有初始化）
     * The mod list that already read (load but not init)
     */
    private modReadCache;
    /**
     * 已加载的mod列表（加载并完成初始化）
     * The mod list that already loaded (load and init)
     */
    private modCache;
    /**
     * 已加载的Lazy mod列表（使用 `lazyRegisterNewMod` 加载但未完成初始化）
     * The Lazy mod list that already loaded (load use `lazyRegisterNewMod` but not init)
     */
    private modLazyCache;
    modLoadRecord: ModOrderItem[];
    /**
     * O(2n)
     */
    getModCacheOneArray(): ModOrderItem[];
    /**
     O(n)
     */
    getModCacheArray(): ModOrderItem[];
    getModAllName(): string[];
    /**
     O(1)
     */
    getModCacheMap(): ModOrderContainer_One_ReadonlyMap;
    getModCacheMapWithAlias(): ModOrderContainer_OneAlias_ReadonlyMap;
    /**
     * O(n+2log(n))
     */
    checkModCacheData(): boolean;
    /**
     O(n)
     */
    checkModCacheUniq(): boolean;
    /**
     O(1)
     */
    getModCacheByNameOne(modName: string): ModOrderItem | undefined;
    getModCacheByAliseOne(modName: string): ModOrderItem | undefined;
    getModCacheByFromType(from: ModLoadFromSourceType): ModOrderItem[];
    getModReadCache(): ModOrderContainer;
    checkModConflictList(): {
        mod: SC2DataInfo;
        result: SimulateMergeResult;
    }[];
    private modLoaderKeyConfig?;
    private modIndexDBLoader?;
    private modLocalStorageLoader?;
    private modLocalLoader?;
    private modRemoteLoader?;
    private modLazyLoader?;
    getLoaderKeyConfig(): LoaderKeyConfig;
    getIndexDBLoader(): IndexDBLoader;
    getLocalStorageLoader(): LocalStorageLoader;
    getLocalLoader(): LocalLoader;
    getRemoteLoader(): RemoteLoader;
    getLazyLoader(): LazyLoader;
    loadOrder: ModDataLoadType[];
    private addModReadZip;
    loadMod(loadOrder: ModDataLoadType[]): Promise<boolean>;
    private registerMod2Addon;
    protected triggerAfterModLoad(): Promise<void>;
    protected filterModCanLoad(modeC: ModOrderContainer): Promise<ModOrderContainer>;
    lazyRegisterNewMod(modeZip: JSZipLikeReadOnlyInterface): Promise<boolean>;
    private do_initModInjectEarlyLoadInDomScript;
    private initModInjectEarlyLoadInDomScript;
    private do_initModEarlyLoadScript;
    private initModEarlyLoadScript;
    getModEarlyLoadCache(): ModOrderContainer;
    getModByNameOne(modName: string): ModOrderItem | undefined;
    getModZip(modName: string): ModZipReader | undefined;
    private loadEndModList?;
    private toLoadModList?;
    private nowLoadedMod?;
    private newNowMod?;
    private replacedNowMod?;
    private tryInitWaitingLazyLoadMod;
}
