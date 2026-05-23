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
  colours: string[];
}

interface HairGradientPreprocessOptions {
  hair_sides_length: string;
  hair_fringe_length: string;
  hair_colour_style?: string;
  hair_colour_gradient?: HairGradientOptions;
  hair_sides_type?: string;
  hair_sides_position?: string;
  hair_fringe_colour_style?: string;
  hair_fringe_colour_gradient?: HairGradientOptions;
  hair_fringe_type?: string;
  show_hair?: boolean;
  head_mask_src?: string | string[];
  headMask?: string[];
  fringe_mask_src?: string | null;
  maplebirch?: {
    char?: {
      mask?: number;
      rotation?: number;
      mask_src?: string;
      mask_src_close_up?: string;
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

type FaceStyleNameFn = (options: FaceStyleOptions) => string;
type CharacterProcessType = 'pre' | 'post';
type CharacterProcessHandler = (options: any) => void;
type CharacterProcessInput = CharacterProcessHandler | Function;
type CharacterLayerMap = Record<string, LayerConfig>;

function faceStyleSrcFn(name: FaceStyleNameFn | string) {
  const getName: FaceStyleNameFn = typeof name === 'function' ? name : () => name;
  return function (layerOptions: FaceStyleOptions): string {
    const image = getName(layerOptions);
    const paths = [
      `img/face/${layerOptions.facestyle}/${layerOptions.facevariant}/${image}.png`,
      `img/face/${layerOptions.facestyle}/${image}.png`,
      `img/face/default/${layerOptions.facevariant}/${image}.png`,
      `img/face/default/${image}.png`,
      `img/face/default/default/${image}.png`
    ];
    for (const path of paths) if (!!loadImage(path)) return path;
    return paths[paths.length - 1];
  };
}

function faceStyleRootSrcFn(name: FaceStyleNameFn | string) {
  const getName: FaceStyleNameFn = typeof name === 'function' ? name : () => name;
  return function (layerOptions: FaceStyleOptions): string {
    const image = getName(layerOptions);
    if (characterLegacyImagePathsEnabled()) return `img/face/${layerOptions.facestyle}/${image}.png`;
    return faceStyleSrcFn(name)(layerOptions);
  };
}

function characterLegacyImagePathsEnabled() {
  const version =
    gameVersion() ??
    (globalThis as any).StartConfig?.version ??
    (setup as any).version ??
    (setup as any).gameVersion ??
    (V as any).version ??
    (V as any).gameVersion ??
    (State as any)?.variables?.version;
  const match = String(version ?? '').match(/\d+(?:\.\d+)*/);
  if (!match) return false;
  const left = match[0].split('.').map(part => Number(part) || 0);
  const right = [0, 5, 9, 0];
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff < 0;
  }
  return false;
}

function characterImagePath(path: string, legacyPath = path.replace(/-/g, '')) {
  return characterLegacyImagePathsEnabled() ? legacyPath : path;
}

function gameVersion() {
  try {
    return maplebirch.gameVersion;
  } catch {
    return undefined;
  }
}

const maskCache = new Map<string, string>();

function mask(x = 0, rotation = 0, swap = false, width = 256, height = 256): string {
  rotation = Math.max(-90, Math.min(90, rotation));
  x = Math.max(-width / 2, Math.min(width / 2, x));
  const cacheKey = `${x}|${rotation}|${swap}|${width}|${height}`;
  const cached = maskCache.get(cacheKey);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const splitX = Math.max(0, Math.min(width, width / 2 + x));
  for (let frame = 0; frame < 2; frame++) {
    const offsetX = frame * width;
    const whiteStart = swap ? offsetX + splitX : offsetX;
    const whiteWidth = swap ? width - splitX : splitX;
    if (whiteWidth > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(whiteStart, 0, whiteWidth, height);
    }
  }
  let result: string;
  if (rotation !== 0) {
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const newWidth = Math.ceil(canvas.width * cos + canvas.height * sin);
    const newHeight = Math.ceil(canvas.width * sin + canvas.height * cos);
    const rotatedCanvas = document.createElement('canvas');
    rotatedCanvas.width = newWidth;
    rotatedCanvas.height = newHeight;
    const rctx = rotatedCanvas.getContext('2d');
    if (!rctx) return '';
    rctx.translate(newWidth / 2, newHeight / 2);
    rctx.rotate(rad);
    rctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    result = rotatedCanvas.toDataURL('image/png');
  } else {
    result = canvas.toDataURL('image/png');
  }
  maskCache.set(cacheKey, result);
  return result;
}

function hairColourGradient(part: string, gradient: HairGradientOptions, hairType: string, hairLength: number, prefilterName: string, type: 'charArt' | 'closeUp'): any {
  const filterPrototypeLibrary = setup.colours?.hairgradients_prototypes?.[part]?.[gradient.style];
  if (!filterPrototypeLibrary) return Renderer.emptyLayerFilter();
  const filterPrototype = filterPrototypeLibrary[hairType] || filterPrototypeLibrary.all;
  if (!filterPrototype) return Renderer.emptyLayerFilter();
  const storedPositions = V.options?.maplebirch?.character?.[type]?.value?.[part]?.[gradient.style];
  const blend = clone(filterPrototype);
  if (storedPositions && storedPositions.length === blend.colors.length) for (let i = 0; i < blend.colors.length; i++) blend.colors[i][0] = Math.max(0, Math.min(1, storedPositions[i]));
  const filter = {
    blend,
    brightness: {
      gradient: filterPrototype.gradient,
      values: filterPrototype.values,
      adjustments: blend.colors.map(() => [0, 0] as [number, number])
    },
    blendMode: 'hard-light' as const
  };
  for (let index = 0; index < filter.blend.colors.length; index++) {
    const color = filter.blend.colors[index];
    const lengthFn = filter.blend.lengthFunctions?.[0];
    let lengthValue = typeof lengthFn === 'function' ? lengthFn(hairLength, color[0]) : color[0];
    lengthValue = Math.max(0, Math.min(1, lengthValue));
    const colourKey = gradient.colours[index];
    const colorData = setup.colours?.hair_map?.[colourKey]?.canvasfilter;
    if (!colorData) continue;
    filter.brightness.adjustments[index][0] = lengthValue;
    filter.brightness.adjustments[index][1] = colorData.brightness || 0;
    color[0] = lengthValue;
    color[1] = colorData.blend;
  }

  const prefilter = setup.colours?.sprite_prefilters?.[prefilterName];
  if (prefilter) Renderer.mergeLayerData(filter, prefilter, true);
  return filter;
}

function preprocess(options: HairGradientPreprocessOptions) {
  (options.maplebirch ??= {}).char ??= {};
  const characterOptions = V.options?.maplebirch?.character ?? {};
  options.maplebirch.char.mask = characterOptions.mask ?? 0;
  options.maplebirch.char.rotation = characterOptions.rotation ?? 0;
  options.maplebirch.char.mask_src = mask(characterOptions.mask ?? 0, characterOptions.rotation ?? 0);
  options.maplebirch.char.mask_src_close_up = mask(characterOptions.mask ?? 0, characterOptions.rotation ?? 0, true);
  const gradients = (style: string, key: string, part: string, type: string, lengthKey: string, prefilter: string) => {
    if (options[style] !== 'gradient') return;
    const gradient = options[key] as HairGradientOptions | undefined;
    if (!gradient) return;
    const hairType = options[type] as string;
    const length = hairLengthStringToNumber(options[lengthKey] as string);
    options.filters ??= {};
    options.filters[prefilter] = hairColourGradient(part, gradient, hairType, length, prefilter, 'charArt');
    options.filters[`${prefilter}_close_up`] = hairColourGradient(part, gradient, hairType, length, prefilter, 'closeUp');
  };
  gradients('hair_colour_style', 'hair_colour_gradient', 'sides', 'hair_sides_type', 'hair_sides_length', 'hair');
  gradients('hair_fringe_colour_style', 'hair_fringe_colour_gradient', 'fringe', 'hair_fringe_type', 'hair_fringe_length', 'hair_fringe');
}

const layers: CharacterLayerMap = {
  hair_sides: {
    masksrcfn(options: HairGradientPreprocessOptions) {
      const headMask = options.headMask?.length ? options.headMask : options.head_mask_src;
      return headMask || options.maplebirch?.char?.mask_src || mask(options.maplebirch?.char?.mask, options.maplebirch?.char?.rotation);
    }
  },
  hair_sides_close_up: {
    masksrcfn(options: HairGradientPreprocessOptions) {
      return options.maplebirch?.char?.mask_src_close_up || mask(options.maplebirch?.char?.mask, options.maplebirch?.char?.rotation, true);
    },
    srcfn(options: HairGradientPreprocessOptions) {
      return `img/hair/sides/${options.hair_sides_type}/${options.hair_sides_length}.png`;
    },
    showfn(options: HairGradientPreprocessOptions) {
      return !!options.show_hair && !!options.hair_sides_type && !options.headMask?.length && !options.head_mask_src;
    },
    zfn(options: HairGradientPreprocessOptions) {
      return options.hair_sides_position === 'front' ? maplebirch.char.ZIndices.hair_forward : maplebirch.char.ZIndices.backhair;
    },
    filtersfn(options: { hair_colour_style: string }) {
      return options.hair_colour_style === 'gradient' ? ['hair_close_up'] : ['hair'];
    },
    animation: 'idle'
  },
  hair_fringe: {
    masksrcfn(options: HairGradientPreprocessOptions) {
      const headMask = options.headMask?.length ? options.headMask : options.head_mask_src;
      return headMask || options.fringe_mask_src || options.maplebirch?.char?.mask_src || mask(options.maplebirch?.char?.mask, options.maplebirch?.char?.rotation);
    }
  },
  hair_fringe_close_up: {
    masksrcfn(options: HairGradientPreprocessOptions) {
      return options.maplebirch?.char?.mask_src_close_up || mask(options.maplebirch?.char?.mask, options.maplebirch?.char?.rotation, true);
    },
    srcfn(options: HairGradientPreprocessOptions) {
      return `img/hair/fringe/${options.hair_fringe_type}/${options.hair_fringe_length}.png`;
    },
    showfn(options: HairGradientPreprocessOptions) {
      return !!options.show_hair && !!options.hair_fringe_type && !options.headMask?.length && !options.head_mask_src && !options.fringe_mask_src;
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
    srcfn: faceStyleSrcFn((options: FaceStyleOptions) => (options.eyes_bloodshot ? 'sclera-bloodshot' : 'sclera'))
  },
  left_iris: {
    srcfn: faceStyleSrcFn((options: FaceStyleOptions) => {
      const iris = options.trauma ? 'iris-empty' : 'iris';
      const half = options.eyes_half ? '-half-closed' : '';
      return `${iris}${half}`;
    })
  },
  right_iris: {
    srcfn: faceStyleSrcFn((options: FaceStyleOptions) => {
      const iris = options.trauma ? 'iris-empty' : 'iris';
      const half = options.eyes_half ? '-half-closed' : '';
      return `${iris}${half}`;
    })
  },
  eyelids: {
    srcfn: faceStyleSrcFn((options: FaceStyleOptions) => {
      const half = options.eyes_half ? '-half-closed' : '';
      return `eyelids${half}`;
    })
  },
  lashes: {
    srcfn: faceStyleSrcFn((options: FaceStyleOptions) => {
      const half = options.eyes_half ? '-half-closed' : '';
      return `lashes${half}`;
    })
  },
  makeup_eyeshadow: {
    srcfn: faceStyleSrcFn((options: FaceStyleOptions) => {
      const half = options.eyes_half ? '-half-closed' : '';
      return `makeup/eyeshadow${half}`;
    })
  },
  makeup_mascara: {
    srcfn: faceStyleSrcFn((options: FaceStyleOptions) => {
      const half = options.eyes_half ? '-half-closed' : '';
      return `makeup/mascara${half}`;
    })
  },
  makeup_blusher: {
    srcfn: faceStyleSrcFn('blusher')
  },
  brows: {
    srcfn: faceStyleSrcFn((options: FaceStyleOptions) => `brow-${options.brows}`)
  },
  mouth: {
    srcfn: faceStyleRootSrcFn((options: FaceStyleOptions) => `mouth-${options.mouth}`)
  },
  makeup_lipstick: {
    srcfn: faceStyleRootSrcFn((options: FaceStyleOptions) => `lipstick-${options.mouth}`)
  },
  blush: {
    srcfn: faceStyleRootSrcFn((options: FaceStyleOptions) => characterImagePath(`blush-${options.blush}`, `blush${options.blush}`))
  },
  tears: {
    srcfn: faceStyleRootSrcFn((options: FaceStyleOptions) => characterImagePath(`tears-${options.tears}`, `tear${options.tears}`))
  },
  makeup_mascara_tears: {
    srcfn: faceStyleSrcFn((options: FaceStyleOptions) => `makeup/mascara${options.mascara_running}`)
  }
};

class Character {
  readonly log: ReturnType<typeof createlog>;
  readonly mask = mask;
  readonly faceStyleSrcFn = faceStyleSrcFn;
  readonly faceStyleMap: Map<string, string[]> = new Map();
  readonly handlers: Record<CharacterProcessType, CharacterProcessHandler[]> = {
    pre: [],
    post: []
  };
  readonly transformation: Transformation;
  layers: CharacterLayerMap = {};

  constructor(readonly core: MaplebirchCore) {
    this.log = createlog('char');
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
            filterFn: (_key: any, value: any, depth: number) => depth <= 3 && value != null
          }),
        enumerable: true,
        configurable: true
      });
      if (Renderer.CanvasModelCaches?.main) Renderer.CanvasModelCaches.main = {};
    });
    this.core.tool.onInit(() => this._faceStyleSetupOption());
  }

  get ZIndices() {
    return ZIndices;
  }

  async modifyPCModel(manager: AddonPlugin) {
    const oldSCdata = manager.SC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const file = SCdata.scriptFileItems.getByNameWithOrWithoutPath('canvasmodel-main.js');
    const replacements: [RegExp, string][] = [
      [/},\n\tpostprocess/, '\tmaplebirch.char.process("pre", options);\n\t},\n\tpostprocess'],
      [/},\n\tlayers/, '\tmaplebirch.char.process("post", options);\n\t},\n\tlayers']
    ];
    file.content = manager.replace(file.content, replacements);
    manager.modUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
  }

  use(type: CharacterProcessType, fn: CharacterProcessInput): this;
  use(layerMap: CharacterLayerMap): this;
  use(...args: any[]): this {
    if (args.length === 0) {
      this.log('use 调用无参数', 'WARN');
      return this;
    }
    if (args.length === 2) {
      const [type, fn] = args;
      if ((type === 'pre' || type === 'post') && typeof fn === 'function') {
        this.handlers[type].push(fn as CharacterProcessHandler);
      } else {
        this.log(`use 参数类型错误: ${typeof type}, ${typeof fn}`, 'ERROR');
      }
      return this;
    }
    if (args.length === 1 && args[0] && typeof args[0] === 'object') {
      this.layers = merge(this.layers, args[0], {
        mode: 'merge',
        filterFn: (_key: any, value: any, depth: number) => depth <= 3 && value != null
      });
      return this;
    }
    this.log('use 调用格式错误', 'ERROR');
    return this;
  }

  process(type: CharacterProcessType, options: any) {
    const handlers = this.handlers[type] || [];
    this.core.var.optionsCheck();
    for (const fn of handlers) {
      try {
        fn(options);
      } catch (error: any) {
        this.log(`${type}process 错误: ${error?.message || error}`, 'ERROR', error);
      }
    }
  }

  async modifyFaceStyle(manager: AddonPlugin) {
    const oldSCdata = manager.SC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const passageData = SCdata.passageDataItems.map;
    const files = ['Cheats', 'clothesTestingImageGenerate', 'Widgets Mirror', 'Widgets Settings'];
    for (const file of files) {
      const modify = passageData.get(file);
      if (!modify?.content) continue;
      const replacements: [RegExp, string][] = [[/setup.faceStyleOptions.length gt/g, 'Object.keys(setup.faceStyleOptions).length gte']];
      if (file === 'Widgets Mirror') replacements.push([/Object.keys\(setup.faceVariantOptions\[\$facestyle\]\).length gt/g, 'Object.keys(setup.faceVariantOptions[$facestyle]).length gte']);
      modify.content = manager.replace(modify.content, replacements);
      passageData.set(file, modify);
    }
    SCdata.passageDataItems.back2Array();
    manager.modUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
  }

  async faceStyleImagePaths() {
    for (const modName of this.core.modUtils.getModListNameNoAlias()) {
      try {
        const mod = this.core.modUtils.getMod(modName);
        const hasBeautySelectorAddon = mod?.bootJson.addonPlugin?.some((plugin: { modName: string }) => plugin.modName === 'BeautySelectorAddon');
        if (!hasBeautySelectorAddon) continue;
        const zip = this.core.modUtils.getModZip(modName)?.getZipFile?.();
        const files = zip?.files;
        if (!files) continue;
        let hasFacePath = false;
        for (const filePath of Object.keys(files)) {
          const faceIndex = filePath.indexOf('img/face/');
          if (faceIndex === -1) continue;
          const pathParts = filePath.substring(faceIndex + 9).split('/');
          if (pathParts.length < 2) continue;
          hasFacePath = true;
          const firstFolder = pathParts[0];
          const secondFolder = pathParts[1];
          if (firstFolder === 'default') {
            this.addFaceOption('default');
            const isBuiltinVariant = ['aloof', 'catty', 'default', 'foxy', 'gloomy', 'sweet'].includes(secondFolder);
            if (pathParts.length >= 3 && secondFolder && !isBuiltinVariant) this.addFaceOption('default', secondFolder);
          } else if (firstFolder !== 'masks') {
            this.addFaceOption(firstFolder);
            if (pathParts.length >= 3 && secondFolder) this.addFaceOption(firstFolder, secondFolder);
          }
        }
        if (hasFacePath && !this.core.modList.includes(modName)) this.core.modList.push(modName);
      } catch (error) {
        this.log(`[faceStyleImagePaths] ${modName}:`, 'ERROR', error);
      }
    }
  }

  private addFaceOption(style: string, variant?: string) {
    const variants = this.faceStyleMap.get(style) ?? [];
    if (!this.faceStyleMap.has(style)) this.faceStyleMap.set(style, variants);
    if (variant && !variants.includes(variant)) variants.push(variant);
  }

  private label(key: string, fallback = key) {
    try {
      return this.core.auto(key) || fallback;
    } catch {
      this.log(`缺少语言文本: ${key}`, 'WARN');
      return fallback;
    }
  }

  private _faceStyleSetupOption() {
    const currentStyleOptions = setup.faceStyleOptions || {};
    const currentVariantOptions = setup.faceVariantOptions || {};
    for (const value of Object.values(currentStyleOptions) as string[]) this.addFaceOption(value);
    for (const [style, variantObj] of Object.entries(currentVariantOptions)) {
      this.addFaceOption(style);
      for (const value of Object.values(variantObj as Record<string, string>)) this.addFaceOption(style, value);
    }
    const nextStyleOptions: Record<string, string> = {};
    const nextVariantOptions: Record<string, Record<string, string>> = {};
    for (const [style] of this.faceStyleMap) {
      const key = style === 'default' ? 'traditional' : style;
      nextStyleOptions[convert(this.label(key), 'title')] = style;
    }
    for (const [style, variants] of this.faceStyleMap) {
      if (variants.length === 0) continue;
      nextVariantOptions[style] = {};
      for (const variant of variants) {
        const key = variant === 'default' ? 'gentle' : variant;
        nextVariantOptions[style][convert(this.label(key), 'title')] = variant;
      }
    }
    setup.faceStyleOptions = nextStyleOptions;
    setup.faceVariantOptions = nextVariantOptions;
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
      this.log('角色渲染错误:', 'ERROR', error);
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
    this.core.on(':modhint', () => void this.render(), 'character render');
    this.transformation.inject();
  }

  loadInit() {
    this.transformation.inject();
  }
}

(function (maplebirch): void {
  'use strict';
  maplebirch.register('char', Object.seal(new Character(maplebirch)), ['var']);
})(maplebirch);

export default Character;
