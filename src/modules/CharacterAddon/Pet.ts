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

const csv = (value: string): string[] =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const petLayers = {
  exact: csv(`
    base, basehead, breasts, belly, bellyLeft, bellyRight, leftarm, rightarm,
    freckles, ears, eyes, sclera, left_iris, right_iris, eyelids, lashes, brows, mouth, blush, tears, toast, scars,
    hair_sides, hair_fringe, hair_extra, pbhair, pbhair_strip, pbhair_balls,
    penis, genitals, buttplug, vines
  `),
  prefixes: csv(`
    makeup, nipples, breasts, tummy, penis, clit, ear_slime,
    wolf, cat, cow, bird, fox, angel, fallen, demon,
    writing, drip, cum,
    upper, over_upper, lower, over_lower, under_lower, under_upper,
    hands, handheld, head, over_head, face, neck, legs, feet
  `)
};

const ignoredOptions = csv(`
  precipitation, precipitation_back, precipitation_front, temperature, cold_breath,
  water, water_back, water_front, water_breath,
  fire, fireFront, fire_back, fire_front, petals
`);

const isPetLayer = (name: string): boolean => petLayers.exact.includes(name) || petLayers.prefixes.some(prefix => name === prefix || name.startsWith(`${prefix}_`));
class Pet {
  public readonly modelName = PET.model;
  private canvas?: HTMLCanvasElement;
  private model?: CanvasModel;
  private container?: HTMLElement;

  private options: Required<PetOptions> = { ...DEFAULT_OPTIONS };
  private readonly layers: CanvasLayerMap[] = [];

  private cleanupDrag?: () => void;
  private syncing = false;
  private rendering = false;
  private syncFrame = 0;

  public constructor(private manager: Character) {}

  public sync(): boolean {
    if (this.syncing) return false;

    const settings = this.readSettings();
    if (!settings.enabled) {
      this.cancel();
      this.unmount();
      return false;
    }

    this.cancel();
    this.syncFrame = requestAnimationFrame(() => {
      this.syncFrame = 0;
      if (this.syncing) return;
      this.syncing = true;
      try {
        this.render(`#${PET.elementId}`, settings);
      } finally {
        this.syncing = false;
      }
    });

    return true;
  }

  public use(layers: CanvasLayerMap): this {
    this.layers.push(layers);
    return this;
  }

  public capture(mainModel?: CanvasModelOptions): void {
    const models = Renderer.CanvasModels as Record<string, CanvasModelOptions | undefined>;
    if (!mainModel?.layers || models[PET.model]) return;

    const layers = Object.fromEntries(Object.entries(mainModel.layers).filter(([name]) => isPetLayer(name))) as CanvasLayerMap;
    for (const petLayerMap of this.layers) Object.assign(layers, petLayerMap);

    models[PET.model] = {
      ...mainModel,
      name: PET.model,
      layers
    };
  }

  public render(target: PetTarget, options: PetOptions = {}): boolean {
    if (this.rendering) return false;
    this.rendering = true;
    try {
      const container = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
      if (!container) return false;

      this.configure(options);

      const previousContainer = this.container;

      this.stopAnimation();
      this.cleanupDrag?.();
      this.cleanupDrag = undefined;

      const models = Renderer.CanvasModels as Record<string, CanvasModelOptions | undefined>;
      if (!models[PET.model]) this.capture(models.main);

      if (!models[PET.model]) {
        this.manager.log('pet model is not ready.', 'WARN');
        return false;
      }

      const model = Renderer.locateModel(PET.model);
      const context = model.createCanvas(false);
      const canvas = context.canvas;

      model.reset();
      this.draw(model, context);

      if (previousContainer && previousContainer !== container) this.clearBox(previousContainer);

      this.clearBox(container);

      this.model = model;
      this.canvas = canvas;
      this.container = container;

      const size = this.displaySize;
      const maskSrc = this.manager.mask(this.options.mask, this.options.rotation);

      container.classList.add('maplebirch-character-pet');
      container.replaceChildren(canvas);

      Object.assign(container.style, {
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

      Object.assign(canvas.style, {
        width: `${size}px`,
        height: `${size}px`,
        transform: '',
        imageRendering: 'auto'
      });

      if (this.options.floating) this.enableDrag(container);

      return true;
    } finally {
      this.rendering = false;
    }
  }

  public unmount(): void {
    this.cancel();
    this.stopAnimation();
    this.cleanupDrag?.();
    this.cleanupDrag = undefined;

    const box = this.container ?? document.getElementById(PET.elementId);
    if (box) this.clearBox(box);

    this.canvas = undefined;
    this.model = undefined;
    this.container = undefined;
  }

  public refresh(): boolean {
    if (!this.canvas) return false;

    const context = this.canvas.getContext('2d');
    if (!context || !this.model) return false;

    this.draw(this.model, context);
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

  private cancel(): void {
    if (!this.syncFrame) return;
    cancelAnimationFrame(this.syncFrame);
    this.syncFrame = 0;
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

  private draw(model: CanvasModel, context: CanvasRenderingContext2D): void {
    const sidebar = Renderer.CanvasModelCaches?.main?.sidebar as CanvasModel | undefined;
    const source = sidebar?.options ?? model.defaultOptions();
    const options = { ...(source ?? { filters: {} }) };
    const filters = source?.filters ?? {};
    options.filters = Object.fromEntries(
      Object.entries(filters).map(([key, value]) => {
        if (Array.isArray(value)) return [key, [...value]];
        if (value && typeof value === 'object') return [key, { ...value }];
        return [key, value];
      })
    );

    for (const key of ignoredOptions) options[key] = '';

    this.stopAnimation();

    try {
      if (this.options.animated) {
        model.animate(context, options, Renderer.defaultListener);
      } else {
        model.render(context, options, Renderer.defaultListener);
      }
    } catch (error) {
      if (!this.options.animated) throw error;
      this.options.animated = false;
      model.render(context, options, Renderer.defaultListener);
    }
  }

  private clearBox(box: HTMLElement): void {
    box.replaceChildren();
    box.classList.remove('maplebirch-character-pet', 'dragging');
    box.removeAttribute('style');
  }

  private enableDrag(box: HTMLElement): void {
    const size = this.displaySize;

    const clamp = (left: number, top: number) => ({
      left: Math.clamp(left, 0, Math.max(0, window.innerWidth - size)),
      top: Math.clamp(top, 0, Math.max(0, window.innerHeight - size))
    });

    const loadPosition = (): { left: number; top: number } | null => {
      try {
        const data = JSON.parse(localStorage.getItem(PET.storageKey) || 'null');
        if (typeof data?.left === 'number' && typeof data?.top === 'number') return data;
      } catch {}

      return null;
    };

    const savePosition = (): void => {
      const rect = box.getBoundingClientRect();
      localStorage.setItem(PET.storageKey, JSON.stringify(clamp(rect.left, rect.top)));
    };

    const fallback = {
      left: window.innerWidth - size - DEFAULT_OFFSET.right,
      top: window.innerHeight - size - DEFAULT_OFFSET.bottom
    };

    const position = loadPosition();
    const current = clamp(position?.left ?? fallback.left, position?.top ?? fallback.top);

    Object.assign(box.style, {
      position: 'fixed',

      left: `${current.left}px`,
      top: `${current.top}px`,

      right: 'auto',
      bottom: 'auto',

      zIndex: '999',

      cursor: 'grab',
      touchAction: 'none',
      userSelect: 'none',
      pointerEvents: 'auto',

      display: 'block'
    });

    let pointerId: number | null = null;

    let startX = 0;
    let startY = 0;

    let startLeft = 0;
    let startTop = 0;

    const moveTo = (left: number, top: number): void => {
      const next = clamp(left, top);

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

      moveTo(startLeft + event.clientX - startX, startTop + event.clientY - startY);

      event.preventDefault();
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (pointerId !== event.pointerId) return;

      pointerId = null;

      box.releasePointerCapture?.(event.pointerId);
      box.classList.remove('dragging');

      savePosition();

      event.preventDefault();
    };

    const onResize = (): void => {
      const rect = box.getBoundingClientRect();

      moveTo(rect.left, rect.top);
      savePosition();
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

  private stopAnimation(): void {
    const context = this.canvas?.getContext('2d');
    const animation = context ? Renderer.getAnimatingCanvas?.(context) : null;
    animation?.stop?.();
  }
}

export default Pet;
