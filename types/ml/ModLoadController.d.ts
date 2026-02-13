import { ModBootJson, ModInfo } from "ModLoader";
import { SC2DataManager } from "SC2DataManager";
import JSZip from "jszip";
import moment from "moment/moment";
import { JSZipLikeReadOnlyInterface } from "./JSZipLikeReadOnlyInterface";
export interface LogWrapper {
    log: (s: string) => void;
    warn: (s: string) => void;
    error: (s: string) => void;
}
export interface LifeTimeCircleHook extends Partial<ModLoadControllerCallback> {
}
export interface ModLoadControllerCallback {
    /**
     * ban a mod use this, need register this hook in `InjectEarlyLoad`
     * @param bootJson
     * @param zip
     */
    canLoadThisMod(bootJson: ModBootJson, zip: JSZipLikeReadOnlyInterface): Promise<boolean>;
    /**
     * use this to modify a mod, like i18n a mod
     * @param bootJson
     * @param zip       carefully modify zip file
     * @param modInfo   you can modify the all info in there. read: [ModZipReader.init()]
     */
    afterModLoad(bootJson: ModBootJson, zip: JSZipLikeReadOnlyInterface, modInfo: ModInfo): Promise<any>;
    InjectEarlyLoad_start(modName: string, fileName: string): Promise<any>;
    InjectEarlyLoad_end(modName: string, fileName: string): Promise<any>;
    EarlyLoad_start(modName: string, fileName: string): Promise<any>;
    EarlyLoad_end(modName: string, fileName: string): Promise<any>;
    LazyLoad_start(modName: string): Promise<any>;
    LazyLoad_end(modName: string): Promise<any>;
    Load_start(modName: string, fileName: string): Promise<any>;
    Load_end(modName: string, fileName: string): Promise<any>;
    PatchModToGame_start(): Promise<any>;
    PatchModToGame_end(): Promise<any>;
    /**
     * @deprecated
     */
    ReplacePatcher_start(modName: string, fileName: string): Promise<any>;
    /**
     * @deprecated
     */
    ReplacePatcher_end(modName: string, fileName: string): Promise<any>;
    /**
     * Latest Hook On ModLoader When ALL Load End
     */
    ModLoaderLoadEnd(): Promise<any>;
    /**
     * @useless useless for user
     */
    logError(s: string): void;
    /**
     * @useless useless for user
     */
    logInfo(s: string): void;
    /**
     * @useless useless for user
     */
    logWarning(s: string): void;
    exportDataZip(zip: JSZip): Promise<JSZip>;
}
export declare function getLogFromModLoadControllerCallback(c: ModLoadControllerCallback): LogWrapper;
export interface LogRecord {
    type: 'info' | 'warning' | 'error';
    time: moment.Moment;
    message: string;
}
/**
 * ModLoader lifetime circle system,
 * mod can register hook to this system, to listen to the lifetime circle of MpdLoader and error log.
 *
 * ModLoader 生命周期系统，
 * mod 可以注册 hook 到这个系统，来监听 ModLoader 的生命周期和错误日志。
 */
export declare class ModLoadController implements ModLoadControllerCallback {
    gSC2DataManager: SC2DataManager;
    constructor(gSC2DataManager: SC2DataManager);
    logRecordBeforeAnyLogHookRegister: LogRecord[];
    LazyLoad_end: (modName: string) => Promise<any>;
    LazyLoad_start: (modName: string) => Promise<any>;
    EarlyLoad_end: (modName: string, fileName: string) => Promise<any>;
    EarlyLoad_start: (modName: string, fileName: string) => Promise<any>;
    InjectEarlyLoad_end: (modName: string, fileName: string) => Promise<any>;
    InjectEarlyLoad_start: (modName: string, fileName: string) => Promise<any>;
    Load_end: (modName: string, fileName: string) => Promise<any>;
    Load_start: (modName: string, fileName: string) => Promise<any>;
    PatchModToGame_end: () => Promise<any>;
    PatchModToGame_start: () => Promise<any>;
    ReplacePatcher_end: (modName: string, fileName: string) => Promise<any>;
    ReplacePatcher_start: (modName: string, fileName: string) => Promise<any>;
    logError: (s: string) => void;
    logInfo: (s: string) => void;
    logWarning: (s: string) => void;
    ModLoaderLoadEnd: () => Promise<any>;
    canLoadThisMod(bootJson: ModBootJson, zip: JSZipLikeReadOnlyInterface): Promise<boolean>;
    afterModLoad(bootJson: ModBootJson, zip: JSZipLikeReadOnlyInterface, modInfo: ModInfo): Promise<any>;
    /**
     * call by ModLoaderGui (inner use)
     * @param zip
     */
    exportDataZip(zip: JSZip): Promise<JSZip>;
    private lifeTimeCircleHookTable;
    addLifeTimeCircleHook(id: string, hook: LifeTimeCircleHook): void;
    removeLifeTimeCircleHook(hook: LifeTimeCircleHook): void;
    clearLifeTimeCircleHook(): void;
    listModLocalStorage(): string[];
    addModLocalStorage(name: string, modBase64String: string): void;
    removeModLocalStorage(name: string): void;
    checkModZipFileLocalStorage(modBase64String: string): Promise<string | ModBootJson>;
    overwriteModIndexDBModList(modeList: string[]): Promise<void>;
    overwriteModIndexDBHiddenModList(modeList: string[]): Promise<void>;
    listModIndexDB(): Promise<string[]>;
    loadHiddenModList(): Promise<string[]>;
    addModIndexDB(name: string, modBase64String: string | Uint8Array): Promise<void>;
    removeModIndexDB(name: string): Promise<void>;
    checkModZipFileIndexDB(modBase64String: string | Uint8Array): Promise<string | ModBootJson>;
    getLog(): LogWrapper;
}
