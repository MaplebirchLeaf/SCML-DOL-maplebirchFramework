// @ts-check
/// <reference path='../../maplebirch.d.ts' />
(async() => {
  'use strict';

  /** @param {Function|string} name @param {Object} options @param {boolean} [options.variant=false] @returns {Function}  */
  function faceStyleSrcFn(name) {
    const Name = typeof name === 'function' ? name : () => name;
    return function (/**@type {{ facestyle: any; facevariant: any; }}*/layerOptions) {
      const image = Name(layerOptions);
      const paths = [
        `img/face/${layerOptions.facestyle}/${layerOptions.facevariant}/${image}.png`,
        `img/face/${layerOptions.facestyle}/${image}.png`,
        `img/face/default/${layerOptions.facevariant}/${image}.png`,
        `img/face/default/${image}.png`,
        `img/face/default/default/${image}.png`,
      ];
      for (let i = 0; i < paths.length; i++) if (!!loadImage(paths[i])) return paths[i];
      return paths[paths.length - 1];
    };
  }

  function mask(x=0,swap=false,width=256,height = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height;
    /**@type {any}*/const ctx = canvas.getContext('2d');
    let splitX = Math.max(0, Math.min(width, width / 2 + x));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let frame = 0; frame < 2; frame++) {
      const offsetX = frame * width;
      const whiteStart = swap ? offsetX + splitX : offsetX;
      const whiteWidth = swap ? width - splitX : splitX;
      if (whiteWidth > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(whiteStart, 0, whiteWidth, height);
      }
    }
    return canvas.toDataURL('image/png');
  }

  /**
   * @param {string} part
   * @param {{style: string;colours: {[x: string]: string | number;};}} gradient
   * @param {string} hairType
   * @param {number} hairLength
   * @param {string} prefilterName
   * @param {'charArt'|'closeUp'} type
   */
  function hairColourGradient(part, gradient, hairType, hairLength, prefilterName, type) {
    const filterPrototypeLibrary = setup.colours.hairgradients_prototypes[part][gradient.style];
    const filterPrototype = filterPrototypeLibrary[hairType] || filterPrototypeLibrary.all;
    const storedPositions = V.options.maplebirch.character[type].value[part][gradient.style];
    const blend = clone(filterPrototype);
    if (storedPositions && storedPositions.length === blend.colors.length) for (let i = 0; i < blend.colors.length; i++) blend.colors[i][0] = Math.max(0, Math.min(1, storedPositions[i]));
    const filter = {
      blend: blend,
      brightness: {
        gradient: filterPrototype.gradient,
        values: filterPrototype.values,
        adjustments: [[], []]
      },
      blendMode: 'hard-light'
    };
    for (const colorIndex in filter.blend.colors) {
      let lengthValue = filter.blend.lengthFunctions[0](hairLength, filter.blend.colors[colorIndex][0]);
      lengthValue = Math.max(0, Math.min(1, lengthValue));
      const colorData = setup.colours.hair_map[gradient.colours[colorIndex]].canvasfilter;
      // @ts-ignore
      filter.brightness.adjustments[colorIndex][0] = lengthValue;
      // @ts-ignore
      filter.brightness.adjustments[colorIndex][1] = colorData.brightness || 0;
      filter.blend.colors[colorIndex][0] = lengthValue;
      filter.blend.colors[colorIndex][1] = colorData.blend;
    }
    Renderer.mergeLayerData(filter, setup.colours.sprite_prefilters[prefilterName], true);
    return filter;
  }

  /** @param {{hair_sides_length:string; [x:string]:any; }} options */
  function preprocess(options) {
    (options.maplebirch ??= {}).char ??= {};
    options.maplebirch.char.mask = V.options.maplebirch.character.mask ?? 0;
    const gradients = (/**@type {string}*/style,/**@type {string}*/key,/**@type {string}*/part,/**@type {string}*/type,/**@type {string}*/lengthKey,/**@type {string}*/prefilter)=>{
      if (options[style] === 'gradient') {
        const gradient = options[key];
        const hairType = options[type];
        const length = hairLengthStringToNumber(options[lengthKey]);
        options.filters[prefilter] = hairColourGradient(part, gradient, hairType, length, prefilter, 'charArt');
        options.filters[`${prefilter}_close_up`] = hairColourGradient(part, gradient, hairType, length, prefilter, 'closeUp');
      }
    };
    gradients('hair_colour_style', 'hair_colour_gradient', 'sides', 'hair_sides_type', 'hair_sides_length', 'hair');
    gradients('hair_fringe_colour_style', 'hair_fringe_colour_gradient', 'fringe', 'hair_fringe_type', 'hair_sides_length', 'hair_fringe');
  }

  const layers = {
    hair_sides: {
      /** @param {{ head_mask_src: any; maplebirch: { char: { mask: number; }; }; }} options */
      masksrcfn(options) { return [options.head_mask_src, mask(options.maplebirch.char.mask)]; },
		},
    hair_sides_close_up: {
      /** @param {{ head_mask_src: any; maplebirch: { char: { mask: number; }; }; }} options */
      masksrcfn(options) { return [options.head_mask_src, mask(options.maplebirch.char.mask,true)]; },
      /** @param {{ hair_sides_type: any; hair_sides_length: any; }} options */
      srcfn(options) { return `img/hair/sides/${options.hair_sides_type}/${options.hair_sides_length}.png`; },
      /** @param {{ show_hair: any; hair_sides_type: any; }} options */
      showfn(options) { return !!options.show_hair && !!options.hair_sides_type; },
      /** @param {{ hair_sides_position: string; }} options */
      zfn(options) { return options.hair_sides_position === 'front' ? ZIndices.hairforwards : ZIndices.backhair; },
      /** @param {{ hair_colour_style: string; }} options */
      filtersfn(options) { return options.hair_colour_style === 'gradient' ? ['hair_close_up'] : ['hair']; },
      animation: 'idle'
		},
    hair_fringe: {
			/** @param {{ head_mask_src: any; fringe_mask_src: any; maplebirch: { char: { mask: number; }; }; }} options */
			masksrcfn(options) { return [(options.head_mask_src ? options.head_mask_src : options.fringe_mask_src),mask(options.maplebirch.char.mask)]; },
		},
    hair_fringe_close_up: {
      /** @param {{ head_mask_src: any; fringe_mask_src: any; maplebirch: { char: { mask: number; }; }; }} options */
			masksrcfn(options) { return [(options.head_mask_src ? options.head_mask_src : options.fringe_mask_src),mask(options.maplebirch.char.mask,true)]; },
			/** @param {{ hair_fringe_type: any; hair_fringe_length: any; }} options */
			srcfn(options) { return `img/hair/fringe/${options.hair_fringe_type}/${options.hair_fringe_length}.png`; },
			/** @param {{ show_hair: any; hair_fringe_type: any; }} options */
			showfn(options) { return !!options.show_hair && !!options.hair_fringe_type; },
			zfn() { return ZIndices.fronthair },
      /** @param {{ hair_fringe_colour_style: string; }} options */
      filtersfn(options) { return options.hair_fringe_colour_style === 'gradient' ? ['hair_fringe_close_up'] : ['hair_fringe']; },
      animation: 'idle',
		},
    freckles: { srcfn: faceStyleSrcFn('freckles') },
    ears: { srcfn: faceStyleSrcFn('ears') },
    eyes: { srcfn: faceStyleSrcFn('eyes') },
    sclera: {
      srcfn: faceStyleSrcFn((/**@type {{ eyes_bloodshot: any; }}*/options) => options.eyes_bloodshot ? 'sclera-bloodshot' : 'sclera')
    },
    left_iris: {
      srcfn: faceStyleSrcFn(
        (/**@type {{ trauma: any; eyes_half: any; }}*/options) => {
          const iris = options.trauma ? 'iris-empty' : 'iris';
          const half = options.eyes_half ? '-half-closed' : '';
          return `${iris}${half}`;
        }
      )
    },
    right_iris: {
      srcfn: faceStyleSrcFn(
        (/**@type {{ trauma: any; eyes_half: any; }}*/options) => {
          const iris = options.trauma ? 'iris-empty' : 'iris';
          const half = options.eyes_half ? '-half-closed' : '';
          return `${iris}${half}`;
        }
      )
    },
    eyelids: {
      srcfn: faceStyleSrcFn(
        (/**@type {{ eyes_half: any; }}*/options) => {
          const half = options.eyes_half ? '-half-closed' : '';
          return `eyelids${half}`;
        }
      )
    },
    lashes: {
      srcfn: faceStyleSrcFn(
        (/**@type {{ eyes_half: any; }}*/options) => {
          const half = options.eyes_half ? '-half-closed' : '';
          return `lashes${half}`;
        }
      )
    },
    makeup_eyeshadow: {
      srcfn: faceStyleSrcFn(
        (/**@type {{ eyes_half: any; }}*/options) => {
          const half = options.eyes_half ? '-half-closed' : '';
          return `makeup/eyeshadow${half}`;
        }
      )
    },
    makeup_mascara: {
      srcfn: faceStyleSrcFn(
        (/**@type {{ eyes_half: any; }}*/options) => {
          const half = options.eyes_half ? '-half-closed' : '';
          return `makeup/mascara${half}`;
        }
      )
    },
    makeup_blusher: { srcfn: faceStyleSrcFn('blusher') },
    brows: {
      srcfn: faceStyleSrcFn((/**@type {{ brows: any; }}*/options) => `brow-${options.brows}`)
    },
    mouth: { srcfn: faceStyleSrcFn((/**@type {{ mouth: any; }}*/options) => `mouth-${options.mouth}`) },
    makeup_lipstick: { srcfn: faceStyleSrcFn((/**@type {{ mouth: any; }}*/options) => `lipstick-${options.mouth}`)},
    blush: { srcfn: faceStyleSrcFn((/**@type {{ blush: any; }}*/options) => `blush${options.blush}`) },
    tears: { srcfn: faceStyleSrcFn((/**@type {{ tears: any; }}*/options) => `tear${options.tears}`) },
    makeup_mascara_tears: {
      srcfn: faceStyleSrcFn((/**@type {{ mascara_running: any; }}*/options) => `makeup/mascara${options.mascara_running}`)
    }
  }

  class CharacterManager {
    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.core = core;
      this.log = core.tool.createLog('char');
      this.mask = mask;
      /**@type {Map<string, string[]>}*/this.faceStyleMap = new Map();
      /**@type {Object<string,any>}*/
      this.handlers = { pre: [], post: [] };
      this.layers = {};
      this.core.trigger(':char-init', this);
      this.core.on(':language', () => this.#faceStyleSetupOption());
      this.core.once(':defineSugarcube', () => {
				const model = Renderer.CanvasModels.main;
				if (!model?.layers) return;
				const originalLayers = { ...model.layers };
				Object.defineProperty(model, 'layers', {
					get: () => this.core.tool.merge(originalLayers, this.layers, { 
						mode: 'merge', 
						filterFn: (/**@type {any}*/key, /**@type {null} */value, /**@type {number}*/depth) => depth > 3 || value == null ? false : true 
					}),
					enumerable: true,
					configurable: true
				});
			});
      this.core.tool.framework.onInit(() =>  this.#faceStyleSetupOption());
    }

    get ZIndices() {
      return ZIndices;
    }

    /** @param {FrameworkAddon} manager */
    async modifyPCModel(manager) {
      const oldSCdata = manager.gSC2DataManager.getSC2DataInfoAfterPatch();
      const SCdata = oldSCdata.cloneSC2DataInfo();
      const file = SCdata.scriptFileItems.getByNameWithOrWithoutPath('canvasmodel-main.js');
      /**@type {[RegExp, string][]}*/const replacements = [
        [/},\n\tpostprocess/g,'\tmaplebirch.char.process("pre", options);\n\t},\n\tpostprocess'],
        [/},\n\tlayers/g,'\tmaplebirch.char.process("post", options);\n\t},\n\tlayers']
      ];
      file.content = manager.replace(file.content, replacements);
      manager.addonReplacePatcher.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
    }

    /** @param {any[]} args */
    use(...args) {
      if (args.length === 0) { this.log('use 调用无参数', 'WARN'); return this; }
      if (args.length === 2) {
        const [type, fn] = args;
        if ((type === 'pre' || type === 'post') && typeof fn === 'function') { this.handlers[type].push(fn); }
        else { this.log(`use 参数类型错误: ${typeof type}, ${typeof fn}`, 'ERROR'); }
        return this;
      }
      if (args.length === 1 && args[0] && typeof args[0] === 'object') {
        const obj = args[0];
        this.layers = this.core.tool.merge(
          this.layers, 
          obj, { 
						mode: 'merge',
						filterFn: (/**@type {any}*/key, /**@type {null}*/value, /**@type {number}*/depth) => depth > 3 || value == null ? false : true  
					}
        );
        return this;
      }
      this.log(`use 调用格式错误: ${args}`, 'ERROR');
      return this;
    }

    /** @param {string} type @param {any} options */
    process(type, options) {
      const handlers = this.handlers[type] || [];
      for (const fn of handlers) {
        try { fn(options); } 
        catch (/**@type {any}*/e) { this.log(`${type}process 错误: ${e.message}`, 'ERROR'); }
      }
    }

    /** @param {FrameworkAddon} manager */
    async modifyFaceStyle(manager) {
      const oldSCdata = manager.gSC2DataManager.getSC2DataInfoAfterPatch();
      const SCdata = oldSCdata.cloneSC2DataInfo();
      const passageData = SCdata.passageDataItems.map;
      const files = ['Cheats', 'clothesTestingImageGenerate', 'Widgets Mirror', 'Widgets Settings'];
      for (const file of files) {
        const modify = passageData.get(file);
        /**@type {[RegExp, string][]}*/const replacements = [[/setup.faceStyleOptions.length gt/g,'Object.keys(setup.faceStyleOptions).length gte']];
        if (file === 'Widgets Mirror') replacements.push([/Object.keys\(setup.faceVariantOptions\[\$facestyle\]\).length gt/g,'Object.keys(setup.faceVariantOptions[$facestyle]).length gte']);
        modify.content = manager.replace(modify.content, replacements);
        passageData.set(file, modify);
      }
      SCdata.passageDataItems.back2Array();
      manager.addonTweeReplacer.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
    }

    async faceStyleImagePaths() {
      for (const modName of this.core.modUtils.getModListNameNoAlias()) {
        try {
          const modZip = this.core.modUtils.getModZip(modName);
          if (!this.core.modUtils.getMod(modName).bootJson.addonPlugin?.some((/**@type {{ modName: string; }}*/p) => p.modName === 'BeautySelectorAddon') || !modZip) continue;
          for (const filePath of Object.keys(modZip.zip.files)) {
            const faceIndex = filePath.indexOf('img/face/');
            if (faceIndex === -1) continue;
            const pathParts = filePath.substring(faceIndex + 9).split('/');
            if (pathParts.length < 2) continue;
            const firstFolder = pathParts[0];
            const secondFolder = pathParts[1];
            if (firstFolder === 'default') {
              if (!this.faceStyleMap.has('default')) this.faceStyleMap.set('default', []);
              if (pathParts.length >= 3 && secondFolder && !['aloof', 'catty', 'default', 'foxy', 'gloomy', 'sweet'].includes(secondFolder)) {
                /**@type {any}*/const variants = this.faceStyleMap.get('default');
                if (!variants.includes(secondFolder)) variants.push(secondFolder);
              }
            } else if (firstFolder !== 'masks') {
              if (!this.faceStyleMap.has(firstFolder)) this.faceStyleMap.set(firstFolder, []);
              if (pathParts.length >= 3 && secondFolder) {
                /**@type {any}*/const variants = this.faceStyleMap.get(firstFolder);
                if (!variants.includes(secondFolder)) variants.push(secondFolder);
              }
            }
          }
          if (this.faceStyleMap.size > 0 && !this.core.modList.includes(modName)) this.core.modList.push(modName);
        } catch (e) {
          this.log(`${modName}:`, 'ERROR', e);
        }
      }
    }

    #faceStyleSetupOption() {
      const faceStyleValues = Object.values(setup.faceStyleOptions);
      for (const value of faceStyleValues) if (!this.faceStyleMap.has(value)) this.faceStyleMap.set(value, []);
      for (const [style, variantObj] of Object.entries(setup.faceVariantOptions || {})) {
        if (!this.faceStyleMap.has(style)) this.faceStyleMap.set(style, []);
        /**@type {any}*/const variants = this.faceStyleMap.get(style);
        for (const value of Object.values(variantObj)) if (!variants.includes(value)) variants.push(value);
      }
      setup.faceStyleOptions = {};
      for (const [style] of this.faceStyleMap) setup.faceStyleOptions[convert(this.core.auto(style === 'default' ? 'traditional' : style), 'capitalize')] = style;
      setup.faceVariantOptions = {};
      for (const [style, variants] of this.faceStyleMap) {
        if (variants.length === 0) continue;
        setup.faceVariantOptions[style] = {};
        for (const variant of variants) {
          const translatedName = this.core.auto(variant === 'default' ? 'gentle' : variant);
          setup.faceVariantOptions[style][convert(translatedName, 'capitalize')] = variant;
        }
      }
    }

    faceStyleSrcFn = faceStyleSrcFn

    /* 渲染角色到容器 */
    async #renderCharacter() {
      const container = document.getElementById('maplebirch-character');
      if (!container) return;
      container.innerHTML = '';
      // 保存原始状态
      const originalModelClass = T.modelclass;
      const originalModelOptions = T.modeloptions;
      try {
        // 渲染光照层
        T.modelclass = Renderer.locateModel('lighting', 'panel');
        T.modeloptions = T.modelclass.defaultOptions();
        T.modelclass.reset();
        const lightingCanvas = T.modelclass.createCanvas(true);
        T.modelclass.render(lightingCanvas, T.modeloptions, Renderer.defaultListener);
        lightingCanvas.canvas.classList.add('maplebirch-canvas', 'maplebirch-lighting');
        lightingCanvas.canvas.style.zIndex = '1';
        container.appendChild(lightingCanvas.canvas);
        // 渲染主角色层
        T.modelclass = Renderer.locateModel('main', 'panel');
        T.modeloptions = T.modelclass.defaultOptions();
        T.modelclass.reset();
        // 准备角色身体和衣服
        wikifier('modelprepare-player-body');
        wikifier('modelprepare-player-clothes');
        const mainCanvas = T.modelclass.createCanvas(false);
        if (V.options.sidebarAnimations) {
          T.modelclass.animate(mainCanvas, T.modeloptions, Renderer.defaultListener);
        } else {
          T.modelclass.render(mainCanvas, T.modeloptions, Renderer.defaultListener);
        }
        mainCanvas.canvas.classList.add('maplebirch-canvas', 'maplebirch-main');
        mainCanvas.canvas.style.zIndex = '2';
        container.appendChild(mainCanvas.canvas);
        this.#adjustCanvasSize(container);
      } catch (error) {
        this.log('角色渲染错误:', 'ERROR');
      } finally {
        // 恢复原始状态
        T.modelclass = originalModelClass;
        T.modeloptions = originalModelOptions;
      }
    }

    /* 渲染覆盖层内容 */
    async #renderOverlay() {
      const overlay = document.getElementById('maplebirch-character-overlay');
      if (!overlay) return;
      overlay.innerHTML = '';
      // 创建左侧容器（避孕套）
      const leftContainer = document.createElement('div');
      leftContainer.className = 'maplebirch-overlay-left';
      // 创建右侧容器（防狼喷雾）
      const rightContainer = document.createElement('div');
      rightContainer.className = 'maplebirch-overlay-right';
      // 渲染避孕套
      if (V.settings.condomLevel >= 1 && V.condoms != null) {
        const condomContainer = document.createElement('div');
        condomContainer.className = 'maplebirch-condom-display';
        condomContainer.setAttribute('tooltip', `<span class='meek'><<lanSwitch 'Total condoms: ' '避孕套总数：'>>${V.condoms}</span>`);
        const condomText = document.createElement('span');
        condomText.className = 'maplebirch-condom-count';
        condomText.textContent = `${V.condoms}x`;
        const condomImg = document.createElement('img');
        condomImg.draggable = false;
        condomImg.src = 'img/ui/condom.png';
        condomImg.className = 'maplebirch-condom-icon';
        condomContainer.appendChild(condomText);
        condomContainer.appendChild(condomImg);
        leftContainer.appendChild(condomContainer);
      }
      // 渲染防狼喷雾
      if (V.spray != null) {
        const pepperContainer = document.createElement('div');
        pepperContainer.className = 'maplebirch-pepper-display';
        pepperContainer.setAttribute('tooltip', `<span class='def'><<lanSwitch 'Pepper sprays: ' '防狼喷雾：'>>${V.spray} / ${V.spraymax}</span>`);
        const showMultipleSprays = (V.options.pepperSprayDisplay === 'sprays' && V.spraymax <= 7) || (V.options.pepperSprayDisplay === 'both' && V.spraymax <= 5);
        if (showMultipleSprays) {
          const multipleContainer = document.createElement('div');
          multipleContainer.className = 'maplebirch-pepper-multiple';
          for (let i = 1; i <= V.spraymax; i++) {
            const pepperImg = document.createElement('img');
            pepperImg.draggable = false;
            pepperImg.src = V.spray >= i ? 'img/ui/pepperspray.png' : 'img/ui/emptyspray.png';
            pepperImg.className = 'maplebirch-pepper-icon';
            multipleContainer.appendChild(pepperImg);
          }
          pepperContainer.appendChild(multipleContainer);
        } else {
          const singleContainer = document.createElement('div');
          singleContainer.className = 'maplebirch-pepper-single';
          const pepperText = document.createElement('span');
          pepperText.className = 'maplebirch-pepper-count';
          pepperText.textContent = `${V.spray}×`;
          const pepperImg = document.createElement('img');
          pepperImg.draggable = false;
          pepperImg.src = 'img/ui/pepperspray.png';
          pepperImg.className = 'maplebirch-pepper-icon';
          singleContainer.appendChild(pepperText);
          singleContainer.appendChild(pepperImg);
          pepperContainer.appendChild(singleContainer);
        }
        rightContainer.appendChild(pepperContainer);
      }
      overlay.appendChild(leftContainer);
      overlay.appendChild(rightContainer);
    }

    /** 调整canvas尺寸 @param {{ querySelectorAll: (arg0: string) => any; clientWidth: any; clientHeight: any; }} container */
    #adjustCanvasSize(container) {
      const canvases = container.querySelectorAll('.maplebirch-canvas');
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      canvases.forEach((/**@type {{ width: any; clientWidth: any; height: any; clientHeight: any; style: { width: string; height: string; position: string; top: string; left: string; transform: string; }; }}*/canvas) => {
        // 获取原始尺寸
        const originalWidth = canvas.width || canvas.clientWidth;
        const originalHeight = canvas.height || canvas.clientHeight;
        if (!originalWidth || !originalHeight) return;
        // 计算缩放比例
        const scale = Math.min(containerWidth / originalWidth, containerHeight / originalHeight);
        canvas.style.width = `${originalWidth * scale}px`;
        canvas.style.height = `${originalHeight * scale}px`;
        canvas.style.position = 'absolute';
        canvas.style.top = '50%';
        canvas.style.left = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
      });
    }

    async render() {
      await this.#renderCharacter();
      await this.#renderOverlay();
    }

    preInit() {
      this.use('pre',preprocess);
      this.use(layers);
    }

    Init() {
      this.core.on('characterRender', async () => await this.render());
      // @ts-ignore
      this.transformation.inject();
    }

    loadInit() {
      // @ts-ignore
      this.transformation.inject();
    }
  }

  await maplebirch.register('char', new CharacterManager(maplebirch), ['var']);
})();