import { ExternalComponentRegistryInfo, ExternalComponentShowInfo } from "./AngularJs/ExternalComponentManagerInterface";
export declare const ExternalComponentManagerListName: readonly ["ModGuiConfig", "ModInGameConfig"];
export type ExternalComponentManagerListNameType = typeof ExternalComponentManagerListName[number];
export type bootstrapFunctionType = (el: HTMLElement) => void;
export type releaseFunctionType = () => void;
export type addComponentFunctionType = <T>(componentShowInfo: ExternalComponentShowInfo<T>) => void;
export type cleanComponentFunctionType = () => void;
export type registryComponentFunctionType = (componentRegistryInfo: ExternalComponentRegistryInfo) => void;
export type AppContainerManagerMethodsType = {
    [K in ExternalComponentManagerListNameType as `bootstrap${K}`]: bootstrapFunctionType;
} & {
    [K in ExternalComponentManagerListNameType as `release${K}`]: releaseFunctionType;
} & {
    [K in ExternalComponentManagerListNameType as `addComponent${K}`]: addComponentFunctionType;
} & {
    [K in ExternalComponentManagerListNameType as `cleanComponent${K}`]: cleanComponentFunctionType;
} & {
    [K in ExternalComponentManagerListNameType as `registryComponent${K}`]: registryComponentFunctionType;
};
export interface AppContainerManagerMethodsInterface extends AppContainerManagerMethodsType {
    addComponent: addComponentFunctionType;
    cleanComponent: cleanComponentFunctionType;
    registryComponent: registryComponentFunctionType;
}
export type AppContainerManagerMethodsInterfaceKey = keyof AppContainerManagerMethodsInterface;
