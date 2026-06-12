// ./src/modules/NamedNPCAddon/NPCSidebarConfig/head_layers.ts

import { gray_suffix, clothes_layer, clothes_back, clothes_back_acc } from './functions';

type NPCSidebarOptions = {
  filters?: Record<string, any>;
  maplebirch: {
    nnpc: Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
};

const head_layers = {
  nnpc_over_head_main: clothes_layer('over_head', 'main'),
  nnpc_over_head_acc: clothes_layer('over_head', 'acc'),
  nnpc_over_head_back: clothes_back('over_head'),
  nnpc_over_head_back_acc: clothes_back_acc('over_head'),

  nnpc_head_main: clothes_layer('head', 'main', {
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const head = nnpc.clothes.head;
      const integrity = head.accessory_integrity_img ? nnpc.clothes.upper.integrity : head.integrity;
      const pattern = head.pattern && !['tertiary', 'secondary'].includes(head.pattern_layer) ? `-${head.pattern.replace(/ /g, '-')}` : '';
      return gray_suffix(`img/clothes/head/${head.variable}/${integrity}${pattern}.png`, options.filters?.nnpc_head);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.clothes.head.index > 0 && nnpc.clothes.head.mainImage !== 0 && !nnpc.hide_all && nnpc.show && nnpc.model;
    }
  }),

  nnpc_head_acc: clothes_layer('head', 'acc', {
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const head = nnpc.clothes.head;
      const integrity = head.accessory_integrity_img ? `-${nnpc.clothes.upper.integrity}` : '';
      const pattern = head.pattern && head.pattern_layer === 'secondary' ? `-${head.pattern.replace(/ /g, '-')}` : '';
      return gray_suffix(`img/clothes/head/${head.variable}/acc${integrity}${pattern}.png`, options.filters?.nnpc_head_acc);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const head = nnpc.clothes.head;
      return head.index > 0 && head.accImage !== 0 && head.accessory === 1 && !nnpc.hide_head_acc && !nnpc.hide_all && nnpc.show && nnpc.model;
    }
  }),

  nnpc_head_detail: clothes_layer('head', 'detail', {
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const head = nnpc.clothes.head;
      const pattern = head.pattern ? head.pattern.replace(/ /g, '-') : '';
      return `img/clothes/head/${head.variable}/${pattern}.png`;
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const head = nnpc.clothes.head;
      return head.index > 0 && head.mainImage !== 0 && head.pattern_layer === 'tertiary' && !!head.pattern && !nnpc.hide_all && nnpc.show && nnpc.model;
    }
  }),

  nnpc_head_back: clothes_back('head'),
  nnpc_head_back_acc: clothes_back_acc('head')
};

export default head_layers;
