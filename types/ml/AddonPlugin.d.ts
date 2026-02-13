import { ModInfo } from "./ModLoader";
import { ModZipReader } from "./ModZipReader";
import { ModLoadController } from 'ModLoadController';
import JSZip from 'jszip';
import { SC2DataManager } from "./SC2DataManager";
import { Sc2EventTracerCallback } from "./Sc2EventTracer";
import { Passage } from "./SugarCube2";
type AddonPluginHookType = () => Promise<any>;
export interface AddonPluginHookPoint {
    afterInit?: AddonPluginHookType;
    afterInjectEarlyLoad?: AddonPluginHookType;
    afterModLoad?: AddonPluginHookType;
    afterEarlyLoad?: AddonPluginHookType;
    afterRegisterMod2Addon?: AddonPluginHookType;
    beforePatchModToGame?: AddonPluginHookType;
    afterPatchModToGame?: AddonPluginHookType;
    afterPreload?: AddonPluginHookType;
}
export type AddonPluginHookPoint_K = keyof AddonPluginHookPoint;
export type AddonPluginHookPointWhenSC2 = {
    whenSC2StoryReady?: () => Promise<any>;
    whenSC2PassageInit?: (passage: Passage) => Promise<any>;
    whenSC2PassageStart?: (passage: Passage, content: HTMLDivElement) => Promise<any>;
    whenSC2PassageRender?: (passage: Passage, content: HTMLDivElement) => Promise<any>;
    whenSC2PassageDisplay?: (passage: Passage, content: HTMLDivElement) => Promise<any>;
    whenSC2PassageEnd?: (passage: Passage, content: HTMLDivElement) => Promise<any>;
};
export type AddonPluginHookPointWhenSC2_T = AddonPluginHookPointWhenSC2;
export type AddonPluginHookPointWhenSC2_K = keyof AddonPluginHookPointWhenSC2_T;
export type AddonPluginHookPointExOptional = {
    /**
     * registerMod() will be called when export debug data, this is a chance to export addon data for debug, like when addon change data in memory
     *
     * registerMod() 会在导出 debug data 时被调用，这是导出 addon 数据的机会，比如当 addon 在内存中改变了数据。
     * 举个例子，衣服扩展框架可以收集所有衣服mod的数据，统一在文件或内存中修改衣服数据，如果是在文件中修改那么会被默认导出，但如果是在内存中修改，则最好使用这个 hook 来导出数据以便 debug
     *
     * @optional
     * @param zip the zip file to storage debug data
     * @return   return the same zip file or a new zip file, recommend return the same zip file
     */
    exportDataZip?: (zip: JSZip) => Promise<JSZip>;
};
export type AddonPluginHookPointExMustImplement = {
    /**
     * registerMod() will be called when mod loaded and that mod require this addon, addon can read info from mod and do something
     *
     * registerMod() 会在 mod 加载完毕并且 mod 需要这个 addon 时被调用，addon 可以从 mod 读取信息并做一些事情。
     * 举个例子，衣服扩展框架可以在这里读取衣服mod的数据，然后统一修改衣服数据，这样就可以避免多个不同的衣服mod前后修改衣服数组导致意外损坏衣服数组的数据。
     * @mustImplement
     * @param addonName the mod require this addon
     * @param mod       the mod info
     * @param modZip    the mod zip file reader
     */
    registerMod: (addonName: string, mod: ModInfo, modZip: ModZipReader) => Promise<any>;
};
/**
 * AddonPluginHookPointEx is a interface for addon plugin to implement API Hook,
 * addon plugin can implement any hook, but must implement registerMod(),
 * addon can impl more API in there, to let mod call it to get more function.
 *
 * AddonPluginHookPointEx 是 addon plugin 用来实现 API Hook 的接口，
 * addon plugin 可以实现任何 hook，但是必须实现 registerMod()，
 * addon 可以在里面实现更多 API，让 mod 调用它来获得更多功能。
 */
export interface AddonPluginHookPointEx extends AddonPluginHookPoint, AddonPluginHookPointExOptional, AddonPluginHookPointExMustImplement, AddonPluginHookPointWhenSC2 {
}
export declare class AddonPlugin {
    modName: string;
    addonName: string;
    hookPoint: AddonPluginHookPointEx;
    constructor(modName: string, addonName: string, hookPoint: AddonPluginHookPointEx);
}
export declare class AddonPluginManager implements Sc2EventTracerCallback {
    gSC2DataManager: SC2DataManager;
    gModLoadController: ModLoadController;
    private addonPluginTable;
    private log;
    private passageTracer;
    private sc2EventTracer;
    constructor(gSC2DataManager: SC2DataManager, gModLoadController: ModLoadController);
    /**
     * inner use
     */
    whenSC2StoryReady(): Promise<any>;
    /**
     * inner use
     */
    whenSC2PassageInit(passage: Passage): Promise<any>;
    /**
     * inner use
     */
    whenSC2PassageStart(passage: Passage, content: HTMLDivElement): Promise<any>;
    /**
     * inner use
     */
    whenSC2PassageRender(passage: Passage, content: HTMLDivElement): Promise<any>;
    /**
     * inner use
     */
    whenSC2PassageDisplay(passage: Passage, content: HTMLDivElement): Promise<any>;
    /**
     * inner use
     */
    whenSC2PassageEnd(passage: Passage, content: HTMLDivElement): Promise<any>;
    /**
     * call by ModLoader (inner use)
     *
     * register a mod to addon plugin, after all mod loaded and after EarlyLoad executed.
     *
     * @param mod
     * @param modZip
     */
    registerMod2Addon(mod: ModInfo, modZip: ModZipReader): Promise<void>;
    /**
     * call by ModLoaderGui (inner use)
     * @param zip
     */
    exportDataZip(zip: JSZip): Promise<JSZip>;
    /**
     * call by ModLoader (inner use)
     * @param hook
     */
    triggerHook(hook: AddonPluginHookPoint_K): Promise<void>;
    /**
     * call by ModLoader (inner use)
     */
    triggerHookWhenSC2<K extends AddonPluginHookPointWhenSC2_K>(hook: K, ...params: Parameters<NonNullable<AddonPluginHookPointWhenSC2_T[K]>>): Promise<void>;
    /**
     * check if a addon plugin is duplicate
     * @param modName
     * @param addonName
     */
    checkDuplicate(modName: string, addonName: string): boolean;
    /**
     * register a addon plugin, call by addon plugin,
     * this call must be done when InjectEarlyLoad.
     *
     * 注册一个 addon plugin，由 addon plugin 调用，必须在 InjectEarlyLoad 时调用此函数注册 Addon。
     * @param modName    addon plugin's mod name
     * @param addonName  addon plugin's name
     * @param hookPoint  addon plugin's hook point
     */
    registerAddonPlugin(modName: string, addonName: string, hookPoint: AddonPluginHookPointEx): void;
    /**
     * get a addon plugin, call by mod
     *
     * 获取一个 addon plugin，由 mod 调用。 mod 可以读取 addon plugin 的 hookPoint 来调用 addon plugin 的 API
     * @param modName    addon plugin's mod name
     * @param addonName  addon plugin's name
     */
    getAddonPlugin(modName: string, addonName: string): AddonPluginHookPointEx | undefined;
}
export {};
