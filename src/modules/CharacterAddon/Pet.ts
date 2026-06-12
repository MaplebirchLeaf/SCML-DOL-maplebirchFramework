// ./src/modules/CharacterAddon/Pet.ts

import type Character from '../Character';

interface PetOptions {
  mask?: number;
  rotation?: number;
  animated?: boolean;
  floating?: boolean;
  scale?: number;
}

interface PetSettings extends PetOptions {
  enabled?: boolean;
}

type CanvasModelRegistry = Record<string, CanvasModelOptions | undefined> & {
  main?: CanvasModelOptions;
};

type PetTarget = string | HTMLElement;

const PET = {
  model: 'pet',
  elementId: 'maplebirch-character-pet',
  storageKey: 'maplebirch.character.pet.position',
  size: 256
};

const DEFAULT_OPTIONS: Required<PetOptions> = {
  mask: 25,
  rotation: 0,
  animated: false,
  floating: true,
  scale: 1
};

const SCALE_RANGE = {
  min: 0.5,
  max: 1
};

const DEFAULT_OFFSET = {
  right: 16,
  bottom: 32
};

// 从原版 main 派生 pet 模型时，只保留角色本体相关层。
const petLayers = {
  exact: new Set([
    'base',
    'basehead',
    'breasts',
    'belly',
    'bellyLeft',
    'bellyRight',
    'leftarm',
    'rightarm',
    'freckles',
    'ears',
    'eyes',
    'sclera',
    'left_iris',
    'right_iris',
    'eyelids',
    'lashes',
    'brows',
    'mouth',
    'blush',
    'tears',
    'toast',
    'scars',
    'hair_sides',
    'hair_fringe',
    'hair_extra',
    'pbhair',
    'pbhair_strip',
    'pbhair_balls',
    'penis',
    'genitals',
    'buttplug',
    'vines'
  ]),

  prefixes: [
    'makeup',
    'nipples',
    'breasts',
    'tummy',
    'penis',
    'clit',
    'ear_slime',
    'wolf',
    'cat',
    'cow',
    'bird',
    'fox',
    'angel',
    'fallen',
    'demon',
    'writing',
    'drip',
    'cum',
    'upper',
    'over_upper',
    'lower',
    'over_lower',
    'under_lower',
    'under_upper',
    'hands',
    'handheld',
    'head',
    'over_head',
    'face',
    'neck',
    'legs',
    'feet'
  ]
};

// pet 不需要雨、水、火、花瓣等环境效果。
const ignoredOptions = [
  'precipitation',
  'precipitation_back',
  'precipitation_front',
  'temperature',
  'cold_breath',
  'water',
  'water_back',
  'water_front',
  'water_breath',
  'fire',
  'fireFront',
  'fire_back',
  'fire_front',
  'petals'
];

class Pet {
  public readonly modelName = PET.model;
  private canvas?: HTMLCanvasElement;
  private model?: CanvasModel;
  private container?: HTMLElement;

  private options: Required<PetOptions> = { ...DEFAULT_OPTIONS };

  private cleanupDrag?: () => void;

  public constructor(private manager: Character) {}

  public sync(): boolean {
    const settings = this.readSettings();
    if (!settings.enabled) {
      this.unmount();
      return false;
    }
    return this.render(`#${PET.elementId}`, settings);
  }

  public capture(mainModel?: CanvasModelOptions): void {
    if (!mainModel?.layers || this.models[PET.model]) return;

    this.models[PET.model] = {
      ...mainModel,
      name: PET.model,
      layers: this.pickLayers(mainModel.layers)
    };
  }

  public render(target: PetTarget, options: PetOptions = {}): boolean {
    const container = this.resolveTarget(target);
    if (!container) return false;

    this.configure(options);

    const previousContainer = this.container;

    this.cleanupCurrent();

    const rendered = this.renderCanvas();
    if (!rendered) return false;

    if (previousContainer && previousContainer !== container) this.resetBox(previousContainer);

    this.resetBox(container);

    this.model = rendered.model;
    this.canvas = rendered.canvas;
    this.container = container;

    container.replaceChildren(rendered.canvas);
    this.applyBoxLayout(container, rendered.canvas);

    if (this.options.floating) this.enableDrag(container);

    return true;
  }

  public unmount(): void {
    this.cleanupCurrent();

    const box = this.container ?? document.getElementById(PET.elementId);
    if (box) this.resetBox(box);

    this.canvas = undefined;
    this.model = undefined;
    this.container = undefined;
  }

  public refresh(): boolean {
    if (!this.canvas) return this.sync();

    const context = this.canvas.getContext('2d');
    if (!context || !this.model) return false;

    this.drawWithModel(this.model, context);
    return true;
  }

  public configure(options: PetOptions = {}): this {
    this.options = {
      mask: Math.clamp(options.mask ?? this.options.mask, -128, 128),
      rotation: Math.clamp(options.rotation ?? this.options.rotation, -90, 90),
      animated: options.animated ?? this.options.animated,
      floating: options.floating ?? this.options.floating,
      scale: Math.clamp(options.scale ?? this.options.scale, SCALE_RANGE.min, SCALE_RANGE.max)
    };

    return this;
  }

  private get models(): CanvasModelRegistry {
    return Renderer.CanvasModels as CanvasModelRegistry;
  }

  private get displaySize(): number {
    return Math.round(PET.size * this.options.scale);
  }

  private readSettings(): PetSettings {
    const settings = (V.options?.maplebirch?.character?.pet ?? {}) as PetSettings;

    return {
      enabled: !!settings.enabled,
      animated: !!V.options.sidebarAnimations,
      mask: Math.clamp(settings.mask ?? DEFAULT_OPTIONS.mask, -128, 128),
      rotation: Math.clamp(settings.rotation ?? DEFAULT_OPTIONS.rotation, -90, 90),
      scale: Math.clamp(settings.scale ?? DEFAULT_OPTIONS.scale, SCALE_RANGE.min, SCALE_RANGE.max),
      floating: true
    };
  }

  private ensureModelReady(): boolean {
    this.capture(this.models.main);

    if (this.models[PET.model]) return true;

    this.manager.log('pet 模型尚未准备完成。', 'WARN');
    return false;
  }

  private renderCanvas(): { model: CanvasModel; canvas: HTMLCanvasElement } | null {
    if (!this.ensureModelReady()) return null;

    const model = Renderer.locateModel(PET.model);
    const context = model.createCanvas(false);

    model.reset();
    this.drawWithModel(model, context);

    return {
      model,
      canvas: context.canvas
    };
  }

  private drawWithModel(model: CanvasModel, context: CanvasRenderingContext2D): void {
    const options = this.renderOptions(model);

    this.stopAnimation();

    if (this.options.animated) {
      model.animate(context, options, Renderer.defaultListener);
    } else {
      model.render(context, options, Renderer.defaultListener);
    }
  }

  private renderOptions(model = this.model): CanvasModelOptionsData {
    const sidebar = Renderer.CanvasModelCaches?.main?.sidebar as CanvasModel | undefined;
    const options = sidebar?.options?.deepCopy?.() ?? model?.defaultOptions() ?? { filters: {} };
    for (const key of ignoredOptions) options[key] = '';
    return options;
  }

  private pickLayers(layers: CanvasLayerMap): CanvasLayerMap {
    return Object.fromEntries(Object.entries(layers).filter(([name]) => this.isPetLayer(name))) as CanvasLayerMap;
  }

  private isPetLayer(name: string): boolean {
    return petLayers.exact.has(name) || petLayers.prefixes.some(prefix => name === prefix || name.startsWith(`${prefix}_`));
  }

  private resolveTarget(target: PetTarget): HTMLElement | null {
    if (typeof target !== 'string') return target;
    return document.querySelector<HTMLElement>(target);
  }

  private resetBox(box: HTMLElement): void {
    box.replaceChildren();
    box.classList.remove('maplebirch-character-pet', 'dragging');
    box.removeAttribute('style');
  }

  private applyBoxLayout(box: HTMLElement, canvas?: HTMLCanvasElement): void {
    const size = this.displaySize;
    const maskSrc = this.manager.mask(this.options.mask, this.options.rotation);

    box.classList.add('maplebirch-character-pet');

    Object.assign(box.style, {
      width: `${size}px`,
      height: `${size}px`,
      overflow: 'hidden',

      webkitMaskImage: maskSrc ? `url("${maskSrc}")` : '',
      maskImage: maskSrc ? `url("${maskSrc}")` : '',

      webkitMaskSize: '200% 100%',
      maskSize: '200% 100%',

      webkitMaskPosition: 'left top',
      maskPosition: 'left top',

      webkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat'
    });

    if (!canvas) return;

    Object.assign(canvas.style, {
      width: `${size}px`,
      height: `${size}px`,
      transform: '',
      imageRendering: 'auto'
    });
  }

  private enableDrag(box: HTMLElement): void {
    this.cleanupDrag?.();
    this.cleanupDrag = undefined;

    this.applyFloatingPosition(box, this.loadPosition());

    let pointerId: number | null = null;

    let startX = 0;
    let startY = 0;

    let startLeft = 0;
    let startTop = 0;

    const moveTo = (left: number, top: number): void => {
      const next = this.clampPosition(left, top);

      box.style.left = `${next.left}px`;
      box.style.top = `${next.top}px`;
    };

    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;

      pointerId = event.pointerId;

      const rect = box.getBoundingClientRect();

      startX = event.clientX;
      startY = event.clientY;

      startLeft = rect.left;
      startTop = rect.top;

      box.setPointerCapture?.(event.pointerId);
      box.classList.add('dragging');

      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (pointerId !== event.pointerId) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      moveTo(startLeft + dx, startTop + dy);

      event.preventDefault();
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (pointerId !== event.pointerId) return;

      pointerId = null;

      box.releasePointerCapture?.(event.pointerId);
      box.classList.remove('dragging');

      this.savePosition(box);

      event.preventDefault();
    };

    const onResize = (): void => {
      const rect = box.getBoundingClientRect();

      moveTo(rect.left, rect.top);
      this.savePosition(box);
    };

    box.addEventListener('pointerdown', onPointerDown);
    box.addEventListener('pointermove', onPointerMove);
    box.addEventListener('pointerup', onPointerUp);
    box.addEventListener('pointercancel', onPointerUp);

    window.addEventListener('resize', onResize);

    this.cleanupDrag = () => {
      box.removeEventListener('pointerdown', onPointerDown);
      box.removeEventListener('pointermove', onPointerMove);
      box.removeEventListener('pointerup', onPointerUp);
      box.removeEventListener('pointercancel', onPointerUp);

      window.removeEventListener('resize', onResize);
    };
  }

  private applyFloatingPosition(box: HTMLElement, position: { left: number; top: number } | null): void {
    const size = this.displaySize;

    const fallback = {
      left: window.innerWidth - size - DEFAULT_OFFSET.right,
      top: window.innerHeight - size - DEFAULT_OFFSET.bottom
    };

    const next = this.clampPosition(position?.left ?? fallback.left, position?.top ?? fallback.top);

    Object.assign(box.style, {
      position: 'fixed',

      left: `${next.left}px`,
      top: `${next.top}px`,

      right: 'auto',
      bottom: 'auto',

      zIndex: '999',

      cursor: 'grab',
      touchAction: 'none',
      userSelect: 'none',
      pointerEvents: 'auto',

      display: 'block'
    });
  }

  private clampPosition(left: number, top: number): { left: number; top: number } {
    const size = this.displaySize;

    return {
      left: Math.clamp(left, 0, Math.max(0, window.innerWidth - size)),
      top: Math.clamp(top, 0, Math.max(0, window.innerHeight - size))
    };
  }

  private loadPosition(): { left: number; top: number } | null {
    try {
      const data = JSON.parse(localStorage.getItem(PET.storageKey) || 'null');
      if (typeof data?.left === 'number' && typeof data?.top === 'number') return data;
    } catch {}
    return null;
  }

  private savePosition(box: HTMLElement): void {
    const rect = box.getBoundingClientRect();
    const position = this.clampPosition(rect.left, rect.top);
    localStorage.setItem(PET.storageKey, JSON.stringify(position));
  }

  private cleanupCurrent(): void {
    this.stopAnimation();
    this.cleanupDrag?.();
    this.cleanupDrag = undefined;
  }

  private stopAnimation(): void {
    const context = this.canvas?.getContext('2d');
    const animation = context ? Renderer.getAnimatingCanvas?.(context) : null;
    animation?.stop?.();
  }
}

export default Pet;
