(async() => {
  'use strict';
  if (!window.maplebirch) {
    console.log('%c[maplebirch] 错误: 核心系统未初始化', 'color: #C62828; font-weight: bold;');
    return;
  }

  const maplebirch = window.maplebirch;

  class CharacterManager {
    constructor() {
      this.tool = null;
      this.log = null;
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
      if (V.condomLvl >= 1 && V.condoms != null) {
        const condomContainer = document.createElement('div');
        condomContainer.className = 'maplebirch-condom-display';
        condomContainer.setAttribute('tooltip', `<span class='meek'>避孕套总数：${V.condoms}</span>`);
        const condomImg = document.createElement('img');
        condomImg.draggable = false;
        condomImg.src = 'img/ui/condom.png';
        condomImg.className = 'maplebirch-condom-icon';
        const condomText = document.createElement('span');
        condomText.className = 'maplebirch-condom-count';
        condomText.textContent = `×${V.condoms}`;
        condomContainer.appendChild(condomImg);
        condomContainer.appendChild(condomText);
        leftContainer.appendChild(condomContainer);
      }
      // 渲染防狼喷雾
      if (V.spray != null) {
        const pepperContainer = document.createElement('div');
        pepperContainer.className = 'maplebirch-pepper-display';
        pepperContainer.setAttribute('tooltip', `<span class='def'>防狼喷雾：${V.spray} / ${V.spraymax}</span>`);
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
          const pepperImg = document.createElement('img');
          pepperImg.draggable = false;
          pepperImg.src = 'img/ui/pepperspray.png';
          pepperImg.className = 'maplebirch-pepper-icon';
          const pepperText = document.createElement('span');
          pepperText.className = 'maplebirch-pepper-count';
          pepperText.textContent = `×${V.spray}`;
          singleContainer.appendChild(pepperImg);
          singleContainer.appendChild(pepperText);
          pepperContainer.appendChild(singleContainer);
        }
        rightContainer.appendChild(pepperContainer);
      }
      overlay.appendChild(leftContainer);
      overlay.appendChild(rightContainer);
    }

    /* 调整canvas尺寸 */
    #adjustCanvasSize(container) {
      const canvases = container.querySelectorAll('.maplebirch-canvas');
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      canvases.forEach(canvas => {
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
      this.tool = maplebirch.tool;
      this.log = this.tool.createLog('char');
    }

    Init() {
      maplebirch.on('characterRender', async () => await maplebirch.char.render());
    }
  }

  await maplebirch.register('char', new CharacterManager(), ['var']);
})();