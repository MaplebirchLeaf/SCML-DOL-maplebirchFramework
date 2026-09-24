// ./src/modules/NamedNPCAddon/NPCSidebarConfig/fluids_layers.ts

import maplebirch from '../../../core';
import { kaijuMask } from './functions';

import type { NPCSidebarOptions, NPCSidebarState } from './types';

function title_case(value: string) {
  return value
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function face_uncovered(nnpc: NPCSidebarState) {
  const type = nnpc.clothes.face?.type ?? [];
  return !type.includes('face_covering');
}

function cum_layer(file: string, prop: string, z: (nnpc: NPCSidebarState) => number, show?: (nnpc: NPCSidebarState) => boolean) {
  return {
    masksrcfn: (options: NPCSidebarOptions) => {
      return kaijuMask(options) || options.maplebirch.nnpc.close_up_mask;
    },
    srcfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch.nnpc;
      return nnpc[prop] ? `img/body/cum/${file}-${nnpc[prop]}.png` : '';
    },
    showfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.show && nnpc.model && !!nnpc[prop] && (show ? show(nnpc) : true);
    },
    zfn: (options: NPCSidebarOptions) => {
      return z(options.maplebirch.nnpc);
    },
    dxfn: (options: NPCSidebarOptions) => {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn: (options: NPCSidebarOptions) => {
      return options.maplebirch.nnpc.dyfn;
    },
    animation: 'idle'
  };
}

function drip_layer(file: string, prop: string, animation: string, z: (nnpc: NPCSidebarState) => number) {
  return {
    ...cum_layer(file, prop, z),
    repeat_mask: true,
    animationfn: (options: NPCSidebarOptions) => {
      const value = options.maplebirch.nnpc[prop];
      return value ? `${animation}${title_case(String(value))}` : '';
    }
  };
}

const fluids_layers = {
  nnpc_drip_vaginal: drip_layer('vaginal', 'drip_vaginal', 'VaginalCumDrip', nnpc => maplebirch.char.ZIndices.tears + nnpc.position),
  nnpc_drip_anal: drip_layer('anal', 'drip_anal', 'AnalCumDrip', nnpc => maplebirch.char.ZIndices.tears + nnpc.position),
  nnpc_drip_mouth: {
    ...drip_layer('mouth', 'drip_mouth', 'MouthCumDrip', nnpc => maplebirch.char.ZIndices.semen_cough + nnpc.position),
    showfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.show && nnpc.model && !!nnpc.drip_mouth && face_uncovered(nnpc);
    }
  },

  nnpc_cum_chest: cum_layer('chest', 'cum_chest', nnpc => maplebirch.char.ZIndices.tears + nnpc.position),
  nnpc_cum_face: cum_layer('face', 'cum_face', nnpc => maplebirch.char.ZIndices.tears + nnpc.position),
  nnpc_cum_feet: cum_layer('feet', 'cum_feet', nnpc => maplebirch.char.ZIndices.feet + 0.2 + nnpc.position),
  nnpc_cum_leftarm: cum_layer(
    'left-arm',
    'cum_leftarm',
    nnpc => nnpc.zarms + 0.05,
    nnpc => nnpc.arm_left !== 'none' && nnpc.arm_left !== 'cover'
  ),
  nnpc_cum_rightarm: cum_layer(
    'right-arm',
    'cum_rightarm',
    nnpc => nnpc.zarms + 0.05,
    nnpc => nnpc.arm_right !== 'none' && nnpc.arm_right !== 'cover' && nnpc.arm_right !== 'hold'
  ),
  nnpc_cum_neck: cum_layer('neck', 'cum_neck', nnpc => maplebirch.char.ZIndices.tears + nnpc.position),
  nnpc_cum_thigh: cum_layer('thighs', 'cum_thigh', nnpc => maplebirch.char.ZIndices.tears + nnpc.position),
  nnpc_cum_tummy: cum_layer('tummy', 'cum_tummy', nnpc => maplebirch.char.ZIndices.tears + nnpc.position)
};

export default fluids_layers;
