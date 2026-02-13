import type { AddonPluginHookPointEx } from "../ml/AddonPlugin";
import type { SC2DataManager } from "../ml/SC2DataManager";
import type { ModUtils } from "../ml/Utils";
import { ModSubUiAngularJsBody } from './ModSubUiAngularJsBody';
import { ModInfo } from "../ml/ModLoader";
import { ModZipReader } from "../ml/ModZipReader";
import { ModSubUiAngularJsModeExportInterface } from "./ModSubUiAngularJsModeExportInterface";
export declare const BuildInComponentList: import("./AngularJs/ExternalComponentManagerInterface").ComponentRegistryCallback[];
export declare class ModSubUiAngularJs extends ModSubUiAngularJsBody implements AddonPluginHookPointEx, ModSubUiAngularJsModeExportInterface {
    gSC2DataManager: SC2DataManager;
    gModUtils: ModUtils;
    private logger;
    nowModName: string;
    constructor(gSC2DataManager: SC2DataManager, gModUtils: ModUtils);
    registerMod(addonName: string, mod: ModInfo, modZip: ModZipReader): Promise<any>;
    whenSC2PassageEnd(): Promise<void>;
    protected buildInComponentInstalled: boolean;
    installBuildInComponent(): void;
}
