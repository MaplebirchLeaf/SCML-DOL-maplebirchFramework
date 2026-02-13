import { ComponentRegistryCallback } from "../ExternalComponentManagerInterface";
export interface SimpleSelectComponentConfig {
    list: {
        key: string;
        str: string;
        selected: boolean;
    }[];
    onChange?: (list: SimpleSelectComponentConfig['list'], selectedKey: string, config: SimpleSelectComponentConfig & Record<any, any>) => void;
    hostClass?: string;
    selectClass?: string;
    buttonClass?: string;
    text?: {};
}
export declare const createSimpleSelectComponent: ComponentRegistryCallback;
