import type { SC2DataManager } from "../ml/SC2DataManager";
import type { ModUtils } from "../ml/Utils";
import type { LogWrapper } from "../ml/ModLoadController";
export declare class CssReplacer {
    thisWindow: Window;
    gSC2DataManager: SC2DataManager;
    gModUtils: ModUtils;
    logger: LogWrapper;
    constructor(thisWindow: Window, gSC2DataManager: SC2DataManager, gModUtils: ModUtils);
    needReplaceKeyList: readonly ["backgroundImage", "maskImage"];
    replaceStyleSheets(): Promise<void>;
    checkIsNeedReplace(cssUrl: string): boolean;
    getCorrectUrl(cssUrl: string): Promise<string>;
}
