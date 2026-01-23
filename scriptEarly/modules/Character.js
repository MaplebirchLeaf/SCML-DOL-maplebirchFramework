// @ts-check
/// <reference path='../../maplebirch.d.ts' />
(async() => {
  'use strict';

  class CharacterManager {
    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.core = core;
      this.log = core.tool.createLog('char');
      /**@type {string[]}*/this.facestyle = [];
      /**@type {string[]}*/this.facevariant = [];
      /**@type {Object<string,any>}*/
      this.handlers = { pre: [], post: [] };
      this.layers = {};
      this.core.trigger(':char-init', this);
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
			})
    }

    get ZIndices() {
      return ZIndices;
    }

    /** @param {FrameworkAddon} manager */
    async modifyPCModel(manager) {
      const oldSCdata = manager.gSC2DataManager.getSC2DataInfoAfterPatch();
			const SCdata = oldSCdata.cloneSC2DataInfo();
			const file = SCdata.scriptFileItems.getByNameWithOrWithoutPath('canvasmodel-main.js');
			const regex1 = /},\n\tpostprocess/;
      const regex2 = /},\n\tlayers/;
      if (regex1.test(file.content)) file.content = file.content.replace(regex1,'\tmaplebirch.char.process("pre", options);\n\t},\n\tpostprocess');
      if (regex2.test(file.content)) file.content = file.content.replace(regex2,'\tmaplebirch.char.process("post", options);\n\t},\n\tlayers');
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

    async faceStyleImagePaths() {
      for (const modName of this.core.modUtils.getModListNameNoAlias()) {
        try {
          const modZip = this.core.modUtils.getModZip(modName);
          if (!this.core.modUtils.getMod(modName).bootJson.addonPlugin?.some((/**@type {{ modName: string; }}*/p) => p.modName === 'BeautySelectorAddon') || !modZip) continue;
          let added = false;
          for (const filePath of Object.keys(modZip.zip.files)) {
            const faceIndex = filePath.indexOf('img/face/');
            if (faceIndex === -1) continue;
            const pathParts = filePath.substring(faceIndex + 9).split('/');
            if (pathParts.length < 2) continue;
            const firstFolder = pathParts[0];
            const secondFolder = pathParts[1];
            if (firstFolder === 'default') {
              if (pathParts.length >= 3 && secondFolder && !['aloof', 'catty', 'default', 'foxy', 'gloomy', 'sweet'].includes(secondFolder) && !this.facevariant.includes(secondFolder)) { this.facevariant.push(secondFolder); added = true; }
            } else if (firstFolder !== 'masks') {
              if (!this.facestyle.includes(firstFolder)) { this.facestyle.push(firstFolder); added = true; }
              if (pathParts.length >= 3 && secondFolder && !this.facevariant.includes(secondFolder)) { this.facevariant.push(secondFolder); added = true; }
            }
          }
          if (added && !this.core.modList.includes(modName)) this.core.modList.push(modName);
        } catch (e) {
          this.log(`${modName}:`, 'ERROR', e);
        }
      }
    }

    #faceStyleSetupOption() {
      
    }

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