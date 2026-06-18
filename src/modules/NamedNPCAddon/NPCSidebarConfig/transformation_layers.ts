// ./src/modules/NamedNPCAddon/NPCSidebarConfig/transformation_layers.ts

import maplebirch from '../../../core';

type NPCSidebarOptions = {
  maplebirch: { nnpc: Record<string, any> };
  [key: string]: any;
};

const disabled = ['disabled', 'hidden'];
const z = (name: string) => (maplebirch.char.ZIndices as Record<string, number>)[name];
const nnpc = (options: NPCSidebarOptions) => options.maplebirch.nnpc;
const enabled = (value: unknown) => typeof value === 'string' && !disabled.includes(value);

function basic(overrides: Record<string, any> = {}) {
  return {
    animation: 'idle',
    dxfn: (options: NPCSidebarOptions) => nnpc(options).dxfn,
    dyfn: (options: NPCSidebarOptions) => nnpc(options).dyfn,
    masksrcfn: (options: NPCSidebarOptions) => nnpc(options).close_up_mask,
    ...overrides
  };
}

function part(type: string, folder: string, name: string, overrides: Record<string, any> = {}) {
  return basic({
    filters: ['nnpc_hair'],
    srcfn(options: NPCSidebarOptions) {
      const value = nnpc(options)[`${type}_${name}_type`];
      return `img/transformations/${type}/${folder}/${folder === name ? value : `${name}-${value}`}.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      return !!data.show_tf && !!data.model && !data.hide_all && enabled(data[`${type}_${name}_type`]);
    },
    zfn: (options: NPCSidebarOptions) => z('lower') + nnpc(options).position,
    ...overrides
  });
}

function wings(side: 'left' | 'right', type: string, hair: boolean) {
  return basic({
    filters: hair ? ['nnpc_hair'] : [],
    srcfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      const state = data[`${type}_wing_${side}`];
      return `img/transformations/${type}/wings-${state}/${data[`${type}_wings_type`]}${state === 'cover' ? `-${side}` : ''}.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      return !!data.show_tf && !!data.model && !data.hide_all && enabled(data[`${type}_wings_type`]);
    },
    zfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      const layer = data[`${type}_wing_${side}`] === 'cover' ? 'tailPenisCover' : data[`${type}_wings_layer`] === 'back' ? 'over_head_back' : 'backhair';
      return z(layer) + data.position;
    },
    masksrcfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      return data[`${type}_wing_${side}`] === 'cover' ? data.close_up_mask : [data.close_up_mask, `img/face/masks/${side}.png`];
    }
  });
}

function halo(side: 'back' | 'front', type: string) {
  return basic({
    filters: ['nnpc_hair'],
    srcfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      return `img/transformations/${type}/halo/${data[`${type}_halo_type`]}-${side}.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      return !!data.show_tf && !!data.model && !data.hide_all && enabled(data[`${type}_halo_type`]);
    },
    dyfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      return data.dyfn + (data.angel_halo_lower && enabled(data.angel_halo_type) ? 15 : 0);
    },
    zfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      const lowered = data.angel_halo_lower && enabled(data.angel_halo_type);
      return z(side === 'back' ? (lowered ? 'head_back' : 'over_head_back') : lowered ? 'over_head' : 'old_over_upper') + data.position;
    }
  });
}

function tail(type: string, hair: boolean, overrides: Record<string, any> = {}) {
  return part(type, 'tail', 'tail', {
    filters: hair ? ['nnpc_hair'] : [],
    srcfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      const state = type === 'demon' ? data.demon_tail_state : 'idle';
      return `img/transformations/${type}/tail-${state}/${data[`${type}_tail_type`]}.png`;
    },
    zfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      const layer = type === 'demon' && ['cover', 'flaunt'].includes(data.demon_tail_state) ? 'tailPenisCover' : data[`${type}_tail_layer`] === 'back' ? 'tail' : 'back_lower';
      return z(layer) + data.position;
    },
    ...overrides
  });
}

function ears(type: string, hair: boolean, overrides: Record<string, any> = {}) {
  return part(type, 'ears', 'ears', {
    filters: hair ? ['nnpc_hair'] : [],
    masksrcfn: (options: NPCSidebarOptions) => nnpc(options).head_mask,
    zfn: (options: NPCSidebarOptions) => z(nnpc(options).hide_head_acc ? 'over_head' : 'basehead') + nnpc(options).position,
    ...overrides
  });
}

function horns(type: string, offset = 0) {
  return part(type, 'horns', 'horns', {
    filters: ['nnpc_hair'],
    masksrcfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      return data[`${type}_horns_layer`] === 'front' ? data.close_up_mask : data.head_mask;
    },
    zfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      return z(data[`${type}_horns_layer`] === 'front' ? 'over_head' : 'horns') + offset + data.position;
    }
  });
}

export const transformationDefaults = {
  show_tf: false,
  angel_wings_type: 'disabled',
  angel_wing_right: 'idle',
  angel_wing_left: 'idle',
  angel_wings_layer: 'front',
  angel_halo_type: 'disabled',
  angel_halo_lower: false,
  fallen_wings_type: 'disabled',
  fallen_wing_right: 'idle',
  fallen_wing_left: 'idle',
  fallen_wings_layer: 'front',
  fallen_halo_type: 'disabled',
  demon_wings_type: 'disabled',
  demon_wings_state: 'idle',
  demon_wings_layer: 'front',
  demon_tail_type: 'disabled',
  demon_tail_state: 'idle',
  demon_tail_layer: 'front',
  demon_horns_type: 'disabled',
  demon_horns_layer: 'back',
  wolf_tail_type: 'disabled',
  wolf_tail_layer: 'front',
  wolf_ears_type: 'disabled',
  wolf_pits_type: 'disabled',
  wolf_pubes_type: 'disabled',
  wolf_cheeks_type: 'disabled',
  cat_tail_type: 'disabled',
  cat_tail_layer: 'front',
  cat_ears_type: 'disabled',
  cow_horns_type: 'disabled',
  cow_horns_layer: 'back',
  cow_tail_type: 'disabled',
  cow_tail_layer: 'front',
  cow_ears_type: 'disabled',
  bird_wings_type: 'disabled',
  bird_wing_right: 'idle',
  bird_wing_left: 'idle',
  bird_wings_layer: 'front',
  bird_tail_type: 'disabled',
  bird_tail_layer: 'front',
  bird_eyes_type: 'disabled',
  bird_malar_type: 'disabled',
  bird_plumage_type: 'disabled',
  bird_pubes_type: 'disabled',
  fox_tail_type: 'disabled',
  fox_tail_layer: 'front',
  fox_ears_type: 'disabled',
  fox_cheeks_type: 'disabled'
};

const transformation_layers = {
  nnpc_wolf_tail: tail('wolf', true),
  nnpc_wolf_ears: ears('wolf', true),
  nnpc_wolf_cheeks: part('wolf', 'cheeks', 'cheeks'),
  nnpc_wolf_pits: part('wolf', 'hirsute', 'pits', { zfn: (options: NPCSidebarOptions) => z('hirsute') + nnpc(options).position }),
  nnpc_wolf_pubes: part('wolf', 'hirsute', 'pubes', { zfn: (options: NPCSidebarOptions) => z('hirsute') + nnpc(options).position }),

  nnpc_cat_tail: tail('cat', true),
  nnpc_cat_ears: ears('cat', true),

  nnpc_cow_horns: horns('cow', 1),
  nnpc_cow_ear_left: ears('cow', true, {
    zfn: (options: NPCSidebarOptions) => z('horns') + nnpc(options).position,
    masksrcfn: (options: NPCSidebarOptions) => [nnpc(options).close_up_mask, 'img/face/masks/left.png']
  }),
  nnpc_cow_ear_right: ears('cow', true, {
    zfn: (options: NPCSidebarOptions) => z('ears') + 0.5 + nnpc(options).position,
    masksrcfn: (options: NPCSidebarOptions) => [nnpc(options).close_up_mask, 'img/face/masks/right.png']
  }),
  nnpc_cow_tag: ears('cow', false, { src: 'img/transformations/cow/ears/tag.png', srcfn: undefined, zfn: (options: NPCSidebarOptions) => z('facewear') + nnpc(options).position }),
  nnpc_cow_tail: tail('cow', true),

  nnpc_bird_wings_right: wings('right', 'bird', true),
  nnpc_bird_wings_left: wings('left', 'bird', true),
  nnpc_bird_tail: tail('bird', true),
  nnpc_bird_eyes: part('bird', 'eyes', 'eyes', {
    zfn: (options: NPCSidebarOptions) => z('irisacc') + nnpc(options).position,
    masksrcfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      return [data.close_up_mask, { path: `img/face/${data.facestyle}/${data.facevariant}/iris.png`, convert: true }];
    }
  }),
  nnpc_bird_malar: part('bird', 'feathers', 'malar'),
  nnpc_bird_plumage: part('bird', 'feathers', 'plumage'),
  nnpc_bird_pubes: part('bird', 'feathers', 'pubes', { zfn: (options: NPCSidebarOptions) => z('hirsute') + nnpc(options).position }),

  nnpc_fox_tail: tail('fox', true),
  nnpc_fox_ears: ears('fox', true),
  nnpc_fox_cheeks: part('fox', 'cheeks', 'cheeks'),

  nnpc_angel_wings_right: wings('right', 'angel', true),
  nnpc_angel_wings_left: wings('left', 'angel', true),
  nnpc_angel_halo_back: halo('back', 'angel'),
  nnpc_angel_halo_front: halo('front', 'angel'),

  nnpc_fallen_wings_right: wings('right', 'fallen', true),
  nnpc_fallen_wings_left: wings('left', 'fallen', true),
  nnpc_fallen_halo_back: halo('back', 'fallen'),
  nnpc_fallen_halo_front: halo('front', 'fallen'),

  nnpc_demon_wings: basic({
    filters: ['nnpc_hair'],
    srcfn: (options: NPCSidebarOptions) => `img/transformations/demon/wings-${nnpc(options).demon_wings_state}/${nnpc(options).demon_wings_type}.png`,
    showfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      return !!data.show_tf && !!data.model && !data.hide_all && enabled(data.demon_wings_type) && !enabled(data.bird_wings_type);
    },
    zfn(options: NPCSidebarOptions) {
      const data = nnpc(options);
      const layer = ['cover', 'flaunt'].includes(data.demon_wings_state) ? 'tailPenisCover' : data.demon_wings_layer === 'back' ? 'head_back' : 'backhair';
      return z(layer) + data.position;
    }
  }),
  nnpc_demon_tail: tail('demon', true),
  nnpc_demon_horns: horns('demon')
};

export default transformation_layers;
