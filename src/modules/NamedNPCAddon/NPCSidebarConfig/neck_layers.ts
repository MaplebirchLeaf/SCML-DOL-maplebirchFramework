// ./src/modules/NamedNPCAddon/NPCSidebarConfig/neck_layers.ts

import maplebirch from '../../../core';
import { gray_suffix, imagePath, clothes_layer } from './functions';

type NPCSidebarOptions = {
  filters?: Record<string, any>;
  maplebirch: {
    nnpc: Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
};

const neck_layers = {
  nnpc_neck_main: clothes_layer('neck', 'main', {
    masksrcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (nnpc.high_waist_suspenders) return [nnpc.close_up_mask, imagePath('img/clothes/neck/suspenders/mask.png')];
      return nnpc.close_up_mask;
    },

    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const neck = nnpc.clothes.neck;
      const upper = nnpc.clothes.upper;
      const collar = neck.has_collar === 1 && upper.has_collar === 1 ? '-nocollar' : neck.name === 'sailor ribbon' && upper.name === 'serafuku' ? '-serafuku' : '';
      const pattern = neck.pattern && !['tertiary', 'secondary'].includes(neck.pattern_layer) ? `-${neck.pattern.replace(/ /g, '-')}` : '';
      return gray_suffix(`img/clothes/neck/${neck.variable}/${neck.integrity}${collar}${pattern}.png`, options.filters?.nnpc_neck);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const neck = nnpc.clothes.neck;
      return neck.index > 0 && neck.mainImage !== 0 && !nnpc.hide_all && nnpc.show && nnpc.model;
    },

    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return (nnpc.hood_mask ? maplebirch.char.ZIndices.collar : maplebirch.char.ZIndices.neck) + nnpc.position;
    }
  }),

  nnpc_neck_acc: clothes_layer('neck', 'acc', {
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const neck = nnpc.clothes.neck;
      const integrity = neck.accessory_integrity_img ? `-${neck.integrity}` : '';
      const pattern = neck.pattern && neck.pattern_layer === 'secondary' ? `-${neck.pattern.replace(/ /g, '-')}` : '';
      return gray_suffix(`img/clothes/neck/${neck.variable}/acc${integrity}${pattern}.png`, options.filters?.nnpc_neck_acc);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const neck = nnpc.clothes.neck;
      return neck.index > 0 && neck.accImage !== 0 && neck.accessory === 1 && !nnpc.hide_leash && !nnpc.hide_all && nnpc.show && nnpc.model;
    },

    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const head = nnpc.clothes.head;
      const upper = nnpc.clothes.upper;
      const covered = head.mask_img === 1 && !(upper.hoodposition === 'down' && head.hood && head.outfitSecondary != null);
      return (covered ? maplebirch.char.ZIndices.collar : maplebirch.char.ZIndices.neck) + nnpc.position;
    },

    dyfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return (nnpc.high_waist_suspenders ? -8 : 0) + nnpc.dyfn;
    }
  })
};

export default neck_layers;
