// ./src/modules/NamedNPCAddon/NPCUtils.ts

import maplebirch from '../../core';
import { NamedNPC } from '../NamedNPC';
import NPCManager from '../NamedNPC';

const _ = maplebirch.lodash;

function isPossible(manager: NPCManager, name: string) {
  if (_.has(manager.romanceConditions, name)) return _.every(manager.romanceConditions[name], condition => condition());
  return false;
}

function convertNPCs(manager: NPCManager) {
  if (!V.NPCName || !_.isArray(V.NPCName)) return;
  _.forEach(V.NPCName, (npc, i) => {
    if (npc?.nam && !(npc instanceof NamedNPC)) {
      const newNpc = new NamedNPC(manager, npc);
      for (const key in npc) if (!newNpc.hasOwnProperty(key) && key !== 'nam') newNpc[key] = npc[key];
      V.NPCName[i] = newNpc;
    }
  });
}

function npcSeenProperty(npcName: string) {
  const npcNameNoSpace = npcName.replace(/\s+/g, '');
  const SeenName = npcNameNoSpace + 'Seen';
  const FirstSeenName = npcNameNoSpace + 'FirstSeen';
  if (!_.has(V.maplebirch.npc, npcName)) V.maplebirch.npc[npcName] = {};
  _.defaults(V, { [SeenName]: [], [FirstSeenName]: '' });
  Object.defineProperty(V.maplebirch.npc[npcName], 'Seen', {
    get: () => V[SeenName],
    set: val => (V[SeenName] = val),
    configurable: true,
    enumerable: true
  });
  Object.defineProperty(V.maplebirch.npc[npcName], 'FirstSeen', {
    get: () => V[FirstSeenName],
    set: val => (V[FirstSeenName] = val),
    configurable: true,
    enumerable: true
  });
}

function bodyDataProperties(npcName: string) {
  const name = npcName.toLowerCase();
  const body = ['penis', 'vagina', 'virginity', 'hair_side_type', 'hair_fringe_type', 'hair_position', 'hairlength', 'eyeColour', 'hairColour', 'penissize', 'breastsize', 'ballssize'];
  const bodyData = V.maplebirch.npc[name].bodydata;
  _.forEach(body, prop => {
    delete bodyData[prop];
    Object.defineProperty(bodyData, prop, {
      get: () => {
        const npc = _.find(V.NPCName, (n: { nam: string }) => n.nam === npcName);
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
      const npc = _.find(V.NPCName, (n: { nam: string }) => n.nam === npcName);
      return npc ? npc.outfits || [] : [];
    },
    configurable: true,
    enumerable: true
  });
}

function setupNpcData(manager: NPCManager, phase = 'init') {
  const NPCNameList = manager.NPCNameList;
  const lowerNames = new Set(_.map(NPCNameList, name => name.toLowerCase()));

  _.forIn(V.maplebirch.npc, (_, npcKey) => {
    if (!lowerNames.has(npcKey)) delete V.maplebirch.npc[npcKey];
  });

  _.forEach(NPCNameList, npcName => {
    const name = npcName.toLowerCase();
    if (!_.has(V.maplebirch.npc, name)) V.maplebirch.npc[name] = {};
    // prettier-ignore
    _.defaults(V.maplebirch.npc[name], {
      bodydata: {},
      outfits : [],
      tucked  : [false, false]
    });
    if (!V.maplebirch.npc[name].hasOwnProperty('clothes')) {
      Object.defineProperty(V.maplebirch.npc[name], 'clothes', {
        get: () => manager.Clothes.worn(npcName),
        set: () => maplebirch.npc.log(`警告：禁止直接设置 NPC ${npcName} 的服装，请通过服装系统管理`)
      });
    }
    if (!V.maplebirch.npc[name].hasOwnProperty('location')) {
      Object.defineProperty(V.maplebirch.npc[name], 'location', {
        get: () => manager.Schedule.location[npcName],
        set: () => maplebirch.npc.log(`警告：禁止直接设置 NPC ${npcName} 的位置，请通过日程系统管理`)
      });
    }
    if (phase === 'postInit') {
      bodyDataProperties(npcName);
      outfitProperties(npcName);
      npcSeenProperty(name);
    }
  });
}

export { isPossible, convertNPCs, setupNpcData };
