// ./src/modules/NamedNPCAddon/NPCClothes.ts

import { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';
import maplebirch from '../../core';
import { convert } from '../../utils';
import NPCManager from '../NamedNPC';

export interface ClothesConfig {
  name: string;
  type?: string;
  gender?: string;
  outfit?: number;
  upper: string | UpperConfig;
  lower: string | LowerConfig;
  desc?: string;
}

interface UpperConfig {
  name: string;
  integrity_max?: number;
  word?: string;
  action?: string;
  readonly desc?: string;
}

interface LowerConfig {
  name: string;
  integrity_max?: number;
  word?: string;
  action?: string;
  readonly desc?: string;
}

interface ClothingSet {
  name: string;
  type: string;
  gender: string;
  outfit: number;
  clothes: { upper: UpperConfig; lower: LowerConfig };
  desc: string;
}

interface Layer {
  cond?: any;
  zIndex?: number | string;
  img: string;
}

interface ConfigData {
  key: string;
  name: string;
  body: string;
  head?: Layer[];
  face?: Layer[];
  neck?: Layer[];
  upper?: Layer[];
  lower?: Layer[];
  legs?: Layer[];
  feet?: Layer[];
  hands?: Layer[];
}

interface WardrobeItem {
  [key: string]: any;
}

interface RegisterItem {
  key: string;
  cond?: any;
}

// prettier-ignore
const evaluate = function(cond: any): boolean {
  return Array.isArray(cond) ? cond.every(evaluate) :
  typeof cond === 'boolean' ? cond :
  typeof cond === 'string' ? (() => {
    try { return new Function(`return ${cond}`)(); }
    catch { maplebirch.npc.log(`条件求值失败: ${cond}`, 'WARN'); return false; }
  })() :
  typeof cond === 'function' ? (() => {
    try { return cond(); }
    catch (e: any) { maplebirch.npc.log(`条件函数执行失败: ${e.message}`, 'WARN'); return false; }
  })() : false;
}

class VanillaClothes {
  private npcClothesSets: ClothingSet[] = [];

  add(...configs: ClothesConfig[]) {
    const clothesList = (Array.isArray(configs[0]) ? configs[0] : configs).filter(Boolean);
    if (!clothesList.length) return;

    clothesList.forEach(config => {
      const { name, type = 'custom', gender = 'n', outfit = 0, upper, lower, desc } = config;
      if (!name) return;
      const toConfig = (cfg: string | UpperConfig | LowerConfig) => (typeof cfg === 'string' ? { name: cfg } : cfg);
      const upperCfg = toConfig(upper) as UpperConfig;
      const lowerCfg = toConfig(lower) as LowerConfig;

      if (!upperCfg.name || !lowerCfg.name) {
        maplebirch.npc.log('衣物配置缺少name属性', 'ERROR');
        return;
      }

      // prettier-ignore
      const createPart = (cfg: UpperConfig | LowerConfig, defWord: string) => ({
        name         : cfg.name,
        integrity_max: cfg.integrity_max ?? 100,
        word         : cfg.word ?? defWord,
        action       : cfg.action ?? 'lift',
        desc         : cfg.desc ?? cfg.name
      });

      this.npcClothesSets.push({
        name,
        type,
        gender,
        outfit,
        clothes: {
          upper: createPart(upperCfg, 'a'),
          lower: createPart(lowerCfg, 'n')
        },
        desc: desc ?? `${upperCfg.name}和${lowerCfg.name}`
      });
    });

    this.merge();
  }

  private merge() {
    setup.npcClothesSets ??= [];
    this.npcClothesSets.forEach(set => {
      if (setup.npcClothesSets.some((s: ClothingSet) => s.name === set.name)) {
        maplebirch.npc.log(`服装套装 ${set.name} 已存在，跳过添加`, 'WARN');
        return;
      }
      setup.npcClothesSets.push(set);
    });
    this.npcClothesSets.length = 0;
  }

  // prettier-ignore
  init() {
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
      maplebirch.npc.log(`VanillaClothes 初始化失败: ${e.message}`, 'ERROR');
    }
  }
}

class NPCSidebarData {
  private configs: ConfigData[] = [];

  async import(modName: string, modZip: ModZipReader, filePaths: string | string[]) {
    if (!modZip) {
      maplebirch.npc.log('无效的模组压缩包', 'ERROR');
      return [];
    }

    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    const imagePaths: string[] = [];
    const parts = ['head', 'face', 'neck', 'upper', 'lower', 'legs', 'feet', 'hands'];

    for (const filePath of paths) {
      const file = modZip.zip.file(filePath);
      if (!file) continue;

      const content = await file.async('string');
      let data: any;

      if (filePath.endsWith('.json')) data = JSON.parse(content);
      else if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) data = maplebirch.yaml.load(content);
      else {
        maplebirch.npc.log(`不支持的文件格式: ${filePath}`, 'WARN');
        continue;
      }

      const fileName = filePath.split('/').pop()?.split('.')[0] || 'unknown';
      const dataArray = Array.isArray(data) ? data : [data];

      dataArray.forEach((item: any, _i: number) => {
        if (!item.name) return;

        const npcName = convert(item.name, 'capitalize');
        if (item.body) imagePaths.push(item.body);

        parts.forEach(part => item[part]?.forEach((layer: Layer) => layer?.img && imagePaths.push(layer.img)));

        const key = dataArray.length > 1 ? `${modName}_${fileName}` : fileName;
        this.configs.push({
          key,
          name: npcName,
          body: item.body ?? '',
          ...parts.reduce((acc, p) => ({ ...acc, [p]: item[p] ?? [] }), {})
        });

        if (maplebirch.npc.Sidebar.display) {
          const displaySet = maplebirch.npc.Sidebar.display.get(npcName) ?? new Set();
          displaySet.add(key);
          maplebirch.npc.Sidebar.display.set(npcName, displaySet);
        }
      });
    }
    return imagePaths;
  }

  get layers() {
    const clothesMap = new Map();
    const parts = ['head', 'face', 'neck', 'upper', 'lower', 'legs', 'feet', 'hands'];

    this.configs.forEach(config => {
      const result: any = { key: config.key, body: config.body };

      parts.forEach(part => {
        const layer = config[part]?.find((l: Layer) => !l.cond || evaluate(l.cond));
        if (layer) result[part] = { zIndex: layer.zIndex || 'auto', img: layer.img };
      });

      clothesMap.set(config.name, result);
    });

    return clothesMap;
  }
}

class WardrobeClothing {
  constructor(
    public name: string,
    public outfits: string[] = ['naked'],
    private location: Record<string, RegisterItem[]> = {},
    private global: RegisterItem[] = []
  ) {}

  register(location: string, key: string, cond?: any) {
    if (!NPCWardrobe.wardrobe[key]) {
      maplebirch.npc.log(`服装配置 ${key} 不存在`, 'WARN');
      return;
    }

    const list = location === '*' ? this.global : (this.location[location] ??= []);
    list.push({ key, cond });
    if (!this.outfits.includes(key)) this.outfits.push(key);
  }

  get worn(): WardrobeItem {
    const loc = maplebirch.npc.Schedule.location[this.name];
    const find = (list: RegisterItem[]) => list.find(i => evaluate(i.cond))?.key;

    return NPCWardrobe.mergeWithNaked(NPCWardrobe.wardrobe[find(this.location[loc] || []) ?? find(this.global) ?? 'naked']);
  }
}

class NPCWardrobe {
  static wardrobe: Record<string, WardrobeItem> = {};
  static clothes: Record<string, WardrobeClothing> = {};

  static async load(modName = 'maplebirch', filePath = 'npc-clothes.yaml') {
    try {
      const modZip = maplebirch.modUtils.getModZip(modName);
      if (!modZip) throw new Error('未找到maplebirch模组');
      if (typeof filePath !== 'string') throw new Error('路径格式错误');

      const file = modZip.zip.file(filePath);
      if (!file) throw new Error(`未找到文件: ${filePath}`);

      const content = await file.async('text');
      const data = filePath.endsWith('.json') ? JSON.parse(content) : filePath.endsWith('.yml') || filePath.endsWith('.yaml') ? maplebirch.yaml.load(content) : null;

      if (!data) throw new Error('无法解析配置文件');
      Object.assign(this.wardrobe, data);
    } catch (e: any) {
      maplebirch.npc.log(`加载服装配置失败: ${e.message}`, 'ERROR');
    }
  }

  static mergeWithNaked(selected: WardrobeItem = {}) {
    const base = this.wardrobe['naked'] || {};
    return [...new Set([...Object.keys(base), ...Object.keys(selected)])].reduce((res, part) => ({ ...res, [part]: selected[part] ?? base[part] }), {});
  }

  static async init(manager: NPCManager) {
    try {
      await this.load();
      manager.NPCNameList.forEach(name => (this.clothes[name] ??= new WardrobeClothing(name, ['naked'])));
    } catch (e: any) {
      maplebirch.npc.log(`NPCWardrobe 初始化失败: ${e.message}`, 'ERROR');
    }
  }

  static register(npcName: string, location: string, key: string, cond?: any) {
    const cloth = (this.clothes[npcName] ??= new WardrobeClothing(npcName, ['naked', key]));
    if (!cloth.outfits.includes(key)) cloth.outfits.push(key);
    cloth.register(location, key, cond);
    return cloth;
  }

  static worn(npcName: string) {
    const cloth = this.clothes[npcName];
    if (!cloth) {
      maplebirch.npc.log(`没有对应NPC:${npcName}数据`, 'WARN');
      return;
    }
    return cloth.worn;
  }
}

const NPCClothes = ((core: typeof maplebirch) => {
  const vc = new VanillaClothes();
  const sd = new NPCSidebarData();

  const init = async (manager: NPCManager) => {
    try {
      await Promise.all([NPCWardrobe.init(manager), vc.init()]);
    } catch (e: any) {
      core.npc.log(`NPC服装初始化失败: ${e.message}`, 'ERROR');
    }
  };

  // prettier-ignore
  return {
    add: (...c: ClothesConfig[]) => vc.add(...c),
    init,
    import: (m: string, z: any, p: string | string[]) => sd.import(m, z, p),
    load: (m?: string, f?: string) => NPCWardrobe.load(m, f),
    register: (n: string, l: string, k: string, c?: any) => NPCWardrobe.register(n, l, k, c),
    worn: (n: string) => NPCWardrobe.worn(n),
    get layers() { return sd.layers; },
    get wardrobe() { return NPCWardrobe.wardrobe; },
    get clothes() { return NPCWardrobe.clothes; }
  };
})(maplebirch);

export default NPCClothes;
