import type JQueryStatic from 'jquery/JQueryStatic';
import type { SC2DataManager } from './SC2DataManager';
import type { ModUtils } from './Utils';
import type { JsPreloader } from './JsPreloader';
import type { ModLoadController } from './ModLoadController';
import type { AddonPluginManager } from './AddonPlugin';
import type { SC2JsEvalContext } from './SC2JsEvalContext';

// declare var $: JQueryStatic;
// declare var jQuery: JQueryStatic;

declare global {
    interface Window {
        jQuery: JQueryStatic;
        $: JQueryStatic;

        modSC2DataManager: SC2DataManager;
        modUtils: ModUtils;
        jsPreloader: JsPreloader;
        modModLoadController: ModLoadController;
        modAddonPluginManager: AddonPluginManager;
        modSC2JsEvalContext: SC2JsEvalContext;
    }
}
