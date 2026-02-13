import type {SC2DataManager} from "../ml/SC2DataManager";
import type {ModUtils} from "../ml/Utils";
import type jQuery from "jquery/misc";
import type { Gui } from "./Gui";
import type { LoadingProgress } from "./LoadingProgress";
declare global {
    interface Window {
        modUtils: ModUtils;
        modSC2DataManager: SC2DataManager;

        modLoaderGui: Gui;
        modLoaderGui_LoadingProgress: LoadingProgress;

        jQuery: jQuery;
    }

    var StartConfig: any;
}
