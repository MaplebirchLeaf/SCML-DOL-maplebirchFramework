// ./src/modules/DoL/Patches/index.ts

import type { MaplebirchCore } from '../../../core';
import Patch, { type PatchDefinition } from '../../Frameworks/Patch';
import Traits, { traitsData } from './Traits';
import Location, { locationData } from './Location';
import Bodywriting, { bodywritingData } from './Bodywriting';
import Foodstuff, { foodstuffData } from './Foodstuff';
import Antiques, { antiquesData } from './Antiques';
import Tips, { tipsData } from './Tips';
import Pills, { pillsData } from './Pills';
import Fishing, { fishData, fishingLocationData } from './Fishing';
import FeatBoosts, { featBoostsData } from './FeatBoosts';
import { isRecord } from './config';
import dol from '../../../host/DoL';

type PatchSurface<Definition extends PatchDefinition> = Definition extends { legacy: infer Flat } ? Flat : Definition['api'];
type PatchAliases<Definition extends PatchDefinition> = (Definition extends PatchDefinition ? (surface: PatchSurface<Definition>) => void : never) extends (surface: infer Aliases) => void
  ? Aliases
  : never;

function register(core: MaplebirchCore, patch: Patch) {
  const pills = new Pills();
  const injectTraits = (data: Parameters<typeof Traits.inject>[0]) => Traits.inject(data, text => core.auto(text));
  const featBoostText = (key: string, field: Parameters<typeof FeatBoosts.text>[1]) => FeatBoosts.text(key, field, text => core.auto(text));
  const setupFeatBoosts = () => FeatBoosts.setup(text => core.auto(text));
  const applyFeatBoosts = () => FeatBoosts.apply(source => void core.host.sugarcube.require().Wikifier.wikifyEval(source));
  const definitions = {
    traits: {
      api: {
        data: traitsData,
        add: Traits.add,
        inject: injectTraits
      },
      legacy: {
        traitsData,
        addTraits: Traits.add,
        injectTraits
      }
    },
    featBoosts: {
      api: {
        data: featBoostsData,
        add: FeatBoosts.add,
        has: FeatBoosts.has,
        text: featBoostText,
        setup: setupFeatBoosts,
        refresh: (key: string) => FeatBoosts.refresh(key, text => core.auto(text)),
        apply: applyFeatBoosts
      },
      init: () => {
        core.tool.macro.wrap(
          'setupFeatBoosts',
          next => {
            const result = next();
            setupFeatBoosts();
            return result;
          },
          'sugarcube'
        );
        core.tool.macro.wrap(
          'applyFeatBoosts',
          next => {
            applyFeatBoosts();
            return next();
          },
          'sugarcube'
        );
      }
    },
    location: {
      api: {
        data: locationData,
        configure: Location.configure,
        apply: Location.apply
      },
      legacy: {
        locationData,
        configureLocation: Location.configure,
        applyLocation: Location.apply
      },
      available: () => dol.has('setup') && isRecord(dol.setup.LocationImages) && isRecord(dol.setup.Locations),
      init: Location.apply
    },
    bodywriting: {
      api: {
        data: bodywritingData,
        add: Bodywriting.add,
        delete: Bodywriting.delete,
        apply: Bodywriting.apply
      },
      legacy: {
        bodywritingData,
        addBodywriting: Bodywriting.add,
        deleteBodywriting: Bodywriting.delete,
        applyBodywriting: Bodywriting.apply
      },
      available: () => dol.has('setup') && isRecord(dol.setup.bodywriting) && Array.isArray(dol.setup.bodywriting_namebyindex),
      init: Bodywriting.apply
    },
    fishing: {
      api: {
        data: fishData,
        locations: fishingLocationData,
        add: Fishing.addFish,
        addBait: Fishing.addBait,
        configure: Fishing.configureLocation,
        apply: Fishing.apply
      },
      legacy: {
        fishData,
        fishingLocationData,
        addFish: Fishing.addFish,
        addBait: Fishing.addBait,
        configureFishingLocation: Fishing.configureLocation,
        applyFishing: Fishing.apply
      },
      available: () => dol.has('setup') && isRecord(dol.setup.fishing?.lootTables?.fish),
      init: Fishing.apply
    },
    foodstuff: {
      api: {
        data: foodstuffData,
        add: Foodstuff.add,
        apply: Foodstuff.apply
      },
      legacy: {
        foodstuffData,
        addFoodstuff: Foodstuff.add,
        applyFoodstuff: Foodstuff.apply
      },
      available: () => dol.has('setup') && isRecord(dol.setup.foodstuff),
      init: Foodstuff.applySetup,
      state: Foodstuff.syncState
    },
    antiques: {
      api: {
        data: antiquesData,
        add: Antiques.add,
        inject: Antiques.inject
      },
      legacy: {
        antiquesData,
        addAntiques: Antiques.add,
        injectAntiques: Antiques.inject
      },
      available: () => dol.has('variables') && isRecord(dol.variables.museumAntiques?.antiques),
      state: () => new (core.host.sugarcube.require().Wikifier)(document.createDocumentFragment(), '<<museumAntiqueText>>')
    },
    tips: {
      api: {
        data: tipsData,
        add: Tips.add,
        apply: Tips.apply,
        inject: Tips.inject
      },
      legacy: {
        tipsData,
        addTips: Tips.add,
        applyTips: Tips.apply,
        injectTips: Tips.inject
      },
      available: () => dol.has('setup') && isRecord(dol.setup.tips),
      init: Tips.apply
    },
    pills: {
      api: {
        data: pillsData,
        add: Pills.add
      },
      available: () => dol.has('setup') && Array.isArray(dol.setup.pills),
      init: () => pills.apply()
    }
  } satisfies Record<string, PatchDefinition>;
  for (const [name, definition] of Object.entries<PatchDefinition>(definitions)) patch.add(name, definition);

  type PatchCatalog = { [Name in keyof typeof definitions]: (typeof definitions)[Name]['api'] };
  return patch as Patch & PatchCatalog & PatchAliases<(typeof definitions)[keyof typeof definitions]>;
}

export type Patches = ReturnType<typeof register>;

export default register;
