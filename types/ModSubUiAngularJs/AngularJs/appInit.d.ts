import ng from 'angular';
import { ExternalComponentManager } from "./ExternalComponentManager";
export declare function getNg(): ng.IAngularStatic;
export declare function getAngular(): ng.IAngularStatic;
export declare class NgAppContainer {
    protected externalComponentRef: ExternalComponentManager;
    protected nameApp: string;
    Main: ng.IModule;
    constructor(externalComponentRef: ExternalComponentManager, nameApp: string);
    el?: HTMLElement;
    installApp(el: HTMLElement): ng.auto.IInjectorService;
    destroyApp(): void;
}
