// ./src/modules/CharacterAddon/TransformationConfig.ts

import dol from '../../host/DoL';

export type DecayCondition = () => boolean;
export type SuppressCondition = (sourceName: string) => boolean;
export type BuildUpdater = (change: number) => void;

export interface NativeTransformState {
  name: string;
  level: () => number;
  build: () => number;
}

export type NativeMacroMap = Record<string, [string, () => number]>;

export interface NativeHistoryEntry {
  name: string;
  level: () => number;
  max: number;
}

// prettier-ignore
export const DecayConditions: Record<string, DecayCondition[]> = {
  wolf: [
    () => dol.variables.wolfbuild >= 1,
    () => dol.variables.worn.neck.name !== 'spiked collar',
    () => dol.variables.worn.neck.name !== 'spiked collar with leash',
    () => playerNormalPregnancyType() !== 'wolf'
  ],
  cat: [
    () => dol.variables.catbuild >= 1,
    () => dol.variables.worn.neck.name !== 'cat bell collar',
    () => playerNormalPregnancyType() !== 'cat'
  ],
  cow: [
    () => dol.variables.cowbuild >= 1,
    () => dol.variables.worn.neck.name !== 'cow bell',
    () => playerNormalPregnancyType() !== 'cow'
  ],
  bird: [
    () => dol.variables.birdbuild >= 1,
    () => dol.variables.worn.head.name !== 'feathered hair clip',
    () => dol.variables.worn.neck.name !== 'feather necklace',
    () => playerNormalPregnancyType() !== 'hawk'
  ],
  fox: [
    () => dol.variables.foxbuild >= 1,
    () => dol.variables.worn.head.name !== 'spirit mask',
    () => dol.variables.worn.neck.name !== 'jasper pendant',
    () => playerNormalPregnancyType() !== 'fox'
  ]
};

// prettier-ignore
export const SuppressConditions: Record<string, SuppressCondition[]> = {
  wolf: [
    (sourceName: string) => sourceName !== 'wolf',
    () => dol.variables.worn.neck.name !== 'spiked collar',
    () => dol.variables.worn.neck.name !== 'spiked collar with leash'
  ],
  cat: [
    (sourceName: string) => sourceName !== 'cat',
    () => dol.variables.worn.neck.name !== 'cat bell collar'
  ],
  cow: [
    (sourceName: string) => sourceName !== 'cow',
    () => dol.variables.worn.neck.name !== 'cow bell'
  ],
  bird: [
    (sourceName: string) => sourceName !== 'bird',
    () => dol.variables.worn.head.name !== 'feathered hair clip',
    () => dol.variables.worn.neck.name !== 'feather necklace'
  ],
  fox: [
    (sourceName: string) => sourceName !== 'fox',
    () => dol.variables.worn.head.name !== 'spirit mask',
    () => dol.variables.worn.neck.name !== 'jasper pendant'
  ]
};

// prettier-ignore
export const AnimalTransforms: NativeTransformState[] = [
  { name: 'wolf' , level: () => dol.variables.wolfgirl , build: () => dol.variables.wolfbuild },
  { name: 'cat'  , level: () => dol.variables.cat      , build: () => dol.variables.catbuild },
  { name: 'cow'  , level: () => dol.variables.cow      , build: () => dol.variables.cowbuild },
  { name: 'bird' , level: () => dol.variables.harpy    , build: () => dol.variables.birdbuild },
  { name: 'fox'  , level: () => dol.variables.fox      , build: () => dol.variables.foxbuild }
];

// prettier-ignore
export const AnimalMacros: NativeMacroMap = {
  wolf : ['wolfTransform'  , () => dol.variables.wolfgirl],
  cat  : ['catTransform'   , () => dol.variables.cat],
  cow  : ['cowTransform'   , () => dol.variables.cow],
  bird : ['harpyTransform' , () => dol.variables.harpy],
  fox  : ['foxTransform'   , () => dol.variables.fox]
};

// prettier-ignore
export const HistoryTransforms: NativeHistoryEntry[] = [
  { name: 'angel'      , level: () => dol.variables.angel, max: 6 },
  { name: 'fallenangel', level: () => dol.variables.fallenangel, max: 2 },
  { name: 'demon'      , level: () => dol.variables.demon, max: 6 },
  { name: 'dryad'      , level: () => dol.variables.dryad, max: 6 },
  { name: 'wolfgirl'   , level: () => dol.variables.wolfgirl, max: 6 },
  { name: 'cat'        , level: () => dol.variables.cat, max: 6 },
  { name: 'cow'        , level: () => dol.variables.cow, max: 6 },
  { name: 'harpy'      , level: () => dol.variables.harpy, max: 6 },
  { name: 'fox'        , level: () => dol.variables.fox, max: 6 }
];

// prettier-ignore
export const BuildUpdaters: Record<string, BuildUpdater> = {
  wolf  : (change: number) => dol.variables.wolfbuild   = Math.clamp(dol.variables.wolfbuild   + change, 0, 100),
  cat   : (change: number) => dol.variables.catbuild    = Math.clamp(dol.variables.catbuild    + change, 0, 100),
  cow   : (change: number) => dol.variables.cowbuild    = Math.clamp(dol.variables.cowbuild    + change, 0, 100),
  bird  : (change: number) => dol.variables.birdbuild   = Math.clamp(dol.variables.birdbuild   + change, 0, 100),
  fox   : (change: number) => dol.variables.foxbuild    = Math.clamp(dol.variables.foxbuild    + change, 0, 100),
  angel : (change: number) => dol.variables.angelbuild  = Math.clamp(dol.variables.angelbuild  + change, 0, 100),
  fallen: (change: number) => dol.variables.fallenbuild = Math.clamp(dol.variables.fallenbuild + change, 0, 100),
  demon : (change: number) => dol.variables.demonbuild  = Math.clamp(dol.variables.demonbuild  + change, 0, 100)
};
