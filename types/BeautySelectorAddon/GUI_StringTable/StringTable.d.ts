declare const StringTableKeys: readonly ["MoveEnabledSelectedItemUp", "MoveEnabledSelectedItemDown", "EnableSelectedItem", "DisableSelectedItem", "MoveDisabledSelectedItemUp", "MoveDisabledSelectedItemDown", "TypeGuiTitle"];
export type StringTableTypeStringPart = {
    [key in typeof StringTableKeys[number]]: string;
};
export interface StringTableType extends StringTableTypeStringPart {
    errorMessage2I18N(s: string): string;
}
export declare function getStringTable(): StringTableType;
export declare const StringTable: StringTableType;
export {};
