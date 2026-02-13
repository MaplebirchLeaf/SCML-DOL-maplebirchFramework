import type { SC2DataManager } from "../../../dist-BeforeSC2/SC2DataManager";
import type { ModUtils } from "../../../dist-BeforeSC2/Utils";
import type { ModInfo } from "../../../dist-BeforeSC2/ModLoader";
import type { AddonPluginHookPointEx } from "../../../dist-BeforeSC2/AddonPlugin";
import type { ModZipReader } from "../../../dist-BeforeSC2/ModZipReader";
import { TweeReplacerLinkerClientCallbackType, TweeReplacerLinkerClientInterface, TweeReplacerLinkerInterface } from "./TweeReplacerLinkerInterface";
export interface TweeReplacerLinkerCallbackData {
    clientName: string;
    userModName: string;
    callback: TweeReplacerLinkerClientCallbackType;
}
export declare class TweeReplacerLinker implements AddonPluginHookPointEx, TweeReplacerLinkerInterface {
    gSC2DataManager: SC2DataManager;
    gModUtils: ModUtils;
    private logger;
    constructor(gSC2DataManager: SC2DataManager, gModUtils: ModUtils);
    canRegister: boolean;
    registerClient(client: TweeReplacerLinkerClientInterface): Promise<boolean>;
    userCallback: TweeReplacerLinkerCallbackData[];
    addUserMod(clientName: string, userModName: string, callback: TweeReplacerLinkerClientCallbackType): Promise<boolean>;
    registerMod(addonName: string, mod: ModInfo, modZip: ModZipReader): Promise<void>;
    afterPatchModToGame(): Promise<void>;
    init(): void;
}
