// ./src/modules/NamedNPCAddon/NPCSiderbarConfig/feet_layers.ts

import maplebirch from '../../../core';
import { clothes_layer, clothes_back, clothes_back_acc } from './functions';
import { LayerOptions } from '../../../../types/npcsidebar-layers';

const feet_layers = {
  nnpc_feet_main: clothes_layer('feet', 'main', {
    zfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      const check = nnpc.lower_tucked && !nnpc.clothes!.lower!.notuck && !nnpc.clothes!.feet!.notuck;
      if (check) return maplebirch.char.ZIndices.lower_tucked_feet + options.maplebirch.nnpc.position!;
      return maplebirch.char.ZIndices.feet + options.maplebirch.nnpc.position!;
    },
  }),
  nnpc_feet_acc: clothes_layer('feet', 'acc', {
    zfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      const check = nnpc.lower_tucked && !nnpc.clothes!.lower!.notuck && !nnpc.clothes!.feet!.notuck;
      if (check) return maplebirch.char.ZIndices.lower_tucked_feet + options.maplebirch.nnpc.position!;
      return maplebirch.char.ZIndices.feet + options.maplebirch.nnpc.position!;
    },
  }),
  nnpc_feet_details: clothes_layer('feet', 'detail'),
  nnpc_feet_back: clothes_back('feet'),
  nnpc_feet_back_acc: clothes_back_acc('feet')
};

export default feet_layers;