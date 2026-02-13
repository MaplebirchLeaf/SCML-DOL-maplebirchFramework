import { SC2DataManager } from "./SC2DataManager";
export interface SC2JsEvalContextInfo {
    contextThis: object;
}
export declare class SC2JsEvalContext {
    gSC2DataManager: SC2DataManager;
    constructor(gSC2DataManager: SC2DataManager);
    contextSet: SC2JsEvalContextInfo[];
    /**
     * call by SugarCube2 `Story.storyInit()`
     */
    newContext(id: string): object;
}
