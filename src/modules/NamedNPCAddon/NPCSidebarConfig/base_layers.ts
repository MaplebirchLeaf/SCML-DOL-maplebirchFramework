// ./src/modules/NamedNPCAddon/NPCSidebarConfig/base_layers.ts

import maplebirch from '../../../core';
import { nnpc_sidepart } from './functions';

type NPCSidebarOptions = {
  filters?: Record<string, any>;
  maplebirch: {
    nnpc: Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
};

const base_layers = {
  nnpc_body: {
    masksrcfn(options: NPCSidebarOptions) {
      if (options.maplebirch.nnpc.model) return options.maplebirch.nnpc.close_up_mask;
      return null;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (nnpc.model) return 'img/body/base-classic.png';
      const selected = V.options.maplebirch.npcsidebar.display[nnpc.name];
      const art = maplebirch.npc.Clothes.art.get(nnpc.name);
      if (!selected) return;
      if (selected === art?.key) return art.body;
    },
    showfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.show;
    },
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.base + options.maplebirch.nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.model ? options.maplebirch.nnpc.dxfn : 0;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.model ? options.maplebirch.nnpc.dyfn : 0;
    },
    filtersfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.model ? ['nnpc_tan'] : [];
    },
    animation: 'idle'
  },

  nnpc_head: {
    masksrcfn(options: NPCSidebarOptions) {
      if (options.maplebirch.nnpc.model) return options.maplebirch.nnpc.close_up_mask;
      return null;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (nnpc.model) return 'img/body/base-head.png';
      const selected = V.options.maplebirch.npcsidebar.display[nnpc.name];
      const art = maplebirch.npc.Clothes.art.get(nnpc.name);
      if (!selected) return;
      if (selected === art?.key) return art.head?.img;
    },
    showfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.show;
    },
    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const art = maplebirch.npc.Clothes.art.get(nnpc.name);
      if (!nnpc.model && typeof art?.head?.zIndex === 'number') return art.head.zIndex;
      return (nnpc.model ? maplebirch.char.ZIndices.basehead : maplebirch.char.ZIndices.head) + nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.model ? options.maplebirch.nnpc.dxfn : 0;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.model ? options.maplebirch.nnpc.dyfn : 0;
    },
    filtersfn(options: NPCSidebarOptions) {
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
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (!nnpc.breasts) return '';
      const breastType = nnpc.breasts === 'cleavage' && (nnpc.breast_size ?? 0) >= 3 ? 'clothed' : 'breasts';
      return `img/body/breasts/${breastType}-${nnpc.breast_size ?? 0}.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.show && nnpc.model;
    },
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.breasts + options.maplebirch.nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: ['nnpc_tan'],
    animation: 'idle'
  },

  nnpc_leftarm: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (nnpc.arm_left === 'cover') return 'img/body/left-arm-cover.png';
      return 'img/body/left-arm-idle-classic.png';
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.show && nnpc.model && nnpc.arm_left !== 'none';
    },
    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.arm_left === 'cover' ? maplebirch.char.ZIndices.left_cover_arm + nnpc.position : nnpc.zarms;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: ['nnpc_tan'],
    animation: 'idle'
  },

  nnpc_rightarm: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (nnpc.arm_right === 'idle') return 'img/body/right-arm-idle-classic.png';
      return `img/body/right-arm-${nnpc.arm_right}.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.show && nnpc.model && nnpc.arm_right !== 'none';
    },
    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.arm_right === 'cover' || nnpc.arm_right === 'hold' ? maplebirch.char.ZIndices.right_cover_arm + nnpc.position : nnpc.zarms;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: ['nnpc_tan'],
    animation: 'idle'
  },

  nnpc_penis: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },

    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (!nnpc.name) return '';
      if (nnpc.genitals_chastity) return 'img/body/penis/chastity.png';
      const underLower = nnpc.clothes.under_lower;
      if (underLower.type?.includes('strap-on') && underLower.state === 'waist') return '';
      const folder = nnpc.balls ? 'penis' : 'penis-no-balls';
      return `img/body/${folder}/${nnpc.penis}.png`;
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const underLower = nnpc.clothes.under_lower;
      const strapon = underLower.type?.includes('strap-on') && underLower.state === 'waist';
      return nnpc.crotch_visible && !!nnpc.penis && !strapon && nnpc.show && nnpc.model;
    },

    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (!nnpc.crotch_exposed) return maplebirch.char.ZIndices.penisunderclothes + nnpc.position;
      return (nnpc.genitals_chastity ? maplebirch.char.ZIndices.penis_chastity : maplebirch.char.ZIndices.penis) + nnpc.position;
    },

    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },

    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },

    filters: ['nnpc_tan'],
    animation: 'idle'
  },

  nnpc_freckles: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return `img/face/${nnpc.facestyle}/freckles.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return !!nnpc.freckles && nnpc.show && nnpc.model;
    },
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.freckles + options.maplebirch.nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: ['nnpc_tan']
  },

  nnpc_ears: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return `img/face/${nnpc.facestyle}/ears.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.ears_position === 'front' && nnpc.show && nnpc.model;
    },
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.ears + options.maplebirch.nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: ['nnpc_tan']
  },

  nnpc_eyes: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return `img/face/${nnpc.facestyle}/${nnpc.facevariant}/eyes.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.show && nnpc.model;
    },
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.eyes + options.maplebirch.nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: ['nnpc_tan']
  },

  nnpc_sclera: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return `img/face/${nnpc.facestyle}/${nnpc.facevariant}/sclera.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.show && nnpc.model;
    },
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.sclera + options.maplebirch.nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    }
  },

  nnpc_iris: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return `img/face/${nnpc.facestyle}/${nnpc.facevariant}/iris.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.show && nnpc.model;
    },
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.iris + options.maplebirch.nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: ['nnpc_eyes'],
    animation: 'idle'
  },

  nnpc_eyelids: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return `img/face/${nnpc.facestyle}/${nnpc.facevariant}/eyelids.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.show && nnpc.model;
    },
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.eyelids + options.maplebirch.nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: ['nnpc_tan'],
    animationfn(options: NPCSidebarOptions) {
      return options.blink ? 'blink' : '';
    }
  },

  nnpc_lashes: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return `img/face/${nnpc.facestyle}/${nnpc.facevariant}/lashes.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.show && nnpc.model;
    },
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.lashes + options.maplebirch.nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: ['nnpc_tan'],
    animationfn(options: NPCSidebarOptions) {
      return options.blink ? 'blink' : '';
    }
  },

  nnpc_brows: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return `img/face/${nnpc.facestyle}/${nnpc.facevariant}/brow-top.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.show && nnpc.model;
    },
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.brow + options.maplebirch.nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: ['nnpc_brows']
  },

  nnpc_mouth: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return `img/face/${nnpc.facestyle}/mouth-smile.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return nnpc.show && nnpc.model;
    },
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.mouth + options.maplebirch.nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: ['nnpc_tan']
  },

  nnpc_hair_sides: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.head_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return `img/hair/sides/${nnpc.hair_sides_type}/${nnpc.hair_sides_length}.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return !!nnpc.show_hair && !!nnpc.hair_sides_type && nnpc.show && nnpc.model;
    },
    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return (nnpc.hair_sides_position === 'front' ? maplebirch.char.ZIndices.hair_forward : maplebirch.char.ZIndices.backhair) + nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: ['nnpc_hair'],
    animation: 'idle'
  },

  nnpc_hair_fringe: {
    masksrcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;

      if (Array.isArray(nnpc.head_mask) && nnpc.head_mask.length) return nnpc.head_mask;

      if (nnpc.fringe_mask_src) return [nnpc.close_up_mask, nnpc.fringe_mask_src];

      return nnpc.close_up_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return `img/hair/fringe/${nnpc.hair_fringe_type}/${nnpc.hair_fringe_length}.png`;
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return !!nnpc.show_hair && !!nnpc.hair_fringe_type && nnpc.show && nnpc.model;
    },
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.front_hair + options.maplebirch.nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: ['nnpc_hair_fringe'],
    animation: 'idle'
  },

  nnpc_hair_extra: {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.head_mask;
    },
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
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
      const path = `img/hair/back/${nnpc.hair_sides_type}`;
      if (nnpc.hair_sides_length === 'feet' && [...hairs, 'straight'].includes(nnpc.hair_sides_type)) return `${path}/feet.png`;
      if (nnpc.hair_sides_length === 'thighs' && hairs.includes(nnpc.hair_sides_type)) return `${path}/thighs.png`;
      if (nnpc.hair_sides_length === 'navel' && nnpc.hair_sides_type === 'messy ponytail') return `${path}/navel.png`;
      return '';
    },
    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      return !!nnpc.show_hair && !!nnpc.hair_sides_type && nnpc.show && nnpc.model;
    },
    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.backhair + options.maplebirch.nnpc.position;
    },
    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: ['nnpc_hair'],
    animation: 'idle'
  }
};

export default base_layers;
