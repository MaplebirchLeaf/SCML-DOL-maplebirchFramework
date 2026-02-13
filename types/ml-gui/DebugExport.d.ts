import type { AddonPluginManager } from "../ml/AddonPlugin";
import type { ModLoadController } from "../ml/ModLoadController";
import type { ModOrderItem } from "../ml/ModOrderContainer";
import type { SC2DataManager } from "../ml/SC2DataManager";
import type { ModUtils } from "../ml/Utils";
import type { LoadingProgress } from "./LoadingProgress";
import JSZip from 'jszip';
export declare class DebugExport {
    gSC2DataManager: SC2DataManager;
    gModUtils: ModUtils;
    gLoadingProgress: LoadingProgress;
    addonPluginManager: AddonPluginManager;
    modLoadController: ModLoadController;
    constructor(gSC2DataManager: SC2DataManager, gModUtils: ModUtils, gLoadingProgress: LoadingProgress);
    exportData(passageDir?: boolean): Promise<Blob>;
    exportMod(zip: JSZip, mod: ModOrderItem): Promise<void>;
    createDownload(blob: Blob, fileName: string): void;
    calcExportName(): string;
}
