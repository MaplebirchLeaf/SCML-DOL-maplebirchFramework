import type { LinksAPI } from '@scml/sc2-verlnir/src/links';
import { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import { GameOriginalImagePack } from '@scml/types/GameOriginalImagePackMod/GameOriginalImagePack';
import { BeautySelectorAddon } from '@scml/types/AddonMod_BeautySelector/BeautySelectorAddon';
import { ImgLoaderHooker } from '@scml/types/Hook_ImgLoader/ImgLoaderHooker';
import { Gui } from '@scml/types/Mod_LoaderGui/Gui';
import { ModUtils } from '@scml/types/sugarcube-2-ModLoader/Utils';
import { _languageSwitch } from '../macros';
import ImageLoader from '../modules/Frameworks/ImageLoader';
import type { ActionType, ActionValue } from '../modules/CombatAddon/CombatAction';
import type { NPCChildRecord, NPCPregnancyOrifice, NPCPregnancyRecord, NPCPregnancySpecies, NPCTryConceiveOptions } from '../modules/NamedNPCAddon/NPCPregnancy';
import type { TimeConstants as FrameworkTimeConstants } from '../constants';
import type { DolStateMoment, TwineSugarCube } from './twine-sugarcube';

declare global {
  interface DoLSaveDetails {
    date?: number;
    title?: string;
    idx?: unknown;
    metadata?: { saveName?: string; [key: string]: unknown };
    [key: string]: unknown;
  }

  interface DoLSaveState {
    history?: DolStateMoment[];
    delta?: unknown;
    [key: string]: unknown;
  }

  interface DoLSaveDatabase {
    getItem(slot: number): Promise<{ data?: DoLSaveState } | null | undefined>;
    getSaveDetails(): Promise<Array<{ slot: number; data?: DoLSaveDetails }> | null | undefined>;
    setItem(slot: number, save: DoLSaveState, details?: DoLSaveDetails): Promise<boolean | void>;
  }

  interface Window {
    modSC2DataManager: SC2DataManager;
    modGameOriginalImagePack: GameOriginalImagePack;
    modImgLoaderHooker: ImgLoaderHooker;
    modLoaderGui: Gui;
    modUtils: ModUtils;
    addonBeautySelectorAddon: BeautySelectorAddon;
    readonly Time: typeof Time;
    readonly TimeConstants?: typeof FrameworkTimeConstants;
    DateTime: typeof DateTime;
    DoLSave?: {
      isCompressionEnabled?(): boolean;
      disableCompression?(): void;
      enableCompression?(): void;
    };
    LZString?: { compressToBase64(value: string): string };
    Config?: TwineSugarCube['Config'];
    idb?: DoLSaveDatabase;
    onTakeClick(name: string, type?: string): void;
    onAutoTakeClick(name: string, type?: string): void;
    initPillContextButtons(item: { name: string; type: string }): void;
    closeOverlay(): void;
    updateOptions(): void;
    lanSwitch: typeof _languageSwitch;
    readonly loadImage: typeof ImageLoader.load;
    readonly V: typeof V;
    readonly C: typeof C;
    readonly T: typeof T;
    DefaultActions: { get(type: unknown, person: unknown, part: ActionType): ActionValue[] };
    pregnancyDaysEta: typeof pregnancyDaysEta;
    getChildDays: typeof getChildDays;
  }

  const lanSwitch: typeof _languageSwitch;

  const Links: LinksAPI;
  const StartConfig: { version: string };

  interface ErrorsConfig {
    debug: boolean;
    maxLogs: number;
    showReporterSelector: string;
  }

  interface ErrorLogEntry {
    message: string;
    copyData?: unknown;
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
    registerMessage(message: string, copyData?: unknown, noClone?: boolean): ErrorLogEntry;
    report(message: string, copyData?: unknown, noClone?: boolean): void;
    Reporter: ErrorsReporter;
  }

  const Errors: Errors;

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
  function getActivePregnancies(carrier: string): NPCPregnancyRecord[];
  function getChildrenOf(pregnancyId: number): NPCChildRecord[];
  function pregnancyProgress(record: NPCPregnancyRecord): number;
  function getDueDate(record: NPCPregnancyRecord): number;
  function npcMenstrualFertility(npcName: string): number;
  function npcBellySize(npcName: string): number;
  function pregnancyDaysEta(record: NPCPregnancyRecord): number;
  function pregnancyDaysEta(record: null | undefined): null;
  function getChildDays(childId: number): number;
  function setKnowsPregnancy(pregnancyId: number, who: string): void;
  function setKnowsDonor(pregnancyId: number, who: string): void;
  function npcPregnancyRoll(
    carrier: string,
    carrierSpecies: NPCPregnancySpecies,
    donor: string,
    donorSpecies: NPCPregnancySpecies,
    orifice: NPCPregnancyOrifice,
    depth?: NPCTryConceiveOptions['depth'],
    location?: string,
    donorFertility?: number,
    slot?: number | null
  ): number | null;
  function hasSexStat(input: string, required: number, modifiers?: boolean): boolean;
  function clothesIndex(slot: string, itemToIndex: object): number;
  function integrityKeyword(worn: object, slot: string): string;
  function between(value: number, min: number, max: number): boolean;
  let isPossibleLoveInterest: (name: string) => boolean;
  let combatListColor: (name: any, value: any, type?: any) => any;
  const combatActionColours: CombatActionColours;
  function gwylanSchedule(): string;
  interface CombatActionColours {
    [category: string]: { [attitude: string]: string[] };
  }
}

export {};
