type whenPassageCome = (passageName: string) => void;
export declare class PassageTracer {
    thisWin: Window;
    constructor(thisWin: Window);
    init(): void;
    private whenPassageComeCallback;
    addCallback(cb: whenPassageCome): void;
    newPassageCome(): void;
}
export {};
