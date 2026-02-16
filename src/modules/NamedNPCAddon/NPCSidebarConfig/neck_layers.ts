// ./src/modules/NamedNPCAddon/NPCSiderbarConfig/neck_layers.ts

import maplebirch from '../../../core';
import { gray_suffix, clothes_layer } from './functions';
import { LayerOptions } from '../../../../types/npcsidebar-layers';

const neck_layers = {
  nnpc_neck_main: clothes_layer('neck', 'main', {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.high_waist_suspenders ? [options.maplebirch.nnpc.close_up_mask!, 'img/clothes/neck/suspenders/mask.png'] : options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      const collar =
        nnpc.clothes!.neck!.has_collar === 1 && nnpc.clothes!.upper!.has_collar === 1
          ? '_nocollar'
          : nnpc.clothes!.neck!.name === 'sailor ribbon' && nnpc.clothes!.upper!.name === 'serafuku'
            ? '_serafuku'
            : '';
      const pattern = nnpc.clothes!.neck!.pattern && !['tertiary', 'secondary'].includes(nnpc.clothes!.neck!.pattern_layer!) ? `_${nnpc.clothes!.neck!.pattern.replace(/ /g, '_')}` : '';
      return gray_suffix(`img/clothes/neck/${nnpc.clothes!.neck!.variable}/${nnpc.clothes!.neck!.integrity}${collar}${pattern}.png`, options.filters!['nnpc_neck']);
    },
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.clothes!.neck!.mainImage !== 0 && !options.maplebirch.nnpc.hide_all && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return (options.maplebirch.nnpc.hood_mask ? maplebirch.char.ZIndices.collar : maplebirch.char.ZIndices.neck) + options.maplebirch.nnpc.position!;
    }
  }),
  nnpc_neck_acc: clothes_layer('neck', 'acc', {
    srcfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      const integrity = nnpc.clothes!.neck!.accessory_integrity_img ? `_${nnpc.clothes!.neck!.integrity}` : '';
      const pattern = nnpc.clothes!.neck?.pattern && nnpc.clothes!.neck?.pattern_layer === 'secondary' ? `_${nnpc.clothes!.neck!.pattern.replace(/ /g, '_')}` : '';
      return gray_suffix(`img/clothes/neck/${nnpc.clothes!.neck!.variable}/acc${integrity}${pattern}.png`, options.filters!['nnpc_neck_acc']);
    },
    showfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.clothes!.neck!.accImage !== 0 && nnpc.clothes!.neck!.accessory === 1 && !nnpc.hide_leash && nnpc.show && nnpc.model;
    },
    zfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      const check = nnpc.clothes!.head!.mask_img === 1 && !(nnpc.clothes!.upper!.hoodposition === 'down' && nnpc.clothes!.head!.hood && nnpc.clothes!.head!.outfitSecondary != null);
      return (check ? maplebirch.char.ZIndices.collar : maplebirch.char.ZIndices.neck) + nnpc.position!;
    },
    dyfn(options: LayerOptions) {
      return (options.maplebirch.nnpc.high_waist_suspenders ? -8 : 0) + options.maplebirch.nnpc.dyfn!;
    }
  })
};

export default neck_layers;
