// ./src/modules/NamedNPCAddon/NPCUtils.ts

import maplebirch from '../../core';
import type NPCManager from '../NamedNPC';
import dol from '../../host/Adapter';

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
  Object.defineProperty(dol.variables.maplebirch.npc[name], 'Seen', {
    get: () => dol.variables[SeenName],
    set: val => (dol.variables[SeenName] = val),
    configurable: true,
    enumerable: true
  });
  Object.defineProperty(dol.variables.maplebirch.npc[name], 'FirstSeen', {
    get: () => dol.variables[FirstSeenName],
    set: val => (dol.variables[FirstSeenName] = val),
    configurable: true,
    enumerable: true
  });
}

function bodyDataProperties(npcName: string) {
  const name = npcName.toLowerCase();
  if (!dol.variables.maplebirch.npc[name].bodydata || typeof dol.variables.maplebirch.npc[name].bodydata !== 'object') dol.variables.maplebirch.npc[name].bodydata = {};
  const bodyData = dol.variables.maplebirch.npc[name].bodydata;
  body.forEach(prop => {
    delete bodyData[prop];
    Object.defineProperty(bodyData, prop, {
      get: () => {
        const npc = Array.isArray(dol.variables.NPCName) ? dol.variables.NPCName.find((n: { nam?: string }) => n?.nam === npcName) : undefined;
        return npc ? npc[prop] : undefined;
      },
      configurable: true,
      enumerable: true
    });
  });
}

function outfitProperties(npcName: string) {
  const name = npcName.toLowerCase();
  delete dol.variables.maplebirch.npc[name].outfits;
  Object.defineProperty(dol.variables.maplebirch.npc[name], 'outfits', {
    get: () => {
      const npc = Array.isArray(dol.variables.NPCName) ? dol.variables.NPCName.find((n: { nam?: string }) => n?.nam === npcName) : undefined;
      return npc ? npc.outfits || [] : [];
    },
    configurable: true,
    enumerable: true
  });
}

function setupNPCData(manager: NPCManager) {
  if (!dol.variables.maplebirch || typeof dol.variables.maplebirch !== 'object') dol.variables.maplebirch = {};
  if (!dol.variables.maplebirch.npc || typeof dol.variables.maplebirch.npc !== 'object') dol.variables.maplebirch.npc = {};
  const NPCNameList = manager.NamedNPC.get(manager);
  const lowerNames = new Set(NPCNameList.map(name => name.toLowerCase()));
  Object.keys(dol.variables.maplebirch.npc).forEach(npcKey => {
    if (!lowerNames.has(npcKey.toLowerCase())) delete dol.variables.maplebirch.npc[npcKey];
  });
  NPCNameList.forEach(npcName => {
    const name = npcName.toLowerCase();
    const npc = dol.variables.NPCName?.find((data: any) => data?.nam === npcName);
    if (npc) for (const [key, value] of Object.entries(bodyDefaults)) if (typeof npc[key] !== typeof value || !Number.isFinite(npc[key])) npc[key] = value;
    if (!dol.variables.maplebirch.npc[name]) dol.variables.maplebirch.npc[name] = {};
    dol.variables.maplebirch.npc[name].bodydata ??= {};
    dol.variables.maplebirch.npc[name].outfits ??= [];
    const tucked = dol.variables.maplebirch.npc[name].tucked;
    if (!Array.isArray(tucked) || tucked.length !== 2 || typeof tucked[0] !== 'boolean' || typeof tucked[1] !== 'boolean') dol.variables.maplebirch.npc[name].tucked = [false, false];
    manager.Transformation.ensure(npcName);
    manager.fluids.ensure(npcName);
    Object.defineProperty(dol.variables.maplebirch.npc[name], 'clothes', {
      get: () => manager.Clothes.wardrobe.worn(npcName),
      set: () => maplebirch.npc.log(`警告：禁止直接设置 NPC ${npcName} 的服装，请通过服装系统管理`),
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(dol.variables.maplebirch.npc[name], 'location', {
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
