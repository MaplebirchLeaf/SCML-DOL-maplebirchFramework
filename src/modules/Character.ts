// ./src/modules/Character.ts

import maplebirch, { MaplebirchCore, createlog } from '../core';
import { merge, loadImage, convert } from '../utils';
import AddonPlugin from './AddonPlugin';
import Transformation from './CharacterAddon/Transformation';

interface FaceStyleOptions {
  facestyle: string;
  facevariant: string;
  [key: string]: any;
}

interface HairGradientOptions {
  style: string;
  colours: { [x: string]: string | number };
}

interface HairGradientPreprocessOptions {
  hair_sides_length: string;
  hair_colour_style?: string;
  hair_colour_gradient?: HairGradientOptions;
  hair_sides_type?: string;
  hair_fringe_colour_style?: string;
  hair_fringe_colour_gradient?: HairGradientOptions;
  hair_fringe_type?: string;
  maplebirch?: {
    char?: {
      mask?: number;
    };
    [key: string]: any;
  };
  filters?: {
    [key: string]: any;
  };
  [key: string]: any;
}

interface LayerConfig {
  masksrcfn?: (options: any) => any;
  srcfn?: (options: any) => string;
  showfn?: (options: any) => boolean;
  zfn?: (options: any) => number;
  filtersfn?: (options: any) => string[];
  animation?: string;
  [key: string]: any;
}

function faceStyleSrcFn(name: Function | string) {
  const Name = typeof name === 'function' ? name : () => name;
  return function (layerOptions: FaceStyleOptions): string {
    const image = Name(layerOptions);
    const paths = [
      `img/face/${layerOptions.facestyle}/${layerOptions.facevariant}/${image}.png`,
      `img/face/${layerOptions.facestyle}/${image}.png`,
      `img/face/default/${layerOptions.facevariant}/${image}.png`,
      `img/face/default/${image}.png`,
      `img/face/default/default/${image}.png`
    ];
    for (let i = 0; i < paths.length; i++) if (!!loadImage(paths[i])) return paths[i];
    return paths[paths.length - 1];
  };
}

function mask(x = 0, swap = false, width = 256, height = 256): string {
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
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

function hairColourGradient(
  part: string,
  gradient: HairGradientOptions,
  hairType: string,
  hairLength: number,
  prefilterName: string,
  type: 'charArt' | 'closeUp'
): {
  blend: {
    colors: Array<[number, string]>;
    lengthFunctions?: Array<Function>;
    [key: string]: any;
  };
  brightness: {
    gradient: any;
    values: any;
    adjustments: [number, number][][];
  };
  blendMode: string;
  [key: string]: any;
} {
  const filterPrototypeLibrary = setup.colours!.hairgradients_prototypes![part][gradient.style];
  const filterPrototype = filterPrototypeLibrary[hairType] || filterPrototypeLibrary.all!;
  const storedPositions = V.options?.maplebirch?.character?.[type]?.value?.[part]?.[gradient.style];
  const blend = clone(filterPrototype);
  if (storedPositions && storedPositions.length === blend.colors.length) for (let i = 0; i < blend.colors.length; i++) blend.colors[i][0] = Math.max(0, Math.min(1, storedPositions[i]));
  const filter = {
    blend: blend,
    brightness: {
      gradient: filterPrototype.gradient,
      values: filterPrototype.values,
      adjustments: [[], []] as [number, number][][]
    },
    blendMode: 'hard-light' as const
  };
  for (const colorIndex in filter.blend.colors) {
    let lengthValue = filter.blend.lengthFunctions![0](hairLength, filter.blend.colors[colorIndex][0]);
    lengthValue = Math.max(0, Math.min(1, lengthValue));
    const colorData = setup.colours!.hair_map[gradient.colours[colorIndex] as string].canvasfilter;
    filter.brightness.adjustments[colorIndex as any as number][0] = lengthValue;
    filter.brightness.adjustments[colorIndex as any as number][1] = colorData.brightness || 0;
    filter.blend.colors[colorIndex as any as number][0] = lengthValue;
    filter.blend.colors[colorIndex as any as number][1] = colorData.blend!;
  }
  Renderer.mergeLayerData(filter, setup.colours!.sprite_prefilters[prefilterName], true);
  return filter;
}

function preprocess(options: HairGradientPreprocessOptions) {
  (options.maplebirch ??= {}).char ??= {};
  options.maplebirch.char.mask = V.options.maplebirch.character.mask ?? 0;
  const gradients = (style: string, key: string, part: string, type: string, lengthKey: string, prefilter: string) => {
    if (options[style] === 'gradient') {
      const gradient = options[key] as HairGradientOptions;
      const hairType = options[type] as string;
      const length = hairLengthStringToNumber(options[lengthKey] as string);
      options.filters = options.filters || {};
      options.filters[prefilter] = hairColourGradient(part, gradient, hairType, length, prefilter, 'charArt');
      options.filters[`${prefilter}_close_up`] = hairColourGradient(part, gradient, hairType, length, prefilter, 'closeUp');
    }
  };
  gradients('hair_colour_style', 'hair_colour_gradient', 'sides', 'hair_sides_type', 'hair_sides_length', 'hair');
  gradients('hair_fringe_colour_style', 'hair_fringe_colour_gradient', 'fringe', 'hair_fringe_type', 'hair_sides_length', 'hair_fringe');
}

const layers: Record<string, LayerConfig> = {
  hair_sides: {
    masksrcfn(options: { head_mask_src: any; maplebirch: { char: { mask: number } } }) {
      return [options.head_mask_src, mask(options.maplebirch.char.mask)];
    }
  },
  hair_sides_close_up: {
    masksrcfn(options: { head_mask_src: any; maplebirch: { char: { mask: number } } }) {
      return [options.head_mask_src, mask(options.maplebirch.char.mask, true)];
    },
    srcfn(options: { hair_sides_type: any; hair_sides_length: any }) {
      return `img/hair/sides/${options.hair_sides_type}/${options.hair_sides_length}.png`;
    },
    showfn(options: { show_hair: any; hair_sides_type: any }) {
      return !!options.show_hair && !!options.hair_sides_type;
    },
    zfn(options: { hair_sides_position: string }) {
      return options.hair_sides_position === 'front' ? maplebirch.char.ZIndices.hairforwards : maplebirch.char.ZIndices.backhair;
    },
    filtersfn(options: { hair_colour_style: string }) {
      return options.hair_colour_style === 'gradient' ? ['hair_close_up'] : ['hair'];
    },
    animation: 'idle'
  },
  hair_fringe: {
    masksrcfn(options: { head_mask_src: any; fringe_mask_src: any; maplebirch: { char: { mask: number } } }) {
      return [options.head_mask_src ? options.head_mask_src : options.fringe_mask_src, mask(options.maplebirch.char.mask)];
    }
  },
  hair_fringe_close_up: {
    masksrcfn(options: { head_mask_src: any; fringe_mask_src: any; maplebirch: { char: { mask: number } } }) {
      return [options.head_mask_src ? options.head_mask_src : options.fringe_mask_src, mask(options.maplebirch.char.mask, true)];
    },
    srcfn(options: { hair_fringe_type: any; hair_fringe_length: any }) {
      return `img/hair/fringe/${options.hair_fringe_type}/${options.hair_fringe_length}.png`;
    },
    showfn(options: { show_hair: any; hair_fringe_type: any }) {
      return !!options.show_hair && !!options.hair_fringe_type;
    },
    zfn() {
      return maplebirch.char.ZIndices.front_hair;
    },
    filtersfn(options: { hair_fringe_colour_style: string }) {
      return options.hair_fringe_colour_style === 'gradient' ? ['hair_fringe_close_up'] : ['hair_fringe'];
    },
    animation: 'idle'
  },
  freckles: {
    srcfn: faceStyleSrcFn('freckles')
  },
  ears: {
    srcfn: faceStyleSrcFn('ears')
  },
  eyes: {
    srcfn: faceStyleSrcFn('eyes')
  },
  sclera: {
    srcfn: faceStyleSrcFn((options: { eyes_bloodshot: any }) => (options.eyes_bloodshot ? 'sclera-bloodshot' : 'sclera'))
  },
  left_iris: {
    srcfn: faceStyleSrcFn((options: { trauma: any; eyes_half: any }) => {
      const iris = options.trauma ? 'iris-empty' : 'iris';
      const half = options.eyes_half ? '-half-closed' : '';
      return `${iris}${half}`;
    })
  },
  right_iris: {
    srcfn: faceStyleSrcFn((options: { trauma: any; eyes_half: any }) => {
      const iris = options.trauma ? 'iris-empty' : 'iris';
      const half = options.eyes_half ? '-half-closed' : '';
      return `${iris}${half}`;
    })
  },
  eyelids: {
    srcfn: faceStyleSrcFn((options: { eyes_half: any }) => {
      const half = options.eyes_half ? '-half-closed' : '';
      return `eyelids${half}`;
    })
  },
  lashes: {
    srcfn: faceStyleSrcFn((options: { eyes_half: any }) => {
      const half = options.eyes_half ? '-half-closed' : '';
      return `lashes${half}`;
    })
  },
  makeup_eyeshadow: {
    srcfn: faceStyleSrcFn((options: { eyes_half: any }) => {
      const half = options.eyes_half ? '-half-closed' : '';
      return `makeup/eyeshadow${half}`;
    })
  },
  makeup_mascara: {
    srcfn: faceStyleSrcFn((options: { eyes_half: any }) => {
      const half = options.eyes_half ? '-half-closed' : '';
      return `makeup/mascara${half}`;
    })
  },
  makeup_blusher: {
    srcfn: faceStyleSrcFn('blusher')
  },
  brows: {
    srcfn: faceStyleSrcFn((options: { brows: any }) => `brow-${options.brows}`)
  },
  mouth: {
    srcfn: faceStyleSrcFn((options: { mouth: any }) => `mouth-${options.mouth}`)
  },
  makeup_lipstick: {
    srcfn: faceStyleSrcFn((options: { mouth: any }) => `lipstick-${options.mouth}`)
  },
  blush: {
    srcfn: faceStyleSrcFn((options: { blush: any }) => `blush${options.blush}`)
  },
  tears: {
    srcfn: faceStyleSrcFn((options: { tears: any }) => `tear${options.tears}`)
  },
  makeup_mascara_tears: {
    srcfn: faceStyleSrcFn((options: { mascara_running: any }) => `makeup/mascara${options.mascara_running}`)
  }
};

class Character {
  readonly log: ReturnType<typeof createlog>;
  readonly mask = mask;
  readonly faceStyleSrcFn = faceStyleSrcFn;
  readonly faceStyleMap: Map<string, string[]> = new Map();
  readonly handlers: { [x: string]: any } = { pre: [], post: [] };
  layers: object = {};
  readonly transformation: Transformation;

  constructor(readonly core: MaplebirchCore) {
    this.log = createlog('char');
    this.mask = mask;
    this.faceStyleSrcFn = faceStyleSrcFn;
    this.transformation = new Transformation(this);
    this.core.on(':language', () => this._faceStyleSetupOption(), 'face style setup options');
    this.core.once(':sugarcube', () => {
      const model = Renderer.CanvasModels.main;
      if (!model?.layers) return;
      const originalLayers = { ...model.layers };
      Object.defineProperty(model, 'layers', {
        get: () =>
          merge(originalLayers, this.layers, {
            mode: 'merge',
            filterFn: (key: any, value: null, depth: number) => (depth > 3 || value == null ? false : true)
          }),
        enumerable: true,
        configurable: true
      });
    });
    this.core.tool.onInit(() => this._faceStyleSetupOption());
  }

  get ZIndices() {
    return ZIndices;
  }

  async modifyPCModel(manager: AddonPlugin) {
    const oldSCdata = manager.gSC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const file = SCdata.scriptFileItems.getByNameWithOrWithoutPath('canvasmodel-main.js');
    const replacements = [
      [/},\n\tpostprocess/, '\tmaplebirch.char.process("pre", options);\n\t},\n\tpostprocess'],
      [/},\n\tlayers/, '\tmaplebirch.char.process("post", options);\n\t},\n\tlayers']
    ];
    file.content = manager.replace(file.content, replacements);
    manager.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
  }

  use(...args: any) {
    if (args.length === 0) {
      this.log('use 调用无参数', 'WARN');
      return this;
    }
    if (args.length === 2) {
      const [type, fn] = args;
      if ((type === 'pre' || type === 'post') && typeof fn === 'function') {
        this.handlers[type].push(fn);
      } else {
        this.log(`use 参数类型错误: ${typeof type}, ${typeof fn}`, 'ERROR');
      }
      return this;
    }
    if (args.length === 1 && args[0] && typeof args[0] === 'object') {
      const obj = args[0];
      this.layers = merge(this.layers, obj, {
        mode: 'merge',
        filterFn: (key: any, value: null, depth: number) => (depth > 3 || value == null ? false : true)
      });
      return this;
    }
    this.log(`use 调用格式错误: ${args}`, 'ERROR');
    return this;
  }

  process(type: 'pre' | 'post', options: any) {
    const handlers = this.handlers[type] || [];
    this.core.var.optionsCheck();
    for (const fn of handlers) {
      try {
        fn(options);
      } catch (e: any) {
        this.log(`${type}process 错误: ${e.message}`, 'ERROR');
      }
    }
  }

  async modifyFaceStyle(manager: AddonPlugin) {
    const oldSCdata = manager.gSC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const passageData = SCdata.passageDataItems.map;
    const files = ['Cheats', 'clothesTestingImageGenerate', 'Widgets Mirror', 'Widgets Settings'];
    for (const file of files) {
      const modify = passageData.get(file);
      const replacements = [[/setup.faceStyleOptions.length gt/g, 'Object.keys(setup.faceStyleOptions).length gte']];
      if (file === 'Widgets Mirror') replacements.push([/Object.keys\(setup.faceVariantOptions\[\$facestyle\]\).length gt/g, 'Object.keys(setup.faceVariantOptions[$facestyle]).length gte']);
      modify.content = manager.replace(modify.content, replacements);
      passageData.set(file, modify);
    }
    SCdata.passageDataItems.back2Array();
    manager.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
  }

  async faceStyleImagePaths() {
    for (const modName of this.core.modUtils.getModListNameNoAlias()) {
      try {
        const modZip = this.core.modUtils.getModZip(modName);
        if (!this.core.modUtils.getMod(modName).bootJson.addonPlugin?.some((p: { modName: string }) => p.modName === 'BeautySelectorAddon') || !modZip) continue;
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
              const variants = this.faceStyleMap.get('default') as any;
              if (!variants.includes(secondFolder)) variants.push(secondFolder);
            }
          } else if (firstFolder !== 'masks') {
            if (!this.faceStyleMap.has(firstFolder)) this.faceStyleMap.set(firstFolder, []);
            if (pathParts.length >= 3 && secondFolder) {
              const variants = this.faceStyleMap.get(firstFolder) as any;
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

  private _faceStyleSetupOption() {
    const faceStyleValues = Object.values(setup.faceStyleOptions) as string[];
    for (const value of faceStyleValues) if (!this.faceStyleMap.has(value)) this.faceStyleMap.set(value, []);
    for (const [style, variantObj] of Object.entries(setup.faceVariantOptions || {})) {
      if (!this.faceStyleMap.has(style)) this.faceStyleMap.set(style, []);
      const variants = this.faceStyleMap.get(style)!;
      for (const value of Object.values(variantObj as Record<string, string>)) if (!variants.includes(value)) variants.push(value);
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

  async #renderCharacter() {
    const container = document.getElementById('maplebirch-character');
    if (!container) return;
    container.innerHTML = '';
    const originalModelClass = T.modelclass;
    const originalModelOptions = T.modeloptions;
    try {
      T.modelclass = Renderer.locateModel('lighting', 'panel');
      T.modeloptions = T.modelclass.defaultOptions();
      T.modelclass.reset();
      const lightingCanvas = T.modelclass.createCanvas(true);
      T.modelclass.render(lightingCanvas, T.modeloptions, Renderer.defaultListener);
      lightingCanvas.canvas.classList.add('maplebirch-canvas', 'maplebirch-lighting');
      lightingCanvas.canvas.style.zIndex = '1';
      container.appendChild(lightingCanvas.canvas);
      T.modelclass = Renderer.locateModel('main', 'panel');
      T.modeloptions = T.modelclass.defaultOptions();
      T.modelclass.reset();
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
      T.modelclass = originalModelClass;
      T.modeloptions = originalModelOptions;
    }
  }

  async #renderOverlay() {
    const overlay = document.getElementById('maplebirch-character-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    const leftContainer = document.createElement('div');
    leftContainer.className = 'maplebirch-overlay-left';
    const rightContainer = document.createElement('div');
    rightContainer.className = 'maplebirch-overlay-right';
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

  #adjustCanvasSize(container: HTMLElement) {
    const canvases = container.querySelectorAll<HTMLCanvasElement>('.maplebirch-canvas');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    canvases.forEach(canvas => {
      const originalWidth = canvas.width || canvas.clientWidth;
      const originalHeight = canvas.height || canvas.clientHeight;
      if (!originalWidth || !originalHeight) return;
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
    this.use('pre', preprocess);
    this.use(layers);
  }

  Init() {
    this.core.on(':modhint', async () => await this.render(), 'character render');
    this.transformation.inject();
  }

  loadInit() {
    this.transformation.inject();
  }
}

(function (maplebirch): void {
  'use strict';
  void maplebirch.register('char', Object.seal(new Character(maplebirch)), ['var']);
})(maplebirch);

export default Character;
