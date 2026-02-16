// ./src/modules/NamedNPCAddon/NPCSiderbarConfig/face_layers.ts

import maplebirch from '../../../core';
import { clothes_layer, clothes_back, clothes_back_acc } from './functions';
import { LayerOptions } from '../../../../types/npcsidebar-layers';

const face_layers = {
  nnpc_face_main: clothes_layer('face', 'main', {
    zfn(options: LayerOptions) {
      if (options.maplebirch.nnpc.clothes.face.type.includes('glasses')) return maplebirch.char.ZIndices.over_head + options.maplebirch.nnpc.position!;
      return maplebirch.char.ZIndices.face + options.maplebirch.nnpc.position!;
    }
  }),
  nnpc_face_acc: clothes_layer('face', 'acc', {
    zfn(options: LayerOptions) {
      if (options.maplebirch.nnpc.clothes.face.type.includes('glasses')) return maplebirch.char.ZIndices.over_head + options.maplebirch.nnpc.position!;
      return maplebirch.char.ZIndices.face + options.maplebirch.nnpc.position!;
    }
  }),
  nnpc_face_back: clothes_back('face'),
  nnpc_face_back_acc: clothes_back_acc('face')
};

export default face_layers;
