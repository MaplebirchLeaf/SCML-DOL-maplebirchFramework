import '../support/runtime';
import { expect, mock, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';

mock.module('../../src/core', () => ({ default: {} }));

const { default: Character } = await import('../../src/modules/Character');

function withCharacterLayers(run: (character: InstanceType<typeof Character>, create: (layers: CanvasLayerMap, name?: string, cached?: boolean) => CanvasModel) => void): void {
  const originalRenderer = Object.getOwnPropertyDescriptor(globalThis, 'Renderer');
  Object.defineProperty(globalThis, 'Renderer', { value: { CanvasModels: {} }, configurable: true });
  const core = { host: { modLoader: undefined }, on() {}, once() {}, var: { check() {} }, tool: { define() {}, defineS() {} } } as unknown as MaplebirchCore;
  const character = new Character(core);
  let cached: CanvasModel;
  class BaseModel {
    public static create(): CanvasModel {
      return cached;
    }
    public readonly name: string;
    public readonly layers: CanvasLayerMap;
    public readonly layerList: LayerConfig[];
    public constructor(options: CanvasModelOptions) {
      this.name = options.name;
      this.layers = options.layers;
      this.layerList = Object.values(this.layers);
    }
    public preprocess(): void {}
    public postprocess(): void {}
  }
  try {
    const PatchedModel = character.patchCanvasModel(BaseModel as unknown as CanvasModelConstructor);
    run(character, (layers, name = 'main', existing = false) => {
      const options = { name, width: 256, height: 256, layers };
      if (!existing) return new PatchedModel(options);
      cached = new BaseModel(options) as unknown as CanvasModel;
      return PatchedModel.create(name);
    });
  } finally {
    if (originalRenderer) Object.defineProperty(globalThis, 'Renderer', originalRenderer);
    else Reflect.deleteProperty(globalThis, 'Renderer');
  }
}

test('show-only layer patches retain the native source function, receiver and side effects', () => {
  withCharacterLayers((character, create) => {
    let calls = 0;
    const native: LayerConfig = {
      src: 'img/nnpc',
      srcfn() {
        calls++;
        return `${this.src}/robin.png`;
      }
    };
    character.use({ nnpc: { showfn: options => options.show_nnpc === true } }, 'main');
    const layer = create({ nnpc: native }).layers.nnpc;
    expect(layer.srcfn?.({ show_nnpc: true })).toBe('img/nnpc/robin.png');
    expect(layer.srcfn).toBe(native.srcfn);
    expect(calls).toBe(1);
    expect(layer.showfn?.({ show_nnpc: false })).toBe(false);
    expect(layer.showfn?.({ show_nnpc: true })).toBe(true);
  });
});

test('supplied source functions remain guarded and use the merged layer as their receiver', () => {
  withCharacterLayers((character, create) => {
    let calls = 0;
    character.use(
      {
        nnpc: {
          src: 'img/custom-nnpc',
          showfn: options => options.show_nnpc === true,
          srcfn(options) {
            calls++;
            return `${this.src}/${options.partner}.png`;
          }
        }
      },
      'main'
    );
    const layer = create({ nnpc: { src: 'img/native.png' } }).layers.nnpc;
    expect(layer.srcfn?.({ show_nnpc: false, partner: 'robin' })).toBe('');
    expect(calls).toBe(0);
    expect(layer.srcfn?.({ show_nnpc: true, partner: 'robin' })).toBe('img/custom-nnpc/robin.png');
    expect(calls).toBe(1);
  });
});

test('supplied static layer sources remain guarded by their visibility function', () => {
  for (const src of ['img/custom-nnpc/robin.png', '']) {
    withCharacterLayers((character, create) => {
      character.use({ nnpc: { src, showfn: options => options.show_nnpc === true } }, 'main');
      const layer = create({ nnpc: { srcfn: () => 'img/native.png' } }).layers.nnpc;
      expect(layer.srcfn?.({ show_nnpc: false })).toBe('');
      expect(layer.srcfn?.({ show_nnpc: true })).toBe(src);
    });
  }
});

test('PC pet retains native carried prop layers and excludes scenery and NPC layers', () => {
  withCharacterLayers((_character, create) => {
    const fish: LayerConfig = { showfn: options => !!options.prop?.show, srcfn: options => `img/clothes/props/${options.prop.folder}/${options.prop.name}.png` };
    create({ base: {}, prop: fish, prop_acc: {}, prop_underarm: {}, prop_underarm_acc: {}, water: {}, nnpc: {} });
    const layers = (Renderer.CanvasModels as Record<string, CanvasModelOptions>).pet.layers;
    expect(Object.keys(layers)).toEqual(['base', 'prop', 'prop_acc', 'prop_underarm', 'prop_underarm_acc']);
    expect(layers.prop).toBe(fish);
    const options = { prop: { show: true, folder: 'fish', name: 'caught_haddock' } };
    expect(layers.prop.showfn?.(options)).toBe(true);
    expect(layers.prop.srcfn?.(options)).toBe('img/clothes/props/fish/caught_haddock.png');
    expect(layers.prop.showfn?.({ prop: { show: false } })).toBe(false);
  });
});

test('NPC hair retains sidebar clipping together with headwear masks', async () => {
  const { default: layers } = await import('../../src/modules/NamedNPCAddon/NPCSidebarConfig/base_layers');
  for (const name of ['nnpc_hair_sides', 'nnpc_hair_fringe', 'nnpc_hair_extra'] as const) {
    const options: any = { maplebirch: { nnpc: { close_up_mask: 'sidebar-mask', head_mask: ['sidebar-mask', 'nun-mask'], clothes: { over_upper: {} } } } };
    expect(layers[name].masksrcfn(options)).toEqual([{ path: 'sidebar-mask', convert: true }, 'nun-mask']);
    options.maplebirch.nnpc.head_mask = ['sidebar-mask'];
    expect(layers[name].masksrcfn(options)).toBe('sidebar-mask');
  }
});

test('NPC costume and fringe fallback masks also retain sidebar clipping', async () => {
  const { default: layers } = await import('../../src/modules/NamedNPCAddon/NPCSidebarConfig/base_layers');
  const options: any = { maplebirch: { nnpc: { close_up_mask: 'sidebar-mask', head_mask: ['sidebar-mask'], fringe_mask_src: 'fringe-mask', clothes: { over_upper: { name: 'kaiju costume' } } } } };
  for (const name of ['nnpc_hair_sides', 'nnpc_hair_fringe', 'nnpc_hair_extra'] as const) {
    expect(layers[name].masksrcfn(options)).toEqual([{ path: 'sidebar-mask', convert: true }, 'img/clothes/over-upper/kaiju/mask.png']);
  }
  options.maplebirch.nnpc.clothes.over_upper.name = 'naked';
  expect(layers.nnpc_hair_fringe.masksrcfn(options)).toEqual([{ path: 'sidebar-mask', convert: true }, 'fringe-mask']);
});

test('NPC clothing retains sidebar clipping with costume and handheld masks', async () => {
  const { clothes_basic } = await import('../../src/modules/NamedNPCAddon/NPCSidebarConfig/functions');
  const { default: layers } = await import('../../src/modules/NamedNPCAddon/NPCSidebarConfig/head_layers');
  const options: any = { maplebirch: { nnpc: { close_up_mask: 'sidebar-mask', clothes: { over_upper: { name: 'kaiju costume' }, handheld: { mask_img: 1, variable: 'parasol' } } } } };
  expect(clothes_basic('upper').masksrcfn(options)).toEqual(['sidebar-mask', 'img/clothes/over-upper/kaiju/mask.png']);
  options.maplebirch.nnpc.clothes.over_upper.name = 'naked';
  for (const name of ['nnpc_head_main', 'nnpc_head_acc', 'nnpc_head_detail', 'nnpc_head_back', 'nnpc_head_back_acc'] as const) {
    expect(layers[name].masksrcfn?.(options)).toEqual(['sidebar-mask', 'img/clothes/handheld/parasol/mask.png']);
  }
});

test('NPC transformation masks intersect sidebar clipping with wing sides and headwear', async () => {
  const { default: layers } = await import('../../src/modules/NamedNPCAddon/NPCSidebarConfig/transformation_layers');
  const options: any = { maplebirch: { nnpc: { close_up_mask: 'sidebar-mask', head_mask: ['sidebar-mask', 'headwear-mask'], clothes: { over_upper: {} } } } };
  for (const type of ['angel', 'fallen', 'bird'] as const) {
    for (const side of ['left', 'right'] as const) {
      const layer = layers[`nnpc_${type}_wings_${side}`];
      expect(layer.masksrcfn(options)).toEqual([{ path: 'sidebar-mask', convert: true }, `img/face/masks/${side}.png`]);
      options.maplebirch.nnpc[`${type}_wing_${side}`] = 'cover';
      expect(layer.masksrcfn(options)).toBe('sidebar-mask');
    }
  }
  for (const name of ['nnpc_wolf_ears', 'nnpc_cat_ears', 'nnpc_fox_ears', 'nnpc_cow_horns', 'nnpc_demon_horns'] as const) {
    expect(layers[name].masksrcfn(options)).toEqual([{ path: 'sidebar-mask', convert: true }, 'headwear-mask']);
  }
  options.maplebirch.nnpc.hide_head_acc = true;
  expect(layers.nnpc_wolf_ears.masksrcfn(options)).toBe('sidebar-mask');
  options.maplebirch.nnpc.cow_horns_layer = 'front';
  expect(layers.nnpc_cow_horns.masksrcfn(options)).toBe('sidebar-mask');
  for (const side of ['left', 'right'] as const) {
    expect(layers[`nnpc_cow_ear_${side}`].masksrcfn(options)).toEqual([{ path: 'sidebar-mask', convert: true }, `img/face/masks/${side}.png`]);
  }
});

test('NPC costume masks preserve sidebar clipping and bird iris shape', async () => {
  const { default: transformations } = await import('../../src/modules/NamedNPCAddon/NPCSidebarConfig/transformation_layers');
  const { default: fluids } = await import('../../src/modules/NamedNPCAddon/NPCSidebarConfig/fluids_layers');
  const options: any = { maplebirch: { nnpc: { close_up_mask: 'sidebar-mask', facestyle: 'default', facevariant: 'classic', clothes: { over_upper: { name: 'kaiju costume' } } } } };
  for (const layer of [...Object.values(transformations), ...Object.values(fluids)]) {
    const masks = layer.masksrcfn(options);
    expect(masks).toContainEqual({ path: 'sidebar-mask', convert: true });
    expect(masks).toContain('img/clothes/over-upper/kaiju/mask.png');
  }
  expect(transformations.nnpc_bird_eyes.masksrcfn(options)).toContainEqual({ path: 'img/face/default/classic/iris.png', convert: true });
});

test('PC hair keeps both colour partitions under headwear and costume masks', () => {
  withCharacterLayers((character, create) => {
    character.preInit();
    const layers = create({
      hair_sides: { src: 'hair', showfn: options => !!options.show_hair && !!options.hair_sides_type },
      hair_fringe: { src: 'fringe', showfn: options => !!options.show_hair && !!options.hair_fringe_type }
    }).layers;
    const options: any = {
      show_hair: true,
      hair_sides_type: 'neat',
      hair_fringe_type: 'middlepart',
      hair_colour_style: 'gradient',
      hair_fringe_colour_style: 'gradient',
      headMask: ['hat-mask', 'umbrella-mask'],
      maplebirch: { char: { mask_src: 'body-clip', mask_src_close_up: 'portrait-clip' } },
      worn: { over_upper: { setup: {} } }
    };
    for (const part of ['sides', 'fringe']) {
      const body = layers[`hair_${part}`];
      const portrait = layers[`hair_${part}_close_up`];
      expect(portrait.showfn?.(options)).toBe(true);
      expect(body.masksrcfn?.(options)).toEqual([{ path: 'body-clip', convert: true }, 'hat-mask', 'umbrella-mask']);
      expect(portrait.masksrcfn?.(options)).toEqual([{ path: 'portrait-clip', convert: true }, 'hat-mask', 'umbrella-mask']);
      options.worn.over_upper.setup.name = 'kaiju costume';
      expect(body.masksrcfn?.(options)).toEqual([{ path: 'body-clip', convert: true }, 'img/clothes/over-upper/kaiju/mask.png']);
      expect(portrait.masksrcfn?.(options)).toEqual([{ path: 'portrait-clip', convert: true }, 'img/clothes/over-upper/kaiju/mask.png']);
      options.worn.over_upper.setup.name = 'naked';
    }
    expect(layers.hair_sides_close_up.filtersfn?.(options)).toEqual(['hair_close_up']);
    expect(layers.hair_fringe_close_up.filtersfn?.(options)).toEqual(['hair_fringe_close_up']);
    options.hair_colour_style = 'solid';
    expect(layers.hair_sides_close_up.filtersfn?.(options)).toEqual(['hair']);
    expect(layers.hair_fringe_close_up.filtersfn?.(options)).toEqual(['hair_fringe_close_up']);
    options.show_hair = false;
    expect(layers.hair_sides_close_up.showfn?.(options)).toBe(false);
    expect(layers.hair_fringe_close_up.showfn?.(options)).toBe(false);
  });
});

test('split hair retains native sources and ordering relative to transformation ears', () => {
  for (const cached of [false, true])
    withCharacterLayers((character, create) => {
      character.preInit();
      const nativeHair: LayerConfig = {
        src: 'native-hair',
        srcfn(options) {
          return `${this.src}/${options.hair_sides_type === 'crude' ? 'short' : options.hair_sides_length}.png`;
        },
        zfn: () => 10
      };
      const ears: LayerConfig = { src: 'ears', zfn: options => ({ back: 10, middle: 20, front: 40 })[options.position as 'back' | 'middle' | 'front'] };
      const model = create({ hair_sides: nativeHair, hair_fringe: { src: 'fringe', z: 30 }, tf_ears: ears }, 'main', cached);
      const layers = model.layers;
      expect(layers.hair_sides_close_up.srcfn?.({ hair_sides_type: 'crude', hair_sides_length: 'feet' })).toBe('native-hair/short.png');
      expect(layers.hair_sides_close_up.zfn).toBe(nativeHair.zfn);
      for (const position of ['back', 'middle', 'front']) {
        const ordered = model.layerList
          .map(layer => ({ layer, z: layer.zfn ? layer.zfn({ position }) : (layer.z ?? 0) }))
          .sort((a, b) => a.z - b.z)
          .map(({ layer }) => layer);
        expect(ordered.indexOf(layers.hair_sides_close_up) < ordered.indexOf(layers.tf_ears)).toBe(ordered.indexOf(layers.hair_sides) < ordered.indexOf(layers.tf_ears));
      }
    });
});

test('PC hair retains unmasked and hairstyle-specific fallback behaviour', () => {
  withCharacterLayers((character, create) => {
    character.preInit();
    const layers = create({
      hair_sides: { src: 'hair', showfn: options => !!options.show_hair && !!options.hair_sides_type },
      hair_fringe: { src: 'fringe', showfn: options => !!options.show_hair && !!options.hair_fringe_type }
    }).layers;
    const options: any = {
      show_hair: true,
      hair_fringe_type: 'fro',
      headMask: [],
      maplebirch: { char: { mask_src: 'body-clip', mask_src_close_up: 'portrait-clip' } }
    };
    expect(layers.hair_sides.masksrcfn?.(options)).toBe('body-clip');
    expect(layers.hair_sides_close_up.masksrcfn?.(options)).toBe('portrait-clip');
    expect(layers.hair_fringe.masksrcfn?.(options)).toBe('body-clip');
    options.fringe_mask_src = 'fro-mask';
    expect(layers.hair_fringe.masksrcfn?.(options)).toEqual([{ path: 'body-clip', convert: true }, 'fro-mask']);
    expect(layers.hair_fringe_close_up.masksrcfn?.(options)).toEqual([{ path: 'portrait-clip', convert: true }, 'fro-mask']);
    expect(layers.hair_fringe_close_up.showfn?.(options)).toBe(true);
  });
});

test('PC pet executes explicitly targeted processors without main-only processors or layers', () => {
  withCharacterLayers((character, create) => {
    const calls: string[] = [];
    character.use('pre', () => calls.push('main'), 'main');
    character.use('pre', () => calls.push('pet'), character.pet.modelName);
    character.use({ main_only: { src: 'main.png' } }, 'main');
    create({}).preprocess({});
    expect(calls).toEqual(['main']);
    const pet = create({ native_pet: { src: 'pet.png' } }, character.pet.modelName);
    pet.preprocess({});
    expect(calls).toEqual(['main', 'pet']);
    expect(Object.keys(pet.layers)).toEqual(['native_pet']);
  });
});

test('PC back hair and pet hair combine headwear without portrait partition clipping', () => {
  withCharacterLayers((character, create) => {
    character.preInit();
    const main = create({ hair_sides: { src: 'hair' }, hair_fringe: { src: 'fringe' }, hair_extra: { src: 'back' } });
    const pet = (Renderer.CanvasModels as Record<string, CanvasModelOptions>).pet.layers;
    const options: any = {
      headMask: ['hat-mask', 'umbrella-mask'],
      maplebirch: { char: { mask_src: 'body-clip', mask_src_close_up: 'portrait-clip' } }
    };
    const expected = [{ path: 'hat-mask', convert: true }, 'umbrella-mask'];
    expect(main.layers.hair_extra.masksrcfn?.(options)).toEqual(expected);
    for (const name of ['hair_sides', 'hair_fringe', 'hair_extra']) expect(pet[name].masksrcfn?.(options)).toEqual(expected);
    expect(pet.hair_sides_close_up).toBeUndefined();
    options.headMask = [];
    expect(pet.hair_sides.masksrcfn?.(options)).toBeUndefined();
    options.fringe_mask_src = 'fro-mask';
    expect(pet.hair_fringe.masksrcfn?.(options)).toBe('fro-mask');
  });
});

test('PC pet hair mask patches preserve native image sources and rendering properties', () => {
  withCharacterLayers((character, create) => {
    character.preInit();
    const native: LayerConfig = {
      srcfn: () => 'img/hair/native.png',
      showfn: options => !!options.show_hair,
      filtersfn: () => ['hair'],
      animation: 'idle',
      masksrcfn: () => 'native-mask'
    };
    create({ hair_sides: native, hair_fringe: native, hair_extra: native });
    const layers = (Renderer.CanvasModels as Record<string, CanvasModelOptions>).pet.layers;
    for (const name of ['hair_sides', 'hair_fringe', 'hair_extra']) {
      const layer = layers[name];
      expect(layer).not.toBe(native);
      expect(layer.srcfn).toBe(native.srcfn);
      expect(layer.srcfn?.({})).toBe('img/hair/native.png');
      expect(layer.showfn).toBe(native.showfn);
      expect(layer.showfn?.({ show_hair: true })).toBe(true);
      expect(layer.showfn?.({ show_hair: false })).toBe(false);
      expect(layer.filtersfn).toBe(native.filtersfn);
      expect(layer.filtersfn?.({})).toEqual(['hair']);
      expect(layer.animation).toBe('idle');
      expect(layer.masksrcfn?.({ headMask: ['hat-mask'] })).toBe('hat-mask');
    }
    expect(native.masksrcfn?.({})).toBe('native-mask');
  });
});

test('Character patchProcess executes before hook before vanillaPre', () => {
  withCharacterLayers(character => {
    const order: string[] = [];
    character.use('before', () => {
      order.push('before');
    });
    character.use('pre', () => {
      order.push('pre');
    });

    class MockBaseModel {
      public readonly name = 'main';
      public readonly layers = {};
      public readonly layerList = [];
      public preprocess() {
        order.push('vanillaPre');
      }
      public postprocess() {}
    }

    const Patched = character.patchCanvasModel(MockBaseModel as unknown as CanvasModelConstructor);
    const model = new Patched({ name: 'main', width: 256, height: 256, layers: {} });
    model.preprocess({ filters: {} } as unknown as CanvasModelOptionsData);

    expect(order).toEqual(['before', 'vanillaPre', 'pre']);
  });
});
