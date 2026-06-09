// ./src/modules/NamedNPCAddon/NPCSidebarConfig/fluids_layers.ts

import maplebirch from '../../../core';

type NPCSidebarOptions = {
  maplebirch: {
    nnpc: Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
};

function titleCase(value: string) {
  return value
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function faceUncovered(nnpc: Record<string, any>) {
  const type = nnpc.clothes.face?.type ?? [];
  return !type.includes('mask') && !type.includes('face_covering');
}

function cumLayer(file: string, prop: string, z: (nnpc: Record<string, any>) => number, show?: (nnpc: Record<string, any>) => boolean) {
  return {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc[prop] ? `img/body/cum/${file}-${nnpc[prop]}.png` : '';
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.show && nnpc.model && !!nnpc[prop] && (show ? show(nnpc) : true);
    },
    zfn(options: NPCSidebarOptions) {
      return z(options.maplebirch.nnpc);
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    animation: 'idle'
  };
}

function dripLayer(file: string, prop: string, animation: string, z: (nnpc: Record<string, any>) => number) {
  return {
    ...cumLayer(file, prop, z),
    animationfn(options: NPCSidebarOptions) {
      const value = options.maplebirch.nnpc[prop];
      return value ? `${animation}${titleCase(value)}` : '';
    }
  };
}

const fluids_layers = {
  nnpc_drip_vaginal: dripLayer('vaginal', 'drip_vaginal', 'VaginalCumDrip', nnpc => maplebirch.char.ZIndices.tears + nnpc.position),
  nnpc_drip_anal: dripLayer('anal', 'drip_anal', 'AnalCumDrip', nnpc => maplebirch.char.ZIndices.tears + nnpc.position),
  nnpc_drip_mouth: {
    ...dripLayer('mouth', 'drip_mouth', 'MouthCumDrip', nnpc => maplebirch.char.ZIndices.semen_cough + nnpc.position),
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.show && nnpc.model && !!nnpc.drip_mouth && faceUncovered(nnpc);
    }
  },

  nnpc_cum_chest: cumLayer('chest', 'cum_chest', nnpc => maplebirch.char.ZIndices.tears + nnpc.position),
  nnpc_cum_face: cumLayer('face', 'cum_face', nnpc => maplebirch.char.ZIndices.tears + nnpc.position, faceUncovered),
  nnpc_cum_feet: cumLayer('feet', 'cum_feet', nnpc => maplebirch.char.ZIndices.feet + 0.2 + nnpc.position),
  nnpc_cum_leftarm: cumLayer('left-arm', 'cum_leftarm', nnpc => nnpc.zarms + 0.05, nnpc => nnpc.arm_left !== 'none' && nnpc.arm_left !== 'cover'),
  nnpc_cum_rightarm: cumLayer('right-arm', 'cum_rightarm', nnpc => nnpc.zarms + 0.05, nnpc => nnpc.arm_right !== 'none' && nnpc.arm_right !== 'cover' && nnpc.arm_right !== 'hold'),
  nnpc_cum_neck: cumLayer('neck', 'cum_neck', nnpc => maplebirch.char.ZIndices.tears + nnpc.position),
  nnpc_cum_thigh: cumLayer('thighs', 'cum_thigh', nnpc => maplebirch.char.ZIndices.tears + nnpc.position),
  nnpc_cum_tummy: cumLayer('tummy', 'cum_tummy', nnpc => maplebirch.char.ZIndices.tears + nnpc.position)
};

export default fluids_layers;
