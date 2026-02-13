import type { SC2DataManager } from "../ml/SC2DataManager";
import type { ModUtils } from "../ml/Utils";
import type { LifeTimeCircleHook } from "../ml/ModLoadController";
import moment from "moment";
import { Subject } from 'rxjs';
export interface LogItem {
    time: moment.Moment;
    str: string;
    type?: 'info' | 'warning' | 'error';
}
export declare class LogShowConfig {
    noInfo: boolean;
    noWarning: boolean;
    noError: boolean;
}
export declare class LoadingProgress implements LifeTimeCircleHook {
    gSC2DataManager: SC2DataManager;
    gModUtils: ModUtils;
    constructor(gSC2DataManager: SC2DataManager, gModUtils: ModUtils);
    initOk: boolean;
    init(): void;
    logNode?: HTMLDivElement;
    allStart(): void;
    logList: LogItem[];
    logSubject: Subject<LogItem>;
    LogItem2Node(T: LogItem, noTime?: boolean): HTMLDivElement;
    getLoadLogHtml(logShowConfig?: LogShowConfig): HTMLDivElement[];
    getLoadLog(): string[];
    InjectEarlyLoad_start(modName: string, fileName: string): Promise<void>;
    InjectEarlyLoad_end(modName: string, fileName: string): Promise<void>;
    EarlyLoad_start(modName: string, fileName: string): Promise<void>;
    EarlyLoad_end(modName: string, fileName: string): Promise<void>;
    Load_start(modName: string, fileName: string): Promise<void>;
    Load_end(modName: string, fileName: string): Promise<void>;
    PatchModToGame_start(): Promise<void>;
    PatchModToGame_end(): Promise<void>;
    ReplacePatcher_start(modName: string, fileName: string): Promise<void>;
    ReplacePatcher_end(modName: string, fileName: string): Promise<void>;
    ModLoaderLoadEnd(): Promise<void>;
    logError(s: string): void;
    logInfo(s: string): void;
    logWarning(s: string): void;
}
