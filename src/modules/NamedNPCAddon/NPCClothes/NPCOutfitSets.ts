// ./src/modules/NamedNPCAddon/NPCClothes/NPCOutfitSets.ts

import Diagnostics from '../../../infra/Diagnostics';
import type NPCManager from '../../NamedNPC';
import dol from '../../../host/DoL';
import { clone } from '../../../utils/object';

interface OutfitPartConfig {
  name: string;
  integrity_max?: number;
  word?: string;
  action?: string;
  readonly desc?: string;
}

export interface OutfitSetConfig {
  name: string;
  type?: string;
  gender?: string;
  outfit?: number;
  upper: string | OutfitPartConfig;
  lower: string | OutfitPartConfig;
  desc?: string;
}

interface OutfitSet {
  name: string;
  type: string;
  gender: string;
  outfit: number;
  clothes: {
    upper: Required<OutfitPartConfig>;
    lower: Required<OutfitPartConfig>;
  };
  desc: string;
}

class NPCOutfitSets {
  public constructor(private readonly manager: NPCManager) {}

  public init(): void {
    try {
      this.add(
        {
          name: 'neutralDefault',
          type: 'default',
          gender: 'n',
          outfit: 0,
          upper: {
            name: 'shirt',
            word: 'a',
            action: 'lift',
            get desc() {
              return lanSwitch('shirt', '衬衫');
            }
          },
          lower: {
            name: 'cargo trousers',
            word: 'n',
            action: 'pull',
            get desc() {
              return lanSwitch('cargo trousers', '工装裤');
            }
          },
          get desc() {
            return lanSwitch('Shirt and cargo trousers', '衬衫和工装裤');
          }
        },
        {
          name: 'hermDefault',
          type: 'default',
          gender: 'h',
          outfit: 0,
          upper: {
            name: 'shirt',
            word: 'a',
            action: 'lift',
            get desc() {
              return lanSwitch('shirt', '衬衫');
            }
          },
          lower: {
            name: 'miniskirt',
            word: 'a',
            action: 'lift',
            get desc() {
              return lanSwitch('miniskirt', '迷你裙');
            }
          },
          get desc() {
            return lanSwitch('Shirt and miniskirt', '衬衫和迷你裙');
          }
        }
      );
    } catch (e) {
      this.manager.log(`NPCOutfitSets 初始化失败: ${Diagnostics.message(e)}`, 'ERROR');
    }
  }

  public add(...configs: OutfitSetConfig[]): void {
    dol.setup.npcClothesSets ??= [];
    for (const config of configs) {
      const set = this.create(config);
      if (!set) continue;
      if (dol.setup.npcClothesSets.some((item: OutfitSet) => item.name === set.name)) {
        this.manager.log(`服装套装 ${set.name} 已存在，跳过添加`, 'WARN');
        continue;
      }
      dol.setup.npcClothesSets.push(set);
    }
  }

  public get data(): OutfitSet[] {
    dol.setup.npcClothesSets ??= [];
    return dol.setup.npcClothesSets;
  }

  public recover(): void {
    if (!dol.has('variables') || !Array.isArray(dol.setup.npcClothesSets) || !dol.setup.npcClothesSets.length) return;
    const variables = dol.variables;
    const sets = new Set(this.data.map(set => set.name));
    const named = Array.isArray(variables.NPCName) ? variables.NPCName : [];
    const active = Array.isArray(variables.NPCList) ? variables.NPCList : [];
    const { Wikifier } = this.manager.core.host.sugarcube.require();
    for (const npc of new Set([...named, ...active])) {
      if (!npc || typeof npc !== 'object') continue;
      const outfits = Array.isArray(npc.outfits) ? npc.outfits.filter((name: string) => sets.has(name)) : undefined;
      const missingOutfits = outfits && outfits.length !== npc.outfits.length;
      const missingSet = npc.clothes?.set && !sets.has(npc.clothes.set);
      if (!missingOutfits && !missingSet) continue;
      const temporary = dol.temporary;
      const previous = temporary.maplebirchOutfitNPC;
      temporary.maplebirchOutfitNPC = npc;
      try {
        if (named.includes(npc)) {
          const clothes = !missingSet && npc.clothes ? clone(npc.clothes) : undefined;
          new Wikifier(document.createDocumentFragment(), '<<initNNPCClothes _maplebirchOutfitNPC.nam "reset">>');
          npc.outfits = [...new Set([...(npc.outfits ?? []), ...(outfits ?? [])])];
          if (clothes) npc.clothes = clothes;
        } else {
          if (missingSet) {
            npc.outfits = undefined;
            new Wikifier(document.createDocumentFragment(), '<<generateNPCClothes _maplebirchOutfitNPC>>');
          }
          npc.outfits = outfits?.length ? outfits : undefined;
        }
      } finally {
        if (previous === undefined) delete temporary.maplebirchOutfitNPC;
        else temporary.maplebirchOutfitNPC = previous;
      }
    }
  }

  private create(config: OutfitSetConfig): OutfitSet | undefined {
    if (!config?.name) return;
    const upper = typeof config.upper === 'string' ? { name: config.upper } : config.upper;
    const lower = typeof config.lower === 'string' ? { name: config.lower } : config.lower;
    if (!upper?.name || !lower?.name) {
      this.manager.log('衣物配置缺少 name 属性', 'ERROR');
      return;
    }
    return {
      name: config.name,
      type: config.type ?? 'custom',
      gender: config.gender ?? 'n',
      outfit: config.outfit ?? 0,
      clothes: {
        upper: this.createPart(upper, 'a', 'lift'),
        lower: this.createPart(lower, 'n', 'pull')
      },
      desc: config.desc ?? lanSwitch(`${upper.name} and ${lower.name}`, `${upper.name}和${lower.name}`)
    };
  }

  private createPart(config: OutfitPartConfig, word: string, action: string): Required<OutfitPartConfig> {
    return {
      name: config.name,
      integrity_max: config.integrity_max ?? 100,
      word: config.word ?? word,
      action: config.action ?? action,
      desc: config.desc ?? config.name
    };
  }
}

export default NPCOutfitSets;
