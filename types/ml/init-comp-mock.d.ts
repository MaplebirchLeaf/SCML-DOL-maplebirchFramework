declare class FinalizationRegistryMock<T> implements FinalizationRegistry<T> {
    readonly [Symbol.toStringTag] = "FinalizationRegistry";
    register(target: WeakKey, heldValue: T, unregisterToken?: WeakKey): void;
    unregister(unregisterToken: WeakKey): void;
    constructor(cleanupCallback: (heldValue: T) => void);
}
