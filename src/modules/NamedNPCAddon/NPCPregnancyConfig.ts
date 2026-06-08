// ./src/modules/NamedNPCAddon/NPCPregnancyConfig.ts

export type PregnancyNPC = {
  nam: string;
  name?: string;
  fullDescription?: string;
  description?: string;
  type: string;
  penis?: string;
  vagina?: string;
  pregnancy: Record<string, any> | null;
  pregnancyAvoidance?: number;
};

export type SpermData = {
  type: string;
  source: string;
  quantity?: number;
  mod?: number;
};

export type SpermEntry = {
  type: string;
  source: string;
};

export type PregnancyData = Record<string, any> & {
  enabled?: boolean;
  fetus?: any[];
  sperm?: SpermData[];
  pills?: string | null;
};

export type PregnancyGenerator = (mother: string, father: string, fatherKnown: boolean, genital: string, ...args: any[]) => any;
export type PregnancyBirthResolver = (type: string, pregnancy?: PregnancyData, npcName?: string) => PregnancyBirthConfig;
export type PregnancyEtaResolver = (pregnancy: PregnancyData) => number | null;
export type PregnancyChildActivityResolver = (childId: string, child: any) => string | null | false | void;
export type PregnancyChildDefaultsResolver = (child: any, pregnancy: PregnancyData, npcName?: string) => Record<string, any> | null | false | void;
export type PregnancyChildTransformResolver = (child: any, pregnancy: PregnancyData, npcName?: string) => PregnancyChildTransformConfig | null | false | void;
export type PregnancyTextResolver = (pregnancy: PregnancyData, count: number, target?: string) => string;
export type PregnancyMultiplierResolver = (npcName: string, pregnancy: PregnancyData) => number;
export type PregnancyAutoEndResolver = (npcName: string, pregnancy: PregnancyData) => boolean;
export type PregnancyCycleMode = 'range' | 'after';

export interface PregnancyBirthConfig {
  birthLocation?: string;
  location?: string;
}

export interface PregnancyTextConfig {
  single?: string;
  multiple?: string;
  resolver?: PregnancyTextResolver;
}

export type PregnancyChildTransformConfig = string | string[] | PregnancyChildTransformFields;

export interface PregnancyChildTransformFields {
  animal?: string | null;
  divine?: string | null;
  maplebirch?: string | string[] | Record<string, any> | null;
  features?: Record<string, any>;
}

export interface PregnancyChildConfig {
  defaults?: Record<string, any> | PregnancyChildDefaultsResolver;
  transform?: PregnancyChildTransformConfig | PregnancyChildTransformResolver;
  activity?: PregnancyChildActivityResolver;
  text?: PregnancyTextConfig | PregnancyTextResolver;
}

export interface PregnancyNpcConfig {
  type?: string;
  enabled?: boolean;
  canBePregnant?: boolean;
  canImpregnatePlayer?: boolean;
  birth?: PregnancyBirthConfig | PregnancyBirthResolver;
  multiplier?: number | PregnancyMultiplierResolver;
  autoEnd?: boolean | PregnancyAutoEndResolver;
  cycleMode?: PregnancyCycleMode;
  forcePregnancy?: boolean | PregnancyAutoEndResolver;
  nonCycleFlag?: string;
  onMissedBirth?: (npcName: string, pregnancy: PregnancyData) => void;
}

export interface PregnancyAddConfig extends PregnancyNpcConfig {
  generator?: PregnancyGenerator;
  eta?: PregnancyEtaResolver;
  child?: PregnancyChildConfig;
  childActivity?: PregnancyChildActivityResolver;
  text?: PregnancyTextConfig | PregnancyTextResolver;
  npc?: Record<string, PregnancyNpcConfig>;
}

export const VANILLA_TYPES = ['human', 'wolf', 'wolfboy', 'wolfgirl', 'hawk', 'harpy'];

export const DEFAULT_TYPE_CONFIGS: Record<string, PregnancyAddConfig> = {
  human: {
    birth: { birthLocation: 'hospital', location: 'home' },
    multiplier: () => 9 / V.settings.humanPregnancyMonths
  },
  wolf: {
    birth: { birthLocation: 'wolf_cave', location: 'wolf_cave' },
    multiplier: () => 12 / V.settings.wolfPregnancyWeeks
  },
  hawk: {
    birth: { birthLocation: 'tower', location: 'tower' },
    multiplier: 1,
    autoEnd: false
  }
};

export const DEFAULT_NPC_CONFIGS: Record<string, PregnancyNpcConfig> = {
  'Black Wolf': {
    birth: { birthLocation: 'wolf_cave', location: 'wolf_cave' }
  },
  'Great Hawk': {
    birth: { birthLocation: 'tower', location: 'tower' },
    autoEnd: false,
    cycleMode: 'after',
    forcePregnancy: true,
    nonCycleFlag: 'nonCycleRngHasEggs',
    onMissedBirth: () => wikifier('<<endBirdEggLaying>>')
  },
  Alex: {
    birth: (_type, pregnancy) => ({
      birthLocation: 'alex_cottage',
      location: pregnancy?.nursery === true ? 'alex_cottage' : 'home'
    }),
    onMissedBirth: (_npcName, pregnancy) => {
      pregnancy.missedBirth = true;
      pregnancy.missedBirthCount = (pregnancy.missedBirthCount || 0) + 1;
    }
  }
};

export const DEFAULT_AVOIDANCE: Record<string, number> = {
  Kylar: 0,
  'Black Wolf': 0,
  'Great Hawk': 0,
  Eden: 0,
  'Ivory Wraith': 0,
  Gwylan: 0,
  Robin: 50,
  Whitney: 50,
  Alex: 50,
  Wren: 50,
  Avery: 50
};
