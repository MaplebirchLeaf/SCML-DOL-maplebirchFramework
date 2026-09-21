// ./src/modules/Frameworks/Patches/index.ts

import { errorMessage } from '../../../utils/error';
import type { MaplebirchCore } from '../../../core';
import Patch, { type PatchDefinition } from './Patch';
import Traits, { traitsData } from './Traits';
import Location, { locationData } from './Location';
import Bodywriting, { bodywritingData } from './Bodywriting';
import Foodstuff, { foodstuffData } from './Foodstuff';
import Antiques, { antiquesData } from './Antiques';
import Tips, { tipsData } from './Tips';
import Fishing, { fishData, fishingLocationData } from './Fishing';
import { isRecord } from './config';
import dol from '../../../host/Adapter';

export default function create(core: MaplebirchCore) {
  const injectTraits = (data: Parameters<typeof Traits.inject>[0]) => Traits.inject(data, text => core.auto(text));
  const definitions = {
    traits: {
      api: { data: traitsData, add: Traits.add, inject: injectTraits },
      legacy: { traitsData, addTraits: Traits.add, injectTraits }
    },
    location: {
      api: { data: locationData, configure: Location.configure, apply: Location.apply },
      legacy: { locationData, configureLocation: Location.configure, applyLocation: Location.apply },
      available: () => dol.has('setup') && isRecord(dol.setup.LocationImages) && isRecord(dol.setup.Locations),
      init: Location.apply
    },
    bodywriting: {
      api: { data: bodywritingData, add: Bodywriting.add, delete: Bodywriting.delete, apply: Bodywriting.apply },
      legacy: { bodywritingData, addBodywriting: Bodywriting.add, deleteBodywriting: Bodywriting.delete, applyBodywriting: Bodywriting.apply },
      available: () => dol.has('setup') && isRecord(dol.setup.bodywriting) && Array.isArray(dol.setup.bodywriting_namebyindex),
      init: Bodywriting.apply
    },
    fishing: {
      api: { data: fishData, locations: fishingLocationData, add: Fishing.addFish, addBait: Fishing.addBait, configure: Fishing.configureLocation, apply: Fishing.apply },
      legacy: { fishData, fishingLocationData, addFish: Fishing.addFish, addBait: Fishing.addBait, configureFishingLocation: Fishing.configureLocation, applyFishing: Fishing.apply },
      available: () => dol.has('setup') && isRecord(dol.setup.fishing?.lootTables?.fish),
      init: Fishing.apply
    },
    foodstuff: {
      api: { data: foodstuffData, add: Foodstuff.add, apply: Foodstuff.apply },
      legacy: { foodstuffData, addFoodstuff: Foodstuff.add, applyFoodstuff: Foodstuff.apply },
      available: () => dol.has('setup') && isRecord(dol.setup.foodstuff),
      init: Foodstuff.applySetup,
      state: Foodstuff.syncState
    },
    antiques: {
      api: { data: antiquesData, add: Antiques.add, inject: Antiques.inject },
      legacy: { antiquesData, addAntiques: Antiques.add, injectAntiques: Antiques.inject },
      available: () => dol.has('variables') && isRecord(dol.variables.museumAntiques?.antiques),
      state: Antiques.syncState,
      widgets: {
        museumAntiqueText: { after: () => Antiques.inject(dol.temporary.museumAntiqueText) },
        museumdonate: {
          after: node => {
            for (const key of Object.keys(antiquesData)) {
              if (dol.variables.museumAntiques?.antiques[key] === 'found') new core.SugarCube.Wikifier(node, `<<museumAntiqueStatus ${JSON.stringify(key)} "talk">>`);
            }
          }
        }
      }
    },
    tips: {
      api: { data: tipsData, add: Tips.add, apply: Tips.apply, inject: Tips.inject },
      legacy: { tipsData, addTips: Tips.add, applyTips: Tips.apply, injectTips: Tips.inject },
      available: () => dol.has('setup') && isRecord(dol.setup.tips),
      init: Tips.apply,
      widgets: { generateTipsList: { after: () => Tips.inject(dol.setup.tipsList) } }
    }
  } satisfies Record<string, PatchDefinition>;
  type PatchCatalog = { [Name in keyof typeof definitions]: (typeof definitions)[Name]['api'] };
  const patch = new Patch<PatchCatalog>((name, error) => core.log(`Patch ${name}: ${errorMessage(error)}`, 'ERROR'))
    .add('traits', definitions.traits)
    .add('location', definitions.location)
    .add('bodywriting', definitions.bodywriting)
    .add('fishing', definitions.fishing)
    .add('foodstuff', definitions.foodstuff)
    .add('antiques', definitions.antiques)
    .add('tips', definitions.tips);
  return patch as typeof patch & PatchCatalog;
}

export type Patches = ReturnType<typeof create>;
