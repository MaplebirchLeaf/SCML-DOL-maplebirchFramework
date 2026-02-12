// ./src/modules/NamedNPCAddon/NPCSiderbarConfig/head_layers.ts

import { gray_suffix, clothes_layer, clothes_back, clothes_back_acc } from './functions';
import { LayerOptions } from '../../../../types/npcsidebar-layers';

const head_layers = {
  nnpc_over_head_main: clothes_layer('over_head', 'main'),
  nnpc_over_head_acc: clothes_layer('over_head', 'acc'),
  nnpc_over_head_back: clothes_back('over_head'),
  nnpc_over_head_back_acc: clothes_back_acc('over_head'),
  nnpc_head_main: clothes_layer('head', 'main', {
    srcfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      const dmg = nnpc.clothes.head.accessory_integrity_img ? nnpc.clothes.upper.integrity : nnpc.clothes.head.integrity;
      const pattern = nnpc.clothes.head.pattern && !['tertiary', 'secondary'].includes(nnpc.clothes.head.pattern_layer) ? `_${nnpc.clothes.head.pattern.replace(/ /g, '_')}` : '';
      return gray_suffix(`img/clothes/head/${nnpc.clothes.head.variable}/${dmg}${pattern}.png`, options.filters!['nnpc_head']);
    },
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.clothes.head.mainImage !== 0 && !options.maplebirch.nnpc.hide_all && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    }
  }),
  nnpc_head_acc: clothes_layer('head', 'acc', {
    srcfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      const dmg = nnpc.clothes.head.accessory_integrity_img ? `_${nnpc.clothes.upper.integrity}` : '';
      const pattern = nnpc.clothes.head.pattern && nnpc.clothes.head.pattern_layer === 'secondary' ? `_${nnpc.clothes.head.pattern.replace(/ /g, '_')}` : '';
      return gray_suffix(`img/clothes/head/${nnpc.clothes.head.variable}/acc${dmg}${pattern}.png`, options.filters!['nnpc_head_acc']);
    },
    showfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.clothes.head.accImage !== 0 && nnpc.clothes.head.accessory === 1 && !nnpc.hide_head_acc && !nnpc.hide_all && nnpc.show && nnpc.model;
    }
  }),
  nnpc_head_detail: clothes_layer('head', 'detail', {
    showfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.clothes.head.mainImage !== 0 && nnpc.clothes.head.pattern_layer === 'tertiary' && !!nnpc.clothes.head.pattern && !nnpc.hide_all && nnpc.show && nnpc.model;
    }
  }),
  nnpc_head_back: clothes_back('head'),
  nnpc_head_back_acc: clothes_back_acc('head')
};

export default head_layers;