(async() => {
  'use strict';

  class ShopManager {
    static categoryMap = {
      all:        { icon: "all",      text: "View All",           widget: "AllShop" },
      overhead:   { icon: "overhead",   text: "View Headgear",    widget: "OverheadShop" },
      overupper:  { icon: "overupper",  text: "View Over Tops",   widget: "OverTopShop" },
      overlower:  { icon: "overlower",  text: "View Over Bottoms",widget: "OverBottomShop" },
      overoutfit: { icon: "overoutfit", text: "View Over Outfits",widget: "OverOutfitShop" },
      outfit:     { icon: "outfit",   text: "View Outfits",       widget: "OutfitShop" },
      upper:      { icon: "upper",    text: "View Tops",          widget: "TopShop" },
      lower:      { icon: "lower",    text: "View Bottoms",       widget: "BottomShop" },
      underoutfit:{ icon: "underoutfit", text: "View Under Outfits", widget: "UnderOutfitShop" },
      underupper: { icon: "underupper", text: "View Under Tops",  widget: "UnderTopShop" },
      underlower: { icon: "underlower", text: "View Under Bottoms",  widget: "UnderBottomShop" },
      head:       { icon: "head",     text: "View Head Accessories", widget: "HeadShop" },
      face:       { icon: "face",     text: "View Face Accessories", widget: "FaceShop" },
      neck:       { icon: "neck",     text: "View Neck Accessories", widget: "NeckShop" },
      handheld:   { icon: "handheld", text: "View Handheld Items",   widget: "HandheldShop" },
      hands:      { icon: "hand",     text: "View Hand Accessories", widget: "HandsShop" },
      legs:       { icon: "legs",     text: "View Legwear",       widget: "LegsShop" },
      feet:       { icon: "feet",     text: "View Shoes",         widget: "FeetShop" },
      genital:    { icon: "strapon",  text: "View Genital Wear",  widget: "GenitalShop" }
    };

    constructor(core) {
      this.tool = core.tool;
      this.log = this.tool.createLog('shop');
      this.widgets = [];
      this.passages = [];
      this.shopText = {};
    }

    async loadShopFromJson(modName, path) {
      try {
        const modLoader = maplebirch.modLoader;
        if (!modLoader) return false;
        const modZip = modLoader.getModZip(modName);
        if (!modZip || !modZip.modInfo || !modZip.modInfo.bootJson || !modZip.modInfo.bootJson.additionFile) return false;
        const additionFileSet = new Set(modZip.modInfo.bootJson.additionFile);
        if (!additionFileSet.has(path)) { modLoader.logger.error(`商店配置文件未在 additionFile 中声明: ${path}`); return false;}
        const file = modZip.zip.file(path);
        if (!file) return false;
        const json = await file.async('text');
        const shopConfig = JSON.parse(json);
        this.regShop(
          shopConfig.shopName,
          shopConfig.clothesType,
          shopConfig.type || [],
          shopConfig.content || {},
          shopConfig.options || {}
        );
        return true;
      } catch (error) {
        this.log(`加载商店JSON失败 (${path}): ${error.message}`, 'ERROR');
        return false;
      }
    }

    regShop(shopName, clothesType, type = [], content = {}, options = {}) {
      this.#Text(shopName, type, content);
      const passageContent = this.#shopPassageCreate(shopName);
      this.passages.push({
        name: shopName + ' Shop',
        content: passageContent
      });
      const widgetContent = this.#shopWidgetCreate(shopName, clothesType, options);
      this.widgets.push(`\n\n<!-- ${shopName} Shop Widget Start -->`);
      this.widgets.push(widgetContent);
      this.widgets.push(`<!-- ${shopName} Shop Widget End -->\n`); 
      this.log(`创建商店: ${shopName}`, 'DEBUG');
    }

    #Text(shopName, type = [], content = {}) {
      const allowed = ['intro', 'beforeType', 'afterType', 'beforeChangingRoom', 'afterChangingRoom', 'beforeLeave'];
      const filteredTypes = type.filter(t => allowed.includes(t));
      this.shopText[shopName] = filteredTypes;
      filteredTypes.forEach(t => {
        const key = `${shopName}_${t}`;
        const contentItem = content[t];
        if (!contentItem) {
          this.log(`'${shopName}' 缺少类型 '${t}'`, 'WARN');
          return;
        }
        this.tool.text.reg(key, output => {
          if (!Array.isArray(contentItem)) return;
          contentItem.forEach(item => this.#processContentItem(item, output));
        });
      });
    }

    #processContentItem(item, output) {
      if (typeof item === 'string') {
        output.text(item);
        return;
      }
      if (!item || typeof item !== 'object') return;
      const method = item.method || 'text';
      const text = item.text || '';
      const style = item.style;
      if (output[method]) {
        style ? output[method](text, style) : output[method](text);
      } else {
        output.text(text, style);
      }
    }

    #shopPassageCreate(shopName) {
      let html = `<<set $bus to "${shopName}Shop">>\n`;
      html += `<div id="clothingShop-div" class="main-shop-div">\n`;
      html += `\t<<${shopName}Shop-main>>\n`;
      html += `</div>`;
      return html;
    }

    #shopWidgetCreate(shopName, clothesType, options) {
      const defaultOptions = {
        outside: 0,
        location: shopName + 'Shop',
        stress: false,
        stressMacro: null,
        changingRoom: true,
        changingRoomCondition: true,
        exitPassage: 'Exit ' + shopName + ' Shop',
      }

      options = {...defaultOptions, ...options};

      let html = `<<widget '${shopName}Shop-main'>>\n`;
      html += `\t<<if $tryOn.autoReset isnot false>><<tryOnReset>><</if>><<unset $tempDisable>>\n`;
      html += `\t<<set $outside to '${options.outside}'>>\n`;
      html += `\t<<set $location to '${options.location}'>>\n`;
      html += `\t<<effects>>\n`;
      html += `\t<<set $shopName = '${shopName}'>>\n`;

      if (this.shopText[shopName].includes('intro')) html += `\t<<maplebirchTextOutput "${shopName+'_intro'}">><br><br>\n`;
      if (options.stress) html += `\t<<if $stress gte $stressmax>>\n\t\t<<${options.stressMacro}>>\n\t<<else>>\n`;

      const modUtils = window.maplebirch.modUtils;
      const hasReOverfits = modUtils.getMod('ReOverfits');
      html += `\t\t<<lanSwitch 'Warmth: ' '保暖度：'>>\n`;
      html += `\t\t<<warmthscale>>\n`;
      html += `\t\t<div id="warmth-description">\n`;
      html += `\t\t\t<<warmth_description>>\n`;
      html += `\t\t</div>\n`;
      html += `\t\t<br><br>\n`;

      if (this.shopText[shopName].includes('beforeType')) html += `\t\t<<maplebirchTextOutput "${shopName+'_beforeType'}">><br><br>\n`;

      if (Array.isArray(clothesType)) {
        const groupBreaks = ['lower', 'underlower', 'neck', 'feet'];
        clothesType.forEach((type, index) => {
          if (!hasReOverfits && ['overhead', 'overupper', 'overlower'].includes(type)) return;
          const category = ShopManager.categoryMap[type];
          if (category) {
            html += `\t\t<<clothingcategoryicon "${category.icon}">>\n`;
            html += `\t\t<<lanLink "${category.text}">><<replace "#clothingShop-div">><<${category.widget}>><</replace>><</lanLink>>\n`;
            if (index < clothesType.length - 1) html += `\t\t<br>\n`;
            if (groupBreaks.includes(type) && index < clothesType.length - 1) html += `\t\t<br>\n`;
          }
        });
      }

      html += `\t\t<br><br>\n`;
      if (this.shopText[shopName].includes('afterType')) html += `\t\t<<maplebirchTextOutput "${shopName+'_afterType'}">><br><br>\n`;
      html += `\t\t<<run linkifyDivs('.button-back-to-shop')>>\n`;

      if (options.changingRoom) {
        if (this.shopText[shopName].includes('beforeChangingRoom')) html += `\t\t<<maplebirchTextOutput "${shopName+'_beforeChangingRoom'}">><br><br>\n`;
        html += `\t\t<<if ${options.changingRoomCondition}>>\n`;
        html += `\t\t\t<<icon "hanger.png">><<lanLink [[Changing Room|Changing Room]]>>\n`;
        html += `\t\t\t\t<<ShowUnderEquip "normal">>\n`;
        html += `\t\t\t\t<<set $wardrobeExit to "${shopName + ' Shop'}">>\n`;
        html += `\t\t\t<</lanLink>>\n`;
        html += `\t\t\t<br>\n`;
        html += `\t\t<</if>>\n`;
        if (this.shopText[shopName].includes('afterChangingRoom')) html += `\t\t<<maplebirchTextOutput "${shopName+'_afterChangingRoom'}">><br><br>\n`;
      }

      html += `\t\t<br>\n`;
      if (this.shopText[shopName].includes('beforeLeave')) html += `\t\t<<maplebirchTextOutput "${shopName+'_beforeLeave'}">><br><br>\n`;

      html += `\t\t<<if $tryOn.value isnot 0>>\n`;
      html += `\t\t\t<<icon "hanger.png">><<lanLink 'Return Clothes'>>\n`;
      html += `\t\t\t\t<<clothingReset>>\n`;
      html += `\t\t\t\t<<updatesidebarimg>>\n`;
      html += `\t\t\t\t<<updatesidebardescription>>\n`;
      html += `\t\t\t\t<<updateallure>>\n`;
      html += `\t\t\t\t<<updatewarmthscale>>\n`;
      html += `\t\t\t\t<<updatewarmthdescription>>\n`;
      html += `\t\t\t\t<<updateclothingshop>>\n`;
      html += `\t\t\t\t<<run updateMoment()>>\n`;
      html += `\t\t\t<</lanLink>>\n`;
      html += `\t\t\t<br>\n`;
      
      html += `\t\t\t<<if $tryOn.value gt 0 and $tryOn.value lte $money>>\n`;
      html += `\t\t\t\t<<sendItemsToDropdown>>\n`;
      html += `\t\t\t\t<<highicon>><<lanLink 'Buy Clothes'>><<buyTryOnClothes "wear">><<updateclothingshop>><</lanLink>>\n`;
      html += `\t\t\t\t<br>\n`;
      html += `\t\t\t\t<<wardrobeicon>><<lanLink 'Buy Clothes And Send To Wardrobe'>>\n`;
      html += `\t\t\t\t\t<<buyTryOnClothes "wardrobe">>\n`;
      html += `\t\t\t\t\t<<updatesidebarmoney>>\n`;
      html += `\t\t\t\t\t<<updatesidebarimg>>\n`;
      html += `\t\t\t\t\t<<updatesidebardescription>>\n`;
      html += `\t\t\t\t\t<<updateallure>>\n`;
      html += `\t\t\t\t\t<<updatewarmthscale>>\n`;
      html += `\t\t\t\t\t<<updatewarmthdescription>>\n`;
      html += `\t\t\t\t\t<<updateclothingshop>>\n`;
      html += `\t\t\t\t\t<<run updateMoment()>>\n`;
      html += `\t\t\t\t<</lanLink>>\n`;
      html += `\t\t\t\t<br>\n`;
      html += `\t\t\t<</if>>\n`;
      
      html += `\t\t<<else>>\n`;
      html += `\t\t\t<<getouticon>>\n`;
      html += `\t\t\t<<lanLink [[Leave|${options.exitPassage}]]>>\n`;
      html += `\t\t\t\t<<shopClothingFilterReset>>\n`;
      html += `\t\t\t\t<<ShowUnderEquip "normal">>\n`;
      html += `\t\t\t\t<<ShowUnderEquip "over">>\n`;
      html += `\t\t\t\t<<shopHoodCheck>>\n`;
      html += `\t\t\t\t<<shopCommandoCheck>>\n`;
      html += `\t\t\t<</lanLink>>\n`;
      html += `\t\t\t<br><br>\n`;
      html += `\t\t<</if>>\n`;

      if (options.stress) html += `\t<</if>>\n`;
      html += `<</widget>>`;

      return html;
    }

    async #widgetInit(passageData) {
      const widgetContent = this.widgets.join('\n\n');
      const widgetData = {
        id: 0,
        name: 'Maplebirch Shops Widgets',
        position: '100,100',
        size: '100,100',
        tags: ['widget'],
        content: widgetContent
      };
      
      if (passageData.has(widgetData.name)) {
        this.log(`跳过已存在的部件段落: ${widgetData.name}`, 'DEBUG');
      } else {
        passageData.set(widgetData.name, widgetData);
        this.log(`创建部件段落: ${widgetData.name}`, 'DEBUG');
      }
      
      return passageData;
    }

    async #passageInit(passageData) {
      this.passages.forEach(passage => {
        const passageDataItem = {
          id: 0,
          name: passage.name,
          position: '100,100',
          size: '100,100',
          tags: ['exitCheckBypass'],
          content: passage.content
        };
        
        if (passageData.has(passageDataItem.name)) {
          this.log(`跳过已存在的段落: ${passageDataItem.name}`, 'DEBUG');
        } else {
          passageData.set(passageDataItem.name, passageDataItem);
          this.log(`创建商店段落: ${passageDataItem.name}`, 'DEBUG');
        }
      });
      
      return passageData;
    }

    async beforePatchModToGame() {
      const modSC2DataManager = window.modSC2DataManager;
      const addonTweeReplacer = window.addonTweeReplacer;
      const oldSCdata = modSC2DataManager.getSC2DataInfoAfterPatch();
      const SCdata = oldSCdata.cloneSC2DataInfo();
      const passageData = SCdata.passageDataItems.map;
      
      await this.#passageInit(passageData);
      await this.#widgetInit(passageData);
      
      SCdata.passageDataItems.back2Array();
      addonTweeReplacer.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
    }

  }

  await maplebirch.register('shop', new ShopManager(maplebirch), ['tool']);
})();