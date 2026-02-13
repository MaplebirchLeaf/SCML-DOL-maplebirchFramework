import { SC2Passage } from "./SC2ApiRef";
import { SC2DataManager } from "./SC2DataManager";
export interface WikifyTracerCallback {
    /**
     * 可以修改输入文本内容
     * @param text              原始文本内容
     * @param passageTitle      passage标题
     * @param passageObj        passage对象
     * @return string           返回修改后的文本内容
     */
    beforePassage?: (text: string, passageTitle: string, passageObj: SC2Passage) => string;
    /**
     * 可以修改输出后的html树，只会在passage结束后调用
     * @param text          原始文本内容
     * @param passageTitle  passage标题
     * @param passageObj    passage对象
     * @param node          最终输出的html树
     */
    afterPassage?: (text: string, passageTitle: string, passageObj: SC2Passage, node: DocumentFragment) => void;
    beforeWikify?: (text: string) => string;
    /**
     * 可以修改输出后的html树，会在每一次wikify后调用，包括passage以及每个text节点
     * @param text      原始文本内容
     * @param node      最终输出的html树
     */
    afterWikify?: (text: string, node: DocumentFragment) => void;
    /**
     * 可以修改输入文本内容
     * @param text              原始文本内容
     * @param widgetName        widget名称
     * @param passageTitle      passage标题
     * @param passageObj        passage对象
     */
    beforeWidget?: (text: string, widgetName: string, passageTitle?: string, passageObj?: SC2Passage) => string;
    /**
     * 可以修改输出后的html树，会在每一次widget后调用
     * @param text              原始文本内容
     * @param widgetName        widget名称
     * @param passageTitle      passage标题
     * @param passageObj        passage对象
     * @param node              最终输出的html树
     */
    afterWidget?: (text: string, widgetName: string, passageTitle: string | undefined, passageObj: SC2Passage | undefined, node: DocumentFragment) => void;
}
export declare class WikifyTracerCallbackOrder {
    beforePassage: string[];
    afterPassage: string[];
    beforeWikify: string[];
    afterWikify: string[];
    beforeWidget: string[];
    afterWidget: string[];
    addCallback(key: string, c: WikifyTracerCallback): void;
    removeCallback(key: string, c: WikifyTracerCallback): void;
}
export declare class WikifyTracerCallbackCount {
    beforePassage: number;
    afterPassage: number;
    beforeWikify: number;
    afterWikify: number;
    beforeWidget: number;
    afterWidget: number;
    order: WikifyTracerCallbackOrder;
    addCallback(key: string, c: WikifyTracerCallback): void;
    removeCallback(key: string, c: WikifyTracerCallback): void;
    checkDataValid(): boolean;
}
export declare class WikifyTracer {
    gSC2DataManager: SC2DataManager;
    private logger;
    constructor(gSC2DataManager: SC2DataManager);
    private callbackTable;
    private callbackOrder;
    private callbackCount;
    addCallback(key: string, callback: WikifyTracerCallback): void;
    beforePassage(text: string, passageTitle: string, passageObj: SC2Passage): string;
    afterPassage(text: string, passageTitle: string, passageObj: SC2Passage, node: DocumentFragment): void;
    beforeWikify(text: string): string;
    afterWikify(text: string, node: DocumentFragment): void;
    beforeWidget(text: string, widgetName: string, passageTitle?: string, passageObj?: SC2Passage): string;
    afterWidget(text: string, widgetName: string, passageTitle: string | undefined, passageObj: SC2Passage | undefined, node: DocumentFragment): void;
}
