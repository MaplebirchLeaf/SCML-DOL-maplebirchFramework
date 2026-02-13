import { AppContainerManagerMethodsInterface, ExternalComponentManagerListNameType } from "./AppContainerManagerMethodsInterface";
import { AppContainerManager } from "./ModSubUiAngularJsBody";
export interface ModSubUiAngularJsModeExportInterface extends AppContainerManagerMethodsInterface {
    installBuildInComponent(): void;
    get appContainerManager(): {
        [key in ExternalComponentManagerListNameType]: AppContainerManager;
    };
}
