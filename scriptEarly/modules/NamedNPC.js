// @ts-check
/// <reference path='../../maplebirch.d.ts' />
(async() => {
  'use strict';

  const NamedNPC = (() => {
    'use strict';
    // 不安感 力量-外貌-道德-技术
    const insecurity = ['weak', 'looks', 'ethics', 'skill'];
    // 眼睛颜色
    const eyeColour = ['purple', 'dark blue', 'light blue', 'amber', 'hazel', 'green', 'red', 'pink', 'grey', 'light grey', 'lime green']
    // 头发颜色
    const hairColour = ['red', 'black', 'brown', 'lightbrown', 'blond', 'platinumblond', 'strawberryblond', 'ginger']
    // 童贞类型
    const virginityTypes = {
      anal:         true, // 肛门
      oral:         true, // 口腔
      penile:       true, // 阴茎
      vaginal:      true, // 阴道
      handholding:  true, // 牵手
      temple:       false,// 神殿
      kiss:         true, // 接吻
    }
    /**@type {{m:{CN:Object;EN:Object};f:{CN:Object;EN:Object};i:{CN:Object;EN:Object};n:{CN:Object;EN:Object};t:{CN:Object;EN:Object};}} 性别代词映射表 */
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
    };
    /**@type {{penis:{CN:any[];EN:any[]};breast:{CN:any[]; EN:any[]};bottom:{CN:any[]; EN:any[]};balls:{CN:any[]; EN:any[]};}} 身体部位映射表 */
    const bodyPartMap = {
      penis: {
        CN: [['细小阴茎','废物阴茎','可怜阴茎','小小阴茎','迷你阴茎','微型阴茎'],'阴茎',['厚重肉棒','笨重肉棒','大号肉棒','粗大肉棒','狰狞肉棒','肥厚肉棒'],['硕大肉棒','庞大肉棒','巨大肉棒','极大肉棒','超大肉棒','宏伟肉棒']],
        EN: [['tiny penis','pathetic cock','little penis','small penis','mini penis','micro penis'],'penis',['thick cock','hefty cock','big cock','large cock','veiny cock','meaty cock'],['massive cock','huge cock','humongous cock','immense cock','gigantic cock','enormous cock']]
      },
      breast: {
        CN: ['乳头','微隆的','小巧的','偏小的','坚挺的','适中的','饱满的','硕大的','丰腴的','高耸的','巨大的','庞大的','宏伟的'],
        EN: ['nipple','budding','tiny','small','pert','modest','full','large','ample','massive','huge','gigantic','enormous']
      },
      bottom: {
        CN: ['纤巧的', '苗条的', '适中的', '软弹的', '柔软的', '圆润的', ' 丰满的', '硕大的', '巨大的'],
        EN: ['slender', 'slim', 'modest', 'cushioned', 'soft', 'round', 'plump', 'large', 'huge']
      },
      balls: {
        CN: [['未发育的','极小的'],['小巧的','玲珑的'],'',['饱满的','有弹性的'],['硕大的','沉重的','肥硕的'],['巨大的','夸张的','宏伟的']],
        EN: [['undeveloped', 'tiny'], ['dainty', 'compact'], '', ['full', 'resilient'], ['large', 'heavy', 'massive'], ['huge', 'exaggerated', 'enormous']]
      }
    }

    /**
     * @param {NPCManager} manager
     * @param {{ [x: string]: any; nam: any; gender:'m'|'f'|'h'|'n'; pronoun: 'm'|'f'|'i'|'n'|'t';}} npcData
     * @param {any} config
     * @param {{ [x: string]: any; hasOwnProperty: (arg0: string) => any; }} translationsData
     */
    function add(manager, npcData, config, translationsData) {
      if (!npcData || !npcData.nam) { manager.log('提供的NPC数据无效', 'ERROR'); return false; }
      const npcName = npcData.nam; let npcConfig = manager.tool.clone(config);
      if (manager.data.has(npcName)) { manager.log(`NPC ${npcName} 已存在于mod数据中`, 'ERROR'); return false; }
      if (typeof npcConfig !== 'object') npcConfig = {};
      if (Object.keys(npcConfig).length === 0) npcConfig.love = { maxValue: 50 };
      /**@type {any} */const newNPC = new NamedNPC(manager, npcData);
      for (const statName in manager.customStats) if (manager.customStats.hasOwnProperty(statName) && npcData[statName] === undefined) newNPC[statName] = 0;
      if (typeof translationsData === 'object') for (const key in translationsData) if (translationsData.hasOwnProperty(key)) manager.core.lang.translations.set(key, translationsData[key]);
      manager.data.set(npcName, { Data: newNPC, Config: npcConfig });
      manager.log(`成功注入NPC: ${npcName}`, 'DEBUG');
      return true;
    }

    class NamedNPC {
      /**
       * @param {NPCManager} manager
       * @param {{ [x:string]:any; nam:any; gender:'m'|'f'|'h'|'n'|'none'; pronoun:'m'|'f'|'i'|'n'|'t'; }} data
       */
      constructor(manager, data) {
        if (!data.nam) manager.log('NamedNPC必须存在nam', 'ERROR');
        this.nam = data.nam;
        this.gender = data.gender ?? manager.tool.either(['m', 'f', 'h', 'n'], { weights: [0.47, 0.47, 0.05, 0.01] });
        this.title = data.title ?? 'none';
        this.description = data.description ?? this.nam;
        this.type = data.type ?? 'human';
        this.adult = data.adult ?? 0;
        this.teen = data.teen ?? 0;
        if (!this.adult && !this.teen) this.adult = manager.tool.random(1), this.teen = this.adult ? 0 : 1;
        this.insecurity = data.insecurity ?? manager.tool.either(insecurity);
        this.chastity = typeof data.chastity === 'object' ? data.chastity : {penis: '', vagina: '', anus: ''};
        this.virginity = typeof data.virginity === 'object' ? data.virginity : virginityTypes;
        this.hair_side_type = data.hair_side_type ?? 'default';
        this.hair_fringe_type = data.hair_fringe_type ?? 'default';
        this.hair_position = data.hair_position ?? 'back';
        this.hairlength = data.hairlength ?? manager.tool.either(0, 200, 400, 600, 800, 1000);
        this.eyeColour = data.eyeColour ?? manager.tool.either(eyeColour);
        this.hairColour = data.hairColour ?? manager.tool.either(hairColour);
        this.pronoun = data.pronoun ?? (['m','f','i','n','t'].includes(this.gender) ? this.gender : manager.tool.either('m','f'));
        if (this.gender !== 'none') manager.tool.core.modUtils.getMod('ModI18N') ? this.pronouns = pronounsMap[this.pronoun].CN : Object.defineProperty(this, 'pronouns', { get: () => pronounsMap[this.pronoun][manager.tool.core.Language] });
        this.#setPronouns(manager, data);
        this.bottomsize = data.bottomsize ?? manager.tool.random(4);
        this.#bodyPartdescription(manager);
        this.pregnancy = data.pregnancy ?? null;
        this.#applyVanillaPregnancySystem(manager);
        this.skincolour = data.skincolour ?? 0;
        this.init = data.init ?? 0;
        this.intro = data.intro ?? 0;
      }

      /** @param {{ tool: { random: any; }; }} manager @param {any} data */
      #setPronouns(manager, data) {
        const random = manager.tool.random;
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
          // @ts-ignore
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
        /**@type {any[]} */this.outfits = Array.isArray(data.outfits) ? data.outfits : this.outfits = [];
        let defaultOutfit = 'femaleDefault';
        switch (this.gender) {
          case 'm': defaultOutfit = 'maleDefault'; break;
          case 'f': defaultOutfit = 'femaleDefault'; break;
          // @ts-ignore
          case 'h': defaultOutfit = 'hermDefault'; break;
          case 'n': defaultOutfit = 'neutralDefault'; break;
          default: defaultOutfit = 'femaleDefault'; break;
        }
        // @ts-ignore
        if (!this.outfits.includes(defaultOutfit)) this.outfits.push(defaultOutfit);
      }

      /** @param {{ tool: { random: any; }; pregnancy: { infertile: string | any[]; typesEnabled: string | any[]; canBePregnant: string | any[]; }; }} manager */
      #applyVanillaPregnancySystem(manager) {
        const random = manager.tool.random;
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
              const incompletePregnancyEnabled = V.settings?.incompletePregnancyEnabled;

              const shouldInitialize = !isInfertile && typeEnabled &&
              ((incompletePregnancyEnabled && pregnancyEnabledUndefined &&
              !setup.pregnancy.ignoresIncompleteCheck.includes(this.nam)) || (canBePregnant &&
              pregnancyEnabledUndefined));

              if (shouldInitialize) {
                pregnancyData.fetus = [];           // 胎儿
                pregnancyData.givenBirth = 0;       // 已分娩次数
                pregnancyData.totalBirthEvents = 0; // 总分娩事件
                pregnancyData.timer = null;         // 怀孕计时器
                pregnancyData.timerEnd = null;      // 预产期
                pregnancyData.waterBreaking = null; // 破羊水时间
                pregnancyData.npcAwareOf = null;    // NPC知晓怀孕的时间
                pregnancyData.pcAwareOf = null;     // 玩家知晓怀孕的时间
                pregnancyData.type = null;          // 胎儿种族
                pregnancyData.enabled = true;       // 怀孕系统启用状态
                pregnancyData.cycleDaysTotal = random(24, 32); // 月经周期总天数
                pregnancyData.cycleDay = random(1, pregnancyData.cycleDaysTotal); // 当前周期天数
                pregnancyData.cycleDangerousDay = 10; // 危险期起始日
                pregnancyData.sperm = [];  // 精子信息
                pregnancyData.potentialFathers = []; // 潜在父亲列表
                pregnancyData.nonCycleRng = [random(3), random(3)];  // 非周期随机因子
                pregnancyData.pills = null; // 药物使用情况
              } else if (isInfertile || (!canBePregnant && !incompletePregnancyEnabled)) {
                pregnancyData = {};
              }
            }
            return pregnancyData;
          },
          set: (value) => { pregnancyData = value; initialized = true; },
        });
        if (!this.pregnancyAvoidance || (typeof V.settings != null ? V.objectVersion.pregnancyAvoidance == null : false)) this.pregnancyAvoidance = 100;
      }

      /** @param {{ tool: { either: any; }; }} manager */
      #bodyPartdescription(manager) {
        const either = manager.tool.either;
        this.descCache = this.descCache ?? {};
        if ((this.penis === 'clothed' && this.penissize > 0) || this.penisdesc === 'penis') {
          Object.defineProperty(this, 'penisdesc', {
            get: () => {
              const cacheKey = `penis_${maplebirch.Language}_${this.penissize}`;
              if (!this.descCache[cacheKey]) this.descCache[cacheKey] = either(bodyPartMap.penis[maplebirch.Language]?.[this.penissize - 1]);
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
              if (!this.descCache[cacheKey]) this.descCache[cacheKey] = either(bodyPartMap.breast[maplebirch.Language]?.[this.breastsize - 1]);
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
              if (!this.descCache[cacheKey]) this.descCache[cacheKey] = either(bodyPartMap.breast[maplebirch.Language]?.[0]);
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
              if (!this.descCache[cacheKey]) this.descCache[cacheKey] = either(bodyPartMap.bottom[maplebirch.Language]?.[this.bottomsize]);
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
              if (!this.descCache[cacheKey]) this.descCache[cacheKey] = either(bodyPartMap.balls[maplebirch.Language]?.[this.ballssize - 1]);
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

    /** @param {{ tool: { clone: (arg0: any) => any; }; NPCNameList: any[]; }} manager */
    function getNamedNPC(manager) {
      if (!V.NPCName) return [];
      const NamedNPCs = manager.tool.clone(V.NPCName);
      manager.NPCNameList = NamedNPCs.map((/**@type {{ nam: string; }}*/npc) => npc.nam);
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

    /** @param {{ data: any[]; log: (arg0: string, arg1: string, arg2?: undefined, arg3?: undefined) => void; tool: { clone: (arg0: any) => any; contains: typeof contains; }; NPCNameList: any[]; }} manager */
    function clearInvalidNpcs(manager) {
      setup.NPCNameList = [...new Set([...setup.NPCNameList, ...Array.from(manager.data.keys())])];
      manager.log(`开始解析NPC...`, 'DEBUG', manager.tool.clone(V.NPCName), manager.tool.clone(setup.NPCNameList));
      const Names = (V.NPCName || []).map((/**@type {{ nam: any; }}*/npc) => npc.nam);
      const needCleaning = !manager.tool.contains(Names, setup.NPCNameList) || !manager.tool.contains(setup.NPCNameList, Names);
      if (!needCleaning) return false;
      const validNamesSet = new Set(setup.NPCNameList);
      V.NPCName = (V.NPCName || []).filter((/**@type {{ nam: any; }}*/npc) => validNamesSet.has(npc.nam));
      manager.NPCNameList = manager.NPCNameList.filter(name => validNamesSet.has(name));
      manager.log(`清理了 ${Names.length - V.NPCName.length} 个无效NPC`, 'DEBUG');
      return true;
    }

    /** @param {NPCManager} manager */
    function onUpdate(manager) {
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
          // @ts-ignore
          if (enName && cnName) manager.core.lang.translations.set(enName, { EN: enName, CN: cnName });
        }
      }
      manager.log(`更新完成: 添加 ${addedCount} 个NPC, 跳过 ${skippedCount} 个重复NPC`, 'DEBUG');
      return true;
    }


    /** @param {{ type: any; data: any; romanceConditions: { [x: string]: (() => any)[]; }; }} manager */
    function updateNPCdata(manager) {
      setup.loveInterestNpc = [...new Set([...setup.loveInterestNpc, ...manager.type.loveInterestNpcs])];
      for (const [npcName, npcEntry] of manager.data) {
        const config = npcEntry.Config;
        setupLoveAlias(npcName, config.loveAlias);
        if (typeof config === 'object') {
          const checks = [['important',manager.type.importantNPCs],['special',manager.type.specialNPCs],['loveInterest',manager.type.loveInterestNpcs]];
          checks.forEach(([key, arr]) => {
            const value = typeof config[key] === 'function' ? config[key]() : config[key];
            if (value === true && !arr.includes(npcName)) arr.push(npcName);
          });
          setupRomanceCondition(manager, npcName, config);
        }
      }
    }

    /** @param {string} npcName @param {string|any[]} loveAliasConfig */
    function setupLoveAlias(npcName, loveAliasConfig) {
      if (typeof loveAliasConfig === 'function') {
        setup.loveAlias[npcName] = loveAliasConfig;
      } else if (Array.isArray(loveAliasConfig) && loveAliasConfig.length >= 2) {
        const [cnAlias, enAlias] = loveAliasConfig;
        setup.loveAlias[npcName] = () => lanSwitch(enAlias,cnAlias);
      } else {
        setup.loveAlias[npcName] = () => lanSwitch('好感','Affection');
      }
    }

    /** @param {{ type: any; data?: any; romanceConditions: any; }} manager @param {string} npcName @param {{ romance: any; }} config */
    function setupRomanceCondition(manager, npcName, config) {
      if (Array.isArray(config.romance)) {
        manager.romanceConditions[npcName] = config.romance;
      } else if (manager.type.loveInterestNpcs.includes(npcName) && !manager.romanceConditions[npcName]) {
        const npcKey = npcName.toLowerCase().replace(/\s+/g, '');
        manager.romanceConditions[npcName] = [() => V[npcKey + 'Seen']?.includes('romance')];
      }
    }

    /** @param {{ NPCNameList?: any[]; data?: any; log: any; }} manager */
    function updateCNPCProxy(manager) {
      if (typeof C.npc === 'undefined') C.npc = {};
      for (const name of setup.NPCNameList) {
        if (C.npc.hasOwnProperty(name)) continue;
        const index = setup.NPCNameList.indexOf(name);
        Object.defineProperty(C.npc, name, {
          get: () => V.NPCName[index],
          set: (val) => V.NPCName[index] = val,
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
    });

    return NamedNPC;
  })()

  const NPCSchedules = (() => {
    const schedules = new Map();
    let nextId = 0;
    /** @type {object|null} */
    let enhancedDateProto = null;

    class Schedule {
      constructor() {
        this.daily = new Array(24).fill('');
        /** @type {Array<{id: string|number; condition: Function; location: any; before?: string|number; after?: string|number; insteadOf?: string|number; override?: boolean}>} */
        this.specials = [];
        this.sortedSpecials = null;
      }

      /** @param {string|number|any[]} scheduleConfig @param {any} location */
      at(scheduleConfig, location) {
        if (Array.isArray(scheduleConfig) && scheduleConfig.length === 2) {
          const [start, end] = scheduleConfig;
          if (start > end) { maplebirch.log('起始时间不能大于结束时间', 'ERROR'); return this; }
          for (let hour = start; hour <= end; hour++) if (hour >= 0 && hour <= 23) this.daily[hour] = location;
        } else if (typeof scheduleConfig === 'number') {
          if (scheduleConfig >= 0 && scheduleConfig <= 23) this.daily[scheduleConfig] = location;
        }
        return this;
      }

      /** @param {Function} condition @param {any} location @param {string} id @param {Object} options */
      when(condition, location, id, options = {}) {
        this.specials.push({id: id || (nextId++).toString(), condition, location, ...options});
        this.sortedSpecials = null;
        return this;
      }

      /** @param {string|number} specialId @param {Object} updates */
      update(specialId, updates) {
        const special = this.specials.find(s => s.id === specialId);
        if (special) { Object.assign(special, updates); this.sortedSpecials = null; }
        return this;
      }

      /** @param {string|number} specialId */
      remove(specialId) {
        this.specials = this.specials.filter(s => s.id !== specialId);
        this.sortedSpecials = null;
        return this;
      }

      sortSpecials() {
        if (this.sortedSpecials) return;
        const overrides = this.specials.filter(s => s.override);
        const nonOverrides = this.specials.filter(s => !s.override);
        this.sortedSpecials = [...overrides, ...this.topologicalSort(nonOverrides)];
      }

      /** @param {any[]} items */
      topologicalSort(items) {
        const graph = new Map(), inDegree = new Map(), idToItem = new Map();
        items.forEach(item => { graph.set(item.id, new Set()); inDegree.set(item.id, 0); idToItem.set(item.id, item); });
        items.forEach(item => {
          const addEdge = (/**@type {any}*/from, /**@type {any}*/to) => { graph.get(from).add(to); inDegree.set(to, (inDegree.get(to) || 0) + 1); };
          if (item.before && idToItem.has(item.before)) addEdge(item.id, item.before);
          if (item.after && idToItem.has(item.after)) addEdge(item.after, item.id);
          if (item.insteadOf && idToItem.has(item.insteadOf)) addEdge(item.id, item.insteadOf);
        });
        const queue = [...inDegree.entries()].filter(([_, degree]) => degree === 0).map(([id]) => id);
        const sorted = [];
        while (queue.length) {
          const current = queue.shift();
          sorted.push(idToItem.get(current));
          for (const neighbor of graph.get(current) || []) {
            inDegree.set(neighbor, inDegree.get(neighbor) - 1);
            if (inDegree.get(neighbor) === 0) queue.push(neighbor);
          }
        }
        if (sorted.length !== items.length) maplebirch.log('NPCSchedules: 条件依赖存在环', 'WARN');
        return sorted.length === items.length ? sorted : items;
      }

      // @ts-ignore
      get location() {
        const date = new DateTime(Time.date);
        if (this.specials.length > 0) {
          this.sortSpecials();
          // @ts-ignore
          for (const special of this.sortedSpecials) {
            const enhancedDate = this.createEnhancedDate(date);
            if (special.condition(enhancedDate)) return this.resolveLocation(special.location, date);
          }
        }
        return this.daily[Time.date.hour] ?? '';
      }

      // @ts-ignore
      resolveLocation(loc, date) {
        try {
          if (typeof loc === 'function') {
            const enhancedDate = this.createEnhancedDate(date);
            const result = loc(enhancedDate);
            if (result != null) {
              if (result instanceof Schedule) return result.location;
              if (typeof result === 'string') return result;
              return String(result);
            }
            if (enhancedDate.schedule && enhancedDate.schedule instanceof Schedule) return enhancedDate.schedule.location;
            return '';
          }
          return typeof loc === 'string' ? loc : String(loc || '');
        } catch(e) { 
          maplebirch.log('NPCSchedules: resolveLocation', 'ERROR', e); 
          return ''; 
        }
      }
      
      /** @param {DateTime} date */
      createEnhancedDate(date) {
        if (!enhancedDateProto) enhancedDateProto = this.buildEnhancedDateProto();
        const enhancedDate = Object.create(enhancedDateProto);
        const schedule = new Schedule();
        Object.defineProperty(enhancedDate, 'schedule', { value: schedule });
        const specialProps = {
          schoolDay: () => Time.schoolDay,
          spring:    () => Time.season === 'spring',
          summer:    () => Time.season === 'summer',
          autumn:    () => Time.season === 'autumn',
          winter:    () => Time.season === 'winter',
          dawn:      () => Time.dayState === 'dawn',
          day:       () => Time.dayState === 'day',
          dusk:      () => Time.dayState === 'dusk',
          night:     () => Time.dayState === 'night',
          weekEnd:   () => Time.date.weekEnd
        };
        for (const [prop, getter] of Object.entries(specialProps)) if (!Object.prototype.hasOwnProperty.call(enhancedDate, prop)) Object.defineProperty(enhancedDate, prop, { get: getter });
        // @ts-ignore
        for (const key in date) if (!Object.prototype.hasOwnProperty.call(enhancedDate, key)) Object.defineProperty(enhancedDate, key, { get: function() { return date[key]; } });
        // @ts-ignore
        for (const key in Time) if (typeof Time[key] !== 'function' && !Object.prototype.hasOwnProperty.call(enhancedDate, key)) Object.defineProperty(enhancedDate, key, { get: function() { return Time[key]; } });
        return enhancedDate;
      }

      buildEnhancedDateProto() {
        const proto = Object.create(null);
        const toMinutes = (/**@type {number|any[]} */time) => Array.isArray(time) ? time[0] * 60 + (time[1] || 0) : time * 60;
        proto.isAt = function(/**@type {any[]}*/ time) { return this.hour === (Array.isArray(time) ? time[0] : time) && this.minute === (Array.isArray(time) ? (time[1] || 0) : 0); };
        proto.isAfter = function(/**@type {number|any[]}*/time) { return this.hour * 60 + this.minute > toMinutes(time); };
        proto.isBefore = function(/**@type {number|any[]}*/time) { return this.hour * 60 + this.minute < toMinutes(time); };
        proto.isBetween = function(/**@type {number|any[]}*/start, /** @type {number | any[]} */ end) { return this.hour * 60 + this.minute >= toMinutes(start) && this.hour * 60 + this.minute <= toMinutes(end); };
        proto.isHour = function(/**@type {any[]}*/...hours) { return hours.includes(this.hour); };
        proto.isHourBetween = function(/**@type {number}*/start, /**@type {number}*/end) { return this.hour >= start && this.hour <= end; };
        proto.isMinuteBetween = function(/**@type {number}*/start, /**@type {number}*/end) { return this.minute >= start && this.minute <= end; };
        return proto;
      }
    }

    /** @param {NPCManager} manager */
    function initData(manager) {
      if (!Array.isArray(manager.NPCNameList)) { maplebirch.log('NPCSchedules: 需要传入NPC名称数组', 'WARN'); return false; }
      for (const npcName of manager.NPCNameList) if (!schedules.has(npcName)) schedules.set(npcName, new Schedule());
      return true;
    }

    /** @param {string} npcName @param {any} scheduleConfig @param {any} location @param {any} id @param {Object} options */
    function addData(npcName, scheduleConfig, location, id, options = {}) {
      if (!schedules.has(npcName)) schedules.set(npcName, new Schedule());
      const schedule = schedules.get(npcName);
      typeof scheduleConfig === 'function' ? schedule.when(scheduleConfig, location, id, options) : schedule.at(scheduleConfig, location);
      return schedule;
    }

    /** @param {string} npcName */
    function getData(npcName) {
      if (!schedules.has(npcName)) schedules.set(npcName, new Schedule());
      return schedules.get(npcName);
    }

    /** @param {string} npcName @param {string|number} specialId @param {Object} updates */
    function updateData(npcName, specialId, updates) {
      if (!schedules.has(npcName)) schedules.set(npcName, new Schedule());
      const schedule = schedules.get(npcName);
      schedule.update(specialId, updates);
      return schedule;
    }

    /** @param {string} npcName @param {string|number} specialId */
    function removeData(npcName, specialId) {
      if (!schedules.has(npcName)) schedules.set(npcName, new Schedule());
      const schedule = schedules.get(npcName);
      schedule.remove(specialId);
      return schedule;
    }

    /** @param {string} npcName */
    function clearSchedule(npcName) {
      if (schedules.has(npcName)) schedules.set(npcName, new Schedule());
      return schedules.get(npcName);
    }

    function npcSchedule() {
      /**@type {{[x:string]:any}}*/const result = {};
      for (const [npcName, schedule] of schedules) result[npcName] = schedule.location;
      return result;
    }

    Object.defineProperties(Schedule, {
      schedules:  { get: () => schedules },
      init:       { value: initData },
      add:        { value: addData },
      get:        { value: getData },
      update:     { value: updateData },
      remove:     { value: removeData },
      clear:      { value: clearSchedule },
      clearAll:   { value: schedules.clear },
      npcList:    { get: () => Array.from(schedules.keys()) },
      location:   { get: () => npcSchedule() },
    });

    return Schedule;
  })()

  class NPCUtils {
    /** @param {NPCManager} manager @param {string} name */
    static isPossibleLoveInterest(manager, name) {
      if (manager.romanceConditions[name]) return manager.romanceConditions[name].every(condition => condition());
      return false;
    }

    /** @param {NPCManager} manager */
    static convertNPCs(manager) {
      if (!V.NPCName || !Array.isArray(V.NPCName)) return;
      for (let i = 0; i < V.NPCName.length; i++) {
        const npc = V.NPCName[i];
        if (npc?.nam && !(npc instanceof NamedNPC)) {
          /**@type {any}*/const newNpc = new NamedNPC(manager, npc);
          for (const key in npc) if (!newNpc.hasOwnProperty(key) && key !== 'nam') newNpc[key] = npc[key];
          V.NPCName[i] = newNpc;
        }
      }
    }

    /** @param {string} npcName */
    static npcSeenProperty(npcName) {
      const npcNameNoSpace = npcName.replace(/\s+/g, '');
      const SeenName = npcNameNoSpace + 'Seen';
      const FirstSeenName = npcNameNoSpace + 'FirstSeen';
      if (!V.maplebirch.npc[npcName]) V.maplebirch.npc[npcName] = {};
      if (V[SeenName] == null) V[SeenName] = [];
      if (V[FirstSeenName] == null) V[FirstSeenName] = '';
      Object.defineProperty(V.maplebirch.npc[npcName], 'Seen', {
        get: () => V[SeenName],
        set: (val) => { V[SeenName] = val; },
        configurable: true,enumerable: true
      });
      Object.defineProperty(V.maplebirch.npc[npcName], 'FirstSeen', {
        get: () => V[FirstSeenName],
        set: (val) => { V[FirstSeenName] = val; },
        configurable: true,enumerable: true
      });
    }

    /** @param {string} npcName */
    static bodyDataProperties(npcName) {
      const name = npcName.toLowerCase();
      const body = ['penis','vagina','virginity','hair_side_type','hair_fringe_type','hair_position','hairlength','eyeColour','hairColour','penissize','breastsize','ballssize'];
      const bodyData = V.maplebirch.npc[name].bodydata;
      body.forEach(prop => {
        delete bodyData[prop];
        Object.defineProperty(bodyData, prop, {
          get: () => {
            const npc = V.NPCName.find((/**@type {{ nam: string; }}*/ n) => n.nam === npcName);
            return npc ? npc[prop] : undefined;
          },configurable: true,enumerable: true
        });
      });
    }

    /** @param {string} npcName */
    static outfitProperties(npcName) {
      const name = npcName.toLowerCase();
      delete V.maplebirch.npc[name].outfits;
      Object.defineProperty(V.maplebirch.npc[name], 'outfits', {
        get: () => {
          const npc = V.NPCName.find((/**@type {{ nam: string; }}*/ n) => n.nam === npcName);
          return npc ? (npc.outfits || []) : [];
        },configurable: true,enumerable: true
      });
    }

    /** @param {NPCManager} manager */
    static setupNpcData(manager, phase = 'init') {
      const NPCNameList = manager.NPCNameList;
      for (const npcKey in V.maplebirch.npc) if (V.maplebirch.npc.hasOwnProperty(npcKey) && !new Set(NPCNameList.map(name => name.toLowerCase())).has(npcKey))delete V.maplebirch.npc[npcKey];
      NPCNameList.forEach(npcName => {
        const name = npcName.toLowerCase();
        if (!V.maplebirch.npc[name]) V.maplebirch.npc[name] = {};
        if (!V.maplebirch.npc[name].bodydata) V.maplebirch.npc[name].bodydata = {};
        if (!V.maplebirch.npc[name].outfits) V.maplebirch.npc[name].outfits = [];
        if (!V.maplebirch.npc[name].hasOwnProperty('clothes')) Object.defineProperty(V.maplebirch.npc[name], 'clothes', {
          // @ts-ignore
          get: () => manager.Clothes.worn(npcName),
          // @ts-ignore
          set: (value) => maplebirch.log(`警告：禁止直接设置 NPC ${npcName} 的服装，请通过服装系统管理`),
        });
        if (!V.maplebirch.npc[name].tucked) V.maplebirch.npc[name].tucked = [false, false];
        if (!V.maplebirch.npc[name].hasOwnProperty('location')) {
          Object.defineProperty(V.maplebirch.npc[name], 'location', {
            // @ts-ignore
            get: () => manager.Schedules.location[npcName],
            // @ts-ignore
            set: (value) => maplebirch.log(`警告：禁止直接设置 NPC ${npcName} 的位置，请通过日程系统管理`),
          });
        }
        if (phase === 'postInit') {
          NPCUtils.bodyDataProperties(npcName);
          NPCUtils.outfitProperties(npcName);
          NPCUtils.npcSeenProperty(name);
        }
      });
    }
  }

  class NPCManager {
    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.core = core;
      this.tool = core.tool;
      this.log = this.tool.createLog('npc');
      this.data = new Map();
      this.NamedNPC = NamedNPC;
      this.Schedules = NPCSchedules;
      this.pregnancy = {
        infertile: ['Bailey', 'Leighton'],                                        // 不孕
        typesEnabled: ['human', 'wolf', 'wolfboy', 'wolfgirl', 'hawk', 'harpy'],  // 可怀孕种类
        canBePregnant: ['Alex', 'Black Wolf', 'Great Hawk']                       // 可孕
      };
      this.type = {
        loveInterestNpcs: [], // 可恋爱npc ,如罗宾
        importantNPCs: [],    // 重要npc ,如罗宾
        specialNPCs: [],      // 特殊npc ,如幽灵
      };
      /** @type {any[]} */
      this.NPCNameList = [];
      /** @type {{[x: string]: any}} */
      this.customStats = {};
      /** @type {{[key: string]: (() => boolean)[]}} */
      this.romanceConditions = {
        Robin: [() => V.robinromance === 1],
        Whitney: [() => V.whitneyromance === 1,() => C.npc.Whitney.state !== 'dungeon'],
        Kylar: [() => V.kylarenglish >= 1,() => C.npc.Kylar.state !== 'prison'],
        Sydney: [() => V.sydneyromance === 1],
        Eden: [() => V.syndromeeden === 1],
        Avery: [() => V.auriga_artefact,() => C.npc.Avery.state !== 'dismissed'],
        'Black Wolf': [() => V.syndromewolves === 1,() => hasSexStat('deviancy', 3)],
        'Great Hawk': [() => V.syndromebird === 1],
        Alex: [() => V.farm_stage >= 7,() => V.alex_countdown === undefined],
        Gwylan: [() => V.gwylanSeen.includes('partners') || V.gwylanSeen.includes('romance')]
      };
      this.core.trigger(':npc-init', this);
      this.core.once(':passagestart',() => {
        // @ts-ignore
        this.Schedules.init(this);
        // @ts-ignore
        this.Clothes.init(this);
        if (['Start', 'Downgrade Waiting Room'].includes(core.state.Passage?.title)) return;
        this.injectModNPCs();
      });
    }

    /**
     * 向NPC管理器中添加一个新NPC角色
     * @param {Object} npcData - NPC数据对象
     * @param {string} npcData.nam - NPC唯一名称（必需）
     * @param {string} [npcData.title] - NPC的称号
     * @param {string} [npcData.gender='f'] - 性别 (m/f/h)
     * @param {string} [npcData.type='human'] - 种族类型
     * @param {Object} [config] - NPC配置选项
     * @param {string[]} [config.loveAlias] - NPC的好感别称数组 [CN, EN]
     * @param {boolean} [config.important=false] - 是否重要NPC（显示在状态栏）
     * @param {boolean} [config.special=false] - 是否为特殊NPC
     * @param {boolean} [config.loveInterest=false] - 是否为恋爱NPC
     * @param {(() => boolean)[]} [config.romance] - 恋爱条件数组，每个元素是一个返回布尔值的函数
     * @param {Object} [translationsData] - 翻译数据对象
     */
    add(npcData, config, translationsData) {
      // @ts-ignore
      return this.NamedNPC.add(this, npcData, config, translationsData);
    }

    /**
     * 为NPC添加日程安排
     * @param {string} npcName - NPC名称
     * @param {Array<number>|number|Function} scheduleConfig - 日程配置
     *  - Array: [开始小时, 结束小时] 如 [8, 15] 表示8点到15点
     *  - number: 具体小时 如 16 表示16点
     *  - Function: 条件函数，返回布尔值，用于特殊事件
     * @param {string|Function|Schedule} location - 位置
     *  - string: 固定位置字符串
     *  - Function: 位置函数，接收EnhancedDate参数，返回字符串或Schedule
     *  - Schedule: 返回另一个Schedule对象，可以嵌套日程
     * @param {Object} [options={}] - 选项
     * @param {string|number} [options.id] - 特殊事件ID（仅特殊事件需要）
     * @param {number} [options.priority=0] - 优先级，数字越大优先级越高
     * @returns {Schedule} 返回NPC的Schedule实例，支持链式调用
     */
    // @ts-ignore
    addSchedule(npcName, scheduleConfig, location, options = {}) {
      // @ts-ignore
      return this.Schedules.add(npcName, scheduleConfig, location, options = {});
    }

    /**
     * 添加/修改NPC状态系统
     * @param {Object} statsObject - 状态配置对象
     * @param {Object} statsObject[] - 状态配置
     * @param {number|string} [statsObject[].position='secondLast'] - 在状态列表中的位置(数字索引/'first'/'last'/'secondLast')
     */
    addStats(/**@type {any}*/statsObject) {
      if (!statsObject || typeof statsObject !== 'object') return;
      for (const statName in statsObject) {
        if (statsObject.hasOwnProperty(statName)) {
          const statConfig = statsObject[statName];
          const clonedConfig = this.tool.clone(statConfig);
          this.customStats[statName] = this.customStats[statName] ? this.tool.merge(this.customStats[statName], clonedConfig, { mode: 'merge' }) : clonedConfig;
        }
      }
    }

    /**
     * NPC服装套装配置
     * @typedef {Object} NPCClothesConfig
     * @property {string} name - 套装唯一标识（必需）
     * @property {string} [type='custom'] - 套装类型
     * @property {string} [gender='n'] - 适用性别 (m-男性, f-女性, n-中性)
     * @property {number} [outfit=0] - outfit类型 (0-普通, 1-特殊)
     * @property {string|Object} upper - 上身衣物配置
     * @property {string} [upper.name] - 上身衣物名称（必需）
     * @property {number} [upper.integrity_max=100] - 上身衣物耐久度
     * @property {string} [upper.word='a'] - 冠词类型 (a-用'a', n-不用冠词)
     * @property {'lift'|'pull'|'unbutton'|'unzip'|'aside'|'open'|'undo'|'unwrap'} [upper.action='lift'] - 脱衣动作
     * @property {string} [upper.desc] - 上身衣物描述
     * @property {string|Object} lower - 下身衣物配置
     * @property {string} [lower.name] - 下身衣物名称（必需）
     * @property {number} [lower.integrity_max=100] - 下身衣物耐久度
     * @property {string} [lower.word='n'] - 冠词类型 (a-用'a', n-不用冠词)
     * @property {'lift'|'pull'|'unbutton'|'unzip'|'aside'|'open'|'undo'|'unwrap'} [lower.action='pull'] - 脱衣动作
     * @property {string} [lower.desc] - 下身衣物描述
     * @property {string} [desc] - 套装描述
     * 添加NPC服装套装
     * @param {...NPCClothesConfig} configs - 套装配置对象
     * @returns {NPCClothes} 返回NPCClothes实例
     */
    addClothes(...configs) {
      // @ts-ignore
      return this.Clothes.add(...configs);
    }

    injectModNPCs() {
      // @ts-ignore
      this.NamedNPC.get(this);
      // @ts-ignore
      this.NamedNPC.clear(this);
      // @ts-ignore
      this.NamedNPC.update(this);
      // @ts-ignore
      this.NamedNPC.setup(this);
      NPCUtils.convertNPCs(this);
    }

    /** @param {any} npcConfig */
    vanillaNPCConfig(npcConfig) {
      if (!npcConfig || typeof npcConfig !== 'object') return {};
      const Config = this.tool.clone(npcConfig);
      for (const [npcName, npcEntry] of this.data) {
        const modConfig = npcEntry.Config;
        if (modConfig && Object.keys(modConfig).length > 0) {
          const configClone = this.tool.clone(modConfig);
          ['loveAlias','loveInterest','romance'].forEach(key => delete configClone[key]);
          if (Config[npcName]) {
            Config[npcName] = this.tool.merge(Config[npcName], configClone, { mode: 'merge' });
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

    /** @param {{ [x: string]: any; }} statDefaults */
    applyStatDefaults(statDefaults) {
      if (!statDefaults || typeof statDefaults !== 'object') return statDefaults || {};
      for (const statName in this.customStats) {
        if (this.customStats.hasOwnProperty(statName)) {
          const customConfig = this.tool.clone(this.customStats[statName]);
          const position = customConfig.position;
          delete customConfig.position;
          if (statDefaults[statName]) {
            statDefaults[statName] = this.tool.merge(statDefaults[statName], customConfig, { mode: 'merge' });
          } else {
            statDefaults[statName] = customConfig;
          }
          if (position !== false) {
            if (!T.importantNpcStats.includes(statName)) {
              let insertPosition;
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

    /** @param {any[]} args */
    _vanillaNPCInit(...args) {
      const nam = args[0];
      const idx = V.NPCNameList.indexOf(nam);
      Object.keys(this.customStats).forEach(stat => V.NPCName[idx][stat] = 0);
    }

    /** @param {number[]} args */
    // @ts-ignore
    NPCSpawn(...args) {
      try { this.core.combat.Speech.init(); } catch {};
    }

    preInit() {
      // @ts-ignore
      this.Sidebar.init(this);
    }

    async Init() {
      NPCUtils.setupNpcData(this, 'init');
      isPossibleLoveInterest = (name) => NPCUtils.isPossibleLoveInterest(this, name);
    }

    loadInit() {
      this.injectModNPCs();
      NPCUtils.setupNpcData(this, 'init');
    }

    postInit() {
      // @ts-ignore
      this.NamedNPC.setup(this);
      NPCUtils.setupNpcData(this, 'postInit');
    }
  }

  await maplebirch.register('npc', new NPCManager(maplebirch), ['char']);
})();