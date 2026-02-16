// ./src/modules/NamedNPCAddon/NPCSiderbarConfig/upper_layers.ts

import maplebirch from '../../../core';
import { clothes_layer, clothes_breasts, clothes_arm, clothes_arm_acc, clothes_back } from './functions';
import { LayerOptions } from '../../../../types/npcsidebar-layers';

const upper_layers = {
  nnpc_over_upper_main: clothes_layer('over_upper', 'main'),
  nnpc_over_upper_acc: clothes_layer('over_upper', 'acc'),
  nnpc_over_upper_detail: clothes_layer('over_upper', 'detail'),
  nnpc_over_upper_breasts: clothes_breasts('over_upper', 'main'),
  nnpc_over_upper_leftarm: clothes_arm('over_upper', 'left'),
  nnpc_over_upper_rightarm: clothes_arm('over_upper', 'right'),
  nnpc_upper_main: clothes_layer('upper', 'main', {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.upper_mask;
    },
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.clothes!.upper!.name === 'cocoon' ? maplebirch.char.ZIndices.over_head + options.maplebirch.nnpc.position! : options.maplebirch.nnpc.zupper!;
    }
  }),
  nnpc_upper_acc: clothes_layer('upper', 'acc', {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.upper_mask;
    },
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.zupper!;
    }
  }),
  nnpc_upper_detail: clothes_layer('upper', 'detail', {
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.zupper!;
    }
  }),
  nnpc_upper_breasts: clothes_breasts('upper', 'main', {
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.zupper!;
    }
  }),
  nnpc_upper_breasts_acc: clothes_breasts('upper', 'acc', {
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.zupper!;
    }
  }),
  nnpc_upper_breasts_detail: clothes_breasts('upper', 'detail', {
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.zupper!;
    }
  }),
  nnpc_upper_leftarm: clothes_arm('upper', 'left', {
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.zupperleft!;
    }
  }),
  nnpc_upper_rightarm: clothes_arm('upper', 'right', {
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.zupperright!;
    }
  }),
  nnpc_upper_leftarm_acc: clothes_arm_acc('upper', 'left', {
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.zupperleft!;
    }
  }),
  nnpc_upper_rightarm_acc: clothes_arm_acc('upper', 'right', {
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.zupperright!;
    }
  }),
  nnpc_upper_back: clothes_back('upper', {
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.back_lower + options.maplebirch.nnpc.position!;
    }
  }),
  nnpc_under_upper_main: clothes_layer('under_upper', 'main'),
  nnpc_under_upper_acc: clothes_layer('under_upper', 'acc'),
  nnpc_under_upper_breasts: clothes_breasts('under_upper', 'main'),
  nnpc_under_upper_breasts_acc: clothes_breasts('under_upper', 'acc'),
  nnpc_under_upper_breasts_detail: clothes_breasts('under_upper', 'detail', {
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.under_upper + options.maplebirch.nnpc.position!;
    }
  }),
  nnpc_under_upper_leftarm: clothes_arm('under_upper', 'left'),
  nnpc_under_upper_rightarm: clothes_arm('under_upper', 'right'),
  nnpc_under_upper_back: clothes_back('under_upper')
};

export default upper_layers;
