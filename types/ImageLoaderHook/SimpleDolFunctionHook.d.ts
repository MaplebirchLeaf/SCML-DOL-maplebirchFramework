export interface SimpleDolFunctionHookItem {
    windowFunctionString: string;
    oldFunction: CallableFunction;
    replaceFunction: CallableFunction;
    hookFunction: CallableFunction;
}
export declare class SimpleDolFunctionHook {
    table: Map<string, SimpleDolFunctionHookItem>;
    hook(windowFunctionString: string, hookFunction: CallableFunction): void;
}
