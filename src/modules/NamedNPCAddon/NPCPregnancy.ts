// ./src/modules/NamedNPCAddon/NPCPregnancy.ts

import type { MacroDefinition } from 'twine-sugarcube';
import type NPCManager from '../NamedNPC';
import {
  DEFAULT_AVOIDANCE,
  DEFAULT_NPC_CONFIGS,
  DEFAULT_TYPE_CONFIGS,
  VANILLA_TYPES,
  type PregnancyAddConfig,
  type PregnancyBirthResolver,
  type PregnancyBirthConfig,
  type PregnancyChildConfig,
  type PregnancyChildActivityResolver,
  type PregnancyChildTransformConfig,
  type PregnancyData,
  type PregnancyEtaResolver,
  type PregnancyGenerator,
  type PregnancyNPC,
  type PregnancyNpcConfig,
  type PregnancyTextConfig,
  type PregnancyTextResolver,
  type SpermData,
  type SpermEntry
} from './NPCPregnancyConfig';
import NPCPregnancyPatch, { type VanillaPregnancyHooks } from './NPCPregnancyPatch';

export type { PregnancyAddConfig, PregnancyChildConfig, PregnancyGenerator, PregnancyNpcConfig, SpermEntry } from './NPCPregnancyConfig';

class NPCPregnancy {
  public readonly vanillaTypes = new Set(VANILLA_TYPES);
  public readonly types = new Set(this.vanillaTypes);
  public readonly infertile = ['Bailey', 'Leighton'];
  public readonly canBePregnant = Object.keys(DEFAULT_NPC_CONFIGS);
  public readonly canImpregnatePlayer = Object.keys(DEFAULT_NPC_CONFIGS);
  public readonly randomAlwaysKeep = ['wolf_cave'];
  public readonly vanilla: VanillaPregnancyHooks = { macros: {} };
  public readonly generators = new Map<string, PregnancyGenerator>();

  private readonly patch: NPCPregnancyPatch;
  // 种族级配置：一个 type 可以被多个 NPC 共用，负责生成器、默认地点、周期倍率、孩子文本等。
  private readonly configs = new Map<string, PregnancyAddConfig>();
  // NPC 级配置：只覆盖某个命名 NPC 的怀孕类型、出生地点、周期模式等，不重复保存 NPC 基础数据。
  private readonly npcConfigs = new Map<string, PregnancyNpcConfig>();
  // 下面几个 Map 是从 configs 拆出的快速索引，运行时少做类型判断。
  private readonly births = new Map<string, PregnancyBirthConfig | PregnancyBirthResolver>();
  private readonly etas = new Map<string, PregnancyEtaResolver>();
  private readonly children = new Map<string, PregnancyChildConfig>();
  private readonly childActivities = new Map<string, PregnancyChildActivityResolver>();
  private readonly texts = new Map<string, PregnancyTextConfig | PregnancyTextResolver>();

  public constructor(public readonly manager: NPCManager) {
    this.patch = new NPCPregnancyPatch(this);
    // 原版特殊 NPC 也走注册数据，避免在周期逻辑里继续堆 switch/case。
    for (const [type, config] of Object.entries(DEFAULT_TYPE_CONFIGS)) this.add(type, config);
    for (const [npcName, config] of Object.entries(DEFAULT_NPC_CONFIGS)) this.addNpc(npcName, config);
    // 等原版 pregnancy 宏和 window.pregnancyGenerator 创建后，再保存原版入口并替换需要扩展的宏。
    manager.core.once(':storyready', () => this.patch.inject());
  }

  public definePregnancyProperty(npc: PregnancyNPC) {
    npc.pregnancy ??= {};

    let data = npc.pregnancy;
    let ready = false;

    Object.defineProperty(npc, 'pregnancy', {
      get: () => {
        if (ready) return data;
        ready = true;

        const config = this.npcConfigs.get(npc.nam);
        const type = this.typeOf(npc);
        const explicit = data.enabled === true;
        const infertile = this.infertile.includes(npc.nam);
        const forced = this.canBePregnant.includes(npc.nam);
        const incomplete = V.settings.incompletePregnancyEnabled;
        const ignored = setup.pregnancy.ignoresIncompleteCheck?.includes(npc.nam);

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
            type: data.type ?? config?.type ?? type,
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
      this.configs.set(key, config);
      if (typeof config.generator === 'function') this.generators.set(key, config.generator);
      if (config.birth) this.births.set(key, config.birth);
      if (typeof config.eta === 'function') this.etas.set(key, config.eta);
      if (config.child) this.children.set(key, config.child);
      if (typeof config.childActivity === 'function') this.childActivities.set(key, config.childActivity);
      if (typeof config.child?.activity === 'function') this.childActivities.set(key, config.child.activity);
      if (config.child?.text) this.texts.set(key, config.child.text);
      if (config.text) this.texts.set(key, config.text);
      if (config.npc) for (const [npcName, npcConfig] of Object.entries(config.npc)) this.addNpc(npcName, npcConfig);
    }
  }

  public addNpc(npcName: string, typeOrConfig: string | PregnancyNpcConfig, config: PregnancyNpcConfig = {}) {
    const key = npcName.trim();
    if (!key) return;
    const data = typeof typeOrConfig === 'string' ? { ...config, type: typeOrConfig } : typeOrConfig;
    if (!data || typeof data !== 'object') return;
    this.npcConfigs.set(key, data);
    if (data.type) this.types.add(data.type);
    if (data.enabled !== false && data.canBePregnant !== false) this.canBePregnant.pushUnique(key);
    if (data.canImpregnatePlayer === true) this.canImpregnatePlayer.pushUnique(key);
  }

  public addChild(type: string, config: PregnancyChildConfig) {
    const key = type.trim();
    if (!key || !config || typeof config !== 'object') return;
    this.children.set(key, config);
    if (typeof config.activity === 'function') this.childActivities.set(key, config.activity);
    if (config.text) this.texts.set(key, config.text);
  }

  public typeOf(target: string | PregnancyNPC | null | undefined) {
    const npc = typeof target === 'string' ? (C.npc[target] ?? (Array.isArray(V.NPCName) ? V.NPCName.find((item: { nam?: string }) => item.nam === target) : null)) : target;
    const data = npc?.pregnancy;
    const name = this.npcNameOf(target, npc);
    const config = name ? this.npcConfigs.get(name) : null;
    return typeof data?.type === 'string' && data.type.trim() ? data.type.trim() : (config?.type ?? npc?.type ?? '');
  }

  private npcNameOf(target: string | PregnancyNPC | null | undefined, npc?: PregnancyNPC | null) {
    if (typeof target === 'string') return target;
    if (npc && V.per_npc && typeof V.per_npc === 'object') {
      const found = Object.entries(V.per_npc).find(([, value]) => value === npc);
      if (found) return found[0];
    }
    const name = npc?.nam || npc?.fullDescription || npc?.description || '';
    return V.NPCNameList?.includes(name) ? name : '';
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
    npc.pregnancyAvoidance = DEFAULT_AVOIDANCE[npc.nam] ?? Math.random(100);
  }

  public savedPregnancy() {
    const names = this.manager.NamedNPC.get(this.manager);

    for (const npcName of names) {
      const npc = Array.isArray(V.NPCName) ? V.NPCName.find((item: { nam?: string }) => item?.nam === npcName) : this.manager.data.get(npcName)?.Data;
      if (npc) this.NPCPregnancy(npc);
    }

    const pregnancy = setup.pregnancy;
    if (!pregnancy) return null;

    // 原版 recordSperm / namedNpcPregnancy 会查 setup.pregnancy 的名单，所以注册数据最终要落到这里。
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
    // 纯原版精液直接交回原版宏；混合精液先给原版一次机会，再处理自定义种族。
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
    // 原版能处理的组合不截胡，避免影响 Alex/Black Wolf/Great Hawk 等已有剧情。
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

  public cycle(days = 1) {
    // time.js 的每日 npcPregnancyCycle() 调用点会被替换到这里；作弊 timeTravel 不自动补算。
    const count = Math.max(0, Math.floor(Number(days) || 0));
    for (let i = 0; i < count; i++) this.cycleDay();
  }

  public endNpcPregnancy(npcName: string, birthLocation?: string, location?: string, context?: any) {
    const npc = C.npc[npcName];
    const pregnancy = npc?.pregnancy as PregnancyData | undefined;
    if (!npc || npc.vagina === 'none' || pregnancy?.enabled === undefined || !pregnancy.fetus?.length) return false;
    const type = this.typeOf(npc);
    const resolved = this.birthLocation(type, pregnancy, npcName, birthLocation, location);
    // 原版宏会清空/改写 pregnancy，所以先记下 fetus 里的 childId，出生后再补自定义 child 配置。
    const childIds = pregnancy.fetus.map(child => child?.childId).filter((childId): childId is string => typeof childId === 'string' && childId.length > 0);
    const ended = this.vanillaMacro(this.vanilla.macros.endNpcPregnancy, [npcName, resolved.birthLocation, resolved.location], context);
    if (ended) this.applyChildConfig(childIds, pregnancy, npcName);
    return ended;
  }

  private cycleDay() {
    if (V.statFreeze) return;
    for (const npcName of V.NPCNameList ?? []) {
      const npc = C.npc[npcName];
      const pregnancy = npc?.pregnancy as PregnancyData | undefined;
      if (!npc || !pregnancy) continue;
      if (pregnancy.fetus?.length) {
        this.progressPregnancy(npcName, npc, pregnancy);
      } else if (pregnancy.enabled && V.settings.npcPregnancyEnabled === true) {
        this.progressCycle(npcName, pregnancy);
      }
      // updateRecordedSperm 是原版局部函数，只暴露成宏；不能直接当 window 函数调用。
      this.vanillaMacro(this.vanilla.macros.updateRecordedSperm, ['vagina', npcName, 1]);
    }
  }

  private progressPregnancy(npcName: string, npc: PregnancyNPC, pregnancy: PregnancyData) {
    const multiplier = this.multiplier(npcName, pregnancy);
    pregnancy.timer += parseFloat(multiplier.toFixed(3));
    if (pregnancy.timer > pregnancy.timerEnd * 0.2 && !pregnancy.npcAwareOf) pregnancy.npcAwareOf = true;
    if (pregnancy.timer <= pregnancy.timerEnd) return;
    if (!this.shouldAutoEnd(npcName, pregnancy)) return;

    if (pregnancy.timer >= pregnancy.timerEnd + 14 * multiplier) {
      this.handleMissedBirth(npcName, pregnancy);
      const locations = this.birthLocation(this.typeOf(npc), pregnancy, npcName);
      this.endNpcPregnancy(npcName, locations.birthLocation, locations.location);
      return;
    }

    pregnancy.waterBreaking = true;
  }

  private progressCycle(npcName: string, pregnancy: PregnancyData) {
    const config = this.configFor(npcName, pregnancy);
    const forcePregnancy = this.forcePregnancy(config, npcName, pregnancy);
    if (V.settings.fertilityCycleEnabled === true) {
      pregnancy.cycleDay++;
      if (pregnancy.cycleDay >= pregnancy.cycleDaysTotal) {
        pregnancy.cycleDay = 1;
      } else if (this.isDangerousDay(config, pregnancy)) {
        this.namedNpcPregnancyAttempt(npcName, forcePregnancy, pregnancy.sperm);
      }
      return;
    }

    pregnancy.nonCycleRng.push(random(0, 4));
    pregnancy.nonCycleRng.deleteAt(0);
    if (config.nonCycleFlag && pregnancy.nonCycleRng[0] === 0) pregnancy[config.nonCycleFlag] = true;
    if (pregnancy.nonCycleRng[0] === 0) this.namedNpcPregnancyAttempt(npcName, forcePregnancy, pregnancy.sperm);
  }

  private multiplier(npcName: string, pregnancy: PregnancyData) {
    const custom = this.configFor(npcName, pregnancy).multiplier;
    if (typeof custom === 'function') return Math.max(0, Number(custom(npcName, pregnancy)) || 0);
    if (typeof custom === 'number') return Math.max(0, custom);
    return 1;
  }

  private shouldAutoEnd(npcName: string, pregnancy: PregnancyData) {
    const setting = this.configFor(npcName, pregnancy).autoEnd;
    if (typeof setting === 'function') return !!setting(npcName, pregnancy);
    if (typeof setting === 'boolean') return setting;
    return true;
  }

  private handleMissedBirth(npcName: string, pregnancy: PregnancyData) {
    const custom = this.configFor(npcName, pregnancy).onMissedBirth;
    if (custom) {
      custom(npcName, pregnancy);
      return;
    }
  }

  private birthLocation(type: string, pregnancy?: PregnancyData, npcName?: string, birthLocation?: string, location?: string): PregnancyBirthConfig {
    const birth = this.configFor(npcName, pregnancy, type).birth;
    const resolved = typeof birth === 'function' ? birth(type, pregnancy, npcName) : birth;
    return {
      birthLocation: birthLocation || resolved?.birthLocation || 'unknown',
      location: location || resolved?.location || 'unknown'
    };
  }

  private configFor(npcName?: string, pregnancy?: PregnancyData, fallbackType?: string): PregnancyNpcConfig {
    const type = pregnancy?.type || fallbackType || '';
    // NPC 配置覆盖种族配置；例如同为 human，某个 NPC 可以拥有自己的倍率或出生地点。
    return {
      ...(type ? this.configs.get(type) : undefined),
      ...(npcName ? this.npcConfigs.get(npcName) : undefined)
    };
  }

  private isDangerousDay(config: PregnancyNpcConfig, pregnancy: PregnancyData) {
    if (config.cycleMode === 'after') return pregnancy.cycleDay >= pregnancy.cycleDangerousDay;
    return between(pregnancy.cycleDay, pregnancy.cycleDangerousDay - 1, pregnancy.cycleDangerousDay + 1);
  }

  private forcePregnancy(config: PregnancyNpcConfig, npcName: string, pregnancy: PregnancyData) {
    const force = config.forcePregnancy;
    return typeof force === 'function' ? !!force(npcName, pregnancy) : !!force;
  }

  private applyChildConfig(childIds: string[], pregnancy: PregnancyData, npcName?: string) {
    for (const childId of childIds) {
      const child = V.children?.[childId];
      const config = child?.type ? this.children.get(child.type) : null;
      if (!child || !config) continue;

      // child 配置只在出生后处理，避免干扰原版孕期 fetus 数据结构。
      const data = typeof config.defaults === 'function' ? config.defaults(child, pregnancy, npcName) : config.defaults;
      if (data && typeof data === 'object') Object.assign(child, data);

      const transform = typeof config.transform === 'function' ? config.transform(child, pregnancy, npcName) : config.transform;
      if (transform) this.applyChildTransform(child, transform);
    }
  }

  private applyChildTransform(child: any, transform: PregnancyChildTransformConfig) {
    child.features ??= {};
    if (typeof transform === 'string' || Array.isArray(transform)) {
      child.features.maplebirchTransform = transform;
      return;
    }
    if ('animal' in transform) child.features.beastTransform = transform.animal;
    if ('divine' in transform) child.features.divineTransform = transform.divine;
    if ('maplebirch' in transform) child.features.maplebirchTransform = transform.maplebirch;
    if (transform.features && typeof transform.features === 'object') Object.assign(child.features, transform.features);
  }

  private spermObjectToArray(spermObject: SpermData[] = [], player: boolean, disableRng?: boolean) {
    const trackedNPCs: SpermEntry[] = [];
    const spermArray: SpermEntry[] = [];

    for (const sperm of spermObject) {
      if (!sperm?.type || !this.types.has(sperm.type)) continue;
      // 原版不完整怀孕设置关闭时，未进入 canImpregnatePlayer 的命名 NPC 精液不参与 PC 怀孕。
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
