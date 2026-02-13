import { ModZipReader } from "./ModZipReader";
import { ModInfo } from "./ModLoader";
export declare enum ModLoadFromSourceType {
    'Remote' = "Remote",
    'Local' = "Local",
    'LocalStorage' = "LocalStorage",
    'IndexDB' = "IndexDB",
    'SideLazy' = "SideLazy"
}
export declare function isModOrderItem(a: any): a is ModOrderItem;
export interface ModOrderItem {
    name: string;
    from: ModLoadFromSourceType;
    mod: ModInfo;
    zip: ModZipReader;
}
declare abstract class CustomReadonlyMapHelper<K, V> implements ReadonlyMap<K, V> {
    abstract get size(): number;
    abstract get(key: K): V | undefined;
    abstract has(key: K): boolean;
    abstract entries(): IterableIterator<[K, V]>;
    [Symbol.iterator](): IterableIterator<[K, V]>;
    forEach(callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void, thisArg?: any): void;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
}
export declare class ModOrderContainer_One_ReadonlyMap extends CustomReadonlyMapHelper<string, ModOrderItem> {
    parent: ModOrderContainer;
    constructor(parent: ModOrderContainer);
    get size(): number;
    entries(): IterableIterator<[string, ModOrderItem]>;
    get(key: string): ModOrderItem | undefined;
    has(key: string): boolean;
}
export declare class ModOrderContainer_OneAlias_ReadonlyMap extends CustomReadonlyMapHelper<string, ModOrderItem> {
    parent: ModOrderContainer;
    constructor(parent: ModOrderContainer);
    get size(): number;
    entries(): IterableIterator<[string, ModOrderItem]>;
    get(key: string): ModOrderItem | undefined;
    has(key: string): boolean;
}
export declare function isModOrderContainer(a: any): a is ModOrderContainer;
/**
 * a multi-index container designed for mod load cache list. work like a C++ Boost.MultiIndexContainer
 * can keep mod `order` , optional keep mod `unique` , remember mod load `from source`
 */
export declare class ModOrderContainer {
    container: Map<string, Map<ModLoadFromSourceType, ModOrderItem>>;
    order: ModOrderItem[];
    nameRefWithAlias: Map<string, string>;
    constructor();
    /**
     * O(1)
     *
     * add addition limit that keep mod name unique
     */
    get_One_Map(): ModOrderContainer_One_ReadonlyMap;
    get_One_Map_WithAlias(): ModOrderContainer_OneAlias_ReadonlyMap;
    /**
     * O(2n)
     *
     * add addition limit that keep mod name unique
     */
    get_One_Array(): ModOrderItem[];
    /**
     * O(n)
     */
    get_Array(): ModOrderItem[];
    /**
     * O(n)
     */
    getAllName(): string[];
    /**
     * O(1)
     */
    getHasByName(name: string): boolean;
    /**
     * O(1)
     */
    getHasByNameWithAlias(name: string): boolean;
    /**
     * O(1)
     */
    getHasByNameFrom(name: string, from: ModLoadFromSourceType): boolean;
    /**
     * O(1)
     */
    getByName(name: string): Map<ModLoadFromSourceType, ModOrderItem> | undefined;
    /**
     * O(1)
     */
    getModOrderItemByNameWithAlias(name: string): Map<ModLoadFromSourceType, ModOrderItem> | undefined;
    /**
     * O(1)
     */
    getByNameOne(name: string, noError?: boolean): ModOrderItem | undefined;
    /**
     * O(1)
     */
    getByNameOneWithAlias(name: string, noError?: boolean): ModOrderItem | undefined;
    /**
     * O(n)
     */
    getByFromTypeByOrder(from: ModLoadFromSourceType): ModOrderItem[];
    /**
     * O(n)
     */
    getByOrder(name: string): ModOrderItem[];
    /**
     * O(n)
     */
    checkNameUniq(): boolean;
    /**
     * O(n)
     */
    checkAlias(): boolean;
    /**
     * O(n+2log(n))
     */
    checkData(): boolean;
    /**
     * O(n)
     */
    delete(name: string, from: ModLoadFromSourceType): boolean;
    /**
     * O(n)
     */
    deleteAll(name: string): boolean;
    /**
     * O(1)
     */
    createModOrderItem(zip: ModZipReader, from: ModLoadFromSourceType): ModOrderItem | undefined;
    /**
     * O(2n)
     */
    pushFront(zip: ModZipReader, from: ModLoadFromSourceType): boolean;
    /**
     * O(2n)
     */
    pushBack(zip: ModZipReader, from: ModLoadFromSourceType): boolean;
    /**
     * O(2n)
     */
    insertReplace(zip: ModZipReader, from: ModLoadFromSourceType): boolean;
    /**
     * O(n)
     */
    popOut(name: string, from: ModLoadFromSourceType): ModOrderItem | undefined;
    /**
     * O(n)
     */
    popOutAll(name: string): ModOrderItem[] | undefined;
    /**
     * O(1)
     */
    popFront(): ModOrderItem | undefined;
    /**
     * O(1)
     */
    clear(): void;
    /**
     * O(1)
     */
    get size(): number;
    /**
     * O(2n)
     */
    clone(): ModOrderContainer;
    private rebuildNameRefWithAlias;
    private addModNameRefWithAlias;
    private removeModNameRefWithAlias;
    /**
     * O(n)
     */
    private rebuildContainerFromOrder;
    /**
     * O(2n)
     */
    splitCloneInArray(name: string, from: ModLoadFromSourceType): {
        before: ModOrderContainer;
        current: ModOrderItem;
        after: ModOrderContainer;
    } | undefined;
    static mergeModOrderContainer(nnn: (ModOrderContainer | ModOrderItem)[]): ModOrderContainer;
}
export {};
