// ./src/modules/NamedNPCAddon/NPCSidebarConfig/upper_layers.ts

import maplebirch from '../../../core';
import { clothes_layer, clothes_breasts, clothes_arm, clothes_arm_acc, clothes_back } from './functions';

import type { NPCSidebarOptions } from './types';

const upper_layers = {
  nnpc_over_upper_main: clothes_layer('over_upper', 'main'),
  nnpc_over_upper_acc: clothes_layer('over_upper', 'acc'),
  nnpc_over_upper_detail: clothes_layer('over_upper', 'detail'),
  nnpc_over_upper_breasts: clothes_breasts('over_upper', 'main'),
  nnpc_over_upper_leftarm: clothes_arm('over_upper', 'left', {
    zfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch.nnpc;
      return maplebirch.char.ZIndices.over_upper_arms + (nnpc.arm_left === 'cover' ? 0.9 : 0) + nnpc.position;
    }
  }),
  nnpc_over_upper_rightarm: clothes_arm('over_upper', 'right', {
    zfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch.nnpc;
      return maplebirch.char.ZIndices.over_upper_arms + (['cover', 'hold'].includes(nnpc.arm_right) ? 0.9 : 0) + nnpc.position;
    }
  }),
  nnpc_over_upper_back: clothes_back('over_upper', {
    zfn: (options: NPCSidebarOptions) => {
      return maplebirch.char.ZIndices.back_lower - 10 + options.maplebirch.nnpc.position;
    }
  }),

  nnpc_upper_main: clothes_layer('upper', 'main', {
    masksrcfn: (options: NPCSidebarOptions) => {
      return options.maplebirch.nnpc.upper_mask;
    },

    zfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch.nnpc;
      if (nnpc.clothes.upper.name === 'cocoon') return maplebirch.char.ZIndices.over_head + nnpc.position;
      return nnpc.zupper;
    }
  }),

  nnpc_upper_acc: clothes_layer('upper', 'acc', {
    masksrcfn: (options: NPCSidebarOptions) => {
      return options.maplebirch.nnpc.upper_mask;
    },

    zfn: (options: NPCSidebarOptions) => {
      return options.maplebirch.nnpc.zupper;
    }
  }),

  nnpc_upper_detail: clothes_layer('upper', 'detail', {
    zfn: (options: NPCSidebarOptions) => {
      return options.maplebirch.nnpc.zupper;
    }
  }),

  nnpc_upper_breasts: clothes_breasts('upper', 'main', {
    zfn: (options: NPCSidebarOptions) => {
      return options.maplebirch.nnpc.zupper;
    }
  }),

  nnpc_upper_breasts_acc: clothes_breasts('upper', 'acc', {
    zfn: (options: NPCSidebarOptions) => {
      return options.maplebirch.nnpc.zupper;
    }
  }),

  nnpc_upper_breasts_detail: clothes_breasts('upper', 'detail', {
    zfn: (options: NPCSidebarOptions) => {
      return options.maplebirch.nnpc.zupper;
    }
  }),

  nnpc_upper_leftarm: clothes_arm('upper', 'left', {
    zfn: (options: NPCSidebarOptions) => {
      return options.maplebirch.nnpc.zupperleft;
    }
  }),

  nnpc_upper_rightarm: clothes_arm('upper', 'right', {
    zfn: (options: NPCSidebarOptions) => {
      return options.maplebirch.nnpc.zupperright;
    }
  }),

  nnpc_upper_leftarm_acc: clothes_arm_acc('upper', 'left', {
    zfn: (options: NPCSidebarOptions) => {
      return options.maplebirch.nnpc.zupperleft;
    }
  }),

  nnpc_upper_rightarm_acc: clothes_arm_acc('upper', 'right', {
    zfn: (options: NPCSidebarOptions) => {
      return options.maplebirch.nnpc.zupperright;
    }
  }),

  nnpc_upper_back: clothes_back('upper', {
    zfn: (options: NPCSidebarOptions) => {
      return maplebirch.char.ZIndices.back_lower + options.maplebirch.nnpc.position;
    }
  }),

  nnpc_under_upper_main: clothes_layer('under_upper', 'main'),
  nnpc_under_upper_acc: clothes_layer('under_upper', 'acc'),
  nnpc_under_upper_breasts: clothes_breasts('under_upper', 'main'),
  nnpc_under_upper_breasts_acc: clothes_breasts('under_upper', 'acc'),

  nnpc_under_upper_breasts_detail: clothes_breasts('under_upper', 'detail', {
    zfn: (options: NPCSidebarOptions) => {
      return maplebirch.char.ZIndices.under_upper + options.maplebirch.nnpc.position;
    }
  }),

  nnpc_under_upper_leftarm: clothes_arm('under_upper', 'left', {
    zfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.arm_left === 'cover' ? nnpc.zupperleft - 1 : maplebirch.char.ZIndices.under_upper_arms + nnpc.position;
    }
  }),
  nnpc_under_upper_rightarm: clothes_arm('under_upper', 'right', {
    zfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch.nnpc;
      return ['cover', 'hold'].includes(nnpc.arm_right) ? nnpc.zupperright - 1 : maplebirch.char.ZIndices.under_upper_arms + nnpc.position;
    }
  }),
  nnpc_under_upper_leftarm_acc: clothes_arm_acc('under_upper', 'left', {
    zfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.arm_left === 'cover' ? nnpc.zupperleft - 1 : maplebirch.char.ZIndices.under_upper_arms + nnpc.position;
    }
  }),
  nnpc_under_upper_rightarm_acc: clothes_arm_acc('under_upper', 'right', {
    zfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch.nnpc;
      return ['cover', 'hold'].includes(nnpc.arm_right) ? nnpc.zupperright - 1 : maplebirch.char.ZIndices.under_upper_arms + nnpc.position;
    }
  }),
  nnpc_under_upper_back: clothes_back('under_upper')
};

export default upper_layers;
