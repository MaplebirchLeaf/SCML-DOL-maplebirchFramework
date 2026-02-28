// ./src/modules/NamedNPCAddon/NPCSiderbarConfig/base_layers.ts

import maplebirch from '../../../core';
import { nnpc_sidepart } from './functions';
import { LayerOptions } from '../../../../types/npcsidebar-layers';

const base_layers = {
  nnpc_body: {
    masksrcfn(options: LayerOptions) {
      if (options.maplebirch.nnpc.model) return options.maplebirch.nnpc.close_up_mask;
      return null;
    },
    srcfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (nnpc.model) return 'img/body/basenoarms-classic.png';
      const npcsidebar = (V.options.maplebirch ??= {}).npcsidebar;
      if (!npcsidebar.display[nnpc.name!]) return undefined;
      if (npcsidebar.display[nnpc.name!] === maplebirch.npc.Clothes.layers.get(nnpc.name!)?.key) return maplebirch.npc.Clothes.layers.get(nnpc.name!)?.body;
    },
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.show;
    },
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.base + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.model ? options.maplebirch.nnpc.dxfn! : 0;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.model ? options.maplebirch.nnpc.dyfn! : 0;
    },
    filters: ['nnpc_tan'],
    animation: 'idle'
  },
  nnpc_head: {
    masksrcfn(options: LayerOptions) {
      if (options.maplebirch.nnpc.model) return options.maplebirch.nnpc.close_up_mask;
      return null;
    },
    srcfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (nnpc.model) return 'img/body/basehead.png';
      const npcsidebar = (V.options.maplebirch ??= {}).npcsidebar;
      if (!npcsidebar.display[nnpc.name!]) return undefined;
      if (npcsidebar.display[nnpc.name!] === maplebirch.npc.Clothes.layers.get(nnpc.name!)?.key) return maplebirch.npc.Clothes.layers.get(nnpc.name!)?.head.img;
    },
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.show;
    },
    zfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (nnpc.model) return maplebirch.char.ZIndices.basehead + nnpc.position!;
      const layer = maplebirch.npc.Clothes.layers.get(nnpc.name!);
      if (layer && typeof layer.head?.zIndex === 'number') return layer.head.zIndex;
      return maplebirch.char.ZIndices.head + nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.model ? options.maplebirch.nnpc.dxfn! : 0;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.model ? options.maplebirch.nnpc.dyfn! : 0;
    },
    filtersfn(options: LayerOptions) {
      return options.maplebirch.nnpc.model ? ['nnpc_tan'] : [];
    },
    animation: 'idle'
  },
  nnpc_face: nnpc_sidepart('face'),
  nnpc_neck: nnpc_sidepart('neck'),
  nnpc_upper: nnpc_sidepart('upper'),
  nnpc_lower: nnpc_sidepart('lower'),
  nnpc_legs: nnpc_sidepart('legs'),
  nnpc_feet: nnpc_sidepart('feet'),
  nnpc_hands: nnpc_sidepart('hands'),
  nnpc_breasts: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: LayerOptions) {
      if (!options.maplebirch.nnpc.breasts) return '';
      const suffix = options.maplebirch.nnpc.breasts === 'cleavage' && (options.maplebirch.nnpc.breast_size || 0) >= 3 ? '_clothed.png' : '.png';
      return `img/body/breasts/breasts${options.maplebirch.nnpc.breast_size || 0}${suffix}`;
    },
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.breasts + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_tan'],
    animation: 'idle'
  },
  nnpc_leftarm: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    src: 'img/body/leftarmidle-classic.png',
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.arm_left === 'cover' ? maplebirch.char.ZIndices.left_cover_arm : options.maplebirch.nnpc.zarms!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_tan'],
    animation: 'idle'
  },
  nnpc_rightarm: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    src: 'img/body/rightarmidle-classic.png',
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.arm_right === 'cover' || options.maplebirch.nnpc.arm_right === 'hold' ? maplebirch.char.ZIndices.right_cover_arm : options.maplebirch.nnpc.zarms!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_tan'],
    animation: 'idle'
  },
  nnpc_penis: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: LayerOptions) {
      if (!!options.maplebirch.nnpc.name) return '';
      if (options.maplebirch.nnpc.genitals_chastity) {
        const genitalsName = options.maplebirch.nnpc.clothes?.genitals?.name;
        if (!genitalsName) return '';
        if (['chastity belt', 'flat chastity cage', 'chastity parasite'].includes(genitalsName)) return '';
        if (genitalsName === 'small chastity cage') return 'img/body/penis/penis_chastitysmall.png';
        return 'img/body/penis/penis_chastity.png';
      }
      const underLower = options.maplebirch.nnpc.clothes?.under_lower;
      if (underLower && Array.isArray(underLower.type) && underLower.type.includes('strap-on') && underLower.state === 'waist') return '';
      const prefix = options.maplebirch.nnpc.penis === 'virgin' ? 'penis_virgin' : 'penis';
      return `img/body/penis/${prefix}${options.maplebirch.nnpc.penis_size || 0}.png`;
    },
    showfn(options: LayerOptions) {
      return !!options.maplebirch.nnpc.crotch_visible && !!options.maplebirch.nnpc.penis && !!options.maplebirch.nnpc.show && !!options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      if (!options.maplebirch.nnpc.crotch_exposed) return maplebirch.char.ZIndices.penisunderclothes + options.maplebirch.nnpc.position!;
      return options.maplebirch.nnpc.genitals_chastity
        ? maplebirch.char.ZIndices.penis_chastity + options.maplebirch.nnpc.position!
        : maplebirch.char.ZIndices.penis + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_tan'],
    animation: 'idle'
  },
  nnpc_freckles: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: LayerOptions) {
      return `img/face/${options.maplebirch.nnpc.facestyle}/freckles.png`;
    },
    showfn(options: LayerOptions) {
      return !!options.maplebirch.nnpc.freckles && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.freckles + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_tan']
  },
  nnpc_ears: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: LayerOptions) {
      return `img/face/${options.maplebirch.nnpc.facestyle}/ears.png`;
    },
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.ears_position === 'front' && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.ears + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_tan']
  },
  nnpc_eyes: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: LayerOptions) {
      return `img/face/${options.maplebirch.nnpc.facestyle}/${options.maplebirch.nnpc.facevariant}/eyes.png`;
    },
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.eyes + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_tan']
  },
  nnpc_sclera: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: LayerOptions) {
      return `img/face/${options.maplebirch.nnpc.facestyle}/${options.maplebirch.nnpc.facevariant}/sclera.png`;
    },
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.sclera + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    }
  },
  nnpc_iris: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: LayerOptions) {
      return `img/face/${options.maplebirch.nnpc.facestyle}/${options.maplebirch.nnpc.facevariant}/iris.png`;
    },
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.iris + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_eyes'],
    animation: 'idle'
  },
  nnpc_eyelids: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: LayerOptions) {
      return `img/face/${options.maplebirch.nnpc.facestyle}/${options.maplebirch.nnpc.facevariant}/eyelids.png`;
    },
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.eyelids + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_tan'],
    animationfn(options: LayerOptions) {
      return options.blink ? 'blink' : '';
    }
  },
  nnpc_lashes: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: LayerOptions) {
      return `img/face/${options.maplebirch.nnpc.facestyle}/${options.maplebirch.nnpc.facevariant}/lashes.png`;
    },
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.lashes + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_tan'],
    animationfn(options: LayerOptions) {
      return options.blink ? 'blink' : '';
    }
  },
  nnpc_brows: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: LayerOptions) {
      return `img/face/${options.maplebirch.nnpc.facestyle}/${options.maplebirch.nnpc.facevariant}/brow-top.png`;
    },
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.brow + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_brows']
  },
  nnpc_mouth: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: LayerOptions) {
      return `img/face/${options.maplebirch.nnpc.facestyle}/mouth-smile.png`;
    },
    showfn(options: LayerOptions) {
      return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.mouth + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_tan']
  },
  nnpc_hair_sides: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.head_mask;
    },
    srcfn(options: LayerOptions) {
      return `img/hair/sides/${options.maplebirch.nnpc.hair_sides_type}/${options.maplebirch.nnpc.hair_length}.png`;
    },
    showfn(options: LayerOptions) {
      return !!options.maplebirch.nnpc.hair_sides_type && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return (options.maplebirch.nnpc.hair_position === 'front' ? maplebirch.char.ZIndices.hairforwards : maplebirch.char.ZIndices.backhair) + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_hair'],
    animation: 'idle'
  },
  nnpc_hair_fringe: {
    masksrcfn(options: LayerOptions) {
      const fringe_mask_src =
        ['fro', 'afro pouf', 'afro puffs'].includes(options.maplebirch.nnpc.hair_sides_type!) && options.maplebirch.nnpc.hair_fringe_type === 'fro'
          ? [options.maplebirch.nnpc.close_up_mask, `img/hair/fringe/${options.maplebirch.nnpc.hair_fringe_type}/mask.png`]
          : options.maplebirch.nnpc.close_up_mask;

      return options.maplebirch.nnpc.head_mask ? options.maplebirch.nnpc.head_mask : fringe_mask_src;
    },
    srcfn(options: LayerOptions) {
      return `img/hair/fringe/${options.maplebirch.nnpc.hair_fringe_type}/${options.maplebirch.nnpc.hair_length}.png`;
    },
    showfn(options: LayerOptions) {
      return !!options.maplebirch.nnpc.hair_fringe_type && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.fronthair + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_hair'],
    animation: 'idle'
  },
  nnpc_hair_extra: {
    masksrcfn(options: LayerOptions) {
      return options.maplebirch.nnpc.head_mask;
    },
    srcfn(options: LayerOptions) {
      const hairs = [
        'default',
        'loose',
        'curl',
        'defined curl',
        'neat',
        'dreads',
        'afro pouf',
        'thick ponytail',
        'all down',
        'half-up',
        'messy ponytail',
        'ruffled',
        'half up twintail',
        'princess wave',
        'space buns',
        'sleek',
        'bedhead'
      ];
      const path = `img/hair/back/${options.maplebirch.nnpc.hair_sides_type}`;
      if (options.hair_sides_length === 'feet' && [...hairs, 'straight'].includes(options.maplebirch.nnpc.hair_sides_type!)) return `${path}/feet.png`;
      if (options.hair_sides_length === 'thighs' && hairs.includes(options.maplebirch.nnpc.hair_sides_type!)) return `${path}/thighs.png`;
      if (options.hair_sides_length === 'navel' && options.maplebirch.nnpc.hair_sides_type === 'messy ponytail') return `${path}/navel.png`;
    },
    showfn(options: LayerOptions) {
      return !!options.maplebirch.nnpc.hair_sides_type && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return maplebirch.char.ZIndices.backhair + options.maplebirch.nnpc.position!;
    },
    dxfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dxfn!;
    },
    dyfn(options: LayerOptions) {
      return options.maplebirch.nnpc.dyfn!;
    },
    filters: ['nnpc_hair'],
    animation: 'idle'
  }
};

export default base_layers;
