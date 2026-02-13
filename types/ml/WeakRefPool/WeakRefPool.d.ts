export declare function newWeakPoolRef<T>(v: T): WeakPoolRef<T>;
export declare class WeakPoolRef<T> {
    constructor();
    get deref(): T | undefined;
}
export declare class WeakRefPool<T> {
    pool: WeakMap<WeakPoolRef<T>, T>;
}
