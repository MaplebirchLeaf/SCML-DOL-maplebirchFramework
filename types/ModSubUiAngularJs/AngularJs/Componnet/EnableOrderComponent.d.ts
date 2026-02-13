import { ComponentRegistryCallback } from "../ExternalComponentManagerInterface";
export declare enum EnableOrderAction {
    enableUp1 = "enableUp1",
    enableDown1 = "enableDown1",
    disableUp1 = "disableUp1",
    disableDown1 = "disableDown1",
    selectEnable = "selectEnable",
    selectDisable = "selectDisable",
    toEnable = "toEnable",
    toDisable = "toDisable"
}
export interface EnableOrderComponentConfig {
    listEnabled: {
        key: string | number;
        str: string;
        selected: boolean;
    }[];
    listDisabled: {
        key: string | number;
        str: string;
        selected: boolean;
    }[];
    onChange?: (action: EnableOrderAction, listEnabled: EnableOrderComponentConfig['listEnabled'], listDisabled: EnableOrderComponentConfig['listDisabled'], selectedKeyEnabled: string | number, selectedKeyDisabled: string | number, config: EnableOrderComponentConfig & Record<any, any>) => void;
    hostClass?: string;
    selectEnabledClass?: string;
    selectDisabledClass?: string;
    noHrSplit?: boolean;
    buttonClass?: string;
    text?: {
        MoveEnabledSelectedItemUp?: string;
        MoveEnabledSelectedItemDown?: string;
        EnableSelectedItem?: string;
        DisableSelectedItem?: string;
        MoveDisabledSelectedItemUp?: string;
        MoveDisabledSelectedItemDown?: string;
        title?: string;
    };
}
export declare const createEnableOrderComponent: ComponentRegistryCallback;
