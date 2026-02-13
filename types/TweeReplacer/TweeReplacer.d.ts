import type { AddonPluginHookPointEx } from "../ml/AddonPlugin";
import type { ModBootJsonAddonPlugin, ModInfo } from "../ml/ModLoader";
import type { ModZipReader } from "../ml/ModZipReader";
import type { SC2DataInfo } from "../ml/SC2DataInfoCache";
import type { SC2DataManager } from "../ml/SC2DataManager";
import type { ModUtils } from "../ml/Utils";
import type { TweeReplacerLinkerInterface, TweeReplacerLinkerClientInterface } from "../TweeReplacerLinker/TweeReplacerLinkerInterface";
interface ReplaceInfo {
    addonName: string;
    mod: ModInfo;
    modZip: ModZipReader;
}
export interface ReplaceParams {
    passage: string;
    findString?: string;
    findRegex?: string;
    regexFlag?: string;
    replace?: string;
    replaceFile?: string;
    debug?: boolean;
    all?: boolean;
}
export declare function isReplaceParams(p: any): p is ReplaceParams;
export interface ModBootJsonAddonPluginTweeReplacer extends ModBootJsonAddonPlugin {
    paramsFiles?: string[];
}
export declare class TweeReplacer implements AddonPluginHookPointEx, TweeReplacerLinkerClientInterface {
    gSC2DataManager: SC2DataManager;
    gModUtils: ModUtils;
    private logger;
    nowModName: string;
    constructor(gSC2DataManager: SC2DataManager, gModUtils: ModUtils);
    isLinkerMode: boolean;
    enableLinkerMode(): Promise<boolean>;
    linkerModRef: undefined | TweeReplacerLinkerInterface;
    afterEarlyLoad(): Promise<void>;
    info: Map<string, ReplaceInfo>;
    registerMod(addonName: string, mod: ModInfo, modZip: ModZipReader): Promise<void>;
    afterPatchModToGame(): Promise<void>;
    do_patch(ri: ReplaceInfo, sc: SC2DataInfo): Promise<void>;
    init(): void;
}
export {};
