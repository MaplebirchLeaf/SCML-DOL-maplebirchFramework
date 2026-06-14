// ./src/modules/Character.ts

import maplebirch, { MaplebirchCore, createlog } from '../core';
import { loadImage } from '../utils';
import AddonPlugin from './AddonPlugin';
import type { Replacement } from './AddonPluginProcess';
import Pet from './CharacterAddon/Pet';
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
  headMask?: string[];
  fringe_mask_src?: string | null;
  maplebirch?: {
    char?: {
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

type FaceStyleNameFn = (options: FaceStyleOptions) => string | string[];
type FaceStyleName = string | string[];

export type ProcessType = 'pre' | 'post';
export type ModelTarget<TModel = CanvasModel | CanvasModelOptions> = string | string[] | ((modelName: string, model?: TModel) => boolean);
export type ProcessHandler = (options: any, model?: CanvasModel) => void;

interface ProcessEntry {
  type: ProcessType;
  target: ModelTarget<CanvasModel>;
  handler: ProcessHandler;
}

interface LayerEntry {
  target: ModelTarget<CanvasModelOptions>;
  layers: CanvasLayerMap;
}

const faceImagePaths = new Set<string>();

function resolveFaceImagePath(candidates: string[]) {
  const indexed = candidates.find(path => faceImagePaths.has(path));
  if (indexed) return indexed;
  let firstUnknown = '';
  for (const path of candidates) {
    const result = loadImage(path);
    if (result === path || result === true) return path;
    if (result !== false && !firstUnknown) firstUnknown = path;
  }
  return firstUnknown || candidates[0];
}

function faceStyleSrcFn(name: FaceStyleNameFn | FaceStyleName) {
  const getName: FaceStyleNameFn = typeof name === 'function' ? name : () => name;
  return function (layerOptions: FaceStyleOptions): string {
    const images = [getName(layerOptions)].flat();
    const facestyle = layerOptions.facestyle || 'default';
    const facevariant = layerOptions.facevariant || 'default';
    const candidates = images.flatMap(image => {
      return facestyle === 'default' && /^(freckles|ears|blusher|mouth-|lipstick-|blush-?|tears?-?)/.test(image)
        ? [`img/face/${facestyle}/${image}.png`, `img/face/${facestyle}/${facevariant}/${image}.png`, `img/face/default/${image}.png`, `img/face/default/${facevariant}/${image}.png`]
        : [`img/face/${facestyle}/${facevariant}/${image}.png`, `img/face/${facestyle}/${image}.png`, `img/face/default/${facevariant}/${image}.png`, `img/face/default/${image}.png`];
    });
    return resolveFaceImagePath(candidates);
  };
}

const maskCache = new Map<string, string>();

function mask(x = 0, rotation = 0, swap = false, width = 256, height = 256): string {
  rotation = Math.clamp(rotation, -90, 90);
  x = Math.clamp(x, -width / 2, width / 2);
  const cacheKey = `${x}|${rotation}|${swap}|${width}|${height}`;
  const cached = maskCache.get(cacheKey);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const splitX = Math.clamp(width / 2 + x, 0, width);
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
  const blend = filterPrototype.clone();
  if (storedPositions && storedPositions.length === blend.colors.length) for (let i = 0; i < blend.colors.length; i++) blend.colors[i][0] = Math.clamp(storedPositions[i], 0, 1);
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
    lengthValue = Math.clamp(lengthValue, 0, 1);
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

const layers: CanvasLayerMap = {
  hair_sides: {
    masksrcfn(options: HairGradientPreprocessOptions) {
      return options.headMask?.length ? options.headMask : options.maplebirch?.char?.mask_src;
    }
  },
  hair_sides_close_up: {
    masksrcfn(options: HairGradientPreprocessOptions) {
      return options.maplebirch?.char?.mask_src_close_up;
    },
    srcfn(options: HairGradientPreprocessOptions) {
      return `img/hair/sides/${options.hair_sides_type}/${options.hair_sides_length}.png`;
    },
    showfn(options: HairGradientPreprocessOptions) {
      return !!options.show_hair && !!options.hair_sides_type && !options.headMask?.length;
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
      return options.headMask?.length ? options.headMask : options.fringe_mask_src || options.maplebirch?.char?.mask_src;
    }
  },
  hair_fringe_close_up: {
    masksrcfn(options: HairGradientPreprocessOptions) {
      return options.maplebirch?.char?.mask_src_close_up;
    },
    srcfn(options: HairGradientPreprocessOptions) {
      return `img/hair/fringe/${options.hair_fringe_type}/${options.hair_fringe_length}.png`;
    },
    showfn(options: HairGradientPreprocessOptions) {
      return !!options.show_hair && !!options.hair_fringe_type && !options.headMask?.length && !options.fringe_mask_src;
    },
    zfn() {
      return maplebirch.char.ZIndices.front_hair;
    },
    filtersfn(options: { hair_fringe_colour_style: string }) {
      return options.hair_fringe_colour_style === 'gradient' ? ['hair_fringe_close_up'] : ['hair_fringe'];
    },
    animation: 'idle'
  },
  basehead: {
    srcfn(options: FaceStyleOptions & { mannequin?: boolean }) {
      if (options.mannequin) return 'img/body/mannequin/base-head.png';
      return resolveFaceImagePath([`img/face/${options.facestyle}/base-head.png`, 'img/body/base-head.png']);
    }
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
    srcfn: faceStyleSrcFn((options: FaceStyleOptions) => `mouth-${options.mouth}`)
  },
  makeup_lipstick: {
    srcfn: faceStyleSrcFn((options: FaceStyleOptions) => `lipstick-${options.mouth}`)
  },
  blush: {
    srcfn: faceStyleSrcFn((options: FaceStyleOptions) => `blush-${options.blush}`)
  },
  tears: {
    srcfn: faceStyleSrcFn((options: FaceStyleOptions) => `tears-${options.tears}`)
  },
  makeup_mascara_tears: {
    srcfn: faceStyleSrcFn((options: FaceStyleOptions) => `makeup/mascara${options.mascara_running}`)
  }
};

class Character {
  public readonly log: ReturnType<typeof createlog>;
  public readonly mask = mask;
  public readonly faceStyleSrcFn = faceStyleSrcFn;
  public readonly faceStyleMap: Map<string, string[]> = new Map();
  private readonly handlers: ProcessEntry[] = [];
  private readonly layers: LayerEntry[] = [];
  public readonly pet: Pet;
  public readonly transformation: Transformation;

  public constructor(readonly core: MaplebirchCore) {
    this.log = createlog('char');
    this.pet = new Pet(this);
    this.transformation = new Transformation(this);
    this.core.on(':language', () => this._faceStyleSetupOption(), 'face style setup options');
    this.core.tool.onInit(() => this._faceStyleSetupOption());
  }

  public get ZIndices() {
    return ZIndices;
  }

  public modifyCanvasModel(manager: AddonPlugin): void {
    const oldSCdata = manager.SC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const file = SCdata.scriptFileItems.getByNameWithOrWithoutPath('00-canvasmodel.js')!;
    const replacements: Replacement[] = [[/window\.CanvasModel\s*=\s*CanvasModel;/, 'CanvasModel = maplebirch.char.patchCanvasModel(CanvasModel);\nwindow.CanvasModel = CanvasModel;']];
    file.content = manager.replace(file.content, replacements, 'CanvasModel');
    manager.modUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
  }

  public patchCanvasModel<T extends CanvasModelConstructor>(BaseCanvasModel: T): T {
    const layerEntries = this.layers;
    const runProcess = this.process.bind(this);
    const pet = this.pet;
    const targetMatched = (target: ModelTarget<CanvasModelOptions>, modelName: string, options?: CanvasModelOptions) =>
      typeof target === 'function' ? target(modelName, options) : Array.isArray(target) ? target.includes(modelName) : target === modelName;
    const patchLayers = (options?: CanvasModelOptions) => {
      if (!options?.layers) return options;
      const modelName = options.name || '';
      const modelLayers = layerEntries.filter(({ target }) => targetMatched(target, modelName, options)).map(({ layers }) => layers);
      if (!modelLayers.length) return options;
      let patchedLayers = options.layers.clone();
      for (const layers of modelLayers) patchedLayers = patchedLayers.mergefn((_key: any, value: any, depth: number) => depth <= 3 && value != null, layers);
      return { ...options, layers: patchedLayers };
    };
    const patchProcess = (model: CanvasModel) => {
      const vanillaPre = model.preprocess;
      const vanillaPost = model.postprocess;
      model.preprocess = (processOptions: CanvasModelOptionsData) => {
        vanillaPre.call(model, processOptions);
        runProcess('pre', processOptions, model);
      };
      model.postprocess = (processOptions: CanvasModelOptionsData) => {
        vanillaPost.call(model, processOptions);
        runProcess('post', processOptions, model);
      };
    };
    return class PatchedCanvasModel extends BaseCanvasModel {
      constructor(...args: any[]) {
        let [options] = args as [CanvasModelOptions?];
        const modelName = options?.name || '';
        if (modelName === 'main') pet.capture(options);
        if (modelName !== pet.modelName) {
          options = patchLayers(options);
          args[0] = options;
        }
        super(...args);
        if (modelName !== pet.modelName) patchProcess(this);
      }
    } as T;
  }

  public use(type: ProcessType, handler: ProcessHandler, target?: ModelTarget<CanvasModel>): this;
  public use(layers: CanvasLayerMap, target?: ModelTarget<CanvasModelOptions>): this;
  public use(...args: [ProcessType, ProcessHandler, ModelTarget<CanvasModel>?] | [CanvasLayerMap, ModelTarget<CanvasModelOptions>?]): this {
    if (typeof args[0] === 'string') {
      const type = args[0];
      const handler = args[1];
      const target = args[2] ?? 'main';
      this.handlers.push({ type, target, handler });
      return this;
    }
    const layers = args[0];
    const target = args[1] ?? 'main';
    this.layers.push({ target, layers });
    return this;
  }

  public process(type: ProcessType, options: CanvasModelOptionsData, model?: CanvasModel) {
    const modelName = model?.name || '';
    const handlers = this.handlers
      .filter(({ type: entryType, target }) => {
        if (entryType !== type) return false;
        return typeof target === 'function' ? target(modelName, model) : Array.isArray(target) ? target.includes(modelName) : target === modelName;
      })
      .map(({ handler }) => handler);
    if (handlers.length === 0) return;
    this.core.var.optionsCheck();
    for (const handler of handlers) {
      try {
        handler(options, model);
      } catch (error: any) {
        this.log(`${model}-${type}process 错误: ${error?.message || error}`, 'ERROR', error);
      }
    }
  }

  public modifyFaceStyle(manager: AddonPlugin): void {
    const oldSCdata = manager.SC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const passageData = SCdata.passageDataItems.map;
    const files = ['Cheats', 'clothesTestingImageGenerate', 'Widgets Mirror', 'Widgets Settings'];
    for (const file of files) {
      const modify = passageData.get(file);
      if (!modify?.content) continue;
      const replacements: Replacement[] = [[/setup.faceStyleOptions.length gt/g, 'Object.keys(setup.faceStyleOptions).length gte']];
      if (file === 'Widgets Mirror') replacements.push([/(Object\.keys\(setup\.faceVariantOptions\[\$facestyle\]\)\.length\s+)gt\b/g, '$1gte']);
      modify.content = manager.replace(modify.content, replacements, 'FaceStyle');
      passageData.set(file, modify);
    }
    SCdata.passageDataItems.back2Array();
    manager.modUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
  }

  public async faceStyleImagePaths() {
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
          const imagePath = filePath.substring(faceIndex).replace(/\\/g, '/');
          faceImagePaths.add(imagePath);
          const pathParts = imagePath.substring(9).split('/');
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
      nextStyleOptions[this.label(key).convert('title')] = style;
    }
    for (const [style, variants] of this.faceStyleMap) {
      if (variants.length === 0) continue;
      nextVariantOptions[style] = {};
      for (const variant of variants) {
        const key = variant === 'default' ? 'gentle' : variant;
        nextVariantOptions[style][this.label(key).convert('title')] = variant;
      }
    }
    setup.faceStyleOptions = nextStyleOptions;
    setup.faceVariantOptions = nextVariantOptions;
  }

  public preInit() {
    this.core.on(':passagedisplay', () => void this.pet.sync());
    this.use('pre', preprocess, 'main');
    this.use(layers, 'main');
  }

  public Init(): void {
    void this.transformation.inject();
  }

  public loadInit() {
    void this.transformation.inject();
  }
}

maplebirch.register('char', Object.seal(new Character(maplebirch)), ['var']);

export default Character;
