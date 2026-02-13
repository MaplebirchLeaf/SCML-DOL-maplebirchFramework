export declare class LazyIteratorAdaptor {
    static find<T>(iterator: Iterator<T>, predicate: (value: T, index: number) => boolean): T | undefined;
    static findIndex<T>(iterator: Iterator<T>, predicate: (value: T, index: number) => boolean): number;
    static some<T>(iterator: Iterator<T>, predicate: (value: T, index: number) => boolean): boolean;
    static every<T>(iterator: Iterator<T>, predicate: (value: T, index: number) => boolean): boolean;
    static filter<T>(iterator: Iterator<T>, predicate: (value: T, index: number) => boolean): T[];
    static filterLazy<T>(iterator: Iterator<T>, predicate: (value: T, index: number) => boolean): Generator<T>;
    static map<T, U>(iterator: Iterator<T>, mapper: (value: T, index: number) => U): U[];
    static mapLazy<T, U>(iterator: Iterator<T>, callback: (value: T, index: number) => U): Generator<U>;
    static reduce<T, U>(iterator: Iterator<T>, reducer: (accumulator: U, value: T, index: number) => U, initialValue: U): U;
}
