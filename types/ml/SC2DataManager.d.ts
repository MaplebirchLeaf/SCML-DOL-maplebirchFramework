import { PassageDataItem, SC2DataInfo, SC2DataInfoCache } from './SC2DataInfoCache';
import { ModLoader } from "./ModLoader";
import { SimulateMergeResult } from "./SimulateMerge";
import { ModLoadController } from "./ModLoadController";
import { AddonPluginManager } from "./AddonPlugin";
import { DependenceChecker } from "./DependenceChecker";
import { PassageTracer } from "./PassageTracer";
import { Sc2EventTracer } from "./Sc2EventTracer";
import { SC2JsEvalContext } from "./SC2JsEvalContext";
import { ModUtils } from "./Utils";
import { JsPreloader } from "./JsPreloader";
import { HtmlTagSrcHook } from "./HtmlTagSrcHook";
import { LanguageManager } from "./LanguageManager";
import { WikifyTracer } from "./WikifyTracer";
export declare class SC2DataManager {
    thisWin: Window;
    constructor(thisWin: Window);
    private modUtils;
    getModUtils(): ModUtils;
    private modLoadController;
    getModLoadController(): ModLoadController;
    get rootNode(): Element;
    get styleNode(): HTMLCollectionOf<HTMLStyleElement>;
    get scriptNode(): HTMLCollectionOf<HTMLScriptElement>;
    get passageDataNodeList(): Element[];
    checkSC2Data(): boolean;
    createNewSC2DataInfoFromNow(): SC2DataInfo;
    /**
     * 用于缓存原始的没有经过任何修改的原始的原版SC2Data
     * never set it to undefined OR overwrite it
     * @private
     */
    private originSC2DataInfoCache?;
    earlyResetSC2DataInfoCache(): void;
    cleanAllCacheAfterModLoadEnd(): void;
    initSC2DataInfoCache(): void;
    /**
     * 读取原始的没有被修改过的SC2Data，
     * 对于mod来说，如无必要不要使用这里的数据，
     * 特别是合并时不要使用此处的数据作为数据源，而是使用 getSC2DataInfoAfterPatch()，否则会覆盖之前的mod的修改，导致之前的修改无效
     */
    getSC2DataInfoCache(): SC2DataInfoCache;
    private modLoader?;
    getModLoader(): ModLoader;
    private passageTracer;
    getPassageTracer(): PassageTracer;
    private languageManager;
    getLanguageManager(): LanguageManager;
    private sc2EventTracer;
    getSc2EventTracer(): Sc2EventTracer;
    private jsPreloader;
    getJsPreloader(): JsPreloader;
    private addonPluginManager;
    getAddonPluginManager(): AddonPluginManager;
    private sC2JsEvalContext;
    getSC2JsEvalContext(): SC2JsEvalContext;
    private dependenceChecker;
    getDependenceChecker(): DependenceChecker;
    private htmlTagSrcHook;
    getHtmlTagSrcHook(): HtmlTagSrcHook;
    private wikifyTracer;
    getWikifyTracer(): WikifyTracer;
    private conflictResult?;
    startInitOk: boolean;
    startInit(): Promise<void>;
    getConflictResult(): {
        mod: SC2DataInfo;
        result: SimulateMergeResult;
    }[] | undefined;
    private cSC2DataInfoAfterPatchCache?;
    /**
     * 获取最新的SC2Data，此处获得的是之前的mod修改后的最新的SC2Data数据，
     * 此处使用了缓存，如果修改了SC2Data，请调用 flushAfterPatchCache() 来清除缓存，重新从html中读取最新的SC2Data
     */
    getSC2DataInfoAfterPatch(): SC2DataInfoCache;
    flushAfterPatchCache(): void;
    applyReplacePatcher(modSC2DataInfoCache: SC2DataInfo): Promise<void>;
    patchModToGame(): Promise<void>;
    makePassageNode(T: PassageDataItem): HTMLElement;
    makeStyleNode(sc: SC2DataInfo): HTMLStyleElement;
    makeScriptNode(sc: SC2DataInfo): HTMLScriptElement;
    rePlacePassage(toRemovePassageDataNodeList: Element[], toAddPassageDataNodeList: Element[]): void;
}
