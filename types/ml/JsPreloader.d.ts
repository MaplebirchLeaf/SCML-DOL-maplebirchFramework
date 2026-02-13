import { SC2DataManager } from "./SC2DataManager";
import { ModUtils } from "./Utils";
import { LogWrapper } from "./ModLoadController";
export declare class StackLike<T> {
    private _data;
    push(v: T): void;
    pop(): T | undefined;
    peek(): T | undefined;
    get length(): number;
    get data(): T[];
    get empty(): boolean;
    clear(): void;
}
export declare class JsPreloader {
    pSC2DataManager: SC2DataManager;
    modUtils: ModUtils;
    thisWin: Window;
    logger: LogWrapper;
    constructor(pSC2DataManager: SC2DataManager, modUtils: ModUtils, thisWin: Window);
    startLoadCalled: boolean;
    startLoad(): Promise<any>;
    runningMod: StackLike<string>;
    JsRunner(content: string, name: string, modName: string, stage: string, pSC2DataManager: SC2DataManager, thisWin: Window, logger: LogWrapper): Promise<any>;
}
