import type { ModSubUiAngularJsModeExportInterface } from "../ModSubUiAngularJs/ModSubUiAngularJsModeExportInterface";
import { ModSubUiAngularJsService } from "./ModSubUiAngularJsService";
import { Gui } from "./Gui";
export declare class ModManagerSubUi {
    modSubUiAngularJsService: ModSubUiAngularJsService;
    modLoaderGui: Gui;
    constructor(modSubUiAngularJsService: ModSubUiAngularJsService, modLoaderGui: Gui);
    whenCreate(Ref: ModSubUiAngularJsModeExportInterface): Promise<void>;
}
