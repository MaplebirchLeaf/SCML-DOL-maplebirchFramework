// ./src/modules/NamedNPCAddon/NPCClothes.ts

import type { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';
import maplebirch from '../../core';
import { convert } from '../../utils';
import type NPCManager from '../NamedNPC';
import builtinWardrobe from '@/assets/npc-clothes.yaml';

type Condition = boolean | string | (() => boolean) | Condition[];

export interface OutfitSetConfig {
  name: string;
  type?: string;
  gender?: string;
  outfit?: number;
  upper: string | OutfitPartConfig;
  lower: string | OutfitPartConfig;
  desc?: string;
}

export type ClothesConfig = OutfitSetConfig;

interface OutfitPartConfig {
  name: string;
  integrity_max?: number;
  word?: string;
  action?: string;
  readonly desc?: string;
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

interface ArtLayer {
  cond?: Condition;
  zIndex?: number | string;
  img: string;
}

type ArtPart = 'head' | 'face' | 'neck' | 'upper' | 'lower' | 'legs' | 'feet' | 'hands';

interface ArtConfig {
  key: string;
  name: string;
  body: string;
  head?: ArtLayer[];
  face?: ArtLayer[];
  neck?: ArtLayer[];
  upper?: ArtLayer[];
  lower?: ArtLayer[];
  legs?: ArtLayer[];
  feet?: ArtLayer[];
  hands?: ArtLayer[];
  [key: string]: any;
}

interface WardrobeItem {
  [key: string]: any;
}

interface WearRule {
  key: string;
  cond?: Condition;
}

const artParts: ArtPart[] = ['head', 'face', 'neck', 'upper', 'lower', 'legs', 'feet', 'hands'];

function evaluate(cond?: Condition): boolean {
  if (cond == null) return true;
  if (Array.isArray(cond)) return cond.every(evaluate);
  if (typeof cond === 'boolean') return cond;
  if (typeof cond === 'function') {
    try {
      return cond();
    } catch (e: any) {
      maplebirch.npc.log(`条件函数执行失败: ${e.message}`, 'WARN');
      return false;
    }
  }
  if (typeof cond === 'string') {
    try {
      return new Function(`return (${cond})`)();
    } catch {
      maplebirch.npc.log(`条件求值失败: ${cond}`, 'WARN');
      return false;
    }
  }
  return false;
}

class NPCOutfitSets {
  private sets: OutfitSet[] = [];

  public add(...configs: OutfitSetConfig[]) {
    const clothesList = configs.filter(Boolean);
    if (!clothesList.length) return;

    clothesList.forEach(config => {
      const { name, type = 'custom', gender = 'n', outfit = 0, upper, lower, desc } = config;
      if (!name) return;
      const upperConfig = typeof upper === 'string' ? { name: upper } : upper;
      const lowerConfig = typeof lower === 'string' ? { name: lower } : lower;

      if (!upperConfig?.name || !lowerConfig?.name) {
        maplebirch.npc.log('衣物配置缺少 name 属性', 'ERROR');
        return;
      }

      const createPart = (part: OutfitPartConfig, word: string, action: string): Required<OutfitPartConfig> => ({
        name: part.name,
        integrity_max: part.integrity_max ?? 100,
        word: part.word ?? word,
        action: part.action ?? action,
        desc: part.desc ?? part.name
      });

      this.sets.push({
        name,
        type,
        gender,
        outfit,
        clothes: {
          upper: createPart(upperConfig, 'a', 'lift'),
          lower: createPart(lowerConfig, 'n', 'pull')
        },
        desc: desc ?? lanSwitch(`${upperConfig.name} and ${lowerConfig.name}`, `${upperConfig.name}和${lowerConfig.name}`)
      });
    });

    this.merge();
  }

  private merge() {
    setup.npcClothesSets ??= [];
    this.sets.forEach(set => {
      if (setup.npcClothesSets.some((item: OutfitSet) => item.name === set.name)) {
        maplebirch.npc.log(`服装套装 ${set.name} 已存在，跳过添加`, 'WARN');
        return;
      }
      setup.npcClothesSets.push(set);
    });
    this.sets.length = 0;
  }

  // prettier-ignore
  public init() {
    try {
      this.add(
        {
          name: 'neutralDefault', type: 'default', gender: 'n', outfit: 0,
          upper: { name: 'shirt', word: 'a', action: 'lift', get desc() { return lanSwitch('shirt', '衬衫'); } },
          lower: { name: 'cargo trousers', word: 'n', action: 'pull', get desc() { return lanSwitch('cargo trousers', '工装裤'); } },
          get desc() { return lanSwitch('Shirt and cargo trousers', '衬衫和工装裤'); }
        },
        {
          name: 'hermDefault', type: 'default', gender: 'h', outfit: 0,
          upper: { name: 'shirt', word: 'a', action: 'lift', get desc() { return lanSwitch('shirt', '衬衫'); } },
          lower: { name: 'miniskirt', word: 'a', action: 'lift', get desc() { return lanSwitch('miniskirt', '迷你裙'); } },
          get desc() { return lanSwitch('Shirt and miniskirt', '衬衫和迷你裙'); }
        }
      );
    } catch (e: any) {
      maplebirch.npc.log(`NPCOutfitSets 初始化失败: ${e.message}`, 'ERROR');
    }
  }

  public get data() {
    setup.npcClothesSets ??= [];
    return setup.npcClothesSets;
  }
}

class NPCSidebarArt {
  private configs: ArtConfig[] = [];

  public async import(modName: string, modZip: ModZipReader, filePaths: string | string[]) {
    if (!modZip) {
      maplebirch.npc.log('无效的模组压缩包', 'ERROR');
      return [];
    }

    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    const imagePaths: string[] = [];

    for (const filePath of paths) {
      const file = modZip.zip.file(filePath);
      if (!file) continue;

      let data: any;

      try {
        const content = await file.async('string');
        if (filePath.endsWith('.json')) {
          data = JSON.parse(content);
        } else if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
          data = maplebirch.yaml.load(content);
        } else {
          maplebirch.npc.log(`不支持的文件格式: ${filePath}`, 'WARN');
          continue;
        }
      } catch (e: any) {
        maplebirch.npc.log(`读取侧边栏人模配置失败: ${filePath} - ${e.message}`, 'ERROR');
        continue;
      }

      const fileName = filePath.split('/').pop()?.split('.')[0] || 'unknown';
      const dataArray = Array.isArray(data) ? data : [data];

      dataArray.forEach((item: any, index: number) => {
        if (!item?.name) return;

        const npcName = convert(item.name, 'title');
        const key = dataArray.length > 1 ? `${modName}_${fileName}_${index}` : fileName;

        if (item.body) imagePaths.push(item.body);

        artParts.forEach(part => {
          const layers = Array.isArray(item[part]) ? item[part] : [];
          layers.forEach((layer: ArtLayer) => {
            if (layer?.img) imagePaths.push(layer.img);
          });
        });

        const config: ArtConfig = {
          key,
          name: npcName,
          body: item.body ?? ''
        };

        artParts.forEach(part => (config[part] = Array.isArray(item[part]) ? item[part] : []));
        this.configs.push(config);

        if (maplebirch.npc.Sidebar.display) {
          const displaySet = maplebirch.npc.Sidebar.display.get(npcName) ?? new Set();
          displaySet.add(key);
          maplebirch.npc.Sidebar.display.set(npcName, displaySet);
        }
      });
    }

    return imagePaths;
  }

  public get layers() {
    const result = new Map<string, any>();

    this.configs.forEach(config => {
      const layers: any = {
        key: config.key,
        body: config.body
      };

      artParts.forEach(part => {
        const layer = config[part]?.find((item: ArtLayer) => evaluate(item.cond));
        if (layer) {
          layers[part] = {
            zIndex: layer.zIndex ?? 'auto',
            img: layer.img
          };
        }
      });

      result.set(config.name, layers);
    });

    return result;
  }
}

class NPCSidebarWardrobeProfile {
  public constructor(
    public name: string,
    public outfits: string[] = ['naked'],
    private location: Record<string, WearRule[]> = {},
    private global: WearRule[] = []
  ) {}

  public wear(location: string, key: string, cond?: Condition) {
    if (!NPCSidebarWardrobe.wardrobe[key]) {
      maplebirch.npc.log(`侧边栏服装配置 ${key} 不存在`, 'WARN');
      return this;
    }
    const list = location === '*' ? this.global : (this.location[location] ??= []);
    list.push({ key, cond });
    if (!this.outfits.includes(key)) this.outfits.push(key);
    return this;
  }

  public get worn(): WardrobeItem {
    const loc = maplebirch.npc.Schedule.location[this.name];
    const find = (list?: WearRule[]) => list?.find(item => evaluate(item.cond))?.key;
    const key = find(this.location[loc]) ?? find(this.global) ?? 'naked';
    return NPCSidebarWardrobe.mergeWithNaked(NPCSidebarWardrobe.wardrobe[key]);
  }
}

class NPCSidebarWardrobe {
  public static wardrobe: Record<string, WardrobeItem> = {};
  public static profiles: Record<string, NPCSidebarWardrobeProfile> = {};

  public static async load(modName: string, filePath: string) {
    try {
      const modZip = maplebirch.modUtils.getModZip(modName);
      if (!modZip) throw new Error(`未找到模组: ${modName}`);
      if (typeof filePath !== 'string') throw new Error('路径格式错误');
      const file = modZip.zip.file(filePath);
      if (!file) throw new Error(`未找到文件: ${filePath}`);
      const content = await file.async('string');
      let data: any;
      if (filePath.endsWith('.json')) {
        data = JSON.parse(content);
      } else if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
        data = maplebirch.yaml.load(content);
      } else {
        throw new Error(`不支持的文件格式: ${filePath}`);
      }
      if (!data || typeof data !== 'object') throw new Error('无法解析配置文件');
      Object.assign(this.wardrobe, data);
    } catch (e: any) {
      maplebirch.npc.log(`加载侧边栏衣柜配置失败: ${e.message}`, 'ERROR');
    }
  }

  public static mergeWithNaked(selected: WardrobeItem = {}) {
    const base = this.wardrobe.naked ?? {};
    const result: WardrobeItem = { ...base };
    Object.keys(selected).forEach(part => (result[part] = selected[part] ?? base[part]));
    return result;
  }

  public static async init(manager: NPCManager) {
    try {
      const data = maplebirch.yaml.load(builtinWardrobe);
      if (!data || typeof data !== 'object') throw new Error('无法解析内置衣柜配置');
      Object.assign(this.wardrobe, data);
      manager.NPCNameList.forEach(name => (this.profiles[name] ??= new NPCSidebarWardrobeProfile(name)));
    } catch (e: any) {
      maplebirch.npc.log(`NPCSidebarWardrobe 初始化失败: ${e.message}`, 'ERROR');
    }
  }

  public static wear(npcName: string, location: string, key: string, cond?: Condition) {
    const profile = (this.profiles[npcName] ??= new NPCSidebarWardrobeProfile(npcName, ['naked', key]));
    return profile.wear(location, key, cond);
  }

  public static worn(npcName: string) {
    const profile = this.profiles[npcName];
    if (!profile) {
      maplebirch.npc.log(`没有对应 NPC 侧边栏衣柜数据: ${npcName}`, 'WARN');
      return NPCSidebarWardrobe.mergeWithNaked();
    }
    return profile.worn;
  }
}

const NPCClothes = ((core: typeof maplebirch) => {
  const outfitSets = new NPCOutfitSets();
  const sidebarArt = new NPCSidebarArt();

  async function init(manager: NPCManager) {
    try {
      await NPCSidebarWardrobe.init(manager);
      outfitSets.init();
    } catch (e: any) {
      core.npc.log(`NPC服装初始化失败: ${e.message}`, 'ERROR');
    }
  }

  // prettier-ignore
  return {
    init,

    addOutfitSet : (...configs: OutfitSetConfig[]) => outfitSets.add(...configs),
    importArt    : (modName: string, modZip: ModZipReader, filePaths: string | string[]) => sidebarArt.import(modName, modZip, filePaths),
    loadWardrobe : (modName: string, filePath: string) => NPCSidebarWardrobe.load(modName, filePath),
    wear         : (npcName: string, location: string, key: string, cond?: Condition) => NPCSidebarWardrobe.wear(npcName, location, key, cond),
    worn         : (npcName: string) => NPCSidebarWardrobe.worn(npcName),

    get outfitSets() { return outfitSets.data; },
    get art() { return sidebarArt.layers; },
    get wardrobe() { return NPCSidebarWardrobe.wardrobe; },
    get profiles() { return NPCSidebarWardrobe.profiles; }
  };
})(maplebirch);

export default NPCClothes;
