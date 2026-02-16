// ./src/modules/NamedNPCAddon/NPCSidebar.ts

import maplebirch from '../../core';
import { convert } from '../../utils';
import { gray_suffix, lookupColour, clothes_layer } from './NPCSidebarConfig/functions';
import { LayerOptions } from '../../../types/npcsidebar-layers';
import base_layers from './NPCSidebarConfig/base_layers';
import head_layers from './NPCSidebarConfig/head_layers';
import face_layers from './NPCSidebarConfig/face_layers';
import neck_layers from './NPCSidebarConfig/neck_layers';
import upper_layers from './NPCSidebarConfig/upper_layers';
import lower_layers from './NPCSidebarConfig/lower_layers';
import hands_layers from './NPCSidebarConfig/hands_layers';
import handheld_layers from './NPCSidebarConfig/handheld_layers';
import legs_layers from './NPCSidebarConfig/legs_layers';
import feet_layers from './NPCSidebarConfig/feet_layers';
import NPCManager from '../NamedNPC';
import { ModZipReader } from '../../../types/sugarcube-2-ModLoader/ModZipReader';

const display = new Map();
const _ = maplebirch.lodash;

function loadFromMod(modZip: ModZipReader, npcName: string) {
  if (!Array.isArray(npcName) || _.isEmpty(npcName)) return [];
  const formats = new Set(['png', 'jpg', 'gif']);
  const paths = [];
  for (const name of npcName) {
    const npcName = convert(name, 'capitalize');
    if (!display.has(npcName)) display.set(npcName, new Set());
    const npcSet = display.get(npcName);
    const folder = `img/ui/nnpc/${npcName.toLowerCase()}/`;
    for (const file in modZip.zip.files) {
      if (file.startsWith(folder) && file !== folder) {
        const ext = file.split('.').pop().toLowerCase();
        if (formats.has(ext)) {
          const imgName = _.chain(file).split('/').last().split('.')[0].value();
          if (imgName) {
            npcSet.add(imgName);
            paths.push(file);
          }
        }
      }
    }
  }
  return paths;
}

function preprocess(options: LayerOptions) {
  ((options.maplebirch as any) ??= {}).nnpc ??= {};
  const nnpc = options.maplebirch.nnpc;
  nnpc.name = V.NPCList[0].fullDescription;
  const nnpc_name = nnpc.name;
  nnpc.show = V.options.maplebirch.npcsidebar.show ? true : false;
  nnpc.model = V.options.maplebirch.npcsidebar.model && setup.NPCNameList.includes(nnpc_name) ? true : false;
  nnpc.position = V.options.maplebirch.npcsidebar.position === 'front' ? 300 : -100;
  nnpc.dxfn = V.options.maplebirch.npcsidebar.dxfn ?? -48;
  nnpc.dyfn = V.options.maplebirch.npcsidebar.dyfn ?? -8;
  nnpc.tan = V.options.maplebirch.npcsidebar.tan ?? 0;
  nnpc.skin_type = nnpc.name === 'Ivory Wraith' ? 'wraith' : (V.options.maplebirch.npcsidebar.skin_type ?? 'light');
  nnpc.freckles = V.options.maplebirch.npcsidebar.freckles ? true : false;
  nnpc.facestyle = V.options.maplebirch.npcsidebar.facestyle ?? 'default';
  nnpc.facevariant = V.options.maplebirch.npcsidebar.facevariant ?? 'default';
  nnpc.ears_position = V.options.maplebirch.npcsidebar.ears ?? 'back';
  nnpc.close_up_mask = maplebirch.char.mask(V.options.maplebirch.npcsidebar.mask);
  if (nnpc_name && nnpc.model) {
    options.filters.nnpc_tan = setup.colours.getSkinFilter(nnpc.skin_type, nnpc.tan);
    const npcData = V.maplebirch.npc[nnpc_name.toLowerCase()];
    const keys = ['head', 'face', 'neck', 'upper', 'lower', 'feet', 'legs', 'handheld', 'genitals', 'under_upper', 'under_lower', 'over_head', 'over_upper', 'over_lower', 'hands'];
    const clothes_data = _.assign(
      _.reduce(keys, (acc, slot) => _.set(acc, slot, { index: 0, name: '', type: [] }), {}),
      npcData.clothes ?? {}
    );
    nnpc.clothes = {};
    _.forEach(keys, slot => {
      const index = _.get(clothes_data, `${slot}.index`, 0);
      nnpc.clothes[slot] = _.assign({}, setup.clothes[slot][index], clothes_data[slot]);
      nnpc.clothes[slot].integrity = integrityKeyword(nnpc.clothes[slot], slot);
      const prefilter = setup.clothes[slot][index].prefilter;
      const colour = nnpc.clothes[slot].colour ?? 'white';
      if (colour) options.filters[`nnpc_${slot}`] = lookupColour(setup.colours.clothes_map, colour, prefilter);
      const acc = nnpc.clothes[slot].accessory_colour ?? 'white';
      if (acc) options.filters[`nnpc_${slot}_acc`] = lookupColour(setup.colours.clothes_map, acc, prefilter);
    });
    const nnpc_clothes = nnpc.clothes;

    nnpc.upper_tucked = npcData.tucked[0] && !setup.clothes.upper[clothesIndex('upper', nnpc_clothes.upper)].notuck && nnpc_clothes.upper.outfitPrimary == null;
    nnpc.lower_tucked = npcData.tucked[1] && !nnpc_clothes.feet.notuck && !nnpc_clothes.lower.notuck;
    nnpc.handheld_animation = nnpc_clothes.handheld.name.includes('coin') ? 'coinFlip' : nnpc_clothes.handheld.name === 'heart hand warmer' ? 'handWarmer' : 'idle';

    if (nnpc_clothes.lower.exposed >= 2 && nnpc_clothes.under_lower.exposed >= 1 && !nnpc_clothes.legs.name.includes('tights')) {
      nnpc.crotch_visible = true;
      nnpc.crotch_exposed = true;
    } else if (nnpc_clothes.lower.type.includes('naked') && nnpc_clothes.under_lower.type.includes('naked')) {
      nnpc.crotch_visible = true;
      nnpc.crotch_exposed = false;
    } else {
      nnpc.crotch_visible = false;
    }

    nnpc.arm_left = _.some(setup.clothes_all_slots, slot => _.includes(['left_cover', 'clutch', 'cover_both'], nnpc_clothes[slot]?.holdPosition)) ? 'cover' : 'idle';
    nnpc.arm_right = _.some(setup.clothes_all_slots, slot => _.includes(['right_cover', 'cover_both'], nnpc_clothes[slot]?.holdPosition))
      ? 'cover'
      : (nnpc_clothes.handheld.name !== 'naked' && !_.includes(['left_cover', 'idle'], nnpc_clothes.handheld?.holdPosition)) ||
          _.some(setup.clothes_all_slots, slot => nnpc_clothes[slot]?.holdPosition === 'hold')
        ? 'hold'
        : 'idle';

    if (nnpc_clothes.under_upper.sleeve_img === 1) {
      nnpc.zarms = maplebirch.char.ZIndices.under_upper_arms - 0.1;
    } else if (nnpc_clothes.upper.sleeve_img === 1) {
      nnpc.zarms =
        (nnpc.arm_left === 'cover' ? (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_arms_tucked : maplebirch.char.ZIndices.upper_arms) : maplebirch.char.ZIndices.under_upper_arms) - 0.1;
    } else if (nnpc_clothes.over_upper.index) {
      nnpc.zarms = maplebirch.char.ZIndices.over_upper_arms - 0.1;
    } else if (nnpc_clothes.upper.index) {
      nnpc.zarms =
        (nnpc.arm_left === 'cover' ? (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_arms_tucked : maplebirch.char.ZIndices.upper_arms) : maplebirch.char.ZIndices.under_upper_arms) - 0.1;
    } else if (nnpc_clothes.under_upper.index) {
      nnpc.zarms = maplebirch.char.ZIndices.under_upper_arms - 0.1;
    } else {
      nnpc.zarms = maplebirch.char.ZIndices.armsidle;
    }
    nnpc.zarms += nnpc.position;

    nnpc.zupper = (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_tucked : maplebirch.char.ZIndices.upper) + nnpc.position;
    nnpc.zupperleft = (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_arms_tucked : maplebirch.char.ZIndices.upper_arms) + nnpc.position;
    nnpc.zupperright = (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_arms_tucked : maplebirch.char.ZIndices.upper_arms) + nnpc.position;

    nnpc.handheld_position = nnpc.arm_right === 'hold' ? 'hold' : _.includes(['right_cover'], nnpc_clothes.handheld.holdPosition) ? 'right_cover' : null;
    if (nnpc_clothes.upper.name === 'cocoon') nnpc.hide_all = true;
    if (nnpc_clothes.neck.name === 'familiar collar') if (!nnpc_clothes.neck.type.includes('leash')) nnpc.hide_leash = true;

    if (nnpc_clothes.handheld.type.includes('rainproof')) {
      nnpc.handheld_overhead = true;
    } else if (_.includes(['right_cover', 'over_head'], nnpc_clothes.handheld.holdPosition)) {
      nnpc.handheld_overhead = true;
    } else {
      nnpc.handheld_overhead = null;
    }
    if (nnpc_clothes.head.name === 'sage witch hat') nnpc.hide_head_acc = false; // 等npc转化来

    nnpc.breasts = !nnpc_clothes.upper.type.includes('naked') || !nnpc_clothes.under_upper.type.includes('naked') ? 'cleavage' : 'default';
    nnpc.breast_size = [0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 5, 5, 6][Math.round(npcData?.bodydata.breastsize)] ?? 0;
    nnpc.penis = npcData?.bodydata.penis !== 'none' ? (npcData?.bodydata.virginity.penile ? 'virgin' : 'default') : false;
    nnpc.penis_size = Math.clamp(npcData?.bodydata.penissize, 1, 4);
    nnpc.genitals_chastity = nnpc_clothes.genitals.type.includes('chastity');
    nnpc.eye_colour = npcData?.bodydata.eyeColour;
    options.filters.nnpc_eyes = lookupColour(setup.colours.eyes_map, nnpc.eye_colour, 'eyes');
    nnpc.hair_colour = npcData?.bodydata.hairColour;
    options.filters.nnpc_brows = lookupColour(setup.colours.hair_map, nnpc.hair_colour, 'brows');
    options.filters.nnpc_hair = lookupColour(setup.colours.hair_map, nnpc.hair_colour, 'hair');
    const hairstyle = _.find(setup.hairstyles.sides, hs => hs.variable === npcData?.bodydata.hair_side_type);
    nnpc.hair_sides_type =
      hairstyle?.alt_head_type && _.includes(hairstyle?.alt_head_type, setup.clothes.head[clothesIndex('head', nnpc_clothes.head)].head_type) ? hairstyle.alt : npcData?.bodydata.hair_side_type;
    nnpc.hair_fringe_type = npcData?.bodydata.hair_fringe_type;
    nnpc.hair_position = npcData?.bodydata.hair_position;
    nnpc.hair_length = ['short', 'shoulder', 'chest', 'navel', 'thighs', 'feet'][Math.trunc(npcData?.bodydata.hairlength / 200)];

    // 计算凸起，后续如果可以加性欲控制
    nnpc.calculate_penis_bulge = (nnpc: LayerOptions['maplebirch']['nnpc']) => {
      const clothes = nnpc.clothes;
      if (clothes.under_lower.type.includes('strap-on')) return (clothes.under_lower.size || 0) * 3;
      const penis = V.maplebirch.npc[nnpc.name.toLowerCase()]?.bodydata.penis !== 'none';
      const compressed = penis && clothes.genitals.type.includes('hidden');
      if (!penis || compressed) return 0;
      if (clothes.genitals.type.includes('cage')) return Math.clamp(nnpc.penis_size, 0, Infinity);
    };
    nnpc.alt_sleeve_state = nnpc_clothes.upper.variable === 'schoolcardigan' && nnpc_clothes.upper.altposition !== 'alt' ? null : true;
    nnpc.high_waist_suspenders =
      nnpc_clothes.neck.name === 'suspenders' &&
      nnpc_clothes.neck.altposition != 'alt' &&
      _.includes(['retro shorts', 'retro trousers', 'baseball shorts', 'wide leg trousers'], nnpc_clothes.lower.name)
        ? true
        : null;
    nnpc.hood_mask = nnpc_clothes.head.mask_img === 1 && !(nnpc_clothes.head.hood && nnpc_clothes.head.outfitSecondary != null) ? true : null;
    nnpc.head_mask = [nnpc.close_up_mask];
    nnpc.upper_mask = [nnpc.close_up_mask];
    nnpc.lower_mask = [nnpc.close_up_mask];
    nnpc.legs_mask = [nnpc.close_up_mask];
    if (nnpc_clothes.upper.mask_img === 1 && nnpc_clothes.upper.name === 'cocoon') {
      nnpc.head_mask.push('img/clothes/upper/cocoon/mask.png');
    } else if (nnpc_clothes.over_head.mask_img === 1) {
      nnpc.head_mask.push(`img/clothes/head/${nnpc_clothes.over_head.variable}/mask.png`);
    } else if (nnpc_clothes.head.mask_img === 1) {
      const hair_all = ['curly pigtails', 'fluffy ponytail', 'thick sidetail', 'thick twintails', 'ribbon tail', 'thick ponytail', 'half-up'];
      const hair_featured = ['scorpion tails', 'thick pigtails', 'thick twintails'];
      nnpc.head_mask.push(
        `img/clothes/head/${nnpc_clothes.head.variable}/${(nnpc_clothes.head.mask_img_ponytail === 1 && _.includes(hair_all, nnpc.hair_sides_type)) || (_.includes(hair_featured, nnpc.hair_sides_type) && _.includes(['furcap f', 'furcap m'], nnpc_clothes.head.variable)) ? 'mask_ponytail' : 'mask'}.png`
      );
    }
    if (nnpc_clothes.upper.mask_img === 1) nnpc.upper_mask.push(gray_suffix(`img/clothes/upper/${nnpc_clothes.upper.variable}/${nnpc_clothes.upper.integrity}.png`, options.filters['nnpc_upper']));
    if (nnpc_clothes.lower.mask_img === 1) nnpc.lower_mask.push(gray_suffix(`img/clothes/lower/${nnpc_clothes.lower.variable}/${nnpc_clothes.lower.integrity}.png`, options.filters['nnpc_lower']));
    if (nnpc.lower_tucked && !nnpc_clothes.lower.notuck && !nnpc_clothes.feet.notuck) {
      nnpc.feet_clip_src = `img/clothes/feet/${nnpc_clothes.feet.variable}/mask.png`;
      nnpc.lower_mask.push(nnpc.feet_clip_src);
      nnpc.legs_mask.push(nnpc.feet_clip_src);
    } else if (!nnpc_clothes.feet.notuck) {
      nnpc.legs_mask.push(`img/clothes/feet/${nnpc_clothes.feet.variable}/mask.png`);
    } else {
      nnpc.feet_clip_src = null;
    }
  }
}

const layers = {
  ...base_layers,
  ...head_layers,
  ...face_layers,
  ...neck_layers,
  ...upper_layers,
  ...lower_layers,
  ...hands_layers,
  ...handheld_layers,
  ...legs_layers,
  ...feet_layers,
  nnpc_genitals: clothes_layer('genitals', 'main', {
    srcfn(options: LayerOptions) {
      let size: number;
      const genitals = options.maplebirch.nnpc.clothes.genitals;
      if (genitals.penisSize) {
        switch (options.maplebirch.nnpc.penis_size) {
          case 0:
            size = 0;
            break;
          case 1:
          case 2:
            size = 1;
            break;
          case 3:
          case 4:
            size = 2;
            break;
        }
      }
      return `img/clothes/genitals/${genitals.variable}/${genitals.integrity}${size}.png`;
    },
    showfn(options: LayerOptions) {
      const clothes = options.maplebirch.nnpc.clothes;
      return clothes.genitals.mainImage !== 0 && !clothes.genitals.hideUnderLower.includes(clothes.under_lower.name) && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: LayerOptions) {
      return (options.maplebirch.nnpc.crotch_exposed ? maplebirch.char.ZIndices.penis_chastity + 0.1 : maplebirch.char.ZIndices.penisunderclothes + 0.1) + options.maplebirch.nnpc.position;
    }
  }),
  nnpc: {
    srcfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      const npcsidebar = (V.options.maplebirch ??= {}).npcsidebar;
      if (!npcsidebar.display[nnpc.name]) return;
      if (npcsidebar.display[nnpc.name] === 'none' || npcsidebar.display[nnpc.name] === maplebirch.npc.Clothes.layers.get(nnpc.name)?.key) return;
      return `img/ui/nnpc/${nnpc.name.toLowerCase()}/${npcsidebar.display[nnpc.name]}.png`;
    },
    showfn(options: LayerOptions) {
      const nnpc = options.maplebirch.nnpc;
      return !!nnpc.show && !nnpc.model && nnpc.name && setup.NPCNameList.includes(nnpc.name);
    },
    zfn(options: LayerOptions) {
      return options.maplebirch.nnpc.position;
    },
    animation: 'idle'
  }
};

const NPCSidebar = (() => {
  class NPCSidebar {
    static get display() {
      return display;
    }

    static loadFromMod = loadFromMod;

    static hair_type(type: 'sides' | 'fringe') {
      const hair_name: Record<string, string> = {};
      const HAIR_NAME = (style: any) => (maplebirch.modUtils.getMod('ModI18N') && maplebirch.Language === 'CN' ? style.name_cap : style.name);
      if (type === 'sides') _.forEach(setup.hairstyles.sides, (style: { variable: string }) => (hair_name[convert(HAIR_NAME(style), 'title')] = style.variable));
      if (type === 'fringe') _.forEach(setup.hairstyles.fringe, (style: { variable: string }) => (hair_name[convert(HAIR_NAME(style), 'title')] = style.variable));
      return hair_name;
    }

    static init(manager: NPCManager) {
      for (const npcName of manager.NPCNameList) if (!display.has(npcName)) display.set(npcName, new Set());
      manager.core.char.use('pre', preprocess);
      manager.core.char.use(layers);
    }
  }

  return NPCSidebar;
})();

export default NPCSidebar;
