// ./src/modules/Character.ts

import { MacroDefinition } from 'twine-sugarcube';
import maplebirch, { MaplebirchCore, createlog } from '../core';
import { clone, loadImage, mergefn as mergeFn } from '../utils';
import AddonPlugin from './AddonPlugin';
import type { Replacement } from './AddonPluginProcess';
import Pet from './CharacterAddon/Pet';
import Transformation from './CharacterAddon/Transformation';

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

interface LayerUseOptions {
  pet?: boolean;
}
const faceImagePaths = new Set<string>();

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
  const blend = clone(filterPrototype);
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
  const styles = Object.values(setup.faceStyleOptions ?? {});
  if (!options.facestyle || !styles.includes(options.facestyle)) options.facestyle = 'default';
  const variants = Object.values(setup.faceVariantOptions?.[options.facestyle] ?? {});
  if (!options.facevariant || !variants.includes(options.facevariant)) options.facevariant = 'default';
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

function kaiju_mask(options: HairGradientPreprocessOptions): string | undefined {
  if (options.worn?.over_upper?.setup?.name === 'kaiju costume') return 'img/clothes/over-upper/kaiju/mask.png';
}

const layers: CanvasLayerMap = {
  hair_sides: {
    masksrcfn(options: HairGradientPreprocessOptions) {
      return kaiju_mask(options) || (options.headMask?.length ? options.headMask : options.maplebirch?.char?.mask_src);
    }
  },
  hair_sides_close_up: {
    masksrcfn(options: HairGradientPreprocessOptions) {
      return kaiju_mask(options) || options.maplebirch?.char?.mask_src_close_up;
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
      return kaiju_mask(options) || (options.headMask?.length ? options.headMask : options.fringe_mask_src || options.maplebirch?.char?.mask_src);
    }
  },
  hair_fringe_close_up: {
    masksrcfn(options: HairGradientPreprocessOptions) {
      return kaiju_mask(options) || options.maplebirch?.char?.mask_src_close_up;
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
  }
};

class Character {
  public readonly log: ReturnType<typeof createlog>;
  public readonly mask = mask;
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

  public modifyFaceStyle(manager: AddonPlugin): void {
    const oldSCdata = manager.SC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const passageData = SCdata.passageDataItems.map;
    for (const file of ['Cheats', 'clothesTestingImageGenerate', 'Widgets Mirror', 'Widgets Settings']) {
      const modify = passageData.get(file);
      if (!modify?.content) continue;
      const replacements: Replacement[] = [[/setup\.faceStyleOptions\.length gt/g, 'Object.keys(setup.faceStyleOptions).length gte']];
      if (file === 'Widgets Mirror') replacements.push([/(Object\.keys\(setup\.faceVariantOptions\[\$facestyle\]\)\.length\s+)gt\b/g, '$1gte']);
      modify.content = manager.replace(modify.content, replacements, 'FaceStyle');
      passageData.set(file, modify);
    }
    SCdata.passageDataItems.back2Array();
    manager.modUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
  }

  public faceStyleImagePaths(files: Record<string, unknown>): void {
    const add = (style: string, variant?: string) => {
      const variants = this.faceStyleMap.get(style) ?? [];
      if (variant && !variants.includes(variant)) variants.push(variant);
      this.faceStyleMap.set(style, variants);
    };

    for (const filePath of Object.keys(files)) {
      const normalized = filePath.replace(/\\/g, '/');
      const faceIndex = normalized.indexOf('img/face/');
      if (faceIndex < 0) continue;
      const imagePath = normalized.slice(faceIndex);
      faceImagePaths.add(imagePath);
      const [style, variant, file] = imagePath.slice('img/face/'.length).split('/');
      if (!style || !variant || style === 'masks') continue;
      add(style);
      if (file && (style !== 'default' || !['aloof', 'catty', 'default', 'foxy', 'gloomy', 'sweet'].includes(variant))) add(style, variant);
    }
  }

  private _faceStyleSetupOption() {
    const add = (style: string, variant?: string) => {
      const variants = this.faceStyleMap.get(style) ?? [];
      if (variant && !variants.includes(variant)) variants.push(variant);
      this.faceStyleMap.set(style, variants);
    };

    for (const style of Object.values(setup.faceStyleOptions ?? {})) if (typeof style === 'string') add(style);

    for (const [style, variants] of Object.entries(setup.faceVariantOptions ?? {})) {
      add(style);
      for (const variant of Object.values(variants as Record<string, string>)) if (typeof variant === 'string') add(style, variant);
    }

    const styleOptions: Record<string, string> = {};
    const variantOptions: Record<string, Record<string, string>> = {};

    const label = (key: string, fallback = key) => {
      try {
        return this.core.auto(key) || fallback;
      } catch {
        this.log(`缺少语言文本: ${key}`, 'WARN');
        return fallback;
      }
    };

    for (const [style, variants] of this.faceStyleMap) {
      const styleKey = style === 'default' ? 'traditional' : style;
      styleOptions[label(styleKey).convert('title')] = style;
      if (!variants.length) continue;
      variantOptions[style] = {};
      for (const variant of variants) {
        const variantKey = variant === 'default' ? 'gentle' : variant;
        variantOptions[style][label(variantKey).convert('title')] = variant;
      }
    }

    setup.faceStyleOptions = styleOptions;
    setup.faceVariantOptions = variantOptions;
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
    const patchFlag = Symbol('maplebirchProcessPatched');
    const modelLayers = (modelName: string, model?: CanvasModel | CanvasModelOptions) =>
      layerEntries
        .filter(({ target }) => (typeof target === 'function' ? target(modelName, model) : Array.isArray(target) ? target.includes(modelName) : target === modelName))
        .map(({ layers }) => layers);
    const patchLayers = (options?: CanvasModelOptions) => {
      if (!options?.layers) return options;
      const matchedLayers = modelLayers(options.name || '', options);
      if (!matchedLayers.length) return options;
      let patchedLayers = clone(options.layers);
      for (const layers of matchedLayers) patchedLayers = mergeFn(patchedLayers, (_key: any, value: any, depth: number) => depth <= 3 && value != null, layers);
      return { ...options, layers: patchedLayers };
    };
    const patchProcess = (model: CanvasModel) => {
      const patched = model as CanvasModel & { [patchFlag]?: true };
      if (patched[patchFlag]) return;
      patched[patchFlag] = true;
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
    const patchCachedLayers = (model: CanvasModel) => {
      const missing: CanvasLayerMap = {};
      for (const entry of modelLayers(model.name, model)) for (const [name, layer] of Object.entries(entry)) if (!model.layers?.[name]) missing[name] = layer;
      if (!Object.keys(missing).length) return;
      const initialized = new BaseCanvasModel({
        name: model.name,
        width: model.width,
        height: model.height,
        frames: model.frames,
        scale: model.scale,
        layers: missing
      } as CanvasModelOptions);
      Object.assign(model.layers, initialized.layers);
      model.layerList = Object.values(model.layers);
    };
    const patchModel = (model: CanvasModel) => {
      if (model.name === pet.modelName) return model;
      patchProcess(model);
      patchCachedLayers(model);
      return model;
    };
    return class PatchedCanvasModel extends BaseCanvasModel {
      static create(id: string, slot?: string) {
        return patchModel(BaseCanvasModel.create(id, slot));
      }
      constructor(...args: any[]) {
        const [options] = args as [CanvasModelOptions?];
        const modelName = options?.name || '';
        const patchedOptions = modelName !== pet.modelName ? patchLayers(options) : options;
        if (modelName === 'main') pet.capture(options);
        args[0] = patchedOptions;
        super(...args);
        patchModel(this);
      }
    } as T;
  }

  public use(type: ProcessType, handler: ProcessHandler, target?: ModelTarget<CanvasModel>): this;
  public use(layers: CanvasLayerMap, target?: ModelTarget<CanvasModelOptions>, options?: LayerUseOptions): this;
  public use(...args: [ProcessType, ProcessHandler, ModelTarget<CanvasModel>?] | [CanvasLayerMap, ModelTarget<CanvasModelOptions>?, LayerUseOptions?]): this {
    if (typeof args[0] === 'string') {
      const type = args[0];
      const handler = args[1];
      const target = args[2] ?? 'main';
      this.handlers.push({ type, target, handler });
      return this;
    }
    const layers = args[0];
    const target = args[1] ?? 'main';
    const options = args[2];
    this.layers.push({ target, layers });
    if (options?.pet) this.pet.use(layers);
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

  public preInit() {
    const { core, pet } = this;
    core.once(':storyready', () => {
      const macro = core.SugarCube.Macro.get('updatesidebarimg') as MacroDefinition | undefined;
      if (!macro) return;
      core.tool.macro.define('updatesidebarimg', function (this: any) {
        macro.handler.call(this);
        void pet.sync();
      });
    });
    core.on(':passageend', () => void pet.sync());
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
