import { SC2DataManager } from "./SC2DataManager";
import { LogWrapper } from "./ModLoadController";
export type HtmlTagSrcHookType = (el: HTMLImageElement | HTMLElement, mlSrc: string, field: string) => Promise<boolean>;
export type HtmlTagSrcReturnModeHookType = (mlSrc: string) => Promise<[boolean, string]>;
export type HtmlTagSrcHookCheckModType = (mlSrc: string) => boolean | undefined;
/**
 * this class replace html image tag src/href attribute ,
 * redirect the image request to a mod like `ImgLoaderHooker` to load the image.
 */
export declare class HtmlTagSrcHook {
    gSC2DataManager: SC2DataManager;
    logger: LogWrapper;
    constructor(gSC2DataManager: SC2DataManager);
    private hookTable;
    private hookReturnModeTable;
    private hookCheckExistTable;
    addHook(hookKey: string, hook: HtmlTagSrcHookType): void;
    addReturnModeHook(hookKey: string, hook: HtmlTagSrcReturnModeHookType): void;
    addCheckExistHook(hookKey: string, hook: HtmlTagSrcHookCheckModType): void;
    /**
     * check image exist
     *
     * @param src
     * @return true: exist ; false: not exist ; undefined: not exist but not sure (maybe exist but now not find.);
     */
    checkImageExist(src: string): boolean | undefined;
    /**
     * get image from mod
     * @param src  image path
     * @return image base64 string
     */
    requestImageBySrc(src: string): Promise<string | undefined>;
    /**
     * 归一化路径为相对路径格式
     * @param path 待归一化的路径
     * @returns 归一化后的相对路径（去除前导 / 和 ./）
     */
    normalizePath(path: string): string;
}
