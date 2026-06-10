// ./src/modules/CharacterAddon/TransformationConfig.ts

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
    () => V.wolfbuild >= 1,
    () => V.worn.neck.name !== 'spiked collar',
    () => V.worn.neck.name !== 'spiked collar with leash',
    () => playerNormalPregnancyType() !== 'wolf'
  ],
  cat: [
    () => V.catbuild >= 1,
    () => V.worn.neck.name !== 'cat bell collar',
    () => playerNormalPregnancyType() !== 'cat'
  ],
  cow: [
    () => V.cowbuild >= 1,
    () => V.worn.neck.name !== 'cow bell',
    () => playerNormalPregnancyType() !== 'cow'
  ],
  bird: [
    () => V.birdbuild >= 1,
    () => V.worn.head.name !== 'feathered hair clip',
    () => V.worn.neck.name !== 'feather necklace',
    () => playerNormalPregnancyType() !== 'hawk'
  ],
  fox: [
    () => V.foxbuild >= 1,
    () => V.worn.head.name !== 'spirit mask',
    () => V.worn.neck.name !== 'jasper pendant',
    () => playerNormalPregnancyType() !== 'fox'
  ]
};

// prettier-ignore
export const SuppressConditions: Record<string, SuppressCondition[]> = {
  wolf: [
    (sourceName: string) => sourceName !== 'wolf',
    () => V.worn.neck.name !== 'spiked collar',
    () => V.worn.neck.name !== 'spiked collar with leash'
  ],
  cat: [
    (sourceName: string) => sourceName !== 'cat',
    () => V.worn.neck.name !== 'cat bell collar'
  ],
  cow: [
    (sourceName: string) => sourceName !== 'cow',
    () => V.worn.neck.name !== 'cow bell'
  ],
  bird: [
    (sourceName: string) => sourceName !== 'bird',
    () => V.worn.head.name !== 'feathered hair clip',
    () => V.worn.neck.name !== 'feather necklace'
  ],
  fox: [
    (sourceName: string) => sourceName !== 'fox',
    () => V.worn.head.name !== 'spirit mask',
    () => V.worn.neck.name !== 'jasper pendant'
  ]
};

// prettier-ignore
export const AnimalTransforms: NativeTransformState[] = [
  { name: 'wolf' , level: () => V.wolfgirl , build: () => V.wolfbuild },
  { name: 'cat'  , level: () => V.cat      , build: () => V.catbuild },
  { name: 'cow'  , level: () => V.cow      , build: () => V.cowbuild },
  { name: 'bird' , level: () => V.harpy    , build: () => V.birdbuild },
  { name: 'fox'  , level: () => V.fox      , build: () => V.foxbuild }
];

// prettier-ignore
export const AnimalMacros: NativeMacroMap = {
  wolf : ['wolfTransform'  , () => V.wolfgirl],
  cat  : ['catTransform'   , () => V.cat],
  cow  : ['cowTransform'   , () => V.cow],
  bird : ['harpyTransform' , () => V.harpy],
  fox  : ['foxTransform'   , () => V.fox]
};

// prettier-ignore
export const HistoryTransforms: NativeHistoryEntry[] = [
  { name: 'angel'      , level: () => V.angel, max: 6 },
  { name: 'fallenangel', level: () => V.fallenangel, max: 2 },
  { name: 'demon'      , level: () => V.demon, max: 6 },
  { name: 'dryad'      , level: () => V.dryad, max: 6 },
  { name: 'wolfgirl'   , level: () => V.wolfgirl, max: 6 },
  { name: 'cat'        , level: () => V.cat, max: 6 },
  { name: 'cow'        , level: () => V.cow, max: 6 },
  { name: 'harpy'      , level: () => V.harpy, max: 6 },
  { name: 'fox'        , level: () => V.fox, max: 6 }
];

// prettier-ignore
export const BuildUpdaters: Record<string, BuildUpdater> = {
  wolf  : (change: number) => V.wolfbuild   = Math.clamp(V.wolfbuild   + change, 0, 100),
  cat   : (change: number) => V.catbuild    = Math.clamp(V.catbuild    + change, 0, 100),
  cow   : (change: number) => V.cowbuild    = Math.clamp(V.cowbuild    + change, 0, 100),
  bird  : (change: number) => V.birdbuild   = Math.clamp(V.birdbuild   + change, 0, 100),
  fox   : (change: number) => V.foxbuild    = Math.clamp(V.foxbuild    + change, 0, 100),
  angel : (change: number) => V.angelbuild  = Math.clamp(V.angelbuild  + change, 0, 100),
  fallen: (change: number) => V.fallenbuild = Math.clamp(V.fallenbuild + change, 0, 100),
  demon : (change: number) => V.demonbuild  = Math.clamp(V.demonbuild  + change, 0, 100)
};
