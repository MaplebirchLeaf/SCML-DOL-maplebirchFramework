// ./src/modules/NamedNPCAddon/NPCPregnancyPatch.ts

import type { MacroDefinition } from 'twine-sugarcube';
import type NPCPregnancy from './NPCPregnancy';
import type { SpermEntry } from './NPCPregnancy';

export interface VanillaPregnancyHooks {
  recordSperm?: (options?: any) => any;
  pregnancyDaysEta?: (pregnancyObject: any) => number | null;
  getChildDays?: (childId: string) => number | null;
  macros: {
    playerPregnancyAttempt?: MacroDefinition;
    namedNpcPregnancy?: MacroDefinition;
    pregnancyBabyText?: MacroDefinition;
    updateChildActivity?: MacroDefinition;
  };
}

class NPCPregnancyPatch {
  public constructor(private readonly pregnancy: NPCPregnancy) {}

  public inject() {
    const host = this.pregnancy;
    if (typeof window.recordSperm !== 'function') return;
    this.save();
    this.injectGenerators();
    this.patchFunctions();
    this.patchMacros();
  }

  private save() {
    const host = this.pregnancy;
    const macro = host.manager.core.SugarCube.Macro;

    host.vanilla.recordSperm = window.recordSperm;
    host.vanilla.pregnancyDaysEta = window.pregnancyDaysEta;
    host.vanilla.getChildDays = window.getChildDays;
    host.vanilla.macros.playerPregnancyAttempt = macro.has('playerPregnancyAttempt') ? macro.get('playerPregnancyAttempt') : undefined;
    host.vanilla.macros.namedNpcPregnancy = macro.has('namedNpcPregnancy') ? macro.get('namedNpcPregnancy') : undefined;
    host.vanilla.macros.pregnancyBabyText = macro.has('pregnancyBabyText') ? macro.get('pregnancyBabyText') : undefined;
    host.vanilla.macros.updateChildActivity = macro.has('updateChildActivity') ? macro.get('updateChildActivity') : undefined;
  }

  private injectGenerators() {
    const host = this.pregnancy;
    if (!window.pregnancyGenerator) return;

    for (const [type, generator] of host.generators) {
      if (host.vanillaTypes.has(type)) continue;
      window.pregnancyGenerator[type] = (...args: any[]) => {
        const pregnancy = generator(...(args as [string, string, boolean, string]));
        if (!pregnancy || typeof pregnancy === 'string') return pregnancy;
        return {
          ...pregnancy,
          type,
          fetus: Array.isArray(pregnancy.fetus) ? pregnancy.fetus.map((baby: any) => ({ ...baby, type })) : pregnancy.fetus
        };
      };
    }
  }

  private patchFunctions() {
    const host = this.pregnancy;

    // 原版 recordSperm 会过滤未知 spermType；这里先为自定义命名 NPC 补齐 spermType，再交回原版。
    window.recordSperm = (options: any = {}) => {
      if (options && typeof options === 'object' && options.spermOwner && options.spermOwner !== 'pc') options = { ...options, spermType: host.typeOf(options.spermOwner) || options.spermType };
      return host.vanilla.recordSperm?.(options);
    };

    // 原版显示入口只认识固定种族；自定义种族优先查注册项。
    if (typeof host.vanilla.pregnancyDaysEta === 'function') window.pregnancyDaysEta = pregnancy => host.pregnancyDaysEta(pregnancy);
    if (typeof host.vanilla.getChildDays === 'function') window.getChildDays = childId => host.childPregnancyDays(childId);
  }

  private patchMacros() {
    const host = this.pregnancy;
    const macro = host.manager.core.tool.macro;

    macro.define('recordSperm', (options: any) => window.recordSperm?.(options));
    macro.define('recordVaginalSperm', (target: any, spermOwner: any, spermType: any, daysTillRemovalOverride: any) =>
      window.recordSperm?.({ target, spermOwner, spermType, daysTillRemovalOverride })
    );
    macro.define('recordAnusSperm', (target: any, spermOwner: any, spermType: any, daysTillRemovalOverride: any) =>
      window.recordSperm?.({ genital: 'anus', target, spermOwner, spermType, daysTillRemovalOverride })
    );

    // PC/NPC 受孕宏：自定义种族走框架；原版种族交回原版宏。
    macro.define('playerPregnancyAttempt', (baseMulti = 1, genital = 'vagina') => host.playerPregnancyAttempt(baseMulti, genital));
    macro.define('namedNpcPregnancy', (mother: string, father: string, fatherSpecies: string, fatherKnown = false, trackedNPCs?: SpermEntry[], awareOf = false) =>
      host.namedNpcPregnancy(mother, father, fatherSpecies, fatherKnown, trackedNPCs, awareOf)
    );

    macro.define('updateChildActivity', function (this: any, childId?: string) {
      if (host.updateCustomChildActivity(childId)) return;
      host.vanillaMacro(host.vanilla.macros.updateChildActivity, [childId], this);
    });

    macro.define('pregnancyBabyText', function (this: any, target?: string) {
      const pregnancy = target && target !== 'pc' && C.npc[target]?.pregnancy?.enabled !== undefined ? C.npc[target].pregnancy : getPregnancyObject();
      const text = host.babyText(pregnancy, target);
      if (text) return this.output.append(document.createTextNode(text));
      host.vanillaMacro(host.vanilla.macros.pregnancyBabyText, [target], this);
    });
  }
}

export default NPCPregnancyPatch;
