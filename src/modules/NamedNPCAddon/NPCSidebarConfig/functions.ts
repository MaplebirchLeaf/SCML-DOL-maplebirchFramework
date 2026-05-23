// ./src/modules/NamedNPCAddon/NPCSidebarConfig/functions.ts

import maplebirch from '../../../core';
import { clone, loadImage } from '../../../utils';

type NPCSidebarOptions = {
  filters?: Record<string, any>;
  maplebirch: {
    nnpc: Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
};

type Part = 'face' | 'neck' | 'upper' | 'lower' | 'legs' | 'feet' | 'hands';
type ClothesType = 'main' | 'acc' | 'detail';
type Side = 'left' | 'right';

const normaliseFileName: ((slot: string) => string) | undefined = typeof (globalThis as any).normaliseFileName === 'function' ? (globalThis as any).normaliseFileName : undefined;

function legacyImagePath(path: string) {
  const index = path.lastIndexOf('/');
  if (index === -1) return path.replace(/-/g, '_');
  return `${path.slice(0, index + 1)}${path.slice(index + 1).replace(/-/g, '_')}`;
}

function versionParts(version: unknown) {
  const match = String(version ?? '').match(/\d+(?:\.\d+)*/);
  return match ? match[0].split('.').map(part => Number(part) || 0) : [];
}

function compareVersion(version: unknown, target: string) {
  const left = versionParts(version);
  const right = versionParts(target);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function legacyImagePathsEnabled() {
  const version = (setup as any).version ?? (setup as any).gameVersion ?? (V as any).version ?? (V as any).gameVersion ?? (State as any)?.variables?.version;
  return versionParts(version).length > 0 && compareVersion(version, '0.5.9.0') < 0;
}

function imagePath(path: string, ...fallbacks: string[]) {
  const candidates = legacyImagePathsEnabled() ? [...fallbacks.map(legacyImagePath), legacyImagePath(path), ...fallbacks, path] : [path, ...fallbacks, legacyImagePath(path), ...fallbacks.map(legacyImagePath)];
  for (const candidate of new Set(candidates)) {
    const image = loadImage(candidate);
    if (!(image instanceof Promise) && image) return candidate;
  }
  return candidates[0] ?? path;
}

function lookupColour(dict: { [x: string]: any }, key: string, prefilterName?: string) {
  const record = dict[key];
  if (!record) return {};
  const filter = clone(record.canvasfilter);
  if (prefilterName) Renderer.mergeLayerData(filter, setup.colours.sprite_prefilters[prefilterName], true);
  return filter;
}

function gray_suffix(path: string, filter: { blendMode: string; blend: any } | null | undefined) {
  if (!filter || filter.blendMode !== 'hard-light' || !filter.blend) return imagePath(path);
  return imagePath(path.replace('.png', '-gray.png'), path.replace('.png', '_gray.png'), path);
}

function layerFilters(slot: string, type: ClothesType, clothes: any) {
  if (type === 'detail') return [];
  const altFilterSwap = clothes.altposition === 'alt' && clothes.altdisabled?.includes('filter');
  if (type === 'main') return altFilterSwap ? [`nnpc_${slot}_acc`] : [`nnpc_${slot}`];
  if (type === 'acc') return altFilterSwap ? [`nnpc_${slot}`] : [`nnpc_${slot}_acc`];
  return [];
}

function nnpc_sidepart(part: Part) {
  return {
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const selected = V.options.maplebirch.npcsidebar.display?.[nnpc.name];
      const npcLayers = maplebirch.npc.Clothes.art.get(nnpc.name);
      if (!selected || !npcLayers) return;
      if (selected === npcLayers.key && npcLayers[part]) return npcLayers[part].img;
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      if (!nnpc.show || nnpc.model) return false;
      const npcLayers = maplebirch.npc.Clothes.art.get(nnpc.name);
      return npcLayers?.[part] != null;
    },

    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const npcLayers = maplebirch.npc.Clothes.art.get(nnpc.name);
      if (npcLayers?.[part]?.zIndex != null) return npcLayers[part].zIndex;
      return maplebirch.char.ZIndices[part] + nnpc.position;
    }
  };
}

function clothes_basic(slot: string, overrides: any = {}) {
  return {
    masksrcfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.close_up_mask;
    },

    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices[slot] + options.maplebirch.nnpc.position;
    },

    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },

    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },

    animation: 'idle',

    ...overrides
  };
}

function clothes_layer(slot: string, type: ClothesType, overrides: any = {}) {
  return clothes_basic(slot, {
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const clothes = nnpc.clothes[slot];
      const folder = typeof normaliseFileName === 'function' ? normaliseFileName(slot) : slot;
      if (type === 'detail') {
        const alt = clothes.altposition === 'alt' ? '-alt' : '';
        const pattern = clothes.pattern ? clothes.pattern.replace(/ /g, '-') : '';
        return imagePath(`img/clothes/${folder}/${clothes.variable}/${pattern}${alt}.png`, `img/clothes/${slot}/${clothes.variable}/${pattern}${alt}.png`);
      }
      const down = (nnpc.hood_down || clothes.hoodposition === 'down') && clothes.hoodposition != null && clothes.outfitPrimary?.head != null;
      const alt = clothes.altposition === 'alt' && (type === 'main' ? !clothes.altdisabled?.includes('full') : type === 'acc' ? !clothes.altdisabled?.includes('acc') : false);
      let pattern = '';
      let prefix = '';
      let suffix = '';
      if (type === 'main') {
        pattern = clothes.pattern && !['secondary', 'tertiary'].includes(clothes.pattern_layer) ? `-${clothes.pattern.replace(/ /g, '-')}` : '';
        prefix = clothes.integrity;
        suffix = down ? '-down' : alt ? '-alt' : '';
      } else if (type === 'acc') {
        pattern = clothes.pattern && clothes.pattern_layer === 'secondary' ? `-${clothes.pattern.replace(/ /g, '-')}` : '';
        prefix = `acc${clothes.accessory_integrity_img ? `-${clothes.integrity}` : ''}`;
        suffix = down ? '-down' : alt ? '-alt' : '';
      }
      const filters = layerFilters(slot, type, clothes);
      const path = `img/clothes/${folder}/${clothes.variable}/${prefix}${pattern}${suffix}.png`;
      return gray_suffix(imagePath(path, path.replace(`/clothes/${folder}/`, `/clothes/${slot}/`)), options.filters?.[filters[0]]);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const clothes = nnpc.clothes[slot];
      if (!nnpc.show || !nnpc.model || nnpc.hide_all || clothes.index <= 0) return false;
      if (type === 'detail') return clothes.mainImage !== 0 && !!clothes.pattern && clothes.pattern_layer === 'tertiary';
      if (type === 'acc') return clothes.accImage !== 0 && clothes.accessory === 1;
      if (type === 'main') return clothes.mainImage !== 0;
      return false;
    },

    filtersfn(options: NPCSidebarOptions) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      return layerFilters(slot, type, clothes);
    },

    ...overrides
  });
}

function clothes_breasts(slot: string, type: ClothesType, overrides: any = {}) {
  return clothes_layer(slot, type, {
    masksrcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const clothes = nnpc.clothes[slot];
      const folder = typeof normaliseFileName === 'function' ? normaliseFileName(slot) : slot;
      if (type === 'main' && clothes.mask_img === 1) return [nnpc.close_up_mask, imagePath(`img/clothes/${folder}/${clothes.variable}/mask-${clothes.integrity}.png`, `img/clothes/${slot}/${clothes.variable}/mask-${clothes.integrity}.png`)];
      return nnpc.close_up_mask;
    },

    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const clothes = nnpc.clothes[slot];
      const folder = typeof normaliseFileName === 'function' ? normaliseFileName(slot) : slot;
      let breastSize: number;
      if (type === 'acc') {
        breastSize =
          typeof clothes.breast_acc_img === 'object'
            ? clothes.breast_acc_img[nnpc.breast_size]
            : typeof clothes.breast_img === 'object'
              ? clothes.breast_img[nnpc.breast_size]
              : Math.min(nnpc.breast_size, 6);
      } else {
        breastSize = typeof clothes.breast_img === 'object' ? clothes.breast_img[nnpc.breast_size] : Math.min(nnpc.breast_size, 6);
      }
      if (type === 'detail') {
        const pattern = clothes.pattern ? `-${clothes.pattern.replace(/ /g, '-')}` : '';
        return imagePath(`img/clothes/${folder}/${clothes.variable}/${breastSize}${pattern}.png`, `img/clothes/${slot}/${clothes.variable}/${breastSize}${pattern}.png`);
      }
      const alt = clothes.altposition === 'alt' && type === 'main' && !clothes.altdisabled?.includes('breasts');
      let pattern = '';
      let extension = '';
      if (type === 'main') {
        pattern = clothes.pattern && !['tertiary', 'secondary'].includes(clothes.pattern_layer) ? `-${clothes.pattern.replace(/ /g, '-')}` : '';
      } else if (type === 'acc') {
        pattern = clothes.pattern && clothes.pattern_layer === 'secondary' ? `-${clothes.pattern.replace(/ /g, '-')}` : '';
        extension = '-acc';
      }
      const filters = layerFilters(slot, type, clothes);
      const path = `img/clothes/${folder}/${clothes.variable}/${breastSize}${extension}${pattern}${alt ? '-alt' : ''}.png`;
      return gray_suffix(imagePath(path, path.replace(`/clothes/${folder}/`, `/clothes/${slot}/`)), options.filters?.[filters[0]]);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const clothes = nnpc.clothes[slot];
      if (!nnpc.show || !nnpc.model || nnpc.hide_all || clothes.index <= 0) return false;
      if (clothes.mainImage === 0) return false;
      if (type === 'detail') return typeof clothes.breast_acc_img === 'object' && clothes.breast_acc_img[nnpc.breast_size] != null && !!clothes.pattern && !!clothes.breast_pattern;
      if (type === 'acc') {
        return (
          (typeof clothes.breast_acc_img === 'object' && clothes.breast_acc_img[nnpc.breast_size] != null) ||
          (clothes.breast_acc_img === 1 && typeof clothes.breast_img === 'object' && clothes.breast_img[nnpc.breast_size] != null)
        );
      }
      if (type === 'main') return typeof clothes.breast_img === 'object' && clothes.breast_img[nnpc.breast_size] != null;
      return false;
    },

    ...overrides
  });
}

function sleeveFilter(slot: string, colour: string | undefined, clothes: any) {
  switch (colour) {
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
}

function armState(options: NPCSidebarOptions, side: Side) {
  const nnpc = options.maplebirch.nnpc;
  const arm = nnpc[`arm_${side}`];
  if (arm === 'cover') return 'cover';
  if (side === 'right' && nnpc.handheld_position === 'hold') return 'hold';
  if (side === 'right' && nnpc.handheld_position === 'right_cover') return 'cover';
  return arm === 'idle' ? 'idle' : arm;
}

function clothes_arm(slot: string, side: Side, overrides: any = {}) {
  return clothes_basic(slot, {
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const clothes = nnpc.clothes[slot];
      const folder = typeof normaliseFileName === 'function' ? normaliseFileName(slot) : slot;
      const altPosition = clothes.altposition === 'alt' && !clothes.altdisabled?.includes('sleeves');
      const altSleeve = nnpc.alt_sleeve_state && clothes.altsleeve === 'alt';
      const alt = altPosition ? '-alt' : '';
      const rolled = altSleeve ? '-rolled' : '';
      const pattern = clothes.sleeve_colour === 'pattern' && clothes.pattern ? `-${clothes.pattern.replace(/ /g, '-')}` : '';
      const filter = sleeveFilter(slot, clothes.sleeve_colour, clothes)[0];
      const path = `img/clothes/${folder}/${clothes.variable}/${side}-${armState(options, side)}${alt}${pattern}${rolled}.png`;
      return gray_suffix(imagePath(path, path.replace(`/clothes/${folder}/`, `/clothes/${slot}/`)), options.filters?.[filter]);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const clothes = nnpc.clothes[slot];
      return clothes.index > 0 && clothes.sleeve_img === 1 && nnpc[`arm_${side}`] !== 'none' && nnpc.show && nnpc.model && !nnpc.hide_all;
    },

    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const cover = nnpc[`arm_${side}`] === 'cover' || nnpc[`arm_${side}`] === 'hold';
      return (cover ? maplebirch.char.ZIndices[`${slot}_arms_cover`] : maplebirch.char.ZIndices[`${slot}_arms`]) + nnpc.position;
    },

    filtersfn(options: NPCSidebarOptions) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      return sleeveFilter(slot, clothes.sleeve_colour, clothes);
    },

    ...overrides
  });
}

function clothes_arm_acc(slot: string, side: Side, overrides: any = {}) {
  return clothes_basic(slot, {
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const clothes = nnpc.clothes[slot];
      const folder = typeof normaliseFileName === 'function' ? normaliseFileName(slot) : slot;
      const altPosition = clothes.altposition === 'alt' && !clothes.altdisabled?.includes('sleeves') && !clothes.altdisabled?.includes('sleeve_acc');
      const suffix = altPosition ? '-alt-acc' : '-acc';
      const filter = sleeveFilter(slot, clothes.accessory_colour_sidebar, clothes)[0];
      const path = `img/clothes/${folder}/${clothes.variable}/${side}-${armState(options, side)}${suffix}.png`;
      return gray_suffix(imagePath(path, path.replace(`/clothes/${folder}/`, `/clothes/${slot}/`)), options.filters?.[filter]);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const clothes = nnpc.clothes[slot];
      return clothes.index > 0 && clothes.sleeve_img === 1 && clothes.sleeve_acc_img === 1 && nnpc[`arm_${side}`] !== 'none' && nnpc.show && nnpc.model && !nnpc.hide_all;
    },

    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices[`${slot}_arms`] + options.maplebirch.nnpc.position;
    },

    filtersfn(options: NPCSidebarOptions) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      return sleeveFilter(slot, clothes.accessory_colour_sidebar, clothes);
    },

    ...overrides
  });
}

function backFilter(slot: string, colour: string | undefined) {
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
}

function clothes_back(slot: string, overrides: any = {}) {
  return clothes_basic(slot, {
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const clothes = nnpc.clothes[slot];
      const folder = typeof normaliseFileName === 'function' ? normaliseFileName(slot) : slot;
      const altPosition = clothes.altposition === 'alt' && !clothes.altdisabled?.includes('back');
      const prefix = altPosition ? 'back-alt' : 'back';
      const suffix = clothes.back_integrity_img ? `-${clothes.integrity}` : '';
      const pattern = clothes.pattern && !['tertiary', 'secondary'].includes(clothes.pattern_layer) ? `-${clothes.pattern.replace(/ /g, '-')}` : '';
      const filter = backFilter(slot, clothes.back_img_colour)[0];
      const path = `img/clothes/${folder}/${clothes.variable}/${prefix}${suffix}${pattern}.png`;
      return gray_suffix(imagePath(path, path.replace(`/clothes/${folder}/`, `/clothes/${slot}/`)), options.filters?.[filter]);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const clothes = nnpc.clothes[slot];
      if (!nnpc.show || !nnpc.model || nnpc.hide_all || clothes.index <= 0) return false;
      if (slot === 'handheld' && ['none', 'cover'].includes(nnpc.arm_right) && nnpc.clothes.handheld.coverBackImage === 0) return false;
      const down = (nnpc.hood_down || nnpc.clothes.upper.hoodposition === 'down') && clothes.hood && clothes.outfitSecondary != null;
      return clothes.back_img === 1 && !down;
    },

    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.over_head_back + options.maplebirch.nnpc.position;
    },

    filtersfn(options: NPCSidebarOptions) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      return backFilter(slot, clothes.back_img_colour);
    },

    ...overrides
  });
}

function clothes_back_acc(slot: string, overrides: any = {}) {
  return clothes_basic(slot, {
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const clothes = nnpc.clothes[slot];
      const folder = typeof normaliseFileName === 'function' ? normaliseFileName(slot) : slot;
      const altPosition = clothes.altposition === 'alt' && !clothes.altdisabled?.includes('back');
      const prefix = altPosition ? 'back-alt' : 'back';
      const suffix = clothes.back_integrity_img ? `-${clothes.integrity}` : '';
      const pattern = clothes.pattern && clothes.pattern_layer === 'secondary' ? `-${clothes.pattern.replace(/ /g, '-')}` : '';
      const filter = backFilter(slot, clothes.back_img_acc_colour)[0];
      const path = `img/clothes/${folder}/${clothes.variable}/${prefix}${suffix}${pattern}-acc.png`;
      return gray_suffix(imagePath(path, path.replace(`/clothes/${folder}/`, `/clothes/${slot}/`)), options.filters?.[filter]);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const clothes = nnpc.clothes[slot];
      if (!nnpc.show || !nnpc.model || nnpc.hide_all || clothes.index <= 0) return false;
      if (slot === 'handheld' && nnpc.arm_right !== 'hold') return false;
      const down = (nnpc.hood_down || nnpc.clothes.upper.hoodposition === 'down') && clothes.hood && clothes.outfitSecondary != null;
      return clothes.back_img_acc === 1 && !down;
    },

    zfn(options: NPCSidebarOptions) {
      return maplebirch.char.ZIndices.head_back + options.maplebirch.nnpc.position;
    },

    filtersfn(options: NPCSidebarOptions) {
      const clothes = options.maplebirch.nnpc.clothes[slot];
      return backFilter(slot, clothes.back_img_acc_colour);
    },

    ...overrides
  });
}

function handSuffix(options: NPCSidebarOptions, side: Side) {
  const nnpc = options.maplebirch.nnpc;
  const arm = nnpc[`arm_${side}`];
  if (side === 'left') return arm === 'cover' ? 'left-cover' : 'left';
  if (arm === 'cover') return 'right-cover';
  if (nnpc.handheld_position === 'hold') return 'right-hold';
  if (nnpc.handheld_position === 'right_cover') return 'right-cover';
  return 'right';
}

function clothes_hand(side: Side, type: ClothesType, overrides: any = {}) {
  return clothes_basic('hands', {
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const hands = nnpc.clothes.hands;
      const suffix = handSuffix(options, side);
      const folder = normaliseFileName?.('hands') ?? 'hands';
      if (type === 'detail') {
        const pattern = hands.pattern ? `-${hands.pattern.replace(/ /g, '-')}` : '';
        return imagePath(`img/clothes/${folder}/${hands.variable}/${suffix}${pattern}.png`, `img/clothes/hands/${hands.variable}/${suffix}${pattern}.png`);
      }
      let pattern = '';
      let extension = '';
      if (type === 'main') pattern = hands.pattern && !['tertiary', 'secondary'].includes(hands.pattern_layer) ? `-${hands.pattern.replace(/ /g, '-')}` : '';
      else if (type === 'acc') {
        pattern = hands.pattern && hands.pattern_layer === 'secondary' ? `-${hands.pattern.replace(/ /g, '-')}` : '';
        extension = '-acc';
      }
      const path = `img/clothes/${folder}/${hands.variable}/${suffix}${pattern}${extension}.png`;
      const filter = type === 'main' ? 'nnpc_hands' : 'nnpc_hands_acc';
      return gray_suffix(imagePath(path, path.replace(`/clothes/${folder}/`, '/clothes/hands/')), options.filters?.[filter]);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const hands = nnpc.clothes.hands;
      const arm = nnpc[`arm_${side}`];
      const image = `${side}Image`;
      if (arm === 'none' || !nnpc.show || !nnpc.model || nnpc.hide_all || hands.index <= 0) return false;
      if (type === 'detail') return hands[image] === 1 && hands.pattern_layer === 'tertiary' && !!hands.pattern;
      if (type === 'acc') return hands[image] === 1 && hands.accessory === 1;
      if (type === 'main') return hands[image] === 1;
      return false;
    },

    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const arm = nnpc[`arm_${side}`];
      const cover = arm === 'cover' || (side === 'right' && arm === 'hold');
      return cover ? maplebirch.char.ZIndices.hands + nnpc.position : nnpc.zarms + 0.2;
    },

    dxfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dxfn;
    },

    dyfn(options: NPCSidebarOptions) {
      return options.maplebirch.nnpc.dyfn;
    },

    filters: type === 'main' ? ['nnpc_hands'] : type === 'acc' ? ['nnpc_hands_acc'] : [],

    animation: 'idle',

    ...overrides
  });
}

function clothes_handheld(type: ClothesType, overrides: any = {}) {
  return clothes_layer('handheld', type, {
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const handheld = nnpc.clothes.handheld;
      const directory = handheld.type.includes('prop') ? 'props' : 'handheld';
      const category =
        directory === 'props'
          ? (handheld.type.find((item: string) => ['food', 'ingredient', 'recipe', 'tending', 'antique', 'sex toy', 'child toy', 'book', 'furniture'].includes(item)) || 'general') + '/'
          : '';
      const cover = nnpc.arm_right === 'cover' && nnpc.handheld_position !== 'right_cover' ? 'right-cover' : 'right';
      if (type === 'detail') {
        const pattern = handheld.pattern ? `-${handheld.pattern.replace(/ /g, '-')}` : '';
        return imagePath(`img/clothes/${directory}/${category}${handheld.variable}/${cover}${pattern}.png`);
      }
      let pattern = '';
      let extension = '';
      if (type === 'main') pattern = handheld.pattern && !['tertiary', 'secondary'].includes(handheld.pattern_layer) ? `-${handheld.pattern.replace(/ /g, '-')}` : '';
      else if (type === 'acc') {
        pattern = handheld.pattern && handheld.pattern_layer === 'secondary' ? `-${handheld.pattern.replace(/ /g, '-')}` : '';
        extension = '-acc';
      }
      const path = `img/clothes/${directory}/${category}${handheld.variable}/${cover}${pattern}${extension}.png`;
      const filter = `nnpc_handheld${type === 'acc' ? '_acc' : ''}`;
      return gray_suffix(imagePath(path), options.filters?.[filter]);
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const handheld = nnpc.clothes.handheld;
      if (!nnpc.show || !nnpc.model || nnpc.hide_all || handheld.index <= 0) return false;
      const arm = nnpc.arm_right !== 'none';
      const cover = nnpc.arm_right === 'cover' && !['right_cover', 'cover_both'].includes(handheld.holdPosition) ? handheld.coverImage !== 0 : true;
      if (type === 'detail') return arm && cover && handheld.pattern_layer === 'tertiary' && !!handheld.pattern;
      if (type === 'acc') return arm && cover && handheld.accessory === 1;
      if (type === 'main') return arm && cover;
      return false;
    },

    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch.nnpc;
      const handheld = nnpc.clothes.handheld;
      return nnpc.handheld_overhead || handheld.type.includes('prop') ? maplebirch.char.ZIndices.old_over_upper + nnpc.position : maplebirch.char.ZIndices.handheld + nnpc.position;
    },

    ...overrides
  });
}

export { lookupColour, gray_suffix, imagePath, nnpc_sidepart, clothes_basic, clothes_layer, clothes_breasts, clothes_arm, clothes_arm_acc, clothes_back, clothes_back_acc, clothes_hand, clothes_handheld };
