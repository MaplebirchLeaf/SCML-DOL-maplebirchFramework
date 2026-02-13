import { NgAppContainer } from './AngularJs/appInit';
import type ng from "angular";
import { ExternalComponentManager } from "./AngularJs/ExternalComponentManager";
import { ExternalComponentRegistryInfo, ExternalComponentShowInfo } from "./AngularJs/ExternalComponentManagerInterface";
import { AppContainerManagerMethodsInterface, ExternalComponentManagerListNameType } from "./AppContainerManagerMethodsInterface";
export declare class AppContainerManager {
    nameApp: ExternalComponentManagerListNameType;
    ngAppContainerInstance?: NgAppContainer;
    constructor(nameApp: ExternalComponentManagerListNameType);
    bootstrap(el: HTMLElement): ng.auto.IInjectorService;
    release(): void;
    protected externalComponentManager: ExternalComponentManager;
    addComponent<T>(componentInfo: ExternalComponentShowInfo<T>): void;
    cleanComponent(): void;
    registryComponent<T>(componentInfo: ExternalComponentRegistryInfo): void;
}
export declare class ModSubUiAngularJsBodyBase {
    getNg: () => ng.IAngularStatic;
    getAngular: () => ng.IAngularStatic;
    constructor();
    protected _appContainerManager: {
        [key in ExternalComponentManagerListNameType]: AppContainerManager;
    };
    get appContainerManager(): {
        [key in ExternalComponentManagerListNameType]: AppContainerManager;
    };
}
type ModSubUiAngularJsBodyConstructorType = new () => ModSubUiAngularJsBodyBase & AppContainerManagerMethodsInterface;
declare const ModSubUiAngularJsBody_base: ModSubUiAngularJsBodyConstructorType;
export declare class ModSubUiAngularJsBody extends ModSubUiAngularJsBody_base implements AppContainerManagerMethodsInterface {
}
export {};
