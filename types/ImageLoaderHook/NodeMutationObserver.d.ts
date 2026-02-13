import type { LogWrapper } from "../ml/ModLoadController";
import type { ModUtils } from "../ml/Utils";
export declare class NodeMutationObserver {
    replaceUrlAsync: (url: string) => Promise<string | undefined>;
    gModUtils: ModUtils;
    protected logger: LogWrapper;
    protected observer: MutationObserver;
    protected originalCreateElement: typeof document.createElement;
    protected originalImage: typeof Image;
    protected processingElements: WeakMap<HTMLElement, Set<string>>;
    protected processingUrls: WeakMap<HTMLElement, Map<string, string>>;
    constructor(replaceUrlAsync: (url: string) => Promise<string | undefined>, gModUtils: ModUtils);
    protected TARGET_TAGS: Map<string, string[]>;
    protected AttributeFilter: string[];
    /**
     * 启动观察器
     * 必须调用此方法代码才会生效
     */
    start(): void;
    stop(): void;
    /**
     * 处理单个节点
     */
    processNode(node: HTMLElement, noLog?: boolean): Promise<void>;
    /**
     * 获取元素的处理锁
     */
    protected acquireLock(element: HTMLElement, attrName: string): boolean;
    /**
     * 释放元素的处理锁
     */
    protected releaseLock(element: HTMLElement, attrName: string): void;
    processNodeTag(node: HTMLElement, attrName: string, noLog?: boolean): Promise<void>;
    protected observerCallback: MutationCallback;
    replaceAllOnce(): void;
    /**
     * 核心拦截逻辑：为元素注入属性拦截器
     * 提取为公共方法，供 createElement 和 Image 构造函数共用
     */
    protected injectInterceptors(element: HTMLElement, tagName: string): void;
    /**
     * 劫持 document.createElement
     */
    protected hookCreateElement(): void;
    /**
     * 新增：劫持 new Image()
     */
    protected hookImageConstructor(): void;
}
