// ./src/modules/NamedNPCAddon/NPCClothes.ts

import type NPCManager from '../NamedNPC';
import NPCOutfitSets from './NPCClothes/NPCOutfitSets';
import NPCSidebarArt from './NPCClothes/NPCSidebarArt';
import NPCSidebarWardrobe from './NPCClothes/NPCSidebarWardrobe';

class NPCClothes {
  public readonly outfitSets: NPCOutfitSets;
  public readonly art: NPCSidebarArt;
  public readonly wardrobe: NPCSidebarWardrobe;

  public constructor(manager: NPCManager) {
    this.outfitSets = new NPCOutfitSets(manager);
    this.art = new NPCSidebarArt(manager);
    this.wardrobe = new NPCSidebarWardrobe(manager);
  }

  public init(): void {
    this.outfitSets.init();
    this.wardrobe.init();
  }
}

export default NPCClothes;
