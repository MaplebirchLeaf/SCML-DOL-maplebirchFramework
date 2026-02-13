import { SC2DataManager } from "./SC2DataManager";
import _ from "lodash";
import { ModZipReader, Twee2PassageR } from "./ModZipReader";
import { PassageDataItem, SC2DataInfo, SC2DataInfoCache } from "./SC2DataInfoCache";
import { SimulateMergeResult } from "./SimulateMerge";
import { ModBootJsonAddonPlugin, ModInfo, ModLoader } from "./ModLoader";
import { LogWrapper, ModLoadController } from "./ModLoadController";
import { AddonPluginManager } from "./AddonPlugin";
import { SemVerToolsType } from "./SemVer/InfiniteSemVer";
import { IdbKeyValRef, IdbRef } from "./IdbKeyValRef";
import { ModLoadFromSourceType } from "./ModOrderContainer";
import { JSZipLikeReadOnlyInterface } from "./JSZipLikeReadOnlyInterface";
export declare class ModUtils {
    pSC2DataManager: SC2DataManager;
    thisWin: Window;
    get version(): string;
    constructor(pSC2DataManager: SC2DataManager, thisWin: Window);
    getThisWindow(): Window;
    /**
     * 获取所有mod的名字
     * 以mod加载顺序为序
     */
    getModListName(): string[];
    getModListNameNoAlias(): string[];
    getAnyModByNameNoAlias(name: string): ModInfo | undefined;
    /**
     * 获取指定mod的信息
     * @param name ModName
     * @return ModInfo | undefined
     */
    getMod(name: string): ModInfo | undefined;
    getModAndFromInfo(name: string): undefined | {
        name: string;
        mod: ModInfo;
        from: ModLoadFromSourceType;
    };
    getAllModInfoByFromType(from: ModLoadFromSourceType): {
        name: string;
        mod: ModInfo;
        from: ModLoadFromSourceType;
    }[];
    /**
     * 获取指定mod的Zip
     * @param modName ModName
     * @return ModZipReader | undefined
     */
    getModZip(modName: string): ModZipReader | undefined;
    /**
     * 获取指定Passage的信息
     * @param name PassageName
     * @return PassageDataItem | undefined
     */
    getPassageData(name: string): PassageDataItem | undefined;
    /**
     * 获取所有Passage的信息
     * @return PassageDataItem[]
     */
    getAllPassageData(): PassageDataItem[];
    /**
     * 获取当前最新的SC2DataInfo，其中存储了所有SC2引擎的数据，包括js/css/passage
     * @return SC2DataInfo
     */
    createNewSC2DataInfoFromNow(): SC2DataInfoCache;
    /**
     * 批量更新passage数据，如果存在则覆盖，如果不存在则创建
     * @param pd 需要更新的passage列表
     * @param replaceForce 强制覆盖而不提示警告
     */
    updatePassageDataMany(pd: PassageDataItem[], replaceForce?: boolean): void;
    replaceFollowSC2DataInfo(newSC2Data: SC2DataInfo, oldSC2DataCache: SC2DataInfoCache): void;
    /**
     * 更新passage数据，如果存在则覆盖，如果不存在则创建
     * @param name passageName
     * @param content passageContent
     * @param tags passageTags [] OR ['widget']
     * @param pid passagePid 默认是 0 ， 如果不是故意覆盖已有的passage那么就填 0 即可
     * @deprecated use `CodeExample/how-to-modify-sc2data.ts` instead
     */
    updatePassageData(name: string, content: string, tags?: string[], pid?: undefined | number): void;
    /**
     * 从一个twee文件中分离出多个passage，工具函数
     * @param fileString 文件内容字符串
     */
    splitPassageFromTweeFile(fileString: string): Twee2PassageR[];
    /**
     * 获取mod冲突及覆盖的计算结果，可获知mod之间是否有互相覆盖的情况，如果没有mod则返回空数组
     *
     * 注意，此处只能获取模拟计算mod添加的文件互相的冲突关系，且不包含mod的js动态修改的内容，实际结果可能与这里不一致，
     *
     * @return { mod: SC2DataInfo, result: SimulateMergeResult }[]
     *              mod    mod添加的内容，其中 dataSource 是 modName
     *              result 覆盖结果，其中的 ResultItem[conflict] (Set<string>) 就是互相覆盖的部分的名字（passageName或js/css文件名）
     */
    getModConflictInfo(): {
        mod: SC2DataInfo;
        result: SimulateMergeResult;
    }[];
    /**
     * 将字符串对正则表达式转义，用于直接将字符串用在正则表达式匹配前的消毒处理
     * @param pattern   需要转义的字符串
     * @return string   转义后的字符串
     */
    escapedPatternString(pattern: string): string;
    /**
     * 尝试在指定位置附近替换字符串
     * @param content       原始字符串
     * @param searchString  需要查找的字符串
     * @param replaceString     需要替换的字符串
     * @param positionHint      查找的位置
     * @param tolerance1        第一阶快速查找容差 见 @ref tryStringSearch
     * @param tolerance2Negative    第二阶正则查找（负方向）容差 见 @ref tryStringSearch
     * @param tolerance2Positive    第二阶正则查找（正方向）容差 见 @ref tryStringSearch
     * @return  string  替换后的字符串
     */
    tryStringReplace(content: string, searchString: string, replaceString: string, positionHint: number, tolerance1?: number, tolerance2Negative?: number, tolerance2Positive?: number): string;
    /**
     * 尝试在指定位置附近查找字符串
     * @param content  原始字符串
     * @param searchString  需要查找的字符串
     * @param positionHint  查找的位置
     * @param tolerance1    第一阶快速查找容差，（常数字符串比对），如果为0则不使用。此方法可在正负tolerance1个位置范围下查找
     * @param tolerance2Negative    第二阶正则查找（负方向）容差，（正则字符串比对）。
     * @param tolerance2Positive    第二阶正则查找（正方向）容差，（正则字符串比对）。如果正负都为0则不使用。此方法可在正负tolerance2Negative个位置范围下查找。
     * @return  number  查找到的位置，如果没有找到则返回undefined
     */
    tryStringSearch(content: string, searchString: string, positionHint: number, tolerance1?: number, tolerance2Negative?: number, tolerance2Positive?: number): number | undefined;
    /**
     * 在指定位置插入字符串
     * @param content  原始字符串
     * @param insertString  需要插入的字符串
     * @param position  插入的位置
     * @return string   插入后的字符串
     */
    insertStringInPosition(content: string, insertString: string, position: number): string;
    getLodash(): _.LoDashStatic;
    getModLoadController(): ModLoadController;
    getModLoader(): ModLoader;
    getAddonPluginManager(): AddonPluginManager;
    getLogger(): LogWrapper;
    lazyRegisterNewModZipData(data: ArgumentTypes<JSZipLikeReadOnlyInterface['loadAsync']>[0], options?: any): Promise<boolean>;
    parseModPack(modPackBuffer: Uint8Array, password?: string | undefined): Promise<import("./ModPack/ModMeta").ModMeta>;
    getNowRunningModName(): string | undefined;
    getSemVerTools(): SemVerToolsType;
    getModZipReaderStaticClassRef: () => {
        LocalStorageLoader: typeof import("./ModZipReader").LocalStorageLoader;
        IndexDBLoader: typeof import("./ModZipReader").IndexDBLoader;
        LocalLoader: typeof import("./ModZipReader").LocalLoader;
        RemoteLoader: typeof import("./ModZipReader").RemoteLoader;
    };
    getImage(imagePath: string): Promise<string | undefined>;
    getLanguageManager(): import("./LanguageManager").LanguageManager;
    getNowMainLanguage(): 'en' | 'zh' | string;
    getIdbKeyValRef(): IdbKeyValRef;
    getIdbRef(): IdbRef;
    /**
     *
     * const modAddonPluginsParams = window.modUtils.getAddonParamsFromModInfo(modInfo, 'BeautySelectorAddon', 'BeautySelectorAddon');
     *
     * @param modInfo   params 2 of registerMod callback
     * @param addonPluginModName params 1 of registerAddonPlugin
     * @param addonName  params 2 of registerAddonPlugin
     */
    getAddonParamsFromModInfo<P>(modInfo: ModInfo, addonPluginModName: string, addonName: string): P | undefined;
    getAddonParamsFromModInfo(modInfo: ModInfo, addonPluginModName: string, addonName: string): ModBootJsonAddonPlugin['params'] | undefined;
}
export type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
