export declare function sealed<Class extends abstract new (...args: any) => any>(target: Class, context: ClassDecoratorContext<Class>): void;
export declare namespace ClassDecoratorUtil {
    interface InfoTypeItemConfig {
        writable: false;
        configurable: false;
        enumerable: true;
    }
    interface InfoTypeItem {
        info: ClassMemberDecoratorContext;
        config: InfoTypeItemConfig;
    }
    interface ClassInfo {
        seal?: boolean;
    }
    type InfoType = Map<string | symbol, InfoTypeItem>;
    class InfoData {
        configInfo: InfoType;
        classInfo: ClassInfo;
    }
    type ThisClassType = {
        [key: (string | symbol)]: any;
        "ClassDecoratorUtil_InfoData": InfoData;
    };
    function finishClassDecorate(config: ClassInfo): <Class extends abstract new (...args: any) => any>(target: Class, context: ClassDecoratorContext<Class>) => Class;
    function configField(config: InfoTypeItemConfig): <ThisClass extends ThisClassType>(value: undefined, context: ClassFieldDecoratorContext<ThisClass>) => <VType>(this: ThisClass, initialValue: VType) => VType;
    function configMethod(config: InfoTypeItemConfig): <ThisClass extends ThisClassType, F extends (this: ThisClass, ...args: any) => any>(value: F, context: ClassMethodDecoratorContext<ThisClass, F>) => <VType>(this: ThisClass, initialValue: VType) => VType;
}
export declare function sealedField<This>(value: undefined, context: ClassFieldDecoratorContext<This>): <VType>(this: This, initialValue: VType) => void;
export declare function sealedField2<VType>(initialValue: VType): <This>(value: undefined, context: ClassFieldDecoratorContext<This>) => (this: This) => void;
export declare function sealedMethod(): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function enumerable(value: boolean): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function configurable(value: boolean): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function loggedMethod<This, Args extends any[], Return>(target: (this: This, ...args: Args) => Return, context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>): (this: This, ...args: Args) => Return;
