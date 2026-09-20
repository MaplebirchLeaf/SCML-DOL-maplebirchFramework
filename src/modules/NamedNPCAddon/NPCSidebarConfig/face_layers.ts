// ./src/modules/NamedNPCAddon/NPCSidebarConfig/face_layers.ts

import maplebirch from '../../../core';
import { clothes_layer, clothes_back, clothes_back_acc, isAltPosition } from './functions';

import type { NPCSidebarOptions } from './types';

const face_layers = {
  nnpc_face_main: clothes_layer('face', 'main', {
    zfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch.nnpc;
      const face = nnpc.clothes.face;
      if (isAltPosition(face) && (face.type.includes('cool') || face.type.includes('glasses'))) return maplebirch.char.ZIndices.over_head + nnpc.position;
      return maplebirch.char.ZIndices.facewear + nnpc.position;
    }
  }),

  nnpc_face_acc: clothes_layer('face', 'acc', {
    zfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch.nnpc;
      const face = nnpc.clothes.face;
      if (isAltPosition(face) && (face.type.includes('cool') || face.type.includes('glasses'))) return maplebirch.char.ZIndices.over_head + nnpc.position;
      return maplebirch.char.ZIndices.facewear + nnpc.position;
    }
  }),

  nnpc_face_back: clothes_back('face'),
  nnpc_face_back_acc: clothes_back_acc('face')
};

export default face_layers;
