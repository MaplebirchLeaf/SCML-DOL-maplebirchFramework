export type FieldValue = string | number | boolean | string[];
/** Valid types for Field `type` property */
export type FieldTypes = 'text' | 'textarea' | 'button' | 'radio' | 'select' | 'checkbox' | 'unsigned int' | 'unsinged integer' | 'int' | 'integer' | 'float' | 'number' | 'br' | 'div' | 'hidden' | 'file' | 'label' | 'datalist';
export interface XgmExtendInfo {
    xgmExtendMode?: 'bootstrap';
    bootstrap?: {
        smallBtn?: boolean;
    };
    buttonConfig?: {
        noSave: boolean;
        noCancel: boolean;
        noReset: boolean;
    };
}
export type BootstrapBtnType = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'link' | 'outline-primary' | 'outline-secondary' | 'outline-success' | 'outline-danger' | 'outline-warning' | 'outline-info' | 'outline-light' | 'outline-dark';
export interface XgmExtendField {
    bootstrap?: {
        btnType: BootstrapBtnType;
        smallBtn?: boolean;
        largeBtn?: boolean;
    };
}
/** Init options where no custom types are defined */
export interface InitOptionsNoCustom {
    /** Used for this instance of GM_config */
    id: string;
    /** Label the opened config window */
    title?: string | HTMLElement;
    fields: Record<string, Field>;
    /** Optional styling to apply to the menu */
    css?: string;
    /** Element to use for the config panel */
    frame?: HTMLIFrameElement | HTMLDivElement;
    /** Handlers for different events */
    events?: {
        init?: GM_configStruct['onInit'];
        open?: GM_configStruct['onOpen'];
        save?: GM_configStruct['onSave'];
        close?: GM_configStruct['onClose'];
        reset?: GM_configStruct['onReset'];
    };
    xgmExtendInfo?: XgmExtendInfo;
}
/** Init options where custom types are defined */
export interface InitOptionsCustom<CustomTypes extends string> extends Omit<InitOptionsNoCustom, 'fields'> {
    fields: Record<string, Field<CustomTypes>>;
    /** Custom fields */
    types: {
        [type in CustomTypes]: CustomType;
    };
}
/** Init options where the types key is only required if custom types are used */
export type InitOptions<CustomTypes extends string> = InitOptionsNoCustom | InitOptionsCustom<CustomTypes>;
export interface Field<CustomTypes extends string = never> {
    [key: string]: any;
    /** Display label for the field */
    label?: string | HTMLElement;
    /** Type of input */
    type: FieldTypes | CustomTypes;
    /** Text to show on hover */
    title?: string;
    /** Default value for field */
    default?: FieldValue;
    save?: boolean;
    cssClassList?: string[];
    cssClassName?: string;
    cssStyle?: CSSStyleDeclaration;
    cssStyleText?: string;
    eventCallbacks?: {
        [key: string]: ((this: HTMLElement, ev: HTMLElementEventMap[keyof HTMLElementEventMap]) => any);
    };
    afterToNode?: (node: HTMLElement, wrapper: HTMLElement | null, settings: Field, id: string, configId: string) => any;
    xgmExtendField?: XgmExtendField;
}
export interface CustomType {
    default?: FieldValue | null;
    toNode?: GM_configField['toNode'];
    toValue?: GM_configField['toValue'];
    reset?: GM_configField['reset'];
}
type GM_create_ConfigType = {
    [key: string]: any;
} & {
    xgmCssClassName?: string;
} & Pick<Field, 'cssStyleText' | 'cssStyle' | 'cssClassName' | 'cssClassList'>;
/**
 *
 * @param args If only one arg is passed, argument is passed to `document.createTextNode`.
 * With any other amount, args[0] is passed to `document.createElement` and the second arg
 * has something to do with event listeners?
 *
 * @todo Improve types based on
 * <https://github.com/sizzlemctwizzle/GM_config/blob/43fd0fe4/gm_config.js#L444-L455>
 */
export declare function GM_configStruct_create(text: string): Text;
export declare function GM_configStruct_create(tagName: string, createConfig: GM_create_ConfigType): HTMLElement;
export declare function GM_configStruct_create(tagName: string, createConfig: GM_create_ConfigType, ...innerHTML: (string | HTMLElement)[]): HTMLElement;
/** Create multiple GM_config instances */
export declare class GM_configStruct<CustomTypes extends string = never> {
    constructor(options: InitOptions<CustomTypes>);
    /** Initialize GM_config */
    init<CustomTypes extends string>(options: InitOptions<CustomTypes>): void;
    /** Display the config panel */
    open(): void;
    /** Close the config panel */
    close(): void;
    /** Directly set the value of a field */
    set(fieldId: string, value: FieldValue): void;
    /**
     * Get a config value
     * @param getLive If true, runs `field.toValue()` instead of just getting `field.value`
     */
    get(fieldId: string, getLive?: boolean): FieldValue;
    reset(): void;
    /** Save the current values */
    save(): void;
    read(store?: string, cb?: (r: any) => any): any;
    write(store?: string, obj?: any, cb?: (forgotten: any) => any): any;
    center(): void;
    /** Whether GreaseMonkey functions are present */
    isGM4: boolean;
    isGM: boolean;
    /**
     * Either calls `localStorage.setItem` or `GM_setValue`.
     * Shouldn't be directly called
     */
    setValue: (name: string, value: FieldValue) => Promise<void> | void;
    /**
     * Get a value. Shouldn't be directly called
     *
     * @param name The name of the value
     * @param def The default to return if the value is not defined.
     * Only for localStorage fallback
     */
    getValue: (name: string, def: FieldValue) => Promise<FieldValue>;
    /** Converts a JSON object to a string */
    stringify: (obj: any) => string;
    /**
     * Converts a string to a JSON object
     * @returns `undefined` if the string was an invalid object,
     * otherwise returns the parsed object
     */
    parser: (jsonString: string) => any;
    /** Log a string with multiple fallbacks */
    log: (...message: any[]) => Promise<void> | void;
    id: string;
    title: string | HTMLElement;
    css: {
        basic: string;
        basicPrefix: string;
        stylish: string;
    };
    fields: Record<string, GM_configField>;
    frame?: HTMLIFrameElement | HTMLDivElement;
    onInit?: (this: GM_configStruct) => void;
    onOpen?: (this: GM_configStruct, document: Document, window: Window, frame: HTMLElement) => void;
    onSave?: (this: GM_configStruct, values: any) => void;
    onClose?: (this: GM_configStruct) => void;
    onReset?: (this: GM_configStruct) => void;
    isOpen: boolean;
    static create: typeof GM_configStruct_create;
    private isInit;
    private frameStyle;
    private name;
    private frameSection?;
    private xgmExtendInfo;
}
export declare let GM_config: typeof GM_configStruct;
export declare class GM_configField {
    constructor(settings: Field, stored: FieldValue | undefined, id: string, customType: CustomType | undefined, configId: string, xgmExtendInfo: XgmExtendInfo);
    [key: string]: any;
    settings: Field;
    id: string;
    configId: string;
    node: HTMLElement | null;
    wrapper: HTMLElement | null;
    save: boolean;
    /** The stored value */
    value: FieldValue;
    default: FieldValue;
    toNode: (this: GM_configField, configId?: string) => HTMLElement;
    /** Get value from field */
    toValue: (this: GM_configField) => FieldValue | null;
    reset: (this: GM_configField) => void;
    remove: (el?: HTMLElement) => void;
    reload: () => void;
    _checkNumberRange: (num: number, warn: string) => true | null;
    defaultValue: (type: FieldTypes, options: any) => any;
    private xgmExtendInfo;
}
export {};
