// ./src/DoLPcompat.ts

import maplebirch from './core';
import type { BuildUpdater, DecayCondition, NativeHistoryEntry, NativeMacroMap, NativeTransformState, SuppressCondition } from './modules/CharacterAddon/TransformationConfig';
import dol from './host/Adapter';

interface TransformationPart {
  name: string;
  tfRequired: number;
  default?: string;
  [key: string]: unknown;
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

class Transformations {
  private static active(name: string, part: string): boolean {
    const value = dol.variables.transformationParts?.[name]?.[part];
    return value !== undefined && value !== 'disabled' && value !== 'hidden';
  }

  // prettier-ignore
  public static readonly DecayConditions: Record<string, DecayCondition[]> = {
    wolf: [
      () => dol.variables.wolfbuild >= 1,
      () => dol.variables.worn.neck.name !== 'spiked collar',
      () => dol.variables.worn.neck.name !== 'spiked collar with leash',
      () => playerNormalPregnancyType() !== 'wolf',
      () => !DoLPcompat.Transformations.active('okami', 'misc')
    ],
    cat: [
      () => dol.variables.catbuild >= 1,
      () => dol.variables.worn.neck.name !== 'cat bell collar',
      () => dol.variables.worn.head.name !== 'fish hairpin',
      () => playerNormalPregnancyType() !== 'cat'
    ],
    bird: [
      () => dol.variables.birdbuild >= 1,
      () => dol.variables.worn.head.name !== 'feathered hair clip',
      () => dol.variables.worn.neck.name !== 'feather necklace',
      () => playerNormalPregnancyType() !== 'hawk',
      () => !DoLPcompat.Transformations.active('seraphim', 'wings')
    ],
    fox: [
      () => dol.variables.foxbuild >= 1,
      () => dol.variables.worn.head.name !== 'spirit mask',
      () => dol.variables.worn.neck.name !== 'jasper pendant',
      () => playerNormalPregnancyType() !== 'fox',
      () => !DoLPcompat.Transformations.active('kitsune', 'tail')
    ],
    waterdragon: [
      () => dol.variables.waterdragonbuild >= 1,
      () => dol.variables.worn.earrings.variable !== 'lilacheadpiece',
      () => playerNormalPregnancyType() !== 'waterdragon'
    ],
    bear: [
      () => dol.variables.bearbuild >= 1,
      () => dol.variables.worn.handheld.name !== 'honey pouch',
      () => dol.variables.worn.handheld.name !== 'bear bag',
      () => dol.variables.worn.head.name !== 'honey hair clip',
      () => playerNormalPregnancyType() !== 'bear'
    ],
    bunny: [
      () => dol.variables.bunnybuild >= 1,
      () => dol.variables.worn.head.name !== 'carrot pin',
      () => playerNormalPregnancyType() !== 'bunny'
    ]
  };

  // prettier-ignore
  public static readonly SuppressConditions: Record<string, SuppressCondition[]> = {
    cat: [
      source => source !== 'cat',
      () => dol.variables.worn.neck.name !== 'cat bell collar',
      () => dol.variables.worn.head.name !== 'fish hairpin'
    ],
    waterdragon: [
      source => source !== 'waterdragon',
      () => dol.variables.worn.earrings.variable !== 'lilacheadpiece'
    ],
    bear: [
      source => source !== 'bear',
      () => dol.variables.worn.handheld.name !== 'honey pouch',
      () => dol.variables.worn.handheld.name !== 'bear bag',
      () => dol.variables.worn.head.name !== 'honey hair clip'
    ],
    bunny: [
      source => source !== 'bunny',
      () => dol.variables.worn.head.name !== 'carrot pin'
    ]
  };

  // prettier-ignore
  public static readonly AnimalTransforms: NativeTransformState[] = [
    { name: 'waterdragon', level: () => dol.variables.waterdragon, build: () => dol.variables.waterdragonbuild },
    { name: 'bear', level: () => dol.variables.bear, build: () => dol.variables.bearbuild },
    { name: 'bunny', level: () => dol.variables.bunny, build: () => dol.variables.bunnybuild }
  ];

  // prettier-ignore
  public static readonly AnimalMacros: NativeMacroMap = {
    waterdragon: ['waterdragonTransform', () => dol.variables.waterdragon],
    bear: ['bearTransform', () => dol.variables.bear],
    bunny: ['bunnyTransform', () => dol.variables.bunny]
  };

  // prettier-ignore
  public static readonly HistoryTransforms: NativeHistoryEntry[] = [
    { name: 'waterdragon', level: () => dol.variables.waterdragon, max: 6 },
    { name: 'bear', level: () => dol.variables.bear, max: 6 },
    { name: 'bunny', level: () => dol.variables.bunny, max: 6 }
  ];

  // prettier-ignore
  public static readonly BuildUpdaters: Record<string, BuildUpdater> = {
    waterdragon: change => dol.variables.waterdragonbuild = Math.clamp(dol.variables.waterdragonbuild + change, 0, 100),
    bear: change => dol.variables.bearbuild = Math.clamp(dol.variables.bearbuild + change, 0, 100),
    bunny: change => dol.variables.bunnybuild = Math.clamp(dol.variables.bunnybuild + change, 0, 100)
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
      get level() { return dol.variables.waterdragon; },
      get build() { return dol.variables.waterdragonbuild; },
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
      get level() { return dol.variables.bear; },
      get build() { return dol.variables.bearbuild; },
      type: 'physicalTransform',
      parts: [
        { name: 'ears', tfRequired: 4 },
        { name: 'plumage', tfRequired: 4 },
        { name: 'tail', tfRequired: 6 },
        {
          name: 'pubes',
          tfRequired: 6,
          get default() {
            return dol.variables.settings.pubicHairEnabled ? 'default' : 'hidden';
          }
        }
      ],
      traits: [
        { name: 'fangs', tfRequired: 2 }
      ]
    },

    {
      name: 'bunny',
      get level() { return dol.variables.bunny; },
      get build() { return dol.variables.bunnybuild; },
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
      get level() { return DoLPcompat.Transformations.active('okami', 'misc') ? 1 : 0; },
      get build() { return DoLPcompat.Transformations.active('okami', 'misc') ? 100 : 0; },
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
      get level() { return DoLPcompat.Transformations.active('seraphim', 'wings') ? 1 : 0; },
      get build() { return DoLPcompat.Transformations.active('seraphim', 'wings') ? 100 : 0; },
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
      get level() { return DoLPcompat.Transformations.active('kitsune', 'tail') ? 1 : 0; },
      get build() { return DoLPcompat.Transformations.active('kitsune', 'tail') ? 100 : 0; },
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

  public static change(change: number): number {
    if (change < 1) return change;
    const level = Number(dol.variables.featsBoosts?.upgrades?.adaptiveGenes ?? 0);
    return level >= 1 ? (change * (level + 50)) / 50 : change;
  }

  public static composite(): void {
    if (DoLPcompat.Transformations.active('seraphim', 'wings')) {
      dol.variables.harpy = Math.max(dol.variables.harpy, 6);
      dol.variables.birdbuild = Math.max(dol.variables.birdbuild, 100);
      DoLPcompat.Transformations.forceAngel();
    }

    if (DoLPcompat.Transformations.active('kitsune', 'tail')) {
      dol.variables.fox = Math.max(dol.variables.fox, 6);
      dol.variables.foxbuild = Math.max(dol.variables.foxbuild, 100);
      DoLPcompat.Transformations.forceAngel();
    }

    if (DoLPcompat.Transformations.active('okami', 'misc')) {
      dol.variables.wolfgirl = Math.max(dol.variables.wolfgirl, 6);
      dol.variables.wolfbuild = Math.max(dol.variables.wolfbuild, 100);
      DoLPcompat.Transformations.forceAngel();
    }
  }

  private static forceAngel(): void {
    dol.variables.angel = Math.max(dol.variables.angel, 6);
    dol.variables.angelbuild = Math.max(dol.variables.angelbuild, 50);
    dol.variables.specialTransform = 1;
  }

  public static extend(valid: { names: Set<string>; traits: Set<string> }): void {
    for (const tf of DoLPcompat.Transformations.Transformations) valid.names.add(tf.name);
    for (const trait of DoLPcompat.Transformations.PreservedTraits) valid.traits.add(trait);
  }

  public static merge<
    T extends {
      name?: string;
      parts?: TransformationPart[];
      traits?: TransformationPart[];
    }
  >(base: T[]): Array<T | SetupTransformation> {
    const result = base.map(tf => {
      if (!tf.name) return tf;

      const patch = DoLPcompat.Transformations.TransformationPatches[tf.name];
      if (!patch) return tf;

      return DoLPcompat.Transformations.mergeProperties(tf, {
        parts: DoLPcompat.Transformations.mergeParts(tf.parts, patch.parts),
        traits: DoLPcompat.Transformations.mergeParts(tf.traits, patch.traits)
      });
    });

    const names = new Set(result.map(tf => tf.name).filter(Boolean));
    return [...result, ...DoLPcompat.Transformations.Transformations.filter(tf => !names.has(tf.name))];
  }

  private static mergeProperties<T extends object>(base: T, extra: object): T {
    return Object.create(Object.getPrototypeOf(base), {
      ...Object.getOwnPropertyDescriptors(base),
      ...Object.getOwnPropertyDescriptors(extra)
    }) as T;
  }

  private static mergeParts(base: TransformationPart[] = [], extra: TransformationPart[] = []): TransformationPart[] {
    const result = [...base];
    for (const part of extra) {
      const index = result.findIndex(item => item.name === part.name);
      if (index === -1) {
        result.push(part);
      } else {
        result[index] = DoLPcompat.Transformations.mergeProperties(result[index], part);
      }
    }
    return result;
  }
}

class DoLPcompat {
  public static get isDoLP() {
    return String(maplebirch.gameVersion ?? '').includes('DoLP');
  }

  public static readonly Transformations = Transformations;

  public static nnpc = {
    showfn: (options: Record<string, any>) => {
      const nnpc = options.maplebirch!.nnpc!;
      if (nnpc.show) return false;
      if (dol.temporary.effects === true) return true;
      return options.show_nnpc === true;
    }
  };
}

export default DoLPcompat;
