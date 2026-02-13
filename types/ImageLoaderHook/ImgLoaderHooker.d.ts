import type { SC2DataManager } from "../ml/SC2DataManager";
import type { ModUtils } from "../ml/Utils";
import { ImgLoaderHookerCore } from "./ImgLoaderHookerCore";
export declare class ImgLoaderHooker extends ImgLoaderHookerCore {
    thisWindow: Window;
    gSC2DataManager: SC2DataManager;
    gModUtils: ModUtils;
    constructor(thisWindow: Window, gSC2DataManager: SC2DataManager, gModUtils: ModUtils);
    protected hooked: boolean;
    protected setupHook(): void;
    waitInitCounter: number;
    protected waitKDLoadingFinished: () => void;
    init(): void;
    installHook(): void;
}
