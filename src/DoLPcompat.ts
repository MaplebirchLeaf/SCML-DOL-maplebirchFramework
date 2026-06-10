// ./src/DoLPcompat.ts

import type { BuildUpdater, DecayCondition, NativeHistoryEntry, NativeMacroMap, NativeTransformState, SuppressCondition } from './modules/CharacterAddon/TransformationConfig';

interface TransformationPart {
  name: string;
  tfRequired: number;
  default?: string;
  [key: string]: any;
}

interface SetupTransformation {
  name: string;
  readonly level: number;
  readonly build: number;
  type: 'physicalTransform' | 'specialTransform';
  parts: TransformationPart[];
  traits: TransformationPart[];
}

class DoLPcompat {
  // prettier-ignore
  public static readonly DecayConditions: Record<string, DecayCondition[]> = {
    waterdragon: [
      () => V.waterdragonbuild >= 1,
      () => V.worn.earrings.variable !== 'lilacheadpiece',
      () => playerNormalPregnancyType() !== 'waterdragon'
    ],
    bear: [
      () => V.bearbuild >= 1,
      () => V.worn.handheld.name !== 'honey pouch',
      () => V.worn.handheld.name !== 'bear bag',
      () => V.worn.head.name !== 'honey hair clip',
      () => playerNormalPregnancyType() !== 'bear'
    ],
    bunny: [
      () => V.bunnybuild >= 1,
      () => V.worn.head.name !== 'carrot pin',
      () => playerNormalPregnancyType() !== 'bunny'
    ]
  };

  // prettier-ignore
  public static readonly SuppressConditions: Record<string, SuppressCondition[]> = {
    waterdragon: [
      (sourceName: string) => sourceName !== 'waterdragon',
      () => V.worn.earrings.variable !== 'lilacheadpiece'
    ],
    bear: [
      (sourceName: string) => sourceName !== 'bear',
      () => V.worn.handheld.name !== 'honey pouch',
      () => V.worn.handheld.name !== 'bear bag',
      () => V.worn.head.name !== 'honey hair clip'
    ],
    bunny: [
      (sourceName: string) => sourceName !== 'bunny',
      () => V.worn.head.name !== 'carrot pin'
    ]
  };

  // prettier-ignore
  public static readonly AnimalTransforms: NativeTransformState[] = [
    { name: 'waterdragon', level: () => V.waterdragon, build: () => V.waterdragonbuild },
    { name: 'bear'       , level: () => V.bear       , build: () => V.bearbuild },
    { name: 'bunny'      , level: () => V.bunny      , build: () => V.bunnybuild }
  ];

  // prettier-ignore
  public static readonly AnimalMacros: NativeMacroMap = {
    waterdragon: ['waterdragonTransform', () => V.waterdragon],
    bear       : ['bearTransform'       , () => V.bear],
    bunny      : ['bunnyTransform'      , () => V.bunny]
  };

  // prettier-ignore
  public static readonly HistoryTransforms: NativeHistoryEntry[] = [
    { name: 'waterdragon', level: () => V.waterdragon, max: 6 },
    { name: 'bear'       , level: () => V.bear       , max: 6 },
    { name: 'bunny'      , level: () => V.bunny      , max: 6 }
  ];

  // prettier-ignore
  public static readonly BuildUpdaters: Record<string, BuildUpdater> = {
    waterdragon: (change: number) => V.waterdragonbuild = Math.clamp(V.waterdragonbuild + change, 0, 100),
    bear       : (change: number) => V.bearbuild        = Math.clamp(V.bearbuild        + change, 0, 100),
    bunny      : (change: number) => V.bunnybuild       = Math.clamp(V.bunnybuild       + change, 0, 100)
  };

  // prettier-ignore
  public static readonly Transformations: SetupTransformation[] = [
    {
      name: 'waterdragon',
      get level() {
        return V.waterdragon;
      },
      get build() {
        return V.waterdragonbuild;
      },
      type: 'physicalTransform',
      parts: [
        { name: 'horns', tfRequired: 2 },
        { name: 'ears' , tfRequired: 4 },
        { name: 'tail' , tfRequired: 6 }
      ],
      traits: [
        { name: 'fangs'    , tfRequired: 2 },
        { name: 'leviathan', tfRequired: 6 },
        { name: 'aquatic'  , tfRequired: 7 }
      ]
    },
    {
      name: 'bear',
      get level() {
        return V.bear;
      },
      get build() {
        return V.bearbuild;
      },
      type: 'physicalTransform',
      parts: [
        { name: 'ears'   , tfRequired: 4 },
        { name: 'plumage', tfRequired: 4 },
        { name: 'tail'   , tfRequired: 6 },
        {
          name: 'pubes',
          tfRequired: 6,
          get default() {
            return V.settings.pubicHairEnabled === true ? 'default' : 'hidden';
          }
        }
      ],
      traits: [
        { name: 'fangs', tfRequired: 2 }
      ]
    },
    {
      name: 'bunny',
      get level() {
        return V.bunny;
      },
      get build() {
        return V.bunnybuild;
      },
      type: 'physicalTransform',
      parts: [
        { name: 'ears', tfRequired: 4 },
        { name: 'tail', tfRequired: 6 }
      ],
      traits: [
        { name: 'strongFeet', tfRequired: 2 },
        { name: 'preyAnimal', tfRequired: 6 }
      ]
    },

    // okami / seraphim / kitsune 是 DoLP 的特殊/组合转化。
    {
      name: 'okami',
      get level() {
        return 0;
      },
      get build() {
        return 0;
      },
      type: 'specialTransform',
      parts: [
        { name: 'ears' , tfRequired: 1 },
        { name: 'tail' , tfRequired: 1 },
        { name: 'wings', tfRequired: 1 },
        { name: 'misc' , tfRequired: 1 }
      ],
      traits: []
    },
    {
      name: 'seraphim',
      get level() {
        return 0;
      },
      get build() {
        return 0;
      },
      type: 'specialTransform',
      parts: [
        { name: 'wings' , tfRequired: 1 },
        { name: 'plumage', tfRequired: 1 },
        { name: 'eyes'   , tfRequired: 1 }
      ],
      traits: []
    },
    {
      name: 'kitsune',
      get level() {
        return 0;
      },
      get build() {
        return 0;
      },
      type: 'specialTransform',
      parts: [
        { name: 'ears'  , tfRequired: 1 },
        { name: 'tail'  , tfRequired: 1 },
        { name: 'cheeks', tfRequired: 1 },
        { name: 'misc'  , tfRequired: 1 }
      ],
      traits: []
    }
  ];

  public static mergeTransformations<T extends { name?: string }>(base: T[]): Array<T | SetupTransformation> {
    const names = new Set(base.map(tf => tf.name).filter(Boolean));
    return [...base, ...DoLPcompat.Transformations.filter(tf => !names.has(tf.name))];
  }
}

export default DoLPcompat;
