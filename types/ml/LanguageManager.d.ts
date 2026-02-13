import { SC2DataManager } from "./SC2DataManager";
export declare const MainLanguageTypeEnum: readonly ["en", "zh"];
export declare class LanguageManager {
    thisWin: Window;
    gSC2DataManager: SC2DataManager;
    private logger;
    constructor(thisWin: Window, gSC2DataManager: SC2DataManager);
    /**
     * https://developer.mozilla.org/zh-CN/docs/Web/API/Navigator/language
     * https://www.rfc-editor.org/rfc/bcp/bcp47.txt
     * https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
     *
     * @return https://stackoverflow.com/questions/5580876/navigator-language-list-of-all-languages
     */
    getLanguage(): string;
    mainLanguage: typeof MainLanguageTypeEnum[number];
}
