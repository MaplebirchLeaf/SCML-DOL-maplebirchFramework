import type { AddonPluginHookPointEx } from "../ml/AddonPlugin";
import type { LogWrapper } from "../ml/ModLoadController";
import type { ModImg, ModInfo } from "../ml/ModLoader";
import type { ModZipReader } from "../ml/ModZipReader";
import type { SC2DataManager } from "../ml/SC2DataManager";
import type { ModUtils } from "../ml/Utils";
import type { HtmlTagSrcHookCheckModType } from "../ml/HtmlTagSrcHook";
import type { Passage } from "../ml/SugarCube2";
import { CssReplacer } from "./CssReplacer";
import { NodeMutationObserver } from "./NodeMutationObserver";
/**
 * @return Promise<boolean>      Promise<true> if handle by this hooker, otherwise Promise<false>.
 *
 * hooker can wait until the image loaded, and then call successCallback(src, layer, img) and return Promise<true>
 */
export interface ImgLoaderSideHooker {
    hookName: string;
    imageLoader: (src: string, layer: any, successCallback: (src: string, layer: any, img: HTMLImageElement) => void, errorCallback: (src: string, layer: any, event: any) => void) => Promise<boolean>;
    imageGetter: (src: string) => Promise<string | undefined>;
    checkImageExist?: HtmlTagSrcHookCheckModType;
}
export declare class ImgLoaderHookerCore implements AddonPluginHookPointEx {
    thisWindow: Window;
    gSC2DataManager: SC2DataManager;
    gModUtils: ModUtils;
    protected logger: LogWrapper;
    protected nodeMutationObserver: NodeMutationObserver;
    constructor(thisWindow: Window, gSC2DataManager: SC2DataManager, gModUtils: ModUtils);
    onModLoaderLoadEnd(): Promise<void>;
    protected dynamicImageTagReplaceTable: Set<string>;
    addDynamicImageTagReplacePassage(passageName: string): void;
    addListDynamicImageTagReplacePassage(passageNameList: string[]): void;
    replaceAllImageInHtmlElement(content: HTMLElement): Promise<void>;
    whenSC2PassageEnd(passage: Passage, content: HTMLDivElement): Promise<void>;
    cssReplacer: CssReplacer;
    replaceStyleSheets(): Promise<void>;
    whenSC2StoryReady(): Promise<void>;
    protected replaceImageInImgTags(img: HTMLImageElement, noLog?: boolean): Promise<void>;
    registerMod(addonName: string, mod: ModInfo, modZip: ModZipReader): Promise<void>;
    sideHooker: ImgLoaderSideHooker[];
    addSideHooker(hooker: ImgLoaderSideHooker): void;
    protected imgLookupTable: Map<string, {
        modName: string;
        imgData: ModImg;
    }[]>;
    removeModFromImgLookupTable(modNameList: string[]): void;
    addImages(modImg: ModImg[], modName: string): void;
    forceLoadModImage(mod: ModInfo, modZip: ModZipReader): void;
    debugGetImg(src: string): Promise<HTMLImageElement | undefined>;
    checkImageExist(src: string): boolean | undefined;
    protected getImage(src: string): Promise<string | undefined>;
    OriginalImageConstructor?: ImageConstructor;
    OriginalCreateElement?: typeof document['createElement'];
    /**
     * 归一化路径为相对路径格式
     * @param path 待归一化的路径
     * @returns 归一化后的相对路径（去除前导 / 和 ./）
     */
    normalizePath(path: string): string;
}
type ImageConstructor = {
    new (width?: number, height?: number): HTMLImageElement;
    prototype: HTMLImageElement;
};
export {};
