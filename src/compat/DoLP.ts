// ./src/compat/DoLP.ts

import type { MaplebirchCore } from '../core';
import type { BuildUpdater, DecayCondition, NativeHistoryEntry, NativeMacroMap, NativeTransformState, SuppressCondition } from '../modules/CharacterAddon/TransformationConfig';
import dol from '../host/DoL';

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

class DoLPTransformations {
  public static active(name: string, part: string): boolean {
    const value = dol.variables.transformationParts?.[name]?.[part];
    return value !== undefined && value !== 'disabled' && value !== 'hidden';
  }

  // prettier-ignore
  public static readonly PreservedTraits = [
    'fangs', 'sharpEyes', 'dragonEyes', 'mateForLife', 'chase', 'flaunting',
    'preyAnimal', 'strongFeet', 'predatoryAnimal', 'tempTolerance', 'aquatic',
    'wdgrace', 'activeTF'
  ] as const;

  // prettier-ignore
  public static readonly AnimalTransforms: NativeTransformState[] = [
    { name: 'waterdragon', level: () => dol.variables.waterdragon, build: () => dol.variables.waterdragonbuild }, // 水龙转化 (Water Dragon)
    { name: 'bear',        level: () => dol.variables.bear,        build: () => dol.variables.bearbuild },        // 熊转化 (Bear)
    { name: 'bunny',       level: () => dol.variables.bunny,       build: () => dol.variables.bunnybuild }        // 兔转化 (Bunny)
  ];

  // prettier-ignore
  public static readonly AnimalMacros: NativeMacroMap = {
    waterdragon: ['waterdragonTransform', () => dol.variables.waterdragon], // 水龙转化 (Water Dragon)
    bear       : ['bearTransform'       , () => dol.variables.bear],        // 熊转化 (Bear)
    bunny      : ['bunnyTransform'      , () => dol.variables.bunny]        // 兔转化 (Bunny)
  };

  // prettier-ignore
  public static readonly HistoryTransforms: NativeHistoryEntry[] = [
    { name: 'waterdragon', level: () => dol.variables.waterdragon, max: 6 }, // 水龙转化 (Water Dragon)
    { name: 'bear'       , level: () => dol.variables.bear,        max: 6 }, // 熊转化 (Bear)
    { name: 'bunny'      , level: () => dol.variables.bunny,       max: 6 }  // 兔转化 (Bunny)
  ];

  // prettier-ignore
  public static readonly DecayConditions: Record<string, DecayCondition[]> = {
    wolf:        [() => dol.variables.wolfbuild >= 1,        () => dol.variables.worn.neck.name !== 'spiked collar' && dol.variables.worn.neck.name !== 'spiked collar with leash', () => playerNormalPregnancyType() !== 'wolf', () => !DoLPTransformations.active('okami', 'misc')],
    cat:         [() => dol.variables.catbuild >= 1,         () => dol.variables.worn.neck.name !== 'cat bell collar' && dol.variables.worn.head.name !== 'fish hairpin',           () => playerNormalPregnancyType() !== 'cat'],
    bird:        [() => dol.variables.birdbuild >= 1,        () => dol.variables.worn.head.name !== 'feathered hair clip' && dol.variables.worn.neck.name !== 'feather necklace',   () => playerNormalPregnancyType() !== 'hawk', () => !DoLPTransformations.active('seraphim', 'wings')],
    fox:         [() => dol.variables.foxbuild >= 1,         () => dol.variables.worn.head.name !== 'spirit mask' && dol.variables.worn.neck.name !== 'jasper pendant',             () => playerNormalPregnancyType() !== 'fox',  () => !DoLPTransformations.active('kitsune', 'tail')],
    waterdragon: [() => dol.variables.waterdragonbuild >= 1, () => dol.variables.worn.earrings.variable !== 'lilacheadpiece',                                                       () => playerNormalPregnancyType() !== 'waterdragon'], // 水龙转化 (Water Dragon)
    bear:        [() => dol.variables.bearbuild >= 1,        () => dol.variables.worn.handheld.name !== 'honey pouch' && dol.variables.worn.handheld.name !== 'bear bag' && dol.variables.worn.head.name !== 'honey hair clip', () => playerNormalPregnancyType() !== 'bear'], // 熊转化 (Bear)
    bunny:       [() => dol.variables.bunnybuild >= 1,       () => dol.variables.worn.head.name !== 'carrot pin',                                                                   () => playerNormalPregnancyType() !== 'bunny'] // 兔转化 (Bunny)
  };

  // prettier-ignore
  public static readonly SuppressConditions: Record<string, SuppressCondition[]> = {
    cat:         [source => source !== 'cat',         () => dol.variables.worn.neck.name !== 'cat bell collar' && dol.variables.worn.head.name !== 'fish hairpin'],
    waterdragon: [source => source !== 'waterdragon', () => dol.variables.worn.earrings.variable !== 'lilacheadpiece'],                                                                                                   // 水龙转化 (Water Dragon)
    bear:        [source => source !== 'bear',        () => dol.variables.worn.handheld.name !== 'honey pouch' && dol.variables.worn.handheld.name !== 'bear bag' && dol.variables.worn.head.name !== 'honey hair clip'], // 熊转化 (Bear)
    bunny:       [source => source !== 'bunny',       () => dol.variables.worn.head.name !== 'carrot pin']                                                                                                                // 兔转化 (Bunny)
  };

  // prettier-ignore
  public static readonly BuildUpdaters: Record<string, BuildUpdater> = {
    waterdragon: change => dol.variables.waterdragonbuild = Math.clamp(dol.variables.waterdragonbuild + change, 0, 100), // 水龙转化 (Water Dragon)
    bear:        change => dol.variables.bearbuild        = Math.clamp(dol.variables.bearbuild + change, 0, 100),        // 熊转化 (Bear)
    bunny:       change => dol.variables.bunnybuild       = Math.clamp(dol.variables.bunnybuild + change, 0, 100)        // 兔转化 (Bunny)
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
    // 水龙转化 (Water Dragon)
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

    // 熊转化 (Bear)
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

    // 兔转化 (Bunny)
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

    // 大神 / 狼神转化 (Okami)
    {
      name: 'okami',
      get level() { return DoLP.Transformations.active('okami', 'misc') ? 1 : 0; },
      get build() { return DoLP.Transformations.active('okami', 'misc') ? 100 : 0; },
      type: 'specialTransform',
      parts: [
        { name: 'ears', tfRequired: 1 },
        { name: 'tail', tfRequired: 1 },
        { name: 'wings', tfRequired: 1 },
        { name: 'misc', tfRequired: 1 }
      ],
      traits: []
    },

    // 炽天使转化 (Seraphim)
    {
      name: 'seraphim',
      get level() { return DoLPTransformations.active('seraphim', 'wings') ? 1 : 0; },
      get build() { return DoLPTransformations.active('seraphim', 'wings') ? 100 : 0; },
      type: 'specialTransform',
      parts: [
        { name: 'wings', tfRequired: 1 },
        { name: 'plumage', tfRequired: 1 },
        { name: 'eyes', tfRequired: 1 }
      ],
      traits: []
    },

    // 天狐 / 妖狐转化 (Kitsune)
    {
      name: 'kitsune',
      get level() { return DoLPTransformations.active('kitsune', 'tail') ? 1 : 0; },
      get build() { return DoLPTransformations.active('kitsune', 'tail') ? 100 : 0; },
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

  public static change(change: number): number {
    if (change < 1) return change;
    const level = Number(dol.variables.featsBoosts?.upgrades?.adaptiveGenes ?? 0);
    return level >= 1 ? (change * (level + 50)) / 50 : change;
  }

  public static composite(): void {
    if (this.active('seraphim', 'wings')) {
      dol.variables.harpy = Math.max(dol.variables.harpy, 6);
      dol.variables.birdbuild = Math.max(dol.variables.birdbuild, 100);
      this.forceAngel();
    }

    if (this.active('kitsune', 'tail')) {
      dol.variables.fox = Math.max(dol.variables.fox, 6);
      dol.variables.foxbuild = Math.max(dol.variables.foxbuild, 100);
      this.forceAngel();
    }

    if (this.active('okami', 'misc')) {
      dol.variables.wolfgirl = Math.max(dol.variables.wolfgirl, 6);
      dol.variables.wolfbuild = Math.max(dol.variables.wolfbuild, 100);
      this.forceAngel();
    }
  }

  private static forceAngel(): void {
    dol.variables.angel = Math.max(dol.variables.angel, 6);
    dol.variables.angelbuild = Math.max(dol.variables.angelbuild, 50);
    dol.variables.specialTransform = 1;
  }

  public static extend(valid: { names: Set<string>; traits: Set<string> }): void {
    for (const tf of this.Transformations) valid.names.add(tf.name);
    for (const trait of this.PreservedTraits) valid.traits.add(trait);
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
      const patch = this.TransformationPatches[tf.name];
      if (!patch) return tf;
      return this.mergeProperties(tf, {
        parts: this.mergeParts(tf.parts, patch.parts),
        traits: this.mergeParts(tf.traits, patch.traits)
      });
    });

    const names = new Set(result.map(tf => tf.name).filter(Boolean));
    return [...result, ...this.Transformations.filter(tf => !names.has(tf.name))];
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
        result[index] = this.mergeProperties(result[index], part);
      }
    }
    return result;
  }
}

class DoLP {
  public static get isDoLP() {
    return String(dol.gameVersion ?? '').includes('DoLP');
  }

  public static install(core: MaplebirchCore): void {
    core.once(':addon:beforePatch', () => {
      const passage = core.services.addonPlugin.SC2DataManager.getSC2DataInfoAfterPatch().passageDataItems.map.get('Widgets modUpdate');
      if (!passage?.tags.includes('widget')) return;
      core.tool.inject({
        widgetPassage: {
          'Widgets modUpdate': [
            {
              src: '<<widget "modupdate">>',
              applyafter: "\n\t<<run if (maplebirch.passage && maplebirch.passage.title === 'Start') maplebirch.trigger(':variable')>>",
              expected: 1
            }
          ]
        }
      });
    });
  }

  public static readonly Transformations = DoLPTransformations;

  public static nnpc = {
    showfn: (options: Record<string, unknown>) => {
      if (dol.variables.options.maplebirch.npcsidebar.show) return false;
      if (dol.temporary.effects === true) return true;
      return options.show_nnpc === true;
    }
  };
}

export default DoLP;
