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

interface TransformationPatch {
  parts?: TransformationPart[];
  traits?: TransformationPart[];
}

class DoLPcompat {
  private static active(name: string, part: string): boolean {
    const value = V.transformationParts?.[name]?.[part];
    return value !== undefined && value !== 'disabled' && value !== 'hidden';
  }

  // prettier-ignore
  public static readonly DecayConditions: Record<string, DecayCondition[]> = {
    wolf: [
      () => V.wolfbuild >= 1,
      () => V.worn.neck.name !== 'spiked collar',
      () => V.worn.neck.name !== 'spiked collar with leash',
      () => playerNormalPregnancyType() !== 'wolf',
      () => !DoLPcompat.active('okami', 'misc')
    ],
    cat: [
      () => V.catbuild >= 1,
      () => V.worn.neck.name !== 'cat bell collar',
      () => V.worn.head.name !== 'fish hairpin',
      () => playerNormalPregnancyType() !== 'cat'
    ],
    bird: [
      () => V.birdbuild >= 1,
      () => V.worn.head.name !== 'feathered hair clip',
      () => V.worn.neck.name !== 'feather necklace',
      () => playerNormalPregnancyType() !== 'hawk',
      () => !DoLPcompat.active('seraphim', 'wings')
    ],
    fox: [
      () => V.foxbuild >= 1,
      () => V.worn.head.name !== 'spirit mask',
      () => V.worn.neck.name !== 'jasper pendant',
      () => playerNormalPregnancyType() !== 'fox',
      () => !DoLPcompat.active('kitsune', 'tail')
    ],
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
    cat: [
      source => source !== 'cat',
      () => V.worn.neck.name !== 'cat bell collar',
      () => V.worn.head.name !== 'fish hairpin'
    ],
    waterdragon: [
      source => source !== 'waterdragon',
      () => V.worn.earrings.variable !== 'lilacheadpiece'
    ],
    bear: [
      source => source !== 'bear',
      () => V.worn.handheld.name !== 'honey pouch',
      () => V.worn.handheld.name !== 'bear bag',
      () => V.worn.head.name !== 'honey hair clip'
    ],
    bunny: [
      source => source !== 'bunny',
      () => V.worn.head.name !== 'carrot pin'
    ]
  };

  // prettier-ignore
  public static readonly AnimalTransforms: NativeTransformState[] = [
    { name: 'waterdragon', level: () => V.waterdragon, build: () => V.waterdragonbuild },
    { name: 'bear', level: () => V.bear, build: () => V.bearbuild },
    { name: 'bunny', level: () => V.bunny, build: () => V.bunnybuild }
  ];

  // prettier-ignore
  public static readonly AnimalMacros: NativeMacroMap = {
    waterdragon: ['waterdragonTransform', () => V.waterdragon],
    bear: ['bearTransform', () => V.bear],
    bunny: ['bunnyTransform', () => V.bunny]
  };

  // prettier-ignore
  public static readonly HistoryTransforms: NativeHistoryEntry[] = [
    { name: 'waterdragon', level: () => V.waterdragon, max: 6 },
    { name: 'bear', level: () => V.bear, max: 6 },
    { name: 'bunny', level: () => V.bunny, max: 6 }
  ];

  // prettier-ignore
  public static readonly BuildUpdaters: Record<string, BuildUpdater> = {
    waterdragon: change => V.waterdragonbuild = Math.clamp(V.waterdragonbuild + change, 0, 100),
    bear: change => V.bearbuild = Math.clamp(V.bearbuild + change, 0, 100),
    bunny: change => V.bunnybuild = Math.clamp(V.bunnybuild + change, 0, 100)
  };

  // Plus 对原版转化增加的 parts / traits
  public static readonly TransformationPatches: Record<string, TransformationPatch> = {
    wolf: {
      parts: [{ name: 'cheeks', tfRequired: 5, default: 'feral' }],
      traits: [
        { name: 'fangs', tfRequired: 2 },
        { name: 'predatoryAnimal', tfRequired: 6 }
      ]
    },

    cat: {
      parts: [{ name: 'heterochromia', tfRequired: 7 }],
      traits: [
        { name: 'fangs', tfRequired: 2 },
        { name: 'sharpEyes', tfRequired: 2 },
        { name: 'predatoryAnimal', tfRequired: 6 }
      ]
    },

    bird: {
      traits: [
        { name: 'sharpEyes', tfRequired: 2 },
        { name: 'mateForLife', tfRequired: 3 },
        { name: 'predatoryAnimal', tfRequired: 6 }
      ]
    },

    fox: {
      parts: [{ name: 'cheeks', tfRequired: 5 }],
      traits: [
        { name: 'fangs', tfRequired: 2 },
        { name: 'sharpEyes', tfRequired: 2 },
        { name: 'mateForLife', tfRequired: 3 },
        { name: 'chase', tfRequired: 4 },
        { name: 'predatoryAnimal', tfRequired: 6 }
      ]
    }
  };

  // Plus 新增转化
  // prettier-ignore
  public static readonly Transformations: SetupTransformation[] = [
    {
      name: 'waterdragon',
      get level() { return V.waterdragon; },
      get build() { return V.waterdragonbuild; },
      type: 'physicalTransform',
      parts: [
        { name: 'horns', tfRequired: 3 },
        { name: 'ears', tfRequired: 4 },
        { name: 'tail', tfRequired: 6 }
      ],
      traits: [
        { name: 'fangs', tfRequired: 2 },
        { name: 'sharpEyes', tfRequired: 2 },
        { name: 'dragonEyes', tfRequired: 2 },
        { name: 'wdgrace', tfRequired: 6 },
        { name: 'aquatic', tfRequired: 7 }
      ]
    },

    {
      name: 'bear',
      get level() { return V.bear; },
      get build() { return V.bearbuild; },
      type: 'physicalTransform',
      parts: [
        { name: 'ears', tfRequired: 4 },
        { name: 'plumage', tfRequired: 4 },
        { name: 'tail', tfRequired: 6 },
        {
          name: 'pubes',
          tfRequired: 6,
          get default() {
            return V.settings.pubicHairEnabled ? 'default' : 'hidden';
          }
        }
      ],
      traits: [
        { name: 'fangs', tfRequired: 2 }
      ]
    },

    {
      name: 'bunny',
      get level() { return V.bunny; },
      get build() { return V.bunnybuild; },
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

    {
      name: 'okami',
      get level() { return DoLPcompat.active('okami', 'misc') ? 1 : 0; },
      get build() { return DoLPcompat.active('okami', 'misc') ? 100 : 0; },
      type: 'specialTransform',
      parts: [
        { name: 'ears', tfRequired: 1 },
        { name: 'tail', tfRequired: 1 },
        { name: 'wings', tfRequired: 1 },
        { name: 'misc', tfRequired: 1 }
      ],
      traits: []
    },

    {
      name: 'seraphim',
      get level() { return DoLPcompat.active('seraphim', 'wings') ? 1 : 0; },
      get build() { return DoLPcompat.active('seraphim', 'wings') ? 100 : 0; },
      type: 'specialTransform',
      parts: [
        { name: 'wings', tfRequired: 1 },
        { name: 'plumage', tfRequired: 1 },
        { name: 'eyes', tfRequired: 1 }
      ],
      traits: []
    },

    {
      name: 'kitsune',
      get level() { return DoLPcompat.active('kitsune', 'tail') ? 1 : 0; },
      get build() { return DoLPcompat.active('kitsune', 'tail') ? 100 : 0; },
      type: 'specialTransform',
      parts: [
        { name: 'ears', tfRequired: 1 },
        { name: 'tail', tfRequired: 1 },
        { name: 'cheeks', tfRequired: 1 },
        { name: 'misc', tfRequired: 1 }
      ],
      traits: []
    }
  ];

  public static readonly PreservedTraits = [
    'fangs',
    'sharpEyes',
    'dragonEyes',
    'mateForLife',
    'chase',
    'flaunting',
    'preyAnimal',
    'strongFeet',
    'predatoryAnimal',
    'tempTolerance',
    'aquatic',
    'wdgrace',
    'activeTF'
  ];

  public static transformChange(change: number): number {
    if (change < 1) return change;

    const level = Number(V.featsBoosts?.upgrades?.adaptiveGenes ?? 0);
    return level >= 1 ? (change * (level + 50)) / 50 : change;
  }

  public static syncCompositeTransformations(): void {
    if (DoLPcompat.active('seraphim', 'wings')) {
      V.harpy = Math.max(V.harpy, 6);
      V.birdbuild = Math.max(V.birdbuild, 100);
      DoLPcompat.forceAngel();
    }

    if (DoLPcompat.active('kitsune', 'tail')) {
      V.fox = Math.max(V.fox, 6);
      V.foxbuild = Math.max(V.foxbuild, 100);
      DoLPcompat.forceAngel();
    }

    if (DoLPcompat.active('okami', 'misc')) {
      V.wolfgirl = Math.max(V.wolfgirl, 6);
      V.wolfbuild = Math.max(V.wolfbuild, 100);
      DoLPcompat.forceAngel();
    }
  }

  private static forceAngel(): void {
    V.angel = Math.max(V.angel, 6);
    V.angelbuild = Math.max(V.angelbuild, 50);
    V.specialTransform = 1;
  }

  public static extendValidState(valid: { names: Set<string>; traits: Set<string> }): void {
    for (const tf of DoLPcompat.Transformations) valid.names.add(tf.name);
    for (const trait of DoLPcompat.PreservedTraits) valid.traits.add(trait);
  }

  public static mergeTransformations<
    T extends {
      name?: string;
      parts?: TransformationPart[];
      traits?: TransformationPart[];
    }
  >(base: T[]): Array<T | SetupTransformation> {
    const result = base.map(tf => {
      if (!tf.name) return tf;

      const patch = DoLPcompat.TransformationPatches[tf.name];
      if (!patch) return tf;

      return {
        ...tf,
        parts: DoLPcompat.mergeParts(tf.parts, patch.parts),
        traits: DoLPcompat.mergeParts(tf.traits, patch.traits)
      } as T;
    });

    const names = new Set(result.map(tf => tf.name).filter(Boolean));

    return [...result, ...DoLPcompat.Transformations.filter(tf => !names.has(tf.name))];
  }

  private static mergeParts(base: TransformationPart[] = [], extra: TransformationPart[] = []): TransformationPart[] {
    const result = [...base];

    for (const part of extra) {
      const index = result.findIndex(item => item.name === part.name);

      if (index === -1) {
        result.push(part);
      } else {
        result[index] = { ...result[index], ...part };
      }
    }

    return result;
  }
}

export default DoLPcompat;
