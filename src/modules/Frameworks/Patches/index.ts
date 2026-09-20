// ./src/modules/Frameworks/Patches/index.ts

import { errorMessage } from '../../../utils/error';
import type { MaplebirchCore } from '../../../core';
import Patch from './Patch';
import Traits, { traitsData } from './Traits';
import Location, { locationData } from './Location';
import Bodywriting, { bodywritingData } from './Bodywriting';
import Foodstuff, { foodstuffData } from './Foodstuff';
import Antiques, { antiquesData } from './Antiques';
import Tips, { tipsData } from './Tips';
import Fishing, { fishData, fishingLocationData } from './Fishing';
import { isRecord } from './config';

export default function create(core: MaplebirchCore) {
  return new Patch((name, error) => core.log(`Patch ${name}: ${errorMessage(error)}`, 'ERROR'))
    .add('traits', { api: { traitsData, addTraits: Traits.add, injectTraits: (data: Parameters<typeof Traits.inject>[0]) => Traits.inject(data, text => core.auto(text)) } })
    .add('location', {
      api: { locationData, configureLocation: Location.configure, applyLocation: Location.apply },
      available: () => typeof setup !== 'undefined' && isRecord(setup.LocationImages) && isRecord(setup.Locations),
      init: Location.apply
    })
    .add('bodywriting', {
      api: { bodywritingData, addBodywriting: Bodywriting.add, deleteBodywriting: Bodywriting.delete, applyBodywriting: Bodywriting.apply },
      available: () => typeof setup !== 'undefined' && isRecord(setup.bodywriting) && Array.isArray(setup.bodywriting_namebyindex),
      init: Bodywriting.apply
    })
    .add('fishing', {
      api: { fishData, fishingLocationData, addFish: Fishing.addFish, addBait: Fishing.addBait, configureFishingLocation: Fishing.configureLocation, applyFishing: Fishing.apply },
      available: () => typeof setup !== 'undefined' && isRecord(setup.fishing?.lootTables?.fish),
      init: Fishing.apply
    })
    .add('foodstuff', {
      api: { foodstuffData, addFoodstuff: Foodstuff.add, applyFoodstuff: Foodstuff.apply },
      available: () => typeof setup !== 'undefined' && isRecord(setup.foodstuff),
      init: Foodstuff.applySetup,
      state: Foodstuff.syncState
    })
    .add('antiques', {
      api: { antiquesData, addAntiques: Antiques.add, injectAntiques: Antiques.inject },
      available: () => typeof V !== 'undefined' && isRecord(V.museumAntiques?.antiques),
      state: Antiques.syncState,
      widgets: {
        museumAntiqueText: { after: () => Antiques.inject(T.museumAntiqueText) },
        museumdonate: {
          after: node => {
            for (const key of Object.keys(antiquesData)) {
              if (V.museumAntiques?.antiques[key] === 'found') new core.SugarCube.Wikifier(node, `<<museumAntiqueStatus ${JSON.stringify(key)} "talk">>`);
            }
          }
        }
      }
    })
    .add('tips', {
      api: { tipsData, addTips: Tips.add, applyTips: Tips.apply, injectTips: Tips.inject },
      available: () => typeof setup !== 'undefined' && isRecord(setup.tips),
      init: Tips.apply,
      widgets: { generateTipsList: { after: () => Tips.inject(setup.tipsList) } }
    });
}

export type Patches = ReturnType<typeof create>;
