import { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import { GameOriginalImagePack } from '@scml/types/GameOriginalImagePackMod/GameOriginalImagePack';
import { BeautySelectorAddon } from '@scml/types/AddonMod_BeautySelector/BeautySelectorAddon';
import { ImgLoaderHooker } from '@scml/types/Hook_ImgLoader/ImgLoaderHooker';
import { Gui } from '@scml/types/Mod_LoaderGui/Gui';
import { ModUtils } from '@scml/types/sugarcube-2-ModLoader/Utils';
import { _languageSwitch } from '../src/SugarCubeMacros';

declare global {
  interface Window {
    readonly modSC2DataManager: SC2DataManager;
    readonly modGameOriginalImagePack: GameOriginalImagePack;
    readonly modImgLoaderHooker: ImgLoaderHooker;
    readonly modLoaderGui: Gui;
    readonly modUtils: ModUtils;
    readonly addonBeautySelectorAddon: BeautySelectorAddon;
    readonly Time: typeof Time;
    DateTime: typeof DateTime;
    closeOverlay(): void;
    updateOptions(): void;
    lanSwitch: typeof _languageSwitch;
    readonly V: typeof V;
    readonly C: typeof C;
    readonly T: typeof T;
    pregnancyGenerator: typeof pregnancyGenerator;
    recordSperm: typeof recordSperm;
    pregnancyDaysEta: typeof pregnancyDaysEta;
    getChildDays: typeof getChildDays;
  }

  const lanSwitch: typeof _languageSwitch;

  const Links: any;
  const StartConfig: any;

  interface ErrorsConfig {
    debug: boolean;
    maxLogs: number;
    showReporterSelector: string;
  }

  interface ErrorLogEntry {
    message: string;
    copyData?: any;
  }

  interface ErrorsReporter {
    visible(): boolean;
    reporterContainer(): HTMLElement;
    messagesContainer(): HTMLElement;
    paneContainer(): HTMLElement;
    copyArea(): HTMLTextAreaElement;
    toggle(): void;
    show(): void;
    update(): void;
    hide(andClear?: boolean): void;
    createEntry(error: ErrorLogEntry): HTMLElement;
    copyAll(): void;
  }

  interface Errors {
    config: ErrorsConfig;
    log: ErrorLogEntry[];
    registerMessage(message: string, copyData?: any, noClone?: boolean): ErrorLogEntry;
    report(message: string, copyData?: any, noClone?: boolean): void;
    Reporter: ErrorsReporter;
  }

  declare const Errors: Errors;

  const Weather: { rain: boolean; thunder: boolean; snow: boolean; cloud: boolean; windy: boolean; fog: boolean; [key: string]: any };
  function getFormattedDate(date: any, includeWeekday?: boolean): string;
  function getShortFormattedDate(date: any): string;
  function ordinalSuffixOf(i: number): string;
  const Dynamic: { [key: string]: any };
  function hairLengthStringToNumber(lengthStr: string): number;
  const Renderer: { CanvasModels: { main: any }; [key: string]: any };
  const ZIndices: { [key: string]: number };
  function wikifier(widget: string, ...args: any): DocumentFragment;
  function playerNormalPregnancyType(): string;
  function getPregnancyObject(mother?: string, returnGenital?: false): any;
  function getPregnancyObject(mother: string | undefined, returnGenital: true): [any, string];
  const pregnancyGenerator: Record<string, (...args: any[]) => any>;
  let recordSperm: (options?: any) => any;
  let pregnancyDaysEta: (pregnancyObject: any) => number | null;
  let getChildDays: (childId: string) => number | null;
  function hasSexStat(input: string, required: number, modifiers?: boolean): boolean;
  function clothesIndex(slot: string, itemToIndex: object): number;
  function integrityKeyword(worn: object, slot: string): string;
  function between(value: number, min: number, max: number): boolean;
  let isPossibleLoveInterest: (name: string) => boolean;
  let combatListColor: (name: any, value: any, type?: any) => any;
  const combatActionColours: CombatActionColours;
  interface CombatActionColours {
    [category: string]: { [attitude: string]: string[] };
  }
}

export {};
