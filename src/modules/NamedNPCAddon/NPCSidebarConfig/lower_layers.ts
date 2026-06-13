// ./src/modules/NamedNPCAddon/NPCSidebarConfig/lower_layers.ts

import maplebirch from '../../../core';
import { gray_suffix, clothes_layer, clothes_breasts, clothes_back, clothes_back_acc } from './functions';

type NPCSidebarOptions = {
  filters?: Record<string, any>;
  maplebirch: {
    nnpc: Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
};

const lower_layers = {
  nnpc_over_lower_main: clothes_layer('over_lower', 'main'),
  nnpc_over_lower_acc: clothes_layer('over_lower', 'acc'),
  nnpc_over_lower_detail: clothes_layer('over_lower', 'detail'),
  nnpc_over_lower_back: clothes_back('over_lower'),

  nnpc_lower_main: clothes_layer('lower', 'main', {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.lower_mask;
    },

    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const lower = nnpc.clothes.lower;
      const base = lower.type.includes('covered') ? maplebirch.char.ZIndices.lower_cover : maplebirch.char.ZIndices.lower;
      if (lower.high_img) return maplebirch.char.ZIndices.lower_high + nnpc.position;
      return base + nnpc.position;
    }
  }),

  nnpc_lower_acc: clothes_layer('lower', 'acc', {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.lower_mask;
    },

    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const clothes = nnpc.clothes;
      const lower = clothes.lower;
      const secondary = clothes.upper.name === 'school blouse' && lower.name.includes('pinafore') ? '_under' : '';
      const integrity = lower.accessory_integrity_img ? `_${lower.integrity}` : secondary;
      const pattern = lower.pattern && lower.pattern_layer === 'secondary' ? `_${lower.pattern.replace(/ /g, '_')}` : '';
      return gray_suffix(`img/clothes/lower/${lower.variable}/acc${integrity}${pattern}.png`, options.filters?.nnpc_lower_acc);
    },

    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const lower = nnpc.clothes.lower;
      if (lower.name.includes('ballgown') || lower.name.includes('pinafore')) return maplebirch.char.ZIndices.upper_top + nnpc.position;
      if (lower.type.includes('covered')) return maplebirch.char.ZIndices.lower_cover + nnpc.position;
      return maplebirch.char.ZIndices.lower + nnpc.position;
    }
  }),

  nnpc_lower_detail: clothes_layer('lower', 'detail', {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.lower_mask;
    }
  }),

  nnpc_lower_breasts: clothes_breasts('lower', 'main', {
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.lower_high + options.maplebirch.nnpc.position;
    }
  }),

  nnpc_lower_breasts_acc: clothes_breasts('lower', 'acc', {
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.lower_high + options.maplebirch.nnpc.position;
    }
  }),

  nnpc_lower_penis: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },

    srcfn(options: NPCSidebarOptions) {
      const lower = options.maplebirch.nnpc.clothes.lower;
      return gray_suffix(`img/clothes/lower/${lower.variable}/penis.png`, options.filters?.nnpc_lower);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const lower = nnpc.clothes.lower;
      return lower.penis_img === 1 && nnpc.calculate_penis_bulge(nnpc) - 6 > 0 && nnpc.show && nnpc.model;
    },

    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.lower_top + options.maplebirch.nnpc.position;
    },

    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },

    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },

    filters: ['nnpc_lower'],
    animation: 'idle'
  },

  nnpc_lower_penis_acc: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },

    srcfn(options: NPCSidebarOptions) {
      const lower = options.maplebirch.nnpc.clothes.lower;
      return gray_suffix(`img/clothes/lower/${lower.variable}/acc_penis.png`, options.filters?.nnpc_lower_acc);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const lower = nnpc.clothes.lower;
      return lower.penis_acc_img === 1 && lower.accessory === 1 && nnpc.calculate_penis_bulge(nnpc) - 6 > 0 && nnpc.show && nnpc.model;
    },

    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.lower_top + options.maplebirch.nnpc.position;
    },

    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },

    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },

    filters: ['nnpc_lower_acc'],
    animation: 'idle'
  },

  nnpc_lower_back: clothes_back('lower', {
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.back_lower + options.maplebirch.nnpc.position;
    }
  }),

  nnpc_lower_back_acc: clothes_back_acc('lower', {
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.back_lower + options.maplebirch.nnpc.position;
    }
  }),

  nnpc_under_lower_main: clothes_layer('under_lower', 'main', {
    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (nnpc.clothes.lower.high_img) return maplebirch.char.ZIndices.under_lower_high + nnpc.position;
      return maplebirch.char.ZIndices.under_lower + nnpc.position;
    }
  }),

  nnpc_under_lower_acc: clothes_layer('under_lower', 'acc'),
  nnpc_under_lower_detail: clothes_layer('under_lower', 'detail'),

  nnpc_under_lower_penis: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },

    srcfn(options: NPCSidebarOptions) {
      const underLower = options.maplebirch.nnpc.clothes.under_lower;
      return gray_suffix(`img/clothes/under_lower/${underLower.variable}/penis.png`, options.filters?.nnpc_under_lower);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const underLower = nnpc.clothes.under_lower;
      return underLower.penis_img === 1 && nnpc.calculate_penis_bulge(nnpc) > 0 && nnpc.show && nnpc.model;
    },

    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.under_lower_top + options.maplebirch.nnpc.position;
    },

    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },

    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },

    filters: ['nnpc_under_lower'],
    animation: 'idle'
  },

  nnpc_under_lower_penis_acc: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },

    srcfn(options: NPCSidebarOptions) {
      const underLower = options.maplebirch.nnpc.clothes.under_lower;
      return gray_suffix(`img/clothes/under_lower/${underLower.variable}/acc_penis.png`, options.filters?.nnpc_under_lower_acc);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const underLower = nnpc.clothes.under_lower;
      return underLower.penis_acc_img === 1 && underLower.accessory === 1 && nnpc.calculate_penis_bulge(nnpc) > 0 && nnpc.show && nnpc.model;
    },

    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.under_lower_top + options.maplebirch.nnpc.position;
    },

    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },

    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },

    filters: ['nnpc_under_lower_acc'],
    animation: 'idle'
  }
};

export default lower_layers;
