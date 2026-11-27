// ./src/modules/Character.ts

import maplebirch, { MaplebirchCore } from '../core';
import type { ScopedLog } from '../infra/Diagnostics';
import Hooks from '../infra/Hooks';
import { clone, mergefn as mergeFn } from '../utils';
import type AddonPlugin from '../services/AddonPlugin';
import type { Replacement } from '../host/ModLoader';
import Pet from './CharacterAddon/Pet';
import Transformation from './CharacterAddon/Transformation';
import dol from '../host/DoL';

interface HairGradientOptions {
  style: string;
}

interface HairGradientPreprocessOptions {
  hair_sides_length: string;
  hair_colour_style?: string;
  hair_colour_gradient?: HairGradientOptions;
  hair_fringe_colour_style?: string;
  hair_fringe_colour_gradient?: HairGradientOptions;
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

export type ProcessType = 'before' | 'pre' | 'post';
export type ModelTarget<TModel = CanvasModel | CanvasModelOptions> = string | string[] | ((modelName: string, model?: TModel) => boolean);
export type ProcessHandler = (options: any, model?: CanvasModel) => void;

interface LayerEntry {
  target: ModelTarget<CanvasModelOptions>;
  layers: CanvasLayerMap;
}

interface LayerUseOptions {
  pet?: boolean;
}

const maskCache = new Map<string, string>();

function guarded(layers: CanvasLayerMap): CanvasLayerMap {
  return Object.fromEntries(
    Object.entries(layers).map(([name, layer]) => {
      const { showfn, srcfn, src } = layer;
      if (!showfn || (srcfn ?? src) == null) return [name, layer];
      return [
        name,
        {
          ...layer,
          srcfn(options: any) {
            if (!showfn.call(this, options)) return '';
            return srcfn ? srcfn.call(this, options) : src;
          }
        }
      ];
    })
  );
}

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

function hairColourGradient(filter: Record<string, any>, positions: number[] | undefined, length: string): Record<string, any> {
  const colors = filter.blend?.colors;
  if (!Array.isArray(colors) || !Array.isArray(positions) || positions.length !== colors.length) return filter;

  const adjusted = clone(filter);
  const hairLength = hairLengthStringToNumber(length);
  const lengthFn = adjusted.blend.lengthFunctions?.[0];
  const brightness = adjusted.brightness?.adjustments;
  for (const [index, position] of positions.entries()) {
    const value = Math.clamp(position, 0, 1);
    const stop = Math.clamp(typeof lengthFn === 'function' ? lengthFn(hairLength, value) : value, 0, 1);
    adjusted.blend.colors[index][0] = stop;
    if (brightness?.[index]) brightness[index][0] = stop;
  }
  return adjusted;
}

function preprocess(options: HairGradientPreprocessOptions) {
  const styles = Object.values(dol.setup.faceStyleOptions ?? {});
  if (!options.facestyle || !styles.includes(options.facestyle)) options.facestyle = 'default';
  const variants = Object.values(dol.setup.faceVariantOptions?.[options.facestyle] ?? {});
  if (!options.facevariant || !variants.includes(options.facevariant)) options.facevariant = 'default';
  const characterOptions = dol.variables.options?.maplebirch?.character ?? {};
  const filters = options.filters;
  if (!filters) return;
  const gradients = (style: string | undefined, gradient: HairGradientOptions | undefined, part: 'sides' | 'fringe', name: string) => {
    const closeUp = `${name}_close_up`;
    delete filters[closeUp];
    const filter = filters[name];
    if (style !== 'gradient' || !Array.isArray(filter?.blend?.colors)) return;
    const positions = (view: 'charArt' | 'closeUp') => gradient && characterOptions[view]?.value?.[part]?.[gradient.style];
    const standing = hairColourGradient(filter, positions('charArt'), options.hair_sides_length);
    const detail = hairColourGradient(filter, positions('closeUp'), options.hair_sides_length);
    filters[name] = standing;
    if (standing.blend.colors.some(([stop]: [number, string], index: number) => stop !== detail.blend.colors[index][0])) filters[closeUp] = detail;
  };
  gradients(options.hair_colour_style, options.hair_colour_gradient, 'sides', 'hair');
  gradients(options.hair_fringe_colour_style, options.hair_fringe_colour_gradient ?? options.hair_colour_gradient, 'fringe', 'hair_fringe');
  if (filters.hair_close_up || filters.hair_fringe_close_up) {
    const view = ((options.maplebirch ??= {}).char ??= {});
    view.mask_src = mask(characterOptions.mask ?? 0, characterOptions.rotation ?? 0);
    view.mask_src_close_up = mask(characterOptions.mask ?? 0, characterOptions.rotation ?? 0, true);
  }
}

function hairMask({ masksrcfn, masksrc }: LayerConfig, filter: string, closeUp = false) {
  const key = closeUp ? 'mask_src_close_up' : 'mask_src';
  return function (this: LayerConfig, options: HairGradientPreprocessOptions): CanvasLayerMaskSrc {
    const native = masksrcfn ? masksrcfn.call(this, options) : masksrc;
    const clip = options.filters?.[filter] && options.maplebirch?.char?.[key];
    this.maplebirchHairClip = clip;
    if (!clip) return native;
    return Array.isArray(native) ? [...native, clip] : native ? [native, clip] : [clip];
  };
}

function hairClip(): void {
  const renderer = dol.renderer;
  const pipeline = renderer.RenderingPipeline;
  const index = pipeline.findIndex((step: { name: string }) => step.name === 'mask');
  if (index < 0 || pipeline.some((step: { name: string }) => step.name === 'maplebirch-hair-clip')) return;
  const native = pipeline[index];
  pipeline.splice(index, 0, {
    name: 'maplebirch-hair-clip',
    condition: (layer: LayerConfig) => !!layer.mask && !!layer.maplebirchHairClip && Array.isArray(layer.masksrc) && layer.masksrc.at(-1) === layer.maplebirchHairClip,
    render(image: HTMLCanvasElement | HTMLImageElement, layer: LayerConfig, context: { layer: LayerConfig }) {
      // 先让原版合成服装和发型遮罩，再裁出本图层的渐变区域。
      const masks = Array.isArray(layer.mask) ? layer.mask : [layer.mask];
      const clip = masks.at(-1);
      const base = masks.slice(0, -1);
      const masked = base.length ? native.render(image, { ...layer, mask: base.length === 1 ? base[0] : base }, context) : image;
      const canvas = renderer.ensureCanvas(masked);
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(clip, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      context.layer = { ...layer, mask: undefined };
      return canvas;
    }
  });
}

const hairLayers = ['hair_sides', 'hair_fringe'];

class Character {
  public readonly log!: ScopedLog;
  public readonly mask = mask;
  public readonly faceStyleMap: Map<string, string[]> = new Map();
  private readonly processors: Record<ProcessType, Hooks<[CanvasModelOptionsData, CanvasModel | undefined, () => void], void>>;
  private nextProcessor = 0;
  private readonly layers: LayerEntry[] = [];
  public readonly pet: Pet;
  public readonly transformation: Transformation;

  public constructor(readonly core: MaplebirchCore) {
    this.processors = {
      before: new Hooks(core.host.modLoader, 'continue'),
      pre: new Hooks(core.host.modLoader, 'continue'),
      post: new Hooks(core.host.modLoader, 'continue')
    };
    this.pet = new Pet(this);
    this.transformation = new Transformation(this);
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
      const variants = /(Object\.keys\(setup\.faceVariantOptions\[\$facestyle\]\)\.length\s+)gt\b/g;
      if (file === 'Widgets Mirror' && variants.test(modify.content)) replacements.push([variants, '$1gte']);
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
      const [style, variant, file] = imagePath.slice('img/face/'.length).split('/');
      if (!style || !variant || style === 'masks') continue;
      add(style);
      if (file && (style !== 'default' || !['aloof', 'catty', 'default', 'foxy', 'gloomy', 'sweet'].includes(variant))) add(style, variant);
    }
  }

  private faceStyleSetupOption() {
    const add = (style: string, variant?: string) => {
      const variants = this.faceStyleMap.get(style) ?? [];
      if (variant && !variants.includes(variant)) variants.push(variant);
      this.faceStyleMap.set(style, variants);
    };

    for (const style of Object.values(dol.setup.faceStyleOptions ?? {})) if (typeof style === 'string') add(style);

    for (const [style, variants] of Object.entries(dol.setup.faceVariantOptions ?? {})) {
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
      variantOptions[style] = {};
      for (const variant of variants) {
        const variantKey = variant === 'default' ? 'gentle' : variant;
        variantOptions[style][label(variantKey).convert('title')] = variant;
      }
    }

    dol.setup.faceStyleOptions = styleOptions;
    dol.setup.faceVariantOptions = variantOptions;
  }

  public modifyCanvasModel(manager: AddonPlugin): void {
    const oldSCdata = manager.SC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const file = SCdata.scriptFileItems.getByNameWithOrWithoutPath('00-canvasmodel.js')!;
    const replacements: Replacement[] = [[/window\.CanvasModel\s*=\s*CanvasModel;/, 'CanvasModel = maplebirch.char.patchCanvasModel(CanvasModel);\nwindow.CanvasModel = CanvasModel;']];
    file.content = manager.replace(file.content, replacements, 'CanvasModel');
    manager.modUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
  }

  private splitHairLayers(layers: CanvasLayerMap): CanvasLayerMap {
    const result: CanvasLayerMap = {};
    for (const [name, layer] of Object.entries(layers)) {
      const baseName = name.replace(/_close_up$/, '');
      if (name !== baseName && hairLayers.includes(baseName) && layers[baseName]) continue;
      result[name] = layer;
      if (!hairLayers.includes(name)) continue;
      const closeUp = `${name}_close_up`;
      if (!layers[closeUp]) continue;
      const filter = name === 'hair_sides' ? 'hair' : 'hair_fringe';
      const closeUpFilter = `${filter}_close_up`;
      const base = layer.defaultOptions ?? layer;
      const detail = { ...base, ...layers[closeUp] };
      result[name] = { ...layer, masksrcfn: hairMask(base, closeUpFilter) };
      Object.assign(
        result,
        guarded({
          [closeUp]: {
            ...detail,
            masksrcfn: hairMask(detail, closeUpFilter, true),
            showfn(options) {
              return !!options.filters?.[closeUpFilter] && (detail.showfn ? detail.showfn.call(this, options) : !!detail.show);
            },
            filtersfn(options) {
              return (detail.filtersfn?.call(this, options) ?? detail.filters)?.map(key => (key === filter ? closeUpFilter : key));
            }
          }
        })
      );
    }
    return result;
  }

  public patchCanvasModel<T extends CanvasModelConstructor>(BaseCanvasModel: T): T {
    hairClip();
    const layerEntries = this.layers;
    const splitHairLayers = this.splitHairLayers.bind(this);
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
      return { ...options, layers: splitHairLayers(patchedLayers) };
    };
    const patchProcess = (model: CanvasModel) => {
      const patched = model as CanvasModel & { [patchFlag]?: true };
      if (patched[patchFlag]) return;
      patched[patchFlag] = true;
      const vanillaPre = model.preprocess;
      const vanillaPost = model.postprocess;
      model.preprocess = (processOptions: CanvasModelOptionsData) => {
        runProcess('before', processOptions, model);
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
      const ordered = splitHairLayers({ ...model.layers, ...missing });
      for (const name of Object.keys(missing)) missing[name] = ordered[name];
      const initialized = new BaseCanvasModel({
        name: model.name,
        width: model.width,
        height: model.height,
        frames: model.frames,
        scale: model.scale,
        layers: missing
      } as CanvasModelOptions);
      Object.assign(model.layers, initialized.layers);
      for (const name of hairLayers) {
        if (!missing[`${name}_close_up`] || !model.layers[name]) continue;
        const layer = model.layers[name];
        layer.masksrcfn = ordered[name].masksrcfn;
        if (layer.defaultOptions) layer.defaultOptions.masksrcfn = layer.masksrcfn;
      }
      model.layerList = Object.keys(ordered).map(name => model.layers[name]);
    };
    const patchModel = (model: CanvasModel) => {
      patchProcess(model);
      // 桌宠只执行显式面向它的处理器，图层仍由 Pet.capture 独立收集。
      if (model.name !== pet.modelName) patchCachedLayers(model);
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
      this.processors[type].add(`${type}:${++this.nextProcessor}`, (options, model, check) => {
        const modelName = model?.name || '';
        if (typeof target === 'function' ? target(modelName, model) : Array.isArray(target) ? target.includes(modelName) : target === modelName) {
          check();
          handler(options, model);
        }
      });
      return this;
    }
    const layers = guarded(args[0]);
    const target = args[1] ?? 'main';
    const options = args[2];
    this.layers.push({ target, layers });
    if (options?.pet) this.pet.use(layers);
    return this;
  }

  public process(type: ProcessType, options: CanvasModelOptionsData, model?: CanvasModel) {
    const hooks = this.processors[type];
    if (!hooks.entries.size) return;
    let checked = false;
    hooks.execute(options, model, () => {
      if (checked) return;
      this.core.var.check();
      checked = true;
    });
  }

  public preInit() {
    const { core, pet } = this;
    core.on(':language', () => this.faceStyleSetupOption(), 'face style setup options');
    core.once(':storyready', () => this.faceStyleSetupOption());
    core.tool.wrap(
      'updatesidebarimg',
      function (next) {
        const result = next();
        void pet.sync();
        return result;
      },
      'storyready'
    );
    core.on(':passageend', () => void pet.sync());
    this.use('pre', preprocess, 'main');
    this.use({ hair_sides_close_up: {}, hair_fringe_close_up: {} }, 'main');
  }

  public Init(): void {
    void this.transformation.inject();
  }

  public loadInit() {
    this.transformation.state();
  }
}

export default Character;
