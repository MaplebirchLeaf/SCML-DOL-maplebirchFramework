// ./src/modules/NamedNPC.ts

import maplebirch, { MaplebirchCore, createlog } from '../core';
import type { Translation } from '../services/LanguageManager';
import NPCSchedules, { ScheduleConfig, ScheduleBuilder } from './NamedNPCAddon/NPCSchedules';
import NPCClothes, { ClothesConfig } from './NamedNPCAddon/NPCClothes';
import NPCSidebar from './NamedNPCAddon/NPCSidebar';
import NPCPregnancy, { type PregnancyAddConfig, type PregnancyGenerator } from './NamedNPCAddon/NPCPregnancy';
import NPCFluids from './NamedNPCAddon/NPCFluids';
import NPCTransformation from './NamedNPCAddon/NPCTransformation';
import { setupNpcData, isPossible } from './NamedNPCAddon/NPCUtils';

type LanguageCode = 'CN' | 'EN';
type PronounCode = 'm' | 'f' | 'i' | 'n' | 't';
type TranslationInput = Map<string, Translation> | Record<string, Translation>;

const vanillaList = new Set(
  'Avery|Bailey|Briar|Charlie|Darryl|Doren|Eden|Gwylan|Harper|Jordan|Kylar|Landry|Leighton|Mason|Morgan|River|Robin|Sam|Sirris|Whitney|Winter|Black Wolf|Niki|Quinn|Remy|Alex|Great Hawk|Wren|Sydney|Ivory Wraith|Zephyr'.split(
    '|'
  )
);

export interface NPCData {
  nam: string;
  gender?: 'm' | 'f' | 'h' | 'n' | 'none';
  pronoun?: PronounCode;
  title?: string;
  description?: string;
  type?: string;
  adult?: number;
  teen?: number;
  age?: number;
  insecurity?: string;
  chastity?: { penis: string; vagina: string; anus: string };
  virginity?: Record<string, boolean>;
  hair_side_type?: string;
  hair_fringe_type?: string;
  hair_position?: string;
  hairlength?: number;
  eyeColour?: string;
  hairColour?: string;
  bottomsize?: number;
  skincolour?: number;
  init?: number;
  intro?: number;
  penis?: string;
  penissize?: number;
  penisdesc?: string;
  vagina?: string;
  breastsize?: number;
  breastdesc?: string;
  ballssize?: number;
  outfits?: string[];
  pregnancy?: any;
  pregnancyAvoidance?: number;
  [key: string]: any;
}

export interface NPCConfig {
  love?: { maxValue: number };
  loveAlias?: [string, string] | (() => string | [string, string]);
  important?: boolean | (() => boolean);
  special?: boolean | (() => boolean);
  loveInterest?: boolean | (() => boolean);
  romance?: (() => boolean)[];
  [key: string]: any;
}

export const NamedNPC = (core => {
  const insecurity = ['weak', 'looks', 'ethics', 'skill'] as const;
  const eyeColour = ['purple', 'dark blue', 'light blue', 'amber', 'hazel', 'green', 'red', 'pink', 'grey', 'light grey', 'lime green'] as const;
  const hairColour = ['red', 'black', 'brown', 'lightbrown', 'blond', 'platinumblond', 'strawberryblond', 'ginger'] as const;

  // prettier-ignore
  const virginityTypes = {
    anal       : true,
    oral       : true,
    penile     : true,
    vaginal    : true,
    handholding: true,
    temple     : false,
    kiss       : true
  } as const;

  // prettier-ignore
  const pronounsMap = {
    m: {
      CN: { he: '他', his: '他的', hers: '他的', him: '他', himself: '他自己', man: '男人', boy: '男孩', men: '男人们' },
      EN: { he: 'he', his: 'his', hers: 'his', him: 'him', himself: 'himself', man: 'man', boy: 'boy', men: 'men' }
    },
    f: {
      CN: { he: '她', his: '她的', hers: '她的', him: '她', himself: '她自己', man: '女人', boy: '女孩', men: '女人们' },
      EN: { he: 'she', his: 'her', hers: 'hers', him: 'her', himself: 'herself', man: 'woman', boy: 'girl', men: 'women' }
    },
    i: {
      CN: { he: '它', his: '它的', hers: '它的', him: '它', himself: '它自己', man: '那个东西', boy: '小家伙', men: '它们' },
      EN: { he: 'it', his: 'its', hers: 'its', him: 'it', himself: 'itself', man: 'thing', boy: 'little one', men: 'them' }
    },
    n: {
      CN: { he: '他', his: '他的', hers: '他的', him: '他', himself: '他自己', man: '人', boy: '孩子', men: '人们' },
      EN: { he: 'they', his: 'their', hers: 'theirs', him: 'them', himself: 'themself', man: 'person', boy: 'kid', men: 'people' }
    },
    t: {
      CN: { he: '他们', his: '他们的', hers: '他们的', him: '他们', himself: '他们自己', man: '人', boy: '孩子们', men: '大家' },
      EN: { he: 'they', his: 'their', hers: 'theirs', him: 'them', himself: 'themselves', man: 'people', boy: 'kids', men: 'everyone' }
    }
  } as const;

  // prettier-ignore
  const bodyPartMap = {
    penis: {
      CN: [['细小阴茎','废物阴茎','可怜阴茎','小小阴茎','迷你阴茎','微型阴茎'],'阴茎',['厚重肉棒','笨重肉棒','大号肉棒','粗大肉棒','狰狞肉棒','肥厚肉棒'],['硕大肉棒','庞大肉棒','巨大肉棒','极大肉棒','超大肉棒','宏伟肉棒']],
      EN: [['tiny penis','pathetic cock','little penis','small penis','mini penis','micro penis'],'penis',['thick cock','hefty cock','big cock','large cock','veiny cock','meaty cock'],['massive cock','huge cock','humongous cock','immense cock','gigantic cock','enormous cock']]
    },
    breast: {
      CN: ['乳头', '微隆的', '小巧的', '偏小的', '坚挺的', '适中的', '饱满的', '硕大的', '丰腴的', '高耸的', '巨大的', '庞大的', '宏伟的'],
      EN: ['nipple', 'budding', 'tiny', 'small', 'pert', 'modest', 'full', 'large', 'ample', 'massive', 'huge', 'gigantic', 'enormous']
    },
    bottom: {
      CN: ['纤巧的', '苗条的', '适中的', '软弹的', '柔软的', '圆润的', '丰满的', '硕大的', '巨大的'],
      EN: ['slender', 'slim', 'modest', 'cushioned', 'soft', 'round', 'plump', 'large', 'huge']
    },
    balls: {
      CN: [['未发育的', '极小的'], ['小巧的', '玲珑的'], '', ['饱满的', '有弹性的'], ['硕大的', '沉重的', '肥硕的'], ['巨大的', '夸张的', '宏伟的']],
      EN: [['undeveloped', 'tiny'], ['dainty', 'compact'], '', ['full', 'resilient'], ['large', 'heavy', 'massive'], ['huge', 'exaggerated', 'enormous']]
    }
  } as const;

  class NamedNPC {
    public nam: string;
    public gender: 'm' | 'f' | 'h' | 'n' | 'none';
    public title: string;
    public description: string;
    public type: string;
    public adult: number;
    public teen: number;
    public age: number;
    public insecurity: string;
    public chastity: { penis: string; vagina: string; anus: string };
    public virginity: Record<string, boolean>;
    public hair_side_type: string;
    public hair_fringe_type: string;
    public hair_position: string;
    public hairlength: number;
    public eyeColour: string;
    public hairColour: string;
    public pronoun: PronounCode;
    public pronouns: Record<string, string> = {};
    public bottomsize: number;
    public skincolour: number;
    public init: number;
    public intro: number;
    public penis!: string;
    public penissize!: number;
    public penisdesc!: string;
    public vagina!: string;
    public breastsize!: number;
    public breastdesc!: string;
    public breastsdesc!: string;
    public bottomdesc!: string;
    public ballsdesc!: string;
    public ballssize!: number;
    public outfits!: string[];
    public pregnancy: any;
    public pregnancyAvoidance?: number;
    public descCache: Record<string, any> = {};

    public constructor(manager: NPCManager, data: NPCData) {
      if (!data.nam) manager.log('NamedNPC必须存在nam', 'ERROR');
      this.nam = data.nam;
      this.gender = data.gender ?? ((['m', 'f', 'h', 'n'] as const).either([0.47, 0.47, 0.05, 0.01]) as 'm' | 'f' | 'h' | 'n');
      this.title = data.title ?? 'none';
      this.description = data.description ?? this.nam;
      this.type = data.type ?? 'human';
      this.adult = data.adult ?? 0;
      this.teen = data.teen ?? 0;
      this.age = data.age ?? 0;
      if (!this.adult && !this.teen) {
        this.adult = Math.random(1);
        this.teen = this.adult ? 0 : 1;
      }
      this.insecurity = data.insecurity ?? ([...insecurity].either() as string);
      this.chastity = typeof data.chastity === 'object' ? data.chastity : { penis: '', vagina: '', anus: '' };
      this.virginity = typeof data.virginity === 'object' ? data.virginity : { ...virginityTypes };
      this.hair_side_type = data.hair_side_type ?? 'default';
      this.hair_fringe_type = data.hair_fringe_type ?? 'default';
      this.hair_position = data.hair_position ?? 'back';
      this.hairlength = data.hairlength ?? ([0, 200, 400, 600, 800, 1000].either() as number);
      this.eyeColour = data.eyeColour ?? ([...eyeColour].either() as string);
      this.hairColour = data.hairColour ?? ([...hairColour].either() as string);
      this.pronoun = data.pronoun ?? (['m', 'f', 'i', 'n', 't'].includes(this.gender) ? (this.gender as PronounCode) : (['m', 'f'].either() as PronounCode));
      if (this.gender !== 'none') this.setPronouns();
      this.setBodyTraits(data);
      this.bottomsize = data.bottomsize ?? Math.random(4);
      this.bodyPartdescription();
      this.pregnancy = data.pregnancy ?? null;
      this.pregnancyAvoidance = data.pregnancyAvoidance;
      manager.Pregnancy.definePregnancyProperty(this);
      this.skincolour = data.skincolour ?? 0;
      this.init = data.init ?? 0;
      this.intro = data.intro ?? 0;
    }

    public setPronouns() {
      const lang: LanguageCode = maplebirch.Language === 'CN' ? 'CN' : 'EN';
      const pronoun = (this.pronoun in pronounsMap ? this.pronoun : 'n') as PronounCode;
      const base = pronounsMap[pronoun][lang];
      const useI18N = lang === 'CN' && core.modUtils.getModListNameNoAlias().includes('ModI18N') && vanillaList.has(this.nam) && ['m', 'f'].includes(pronoun);
      this.pronouns = useI18N ? { ...base, his: base.he, hers: base.he } : { ...base };
    }

    public setBodyTraits(data: NPCData) {
      switch (this.gender) {
        case 'm':
          this.penis = data.penis ?? 'clothed';
          this.penissize = data.penissize ?? Math.random(1, 3);
          this.penisdesc = data.penisdesc ?? 'penis';
          this.vagina = data.vagina ?? 'none';
          this.breastsize = data.breastsize ?? 0;
          this.breastdesc = data.breastdesc ?? 'none';
          this.ballssize = data.ballssize ?? Math.random(2, 4);
          break;
        case 'f':
          this.penis = data.penis ?? 'none';
          this.penissize = data.penissize ?? 0;
          this.penisdesc = data.penisdesc ?? 'none';
          this.vagina = data.vagina ?? 'clothed';
          this.breastsize = data.breastsize ?? Math.random(1, 3);
          this.breastdesc = data.breastdesc ?? 'breasts';
          this.ballssize = data.ballssize ?? 0;
          break;
        case 'h':
          this.penis = data.penis ?? 'clothed';
          this.penissize = data.penissize ?? Math.random(1, 3);
          this.penisdesc = data.penisdesc ?? 'penis';
          this.vagina = data.vagina ?? 'clothed';
          this.breastsize = data.breastsize ?? Math.random(1, 3);
          this.breastdesc = data.breastdesc ?? 'breasts';
          this.ballssize = data.ballssize ?? Math.random(2, 4);
          break;
        case 'n':
        default:
          this.penis = data.penis ?? 'none';
          this.penissize = data.penissize ?? 0;
          this.penisdesc = data.penisdesc ?? 'none';
          this.vagina = data.vagina ?? 'none';
          this.breastsize = data.breastsize ?? 0;
          this.breastdesc = data.breastdesc ?? 'none';
          this.ballssize = data.ballssize ?? 0;
          break;
      }
      this.outfits = Array.isArray(data.outfits) ? data.outfits : [];
      let defaultOutfit = 'femaleDefault';
      switch (this.gender) {
        case 'm':
          defaultOutfit = 'maleDefault';
          break;
        case 'f':
          defaultOutfit = 'femaleDefault';
          break;
        case 'h':
          defaultOutfit = 'hermDefault';
          break;
        case 'n':
          defaultOutfit = 'neutralDefault';
          break;
      }
      if (!this.outfits.includes(defaultOutfit)) this.outfits.push(defaultOutfit);
    }

    public bodyPartdescription() {
      const cache = (this.descCache ??= {});
      const lang: LanguageCode = maplebirch.Language === 'CN' ? 'CN' : 'EN';
      const bottomSuffixMap = {
        CN: ['屁股', '臀部', '臀部'],
        EN: [' ass', ' bum', ' butt']
      } as const;
      const ballsSuffixMap = {
        CN: ['睾丸', '睾丸', '蛋蛋'],
        EN: ['testicles', 'balls']
      } as const;
      const pick = (value: unknown): string => (Array.isArray(value) ? (value.either() as string) : ((value ?? '') as string));
      const cached = (key: string, factory: () => string): string => (cache[key] ??= factory());
      const Part = (part: keyof typeof bodyPartMap, index: number): string => pick((bodyPartMap[part][lang] ?? [])[index]);
      const Suffix = (suffixMap: Record<LanguageCode, readonly string[]>): string => pick(suffixMap[lang]);
      const Combined = (key: string, part: keyof typeof bodyPartMap, index: number, suffixMap: Record<LanguageCode, readonly string[]>): string =>
        cached(key, () => {
          const prefix = Part(part, index);
          const suffix = Suffix(suffixMap);
          return prefix ? `${prefix}${suffix}` : suffix;
        });
      if ((this.penis === 'clothed' && this.penissize > 0) || this.penisdesc === 'penis') {
        const sizeIndex = this.penissize - 1;
        this.penisdesc = cached(`penis_${lang}_${this.penissize}`, () => Part('penis', sizeIndex));
      }
      const breastIndex = (this.vagina === 'clothed' && this.breastsize > 0) || this.breastdesc === 'breasts' ? this.breastsize - 1 : 0;
      this.breastdesc = cached(`breast_${lang}_${breastIndex}`, () => {
        const raw = Part('breast', breastIndex);
        if (lang === 'CN') return breastIndex === 0 ? raw : `${raw}乳房`;
        return breastIndex === 0 ? raw : `${raw} breast`;
      });
      const breastDesc = this.breastdesc;
      this.breastsdesc = cached(`breastsdesc_${lang}_${breastDesc}`, () => (lang === 'CN' ? breastDesc : breastDesc.endsWith('s') ? breastDesc : `${breastDesc}s`));
      if (this.bottomsize != null) this.bottomdesc = Combined(`bottom_${lang}_${this.bottomsize}`, 'bottom', this.bottomsize, bottomSuffixMap);
      if (this.ballssize > 0) {
        const sizeIndex = this.ballssize - 1;
        this.ballsdesc = Combined(`balls_${lang}_${this.ballssize}`, 'balls', sizeIndex, ballsSuffixMap);
      }
    }
  }

  function add(manager: NPCManager, npcData: NPCData, config: NPCConfig = {}, translationsData?: TranslationInput): boolean {
    if (!npcData || !npcData.nam) {
      manager.log('提供的NPC数据无效', 'ERROR');
      return false;
    }
    const npcName = npcData.nam;
    let npcConfig = config.clone();
    if (manager.data.has(npcName)) {
      manager.log(`NPC ${npcName} 已存在于mod数据中`, 'ERROR');
      return false;
    }
    if (!npcConfig || typeof npcConfig !== 'object') npcConfig = {};
    if (Object.keys(npcConfig).length === 0) npcConfig.love = { maxValue: 50 };
    const newNPC = new NamedNPC(manager, npcData);
    for (const statName in manager.customStats) if (Object.prototype.hasOwnProperty.call(manager.customStats, statName) && npcData[statName] === undefined) (newNPC as any)[statName] = 0;
    if (translationsData instanceof Map) {
      for (const [key, value] of translationsData) core.lang.set(key, value);
    } else if (translationsData && typeof translationsData === 'object') {
      for (const key in translationsData) if (Object.prototype.hasOwnProperty.call(translationsData, key)) core.lang.set(key, translationsData[key]);
    }
    manager.data.set(npcName, { Data: newNPC, Config: npcConfig });
    manager.log(`成功注入NPC: ${npcName}`, 'DEBUG');
    return true;
  }

  function updateNPCNameList(manager: NPCManager) {
    if (!Array.isArray(setup.NPCNameList)) setup.NPCNameList = [];
    const modNPCNames = Array.from(manager.data.keys());
    setup.NPCNameList = [...new Set([...setup.NPCNameList, ...modNPCNames].filter((name): name is string => typeof name === 'string' && name.trim() !== '').map(name => name.trim()))];
    const savedNPCNames = Array.isArray(V.NPCName)
      ? V.NPCName.map((npc: { nam?: string }) => npc?.nam)
          .filter((name): name is string => typeof name === 'string' && name.trim() !== '')
          .map(name => name.trim())
      : [];
    manager.NPCNameList = [...new Set([...setup.NPCNameList, ...savedNPCNames])];
    V.NPCNameList = [...manager.NPCNameList];
    return manager.NPCNameList;
  }

  function clearInvalidNPC(manager: NPCManager) {
    manager.log(`开始解析NPC...`, 'DEBUG', V.NPCName.clone(), setup.NPCNameList.clone());
    if (!Array.isArray(V.NPCName)) {
      V.NPCName = [];
      updateNPCNameList(manager);
      return false;
    }
    const oldLength = V.NPCName.length;
    V.NPCName = V.NPCName.filter((npc: { nam?: string }) => typeof npc?.nam === 'string' && npc.nam.trim() !== '');
    updateNPCNameList(manager);
    if (V.maplebirch?.npc) {
      const validNameSet = new Set(manager.NPCNameList.map(name => name.toLowerCase()));
      Object.keys(V.maplebirch.npc).forEach(npcKey => {
        if (!validNameSet.has(npcKey.toLowerCase())) delete V.maplebirch.npc[npcKey];
      });
    }
    const cleanedCount = oldLength - V.NPCName.length;
    if (cleanedCount > 0) manager.log(`清理了 ${cleanedCount} 个无效NPC`, 'DEBUG');
    return cleanedCount > 0;
  }

  function onUpdate(manager: NPCManager) {
    let addedCount = 0;
    let skippedCount = 0;
    if (!Array.isArray(V.NPCName)) V.NPCName = [];
    updateNPCNameList(manager);
    const savedNPCNameSet = new Set(
      V.NPCName.map((npc: { nam?: string }) => npc?.nam)
        .filter((name: string): name is string => typeof name === 'string' && name.trim() !== '')
        .map((name: string) => name.trim())
    );
    for (const [npcName, npcEntry] of manager.data) {
      if (savedNPCNameSet.has(npcName)) {
        skippedCount++;
        continue;
      }
      V.NPCName.push(npcEntry.Data);
      savedNPCNameSet.add(npcName);
      addedCount++;
      manager.log(`注入模组NPC到内部状态: ${npcName}`, 'DEBUG');
    }
    updateNPCNameList(manager);
    updateNPCCProxy(manager);
    setupNameTranslations();
    manager.log(`更新完成: 添加 ${addedCount} 个NPC, 跳过 ${skippedCount} 个重复NPC`, 'DEBUG');
    return true;
  }

  function setupNameTranslations() {
    const npcNameText =
      typeof setup.NPCNameList_cn_name === 'string'
        ? setup.NPCNameList_cn_name
        : 'Avery,艾弗里|Bailey,贝利|Briar,布莱尔|Charlie,查里|Darryl,达里尔|Doren,多伦|Eden,伊甸|Gwylan,格威岚|Harper,哈珀|Jordan,约旦|Kylar,凯拉尔|Landry,兰德里|Leighton,礼顿|Mason,梅森|Morgan,摩根|River,瑞沃|Robin,罗宾|Sam,萨姆|Sirris,西里斯|Whitney,惠特尼|Winter,温特|Black Wolf,黑狼|Niki,尼奇|Quinn,奎恩|Remy,雷米|Alex,艾利克斯|Great Hawk,巨鹰|Wren,伦恩|Sydney,悉尼|Ivory Wraith,象牙怨灵|Zephyr,泽菲尔|Nona,诺娜|Lake couple,湖边情侣|the witch,巫女|Taylor,泰勒|Casey,凯西|Sterling,斯特林|Cass,卡斯';
    npcNameText.split('|').forEach(pair => {
      const [enName, cnName] = pair.split(',').map(name => name?.trim());
      if (enName && cnName) core.lang.set(enName, { EN: enName, CN: cnName });
    });
  }

  function updateNPCdata(manager: NPCManager) {
    if (!Array.isArray(setup.loveInterestNpc)) setup.loveInterestNpc = [];
    if (!setup.loveAlias || typeof setup.loveAlias !== 'object') setup.loveAlias = {};
    for (const [npcName, npcEntry] of manager.data) {
      const config = npcEntry.Config ?? {};
      setupLoveAlias(npcName, config.loveAlias);
      if (typeof config === 'object') {
        const checks = [
          ['important', manager.type.importantNPCs],
          ['special', manager.type.specialNPCs],
          ['loveInterest', manager.type.loveInterestNpcs]
        ] as const;
        checks.forEach(([key, arr]) => {
          const value = typeof config[key] === 'function' ? config[key]() : config[key];
          if (value === true && !arr.includes(npcName)) arr.push(npcName);
        });
        setupRomanceCondition(manager, npcName, config);
      }
    }
    setup.loveInterestNpc = [...new Set([...setup.loveInterestNpc, ...manager.type.loveInterestNpcs])];
  }

  function setupLoveAlias(npcName: string, loveAliasConfig: NPCConfig['loveAlias']) {
    if (typeof loveAliasConfig === 'function') {
      setup.loveAlias[npcName] = () => {
        const alias = loveAliasConfig();
        return Array.isArray(alias) && alias.length >= 2 ? lanSwitch(alias[0], alias[1]) : alias;
      };
    } else if (Array.isArray(loveAliasConfig) && loveAliasConfig.length >= 2) {
      const [enAlias, cnAlias] = loveAliasConfig;
      setup.loveAlias[npcName] = () => lanSwitch(enAlias, cnAlias);
    } else {
      setup.loveAlias[npcName] = () => lanSwitch('Affection', '好感');
    }
  }

  function setupRomanceCondition(manager: NPCManager, npcName: string, config: NPCConfig) {
    if (Array.isArray(config.romance)) {
      manager.romanceConditions[npcName] = config.romance;
    } else if (manager.type.loveInterestNpcs.includes(npcName) && !manager.romanceConditions[npcName]) {
      const npcKey = npcName.toLowerCase().replace(/\s+/g, '');
      manager.romanceConditions[npcName] = [() => (V[npcKey + 'Seen'] ?? []).includes('romance')];
    }
  }

  function updateNPCCProxy(manager: NPCManager) {
    if (!C.npc || typeof C.npc !== 'object') C.npc = {};
    updateNPCNameList(manager);
    for (const name of manager.NPCNameList) {
      if (Object.prototype.hasOwnProperty.call(C.npc, name)) continue;
      Object.defineProperty(C.npc, name, {
        get: () => (Array.isArray(V.NPCName) ? V.NPCName.find((npc: { nam?: string }) => npc?.nam === name) : undefined),
        set: val => {
          if (!Array.isArray(V.NPCName)) V.NPCName = [];
          const index = V.NPCName.findIndex((npc: { nam?: string }) => npc?.nam === name);
          const npc = val && typeof val === 'object' ? val : { nam: name };
          npc.nam ??= name;
          if (index >= 0) V.NPCName[index] = npc;
          else V.NPCName.push(npc);
          updateNPCNameList(manager);
        },
        configurable: true,
        enumerable: true
      });
    }
  }

  function convertNPCs(manager: NPCManager) {
    if (!Array.isArray(V.NPCName)) return;
    V.NPCName.forEach((npc, i) => {
      if (!npc?.nam || npc instanceof NamedNPC) return;
      const newNpc = new NamedNPC(manager, npc);
      Object.keys(npc).forEach(key => {
        if (key !== 'nam' && !Object.prototype.hasOwnProperty.call(newNpc, key)) (newNpc as Record<string, any>)[key] = (npc as Record<string, any>)[key];
      });
      V.NPCName[i] = newNpc;
    });
    updateNPCNameList(manager);
  }

  // prettier-ignore
  Object.defineProperties(NamedNPC, {
    add    : { value: add },
    get    : { value: updateNPCNameList },
    clear  : { value: clearInvalidNPC },
    update : { value: onUpdate },
    setup  : { value: updateNPCdata },
    convert: { value: convertNPCs }
  });

  // prettier-ignore
  return NamedNPC as typeof NamedNPC & {
    add    : typeof add;
    get    : typeof updateNPCNameList;
    clear  : typeof clearInvalidNPC;
    update : typeof onUpdate;
    setup  : typeof updateNPCdata;
    convert: typeof convertNPCs;
  };
})(maplebirch);

class NPCManager {
  public readonly log: ReturnType<typeof createlog>;
  public readonly data: Map<string, any> = new Map();
  public NPCNameList: string[] = [];

  public readonly Pregnancy: NPCPregnancy;
  public readonly transformation: NPCTransformation;

  // prettier-ignore
  public readonly type: { [x: string]: Array<string> } = {
    loveInterestNpcs: [],
    importantNPCs   : [],
    specialNPCs     : []
  };

  public readonly customStats: { [x: string]: any } = {};

  // prettier-ignore
  public readonly romanceConditions: { [key: string]: (() => boolean)[] } = {
    Robin       : [() => V.robinromance === 1],
    Whitney     : [() => V.whitneyromance === 1, () => C.npc.Whitney.state !== 'dungeon'],
    Kylar       : [() => V.kylarenglish >= 1, () => C.npc.Kylar.state !== 'prison'],
    Sydney      : [() => V.sydneyromance === 1],
    Eden        : [() => V.syndromeeden === 1],
    Avery       : [() => V.auriga_artefact, () => C.npc.Avery.state !== 'dismissed'],
    'Black Wolf': [() => V.syndromewolves === 1, () => hasSexStat('deviancy', 3)],
    'Great Hawk': [() => V.syndromebird === 1],
    Alex        : [() => V.farm_stage >= 7, () => V.alex_countdown === undefined],
    Gwylan      : [() => V.gwylanSeen.includes('partners') || V.gwylanSeen.includes('romance')]
  };

  public readonly NamedNPC: typeof NamedNPC = NamedNPC;
  public readonly Schedule: typeof NPCSchedules = NPCSchedules;
  public readonly Clothes: typeof NPCClothes = NPCClothes;
  public readonly Sidebar: typeof NPCSidebar = NPCSidebar;
  public readonly fluids: typeof NPCFluids = NPCFluids;

  public constructor(readonly core: MaplebirchCore) {
    this.log = createlog('npc');
    this.transformation = Object.seal(new NPCTransformation(this));
    this.Pregnancy = new NPCPregnancy(this);
    this.core.on(
      ':language',
      () => {
        if (!Array.isArray(V.NPCName)) return;
        V.NPCName.forEach((npc: any) => {
          if (typeof npc.setPronouns === 'function') npc.setPronouns();
          if (typeof npc.bodyPartdescription === 'function') npc.bodyPartdescription();
        });
      },
      'Named NPC Desc'
    );
  }

  public add(npcData: NPCData, config: NPCConfig = {}, translationsData?: TranslationInput) {
    return this.NamedNPC.add(this, npcData, config, translationsData);
  }

  public addPregnancy(type: string, config?: PregnancyGenerator | PregnancyAddConfig) {
    return this.Pregnancy.add(type, config);
  }

  public addSchedule(npcName: string, config: ScheduleConfig | ScheduleBuilder) {
    return this.Schedule.set(npcName, config);
  }

  public addStats(statsObject: { [x: string]: any }) {
    if (!statsObject || typeof statsObject !== 'object') return;
    for (const statName in statsObject) {
      if (Object.prototype.hasOwnProperty.call(statsObject, statName)) {
        const statConfig = statsObject[statName];
        const clonedConfig = statConfig.clone();
        this.customStats[statName] = this.customStats[statName] ? this.customStats[statName].merge(clonedConfig) : clonedConfig;
      }
    }
  }

  public addClothes(...configs: ClothesConfig[]) {
    return this.Clothes.addOutfitSet(...configs);
  }

  public injectModNPCs() {
    this.NamedNPC.get(this);
    this.NamedNPC.clear(this);
    this.NamedNPC.update(this);
    this.NamedNPC.setup(this);
    this.NamedNPC.convert(this);
  }

  public vanillaNPCConfig(npcConfig: NPCConfig) {
    if (!npcConfig || typeof npcConfig !== 'object') return {};
    const Config = npcConfig.clone();
    for (const [npcName, npcEntry] of this.data) {
      const modConfig = npcEntry.Config;
      if (modConfig && Object.keys(modConfig).length > 0) {
        const configClone = modConfig.clone();
        ['loveAlias', 'loveInterest', 'romance'].forEach(key => delete configClone[key]);
        if (Config[npcName]) {
          Config[npcName] = Config[npcName].merge(configClone);
          this.log(`合并NPC配置: ${npcName}`, 'DEBUG');
        } else {
          Config[npcName] = configClone;
          this.log(`添加新NPC配置: ${npcName}`, 'DEBUG');
        }
      }
    }
    if (Array.isArray(T.importantNpcOrder)) this.type.importantNPCs.forEach(id => T.importantNpcOrder.pushUnique(id));
    if (Array.isArray(T.specialNPCs)) this.type.specialNPCs.forEach(id => T.specialNPCs.pushUnique(id));
    return (T.npcConfig = Config);
  }

  public applyStatDefaults(statDefaults: { [x: string]: any }) {
    if (!statDefaults || typeof statDefaults !== 'object') return statDefaults || {};
    for (const statName in this.customStats) {
      if (Object.prototype.hasOwnProperty.call(this.customStats, statName)) {
        const customConfig = this.customStats[statName].clone();
        const position = customConfig.position;
        delete customConfig.position;
        if (statDefaults[statName]) {
          statDefaults[statName] = statDefaults[statName].merge(customConfig);
        } else {
          statDefaults[statName] = customConfig;
        }
        if (position !== false && !T.importantNpcStats.includes(statName)) {
          let insertPosition: number;
          if (typeof position === 'number') {
            insertPosition = Math.clamp(position, 0, T.importantNpcStats.length);
          } else if (position === 'first') {
            insertPosition = 0;
          } else if (position === 'last') {
            insertPosition = T.importantNpcStats.length;
          } else {
            insertPosition = Math.max(0, T.importantNpcStats.length - 1);
          }
          T.importantNpcStats.splice(insertPosition, 0, statName);
        }
      }
    }
    return statDefaults;
  }

  public vanillaInit(npcName: string) {
    const idx = V.NPCNameList?.indexOf(npcName) ?? -1;
    if (idx < 0 || !V.NPCName?.[idx]) {
      this.log(`初始化NPC自定义属性失败，未找到NPC: ${npcName}`, 'WARN');
      return;
    }
    Object.keys(this.customStats).forEach(stat => (V.NPCName[idx][stat] = 0));
    void this.core.trigger(':npcInit', npcName);
  }

  public vanillaInject(npcName: string, npcno: number) {
    void this.core.trigger(':npcInject', npcName, npcno);
  }

  public preInit() {
    this.Sidebar.init(this);
  }

  public async Init() {
    if (!['Start', 'Downgrade Waiting Room'].includes(this.core.passage?.title)) this.injectModNPCs();
    this.Schedule.init(this);
    await this.Clothes.init(this);
    setupNpcData(this, 'init');
    this.Pregnancy.savedPregnancy();
    isPossibleLoveInterest = (name: string) => isPossible(this, name);
  }

  public loadInit() {
    this.injectModNPCs();
    setupNpcData(this, 'init');
    this.Pregnancy.savedPregnancy();
  }

  public postInit() {
    this.NamedNPC.setup(this);
    setupNpcData(this, 'postInit');
  }
}

maplebirch.register('npc', Object.seal(new NPCManager(maplebirch)), ['char']);

export default NPCManager;
