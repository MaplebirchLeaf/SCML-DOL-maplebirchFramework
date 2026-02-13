import type { Passage } from "./SugarCube2";
import { SC2DataManager } from "./SC2DataManager";
import { WeakPoolRef } from "./WeakRefPool/WeakRefPool";
export interface Sc2EventTracerCallback {
    whenSC2StoryReady?: () => any;
    whenSC2PassageInit?: (passage: Passage) => any;
    whenSC2PassageStart?: (passage: Passage, content: HTMLDivElement) => any;
    whenSC2PassageRender?: (passage: Passage, content: HTMLDivElement) => any;
    whenSC2PassageDisplay?: (passage: Passage, content: HTMLDivElement) => any;
    whenSC2PassageEnd?: (passage: Passage, content: HTMLDivElement) => any;
}
export declare class Sc2EventTracer {
    thisWin: Window;
    gSC2DataManager: SC2DataManager;
    constructor(thisWin: Window, gSC2DataManager: SC2DataManager);
    callback: Sc2EventTracerCallback[];
    callbackLog: [string, WeakPoolRef<Sc2EventTracerCallback>, ...WeakPoolRef<any>[]][];
    init(): void;
    addCallback(cb: Sc2EventTracerCallback): void;
}
