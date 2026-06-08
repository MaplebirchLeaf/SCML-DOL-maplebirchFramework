// ./src/modules/NamedNPCAddon/NPCPregnancy.ts

import type { MacroDefinition } from 'twine-sugarcube';
import type NPCManager from '../NamedNPC';
import NPCPregnancyPatch, { type VanillaPregnancyHooks } from './NPCPregnancyPatch';

type PregnancyNPC = {
  nam: string;
  type: string;
  penis?: string;
  vagina?: string;
  pregnancy: Record<string, any> | null;
  pregnancyAvoidance?: number;
};

type SpermData = {
  type: string;
  source: string;
  quantity?: number;
  mod?: number;
};

export type SpermEntry = {
  type: string;
  source: string;
};

type PregnancyData = Record<string, any> & {
  enabled?: boolean;
  fetus?: any[];
  sperm?: SpermData[];
  pills?: string | null;
};

export type PregnancyGenerator = (mother: string, father: string, fatherKnown: boolean, genital: string, ...args: any[]) => any;
export type PregnancyBirthResolver = (type: string, pregnancy?: PregnancyData) => PregnancyBirthConfig;
export type PregnancyEtaResolver = (pregnancy: PregnancyData) => number | null;
export type PregnancyChildActivityResolver = (childId: string, child: any) => string | null | false | void;
export type PregnancyTextResolver = (pregnancy: PregnancyData, count: number, target?: string) => string;

export interface PregnancyAddConfig {
  generator?: PregnancyGenerator;
  birth?: PregnancyBirthConfig | PregnancyBirthResolver;
  eta?: PregnancyEtaResolver;
  childActivity?: PregnancyChildActivityResolver;
  text?: PregnancyTextConfig | PregnancyTextResolver;
}

export interface PregnancyBirthConfig {
  birthLocation?: string;
  location?: string;
}

export interface PregnancyTextConfig {
  single?: string;
  multiple?: string;
  resolver?: PregnancyTextResolver;
}

class NPCPregnancy {
  public readonly vanillaTypes = new Set(['human', 'wolf', 'wolfboy', 'wolfgirl', 'hawk', 'harpy']);
  public readonly types = new Set(this.vanillaTypes);
  public readonly infertile = ['Bailey', 'Leighton'];
  public readonly canBePregnant = ['Alex', 'Black Wolf', 'Great Hawk'];
  public readonly canImpregnatePlayer = ['Alex', 'Black Wolf', 'Great Hawk'];
  public readonly randomAlwaysKeep = ['wolf_cave'];
  public readonly vanilla: VanillaPregnancyHooks = { macros: {} };
  public readonly generators = new Map<string, PregnancyGenerator>();

  private readonly patch: NPCPregnancyPatch;
  private readonly births = new Map<string, PregnancyBirthConfig | PregnancyBirthResolver>();
  private readonly etas = new Map<string, PregnancyEtaResolver>();
  private readonly childActivities = new Map<string, PregnancyChildActivityResolver>();
  private readonly texts = new Map<string, PregnancyTextConfig | PregnancyTextResolver>();

  public constructor(public readonly manager: NPCManager) {
    this.patch = new NPCPregnancyPatch(this);
    manager.core.once(':storyready', () => this.patch.inject());
    manager.core.dynamic.regTimeEvent('onDay', 'NPCPregnancyCycle', {
      action: () => this.NPCPregnancyCycle(),
      cond: () => !V.statFreeze && V.settings.npcPregnancyEnabled === true && V.settings.pregnancyType === 'realistic',
      exact: true
    });
  }

  public definePregnancyProperty(npc: PregnancyNPC) {
    npc.pregnancy ??= {};

    let data = npc.pregnancy;
    let ready = false;

    Object.defineProperty(npc, 'pregnancy', {
      get: () => {
        if (ready) return data;
        ready = true;

        const type = this.typeOf(npc);
        const explicit = data.enabled === true;
        const infertile = this.infertile.includes(npc.nam);
        const forced = this.canBePregnant.includes(npc.nam);
        const incomplete = V?.settings?.incompletePregnancyEnabled;
        const ignored = setup?.pregnancy?.ignoresIncompleteCheck?.includes(npc.nam);

        if ((explicit || (data.enabled == null && !infertile && this.types.has(type) && ((incomplete && !ignored) || forced))) && !Array.isArray(data.fetus)) {
          const cycleDaysTotal = data.cycleDaysTotal ?? Math.random(24, 32);
          data = {
            ...data,
            fetus: [],
            givenBirth: 0,
            totalBirthEvents: 0,
            timer: null,
            timerEnd: null,
            waterBreaking: null,
            npcAwareOf: null,
            pcAwareOf: null,
            type: data.type ?? null,
            enabled: true,
            cycleDaysTotal,
            cycleDay: Math.random(1, cycleDaysTotal),
            cycleDangerousDay: 10,
            sperm: [],
            potentialFathers: [],
            nonCycleRng: [Math.random(3), Math.random(3)],
            pills: null
          };
        } else if (!explicit && (infertile || (!forced && !incomplete))) {
          data = {};
        }

        return data;
      },
      set: value => {
        data = value ?? {};
        ready = true;
      },
      configurable: true,
      enumerable: true
    });
  }

  public get typesEnabled() {
    return [...this.types];
  }

  public add(type: string, config?: PregnancyGenerator | PregnancyAddConfig) {
    const key = type.trim();
    if (!key) return;
    this.types.add(key);
    if (typeof config === 'function') {
      this.generators.set(key, config);
    } else if (config && typeof config === 'object') {
      if (typeof config.generator === 'function') this.generators.set(key, config.generator);
      if (config.birth) this.births.set(key, config.birth);
      if (typeof config.eta === 'function') this.etas.set(key, config.eta);
      if (typeof config.childActivity === 'function') this.childActivities.set(key, config.childActivity);
      if (config.text) this.texts.set(key, config.text);
    }
  }

  public typeOf(target: string | PregnancyNPC | null | undefined) {
    const npc = typeof target === 'string' ? (C.npc[target] ?? (Array.isArray(V.NPCName) ? V.NPCName.find((item: { nam?: string }) => item.nam === target) : null)) : target;
    const data = npc.pregnancy;
    return typeof data.type === 'string' && data.type.trim() ? data.type.trim() : (npc.type ?? '');
  }

  public birthLocation(type: string, pregnancy?: PregnancyData): PregnancyBirthConfig {
    const birth = this.births.get(type);
    if (typeof birth === 'function') return birth(type, pregnancy);
    return birth ?? {};
  }

  public NPCPregnancy(npc: PregnancyNPC) {
    const data = npc.pregnancy;
    if (data?.enabled !== true) return;
    this.avoidance(npc);
    this.add(this.typeOf(npc));
    if (npc.vagina != null && npc.vagina !== 'none') this.canBePregnant.pushUnique(npc.nam);
    if (npc.penis != null && npc.penis !== 'none') this.canImpregnatePlayer.pushUnique(npc.nam);
  }

  public avoidance(npc: PregnancyNPC) {
    if (!V) return;
    if (npc.pregnancyAvoidance != null && !(V.settings != null && V.objectVersion?.pregnancyAvoidance == null)) return;
    if (['Kylar', 'Black Wolf', 'Great Hawk', 'Eden', 'Ivory Wraith', 'Gwylan'].includes(npc.nam)) {
      npc.pregnancyAvoidance = 0;
    } else if (['Robin', 'Whitney', 'Alex', 'Wren', 'Avery'].includes(npc.nam)) {
      npc.pregnancyAvoidance = 50;
    } else {
      npc.pregnancyAvoidance = Math.random(100);
    }
  }

  public savedPregnancy() {
    const names = this.manager.NamedNPC.get(this.manager);

    for (const npcName of names) {
      const npc = Array.isArray(V.NPCName) ? V.NPCName.find((item: { nam?: string }) => item?.nam === npcName) : this.manager.data.get(npcName)?.Data;
      if (npc) this.NPCPregnancy(npc);
    }

    const pregnancy = setup.pregnancy;
    if (!pregnancy) return null;

    pregnancy.typesEnabled ??= [];
    pregnancy.canBePregnant ??= [];
    pregnancy.canImpregnatePlayer ??= [];
    pregnancy.randomAlwaysKeep ??= this.randomAlwaysKeep.clone();

    this.typesEnabled.forEach(type => pregnancy.typesEnabled.pushUnique(type));
    this.canBePregnant.forEach(name => pregnancy.canBePregnant.pushUnique(name));
    this.canImpregnatePlayer.forEach(name => pregnancy.canImpregnatePlayer.pushUnique(name));
    this.randomAlwaysKeep.forEach(type => pregnancy.randomAlwaysKeep.pushUnique(type));

    return pregnancy;
  }

  public playerPregnancyAttempt(baseMulti = 1, genital = 'vagina') {
    const pregnancy = V?.sexStats?.[genital]?.pregnancy;
    if (!pregnancy || pregnancy.fetus?.length || Number.isNaN(baseMulti) || baseMulti < 1 || V.settings?.pregnancyType !== 'realistic') return false;
    const [trackedNPCs, spermArray] = this.spermObjectToArray(V.sexStats[genital].sperm, true);
    const customSperm = spermArray.filter(sperm => !this.vanillaTypes.has(sperm.type));
    if (!customSperm.length) return this.vanillaMacro(this.vanilla.macros.playerPregnancyAttempt, [baseMulti, genital]);
    if (spermArray.length > customSperm.length && this.vanillaMacro(this.vanilla.macros.playerPregnancyAttempt, [baseMulti, genital])) return true;
    const picked = this.pickPlayerSperm(customSperm, baseMulti);
    if (!picked) return false;
    return this.playerPregnancy(picked.source, picked.type, trackedNPCs.length === 1, genital, trackedNPCs);
  }

  public namedNpcPregnancy(mother: string, father: string, fatherSpecies: string, fatherKnown = false, trackedNPCs?: SpermEntry[], awareOf = false) {
    const namedNPC = C.npc[mother];
    if (!namedNPC || V.settings?.npcPregnancyEnabled === false) return false;

    const motherType = this.typeOf(namedNPC);
    if (this.vanillaTypes.has(fatherSpecies) && this.vanillaTypes.has(motherType))
      return this.vanillaMacro(this.vanilla.macros.namedNpcPregnancy, [mother, father, fatherSpecies, fatherKnown, trackedNPCs, awareOf]);

    const generator = window.pregnancyGenerator?.[motherType] ?? window.pregnancyGenerator?.[fatherSpecies];
    if (typeof generator !== 'function') return false;

    const newPregnancy = generator(mother, father, fatherKnown, 'vagina');
    if (!this.validPregnancy(newPregnancy)) return false;

    namedNPC.pregnancy = {
      ...namedNPC.pregnancy,
      ...newPregnancy,
      potentialFathers: trackedNPCs || [{ type: fatherSpecies, source: father }],
      npcAwareOf: false,
      pcAwareOf: awareOf
    };
    return true;
  }

  public pregnancyDaysEta(pregnancy: PregnancyData) {
    const eta = pregnancy?.type ? this.etas.get(pregnancy.type) : null;
    return eta ? eta(pregnancy) : (this.vanilla.pregnancyDaysEta?.(pregnancy) ?? null);
  }

  public childPregnancyDays(childId: string) {
    const child = V.children?.[childId];
    if (!child || this.vanillaTypes.has(child.type)) return this.vanilla.getChildDays?.(childId) ?? null;
    const date1 = `${child.born.day} ${child.born.month} ${child.born.year}`;
    const date2 = `${Time.monthDay} ${Time.monthName} ${Time.year}`;
    return Math.clamp(Math.ceil(Math.abs(Date.parse(date2) - Date.parse(date1)) / (1000 * 60 * 60 * 24)), 0, 200);
  }

  public updateCustomChildActivity(childId?: string) {
    const id = childId || V.childSelected?.childId;
    const child = id ? V.children?.[id] : null;
    const action = child?.type ? this.childActivities.get(child.type) : null;
    if (!child || !id || !action) return false;

    const activity = action(id, child);
    if (typeof activity !== 'string') return true;

    child.localVariables ??= {};
    child.localVariables.activity = activity;
    child.localVariables.event = true;
    child.localVariables.activityDay = Time.days;
    child.localVariables.activityHour = Time.hour;
    return true;
  }

  public babyText(pregnancy: PregnancyData | undefined, target?: string) {
    if (!pregnancy?.type || this.vanillaTypes.has(pregnancy.type)) return '';
    const text = this.texts.get(pregnancy.type);
    if (!text) return '';

    const count = pregnancy.awareOfDetails || pregnancy.awareOfMultiple ? pregnancy.fetus?.length || 1 : 1;
    if (typeof text === 'function') return text(pregnancy, count, target);
    if (typeof text.resolver === 'function') return text.resolver(pregnancy, count, target);
    return count > 1 ? text.multiple || text.single || 'babies' : text.single || text.multiple || 'baby';
  }

  public vanillaMacro(macro: MacroDefinition | undefined, args: any[], context?: any) {
    if (typeof macro?.handler !== 'function') return false;
    const macroContext = context ?? {};
    macroContext.args = args;
    return macro.handler.call(macroContext);
  }

  private NPCPregnancyCycle() {
    for (const npcName of V.NPCNameList ?? []) {
      const npc = C.npc[npcName];
      const pregnancy = npc?.pregnancy as PregnancyData | undefined;
      if (!npc || !pregnancy?.enabled || pregnancy.fetus?.length || !pregnancy.sperm?.length) continue;
      const motherType = this.typeOf(npc);
      const hasCustomSperm = pregnancy.sperm.some(sperm => sperm?.type && !this.vanillaTypes.has(sperm.type));
      if (this.vanillaTypes.has(motherType) && !hasCustomSperm) continue;
      if (V.settings.fertilityCycleEnabled === true) {
        if (between(pregnancy.cycleDay, pregnancy.cycleDangerousDay - 1, pregnancy.cycleDangerousDay + 1)) this.namedNpcPregnancyAttempt(npcName, false, pregnancy.sperm);
      } else if (pregnancy.nonCycleRng?.[0] === 0) {
        this.namedNpcPregnancyAttempt(npcName, false, pregnancy.sperm);
      }
    }
  }

  private spermObjectToArray(spermObject: SpermData[] = [], player: boolean, disableRng?: boolean) {
    const trackedNPCs: SpermEntry[] = [];
    const spermArray: SpermEntry[] = [];

    for (const sperm of spermObject) {
      if (!sperm?.type || !this.types.has(sperm.type)) continue;
      if (V?.settings?.incompletePregnancyEnabled === false && V?.NPCNameList?.includes(sperm.source) && !setup?.pregnancy?.canImpregnatePlayer?.includes(sperm.source)) continue;
      if (!this.allowsPlayerPregnancyType(sperm.type, player)) continue;
      if (!trackedNPCs.find(npc => npc.source === sperm.source)) trackedNPCs.push({ type: sperm.type, source: sperm.source });

      for (let i = 0, length = sperm.quantity ?? 0; i < length; i++) {
        if (!disableRng && (sperm.mod ?? 0) < random(0, 100)) continue;
        spermArray.push({ type: sperm.type, source: sperm.source });
        if (!disableRng && (sperm.mod ?? 0) > random(100, 200)) spermArray.push({ type: sperm.type, source: sperm.source });
      }
    }

    return [trackedNPCs, spermArray] as [SpermEntry[], SpermEntry[]];
  }

  private playerPregnancy(npc: string, npcType: string, fatherKnown = false, genital = 'vagina', trackedNPCs?: SpermEntry[], awareOf = false) {
    const generator = window.pregnancyGenerator?.[npcType];
    if (typeof generator !== 'function' || !this.allowsPlayerPregnancyType(npcType, true)) return false;

    const newPregnancy = generator('pc', npc, fatherKnown, genital);
    if (!this.validPregnancy(newPregnancy)) return false;

    V.sexStats[genital].pregnancy = {
      ...V.sexStats[genital].pregnancy.clone(),
      ...newPregnancy,
      potentialFathers: trackedNPCs || [{ type: npcType, source: npc }],
      waterBreakingTimer: random(0, 24),
      waterBreaking: false,
      awareOf
    };
    V.sexStats.vagina.menstruation.currentState = 'pregnant';
    if (V.harpyEggs) delete V.harpyEggs;
    return true;
  }

  private namedNpcPregnancyAttempt(npcName: string, forcePregnancy = false, spermObject?: SpermData[]) {
    const namedNPC = C.npc[npcName];
    const pregnancy = namedNPC?.pregnancy as PregnancyData | undefined;
    if (!namedNPC || namedNPC.vagina === 'none' || !pregnancy?.enabled || pregnancy.fetus?.length || V.settings?.pregnancyType !== 'realistic') return false;

    const [trackedNPCs, spermArray] = this.spermObjectToArray(spermObject ?? pregnancy.sperm ?? [], false);
    if (!spermArray.length) return false;

    const fertility = pregnancy.pills === 'fertility' ? 0.8 : 1;
    const contraceptive = pregnancy.pills === 'contraceptive';
    const basePenalty = Math.floor((20 - V.settings.baseNpcPregnancyChance) * fertility);
    let rng = random(0, spermArray.length > basePenalty ? spermArray.length : basePenalty);
    if (forcePregnancy && !spermArray[rng]) rng = 0;
    if (contraceptive && random(0, 100) >= 10) return false;

    const sperm = spermArray[rng];
    return sperm ? this.namedNpcPregnancy(npcName, sperm.source, sperm.type, trackedNPCs.length === 1, trackedNPCs) : false;
  }

  private pickPlayerSperm(spermArray: SpermEntry[], baseMulti: number) {
    const pills = V.sexStats.pills;
    const contraceptive = Math.clamp(pills.pills.contraceptive.doseTaken || 0, 0, Infinity);
    if (spermArray.length === 0 || (contraceptive && (random(0, 100) >= 10 || contraceptive > 1))) return null;

    let fertilityBoost = 1;
    fertilityBoost -= Math.clamp(Math.clamp(pills.pills['fertility booster'].doseTaken || 0, 0, Infinity) * 0.2, 0, 0.7);
    if (V.skin.pubic.pen === 'magic' && V.skin.pubic.special === 'pregnancy') fertilityBoost -= 0.4;

    let basePenalty = Math.floor((100 - V.settings.basePlayerPregnancyChance) * Math.clamp(fertilityBoost, 0.1, 1) * baseMulti);
    if (V.earSlime.growth >= 100 && V.earSlime.focus === 'pregnancy') basePenalty = Math.floor(basePenalty / 2);
    if (V.earSlime.growth >= 100 && V.earSlime.focus === 'impregnation') basePenalty = Math.floor(basePenalty * 2);

    const rng = random(0, spermArray.length - 1 > basePenalty ? spermArray.length - 1 : basePenalty);
    return spermArray[rng] ?? null;
  }

  private allowsPlayerPregnancyType(type: string, player: boolean) {
    if (!player) return true;
    if (V.settings.playerPregnancyHumanEnabled === false && type === 'human') return false;
    if (V.settings.playerPregnancyBeastEnabled === false && type !== 'human') return false;
    if (V.settings.playerPregnancyEggLayingEnabled === false && ['hawk', 'harpy'].includes(type)) return false;
    return true;
  }

  private validPregnancy(value: any) {
    return !!value && typeof value !== 'string' && Array.isArray(value.fetus) && value.fetus.length > 0;
  }
}

export default NPCPregnancy;
