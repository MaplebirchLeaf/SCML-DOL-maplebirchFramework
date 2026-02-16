// ./src/modules/NamedNPCAddon/NPCSiderbarConfig/functions.ts

import maplebirch from '../../../core';
import { clone } from '../../../utils';

function lookupColour(dict: { [x: string]: any }, key: string, prefilterName: string) {
  let filter: any;
  let record = dict[key];
  if (!record) return {};
  filter = clone(record.canvasfilter);
  if (prefilterName) Renderer.mergeLayerData(filter, setup.colours.sprite_prefilters[prefilterName], true);
  return filter;
}

function gray_suffix(path: string, filter: { blendMode: string; blend: any } | null | undefined) {
  if (!filter || filter.blendMode !== 'hard-light' || !filter.blend) return path;
  return path.replace('.png', '_gray.png');
}

type Part = 'face' | 'neck' | 'upper' | 'lower' | 'legs' | 'feet' | 'hands';
function nnpc_sidepart(part: Part) {
  return {
    srcfn(options: any) {
      const nnpc = options.maplebirch.nnpc;
      const npcsidebar = (V.options.maplebirch ??= {}).npcsidebar;
      if (!npcsidebar.display?.[nnpc.name]) return;
      const npcLayers = maplebirch.npc.Clothes.layers.get(nnpc.name);
      if (!npcLayers) return;
      if (npcsidebar.display[nnpc.name] === npcLayers.key && npcLayers[part]) return npcLayers[part].img;
    },
    showfn(options: any) {
      const nnpc = options.maplebirch.nnpc;
      if (!nnpc.show || nnpc.model) return false;
      const npcLayers = maplebirch.npc.Clothes.layers.get(nnpc.name);
      return npcLayers?.[part] != null;
    },
    zfn(options: any) {
      const nnpc = options.maplebirch.nnpc;
      const npcLayers = maplebirch.npc.Clothes.layers.get(nnpc.name);
      if (npcLayers?.[part]?.zIndex != null) return npcLayers[part].zIndex;
      return maplebirch.char.ZIndices[part] + nnpc.position;
    }
  };
}

function clothes_basic(slot: string, overrides: any = {}) {
  return {
    masksrcfn(options: any) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    zfn(options: any) {
      return maplebirch.char.ZIndices[slot] + options.maplebirch.nnpc.position;
    },
    dxfn(options: any) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: any) {
      return options.maplebirch.nnpc.dyfn;
    },
    animation: 'idle',
    ...overrides
  };
}

type ClothesType = 'main' | 'acc' | 'detail';
function clothes_layer(slot: string, type: ClothesType, overrides: any = {}) {
  return clothes_basic(slot, {
    srcfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      if (type === 'detail') {
        const alt_position = clothes.altposition === 'alt';
        const pattern = clothes.pattern ? clothes.pattern?.replace(/ /g, '_') : '';
        const suffix = alt_position ? '_alt' : '';
        return `img/clothes/${slot}/${clothes.variable}/${pattern}${suffix}.png`;
      } else {
        const down = clothes.hoodposition === 'down' && clothes.hoodposition != null && clothes.outfitPrimary?.head != null;
        const alt_position = clothes.altposition === 'alt' && (type === 'main' ? !clothes.altdisabled.includes('full') : type === 'acc' ? !clothes.altdisabled.includes('acc') : false);
        let pattern = '',
          prefix = '',
          suffix = '';
        if (type === 'main') {
          pattern = clothes.pattern && !['secondary', 'tertiary'].includes(clothes.pattern_layer) ? '_' + clothes.pattern?.replace(/ /g, '_') : '';
          prefix = clothes.integrity;
          suffix = alt_position ? '_alt' : down ? '_down' : '';
        } else if (type === 'acc') {
          pattern = clothes.pattern && clothes.pattern_layer === 'secondary' ? '_' + clothes.pattern?.replace(/ /g, '_') : '';
          const integrity = clothes.accessory_integrity_img ? `_${clothes.integrity}` : '';
          prefix = 'acc' + integrity;
          suffix = alt_position ? '_alt' : down ? '_down' : '';
        }
        const path = `img/clothes/${slot}/${clothes.variable}/${prefix}${pattern}${suffix}.png`;
        return gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
      }
    },
    showfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      if (!options.maplebirch.nnpc.show || !options.maplebirch.nnpc.model) return false;
      if (type === 'detail') {
        return clothes.mainImage !== 0 && !!clothes.pattern && clothes.pattern_layer === 'tertiary';
      } else if (type === 'acc') {
        return clothes.accImage !== 0 && clothes.accessory === 1;
      } else if (type === 'main') {
        return clothes.mainImage !== 0;
      }
    },
    filtersfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      if (type === 'detail') return [];
      const alt_filter_swap = clothes.altposition === 'alt' && clothes.altdisabled.includes('filter');
      if (type === 'main') {
        return alt_filter_swap ? [`nnpc_${slot}_acc`] : [`nnpc_${slot}`];
      } else if (type === 'acc') {
        return alt_filter_swap ? [`nnpc_${slot}`] : [`nnpc_${slot}_acc`];
      }
    },
    ...overrides
  });
}

function clothes_breasts(slot: string, type: ClothesType, overrides: any = {}) {
  return clothes_layer(slot, type, {
    masksrcfn(options: any) {
      if (type === 'main') {
        const clothes = options.maplebirch.nnpc.clothes[slot];
        if (clothes.mask_img === 1) return [options.maplebirch.nnpc.close_up_mask, `img/clothes/${slot}/${clothes.variable}/mask_${clothes.integrity}.png`];
      }
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      let breast_size;
      if (type === 'acc') {
        breast_size =
          typeof clothes.breast_acc_img === 'object'
            ? clothes.breast_acc_img[options.maplebirch.nnpc.breast_size]
            : typeof clothes.breast_img === 'object'
              ? clothes.breast_img[options.maplebirch.nnpc.breast_size]
              : Math.min(options.maplebirch.nnpc.breast_size, 6);
      } else {
        breast_size = typeof clothes.breast_img === 'object' ? clothes.breast_img[options.maplebirch.nnpc.breast_size] : Math.min(options.maplebirch.nnpc.breast_size, 6);
      }
      if (type === 'detail') {
        const pattern = clothes.pattern ? `_${clothes.pattern?.replace(/ /g, '_')}` : '';
        return `img/clothes/${slot}/${clothes.variable}/${breast_size}${pattern}.png`;
      } else {
        const alt_position = clothes.altposition === 'alt' && (type === 'main' ? !clothes.altdisabled?.includes('breasts') : false);
        const suffix = alt_position ? '_alt' : '';
        let pattern = '',
          extension = '';
        if (type === 'main') {
          pattern = clothes.pattern && !['tertiary', 'secondary'].includes(clothes.pattern_layer) ? `_${clothes.pattern?.replace(/ /g, '_')}` : '';
        } else if (type === 'acc') {
          pattern = clothes.pattern && clothes.pattern_layer === 'secondary' ? `_${clothes.pattern?.replace(/ /g, '_')}` : '';
          extension = '_acc';
        }
        const path = `img/clothes/${slot}/${clothes.variable}/${breast_size}${extension}${pattern}${suffix}.png`;
        return gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
      }
    },
    showfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      if (!options.maplebirch.nnpc.show || !options.maplebirch.nnpc.model) return false;
      if (clothes.mainImage === 0) return false;
      if (type === 'detail') {
        return typeof clothes.breast_acc_img === 'object' && clothes.breast_acc_img[options.maplebirch.nnpc.breast_size] != null && !!clothes.pattern && !!clothes.breast_pattern;
      } else if (type === 'acc') {
        return (
          (clothes.breast_img === 1 && typeof clothes.breast_img === 'object' && clothes.breast_img[options.maplebirch.nnpc.breast_size] != null) ||
          (typeof clothes.breast_acc_img === 'object' && clothes.breast_acc_img[options.maplebirch.nnpc.breast_size] != null)
        );
      } else if (type === 'main') {
        return typeof clothes.breast_img === 'object' && clothes.breast_img[options.maplebirch.nnpc.breast_size] != null;
      }
    },
    ...overrides
  });
}

type Side = 'left' | 'right';
function clothes_arm(slot: string, side: Side, overrides: any = {}) {
  return clothes_basic(slot, {
    srcfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      const alt_position = clothes.altposition === 'alt' && !clothes.altdisabled.includes('sleeves');
      const alt_sleeve = options.maplebirch.nnpc.alt_sleeve_state && clothes.altsleeve === 'alt';
      const held = side === 'right' && options.maplebirch.nnpc.handheld_position ? options.maplebirch.nnpc.handheld_position : side;
      const cover = options.maplebirch.nnpc[`arm_${side}`] === 'cover' ? `${side}_cover` : held;
      const alt = alt_position ? '_alt' : '';
      const rolled = alt_sleeve ? '_rolled' : '';
      const pattern = clothes.sleeve_colour === 'pattern' && clothes.pattern ? `_${clothes.pattern?.replace(/ /g, '_')}` : '';
      const path = `img/clothes/${slot}/${clothes.variable}/${cover}${alt}${pattern}${rolled}.png`;
      return gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
    },
    showfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      return clothes.sleeve_img === 1 && options.maplebirch.nnpc[`arm_${side}`] !== 'none' && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: any) {
      const cover = options.maplebirch.nnpc[`arm_${side}`] === 'cover' || options.maplebirch.nnpc[`arm_${side}`] === 'hold';
      return (cover ? maplebirch.char.ZIndices[`${slot}_arms_cover`] : maplebirch.char.ZIndices[`${slot}_arms`]) + options.maplebirch.nnpc.position;
    },
    filtersfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      switch (clothes.sleeve_colour) {
        case undefined:
        case '':
        case 'primary':
          return [`nnpc_${slot}`];
        case 'secondary':
          return [`nnpc_${slot}_acc`];
        case 'pattern':
          switch (clothes.pattern_layer) {
            case 'tertiary':
              return [];
            case 'secondary':
              return [`nnpc_${slot}_acc`];
            default:
              return [`nnpc_${slot}`];
          }
        default:
          return [];
      }
    },
    ...overrides
  });
}

function clothes_arm_acc(slot: string, side: Side, overrides: any = {}) {
  return clothes_basic(slot, {
    srcfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      const alt_position = clothes.altposition === 'alt' && !clothes.altdisabled?.includes('sleeves') && !clothes.altdisabled?.includes('sleeve_acc');
      const cover = options.maplebirch.nnpc[`arm_${side}`] === 'cover';
      const baseName = cover
        ? `${side}_cover_acc`
        : `${side === 'right' && options.maplebirch.nnpc.handheld_position ? options.maplebirch.nnpc.handheld_position : side}${alt_position ? '_alt_acc' : '_acc'}`;
      const path = `img/clothes/${slot}/${clothes.variable}/${baseName}.png`;
      return gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
    },
    showfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      return clothes.sleeve_img === 1 && clothes.sleeve_acc_img === 1 && options.maplebirch.nnpc[`arm_${side}`] !== 'none' && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
    },
    zfn(options: any) {
      return maplebirch.char.ZIndices[`${slot}_arms`] + options.maplebirch.nnpc.position;
    },
    filtersfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      switch (clothes.accessory_colour_sidebar) {
        case undefined:
        case '':
        case 'primary':
          return [`nnpc_${slot}_acc`];
        case 'secondary':
          return [`nnpc_${slot}`];
        case 'pattern':
          switch (clothes.pattern_layer) {
            case 'tertiary':
              return [];
            case 'secondary':
              return [`nnpc_${slot}_acc`];
            default:
              return [`nnpc_${slot}`];
          }
        default:
          return [];
      }
    },
    ...overrides
  });
}

function clothes_back(slot: string, overrides: any = {}) {
  return clothes_basic(slot, {
    srcfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      const alt_position = clothes.altposition === 'alt' && !clothes.altdisabled?.includes('back');
      const prefix = alt_position ? 'back_alt' : 'back';
      const suffix = clothes.back_integrity_img ? `_${clothes.integrity}` : '';
      const pattern = clothes.pattern && !['tertiary', 'secondary'].includes(clothes.pattern_layer) ? '_' + clothes.pattern?.replace(/ /g, '_') : '';
      const path = `img/clothes/${slot}/${clothes.variable}/${prefix}${suffix}${pattern}.png`;
      return gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
    },
    showfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      if (slot === 'handheld' && ['none', 'cover'].includes(options.maplebirch.nnpc.arm_right) && options.maplebirch.nnpc.clothes.handheld.coverBackImage === 0) return false;
      if (!options.maplebirch.nnpc.show || !options.maplebirch.nnpc.model) return false;
      const down = options.maplebirch.nnpc.clothes.upper.hoodposition === 'down' && clothes.hood && clothes.outfitSecondary != null;
      return clothes.back_img === 1 && !down;
    },
    zfn(options: any) {
      return maplebirch.char.ZIndices.over_head_back + options.maplebirch.nnpc.position;
    },
    filtersfn(options: any) {
      const colour = options.maplebirch.nnpc.clothes[slot].back_img_colour;
      switch (colour) {
        case 'none':
          return [];
        case '':
        case undefined:
        case 'primary':
          return [`nnpc_${slot}`];
        case 'secondary':
          return [`nnpc_${slot}_acc`];
        default:
          return [];
      }
    },
    ...overrides
  });
}

function clothes_back_acc(slot: string, overrides: any = {}) {
  return clothes_basic(slot, {
    srcfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      const alt_position = clothes.altposition === 'alt' && !clothes.altdisabled?.includes('back');
      const prefix = alt_position ? 'back_alt' : 'back';
      const suffix = clothes.back_integrity_img ? `_${clothes.integrity}` : '';
      const pattern = clothes.pattern && clothes.pattern_layer === 'secondary' ? '_' + clothes.pattern?.replace(/ /g, '_') : '';
      const path = `img/clothes/${slot}/${clothes.variable}/${prefix}${suffix}${pattern}_acc.png`;
      return gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
    },
    showfn(options: any) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      if (!options.maplebirch.nnpc.show || !options.maplebirch.nnpc.model) return false;
      if (slot === 'handheld' && options.maplebirch.nnpc.arm_right !== 'hold') return false;
      const down = options.maplebirch.nnpc.clothes.upper.hoodposition === 'down' && clothes.hood && clothes.outfitSecondary != null;
      return clothes.back_img_acc === 1 && !down;
    },
    zfn(options: any) {
      return maplebirch.char.ZIndices.head_back + options.maplebirch.nnpc.position;
    },
    filtersfn(options: any) {
      const colour = options.maplebirch.nnpc.clothes[slot].back_img_acc_colour;
      switch (colour) {
        case 'none':
          return [];
        case '':
        case undefined:
        case 'primary':
          return [`nnpc_${slot}`];
        case 'secondary':
          return [`nnpc_${slot}_acc`];
        default:
          return [];
      }
    },
    ...overrides
  });
}

function clothes_hand(side: Side, type: ClothesType, overrides: any = {}) {
  return clothes_basic('hands', {
    masksrcfn(options: any) {
      return options.maplebirch.nnpc.close_up_mask;
    },
    srcfn(options: any) {
      const hands = options.maplebirch.nnpc.clothes.hands;
      const arm = options.maplebirch.nnpc[`arm_${side}`];
      let suffix;
      if (side === 'left') {
        suffix = arm === 'cover' ? 'left_cover' : 'left';
      } else {
        suffix = arm === 'cover' ? 'right_cover' : options.maplebirch.nnpc.handheld_position || 'right';
      }
      let pattern = '',
        extension = '';
      if (type === 'detail') {
        pattern = hands.pattern ? `_${hands.pattern}` : '';
        return `img/clothes/hands/${hands.variable}/${suffix}${pattern}.png`;
      } else {
        if (type === 'main') {
          pattern = hands.pattern && !['tertiary', 'secondary'].includes(hands.pattern_layer) ? `_${hands.pattern}` : '';
        } else if (type === 'acc') {
          pattern = hands.pattern && hands.pattern_layer === 'secondary' ? `_${hands.pattern}` : '';
          extension = '_acc';
        }
        const path = `img/clothes/hands/${hands.variable}/${suffix}${pattern}${extension}.png`;
        return gray_suffix(path, options.filters[type === 'main' ? 'nnpc_hands' : 'nnpc_hands_acc']);
      }
    },
    showfn(options: any) {
      const hands = options.maplebirch.nnpc.clothes.hands;
      const arm = options.maplebirch.nnpc[`arm_${side}`];
      const image = `${side}Image`;
      if (arm === 'none' || !options.maplebirch.nnpc.show || !options.maplebirch.nnpc.model) return false;
      if (type === 'detail') {
        return hands[image] === 1 && hands.pattern_layer === 'tertiary' && !!hands.pattern;
      } else if (type === 'acc') {
        return hands[image] === 1 && hands.accessory === 1;
      } else if (type === 'main') {
        return hands[image] === 1;
      }
    },
    zfn(options: any) {
      const arm = options.maplebirch.nnpc[`arm_${side}`];
      const cover = arm === 'cover' || (side === 'right' && arm === 'hold');
      return cover ? maplebirch.char.ZIndices.hands + options.maplebirch.nnpc.position : options.maplebirch.nnpc.zarms + 0.2;
    },
    dxfn(options: any) {
      return options.maplebirch.nnpc.dxfn;
    },
    dyfn(options: any) {
      return options.maplebirch.nnpc.dyfn;
    },
    filters: type === 'main' ? ['nnpc_hands'] : type === 'acc' ? ['nnpc_hands_acc'] : [],
    animation: 'idle',
    ...overrides
  });
}

function clothes_handheld(type: ClothesType, overrides: any = {}) {
  return clothes_layer('handheld', type, {
    srcfn(options: any) {
      const handheld = options.maplebirch.nnpc.clothes.handheld;
      const directory = handheld.type.includes('prop') ? 'props' : 'handheld';
      const category =
        directory === 'props'
          ? (handheld.type.find((t: string) => ['food', 'ingredient', 'recipe', 'tending', 'antique', 'sex toy', 'child toy', 'book', 'furniture'].includes(t)) || 'general') + '/'
          : '';
      const cover = options.maplebirch.nnpc.arm_right === 'cover' && options.maplebirch.nnpc.handheld_position !== 'right_cover' ? 'right_cover' : 'right';
      let pattern = '',
        extension = '';
      if (type === 'detail') {
        pattern = handheld.pattern ? `_${handheld.pattern?.replace(/ /g, '_')}` : '';
        return `img/clothes/${directory}/${category}${handheld.variable}/${cover}${pattern}.png`;
      } else {
        if (type === 'main') {
          pattern = handheld.pattern && !['tertiary', 'secondary'].includes(handheld.pattern_layer) ? `_${handheld.pattern?.replace(/ /g, '_')}` : '';
        } else if (type === 'acc') {
          pattern = handheld.pattern && handheld.pattern_layer === 'secondary' ? `_${handheld.pattern?.replace(/ /g, '_')}` : '';
          extension = '_acc';
        }
        const path = `img/clothes/${directory}/${category}${handheld.variable}/${cover}${pattern}${extension}.png`;
        return gray_suffix(path, options.filters[`nnpc_handheld${type === 'acc' ? '_acc' : ''}`]);
      }
    },
    showfn(options: any) {
      const nnpc = options.maplebirch.nnpc;
      const handheld = nnpc.clothes.handheld;
      if (!nnpc.show || !nnpc.model || nnpc.hide_all || handheld.index <= 0) return false;
      const arm = nnpc.arm_right !== 'none';
      const cover = nnpc.arm_right === 'cover' && !['right_cover', 'cover_both'].includes(handheld.holdPosition) ? handheld.coverImage !== 0 : true;
      if (type === 'detail') {
        return arm && cover && handheld.pattern_layer === 'tertiary' && !!handheld.pattern;
      } else if (type === 'acc') {
        return arm && cover && handheld.accessory === 1;
      } else if (type === 'main') {
        return arm && cover;
      }
    },
    zfn(options: any) {
      const nnpc = options.maplebirch.nnpc;
      const handheld = nnpc.clothes.handheld;
      return nnpc.handheld_overhead || handheld.type.includes('prop') ? maplebirch.char.ZIndices.old_over_upper + nnpc.position : maplebirch.char.ZIndices.handheld + nnpc.position;
    },
    ...overrides
  });
}

export { lookupColour, gray_suffix, nnpc_sidepart, clothes_basic, clothes_layer, clothes_breasts, clothes_arm, clothes_arm_acc, clothes_back, clothes_back_acc, clothes_hand, clothes_handheld };
