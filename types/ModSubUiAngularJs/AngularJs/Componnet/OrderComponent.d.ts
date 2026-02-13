import { ComponentRegistryCallback } from "../ExternalComponentManagerInterface";
export declare enum OrderAction {
    up1 = "up1",
    down1 = "down1",
    select = "select"
}
export interface OrderComponentConfig {
    list: {
        key: string | number;
        str: string;
        selected: boolean;
    }[];
    onChange?: (action: OrderAction, list: OrderComponentConfig['list'], selectedKey: string | number, config: OrderComponentConfig & Record<any, any>) => void;
    hostClass?: string;
    selectClass?: string;
    buttonClass?: string;
    text?: {
        MoveSelectedItemUp?: string;
        MoveSelectedItemDown?: string;
        title?: string;
    };
}
export declare const createOrderComponent: ComponentRegistryCallback;
