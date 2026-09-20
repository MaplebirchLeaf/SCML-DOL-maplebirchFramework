// ./src/modules/NamedNPCAddon/NPCUtils.ts

import maplebirch from '../../core';
import type NPCManager from '../NamedNPC';

const bodyDefaults = { hair_sides_length: 200, hair_fringe_length: 200 };

const body = [
  'penis',
  'vagina',
  'virginity',
  'hair_side_type',
  'hair_fringe_type',
  'hair_position',
  'hair_sides_length',
  'hair_fringe_length',
  'eyeColour',
  'hairColour',
  'penissize',
  'breastsize',
  'ballssize'
];

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
    const npc = V.NPCName?.find((data: any) => data?.nam === npcName);
    if (npc) for (const [key, value] of Object.entries(bodyDefaults)) if (typeof npc[key] !== typeof value || !Number.isFinite(npc[key])) npc[key] = value;
    if (!V.maplebirch.npc[name]) V.maplebirch.npc[name] = {};
    V.maplebirch.npc[name].bodydata ??= {};
    V.maplebirch.npc[name].outfits ??= [];
    const tucked = V.maplebirch.npc[name].tucked;
    if (!Array.isArray(tucked) || tucked.length !== 2 || typeof tucked[0] !== 'boolean' || typeof tucked[1] !== 'boolean') V.maplebirch.npc[name].tucked = [false, false];
    manager.Transformation.ensure(npcName);
    manager.fluids.ensure(npcName);
    Object.defineProperty(V.maplebirch.npc[name], 'clothes', {
      get: () => manager.Clothes.wardrobe.worn(npcName),
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

export { bodyDefaults, isPossible, setupNPCData };
