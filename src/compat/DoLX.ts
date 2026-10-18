// ./src/compat/DoLX.ts

import type { MaplebirchCore } from '../core';
import type Transformation from '../modules/CharacterAddon/Transformation';
import { DecayConditions, type DecayCondition, type SuppressCondition } from '../modules/CharacterAddon/TransformationConfig';
import dol from '../host/DoL';
import DoLP from './DoLP';

class DoLXTransformations {
  public static install(transformation: Transformation): void {
    Object.assign(transformation.decayConditions, this.DecayConditions);
    Object.assign(transformation.suppressConditions, this.SuppressConditions);
    const index = transformation.historyTransforms.findIndex(entry => entry.name === 'waterdragon');
    if (index !== -1) transformation.historyTransforms[index] = { ...transformation.historyTransforms[index], max: 7 };
    transformation.protectConditions.push(() => dol.variables.auriga_scar >= 1);
    transformation.hooks.clear.add('DoLX', valid => DoLX.extend(valid));
    transformation.hooks.divine.add('DoLX', context => {
      context.widget = this.divine();
    });
    transformation.hooks.update.remove('DoLP');
    transformation.hooks.update.remove('wolfDefiance');
    transformation.hooks.update.add('DoLX', (stage, target) => {
      if (stage === 'before' && !target.protectConditions.some(condition => condition()) && dol.variables.waterDragonLab?.active) target._transform('waterdragon', 1);
      if (stage !== 'after') return;
      target.wikifier('recomputePredatorPrey');
      const traits = dol.variables.transformationParts.traits;
      if (traits.predatoryAnimal !== 'disabled' && dol.variables.xchange?.blackmail?.activeQuest?.id !== 10) target.wikifier('def', 5);
      if (traits.preyAnimal !== 'disabled') target.wikifier('sub', 5);
    });
  }

  public static readonly DecayConditions: Record<string, DecayCondition[]> = {
    wolf: DecayConditions.wolf,
    bird: DecayConditions.bird,
    fox: DecayConditions.fox,
    bear: [() => dol.variables.bearbuild >= 1, () => this.bearDecay(), () => playerNormalPregnancyType() !== 'bear'],
    waterdragon: [...DoLP.Transformations.DecayConditions.waterdragon, () => !dol.variables.waterDragonLab?.active]
  };

  public static readonly SuppressConditions: Record<string, SuppressCondition[]> = {
    bear: [source => source !== 'bear', () => this.bearDecay()]
  };

  private static bearDecay(): boolean {
    return dol.variables.worn.bag.name !== 'honey pouch' && dol.variables.worn.bag.name !== 'bear backpack' && dol.variables.worn.head.name !== 'honey hair clip';
  }

  public static divine(): [string, number] | undefined {
    const vars = dol.variables;
    const fallen = vars.fallenangel >= 2 || DoLP.Transformations.active('fallenAngel', 'wings');
    vars.specialTransform = vars.demon >= 1 || vars.angel >= 1 || fallen ? 1 : 0;
    if ((vars.demonbuild >= 5 && vars.specialTransform !== 1) || vars.demon >= 1) return ['demonTransform', vars.demon];
    if (fallen) return ['fallenButNotOut', vars.fallenangel];
    if ((vars.angelbuild >= 5 && vars.specialTransform !== 1) || vars.angel >= 1) return ['angelTransform', vars.angel];
    return undefined;
  }
}

class DoLX {
  public static get isDoLX(): boolean {
    return String(dol.gameVersion ?? '').includes('DoLX') || (dol.has('V') && !!dol.variables?.xchange);
  }

  public static readonly PreservedTraits = ['dragonTongue', 'ironWill', 'leviathan'] as const;

  public static readonly Transformations = DoLXTransformations;

  public static install(core: MaplebirchCore): void {
    core.once(':storyready', () => {
      if (!this.isDoLX) return;
      const transformation = core.char.transformation;
      if (!DoLP.isDoLP) DoLP.Transformations.install(transformation);
      this.Transformations.install(transformation);
    });
  }

  public static extend(valid: { names: Set<string>; traits: Set<string> }): void {
    if (!this.isDoLX) return;
    for (const trait of this.PreservedTraits) valid.traits.add(trait);
  }
}

export default DoLX;
