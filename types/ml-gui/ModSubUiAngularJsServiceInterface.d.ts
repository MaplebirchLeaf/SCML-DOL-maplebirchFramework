import type { ModSubUiAngularJsModeExportInterface } from '../ModSubUiAngularJs/ModSubUiAngularJsModeExportInterface';
export interface ModSubUiAngularJsServiceLifeTimeCallback {
    whenCreate?: (ref: ModSubUiAngularJsModeExportInterface) => Promise<any>;
    whenDestroy?: (ref: ModSubUiAngularJsModeExportInterface) => Promise<any>;
}
