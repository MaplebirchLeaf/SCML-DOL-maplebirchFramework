import type { AddonPluginHookPointEx } from "../ml/AddonPlugin";
import type { ModInfo } from "../ml/ModLoader";
import type { ModZipReader } from "../ml/ModZipReader";
import type { SC2DataInfo } from "../ml/SC2DataInfoCache";
import type { SC2DataManager } from "../ml/SC2DataManager";
import type { ModUtils } from "../ml/Utils";
interface ReplaceInfo {
    addonName: string;
    mod: ModInfo;
    modZip: ModZipReader;
}
export interface ReplaceParamsItem {
    from: string;
    to: string;
    fileName: string;
    debug?: boolean;
    all?: boolean;
}
export interface ReplaceParamsItemTwee {
    passageName: string;
    from: string;
    to: string;
    debug?: boolean;
    all?: boolean;
}
export interface ReplaceParams {
    js?: ReplaceParamsItem[];
    css?: ReplaceParamsItem[];
    twee?: ReplaceParamsItemTwee[];
}
export declare class ReplacePatcher implements AddonPluginHookPointEx {
    gSC2DataManager: SC2DataManager;
    gModUtils: ModUtils;
    private log;
    constructor(gSC2DataManager: SC2DataManager, gModUtils: ModUtils);
    info: Map<string, ReplaceInfo>;
    registerMod(addonName: string, mod: ModInfo, modZip: ModZipReader): Promise<void>;
    afterPatchModToGame(): Promise<void>;
    checkParams(p: any): p is ReplaceParams;
    do_patch(ri: ReplaceInfo, sc: SC2DataInfo): Promise<void>;
    patchInReplaceParamsItem(patchingModName: string, rpi: ReplaceParamsItem[], sc: SC2DataInfo['scriptFileItems'] | SC2DataInfo['styleFileItems']): void;
    patchInReplaceParamsItemTwee(patchingModName: string, rpi: ReplaceParamsItemTwee[], sc: SC2DataInfo['passageDataItems']): void;
    init(): void;
}
export {};
