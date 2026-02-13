declare const StringTableKeys: readonly ["title", "close", "reload", "EnableSafeMode", "DisableSafeMode", "SafeModeState", "SafeModeEnabled", "SafeModeAutoEnabled", "SafeModeDisabled", "NowLoadedModeList", "NowSideLoadModeList", "SelectModZipFile", "AddMod", "AddModResult", "CanRemoveModList", "RemoveMod", "ReadMeSelect", "ReadMeButton", "ReadMeContent", "ReadMeBootJsonContent", "LoadLogRadioNoError", "LoadLogRadioNoWarning", "LoadLogRadioNoInfo", "LoadLogReloadButton", "LoadLog", "DownloadExportData", "DownloadExportData2", "SectionMod", "SectionSafeMode", "SectionLanguageSelect", "SectionAddRemove", "SectionModDisable", "SectionReadMe", "SectionLoadLog", "SectionDebug", "ModConfig", "NoReadMeString", "InvalidFile", "MoveEnabledSelectedItemUp", "MoveEnabledSelectedItemDown", "EnableSelectedItem", "DisableSelectedItem", "MoveDisabledSelectedItemUp", "MoveDisabledSelectedItemDown", "ModEnableGuiTitle"];
export type StringTableTypeStringPart = {
    [key in typeof StringTableKeys[number]]: string;
};
export type ModNickName = ({
    [key in string]?: string;
} & {
    cn?: string;
    en?: string;
}) | string | undefined;
export interface StringTableType extends StringTableTypeStringPart {
    errorMessage2I18N(s: string): string;
    calcModNickName(mi: ModNickName): string | undefined;
}
export declare function getStringTable(): StringTableType;
export {};
