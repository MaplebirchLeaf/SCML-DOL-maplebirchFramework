// ./src/compat/NewWorld.ts

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
  type: string;
  parts: TransformationPart[];
  traits: TransformationPart[];
}

class NewWorldTransformations {
  // prettier-ignore
  public static readonly PreservedTraits = [
    'fangs', 'sharpEyes', 'dragonEyes', 'dragonTongue', 'mateForLife', 'chase',
    'flaunting', 'ironWill', 'preyAnimal', 'strongFeet', 'predatoryAnimal',
    'tempTolerance', 'aquatic', 'leviathan', 'incognito', 'kicks', 'strongnose',
    'lungs', 'aquatail', 'vigorous', 'longtongue', 'webbedfeet'
  ] as const;

  // prettier-ignore
  public static readonly AnimalTransforms: NativeTransformState[] = [
    { name: 'dragon',  level: () => dol.variables.dragon,  build: () => dol.variables.dragonbuild },  // 龙转化 (Dragon)
    { name: 'bee',     level: () => dol.variables.bee,     build: () => dol.variables.beebuild },     // 蜜蜂转化 (Bee)
    { name: 'sheep',   level: () => dol.variables.sheep,   build: () => dol.variables.sheepbuild },   // 绵羊转化 (Sheep)
    { name: 'deer',    level: () => dol.variables.deer,    build: () => dol.variables.deerbuild },    // 鹿转化 (Deer)
    { name: 'bear',    level: () => dol.variables.bear,    build: () => dol.variables.bearbuild },    // 熊转化 (Bear)
    { name: 'lizard',  level: () => dol.variables.lizard,  build: () => dol.variables.lizardbuild },  // 蜥蜴转化 (Lizard)
    { name: 'dolphin', level: () => dol.variables.dolphin, build: () => dol.variables.dolphinbuild }, // 海豚转化 (Dolphin)
    { name: 'dog',     level: () => dol.variables.dog,     build: () => dol.variables.dogbuild },     // 狗转化 (Dog)
    { name: 'fish',    level: () => dol.variables.fish,    build: () => dol.variables.fishbuild },    // 鱼转化 (Fish)
    { name: 'raccoon', level: () => dol.variables.raccoon, build: () => dol.variables.raccoonbuild }, // 浣熊转化 (Raccoon)
    { name: 'horse',   level: () => dol.variables.horse,   build: () => dol.variables.horsebuild },   // 马转化 (Horse)
    { name: 'spider',  level: () => dol.variables.spider,  build: () => dol.variables.spiderbuild },  // 蜘蛛转化 (Spider)
    { name: 'frog',    level: () => dol.variables.frog,    build: () => dol.variables.frogbuild },    // 青蛙转化 (Frog)
    { name: 'pig',     level: () => dol.variables.pig,     build: () => dol.variables.pigbuild }      // 猪转化 (Pig)
  ];

  // prettier-ignore
  public static readonly AnimalMacros: NativeMacroMap = {
    dragon:  ['dragonTransform',  () => dol.variables.dragon],
    bee:     ['beeTransform',     () => dol.variables.bee],
    sheep:   ['sheepTransform',   () => dol.variables.sheep],
    deer:    ['deerTransform',    () => dol.variables.deer],
    bear:    ['bearTransform',    () => dol.variables.bear],
    lizard:  ['lizardTransform',  () => dol.variables.lizard],
    dolphin: ['dolphinTransform', () => dol.variables.dolphin],
    dog:     ['dogTransform',     () => dol.variables.dog],
    fish:    ['fishTransform',    () => dol.variables.fish],
    raccoon: ['raccoonTransform', () => dol.variables.raccoon],
    horse:   ['horseTransform',   () => dol.variables.horse],
    spider:  ['spiderTransform',  () => dol.variables.spider],
    frog:    ['frogTransform',    () => dol.variables.frog],
    pig:     ['pigTransform',     () => dol.variables.pig]
  };

  // prettier-ignore
  public static readonly HistoryTransforms: NativeHistoryEntry[] = [
    { name: 'dragon',  level: () => dol.variables.dragon,  max: 6 },
    { name: 'bee',     level: () => dol.variables.bee,     max: 6 },
    { name: 'sheep',   level: () => dol.variables.sheep,   max: 6 },
    { name: 'deer',    level: () => dol.variables.deer,    max: 6 },
    { name: 'bear',    level: () => dol.variables.bear,    max: 6 },
    { name: 'lizard',  level: () => dol.variables.lizard,  max: 6 },
    { name: 'dolphin', level: () => dol.variables.dolphin, max: 6 },
    { name: 'dog',     level: () => dol.variables.dog,     max: 6 },
    { name: 'fish',    level: () => dol.variables.fish,    max: 6 },
    { name: 'raccoon', level: () => dol.variables.raccoon, max: 6 },
    { name: 'horse',   level: () => dol.variables.horse,   max: 6 },
    { name: 'spider',  level: () => dol.variables.spider,  max: 6 },
    { name: 'frog',    level: () => dol.variables.frog,    max: 6 },
    { name: 'pig',     level: () => dol.variables.pig,     max: 6 }
  ];

  // prettier-ignore
  public static readonly DecayConditions: Record<string, DecayCondition[]> = {
    dragon:  [() => dol.variables.dragonbuild >= 1,  () => dol.variables.worn.hands.name !== 'dragonstone ring'],
    bee:     [() => dol.variables.beebuild >= 1,     () => dol.variables.worn.head.name !== 'honeycomb hair clip'],
    sheep:   [() => dol.variables.sheepbuild >= 1,   () => dol.variables.worn.head.name !== 'cloud hair clip'],
    deer:    [() => dol.variables.deerbuild >= 1,    () => dol.variables.worn.head.name !== 'spotted hair clip'],
    bear:    [() => dol.variables.bearbuild >= 1,    () => dol.variables.worn.head.name !== 'honeycomb hair clip'],
    lizard:  [() => dol.variables.lizardbuild >= 1,  () => dol.variables.worn.hands.name !== 'dragonstone ring'],
    dolphin: [() => dol.variables.dolphinbuild >= 1, () => dol.variables.worn.head.name !== 'fish hairpin'],
    dog:     [() => dol.variables.dogbuild >= 1,     () => dol.variables.worn.neck.name !== 'spiked collar' && dol.variables.worn.neck.name !== 'spiked collar with leash'],
    fish:    [() => dol.variables.fishbuild >= 1,    () => dol.variables.worn.head.name !== 'fish hairpin'],
    raccoon: [() => dol.variables.raccoonbuild >= 1, () => dol.variables.worn.hands.name !== 'scuffed ring' && dol.variables.worn.head.name !== 'raccoon cap'],
    horse:   [() => dol.variables.horsebuild >= 1,   () => dol.variables.worn.neck.name !== 'horseshoe pendant'],
    spider:  [() => dol.variables.spiderbuild >= 1,  () => dol.variables.worn.neck.name !== 'cloth choker'],
    frog:    [() => dol.variables.frogbuild >= 1,    () => dol.variables.worn.head.name !== 'frog hat'],
    pig:     [() => dol.variables.pigbuild >= 1,     () => dol.variables.worn.head.name !== 'truffle hair clip']
  };

  // prettier-ignore
  public static readonly SuppressConditions: Record<string, SuppressCondition[]> = {
    dragon:  [source => source !== 'dragon',  () => dol.variables.worn.hands.name !== 'dragonstone ring'],
    bee:     [source => source !== 'bee',     () => dol.variables.worn.head.name !== 'honeycomb hair clip'],
    sheep:   [source => source !== 'sheep',   () => dol.variables.worn.head.name !== 'cloud hair clip'],
    deer:    [source => source !== 'deer',    () => dol.variables.worn.head.name !== 'spotted hair clip'],
    bear:    [source => source !== 'bear',    () => dol.variables.worn.head.name !== 'honeycomb hair clip'],
    lizard:  [source => source !== 'lizard',  () => dol.variables.worn.hands.name !== 'dragonstone ring'],
    dolphin: [source => source !== 'dolphin', () => dol.variables.worn.head.name !== 'fish hairpin'],
    dog:     [source => source !== 'dog',     () => dol.variables.worn.neck.name !== 'spiked collar' && dol.variables.worn.neck.name !== 'spiked collar with leash'],
    fish:    [source => source !== 'fish',    () => dol.variables.worn.head.name !== 'fish hairpin'],
    raccoon: [source => source !== 'raccoon', () => dol.variables.worn.hands.name !== 'scuffed ring' && dol.variables.worn.head.name !== 'raccoon cap'],
    horse:   [source => source !== 'horse',   () => dol.variables.worn.neck.name !== 'horseshoe pendant'],
    spider:  [source => source !== 'spider',  () => dol.variables.worn.neck.name !== 'cloth choker'],
    frog:    [source => source !== 'frog',    () => dol.variables.worn.head.name !== 'frog hat'],
    pig:     [source => source !== 'pig',     () => dol.variables.worn.head.name !== 'truffle hair clip']
  };

  // prettier-ignore
  public static readonly BuildUpdaters: Record<string, BuildUpdater> = {
    dragon:  change => dol.variables.dragonbuild  = Math.clamp((dol.variables.dragonbuild  || 0) + change, 0, 100),
    bee:     change => dol.variables.beebuild     = Math.clamp((dol.variables.beebuild     || 0) + change, 0, 100),
    sheep:   change => dol.variables.sheepbuild   = Math.clamp((dol.variables.sheepbuild   || 0) + change, 0, 100),
    deer:    change => dol.variables.deerbuild    = Math.clamp((dol.variables.deerbuild    || 0) + change, 0, 100),
    bear:    change => dol.variables.bearbuild    = Math.clamp((dol.variables.bearbuild    || 0) + change, 0, 100),
    lizard:  change => dol.variables.lizardbuild  = Math.clamp((dol.variables.lizardbuild  || 0) + change, 0, 100),
    dolphin: change => dol.variables.dolphinbuild = Math.clamp((dol.variables.dolphinbuild || 0) + change, 0, 100),
    dog:     change => dol.variables.dogbuild     = Math.clamp((dol.variables.dogbuild     || 0) + change, 0, 100),
    fish:    change => dol.variables.fishbuild    = Math.clamp((dol.variables.fishbuild    || 0) + change, 0, 100),
    raccoon: change => dol.variables.raccoonbuild = Math.clamp((dol.variables.raccoonbuild || 0) + change, 0, 100),
    horse:   change => dol.variables.horsebuild   = Math.clamp((dol.variables.horsebuild   || 0) + change, 0, 100),
    spider:  change => dol.variables.spiderbuild  = Math.clamp((dol.variables.spiderbuild  || 0) + change, 0, 100),
    frog:    change => dol.variables.frogbuild    = Math.clamp((dol.variables.frogbuild    || 0) + change, 0, 100),
    pig:     change => dol.variables.pigbuild     = Math.clamp((dol.variables.pigbuild     || 0) + change, 0, 100)
  };

  // prettier-ignore
  public static readonly Transformations: SetupTransformation[] = [
    // 龙转化 (Dragon)
    {
      name: 'dragon',
      get level() { return dol.variables.dragon ?? 0; },
      get build() { return dol.variables.dragonbuild ?? 0; },
      type: 'physicalTransform',
      parts: [
        { name: 'eyes', tfRequired: 1 },
        { name: 'fangs', tfRequired: 2 },
        { name: 'horns', tfRequired: 3 },
        { name: 'tail', tfRequired: 4 },
        { name: 'whisker', tfRequired: 4 },
        { name: 'wings', tfRequired: 6 }
      ],
      traits: []
    },

    // 蜜蜂转化 (Bee)
    {
      name: 'bee',
      get level() { return dol.variables.bee ?? 0; },
      get build() { return dol.variables.beebuild ?? 0; },
      type: 'physicalTransform',
      parts: [
        { name: 'ears', tfRequired: 2 },
        { name: 'tail', tfRequired: 4 },
        { name: 'wings', tfRequired: 6 }
      ],
      traits: []
    },

    // 绵羊转化 (Sheep)
    {
      name: 'sheep',
      get level() { return dol.variables.sheep ?? 0; },
      get build() { return dol.variables.sheepbuild ?? 0; },
      type: 'physicalTransform',
      parts: [
        { name: 'horns', tfRequired: 2 },
        { name: 'ears', tfRequired: 4 },
        { name: 'tail', tfRequired: 6 }
      ],
      traits: []
    },

    // 鹿转化 (Deer)
    {
      name: 'deer',
      get level() { return dol.variables.deer ?? 0; },
      get build() { return dol.variables.deerbuild ?? 0; },
      type: 'physicalTransform',
      parts: [
        { name: 'horns', tfRequired: 2 },
        { name: 'ears', tfRequired: 4 },
        { name: 'tail', tfRequired: 6 }
      ],
      traits: [
        { name: 'kicks', tfRequired: 6 }
      ]
    },

    // 熊转化 (Bear)
    {
      name: 'bear',
      get level() { return dol.variables.bear ?? 0; },
      get build() { return dol.variables.bearbuild ?? 0; },
      type: 'physicalTransform',
      parts: [
        { name: 'ears', tfRequired: 4 },
        { name: 'tail', tfRequired: 6 }
      ],
      traits: [
        { name: 'fangs', tfRequired: 2 },
        { name: 'strongnose', tfRequired: 2 }
      ]
    },

    // 蜥蜴转化 (Lizard)
    {
      name: 'lizard',
      get level() { return dol.variables.lizard ?? 0; },
      get build() { return dol.variables.lizardbuild ?? 0; },
      type: 'physicalTransform',
      parts: [
        { name: 'eyes', tfRequired: 1 },
        { name: 'tail', tfRequired: 6 }
      ],
      traits: [
        { name: 'fangs', tfRequired: 2 },
        { name: 'lungs', tfRequired: 6 }
      ]
    },

    // 海豚转化 (Dolphin)
    {
      name: 'dolphin',
      get level() { return dol.variables.dolphin ?? 0; },
      get build() { return dol.variables.dolphinbuild ?? 0; },
      type: 'physicalTransform',
      parts: [
        { name: 'tail', tfRequired: 4 }
      ],
      traits: [
        { name: 'lungs', tfRequired: 2 },
        { name: 'aquatail', tfRequired: 6 }
      ]
    },

    // 狗转化 (Dog)
    {
      name: 'dog',
      get level() { return dol.variables.dog ?? 0; },
      get build() { return dol.variables.dogbuild ?? 0; },
      type: 'physicalTransform',
      parts: [
        { name: 'ears', tfRequired: 4 },
        { name: 'tail', tfRequired: 6 }
      ],
      traits: [
        { name: 'fangs', tfRequired: 2 }
      ]
    },

    // 鱼转化 (Fish)
    {
      name: 'fish',
      get level() { return dol.variables.fish ?? 0; },
      get build() { return dol.variables.fishbuild ?? 0; },
      type: 'physicalTransform',
      parts: [
        { name: 'fins', tfRequired: 4 },
        { name: 'tail', tfRequired: 6 }
      ],
      traits: [
        { name: 'aquatic', tfRequired: 2 },
        { name: 'aquatail', tfRequired: 6 }
      ]
    },

    // 浣熊转化 (Raccoon)
    {
      name: 'raccoon',
      get level() { return dol.variables.raccoon ?? 0; },
      get build() { return dol.variables.raccoonbuild ?? 0; },
      type: 'physicalTransform',
      parts: [
        { name: 'ears', tfRequired: 4 },
        { name: 'tail', tfRequired: 6 }
      ],
      traits: [
        { name: 'incognito', tfRequired: 2 },
        { name: 'sharpEyes', tfRequired: 2 }
      ]
    },

    // 马转化 (Horse)
    {
      name: 'horse',
      get level() { return dol.variables.horse ?? 0; },
      get build() { return dol.variables.horsebuild ?? 0; },
      type: 'physicalTransform',
      parts: [
        { name: 'ears', tfRequired: 4 },
        { name: 'tail', tfRequired: 6 }
      ],
      traits: [
        { name: 'vigorous', tfRequired: 2 },
        { name: 'kicks', tfRequired: 6 }
      ]
    },

    // 蜘蛛转化 (Spider)
    {
      name: 'spider',
      get level() { return dol.variables.spider ?? 0; },
      get build() { return dol.variables.spiderbuild ?? 0; },
      type: 'physicalTransform',
      parts: [
        { name: 'eyes', tfRequired: 4 },
        { name: 'tail', tfRequired: 6 }
      ],
      traits: [
        { name: 'fangs', tfRequired: 2 },
        { name: 'sharpEyes', tfRequired: 4 }
      ]
    },

    // 青蛙转化 (Frog)
    {
      name: 'frog',
      get level() { return dol.variables.frog ?? 0; },
      get build() { return dol.variables.frogbuild ?? 0; },
      type: 'physicalTransform',
      parts: [
        { name: 'eyes', tfRequired: 4 },
        { name: 'cheeks', tfRequired: 6 }
      ],
      traits: [
        { name: 'kicks', tfRequired: 2 },
        { name: 'lungs', tfRequired: 2 },
        { name: 'longtongue', tfRequired: 2 },
        { name: 'webbedfeet', tfRequired: 2 }
      ]
    },

    // 猪转化 (Pig)
    {
      name: 'pig',
      get level() { return dol.variables.pig ?? 0; },
      get build() { return dol.variables.pigbuild ?? 0; },
      type: 'physicalTransform',
      parts: [
        { name: 'ears', tfRequired: 4 },
        { name: 'tail', tfRequired: 6 }
      ],
      traits: [
        { name: 'strongnose', tfRequired: 2 }
      ]
    }
  ];

  public static extend(valid: { names: Set<string>; traits: Set<string> }): void {
    for (const tf of this.AnimalTransforms) valid.names.add(tf.name);
    for (const trait of this.PreservedTraits) valid.traits.add(trait);
  }

  public static merge<T extends { name?: string }>(base: T[]): Array<T | SetupTransformation> {
    const names = new Set(base.map(tf => tf.name).filter(Boolean));
    return [...base, ...this.Transformations.filter(tf => !names.has(tf.name))];
  }
}

class NewWorld {
  public static get isNewWorld(): boolean {
    return String(dol.gameVersion ?? '').includes('New World') || typeof window.Transformations?.defaults === 'object';
  }

  public static readonly Transformations = NewWorldTransformations;

  public static guard(): void {
    window.Transformations ??= {};
    window.Transformations.defaults ??= {
      demon: { colour: { h: 275, s: 100, l: 30 } },
      fae: { colour: { h: 275, s: 100, l: 30 } },
      dragon: { colour: { h: 275, s: 100, l: 30 } }
    };

    const vars = dol.variables;
    if (!vars) return;
    const parts = (vars.transformationParts ??= {});
    const defaults = window.Transformations.defaults;
    for (const key of ['demon', 'fae', 'dragon'] as const) {
      parts[key] ??= { wings: 'disabled' };
      const defaultColour = defaults[key]?.colour ?? { h: 275, s: 100, l: 30 };
      if (!parts[key].wings_colour) parts[key].wings_colour = defaultColour;
      if (!parts[key].tail_colour) parts[key].tail_colour = defaultColour;
      if (!parts[key].horns_colour) parts[key].horns_colour = defaultColour;
    }

    const extras = [
      'fae',
      'ghost',
      'slime',
      'mushroom',
      'eldritch',
      'cosmic',
      'doll',
      'zombie',
      'goblin',
      'bee',
      'spider',
      'deer',
      'sheep',
      'bear',
      'pig',
      'horse',
      'dog',
      'raccoon',
      'bunny',
      'dolphin',
      'fish',
      'lizard',
      'frog'
    ];
    for (const extra of extras) parts[extra] ??= {};
  }

  public static install(core: MaplebirchCore): void {
    if (!NewWorld.isNewWorld) return;
    core.on(':variable', () => NewWorld.guard());
    core.char.use(
      'before',
      () => NewWorld.guard(),
      () => true
    );
  }
}

export default NewWorld;
