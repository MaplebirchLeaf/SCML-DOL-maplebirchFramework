type whenPassageCome = (passageName: string) => void;
export declare class PassageTracer {
    thisW: Window;
    constructor(thisW: Window);
    private whenPassageComeCallback;
    addCallback(cb: whenPassageCome): void;
    newPassageCome(): void;
}
export {};
