// ./src/modules/NamedNPCAddon/NPCUtils.ts

import maplebirch from '../../core';
import type NPCManager from '../NamedNPC';
import NPCFluids from './NPCFluids';

const body = ['penis', 'vagina', 'virginity', 'hair_side_type', 'hair_fringe_type', 'hair_position', 'hairlength', 'eyeColour', 'hairColour', 'penissize', 'breastsize', 'ballssize'];

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

function setupNPCData(manager: NPCManager, phase = 'init') {
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
    if (!Object.prototype.hasOwnProperty.call(V.maplebirch.npc[name], 'clothes')) {
      Object.defineProperty(V.maplebirch.npc[name], 'clothes', {
        get: () => manager.Clothes.worn(npcName),
        set: () => maplebirch.npc.log(`警告：禁止直接设置 NPC ${npcName} 的服装，请通过服装系统管理`),
        configurable: true,
        enumerable: true
      });
    }
    if (!Object.prototype.hasOwnProperty.call(V.maplebirch.npc[name], 'location')) {
      Object.defineProperty(V.maplebirch.npc[name], 'location', {
        get: () => manager.Schedule.location[npcName],
        set: () => maplebirch.npc.log(`警告：禁止直接设置 NPC ${npcName} 的位置，请通过日程系统管理`),
        configurable: true,
        enumerable: true
      });
    }
    if (phase === 'postInit') {
      bodyDataProperties(npcName);
      outfitProperties(npcName);
      npcSeenProperty(npcName);
    }
  });
}

export { isPossible, setupNPCData };
