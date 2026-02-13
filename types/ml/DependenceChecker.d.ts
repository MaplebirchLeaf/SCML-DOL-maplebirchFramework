import { SC2DataManager } from "SC2DataManager";
import { ModUtils } from "./Utils";
import { ModInfo } from "./ModLoader";
import { LogWrapper } from "./ModLoadController";
import { ModOrderContainer } from "./ModOrderContainer";
export declare class InfiniteSemVerApi {
    parseRange: typeof import("./SemVer/InfiniteSemVer").parseVersionRange;
    parseVersion: typeof import("./SemVer/InfiniteSemVer").parseInfiniteSemVer;
    satisfies: typeof import("./SemVer/InfiniteSemVer").isWithinRange;
}
export declare class DependenceChecker {
    gSC2DataManager: SC2DataManager;
    gModUtils: ModUtils;
    log: LogWrapper;
    constructor(gSC2DataManager: SC2DataManager, gModUtils: ModUtils);
    getInfiniteSemVerApi(): InfiniteSemVerApi;
    /**
     * 检查指定mod是否满足指定mod集合作为前序mod的依赖关系
     *
     * check if the mod satisfies the dependencies of the specified mod set as the previous mod
     *
     * @param {ModInfo} mod - The mod to check for dependencies.
     * @param {ModOrderContainer[]} modCaches - An array of mod order containers.
     * @return {boolean} - Returns true if the mod satisfies its dependencies, false otherwise.
     */
    checkFor(mod: ModInfo, modCaches: ModOrderContainer[]): boolean;
    /**
     * 检查整个加载完毕的mod列表是否满足依赖约束
     *
     * Checks the dependencies of the mod order and verifies if they are satisfied.
     *
     * @return {boolean} - Returns true if all dependencies are satisfied, otherwise returns false.
     */
    check(): boolean;
    /**
     * this called by mod `CheckGameVersion`
     * because the game version only can get after game loaded
     * @param gameVersion
     */
    checkGameVersion(gameVersion: string): boolean;
}
