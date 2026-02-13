import type {SC2DataManager} from "../ml/SC2DataManager";
import type {ModUtils} from "../ml/Utils";
import type jQuery from "jquery/misc";
import type { BeautySelectorAddon } from "./BeautySelectorAddon";
import type { ImgLoaderHooker } from "../ml/ImgLoaderHooker";
import type { ModSubUiAngularJsService } from "../ModSubUiAngularJs/ModSubUiAngularJsService";

declare global {
    interface Window {
        modUtils: ModUtils;
        modSC2DataManager: SC2DataManager;

        jQuery: jQuery;

        addonBeautySelectorAddon: BeautySelectorAddon;
        modImgLoaderHooker: ImgLoaderHooker;

        modLoaderGui_ModSubUiAngularJsService: ModSubUiAngularJsService;
    }
}
