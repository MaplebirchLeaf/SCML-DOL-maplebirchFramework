import type { LogWrapper } from "../ml/ModLoadController";
import type { AddonPluginHookPointEx } from "../ml/AddonPlugin";
import type { SC2DataManager } from "../ml/SC2DataManager";
import type { ModUtils } from "../ml/Utils";
import type { IModImgGetter, ModInfo } from "../ml/ModLoader";
import type { ModZipReader } from "../ml/ModZipReader";
import { BeautySelectorAddonParamsType0, BeautySelectorAddonParamsType1, BeautySelectorAddonParamsType2, BeautySelectorAddonParamsType2ATypeItem, BeautySelectorAddonParamsType2BTypeItem, TypeOrderItem } from "./BeautySelectorAddonType";
import { BeautySelectorAddonInterface } from "./BeautySelectorAddonInterface";
import type { ModSubUiAngularJsModeExportInterface } from "../ModSubUiAngularJs/ModSubUiAngularJsModeExportInterface";
import { CachedFileList, ModImageStore } from "./ModImageStore";
export declare function imgWrapBase64Url(fileName: string, base64: string): string;
export declare class BeautySelectorAddonImgGetterIndexedDB implements IModImgGetter {
    modName: string;
    modHashString: string;
    imgPath: string;
    imageStore: ModImageStore;
    logger: LogWrapper;
    constructor(modName: string, modHashString: string, imgPath: string, imageStore: ModImageStore, logger: LogWrapper);
    invalid: boolean;
    forceCache(): Promise<void>;
    getBase64Image(): Promise<string | undefined>;
}
export declare function isParamsType0(a: any): a is BeautySelectorAddonParamsType0;
export declare function isParamsType1(a: any): a is BeautySelectorAddonParamsType1;
export declare function isParamsType2AItem(a: any): a is BeautySelectorAddonParamsType2ATypeItem;
export declare function isParamsType2BItem(a: any): a is BeautySelectorAddonParamsType2BTypeItem;
export declare function isParamsType2(a: any): a is BeautySelectorAddonParamsType2;
export declare function getDirFromPath(path: string): string;
export declare class BeautySelectorAddon implements AddonPluginHookPointEx, BeautySelectorAddonInterface {
    gSC2DataManager: SC2DataManager;
    gModUtils: ModUtils;
    private logger;
    constructor(gSC2DataManager: SC2DataManager, gModUtils: ModUtils);
    protected cachedFileList: CachedFileList;
    protected imageStore: ModImageStore;
    protected typeOrderSubUi?: TypeOrderSubUi;
    onModLoaderLoadEnd(): Promise<void>;
    private table;
    private typeOrder;
    getTypeOrder(): TypeOrderItem[];
    typeOrderUsed?: TypeOrderItem[];
    getUsingTypeOrder(): undefined | {
        type: string;
        modName: string;
    }[];
    protected registerModNameSet: Set<string>;
    type0ModNameList: string[];
    registerMod(addonName: string, mod: ModInfo, modZip: ModZipReader): Promise<void>;
    imageLoader(src: string, layer: any, successCallback: (src: string, layer: any, img: HTMLImageElement) => void, errorCallback: (src: string, layer: any, event: any) => void): Promise<boolean>;
    errorCount: number;
    imageGetter(src: string): Promise<string | undefined>;
    checkImageExist(src: string): boolean | undefined;
    init(): void;
    iniCustomStore(): Promise<void>;
    loadSavedOrder(): Promise<undefined>;
    saveOrder(list: string[]): Promise<void>;
    BeautySelectorAddon_dbName: string;
    BeautySelectorAddon_storeName: string;
    BeautySelectorAddon_OrderSaveKey: string;
    customStore?: ReturnType<ReturnType<ModUtils['getIdbKeyValRef']>['createStore']>;
    IdbKeyValRef: ReturnType<ModUtils['getIdbKeyValRef']>;
}
export declare class TypeOrderSubUi {
    modSubUiAngularJsService: typeof window['modLoaderGui_ModSubUiAngularJsService'];
    beautySelectorAddon: BeautySelectorAddon;
    constructor(modSubUiAngularJsService: typeof window['modLoaderGui_ModSubUiAngularJsService'], beautySelectorAddon: BeautySelectorAddon);
    init(): Promise<void>;
    whenCreate(Ref: ModSubUiAngularJsModeExportInterface): Promise<void>;
}
