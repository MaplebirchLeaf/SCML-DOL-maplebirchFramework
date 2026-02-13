import type ng from "angular";
export type ComponentCreateCallback = (rootAppModule: ng.IModule) => {
    selector: string;
    componentName: string;
    componentOptions: ng.IComponentOptions;
};
export type ComponentRegistryCallback = (rootAppModule: ng.IModule) => {
    selector: string;
};
export type ExternalComponentRegistryInfo = ComponentCreateCallback | ComponentRegistryCallback;
export interface ExternalComponentShowInfo<DataType extends (any | undefined)> {
    selector: string;
    data?: DataType;
}
export interface ExternalComponentManagerInterface {
    registryComponent(componentRegistryInfo: ExternalComponentRegistryInfo): void;
    addComponent<T>(componentShowInfo: ExternalComponentShowInfo<T>): void;
    cleanComponent(): void;
    fullFillComponent(_M: ng.IModule): void;
    get externalComponentsShow(): ExternalComponentShowInfo<any>[];
}
