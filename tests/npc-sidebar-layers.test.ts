import { describe, expect, mock, test } from 'bun:test';

const zIndices: Record<string, number> = {
  back_lower: 10,
  basehead: 20,
  facewear: 30,
  front_hair: 40,
  head_back: 50,
  horns: 60,
  lower: 70,
  lower_cover: 80,
  lower_high: 90,
  over_head: 100,
  over_upper_arms: 110,
  under_upper_arms: 120,
  upper_top: 130
};

mock.module('../src/core.ts', () => ({
  default: {
    char: { ZIndices: zIndices },
    npc: { Clothes: { art: new Map() } }
  }
}));

const { clothes_arm, clothes_arm_acc, clothes_layer, clothingZIndex, isAltPosition, kaijuMask, normaliseClothingState, clothingIndex, previousFilterName } =
  await import('../src/modules/NamedNPCAddon/NPCSidebarConfig/functions');
const { default: upperLayers } = await import('../src/modules/NamedNPCAddon/NPCSidebarConfig/upper_layers');
const { default: legsLayers } = await import('../src/modules/NamedNPCAddon/NPCSidebarConfig/legs_layers');
const { default: headLayers } = await import('../src/modules/NamedNPCAddon/NPCSidebarConfig/head_layers');
const { default: faceLayers } = await import('../src/modules/NamedNPCAddon/NPCSidebarConfig/face_layers');
const { default: lowerLayers } = await import('../src/modules/NamedNPCAddon/NPCSidebarConfig/lower_layers');

function options(slot: string, clothes: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    filters: {},
    maplebirch: {
      nnpc: {
        show: true,
        model: true,
        hide_all: false,
        position: 3,
        dxfn: 0,
        dyfn: 0,
        close_up_mask: 'close-mask.png',
        head_mask: ['head-mask.png'],
        clothes: {
          over_upper: { name: 'naked' },
          upper: { name: 'naked' },
          under_upper: { name: 'naked' },
          lower: { name: 'naked', type: [] },
          under_lower: { name: 'naked' },
          legs: { name: 'naked' },
          handheld: { name: 'naked', mask_img: 0 },
          [slot]: clothes
        },
        ...extra
      }
    }
  } as any;
}

describe('second NPC filter isolation', () => {
  test('isolates every second NPC colour filter', () => {
    expect(previousFilterName('nnpc_hair')).toBe('nnpc_previous_hair');
    expect(previousFilterName('nnpc_hair_fringe')).toBe('nnpc_previous_hair_fringe');
    expect(previousFilterName('nnpc_brows')).toBe('nnpc_previous_brows');
    expect(previousFilterName('hair')).toBe('hair');
  });
});

describe('0.5.12 clothing state compatibility', () => {
  test('resolves a live clothes index and canonicalises legacy alt', () => {
    expect(clothingIndex('upper', { name: 'cardigan', variable: 'cardigan', index: 1 }, () => 7)).toBe(7);
    expect(clothingIndex('upper', { index: 4 }, () => Number.NaN)).toBe(4);
    expect(clothingIndex('upper', { index: 4 }, () => 0)).toBe(4);

    const state = normaliseClothingState({ altposition: 'none', altdisabled: [] }, { alt: 'alt' }, 7);
    expect(state.index).toBe(7);
    expect(state.alt).toBe('alt');
    expect(state.altposition).toBe('alt');
    expect(isAltPosition(state)).toBeTrue();
    expect(isAltPosition({ ...state, altdisabled: ['full'] }, 'full')).toBeFalse();
    expect(clothingZIndex(zIndices, { zIndex: 'upper_top' }, zIndices.lower)).toBe(zIndices.upper_top);
  });

  test('applies altdisabled to detail images and sleeve filter swapping', () => {
    const detail = clothes_layer('upper', 'detail');
    const state = { index: 1, variable: 'dress', altposition: 'alt', altdisabled: ['full'], pattern: 'dots', pattern_layer: 'tertiary', mainImage: 1 };
    expect(detail.srcfn(options('upper', state))).toBe('img/clothes/upper/dress/dots.png');

    const arm = clothes_arm('upper', 'left');
    const armState = { ...state, altdisabled: ['filter'], sleeve_colour: 'primary', sleeve_img: 1 };
    expect(arm.filtersfn(options('upper', armState, { arm_left: 'idle' }))).toEqual(['nnpc_upper_acc']);
  });

  test('shows accessory sleeves independently from the main sleeve image', () => {
    const armAcc = clothes_arm_acc('under_upper', 'left');
    const state = { index: 1, variable: 'top', altposition: 'none', altdisabled: [], sleeve_img: 0, sleeve_acc_img: 1 };
    expect(armAcc.showfn(options('under_upper', state, { arm_left: 'idle' }))).toBeTrue();
  });
});

describe('0.5.12 NPC layer coverage', () => {
  test('provides over-upper back, under-upper accessory arms, and legs detail', () => {
    expect(upperLayers.nnpc_over_upper_back).toBeDefined();
    expect(upperLayers.nnpc_under_upper_leftarm_acc).toBeDefined();
    expect(upperLayers.nnpc_under_upper_rightarm_acc).toBeDefined();
    expect(legsLayers.nnpc_legs_detail).toBeDefined();
  });

  test('uses alt head art and only raises alt glasses above the head', () => {
    const head = { index: 1, variable: 'bandana', integrity: 'full', altposition: 'alt', altdisabled: [], pattern: '', mainImage: 1 };
    expect(headLayers.nnpc_head_main.srcfn(options('head', head))).toBe('img/clothes/head/bandana/full-alt.png');

    const glasses = { index: 1, variable: 'glasses', altposition: 'none', altdisabled: [], type: ['glasses'] };
    expect(faceLayers.nnpc_face_main.zfn(options('face', glasses))).toBe(zIndices.facewear + 3);
    expect(faceLayers.nnpc_face_main.zfn(options('face', { ...glasses, altposition: 'alt' }))).toBe(zIndices.over_head + 3);
  });

  test('honours configured lower zIndex while retaining covered compatibility', () => {
    expect(lowerLayers.nnpc_lower_main.zfn(options('lower', { index: 1, type: [], zIndex: 'upper_top' }))).toBe(zIndices.upper_top + 3);
    expect(lowerLayers.nnpc_lower_main.zfn(options('lower', { index: 1, type: ['covered'] }))).toBe(zIndices.lower_cover + 3);
  });

  test('exposes the kaiju costume mask for inner clothing layers', () => {
    const layerOptions = options('upper', { index: 1 });
    layerOptions.maplebirch.nnpc.clothes.over_upper = { name: 'kaiju costume' };
    expect(kaijuMask(layerOptions)).toBe('img/clothes/over-upper/kaiju/mask.png');
    expect(clothes_layer('upper', 'main').masksrcfn(layerOptions)).toBe('img/clothes/over-upper/kaiju/mask.png');
  });
});
