// .src/modules/Frameworks/patch.ts

import Traits, { traitsData, TraitCategory, TraitConfig } from './OtherTools/Traits';
import Location, { locationData, LocationConfig, LocationConfigOptions, LocationUpdate } from './OtherTools/Location';
import Bodywriting, { bodywritingData, BodywritingConfig, BodywritingData } from './OtherTools/Bodywriting';
import Foodstuff, { foodstuffData, FoodstuffConfig } from './OtherTools/Foodstuff';
import Antiques, { antiquesData, AntiqueConfig } from './OtherTools/Antiques';

type AddTraits = (...traits: Partial<TraitConfig>[]) => void;
type InjectTraits = (data: TraitCategory[]) => TraitCategory[];
type ConfigureLocation = (locationId: string, config: LocationConfig, options?: LocationConfigOptions) => boolean;
type ApplyLocation = () => void;
type AddBodywriting = (key: string, config: BodywritingConfig) => void;
type ApplyBodywriting = () => void;
type AddFoodstuff = (key: string, config: FoodstuffConfig) => void;
type ApplyFoodstuff = () => void;
type AddAntiques = (key: string, config: AntiqueConfig) => void;
type InjectAntiques = (data: Record<string, AntiqueConfig>) => Record<string, AntiqueConfig>;

class Patch {
  public readonly traitsData: TraitConfig[] = traitsData;
  public readonly locationData: Record<string, LocationUpdate> = locationData;
  public readonly bodywritingData: Record<string, BodywritingData> = bodywritingData;
  public readonly foodstuffData: Record<string, FoodstuffConfig> = foodstuffData;
  public readonly antiquesData: Record<string, AntiqueConfig> = antiquesData;

  public addTraits: AddTraits = Traits.add.bind(Traits);
  public injectTraits: InjectTraits = Traits.inject.bind(Traits);
  public configureLocation: ConfigureLocation = Location.configure.bind(Location);
  public applyLocation: ApplyLocation = Location.apply.bind(Location);
  public addBodywriting: AddBodywriting = Bodywriting.add.bind(Bodywriting);
  public applyBodywriting: ApplyBodywriting = Bodywriting.apply.bind(Bodywriting);
  public addFoodstuff: AddFoodstuff = Foodstuff.add.bind(Foodstuff);
  public applyFoodstuff: ApplyFoodstuff = Foodstuff.apply.bind(Foodstuff);
  public addAntiques: AddAntiques = Antiques.add.bind(Antiques);
  public injectAntiques: InjectAntiques = Antiques.inject.bind(Antiques);
}

export default new Patch();
