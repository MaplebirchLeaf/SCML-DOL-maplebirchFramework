// ./src/modules/NamedNPCAddon/NPCSidebarConfig/handheld_layers.ts

import maplebirch from '../../../core';
import { gray_suffix, clothes_handheld, clothes_back, clothes_back_acc } from './functions';

type NPCSidebarOptions = {
  filters?: Record<string, any>;
  maplebirch: {
    nnpc: Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
};

const handheld_layers = {
  nnpc_handheld_main: clothes_handheld('main', {
    filtersfn(options: NPCSidebarOptions) {
      const handheld = options.maplebirch.nnpc.clothes.handheld;
      if (handheld.variable === 'feather' && handheld.colour === 'grey') return ['nnpc_hair'];
      return ['nnpc_handheld'];
    },

    animationfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.handheld_animation;
    }
  }),

  nnpc_handheld_acc: clothes_handheld('acc'),
  nnpc_handheld_detail: clothes_handheld('detail'),

  nnpc_handheld_left: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },

    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const handheld = nnpc.clothes.handheld;
      const cover = nnpc.arm_left === 'cover' ? 'left-cover' : 'left';
      const directory = handheld.type.includes('prop') ? 'props' : 'handheld';
      const category =
        directory === 'props'
          ? (handheld.type.find((type: string) => ['food', 'ingredient', 'recipe', 'tending', 'antique', 'sex toy', 'child toy', 'book', 'furniture'].includes(type)) || 'general') + '/'
          : '';
      return gray_suffix(`img/clothes/${directory}/${category}${handheld.variable}/${cover}.png`, options.filters?.nnpc_handheld);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const handheld = nnpc.clothes.handheld;
      return handheld.index > 0 && handheld.leftImage === 1 && nnpc.arm_left !== 'none' && !nnpc.hide_all && nnpc.show && nnpc.model;
    },

    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (nnpc.arm_left === 'cover') return maplebirch.char.ZIndices.hands + nnpc.position;
      return nnpc.zarms + 0.2;
    },

    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },

    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },

    filters: ['nnpc_handheld']
  },

  nnpc_handheld_left_acc: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },

    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const handheld = nnpc.clothes.handheld;
      const cover = nnpc.arm_left === 'cover' ? 'left-cover' : 'left';
      const directory = handheld.type.includes('prop') ? 'props' : 'handheld';
      const category =
        directory === 'props'
          ? (handheld.type.find((type: string) => ['food', 'ingredient', 'recipe', 'tending', 'antique', 'sex toy', 'child toy', 'book', 'furniture'].includes(type)) || 'general') + '/'
          : '';
      return gray_suffix(`img/clothes/${directory}/${category}${handheld.variable}/${cover}-acc.png`, options.filters?.nnpc_handheld_acc);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const handheld = nnpc.clothes.handheld;
      return handheld.index > 0 && handheld.leftImage === 1 && handheld.accessory === 1 && nnpc.arm_left !== 'none' && !nnpc.hide_all && nnpc.show && nnpc.model;
    },

    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (nnpc.arm_left === 'cover') return maplebirch.char.ZIndices.hands + nnpc.position;
      return nnpc.zarms + 0.2;
    },

    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },

    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },

    filters: ['nnpc_handheld_acc']
  },

  nnpc_handheld_back: clothes_back('handheld'),

  nnpc_handheld_back_acc: clothes_back_acc('handheld', {
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.over_head_back + options.maplebirch.nnpc.position;
    }
  })
};

export default handheld_layers;
