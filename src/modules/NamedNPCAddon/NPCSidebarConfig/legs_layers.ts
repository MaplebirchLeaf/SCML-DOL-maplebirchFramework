// ./src/modules/NamedNPCAddon/NPCSiderbarConfig/legs_layers.ts

import maplebirch from '../../../core';
import { clothes_layer, clothes_back, clothes_back_acc } from './functions';
import { LayerOptions } from '../../../../types/npcsidebar-layers';

const legs_layers = {
  nnpc_legs_main: clothes_layer('legs', 'main', {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.legs_mask;
    },
    zfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      const check = (nnpc.clothes!.under_lower!.set === nnpc.clothes!.under_upper!.set || nnpc.clothes!.under_lower!.high_img === 1) && nnpc.clothes!.legs!.high_img !== 1 && nnpc.show && nnpc.model;
      if (check) return maplebirch.char.ZIndices.legs + options.maplebirch.nnpc.position!;
      return maplebirch.char.ZIndices.legs_high + options.maplebirch.nnpc.position!;
    }
  }),
  nnpc_legs_acc: clothes_layer('legs', 'acc', {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.legs_mask;
    },
    zfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      const check = nnpc.clothes!.under_lower!.set === nnpc.clothes!.under_upper!.set || (nnpc.clothes!.under_lower!.high_img === 1 && nnpc.show && nnpc.model);
      if (check) return maplebirch.char.ZIndices.legs + options.maplebirch.nnpc.position!;
      return maplebirch.char.ZIndices.legs_high + options.maplebirch.nnpc.position!;
    }
  }),
  nnpc_legs_back: clothes_back('legs'),
  nnpc_legs_back_acc: clothes_back_acc('legs')
};

export default legs_layers;
