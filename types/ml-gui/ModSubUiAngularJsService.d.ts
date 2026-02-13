import type { ModUtils } from "../ml/Utils";
import type { ModSubUiAngularJsModeExportInterface } from '../ModSubUiAngularJs/ModSubUiAngularJsModeExportInterface';
import { ModSubUiAngularJsServiceLifeTimeCallback } from "./ModSubUiAngularJsServiceInterface";
export declare class ModSubUiAngularJsService {
    modUtils: ModUtils;
    protected lifeTimeCallbackTable: Map<string, ModSubUiAngularJsServiceLifeTimeCallback>;
    protected get modSubUiAngularJs(): ModSubUiAngularJsModeExportInterface | undefined;
    get Ref(): ModSubUiAngularJsModeExportInterface | undefined;
    constructor(modUtils: ModUtils);
    addLifeTimeCallback(name: string, callback: ModSubUiAngularJsServiceLifeTimeCallback): void;
    removeLifeTimeCallback(name: string): void;
    bootstrap(el: HTMLElement): Promise<void>;
    release(): Promise<void>;
}
