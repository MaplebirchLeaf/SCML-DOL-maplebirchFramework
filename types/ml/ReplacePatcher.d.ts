import { SC2DataInfo } from "./SC2DataInfoCache";
import { LogWrapper } from "./ModLoadController";
export interface PatchInfo {
    js?: PatchInfoItem[];
    css?: PatchInfoItem[];
    twee?: PatchInfoItem[];
}
export interface PatchInfoItem {
    from: string;
    to: string;
    fileName: string;
    passageName?: string;
}
export declare function checkPatchInfo(o: any): o is PatchInfo;
interface PatchInfoMap {
    js: Map<string, PatchInfoItem[]>;
    css: Map<string, PatchInfoItem[]>;
    twee: Map<string, PatchInfoItem[]>;
}
export declare class ReplacePatcher {
    logger: LogWrapper;
    modName: string;
    patchFileName: string;
    patchInfo_: any;
    patchInfo: PatchInfo;
    patchInfoMap: PatchInfoMap;
    constructor(logger: LogWrapper, modName: string, patchFileName: string, patchInfo_: any);
    applyReplacePatcher(modSC2DataInfoCache: SC2DataInfo): void;
}
export {};
