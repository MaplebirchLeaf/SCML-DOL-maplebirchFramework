import type { SC2DataManager } from "../ml/SC2DataManager";
import type { ModUtils } from "../ml/Utils";
import type { LifeTimeCircleHook } from "../ml/ModLoadController";
import type { ModBootJson } from "../ml/ModLoader";
import type JSZip from "jszip";
export declare class ModLoadSwitch implements LifeTimeCircleHook {
    gSC2DataManager: SC2DataManager;
    gModUtils: ModUtils;
    private safeMode;
    constructor(gSC2DataManager: SC2DataManager, gModUtils: ModUtils);
    disableSafeMode(): void;
    enableSafeMode(): void;
    isSafeModeOn(): boolean;
    isSafeModeAutoOn(): boolean;
    canLoadThisMod(bootJson: ModBootJson, zip: JSZip): Promise<boolean>;
}
