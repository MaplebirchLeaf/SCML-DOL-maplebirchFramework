// @ts-check
/// <reference path='../../maplebirch.d.ts' />
(() => {
  const NPCClothes = (() => {
    /** @type {Array<{[x:string]:any}>} */
    const npcClothesSets = [];

    function merge() {
      for (const clothesSet of npcClothesSets) {
        if (setup.npcClothesSets.some((/**@type {{ name: any; }}*/set) => set.name === clothesSet.name)) {
          Clothing.log(`服装套装 ${clothesSet.name} 已存在，跳过添加`, 'WARN'); 
          continue;
        }
        setup.npcClothesSets.push(clothesSet);
      }
      npcClothesSets.length = 0;
    }

    /** @param {{ name: string; type: string; gender: string; outfit: number; upper: { name: string; integrity_max: number; word: string; action: string; readonly desc: string; };lower: { name: string; integrity_max: number; word: string; action: string; readonly desc: string; };desc: string;}[]} configs */
    function addClothes(...configs) {
      if (configs.length === 0) return;
      const npcClothes = Array.isArray(configs[0]) ? configs[0] : configs;
      npcClothes.forEach(config => {
        const { name, type = 'custom', gender = 'n', outfit = 0, upper, lower, desc } = config;
        if (!name) return;
        const upper_config = typeof upper === 'string' ? { name: upper } : upper;
        const lower_config = typeof lower === 'string' ? { name: lower } : lower;
        if (!upper_config.name || !lower_config.name) { Clothing.log('衣物配置缺少name属性', 'ERROR'); return; }
        const new_upper = {
          name: upper_config.name,
          integrity_max: upper_config.integrity_max !== undefined ? upper_config.integrity_max : 100,
          word: upper_config.word ?? 'a',
          action: upper_config.action ?? 'lift',
          desc: upper_config.desc ?? upper_config.name
        }
        const new_lower = {
          name: lower_config.name,
          integrity_max: lower_config.integrity_max !== undefined ? lower_config.integrity_max : 100,
          word: lower_config.word ?? 'n',
          action: lower_config.action ?? 'lift',
          desc: lower_config.desc ?? lower_config.name
        }
        const newClothes = {
          name, type, gender, outfit,
          clothes: { upper: new_upper, lower: new_lower },
          desc: desc ?? `${upper_config.name}和${lower_config.name}`
        };
        npcClothesSets.push(newClothes);
      });
      if (setup.npcClothesSets) merge();
    }

    /** @param {NPCManager} manager */
    async function Init(manager) {
      try {
        await loadWardrobe('maplebirch', 'data/npc-clothes.yaml');
        for (const npcName of manager.NPCNameList) if (!clothes[npcName]) clothes[npcName] = new Clothing(npcName, ['naked']);
        addClothes(
          {
            name: 'neutralDefault',
            type: 'default',
            gender: 'n',
            outfit: 0,
            upper: { name: 'shirt', integrity_max: 100, word: 'a', action: 'lift', get desc() { return lanSwitch('shirt','衬衫'); } },
            lower: { name: 'cargo trousers', integrity_max: 100, word: 'n', action: 'pull', get desc() { return lanSwitch('cargo trousers','工装裤'); } },
            get desc() { return lanSwitch('Shirt and cargo trousers','衬衫和工装裤'); }
          },
          {
            name: 'hermDefault',
            type: 'default',
            gender: 'h',
            outfit: 0,
            upper: { name: 'shirt', integrity_max: 100, word: 'a', action: 'lift', get desc() { return lanSwitch('shirt','衬衫'); } },
            lower: { name: 'miniskirt', integrity_max: 100, word: 'a', action: 'lift', get desc() { return lanSwitch('miniskirt','迷你裙'); } },
            get desc() { return lanSwitch('Shirt and miniskirt','衬衫和迷你裙'); }
          }
        );
        merge();
      } catch (/**@type {any}*/e) { Clothing.log(`NPC服装初始化失败: ${e.message}`, 'ERROR'); }
    }

    /** @type {Config[]} */
    const NPCSidebarData = [];

    /**
     * 导入NPC服装库数据
     * @param {string} modName 模组名称
     * @param {JSZip} modZip 模组压缩包
     * @param {string|string[]} filePaths 文件路径或路径数组
     */
    async function importNPCClothes(modName, modZip, filePaths) {
      try {
        if (!modZip) { Clothing.log('无效的模组压缩包', 'ERROR'); return []; }
        const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
        const imagePaths = [];
        const body_parts = ['head', 'face', 'neck', 'upper', 'lower', 'legs', 'feet', 'hands'];
        for (const filePath of paths) {
          const file = modZip.zip.file(filePath);
          if (!file) continue;
          const content = await file.async('text');
          let data;
          if (filePath.endsWith('.json')) {
            data = JSON.parse(content);
          } else if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
            data = maplebirch.yaml.load(content);
          } else {
            Clothing.log(`不支持的文件格式: ${filePath}`, 'WARN');
            continue;
          }
          const fileName = filePath.split('/').pop()?.split('.')[0] || 'unknown';
          
          const dataArray = Array.isArray(data) ? data : [data];
          for (let i = 0; i < dataArray.length; i++) {
            const item = dataArray[i];
            if (!item.name) continue;
            const npcName = maplebirch.tool.convert(item.name, 'capitalize');
            if (item.body) imagePaths.push(item.body);
            const collectLayerImages = (/** @type {any} */ layers) => { if (Array.isArray(layers)) for (const layer of layers) if (layer?.img) imagePaths.push(layer.img); };
            body_parts.forEach(part => collectLayerImages(item[part]));
            const key = dataArray.length > 1 ? `${modName}_${fileName}` : fileName;
            const config = new Config(
              key,
              npcName,
              item.body ?? '',
              { head: item.head ?? [],face: item.face ?? [],neck: item.neck ?? [],upper: item.upper ?? [],lower: item.lower ?? [],legs: item.legs ?? [],feet: item.feet ?? [],hands: item.hands ?? [] }
            );
            NPCSidebarData.push(config);
            if (maplebirch.npc.Sidebar.display) {
              if (!maplebirch.npc.Sidebar.display.has(npcName)) maplebirch.npc.Sidebar.display.set(npcName, new Set());
              maplebirch.npc.Sidebar.display.get(npcName).add(key);
            }
          }
        }
        return imagePaths;
      } catch (/**@type {any}*/e) {
        Clothing.log(`导入NPC服装库数据失败: ${e.message}`, 'ERROR');
        return [];
      }
    }

    class Config {
      /**
       * @param {string} key
       * @param {string} name
       * @param {string} body
       * @param {Object<string,Array<{cond:any;zIndex:number|string;img:string}>>} part
       */
      constructor(key, name, body, part) {
        this.key = key;
        this.name = name;
        this.body = body;
        this.head = part.head ?? [];
        this.face = part.face ?? [];
        this.neck = part.neck ?? [];
        this.upper = part.upper ?? [];
        this.lower = part.lower ?? [];
        this.legs = part.legs ?? [];
        this.feet = part.feet ?? [];
        this.hands = part.hands ?? [];
      }
    }
    
    /** @param {any} cond @returns {boolean} */
    function evaluate(cond) {
      if (Array.isArray(cond)) return cond.every(subCond => evaluate(subCond));
      if (typeof cond === 'boolean') return cond;
      if (typeof cond === 'string') try { return new Function('return ' + cond)(); } catch (e) { Clothing.log(`条件求值失败: ${cond}`, 'WARN'); return false; }
      if (typeof cond === 'function') try { return cond(); } catch (/**@type {any}*/e) { Clothing.log(`条件函数执行失败: ${e.message}`, 'WARN'); return false; }
      return false;
    }
    
    function clothesLayers() {
      const clothesMap = new Map();
      const parts = ['head', 'face', 'neck', 'upper', 'lower', 'legs', 'feet', 'hands'];
      for (const config of NPCSidebarData) {
        /**@type {any}*/const result = { key: config.key, body: config.body };
        for (const part of parts) {
          // @ts-ignore
          const layers = config[part];
          if (!Array.isArray(layers) || layers.length === 0) continue;
          const layer = layers.find(layer => layer.cond == null || evaluate(layer.cond));
          if (layer) result[part] = { zIndex: layer.zIndex || 'auto', img: layer.img };
        }
        clothesMap.set(config.name, result);
      }
      return clothesMap;
    }

    /**@type {{[x:string]:any}}*/
    const wardrobe = {};
    /**@type {{[x:string]:any}}*/
    const clothes = {};

    /** @param {string} modName @param {string} filePath */
    async function loadWardrobe(modName='maplebirch', filePath='data/npc-clothes.yaml') {
      try {
        const modZip = maplebirch.modUtils.getModZip(modName);
        if (!modZip) { Clothing.log('未找到maplebirch模组', 'ERROR'); return; }
        if (typeof filePath !== 'string') { Clothing.log('路径格式错误', 'ERROR'); return; }
        const content = await modZip.zip.file(filePath).async('text');
        let data;
        if (filePath.endsWith('.json')) {
          data = JSON.parse(content);
        } else if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
          data = maplebirch.yaml.load(content);
        }
        for (const [key, value] of Object.entries(data)) wardrobe[key] = value;
      } catch (/**@type {any}*/e) {
        Clothing.log(`加载服装配置失败: ${e.message}`, 'ERROR');
      }
    }

    /** @param {{[x:string]:any}} selected @returns {{[x:string]:any}} */
    function mergeWithNaked(selected) {
      if (!selected || typeof selected !== 'object') return wardrobe['naked'];
      const base = wardrobe['naked'];
      /**@type {{[x:string]:any}}*/const result = {};
      const allParts = new Set([...Object.keys(base),...Object.keys(selected)]);
      for (const part of allParts) {
        if (selected[part] != null) { result[part] = selected[part]; }
        else if (base[part] != null) { result[part] = base[part]; }
      }
      return result;
    }

    class Clothing {
      static log = new Function;

      /** @param {string} name @param {string[]} outfits */
      constructor(name, outfits) {
        this.name = name;
        this.outfits = outfits || ['naked'];
        /**@type {{[x:string]:Array<{key:string,cond?:any}>}}*/
        this.location = {};
        /**@type {Array<{key:string,cond?:any}>}*/
        this.global = [];
      }

      /** @param {string} location @param {string} key @param {any} [cond] */
      register(location, key, cond) {
        if (!wardrobe[key]) { Clothing.log(`服装配置 ${key} 不存在`, 'WARN'); return; }
        if (location === '*') {
          this.global.push({ key, cond });
        } else {
          if (!this.location[location]) this.location[location] = [];
          this.location[location].push({ key, cond });
        }
        if (!this.outfits.includes(key)) this.outfits.push(key);
      }

      get worn() {
        const location = maplebirch.npc.Schedules.location[this.name];
        let selected = wardrobe['naked'];
        if (location && this.location[location] && this.location[location].length > 0) for (const item of this.location[location]) if (evaluate(item.cond)) { selected = wardrobe[item.key]; break; }
        if (selected === wardrobe['naked'] && this.global && this.global.length > 0) for (const item of this.global) if (evaluate(item.cond)) { selected = wardrobe[item.key]; break; }
        return mergeWithNaked(selected);
      }
    }

    /** @param {string} npcName @param {string} location @param {string} key @param {any} [cond] */
    function register(npcName, location, key, cond) {
      if (!clothes[npcName]) { clothes[npcName] = new Clothing(npcName, ['naked', key]); }
      else { if (!clothes[npcName].outfits.includes(key)) clothes[npcName].outfits.push(key); }
      clothes[npcName].register(location, key, cond);
      return clothes[npcName];
    }

    /** @param {string} npcName */
    function NPCWornClothing(npcName) {
      const clothing = clothes[npcName];
      if (!clothing) return Clothing.log(`没有对应NPC:${npcName}数据`, 'WARN');
      return clothing.worn;
    }

    Object.defineProperties(Clothing, {
      add:    { value: addClothes },
      init:   { value: Init },
      import: { value: importNPCClothes },
      load:   { value: loadWardrobe },
      layers: { get: () => clothesLayers() },
      wardrobe: { get: () => wardrobe },
      clothes:  { get: () => clothes },
      register: { value: register },
      worn:   { value: NPCWornClothing },
    })

    return Clothing;
  })()

  maplebirch.once(':npc-init', (/**@type {NPCManager}*/data) => {
    NPCClothes.log = data.log;
    Object.assign(data, { Clothes: NPCClothes, });
  });
})();