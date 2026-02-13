import { TypeOrderItemInterface } from "BeautySelectorAddonInterface";
import type { ModImg, ModInfo } from "../ml/ModLoader";
import type { ModZipReader } from "../ml/ModZipReader";
export interface BSModItem {
    name: string;
    mod: ModInfo;
    modZip: ModZipReader;
    params: BeautySelectorAddonParams;
    type: string[];
    typeImg: Map<string, Map<string, ModImgEx>>;
}
export interface ModImgEx extends ModImg {
    realPath: string;
}
export interface BeautySelectorAddonParamsType0 {
    type?: string;
}
export interface BeautySelectorAddonParamsType1 {
    type: string;
    imgFileList: string[];
}
export interface BeautySelectorAddonParamsType2ATypeItem {
    type: string;
    imgFileListFile: string;
}
export interface BeautySelectorAddonParamsType2BTypeItem {
    type: string;
    imgDir: string;
}
export interface BeautySelectorAddonParamsType2 {
    types: (BeautySelectorAddonParamsType2ATypeItem | BeautySelectorAddonParamsType2BTypeItem)[];
}
export type BeautySelectorAddonParams = BeautySelectorAddonParamsType0 | BeautySelectorAddonParamsType1 | BeautySelectorAddonParamsType2;
export interface TypeOrderItem extends TypeOrderItemInterface {
    type: string;
    modRef: BSModItem;
    imgListRef: Map<string, ModImgEx>;
}
