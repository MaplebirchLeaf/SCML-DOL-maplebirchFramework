import '../support/runtime';
import { expect, mock, test } from 'bun:test';
import type Character from '../../src/modules/Character';
import type { MaplebirchCore } from '../../src/core';
import DoLP from '../../src/compat/DoLP';
import DoLX from '../../src/compat/DoLX';
import NewWorld from '../../src/compat/NewWorld';

mock.module('../../src/core', () => ({ default: {} }));
const { default: Transformation } = await import('../../src/modules/CharacterAddon/Transformation');

const base = ['wolf', 'cat', 'cow', 'bird', 'fox'];
const plus = [...base, 'bear', 'bunny', 'waterdragon'];
const newWorld = [...base, 'bee', 'sheep', 'deer', 'bear', 'dragon', 'lizard', 'dolphin', 'dog', 'fish', 'raccoon', 'horse', 'spider', 'frog', 'pig'];
const levelKey = (name: string) => ({ wolf: 'wolfgirl', bird: 'harpy' })[name] ?? name;
const macroName = (name: string) => ({ bird: 'harpy' })[name] ?? name;
const colour = { colour: { h: 275, s: 100, l: 30 } };
const variants = [
  { name: 'vanilla', version: '0.5.12.13', animals: base, defaults: { demon: colour } },
  { name: 'DoLP', version: '0.5.12.13 DoLP v0.778', animals: plus, defaults: { demon: colour } },
  { name: 'DoLX', version: '0.5.12.12 DoLP v0.778 DoLX 0.22.1', animals: plus, defaults: { demon: colour, catsith: colour } },
  { name: 'NewWorld', version: '0.5.12.13 New World 0.1.9.17', animals: newWorld, defaults: { demon: colour, fae: colour, dragon: colour } }
];

function withTransformation(variant: (typeof variants)[number], run: (tf: InstanceType<typeof Transformation>, vars: typeof V, calls: Array<[string, ...unknown[]]>) => void): void {
  const saved = [
    [globalThis, 'V'],
    [globalThis, 'setup'],
    [globalThis, 'StartConfig'],
    [globalThis, 'playerNormalPregnancyType'],
    [window, 'Transformations'],
    [Math, 'clamp']
  ].map(([target, key]) => ({ target: target as object, key: key as string, descriptor: Object.getOwnPropertyDescriptor(target, key as string) }));
  const vars: Record<string, any> = {
    settings: { transformAnimalEnabled: true, transformDivineEnabled: false, hypnosisEnabled: true },
    hypnosis_traits: { peace: true },
    worn: Object.fromEntries(['neck', 'head', 'handheld', 'bag', 'hands', 'earrings'].map(slot => [slot, { name: 'naked' }])),
    maplebirch: { transformation: {} },
    transformationParts: { traits: {} },
    timeMessages: [],
    transformationHistory: [],
    angel: 0,
    fallenangel: 0,
    demon: 0,
    angelbuild: 0,
    demonbuild: 0,
    specialTransform: 0
  };
  for (const name of variant.animals) {
    vars[levelKey(name)] = 0;
    vars[`${name}build`] = 0;
    vars.transformationParts[name] = {};
  }
  if (variant.name === 'DoLX') vars.xchange = { blackmail: {} };
  try {
    Object.defineProperty(globalThis, 'V', { value: vars, configurable: true });
    Object.defineProperty(globalThis, 'setup', { value: { transformations: [] }, configurable: true });
    Object.defineProperty(globalThis, 'StartConfig', { value: { version: variant.version }, configurable: true });
    Object.defineProperty(globalThis, 'playerNormalPregnancyType', { value: () => '', configurable: true });
    Object.defineProperty(window, 'Transformations', {
      value: {
        get defaults() {
          return variant.defaults;
        }
      },
      configurable: true
    });
    Object.defineProperty(Math, 'clamp', { value: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)), configurable: true });
    const ready: Array<() => void> = [];
    const core = {
      once: (event: string, callback: () => void) => {
        if (event === ':storyready') ready.push(callback);
      },
      on() {},
      tool: { define() {}, defineS() {} },
      char: { transformation: undefined as unknown as InstanceType<typeof Transformation>, use() {} }
    };
    const tf = new Transformation({ core } as unknown as Character);
    core.char.transformation = tf;
    for (const compatibility of [DoLP, DoLX, NewWorld]) compatibility.install(core as unknown as MaplebirchCore);
    for (const callback of ready) callback();
    tf.inject();
    const calls: Array<[string, ...unknown[]]> = [];
    tf.wikifier = ((name: string, ...args: unknown[]) => {
      calls.push([name, ...args]);
    }) as typeof tf.wikifier;
    run(tf, vars as typeof V, calls);
  } finally {
    for (const { target, key, descriptor } of saved) {
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else Reflect.deleteProperty(target, key);
    }
  }
}

for (const variant of variants) {
  test(`${variant.name} detection keeps transformation adapters separate`, () =>
    withTransformation(variant, () => {
      expect(NewWorld.isNewWorld).toBe(variant.name === 'NewWorld');
      expect(DoLP.isDoLP).toBe(['DoLP', 'DoLX'].includes(variant.name));
      expect(DoLX.isDoLX).toBe(variant.name === 'DoLX');
    }));
  for (const name of variant.animals) {
    test(`${variant.name} dispatches ${name} growth to its native widget`, () =>
      withTransformation(variant, (tf, vars, calls) => {
        vars[`${name}build`] = 91;
        tf._transformationAlteration();
        expect(calls).toEqual([[`${macroName(name)}Transform`, 0]]);
        expect(vars[`${name}build`]).toBe(91);
        expect(vars.maplebirch.transformation[name]).toBeUndefined();
      }));
  }
  test(`${variant.name} coexistence only dispatches its own native transformations`, () =>
    withTransformation(variant, (tf, _vars, calls) => {
      tf.coexistConditions.push(() => true);
      tf._transformationAlteration();
      expect(calls.map(([name]) => name).sort()).toEqual(variant.animals.map(name => `${macroName(name)}Transform`).sort());
    }));
}

test('DoLX bunny growth is not blocked by unrelated missing state', () =>
  withTransformation(variants[2], (tf, vars, calls) => {
    vars.bunnybuild = 91;
    delete vars.waterdragon;
    delete vars.waterdragonbuild;
    tf._transformationAlteration();
    expect(calls).toEqual([['bunnyTransform', 0]]);
  }));

test('DoLX inherits Plus growth even when the version label omits DoLP', () =>
  withTransformation({ ...variants[2], version: '0.5.12.13 DoLX 0.22.2a' }, (tf, vars, calls) => {
    tf._transform('bunny', 91);
    expect(vars.bunnybuild).toBe(91);
    tf._transformationAlteration();
    expect(calls).toEqual([['bunnyTransform', 0]]);
  }));

test('DoLX scars protect passive growth without blocking explicit loss', () =>
  withTransformation(variants[2], (tf, vars) => {
    vars.auriga_scar = 1;
    vars.bunnybuild = 91;
    tf._transform('cat', 1);
    expect(vars.bunnybuild).toBe(91);
    tf._transformationStateUpdate();
    expect(vars.bunnybuild).toBe(91);
    tf._transform('bunny', -1);
    expect(vars.bunnybuild).toBe(90);
  }));

for (const [variant, slot, item] of [
  [variants[1], 'handheld', 'bear bag'],
  [variants[2], 'bag', 'bear backpack']
] as const) {
  test(`${variant.name} bear equipment protects growth in its native slot`, () =>
    withTransformation(variant, (tf, vars) => {
      vars.bearbuild = 91;
      vars.worn[slot].name = item;
      tf._transform('cat', 1);
      expect(vars.bearbuild).toBe(91);
      tf._transformationStateUpdate();
      expect(vars.bearbuild).toBe(91);
    }));
}

test('DoLX water dragon lab adds growth instead of decay', () =>
  withTransformation(variants[2], (tf, vars) => {
    vars.settings.transformAnimalEnabled = false;
    vars.waterDragonLab = { active: true };
    vars.waterdragonbuild = 30;
    tf._transformationStateUpdate();
    expect(vars.waterdragonbuild).toBe(31);
  }));

test('DoLX derives daily predator and prey effects from native traits', () =>
  withTransformation(variants[2], (tf, vars, calls) => {
    vars.settings.transformAnimalEnabled = false;
    vars.wolfgirl = 6;
    vars.transformationParts.traits.predatoryAnimal = 'default';
    vars.transformationParts.traits.preyAnimal = 'default';
    tf._transformationStateUpdate();
    expect(calls).toEqual([['recomputePredatorPrey'], ['def', 5], ['sub', 5]]);
    vars.xchange.blackmail.activeQuest = { id: 10 };
    calls.length = 0;
    tf._transformationStateUpdate();
    expect(calls).toEqual([['recomputePredatorPrey'], ['sub', 5]]);
  }));

test('DoLX resumes divine growth when specialTransform is stale and prioritizes fallen wings', () =>
  withTransformation(variants[2], (tf, vars, calls) => {
    vars.settings.transformAnimalEnabled = false;
    vars.settings.transformDivineEnabled = true;
    vars.demon = 1;
    tf._transformationAlteration();
    expect(vars.specialTransform).toBe(1);
    expect(calls).toEqual([['demonTransform', 1]]);
    vars.demon = 0;
    vars.angelbuild = 100;
    vars.transformationParts.fallenAngel = { wings: 'default' };
    calls.length = 0;
    tf._transformationAlteration();
    expect(calls).toEqual([['fallenButNotOut', 0]]);
  }));

test('DoLP composite floors remain active while DoLX keeps native chimera levels', () => {
  for (const variant of [variants[1], variants[2]])
    withTransformation(variant, (tf, vars) => {
      vars.settings.transformAnimalEnabled = false;
      vars.transformationParts.seraphim = { wings: 'default' };
      tf._transformationStateUpdate();
      expect(vars.harpy).toBe(variant.name === 'DoLP' ? 6 : 0);
      expect(vars.angel).toBe(variant.name === 'DoLP' ? 6 : 0);
    });
});

test('DoLX water dragon history waits for its seventh level', () =>
  withTransformation(variants[2], (tf, vars) => {
    vars.settings.transformAnimalEnabled = false;
    vars.waterdragon = 6;
    tf._transformationStateUpdate();
    expect(vars.transformationHistory).not.toContain('waterdragon');
    vars.waterdragon = 7;
    tf._transformationStateUpdate();
    expect(vars.transformationHistory).toContain('waterdragon');
  }));

test('NewWorld keeps permanent transformation state when native transform is invoked', () =>
  withTransformation(variants[3], (tf, vars) => {
    vars.physicalTransform = 1;
    tf._transform('bee', 0);
    expect(vars.permanentTransform).toBe(1);
  }));

test('coexistence lets native widgets start a new form while another is manifested', () =>
  withTransformation(variants[2], (tf, vars) => {
    vars.wolfgirl = 6;
    vars.physicalTransform = 1;
    vars.birdbuild = 91;
    tf.coexistConditions.push(() => true);
    tf.wikifier = ((name: string) => {
      if (name === 'harpyTransform' && vars.birdbuild >= 5 && vars.physicalTransform !== 1) vars.harpy = 1;
    }) as typeof tf.wikifier;
    tf._transformationAlteration();
    expect(vars.harpy).toBe(1);
    expect(vars.physicalTransform).toBe(1);
  }));

test('stale physicalTransform does not prevent a native form from starting', () =>
  withTransformation(variants[2], (tf, vars) => {
    vars.physicalTransform = 1;
    vars.birdbuild = 91;
    tf.wikifier = ((name: string) => {
      if (name === 'harpyTransform' && vars.physicalTransform !== 1) {
        vars.harpy = 1;
        vars.physicalTransform = 1;
      }
    }) as typeof tf.wikifier;
    tf._transformationAlteration();
    expect(vars.harpy).toBe(1);
  }));

test('DoLX lab growth continues when coexistence protects passive decay', () =>
  withTransformation(variants[2], (tf, vars) => {
    vars.waterdragonbuild = 30;
    vars.waterDragonLab = { active: true };
    tf.coexistConditions.push(() => true);
    tf._transformationStateUpdate();
    expect(vars.waterdragonbuild).toBe(31);
  }));

test('native selection keeps the Plus priority for equally manifested forms', () =>
  withTransformation(variants[1], (tf, vars, calls) => {
    vars.bear = 1;
    vars.waterdragon = 1;
    tf._transformationAlteration();
    expect(calls).toEqual([['bearTransform', 1]]);
  }));

test('NewWorld lizard completion uses its native third level', () =>
  withTransformation(variants[3], (tf, vars) => {
    vars.settings.transformAnimalEnabled = false;
    vars.lizard = 3;
    tf._transformationStateUpdate();
    expect(vars.transformationHistory).toContain('lizard');
  }));

test('coexistence restores aggregate physical state even when a native widget fails', () =>
  withTransformation(variants[2], (tf, vars) => {
    vars.bunny = 4;
    vars.physicalTransform = 1;
    tf.coexistConditions.push(() => true);
    tf.wikifier = (() => {
      throw new Error('native widget failure');
    }) as typeof tf.wikifier;
    expect(() => tf._transformationAlteration()).toThrow('native widget failure');
    expect(vars.physicalTransform).toBe(1);
  }));

for (const variant of variants) {
  test(`${variant.name} native build changes stay in native variables`, () =>
    withTransformation(variant, (tf, vars) => {
      tf.coexistConditions.push(() => true);
      for (const name of variant.animals) {
        tf._transform(name, 5);
        expect(vars[`${name}build`]).toBe(5);
        tf._transform(name, -1);
        expect(vars[`${name}build`]).toBe(4);
      }
      expect(vars.maplebirch.transformation).toEqual({});
    }));
}

test('DoLX uses native decay while DoLP retains its composite protection', () => {
  for (const variant of [variants[1], variants[2]])
    withTransformation(variant, (tf, vars) => {
      vars.settings.transformAnimalEnabled = false;
      vars.wolfbuild = vars.birdbuild = vars.foxbuild = 10;
      vars.transformationParts.okami = { misc: 'default' };
      vars.transformationParts.seraphim = { wings: 'default' };
      vars.transformationParts.kitsune = { tail: 'default' };
      tf._transformationStateUpdate();
      for (const name of ['wolf', 'bird', 'fox']) expect(vars[`${name}build`]).toBe(variant.name === 'DoLP' ? 100 : 9);
    });
});

test('NewWorld lizard parts follow its native third-level threshold', () =>
  withTransformation(variants[3], () => {
    const lizard = setup.transformations.find((tf: { name: string }) => tf.name === 'lizard')!;
    expect(lizard.parts.find((part: { name: string; tfRequired: number }) => part.name === 'tail')?.tfRequired).toBe(3);
    expect(lizard.traits.find((trait: { name: string; tfRequired: number }) => trait.name === 'lungs')?.tfRequired).toBe(3);
  }));

test('transformation change hooks can adjust growth without a core branch', () =>
  withTransformation(variants[0], (tf, vars) => {
    tf.hooks.change.add('growth', context => {
      context.change *= 2;
    });
    tf._transform('cat', 3);
    expect(vars.catbuild).toBe(6);
  }));

test('transformation lifecycle hooks run around native growth settlement', () =>
  withTransformation(variants[2], (tf, vars) => {
    vars.bunnybuild = 91;
    const stages: Array<[string, number]> = [];
    tf.hooks.update.add('observer', stage => {
      stages.push([stage, vars.bunnybuild]);
    });
    tf._transformationStateUpdate();
    expect(stages).toEqual([
      ['before', 91],
      ['alter', 90],
      ['after', 90]
    ]);
  }));

test('transformation clear and setup hooks preserve extension state across injection', () =>
  withTransformation(variants[0], (tf, vars) => {
    vars.maplebirch.transformation.foreign = { level: 1, build: 5 };
    tf.hooks.clear.add('foreign', valid => {
      valid.names.add('foreign');
    });
    tf.hooks.setup.add('foreign', context => {
      context.transformations.push({ name: 'foreign', level: 1, build: 5, parts: [], traits: [] });
    });
    tf.inject();
    expect(vars.maplebirch.transformation.foreign).toEqual({ level: 1, build: 5 });
    expect(setup.transformations.some((entry: { name: string }) => entry.name === 'foreign')).toBe(true);
  }));

test('DoLX history hooks do not mutate the shared Plus defaults', () => {
  withTransformation(variants[2], tf => {
    expect(tf.historyTransforms.find(entry => entry.name === 'waterdragon')?.max).toBe(7);
  });
  withTransformation(variants[1], tf => {
    expect(tf.historyTransforms.find(entry => entry.name === 'waterdragon')?.max).toBe(6);
  });
  expect(DoLP.Transformations.HistoryTransforms.find(entry => entry.name === 'waterdragon')?.max).toBe(6);
});

test('compatibility hooks keep native tables and getters stable across reinjection', () =>
  withTransformation(variants[2], (tf, vars) => {
    tf.inject();
    tf.inject();
    expect(tf.animalTransforms.filter(entry => entry.name === 'bunny')).toHaveLength(1);
    expect(tf.historyTransforms.filter(entry => entry.name === 'waterdragon')).toHaveLength(1);
    const bunny = setup.transformations.find((entry: { name: string }) => entry.name === 'bunny');
    expect(Object.getOwnPropertyDescriptor(bunny, 'level')?.get).toBeFunction();
    vars.bunny = 4;
    expect(bunny.level).toBe(4);
  }));
