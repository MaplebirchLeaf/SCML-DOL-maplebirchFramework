import ng from "angular";
import { ExternalComponentManagerInterface, ExternalComponentRegistryInfo, ExternalComponentShowInfo } from "./ExternalComponentManagerInterface";
export declare class ExternalComponentManager implements ExternalComponentManagerInterface {
    protected _externalComponentsShow: ExternalComponentShowInfo<any>[];
    protected _externalComponentsRegistry: ExternalComponentRegistryInfo[];
    protected _registeredComponents: string[];
    protected isInit: boolean;
    constructor();
    registryComponent(componentRegistryInfo: ExternalComponentRegistryInfo): void;
    addComponent<T>(componentShowInfo: ExternalComponentShowInfo<T>): void;
    cleanComponent(): void;
    fullFillComponent(_M: ng.IModule): string[];
    get externalComponentsShow(): ExternalComponentShowInfo<any>[];
}
