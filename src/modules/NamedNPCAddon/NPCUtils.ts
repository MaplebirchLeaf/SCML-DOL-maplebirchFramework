// ./src/modules/NamedNPCAddon/NPCUtils.ts

import maplebirch from '../../core';
import type NPCManager from '../NamedNPC';
import NPCFluids from './NPCFluids';

const body = ['penis', 'vagina', 'virginity', 'hair_side_type', 'hair_fringe_type', 'hair_position', 'hairlength', 'eyeColour', 'hairColour', 'penissize', 'breastsize', 'ballssize'];

// 原版怀孕种族 / 不孕 NPC / 强制可怀孕 NPC（从已删除的 NPC 怀孕模块迁移而来）
const PREGNANCY_TYPES = new Set(['human', 'wolf', 'wolfboy', 'wolfgirl', 'hawk', 'harpy']);
const PREGNANCY_INFERTILE_NPCS = ['Bailey', 'Leighton'];
const PREGNANCY_FORCED_NPCS = ['Black Wolf', 'Great Hawk', 'Alex'];

interface PregnancyPropertyNPC {
  nam: string;
  type?: string;
  pregnancy?: Record<string, any> | null;
}

function definePregnancyProperty(manager: NPCManager, npc: PregnancyPropertyNPC) {
  npc.pregnancy ??= {};

  let data = npc.pregnancy;
  let ready = false;

  Object.defineProperty(npc, 'pregnancy', {
    get: () => {
      if (ready) return data;
      ready = true;

      const type = typeof data?.type === 'string' && data.type.trim() ? data.type.trim() : manager.Transformation.pregnancyType(npc.nam) || npc.type || '';
      const explicit = data.enabled === true;
      const infertile = PREGNANCY_INFERTILE_NPCS.includes(npc.nam);
      const forced = PREGNANCY_FORCED_NPCS.includes(npc.nam);
      const incomplete = V.settings.incompletePregnancyEnabled;
      const ignored = setup.pregnancy?.ignoresIncompleteCheck?.includes(npc.nam);

      if ((explicit || (data.enabled == null && !infertile && PREGNANCY_TYPES.has(type) && ((incomplete && !ignored) || forced))) && !Array.isArray(data.fetus)) {
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
          type: data.type ?? type,
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

function isPossible(manager: NPCManager, name: string) {
  const conditions = manager.romanceConditions[name];
  return Array.isArray(conditions) ? conditions.every(condition => condition()) : false;
}

function npcSeenProperty(npcName: string) {
  const name = npcName.toLowerCase();
  const npcNameNoSpace = name.replace(/\s+/g, '');
  const SeenName = npcNameNoSpace + 'Seen';
  const FirstSeenName = npcNameNoSpace + 'FirstSeen';
  Object.defineProperty(V.maplebirch.npc[name], 'Seen', {
    get: () => V[SeenName],
    set: val => (V[SeenName] = val),
    configurable: true,
    enumerable: true
  });
  Object.defineProperty(V.maplebirch.npc[name], 'FirstSeen', {
    get: () => V[FirstSeenName],
    set: val => (V[FirstSeenName] = val),
    configurable: true,
    enumerable: true
  });
}

function bodyDataProperties(npcName: string) {
  const name = npcName.toLowerCase();
  if (!V.maplebirch.npc[name].bodydata || typeof V.maplebirch.npc[name].bodydata !== 'object') V.maplebirch.npc[name].bodydata = {};
  const bodyData = V.maplebirch.npc[name].bodydata;
  body.forEach(prop => {
    delete bodyData[prop];
    Object.defineProperty(bodyData, prop, {
      get: () => {
        const npc = Array.isArray(V.NPCName) ? V.NPCName.find((n: { nam?: string }) => n?.nam === npcName) : undefined;
        return npc ? npc[prop] : undefined;
      },
      configurable: true,
      enumerable: true
    });
  });
}

function outfitProperties(npcName: string) {
  const name = npcName.toLowerCase();
  delete V.maplebirch.npc[name].outfits;
  Object.defineProperty(V.maplebirch.npc[name], 'outfits', {
    get: () => {
      const npc = Array.isArray(V.NPCName) ? V.NPCName.find((n: { nam?: string }) => n?.nam === npcName) : undefined;
      return npc ? npc.outfits || [] : [];
    },
    configurable: true,
    enumerable: true
  });
}

function setupNPCData(manager: NPCManager) {
  if (!V.maplebirch || typeof V.maplebirch !== 'object') V.maplebirch = {};
  if (!V.maplebirch.npc || typeof V.maplebirch.npc !== 'object') V.maplebirch.npc = {};
  const NPCNameList = manager.NamedNPC.get(manager);
  const lowerNames = new Set(NPCNameList.map(name => name.toLowerCase()));
  Object.keys(V.maplebirch.npc).forEach(npcKey => {
    if (!lowerNames.has(npcKey.toLowerCase())) delete V.maplebirch.npc[npcKey];
  });
  NPCNameList.forEach(npcName => {
    const name = npcName.toLowerCase();
    if (!V.maplebirch.npc[name]) V.maplebirch.npc[name] = {};
    V.maplebirch.npc[name].bodydata ??= {};
    V.maplebirch.npc[name].outfits ??= [];
    V.maplebirch.npc[name].tucked ??= [false, false];
    manager.Transformation.ensure(npcName);
    NPCFluids.ensure(npcName);
    Object.defineProperty(V.maplebirch.npc[name], 'clothes', {
      get: () => manager.Clothes.worn(npcName),
      set: () => maplebirch.npc.log(`警告：禁止直接设置 NPC ${npcName} 的服装，请通过服装系统管理`),
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(V.maplebirch.npc[name], 'location', {
      get: () => manager.Schedule.location[npcName],
      set: () => maplebirch.npc.log(`警告：禁止直接设置 NPC ${npcName} 的位置，请通过日程系统管理`),
      configurable: true,
      enumerable: true
    });
    bodyDataProperties(npcName);
    outfitProperties(npcName);
    npcSeenProperty(npcName);
  });
}

export { definePregnancyProperty, isPossible, setupNPCData };
