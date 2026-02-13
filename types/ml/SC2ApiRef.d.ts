import { SC2DataManager } from "./SC2DataManager";
export type throwErrorType = (place: Node, message: string, source?: string) => boolean;
export interface SC2Passage {
    title: string;
    tags: string[];
    element: any | undefined;
    domId: string;
    classes: string[];
    readonly className: string;
    readonly text: string;
    description: () => string;
    processText: () => string;
    render: (options: any) => DocumentFragment;
}
export declare namespace SC2Passage {
    function getExcerptFromNode(node: Node, count: string): string;
    function getExcerptFromText(text: string, count: string): string;
}
export interface SC2Story {
    load: () => void;
    init: () => void;
    readonly title: string;
    readonly domId: string;
    readonly ifId: string;
    add: (passage: SC2Passage) => boolean;
    has: (title: string) => boolean;
    get: CallableFunction;
    getAllInit: () => any[];
    getAllRegular: () => any;
    getAllScript: () => any[];
    getAllStylesheet: () => any[];
    getAllWidget: () => any[];
    lookup: CallableFunction;
    lookupWith: CallableFunction;
}
export interface SC2MacroContext {
    self: SC2MacroContext;
    parent: SC2MacroContext;
    passageObj: SC2Passage;
    name: string;
    displayName: string;
    args: string[];
    payload: string | any;
    source: string;
    parser: any;
    readonly output: string;
    readonly shadows: any[];
    readonly shadowView: any[];
    readonly debugView: any;
    contextHas: (filter: any) => boolean;
    contextSelect: (filter: any) => SC2MacroContext | undefined;
    contextSelectAll: () => SC2MacroContext[];
    addShadow: (...names: string[]) => void;
    createShadowWrapper: (callback: Function, doneCallback: Function, startCallback: Function) => ((...args: any[]) => void);
    createDebugView: (name: string, title: string) => any;
    removeDebugView: () => void;
    error: (message: string, source?: string) => ReturnType<throwErrorType>;
}
export interface SC2MacroObject {
    isWidget: boolean | undefined;
    tags: string[] | undefined;
    handler: (this: SC2MacroContext) => any;
}
export interface SC2MacroTags {
    register: (parent: string, bodyTags: string | string[]) => void;
    unregister: (parent: string) => void;
    has: (parent: string) => boolean;
    get: (parent: string) => string[];
}
export interface SC2Macro {
    add: (name: string | string[], def: SC2MacroContext) => void;
    delete: (name: string | string[]) => void;
    isEmpty: () => boolean;
    has: (name: string) => boolean;
    get: (name: string) => undefined | SC2MacroContext;
    init: (handler: string) => void;
    tags: SC2MacroTags;
}
export interface SC2Scripting {
    parse: (rawCodeString: string) => string;
    evalJavaScript: (code: string, output?: any, data?: any) => string;
    evalTwineScript: (code: string, output?: any, data?: any) => string;
}
export interface SC2Wikifier {
    passageObj: SC2Passage;
    source: string;
    options: any;
    nextMatch: number;
    output: any;
    subWikify: (output: Node, terminator: string | RegExp, options: any, passageObj: SC2Passage) => void;
    outputText: (destination: Node, startPos: number, endPos: number) => void;
    _callDepth: number;
    _passageTitleLast: string;
    _passageObjLast: SC2Passage | undefined;
    _lastPassageQ: {
        passageObj: SC2Passage;
        passageTitle: string;
    }[];
}
export declare namespace SC2Wikifier {
    function lastPassageQPush(passageObj: SC2Passage, passageTitle: string): number;
    function lastPassageQPop(): number;
    function lastPassageQSize(): number;
    function lastPassageQFront(): [number, SC2Passage];
    function lastPassageQBack(): [number, SC2Passage];
    function getLastPossiblePassageTitle(): string;
    function getPassageTitleLast(): string;
    function getPassageObjLast(): SC2Passage;
    function wikifyEval(text: string, passageObj?: SC2Passage, passageTitle?: string): DocumentFragment;
    function createInternalLink(destination: DocumentFragment, passage: SC2Passage, text: string, callback: Function): DocumentFragment;
    function createExternalLink(destination: DocumentFragment, url: string, text: string): DocumentFragment;
    function isExternalLink(link: string): boolean;
}
export interface SC2ApiType {
    State: any;
    Story: SC2Story;
    Util: any;
    Wikifier: SC2Wikifier;
    Config: any;
    Engine: any;
    Macro: SC2Macro;
    Scripting: SC2Scripting;
    Setting: any;
    Save: any;
    Passage: SC2Passage;
}
export declare class SC2ApiRef {
    gSC2DataManager: SC2DataManager;
    constructor(gSC2DataManager: SC2DataManager);
    isInit: boolean;
    init(): void;
}
