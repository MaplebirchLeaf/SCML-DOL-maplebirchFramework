// ./src/modules/NamedNPCAddon/NPCSiderbarConfig/handheld_layers.ts

import maplebirch from '../../../core';
import { gray_suffix, clothes_handheld, clothes_back, clothes_back_acc } from './functions';
import { LayerOptions } from '../../../../types/npcsidebar-layers';

const handheld_layers = {
  nnpc_handheld_main: clothes_handheld('main', {
    filtersfn(options: LayerOptions) {
      if (['feather'].includes(options.maplebirch.nnpc.clothes!.handheld!.variable) && options.maplebirch.nnpc.clothes!.handheld!.colour === 'grey') return ['nnpc_hair'];
      return ['nnpc_handheld'];
    },
    animationfn(options: LayerOptions) { return options.maplebirch.nnpc.handheld_animation!; }
  }),
  nnpc_handheld_acc: clothes_handheld('acc'),
  nnpc_handheld_detail: clothes_handheld('detail'),
  nnpc_handheld_left: {
    masksrcfn(options: LayerOptions) { return options.maplebirch.nnpc.close_up_mask; },
    srcfn(options: LayerOptions) {
      const handheld = options.maplebirch.nnpc.clothes!.handheld!;
      const cover = options.maplebirch.nnpc.arm_left === 'cover' ? 'left_cover' : 'left';
      const directory = (handheld.type as string[]).includes('prop') ? 'props' : 'handheld';
      const category = directory === 'props' ? ((handheld.type as string[]).find((type: string) => ['food', 'ingredient', 'recipe', 'tending', 'antique', 'sex toy', 'child toy', 'book', 'furniture'].includes(type)) || 'general') + '/' : '';
      return gray_suffix(`img/clothes/${directory}/${category}${handheld.variable}/${cover}.png`, options.filters!['nnpc_handheld']);
    },
    showfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.clothes!.handheld!.index > 0 && nnpc.clothes!.handheld!.leftImage === 1 && nnpc.arm_left !== 'none' && !nnpc.hide_all && nnpc.show && nnpc.model;
    },
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.arm_left === 'cover' ? (maplebirch.char.ZIndices.hands + options.maplebirch.nnpc.position!) : (options.maplebirch.nnpc.zarms! + 0.2);
    },
    dxfn(options: LayerOptions) { return options.maplebirch.nnpc.dxfn!; },
    dyfn(options: LayerOptions) { return options.maplebirch.nnpc.dyfn!; },
    filters: ['nnpc_handheld'],
  },
  nnpc_handheld_left_acc: {
    masksrcfn(options: LayerOptions) { return options.maplebirch.nnpc.close_up_mask; },
    srcfn(options: LayerOptions) {
      const handheld = options.maplebirch.nnpc.clothes!.handheld!;
      const cover = options.maplebirch.nnpc.arm_left === 'cover' ? 'left_cover' : 'left';
      const directory = (handheld.type as string[]).includes('prop') ? 'props' : 'handheld';
      const category = directory === 'props' ? ((handheld.type as string[]).find((type: string) => ['food', 'ingredient', 'recipe', 'tending', 'antique', 'sex toy', 'child toy', 'book', 'furniture'].includes(type)) || 'general') + '/' : '';
      return gray_suffix(`img/clothes/${directory}/${category}${handheld.variable}/${cover}_acc.png`, options.filters!['nnpc_handheld_acc']);
    },
    showfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.clothes!.handheld!.index > 0 && nnpc.clothes!.handheld!.leftImage === 1 && nnpc.clothes!.handheld!.accessory === 1 && nnpc.arm_left !== 'none' && !nnpc.hide_all && nnpc.show && nnpc.model;
    },
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.arm_left === 'cover' ? (maplebirch.char.ZIndices.hands + options.maplebirch.nnpc.position!) : (options.maplebirch.nnpc.zarms! + 0.2);
    },
    dxfn(options: LayerOptions) { return options.maplebirch.nnpc.dxfn!; },
    dyfn(options: LayerOptions) { return options.maplebirch.nnpc.dyfn!; },
    filters: ['nnpc_handheld_acc'],
  },
  nnpc_handheld_back: clothes_back('handheld'),
  nnpc_handheld_back_acc: clothes_back_acc('handheld', {
    zfn(options: LayerOptions) { return maplebirch.char.ZIndices.over_head_back + options.maplebirch.nnpc.position!; },
  })
};

export default handheld_layers;