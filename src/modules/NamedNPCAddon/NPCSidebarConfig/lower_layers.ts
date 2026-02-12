// ./src/modules/NamedNPCAddon/NPCSiderbarConfig/lower_layers.ts

import maplebirch from '../../../core';
import { gray_suffix, clothes_layer, clothes_breasts, clothes_back, clothes_back_acc } from './functions';
import { LayerOptions } from '../../../../types/npcsidebar-layers';

const lower_layers = {
  nnpc_over_lower_main: clothes_layer('over_lower', 'main'),
  nnpc_over_lower_acc: clothes_layer('over_lower', 'acc'),
  nnpc_over_lower_detail: clothes_layer('over_lower', 'detail'),
  nnpc_over_lower_back: clothes_back('over_lower'),
  nnpc_lower_main: clothes_layer('lower', 'main', {
    masksrcfn(options: LayerOptions) { return options.maplebirch.nnpc.lower_mask; },
    zfn(options: LayerOptions) {
      const secondary = (options.maplebirch.nnpc.clothes!.lower!.type!.includes('covered') ? maplebirch.char.ZIndices.lower_cover : maplebirch.char.ZIndices.lower) + options.maplebirch.nnpc.position!;
      return options.maplebirch.nnpc.clothes!.lower!.high_img ? (maplebirch.char.ZIndices.lower_high + options.maplebirch.nnpc.position!) : secondary;
    },
  }),
  nnpc_lower_acc: clothes_layer('lower', 'acc', {
    masksrcfn(options: LayerOptions) { return options.maplebirch.nnpc.lower_mask; },
    srcfn(options: LayerOptions) {
      const clothes = options.maplebirch.nnpc.clothes!;
      const secondary = clothes.upper!.name === 'school blouse' && clothes.lower!.name!.includes('pinafore') ? '_under' : '';
      const suffix = clothes.lower!.accessory_integrity_img ? `_${clothes.lower!.integrity}` : secondary;
      const pattern = clothes.lower!.pattern && clothes.lower!.pattern_layer === 'secondary' ? `_${clothes.lower!.pattern.replace(/ /g, '_')}` : '';
      return gray_suffix(`img/clothes/lower/${clothes.lower!.variable}/${clothes.lower!.name}/acc${suffix}${pattern}.png`, options.filters!['nnpc_lower_acc']);
    },
    zfn(options: LayerOptions) {
      if (options.maplebirch.nnpc.clothes!.lower!.name!.includes('ballgown') || options.maplebirch.nnpc.clothes!.lower!.name!.includes('pinafore')) return maplebirch.char.ZIndices.upper_top + options.maplebirch.nnpc.position!;
      if (options.maplebirch.nnpc.clothes!.lower!.type!.includes('covered')) return maplebirch.char.ZIndices.lower_cover + options.maplebirch.nnpc.position!;
      return maplebirch.char.ZIndices.lower + options.maplebirch.nnpc.position!;
    },
  }),
  nnpc_lower_detail: clothes_layer('lower', 'detail', {
    masksrcfn(options: LayerOptions) { return options.maplebirch.nnpc.lower_mask; },
  }),
  nnpc_lower_breasts: clothes_breasts('lower', 'main', {
    zfn(options: LayerOptions) { return maplebirch.char.ZIndices.lower_high + options.maplebirch.nnpc.position!; }
  }),
  nnpc_lower_breasts_acc: clothes_breasts('lower', 'acc', {
    zfn(options: LayerOptions) { return maplebirch.char.ZIndices.lower_high + options.maplebirch.nnpc.position!; }
  }),
  nnpc_lower_penis: {
    masksrcfn(options: LayerOptions) { return options.maplebirch.nnpc.close_up_mask; },
    srcfn(options: LayerOptions) { return gray_suffix(`img/clothes/lower/${options.maplebirch.nnpc.clothes!.lower!.variable}/penis.png`, options.filters!['nnpc_lower']); },
    showfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.clothes!.lower!.penis_img === 1 && (nnpc.calculate_penis_bulge!(nnpc) - 6 > 0) && nnpc.show && nnpc.model;
    },
    zfn(options: LayerOptions) { return maplebirch.char.ZIndices.lower_top + options.maplebirch.nnpc.position!; },
    dxfn(options: LayerOptions) { return options.maplebirch.nnpc.dxfn!; },
    dyfn(options: LayerOptions) { return options.maplebirch.nnpc.dyfn!; },
    filters: ['nnpc_lower'],
    animation: 'idle'
  },
  nnpc_lower_penis_acc: {
    masksrcfn(options: LayerOptions) { return options.maplebirch.nnpc.close_up_mask; },
    srcfn(options: LayerOptions) { return gray_suffix(`img/clothes/lower/${options.maplebirch.nnpc.clothes!.lower!.variable}/acc_penis.png`, options.filters!['nnpc_lower_acc']); },
    showfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.clothes!.lower!.penis_acc_img === 1 && nnpc.clothes!.lower!.accessory === 1 && (nnpc.calculate_penis_bulge!(nnpc) - 6 > 0) && nnpc.show && nnpc.model;
    },
    zfn(options: LayerOptions) { return maplebirch.char.ZIndices.lower_top + options.maplebirch.nnpc.position!; },
    dxfn(options: LayerOptions) { return options.maplebirch.nnpc.dxfn!; },
    dyfn(options: LayerOptions) { return options.maplebirch.nnpc.dyfn!; },
    filters: ['nnpc_lower_acc'],
    animation: 'idle'
  },
  nnpc_lower_back: clothes_back('lower', {
    zfn(options: LayerOptions) { return maplebirch.char.ZIndices.back_lower + options.maplebirch.nnpc.position!; },
  }),
  nnpc_lower_back_acc: clothes_back_acc('lower', {
    zfn(options: LayerOptions) { return maplebirch.char.ZIndices.back_lower + options.maplebirch.nnpc.position!; },
  }),
  nnpc_under_lower_main: clothes_layer('under_lower', 'main', {
    zfn(options: LayerOptions) { return options.maplebirch.nnpc.clothes!.lower!.high_img ? maplebirch.char.ZIndices.under_lower_high + options.maplebirch.nnpc.position! : maplebirch.char.ZIndices.under_lower + options.maplebirch.nnpc.position!; },
  }),
  nnpc_under_lower_acc: clothes_layer('under_lower', 'acc'),
  nnpc_under_lower_detail: clothes_layer('under_lower', 'detail'),
  nnpc_under_lower_penis: {
    masksrcfn(options: LayerOptions) { return options.maplebirch.nnpc.close_up_mask; },
    srcfn(options: LayerOptions) { return gray_suffix(`img/clothes/under_lower/${options.maplebirch.nnpc.clothes!.under_lower!.variable}/penis.png`, options.filters!['nnpc_under_lower']); },
    showfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.clothes!.under_lower!.penis_img === 1 && (nnpc.calculate_penis_bulge!(nnpc) > 0) && nnpc.show && nnpc.model;
    },
    zfn(options: LayerOptions) { return maplebirch.char.ZIndices.under_lower_top + options.maplebirch.nnpc.position!; },
    dxfn(options: LayerOptions) { return options.maplebirch.nnpc.dxfn!; },
    dyfn(options: LayerOptions) { return options.maplebirch.nnpc.dyfn!; },
    filters: ['nnpc_under_lower'],
    animation: 'idle'
  },
  nnpc_under_lower_penis_acc: {
    masksrcfn(options: LayerOptions) { return options.maplebirch.nnpc.close_up_mask; },
    srcfn(options: LayerOptions) { return gray_suffix(`img/clothes/under_lower/${options.maplebirch.nnpc.clothes!.under_lower!.variable}/acc_penis.png`, options.filters!['nnpc_under_lower_acc']); },
    showfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.clothes!.under_lower!.penis_acc_img === 1 && nnpc.clothes!.under_lower!.accessory === 1 && (nnpc.calculate_penis_bulge!(nnpc) > 0) && nnpc.show && nnpc.model;
    },
    zfn(options: LayerOptions) { return maplebirch.char.ZIndices.under_lower_top + options.maplebirch.nnpc.position!; },
    dxfn(options: LayerOptions) { return options.maplebirch.nnpc.dxfn!; },
    dyfn(options: LayerOptions) { return options.maplebirch.nnpc.dyfn!; },
    filters: ['nnpc_under_lower'],
    animation: 'idle'
  }
};

export default lower_layers;