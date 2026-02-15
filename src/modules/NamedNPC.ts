// ./src/modules/NamedNPC.ts

import maplebirch, { MaplebirchCore, createlog } from '../core';
import { clone, either, merge, contains, random,  } from '../utils';
import { Translation } from '../services/LanguageManager';
import NPCSchedules, { ScheduleTime, ScheduleCondition, ScheduleLocation, SpecialSchedule } from './NamedNPCAddon/NPCSchedules';
import NPCClothes, { ClothesConfig } from './NamedNPCAddon/NPCClothes';
import NPCSidebar from './NamedNPCAddon/NPCSidebar';
import { convertNPCs, setupNpcData, isPossible } from './NamedNPCAddon/NPCUtils';

export interface NPCData {
  nam: string;
  gender?: 'm' | 'f' | 'h' | 'n' | 'none';
  pronoun?: 'm' | 'f' | 'i' | 'n' | 't';
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
  [key: string]: any;
}

export interface NPCConfig {
  love?: { maxValue: number };
  loveAlias?: [string, string] | (() => string);
  important?: boolean | (() => boolean);
  special?: boolean | (() => boolean);
  loveInterest?: boolean | (() => boolean);
  romance?: (() => boolean)[];
  [key: string]: any;
}

export const NamedNPC = ((core) => {
  const insecurity = ['weak', 'looks', 'ethics', 'skill'] as const;
  const eyeColour = ['purple', 'dark blue', 'light blue', 'amber', 'hazel', 'green', 'red', 'pink', 'grey', 'light grey', 'lime green'] as const;
  const hairColour = ['red', 'black', 'brown', 'lightbrown', 'blond', 'platinumblond', 'strawberryblond', 'ginger'] as const;

  const virginityTypes = {
    anal: true,
    oral: true,
    penile: true,
    vaginal: true,
    handholding: true,
    temple: false,
    kiss: true,
  } as const;

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
      CN: { he: '她', his: '她的', hers: '她的', him: '她', himself: '她自己', man: '人', boy: '孩子', men: '人们' },
      EN: { he: 'they', his: 'their', hers: 'theirs', him: 'them', himself: 'themself', man: 'person', boy: 'kid', men: 'people' }
    },
    t: {
      CN: { he: '他们', his: '他们的', hers: '他们的', him: '他们', himself: '他们自己', man: '人', boy: '孩子们', men: '大家' },
      EN: { he: 'they', his: 'their', hers: 'theirs', him: 'them', himself: 'themselves', man: 'people', boy: 'kids', men: 'everyone' }
    }
  } as const;

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
      CN: ['纤巧的', '苗条的', '适中的', '软弹的', '柔软的', '圆润的', ' 丰满的', '硕大的', '巨大的'],
      EN: ['slender', 'slim', 'modest', 'cushioned', 'soft', 'round', 'plump', 'large', 'huge']
    },
    balls: {
      CN: [['未发育的', '极小的'], ['小巧的', '玲珑的'], '', ['饱满的', '有弹性的'], ['硕大的', '沉重的', '肥硕的'], ['巨大的', '夸张的', '宏伟的']],
      EN: [['undeveloped', 'tiny'], ['dainty', 'compact'], '', ['full', 'resilient'], ['large', 'heavy', 'massive'], ['huge', 'exaggerated', 'enormous']]
    }
  } as const;

  class NamedNPC {
    nam: string;
    gender: 'm' | 'f' | 'h' | 'n' | 'none';
    title: string;
    description: string;
    type: string;
    adult: number;
    teen: number;
    age: number;
    insecurity: string;
    chastity: { penis: string; vagina: string; anus: string };
    virginity: Record<string, boolean>;
    hair_side_type: string;
    hair_fringe_type: string;
    hair_position: string;
    hairlength: number;
    eyeColour: string;
    hairColour: string;
    pronoun: 'm' | 'f' | 'i' | 'n' | 't';
    pronouns: Record<string, string>;
    bottomsize: number;
    skincolour: number;
    init: number;
    intro: number;
    penis: string;
    penissize: number;
    penisdesc: string;
    vagina: string;
    breastsize: number;
    breastdesc: string;
    ballssize: number;
    outfits: string[];
    pregnancy: any;
    pregnancyAvoidance: number;
    descCache: Record<string, any> = {};

    constructor(manager: NPCManager, data: NPCData) {
      if (!data.nam) manager.log('NamedNPC必须存在nam', 'ERROR');
      this.nam = data.nam;
      this.gender = data.gender ?? either(['m', 'f', 'h', 'n'] as const, { weights: [0.47, 0.47, 0.05, 0.01] });
      this.title = data.title ?? 'none';
      this.description = data.description ?? this.nam;
      this.type = data.type ?? 'human';
      this.adult = data.adult ?? 0;
      this.teen = data.teen ?? 0;
      this.age = data.age ?? 0;
      if (!this.adult && !this.teen) {
        this.adult = random(1);
        this.teen = this.adult ? 0 : 1;
      }
      this.insecurity = data.insecurity ?? either([...insecurity]);
      this.chastity = typeof data.chastity === 'object' ? data.chastity : { penis: '', vagina: '', anus: '' };
      this.virginity = typeof data.virginity === 'object' ? data.virginity : { ...virginityTypes };
      this.hair_side_type = data.hair_side_type ?? 'default';
      this.hair_fringe_type = data.hair_fringe_type ?? 'default';
      this.hair_position = data.hair_position ?? 'back';
      this.hairlength = data.hairlength ?? either(0, 200, 400, 600, 800, 1000);
      this.eyeColour = data.eyeColour ?? either([...eyeColour]);
      this.hairColour = data.hairColour ?? either([...hairColour]);
      this.pronoun = data.pronoun ?? (['m', 'f', 'i', 'n', 't'].includes(this.gender) ? this.gender as 'm' | 'f' | 'i' | 'n' | 't' : either('m', 'f'));
      if (this.gender !== 'none') core.modUtils.getMod('ModI18N') ? this.pronouns = { ...pronounsMap[this.pronoun].CN } : Object.defineProperty(this, 'pronouns', { get: () => pronounsMap[this.pronoun][maplebirch.Language as 'CN' | 'EN'] });
      this.setPronouns(data);
      this.bottomsize = data.bottomsize ?? random(4);
      this.bodyPartdescription();
      this.pregnancy = data.pregnancy ?? null;
      this.applyVanillaPregnancySystem(manager);
      this.skincolour = data.skincolour ?? 0;
      this.init = data.init ?? 0;
      this.intro = data.intro ?? 0;
    }

    setPronouns(data: NPCData) {
      switch (this.gender) {
        case 'm':
          this.penis = data.penis ?? 'clothed';
          this.penissize = data.penissize ?? random(1, 3);
          this.penisdesc = data.penisdesc ?? 'penis';
          this.vagina = data.vagina ?? 'none';
          this.breastsize = data.breastsize ?? 0;
          this.breastdesc = data.breastdesc ?? 'none';
          this.ballssize = data.ballssize ?? random(2, 4);
          break;
        case 'f':
          this.penis = data.penis ?? 'none';
          this.penissize = data.penissize ?? 0;
          this.penisdesc = data.penisdesc ?? 'none';
          this.vagina = data.vagina ?? 'clothed';
          this.breastsize = data.breastsize ?? random(1, 3);
          this.breastdesc = data.breastdesc ?? 'breasts';
          this.ballssize = data.ballssize ?? 0;
          break;
        case 'h':
          this.penis = data.penis ?? 'clothed';
          this.penissize = data.penissize ?? random(1, 3);
          this.penisdesc = data.penisdesc ?? 'penis';
          this.vagina = data.vagina ?? 'clothed';
          this.breastsize = data.breastsize ?? random(1, 3);
          this.breastdesc = data.breastdesc ?? 'breasts';
          this.ballssize = data.ballssize ?? random(2, 4);
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
        case 'm': defaultOutfit = 'maleDefault'; break;
        case 'f': defaultOutfit = 'femaleDefault'; break;
        case 'h': defaultOutfit = 'hermDefault'; break;
        case 'n': defaultOutfit = 'neutralDefault'; break;
        default:  defaultOutfit = 'femaleDefault'; break;
      }
      if (!this.outfits.includes(defaultOutfit)) this.outfits.push(defaultOutfit);
    }

    applyVanillaPregnancySystem(manager: NPCManager) {
      if (this.pregnancy == null) this.pregnancy = {};
      let pregnancyData = this.pregnancy;
      let initialized = false;
      Object.defineProperty(this, 'pregnancy', {
        get: () => {
          if (!initialized) {
            initialized = true;
            const isInfertile = manager.pregnancy.infertile.includes(this.nam);
            const typeEnabled = manager.pregnancy.typesEnabled.includes(this.type);
            const canBePregnant = manager.pregnancy.canBePregnant.includes(this.nam);
            const pregnancyEnabledUndefined = pregnancyData.enabled == null;
            const incompletePregnancyEnabled = core.lodash.get(V, 'settings.incompletePregnancyEnabled');
            const shouldInitialize = !isInfertile && typeEnabled && ((incompletePregnancyEnabled && pregnancyEnabledUndefined && !setup.pregnancy.ignoresIncompleteCheck.includes(this.nam)) || (canBePregnant && pregnancyEnabledUndefined));
            if (shouldInitialize) {
              pregnancyData.fetus = [];
              pregnancyData.givenBirth = 0;
              pregnancyData.totalBirthEvents = 0;
              pregnancyData.timer = null;
              pregnancyData.timerEnd = null;
              pregnancyData.waterBreaking = null;
              pregnancyData.npcAwareOf = null;
              pregnancyData.pcAwareOf = null;
              pregnancyData.type = null;
              pregnancyData.enabled = true;
              pregnancyData.cycleDaysTotal = random(24, 32);
              pregnancyData.cycleDay = random(1, pregnancyData.cycleDaysTotal);
              pregnancyData.cycleDangerousDay = 10;
              pregnancyData.sperm = [];
              pregnancyData.potentialFathers = [];
              pregnancyData.nonCycleRng = [random(3), random(3)];
              pregnancyData.pills = null;
            } else if (isInfertile || (!canBePregnant && !incompletePregnancyEnabled)) {
              pregnancyData = {};
            }
          }
          return pregnancyData;
        },
        set: (value) => { pregnancyData = value; initialized = true; },
      });
      if (!this.pregnancyAvoidance || (V.settings != null ? V.objectVersion.pregnancyAvoidance == null : false)) this.pregnancyAvoidance = 100;
    }

    bodyPartdescription() {
      this.descCache = this.descCache ?? {};
      if ((this.penis === 'clothed' && this.penissize > 0) || this.penisdesc === 'penis') {
        Object.defineProperty(this, 'penisdesc', {
          get: () => {
            const cacheKey = `penis_${maplebirch.Language}_${this.penissize}`;
            if (!this.descCache[cacheKey]) {
              const sizeIndex = this.penissize - 1;
              const options = core.lodash.get(bodyPartMap, ['penis', maplebirch.Language, sizeIndex]);
              this.descCache[cacheKey] = options ? either(options) : '';
            }
            return this.descCache[cacheKey];
          },
          set: (value) => {
            const cacheKey = `penis_${maplebirch.Language}_${this.penissize}`;
            this.descCache[cacheKey] = value;
          }
        });
      }

      if ((this.vagina === 'clothed' && this.breastsize > 0) || this.breastdesc === 'breasts') {
        Object.defineProperty(this, 'breastdesc', {
          get: () => {
            const cacheKey = `breast_${maplebirch.Language}_${this.breastsize}`;
            if (!this.descCache[cacheKey]) {
              const sizeIndex = this.breastsize - 1;
              const options = core.lodash.get(bodyPartMap, ['breast', maplebirch.Language, sizeIndex]);
              this.descCache[cacheKey] = options ? either(options) : '';
            }
            return this.descCache[cacheKey];
          },
          set: (value) => {
            const cacheKey = `breast_${maplebirch.Language}_${this.breastsize}`;
            this.descCache[cacheKey] = value;
          }
        });
      } else {
        Object.defineProperty(this, 'breastdesc', {
          get: () => {
            const cacheKey = `breast_none_${maplebirch.Language}`;
            if (!this.descCache[cacheKey]) {
              const options = core.lodash.get(bodyPartMap, ['breast', maplebirch.Language, 0]);
              this.descCache[cacheKey] = options ? either(options) : '';
            }
            return this.descCache[cacheKey];
          },
          set: (value) => {
            const cacheKey = `breast_none_${maplebirch.Language}`;
            this.descCache[cacheKey] = value;
          }
        });
      }

      Object.defineProperty(this, 'breastsdesc', {
        get: () => {
          const breastDesc = this.breastdesc;
          return maplebirch.Language === 'CN' ? breastDesc : breastDesc.endsWith('s') ? breastDesc : `${breastDesc}s`
        },
        set: (value) => {
          const cacheKey = `breastsdesc_${maplebirch.Language}`;
          this.descCache[cacheKey] = value;
        }
      });

      if (this.bottomsize != null) {
        Object.defineProperty(this, 'bottomdesc', {
          get: () => {
            const cacheKey = `bottom_${maplebirch.Language}_${this.bottomsize}`;
            if (!this.descCache[cacheKey]) {
              const options = core.lodash.get(bodyPartMap, ['bottom', maplebirch.Language, this.bottomsize]);
              this.descCache[cacheKey] = options ? either(options) : '';
            }
            return this.descCache[cacheKey];
          },
          set: (value) => {
            const cacheKey = `bottom_${maplebirch.Language}_${this.bottomsize}`;
            this.descCache[cacheKey] = value;
          }
        });
      }

      if (this.ballssize > 0) {
        Object.defineProperty(this, 'ballsdesc', {
          get: () => {
            const cacheKey = `balls_${maplebirch.Language}_${this.ballssize}`;
            if (!this.descCache[cacheKey]) {
              const sizeIndex = this.ballssize - 1;
              const options = core.lodash.get(bodyPartMap, ['balls', maplebirch.Language, sizeIndex]);
              this.descCache[cacheKey] = options ? either(options) : '';
            }
            return this.descCache[cacheKey];
          },
          set: (value) => {
            const cacheKey = `balls_${maplebirch.Language}_${this.ballssize}`;
            this.descCache[cacheKey] = value;
          }
        });
      }
    }
  }

  function add(manager: NPCManager, npcData: NPCData, config: NPCConfig, translationsData?: Map<string, Translation>): boolean {
    if (!npcData || !npcData.nam) { manager.log('提供的NPC数据无效', 'ERROR'); return false; }
    const npcName = npcData.nam;
    let npcConfig = clone(config);
    if (manager.data.has(npcName)) { manager.log(`NPC ${npcName} 已存在于mod数据中`, 'ERROR'); return false; }
    if (typeof npcConfig !== 'object') npcConfig = {};
    if (Object.keys(npcConfig).length === 0) npcConfig.love = { maxValue: 50 };
    const newNPC = new NamedNPC(manager, npcData);
    for (const statName in manager.customStats) {
      if (manager.customStats.hasOwnProperty(statName) && npcData[statName] === undefined) {
        (newNPC as any)[statName] = 0;
      }
    }
    if (typeof translationsData === 'object') for (const key in translationsData) if (translationsData.hasOwnProperty(key)) core.lang.translations.set(key, translationsData[key]);
    manager.data.set(npcName, { Data: newNPC, Config: npcConfig });
    manager.log(`成功注入NPC: ${npcName}`, 'DEBUG');
    return true;
  }

  function getNamedNPC(manager: NPCManager) {
    if (!V.NPCName) return [];
    const NamedNPCs = clone(V.NPCName);
    manager.NPCNameList = NamedNPCs.map((npc: { nam: string }) => npc.nam);
    const NowNPCNameList = new Set(manager.NPCNameList || []);
    const NewNPCNameList = [];
    for (const npc of NamedNPCs) {
      const name = npc.nam;
      if (!NowNPCNameList.has(name)) {
        NewNPCNameList.push(npc);
        manager.NPCNameList.push(name);
      }
    }
    return [...NewNPCNameList];
  }

  function clearInvalidNpcs(manager: NPCManager) {
    setup.NPCNameList = [...new Set([...setup.NPCNameList, ...Array.from(manager.data.keys())])];
    manager.log(`开始解析NPC...`, 'DEBUG', clone(V.NPCName), clone(setup.NPCNameList));
    const Names = (V.NPCName || []).map((npc: { nam: any }) => npc.nam);
    const needCleaning = !contains(Names, setup.NPCNameList) || !contains(setup.NPCNameList, Names);
    if (!needCleaning) return false;
    const validNamesSet = new Set(setup.NPCNameList);
    V.NPCName = (V.NPCName || []).filter((npc: { nam: any }) => validNamesSet.has(npc.nam));
    manager.NPCNameList = manager.NPCNameList.filter(name => validNamesSet.has(name));
    manager.log(`清理了 ${Names.length - (V.NPCName?.length || 0)} 个无效NPC`, 'DEBUG');
    return true;
  }

  function onUpdate(manager: NPCManager) {
    let addedCount = 0;
    let skippedCount = 0;
    const NowNames = new Set(manager.NPCNameList || []);
    const allNPCs = [...(V.NPCName || [])];
    for (const [npcName, npcEntry] of manager.data) {
      const modNPC = npcEntry.Data;
      if (NowNames.has(npcName)) { skippedCount++; continue; }
      allNPCs.push(modNPC);
      manager.NPCNameList.push(npcName);
      addedCount++;
      manager.log(`注入模组NPC到内部状态: ${npcName}`, 'DEBUG');
    }
    V.NPCName = [...allNPCs];
    V.NPCNameList = manager.NPCNameList;
    updateCNPCProxy(manager);
    const nameListStr = typeof setup.NPCNameList_cn_name === 'string'
      ? setup.NPCNameList_cn_name
      : "Avery,艾弗里|Bailey,贝利|Briar,布莱尔|Charlie,查里|Darryl,达里尔|Doren,多伦|Eden,伊甸|Gwylan,格威岚|Harper,哈珀|Jordan,约旦|Kylar,凯拉尔|Landry,兰德里|Leighton,礼顿|Mason,梅森|Morgan,摩根|River,瑞沃|Robin,罗宾|Sam,萨姆|Sirris,西里斯|Whitney,惠特尼|Winter,温特|Black Wolf,黑狼|Niki,尼奇|Quinn,奎恩|Remy,雷米|Alex,艾利克斯|Great Hawk,巨鹰|Wren,伦恩|Sydney,悉尼|Ivory Wraith,象牙怨灵|Zephyr,泽菲尔|Nona,诺娜|Lake couple,湖边情侣|the witch,巫女|Taylor,泰勒|Casey,凯西|Sterling,斯特林|Cass,卡斯";
    const namePairs = nameListStr.split('|');
    for (const pair of namePairs) {
      const parts = pair.split(',');
      if (parts.length === 2) {
        const enName = parts[0].trim();
        const cnName = parts[1].trim();
        if (enName && cnName) core.lang.translations.set(enName, { EN: enName, CN: cnName });
      }
    }
    manager.log(`更新完成: 添加 ${addedCount} 个NPC, 跳过 ${skippedCount} 个重复NPC`, 'DEBUG');
    return true;
  }

  function updateNPCdata(manager: NPCManager) {
    setup.loveInterestNpc = [...new Set([...setup.loveInterestNpc, ...manager.type.loveInterestNpcs])];
    for (const [npcName, npcEntry] of manager.data) {
      const config = npcEntry.Config;
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
  }

  function setupLoveAlias(npcName: string, loveAliasConfig: any) {
    if (typeof loveAliasConfig === 'function') {
      setup.loveAlias[npcName] = loveAliasConfig;
    } else if (Array.isArray(loveAliasConfig) && loveAliasConfig.length >= 2) {
      const [cnAlias, enAlias] = loveAliasConfig;
      setup.loveAlias[npcName] = () => lanSwitch(enAlias, cnAlias);
    } else {
      setup.loveAlias[npcName] = () => lanSwitch('好感', 'Affection');
    }
  }

  function setupRomanceCondition(manager: NPCManager, npcName: string, config: NPCConfig) {
    if (Array.isArray(config.romance)) {
      manager.romanceConditions[npcName] = config.romance;
    } else if (manager.type.loveInterestNpcs.includes(npcName) && !manager.romanceConditions[npcName]) {
      const npcKey = npcName.toLowerCase().replace(/\s+/g, '');
      manager.romanceConditions[npcName] = [() => (V as any)[npcKey + 'Seen']?.includes('romance')];
    }
  }

  function updateCNPCProxy(manager: NPCManager) {
    if (typeof C.npc === 'undefined') C.npc = {};
    for (const name of setup.NPCNameList) {
      if (C.npc.hasOwnProperty(name)) continue;
      const index = setup.NPCNameList.indexOf(name);
      Object.defineProperty(C.npc, name, {
        get: () => V.NPCName?.[index],
        set: (val) => { if (V.NPCName) V.NPCName[index] = val; },
      });
      manager.log('更新 C.npc 代理映射', 'DEBUG');
    }
  }

  Object.defineProperties(NamedNPC, {
    add:    { value: add },
    get:    { value: getNamedNPC },
    clear:  { value: clearInvalidNpcs },
    update: { value: onUpdate },
    setup:  { value: updateNPCdata },
  })

  return NamedNPC as typeof NamedNPC & {
    add:    typeof add,
    get:    typeof getNamedNPC,
    clear:  typeof clearInvalidNpcs,
    update: typeof onUpdate,
    setup:  typeof updateNPCdata
	};
})(maplebirch)

class NPCManager {
  readonly log: ReturnType<typeof createlog>;
  readonly data: Map<string,any> = new Map();
  NPCNameList: string[] = [];
  readonly pregnancy: { [x:string]: Array<string> } = {
    infertile:     ['Bailey', 'Leighton'],
    typesEnabled:  ['human', 'wolf', 'wolfboy', 'wolfgirl', 'hawk', 'harpy'],
    canBePregnant: ['Alex', 'Black Wolf', 'Great Hawk']
  };
  readonly type: { [x:string]: Array<string> } = {
    loveInterestNpcs: [],
    importantNPCs: [],
    specialNPCs: [],
  };
  readonly customStats: { [x: string]: any } = {};
  readonly romanceConditions: { [key: string]: (() => boolean)[] } = {
    Robin:   [() => V.robinromance === 1],
    Whitney: [() => V.whitneyromance === 1, () => C.npc.Whitney.state !== 'dungeon'],
    Kylar:   [() => V.kylarenglish >= 1, () => C.npc.Kylar.state !== 'prison'],
    Sydney:  [() => V.sydneyromance === 1],
    Eden:    [() => V.syndromeeden === 1],
    Avery:   [() => V.auriga_artefact, () => C.npc.Avery.state !== 'dismissed'],
    'Black Wolf': [() => V.syndromewolves === 1, () => hasSexStat('deviancy', 3)],
    'Great Hawk': [() => V.syndromebird === 1],
    Alex:    [() => V.farm_stage >= 7, () => V.alex_countdown === undefined],
    Gwylan:  [() => V.gwylanSeen.includes('partners') || V.gwylanSeen.includes('romance')]
  };
  readonly NamedNPC: typeof NamedNPC = NamedNPC;
  readonly Schedule: typeof NPCSchedules = NPCSchedules;
  readonly Clothes: typeof NPCClothes = NPCClothes;
  readonly Sidebar: typeof NPCSidebar = NPCSidebar;

  constructor(readonly core: MaplebirchCore) {
    this.log = createlog('npc');
  }

  add(npcData: NPCData, config: NPCConfig, translationsData: Map<string, Translation>) {
    return this.NamedNPC.add(this, npcData, config, translationsData);
  }

  addSchedule(npcName: string, scheduleConfig: ScheduleTime | ScheduleCondition, location: string | ScheduleLocation, id?: string | number, options: Partial<Omit<SpecialSchedule, 'condition' | 'location'>> = {}) {
    return this.Schedule.add(npcName, scheduleConfig, location, id, options);
  }

  addStats(statsObject: { [x: string]: any; hasOwnProperty: (arg0: string) => any; }) {
    if (!statsObject || typeof statsObject !== 'object') return;
    for (const statName in statsObject) {
      if (statsObject.hasOwnProperty(statName)) {
        const statConfig = statsObject[statName];
        const clonedConfig = clone(statConfig);
        this.customStats[statName] = this.customStats[statName] ? merge(this.customStats[statName], clonedConfig, { mode: 'merge' }) : clonedConfig;
      }
    }
  }

  addClothes(...configs: ClothesConfig[]) {
    return this.Clothes.add(...configs);
  }

  injectModNPCs() {
    this.NamedNPC.get(this);
    this.NamedNPC.clear(this);
    this.NamedNPC.update(this);
    this.NamedNPC.setup(this);
    convertNPCs(this);
  }

  vanillaNPCConfig(npcConfig: NPCConfig) {
    if (!npcConfig || typeof npcConfig !== 'object') return {};
    const Config = clone(npcConfig);
    for (const [npcName, npcEntry] of this.data) {
      const modConfig = npcEntry.Config;
      if (modConfig && Object.keys(modConfig).length > 0) {
        const configClone = clone(modConfig);
        ['loveAlias', 'loveInterest', 'romance'].forEach(key => delete configClone[key]);
        if (Config[npcName]) {
          Config[npcName] = merge(Config[npcName], configClone, { mode: 'merge' });
          this.log(`合并NPC配置: ${npcName}`, 'DEBUG');
        } else {
          Config[npcName] = configClone;
          this.log(`添加新NPC配置: ${npcName}`, 'DEBUG');
        }
      }
    }
    if (Array.isArray(T.importantNpcOrder)) this.type.importantNPCs.forEach(id => T.importantNpcOrder.pushUnique(id));
    if (Array.isArray(T.specialNPCs)) this.type.specialNPCs.forEach(id => T.specialNPCs.pushUnique(id));
    return T.npcConfig = Config;
  }

  applyStatDefaults(statDefaults: { [x: string]: any; }) {
    if (!statDefaults || typeof statDefaults !== 'object') return statDefaults || {};
    for (const statName in this.customStats) {
      if (this.customStats.hasOwnProperty(statName)) {
        const customConfig = clone(this.customStats[statName]);
        const position = customConfig.position;
        delete customConfig.position;
        if (statDefaults[statName]) {
          statDefaults[statName] = merge(statDefaults[statName], customConfig, { mode: 'merge' });
        } else {
          statDefaults[statName] = customConfig;
        }
        if (position !== false) {
          if (!T.importantNpcStats.includes(statName)) {
            let insertPosition: number;
            if (typeof position === 'number') { insertPosition = Math.max(0, Math.min(position, T.importantNpcStats.length)); }
            else if (position === 'first') { insertPosition = 0; }
            else if (position === 'last') { insertPosition = T.importantNpcStats.length; }
            else { insertPosition = Math.max(0, T.importantNpcStats.length - 1); }
            T.importantNpcStats.splice(insertPosition, 0, statName);
          }
        }
      }
    }
    return statDefaults;
  }

  vanillaInit(npcName: string) {
    const nam = npcName;
    const idx = V.NPCNameList.indexOf(nam);
    Object.keys(this.customStats).forEach(stat => V.NPCName[idx][stat] = 0);
  }

  vanillaInject(npcName: string, npcno: number) {
    try { this.core.combat.Speech.init(); } catch {};
  }

  preInit() {
    this.Sidebar.init(this);
  }

  async Init() {
    if (!['Start', 'Downgrade Waiting Room'].includes(this.core.passage?.title)) this.injectModNPCs();
    this.Schedule.init(this);
    this.Clothes.init(this);
    setupNpcData(this, 'init');
    isPossibleLoveInterest = (name: string) => isPossible(this, name);
  }

  loadInit() {
    this.injectModNPCs();
    setupNpcData(this, 'init');
  }

  postInit() {
    this.NamedNPC.setup(this);
    setupNpcData(this, 'postInit');
  }
}

(async function(maplebirch) {
  'use strict';
  await maplebirch.register('npc', Object.seal(new NPCManager(maplebirch)), ['char']);
})(maplebirch)

export default NPCManager;