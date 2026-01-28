// @ts-check
/// <reference path='../../maplebirch.d.ts' />
(() => {
  'use strict';

  /** @param {{ [x: string]: any; }} dict @param {string} key @param {string} prefilterName */
  function lookupColour(dict, key, prefilterName) {
    let filter;
    let record = dict[key];
    if (!record) return {};
    filter = clone(record.canvasfilter);
    if (prefilterName) Renderer.mergeLayerData(filter, setup.colours.sprite_prefilters[prefilterName],true);
    return filter;
  }

  /** @param {string} path @param {{ blendMode: string; blend: any; }} filter */
  function gray_suffix(path, filter) {
    if (!filter || filter.blendMode !== 'hard-light' || !filter.blend) return path;
    return path.replace('.png', '_gray.png');
  }

  /** @param {'face'|'neck'|'upper'|'lower'|'legs'|'feet'|'hands'} part */
  function nnpc_sidepart(part) {
    return {
      /** @param {{ maplebirch: { nnpc: any; }; }} options */
      srcfn(options) {
        const nnpc = options.maplebirch.nnpc;
        const npcsidebar = (V.options.maplebirch ??= {}).npcsidebar;
        if (!npcsidebar.display?.[nnpc.name]) return;
        const npcLayers = maplebirch.npc.Clothes.layers.get(nnpc.name);
        if (!npcLayers) return;
        if (npcsidebar.display[nnpc.name] === npcLayers.key && npcLayers[part]) return npcLayers[part].img;
      },
      /** @param {{ maplebirch: { nnpc: any; }; }} options */
      showfn(options) {
        const nnpc = options.maplebirch.nnpc;
        if (!nnpc.show || nnpc.model) return false;
        const npcLayers = maplebirch.npc.Clothes.layers.get(nnpc.name);
        return npcLayers?.[part] != null;
      },
      /** @param {{ maplebirch: { nnpc: any; }; }} options */
      zfn(options) {
        const nnpc = options.maplebirch.nnpc;
        const npcLayers = maplebirch.npc.Clothes.layers.get(nnpc.name);
        if (npcLayers?.[part]?.zIndex != null) return npcLayers[part].zIndex;
        return maplebirch.char.ZIndices[part] + nnpc.position;
      }
    };
  }

  /** @param {string} slot @param {object} overrides */
  function clothes_basic(slot, overrides = {}) {
    return {
      /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
      masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
      /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
      zfn(options) { return maplebirch.char.ZIndices[slot] + options.maplebirch.nnpc.position; },
      /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
      dxfn(options) { return options.maplebirch.nnpc.dxfn; },
      /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
      dyfn(options) { return options.maplebirch.nnpc.dyfn; },
      animation: 'idle',
      ...overrides
    };
  }

  /** @param {string} slot @param {'main'|'acc'|'detail'} type @param {object} overrides */
  function clothes_layer(slot, type, overrides = {}) {
    return clothes_basic(slot, {
      /** @param {{ maplebirch: { nnpc: { clothes: { [x: string]: any; }; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
      srcfn(options) {
        const clothes = options.maplebirch.nnpc.clothes[slot];
        if (type === 'detail') {
          const alt_position = clothes.altposition === 'alt';
          const pattern = clothes.pattern ? clothes.pattern?.replace(/ /g, '_') : '';
          const suffix = alt_position ? '_alt' : '';
          return `img/clothes/${slot}/${clothes.variable}/${pattern}${suffix}.png`;
        } else {
          const down = clothes.hoodposition === 'down' && clothes.hoodposition != null && clothes.outfitPrimary?.head != null;
          const alt_position = clothes.altposition === 'alt' && (type === 'main' ? !clothes.altdisabled.includes('full') : type === 'acc' ? !clothes.altdisabled.includes('acc') : false);
          let pattern = '', prefix = '', suffix = '';
          if (type === 'main') {
            pattern = clothes.pattern && !['secondary', 'tertiary'].includes(clothes.pattern_layer) ? '_' + clothes.pattern?.replace(/ /g, '_') : '';
            prefix = clothes.integrity;
            suffix = alt_position ? '_alt' : (down ? '_down' : '');
          } else if (type === 'acc') {
            pattern = clothes.pattern && clothes.pattern_layer === 'secondary' ? '_' + clothes.pattern?.replace(/ /g, '_') : '';
            const integrity = clothes.accessory_integrity_img ? `_${clothes.integrity}` : '';
            prefix = 'acc' + integrity;
            suffix = alt_position ? '_alt' : (down ? '_down' : '');
          }
          const path = `img/clothes/${slot}/${clothes.variable}/${prefix}${pattern}${suffix}.png`;
          // @ts-ignore
          return gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
        }
      },
      /** @param {{ maplebirch: { nnpc: { clothes: { [x: string]: any; }; show: any; model: any; }; }; }} options */
      showfn(options) {
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
      /** @param {{ maplebirch: { nnpc: { clothes: { [x: string]: any; }; }; }; }} options */
      filtersfn(options) {
        const clothes = options.maplebirch.nnpc.clothes[slot];
        if (type === 'detail') return [];
        const alt_filter_swap = clothes.altposition === 'alt' && clothes.altdisabled.includes('filter');
        if (type === 'main') { return alt_filter_swap ? [`nnpc_${slot}_acc`] : [`nnpc_${slot}`]; }
        else if (type === 'acc') { return alt_filter_swap ? [`nnpc_${slot}`] : [`nnpc_${slot}_acc`]; }
      },
      ...overrides
    });
  }

  /** @param {string} slot @param {'main'|'acc'|'detail'} type @param {object} overrides */
  function clothes_breasts(slot, type, overrides = {}) {
    return clothes_layer(slot, type, {
      /** @param {{ maplebirch: { nnpc: { clothes: { [x: string]: any; }; close_up_mask: any; }; }; }} options */
      masksrcfn(options) {
        if (type === 'main') {
          const clothes = options.maplebirch.nnpc.clothes[slot];
          if (clothes.mask_img === 1) return [options.maplebirch.nnpc.close_up_mask,`img/clothes/${slot}/${clothes.variable}/mask_${clothes.integrity}.png`];
        }
        return options.maplebirch.nnpc.close_up_mask;
      },
      /** @param {{ maplebirch: { nnpc: { clothes: { [x: string]: any; }; breast_size: number; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
      srcfn(options) {
        const clothes = options.maplebirch.nnpc.clothes[slot];
        let breast_size;
        if (type === 'acc') {
          breast_size = typeof clothes.breast_acc_img === 'object' ? clothes.breast_acc_img[options.maplebirch.nnpc.breast_size] : typeof clothes.breast_img === 'object' ? clothes.breast_img[options.maplebirch.nnpc.breast_size] : Math.min(options.maplebirch.nnpc.breast_size, 6);
        } else {
          breast_size = typeof clothes.breast_img === 'object' ? clothes.breast_img[options.maplebirch.nnpc.breast_size] : Math.min(options.maplebirch.nnpc.breast_size, 6);
        }
        if (type === 'detail') {
          const pattern = clothes.pattern ? `_${clothes.pattern?.replace(/ /g, '_')}` : '';
          return `img/clothes/${slot}/${clothes.variable}/${breast_size}${pattern}.png`;
        } else {
          const alt_position = clothes.altposition === 'alt' && (type === 'main' ? !clothes.altdisabled?.includes('breasts') : false);
          const suffix = alt_position ? '_alt' : '';
          let pattern = '', extension = '';
          if (type === 'main') {
            pattern = clothes.pattern && !['tertiary', 'secondary'].includes(clothes.pattern_layer) ? `_${clothes.pattern?.replace(/ /g, '_')}` : '';
          } else if (type === 'acc') {
            pattern = clothes.pattern && clothes.pattern_layer === 'secondary' ? `_${clothes.pattern?.replace(/ /g, '_')}` : '';
            extension = '_acc';
          }
          const path = `img/clothes/${slot}/${clothes.variable}/${breast_size}${extension}${pattern}${suffix}.png`;
          // @ts-ignore
          return gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
        }
      },
      /** @param {{ maplebirch: { nnpc: { clothes: { [x: string]: any; }; breast_size: string | number; show: any; model: any; }; }; }} options */
      showfn(options) {
        const clothes = options.maplebirch.nnpc.clothes[slot];
        if (!options.maplebirch.nnpc.show || !options.maplebirch.nnpc.model) return false;
        if (clothes.mainImage === 0) return false;
        if (type === 'detail') {
          return (typeof clothes.breast_acc_img === 'object' && clothes.breast_acc_img[options.maplebirch.nnpc.breast_size] != null) && !!clothes.pattern && !!clothes.breast_pattern;
        } else if (type === 'acc') {
          return (clothes.breast_img === 1 && typeof clothes.breast_img === 'object' && clothes.breast_img[options.maplebirch.nnpc.breast_size] != null) || (typeof clothes.breast_acc_img === 'object' && clothes.breast_acc_img[options.maplebirch.nnpc.breast_size] != null);
        } else if (type === 'main') {
          return typeof clothes.breast_img === 'object' && clothes.breast_img[options.maplebirch.nnpc.breast_size] != null;
        }
      },
      ...overrides
    });
  }

  /** @param {string} slot @param {'left'|'right'} side @param {object} overrides */
  function clothes_arm(slot, side, overrides = {}) {
    return clothes_basic(slot, {
      /** @param {{ maplebirch: { nnpc: { [x: string]: string; clothes: { [x: string]: any; }; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
      srcfn(options) {
        const clothes = options.maplebirch.nnpc.clothes[slot];
        const alt_position = clothes.altposition === 'alt' && !clothes.altdisabled.includes('sleeves');
        const alt_sleeve = options.maplebirch.nnpc.alt_sleeve_state && clothes.altsleeve === 'alt';
        const held = (side === 'right' && options.maplebirch.nnpc.handheld_position) ? options.maplebirch.nnpc.handheld_position : side;
        const cover = options.maplebirch.nnpc[`arm_${side}`] === 'cover' ? `${side}_cover` : held;
        const alt = alt_position ? '_alt' : '';
        const rolled = alt_sleeve ? '_rolled' : '';
        const pattern = clothes.sleeve_colour === 'pattern' && clothes.pattern ? `_${clothes.pattern?.replace(/ /g, '_')}` : '';
        const path = `img/clothes/${slot}/${clothes.variable}/${cover}${alt}${pattern}${rolled}.png`;
        // @ts-ignore
        return gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
      },
      /** @param {{ maplebirch: { nnpc: { [x: string]: string; clothes: { [x: string]: { sleeve_img: number; }; }; show: any; model: any; }; }; }} options */
      showfn(options) {
        return options.maplebirch.nnpc.clothes[slot].sleeve_img === 1 && options.maplebirch.nnpc[`arm_${side}`] !== 'none' && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
      },
      /** @param {{ maplebirch: { nnpc: { [x: string]: string; position: number; }; }; }} options */
      zfn(options) {
        const cover = options.maplebirch.nnpc[`arm_${side}`] === 'cover' || options.maplebirch.nnpc[`arm_${side}`] === 'hold';
        return (cover ? maplebirch.char.ZIndices[`${slot}_arms_cover`] : maplebirch.char.ZIndices[`${slot}_arms`]) + options.maplebirch.nnpc.position;
      },
      /** @param {{ maplebirch: { nnpc: { clothes: { [x: string]: any; }; }; }; }} options */
      filtersfn(options) {
        const clothes = options.maplebirch.nnpc.clothes[slot];
        switch (clothes.sleeve_colour) {
          case undefined:
          case '':
          case 'primary': return [`nnpc_${slot}`];
          case 'secondary': return [`nnpc_${slot}_acc`];
          case 'pattern':
            switch (clothes.pattern_layer) {
              case 'tertiary': return [];
              case 'secondary': return [`nnpc_${slot}_acc`];
              default: return [`nnpc_${slot}`];
            }
          default: return [];
        }
      },
      ...overrides
    });
  }

  /** @param {string} slot @param {'left'|'right'} side @param {object} overrides */
  function clothes_arm_acc(slot, side, overrides = {}) {
    return clothes_basic(slot, {
      /** @param {{ maplebirch: { nnpc: { [x: string]: string; clothes: { [x: string]: any; }; handheld_position: any; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
      srcfn(options) {
        const clothes = options.maplebirch.nnpc.clothes[slot];
        const alt_position = clothes.altposition === 'alt' && !clothes.altdisabled?.includes('sleeves') && !clothes.altdisabled?.includes('sleeve_acc');
        const cover = options.maplebirch.nnpc[`arm_${side}`] === 'cover';
        const baseName = cover ? `${side}_cover_acc` : `${(side === 'right' && options.maplebirch.nnpc.handheld_position) ? options.maplebirch.nnpc.handheld_position : side}${alt_position ? '_alt_acc' : '_acc'}`;
        const path = `img/clothes/${slot}/${clothes.variable}/${baseName}.png`;
        // @ts-ignore
        return gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
      },
      /** @param {{ maplebirch: { nnpc: { [x: string]: string; clothes: { [x: string]: any; }; show: any; model: any; }; }; }} options */
      showfn(options) {
        const clothes = options.maplebirch.nnpc.clothes[slot];
        return clothes.sleeve_img === 1 && clothes.sleeve_acc_img === 1 && options.maplebirch.nnpc[`arm_${side}`] !== 'none' && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
      },
      /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
      zfn(options) {  return maplebirch.char.ZIndices[`${slot}_arms`] + options.maplebirch.nnpc.position; },
      /** @param {{ maplebirch: { nnpc: { clothes: { [x: string]: any; }; }; }; }} options */
      filtersfn(options) {
        const clothes = options.maplebirch.nnpc.clothes[slot];
        switch (clothes.accessory_colour_sidebar) {
          case undefined:
          case '':
          case 'primary': return [`nnpc_${slot}_acc`];
          case 'secondary': return [`nnpc_${slot}`];
          case 'pattern':
            switch (clothes.pattern_layer) {
              case 'tertiary': return [];
              case 'secondary': return [`nnpc_${slot}_acc`];
              default: return [`nnpc_${slot}`];
            }
          default: return [];
        }
      },
      ...overrides
    });
  }

  /** @param {string} slot @param {object} overrides */
  function clothes_back(slot, overrides = {}) {
    return clothes_basic(slot, {
      /** @param {{ maplebirch: { nnpc: { clothes: { [x: string]: any; }; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
      srcfn(options) {
        const clothes = options.maplebirch.nnpc.clothes[slot];
        const alt_position = clothes.altposition === 'alt' && !clothes.altdisabled?.includes('back');
        const prefix = alt_position ? 'back_alt' : 'back';
        const suffix = clothes.back_integrity_img ? `_${clothes.integrity}` : '';
        const pattern = clothes.pattern && !['tertiary', 'secondary'].includes(clothes.pattern_layer) ? '_' + clothes.pattern?.replace(/ /g, '_') : '';
        const path = `img/clothes/${slot}/${clothes.variable}/${prefix}${suffix}${pattern}.png`;
        // @ts-ignore
        return gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
      },
      /** @param {{ maplebirch: { nnpc: { clothes: { [x: string]: any; handheld: { coverBackImage: number; }; upper: { hoodposition: string; }; }; arm_right: string; show: any; model: any; }; }; }} options */
      showfn(options) {
        const clothes = options.maplebirch.nnpc.clothes[slot];
        if (slot === 'handheld' && ['none', 'cover'].includes(options.maplebirch.nnpc.arm_right) && options.maplebirch.nnpc.clothes.handheld.coverBackImage === 0) return false;
        if (!options.maplebirch.nnpc.show || !options.maplebirch.nnpc.model) return false;
        const down = options.maplebirch.nnpc.clothes.upper.hoodposition === 'down' && clothes.hood && clothes.outfitSecondary != null;
        return clothes.back_img === 1 && !down;
      },
      /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
      zfn(options) { return maplebirch.char.ZIndices.over_head_back + options.maplebirch.nnpc.position; },
      /** @param {{ maplebirch: { nnpc: { clothes: { [x: string]: { back_img_colour: any; }; }; }; }; }} options */
      filtersfn(options) {
        const colour = options.maplebirch.nnpc.clothes[slot].back_img_colour;
        switch (colour) {
          case 'none': return [];
          case '':
          case undefined:
          case 'primary': return [`nnpc_${slot}`];
          case 'secondary': return [`nnpc_${slot}_acc`];
          default: return [];
        }
      },
      ...overrides
    });
  }

  /** @param {string} slot @param {object} overrides */
  function clothes_back_acc(slot, overrides = {}) {
    return clothes_basic(slot, {
      /** @param {{ maplebirch: { nnpc: { clothes: { [x: string]: any; }; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
      srcfn(options) {
        const clothes = options.maplebirch.nnpc.clothes[slot];
        const alt_position = clothes.altposition === 'alt' && !clothes.altdisabled?.includes('back');
        const prefix = alt_position ? 'back_alt' : 'back';
        const suffix = clothes.back_integrity_img ? `_${clothes.integrity}` : '';
        const pattern = clothes.pattern && clothes.pattern_layer === 'secondary' ? '_' + clothes.pattern?.replace(/ /g, '_') : '';
        const path = `img/clothes/${slot}/${clothes.variable}/${prefix}${suffix}${pattern}_acc.png`;
        // @ts-ignore
        return gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
      },
      /** @param {{ maplebirch: { nnpc: { clothes: { [x: string]: any; upper: { hoodposition: string; }; }; show: any; model: any; arm_right: string; }; }; }} options */
      showfn(options) {
        const clothes = options.maplebirch.nnpc.clothes[slot];
        if (!options.maplebirch.nnpc.show || !options.maplebirch.nnpc.model) return false;
        if (slot === 'handheld' && options.maplebirch.nnpc.arm_right !== 'hold') return false;
        const down = options.maplebirch.nnpc.clothes.upper.hoodposition === 'down' && clothes.hood && clothes.outfitSecondary != null;
        return clothes.back_img_acc === 1 && !down;
      },
      /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
      zfn(options) { return maplebirch.char.ZIndices.head_back + options.maplebirch.nnpc.position; },
      /** @param {{ maplebirch: { nnpc: { clothes: { [x: string]: { back_img_acc_colour: any; }; }; }; }; }} options */
      filtersfn(options) {
        const colour = options.maplebirch.nnpc.clothes[slot].back_img_acc_colour;
        switch (colour) {
          case 'none': return [];
          case '':
          case undefined:
          case 'primary': return [`nnpc_${slot}`];
          case 'secondary': return [`nnpc_${slot}_acc`];
          default: return [];
        }
      },
      ...overrides
    });
  }

  /** @param {'left'|'right'} side @param {'main'|'acc'|'detail'} type @param {object} overrides */
  function clothes_hand(side, type, overrides = {}) {
    return clothes_basic('hands', {
      /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
      masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
      /** @param {{ maplebirch: { nnpc: { [x: string]: string; clothes: { hands: { variable: any; pattern: any; pattern_layer: any; }; }; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
      srcfn(options) {
        const hands = options.maplebirch.nnpc.clothes.hands;
        const arm = options.maplebirch.nnpc[`arm_${side}`];
        let suffix;
        if (side === 'left') { suffix = arm === 'cover' ? 'left_cover' : 'left'; }
        else { suffix = arm === 'cover' ? 'right_cover' : (options.maplebirch.nnpc.handheld_position || 'right'); }
        let pattern = ''; let extension = '';
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
          return gray_suffix(path, options.filters[(type === 'main' ? 'nnpc_hands' : 'nnpc_hands_acc')]);
        }
      },
      /** @param {{ maplebirch: { nnpc: { [x: string]: string; clothes: { hands: { [x: string]: any; }; }; show: any; model: any; }; }; }} options */
      showfn(options) {
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
      /** @param {{ maplebirch: { nnpc: { [x: string]: string; position: number; zarms: number; }; }; }} options */
      zfn(options) {
        const arm = options.maplebirch.nnpc[`arm_${side}`];
        const cover = arm === 'cover' || (side === 'right' && arm === 'hold');
        return cover ? (maplebirch.char.ZIndices.hands + options.maplebirch.nnpc.position) : (options.maplebirch.nnpc.zarms + 0.2);
      },
      /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
      dxfn(options) { return options.maplebirch.nnpc.dxfn; },
      /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
      dyfn(options) { return options.maplebirch.nnpc.dyfn; },
      filters: type === 'main' ? ['nnpc_hands'] : type === 'acc' ? ['nnpc_hands_acc'] : [],
      animation: 'idle',
      ...overrides
    });
  }

  /** @param {'main'|'acc'|'detail'} type @param {object} overrides */
  function clothes_handheld(type, overrides = {}) {
    return clothes_layer('handheld', type, {
      /** @param {{ maplebirch: { nnpc: { clothes: { handheld: any; }; arm_right: string; handheld_position: string; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
      srcfn(options) {
        const handheld = options.maplebirch.nnpc.clothes.handheld;
        const directory = handheld.type.includes('prop') ? 'props' : 'handheld';
        const category = directory === 'props' ? (handheld.type.find((/**@type {string}*/t) => ['food', 'ingredient', 'recipe', 'tending', 'antique', 'sex toy', 'child toy', 'book', 'furniture'].includes(t)) || 'general') + '/' : '';
        const cover = (options.maplebirch.nnpc.arm_right === 'cover' && options.maplebirch.nnpc.handheld_position !== 'right_cover') ? 'right_cover' : 'right';
        let pattern = '', extension = '';
        if (type === 'detail') {
          pattern = handheld.pattern ? `_${handheld.pattern?.replace(/ /g, '_')}` : '';
          return `img/clothes/${directory}/${category}${handheld.variable}/${cover}${pattern}.png`;
        } else {
          if (type === 'main') {
            pattern = handheld.pattern && !['tertiary', 'secondary'].includes(handheld.pattern_layer) ? `_${handheld.pattern?.replace(/ /g, '_')}` : '';
          } else if (type === 'acc') {
            pattern = handheld.pattern && handheld.pattern_layer === 'secondary' ?  `_${handheld.pattern?.replace(/ /g, '_')}` : '';
            extension = '_acc';
          }
          const path = `img/clothes/${directory}/${category}${handheld.variable}/${cover}${pattern}${extension}.png`;
          return gray_suffix(path, options.filters[`nnpc_handheld${type === 'acc' ? '_acc' : ''}`]);
        }
      },
      /** @param {{ maplebirch: { nnpc: any; }; }} options */
      showfn(options) {
        const nnpc = options.maplebirch.nnpc;
        const handheld = nnpc.clothes.handheld;
        if (!nnpc.show || !nnpc.model || nnpc.hide_all || handheld.index <= 0) return false;
        const arm = nnpc.arm_right !== 'none';
        const cover = nnpc.arm_right === 'cover' && !['right_cover', 'cover_both'].includes(handheld.holdPosition) ? (handheld.coverImage !== 0) : true;
        if (type === 'detail') {
          return arm && cover && handheld.pattern_layer === 'tertiary' && !!handheld.pattern;
        } else if (type === 'acc') {
          return arm && cover && handheld.accessory === 1;
        } else if (type === 'main') {
          return arm && cover;
        }
      },
      /** @param {{ maplebirch: { nnpc: any; }; }} options */
      zfn(options) {
        const nnpc = options.maplebirch.nnpc;
        const handheld = nnpc.clothes.handheld;
        return (nnpc.handheld_overhead || handheld.type.includes('prop')) ? (maplebirch.char.ZIndices.old_over_upper + nnpc.position) : (maplebirch.char.ZIndices.handheld + nnpc.position);
      },
      ...overrides
    });
  }

  const NPCSidebar = (() => {
    const display = new Map();

    class NPCSidebar {
      /**
       * 从模组加载 NPC 侧边栏图片
       * @param {JSZip} modZip 模组压缩包
       * @param {string[]} npcName NPC名称数组
       * @returns {string[]} 返回所有找到的图片路径
       */
      static loadFromMod(modZip, npcName) {
        if (!Array.isArray(npcName) || npcName.length === 0) return [];
        const formats = new Set(['png', 'jpg', 'gif']);
        const paths = [];
        for (const name of npcName) {
          const npcName = maplebirch.tool.convert(name, 'capitalize');
          if (!display.has(npcName)) display.set(npcName, new Set());
          const npcSet = display.get(npcName);
          const folder = `img/ui/nnpc/${npcName.toLowerCase()}/`;
          for (const file in modZip.zip.files) {
            if (file.startsWith(folder) && file !== folder) {
              // @ts-ignore
              const ext = file.split('.').pop().toLowerCase();
              if (formats.has(ext)) {
                // @ts-ignore
                const imgName = file.split('/').pop().split('.')[0];
                if (imgName) { npcSet.add(imgName); paths.push(file); }
              }
            }
          }
        }
        return paths;
      }

      static base_layers = {
        nnpc_body: {
          /** @param {{ maplebirch: { nnpc: { model: any; close_up_mask: any; }; }; }} options */
          masksrcfn(options) {
            if (options.maplebirch.nnpc.model) return options.maplebirch.nnpc.close_up_mask;
            return null;
          },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          srcfn(options) {
            const nnpc = options.maplebirch.nnpc;
            if (nnpc.model) return 'img/body/basenoarms-classic.png';
            const npcsidebar = (V.options.maplebirch ??= {}).npcsidebar;
            if (!npcsidebar.display[nnpc.name]) return;
            if (npcsidebar.display[nnpc.name] === maplebirch.npc.Clothes.layers.get(nnpc.name)?.key) return maplebirch.npc.Clothes.layers.get(nnpc.name).body;
          },
          /** @param {{ maplebirch: { nnpc: { show: any; }; }; }} options */
          showfn(options) { return options.maplebirch.nnpc.show; },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.base + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { model: any; dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.model ? options.maplebirch.nnpc.dxfn : 0; },
          /** @param {{ maplebirch: { nnpc: { model: any; dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.model ? options.maplebirch.nnpc.dyfn : 0; },
          filters: ['nnpc_tan'],
          animation: 'idle'
        },
        nnpc_head: {
          /** @param {{ maplebirch: { nnpc: { model: any; close_up_mask: any; }; }; }} options */
          masksrcfn(options) {
            if (options.maplebirch.nnpc.model) return options.maplebirch.nnpc.close_up_mask;
            return null;
          },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          srcfn(options) {
            const nnpc = options.maplebirch.nnpc;
            if (nnpc.model) return 'img/body/basehead.png';
            const npcsidebar = (V.options.maplebirch ??= {}).npcsidebar;
            if (!npcsidebar.display[nnpc.name]) return;
            if (npcsidebar.display[nnpc.name] === maplebirch.npc.Clothes.layers.get(nnpc.name)?.key) return maplebirch.npc.Clothes.layers.get(nnpc.name).head.img;
          },
          /** @param {{ maplebirch: { nnpc: { show: any; }; }; }} options */
          showfn(options) { return options.maplebirch.nnpc.show; },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          zfn(options) {
            const nnpc = options.maplebirch.nnpc;
            if (nnpc.model) return maplebirch.char.ZIndices.basehead + nnpc.position;
            if (typeof maplebirch.npc.Clothes.layers.get(nnpc.name)?.head.zIndex === 'number') return maplebirch.npc.Clothes.layers.get(nnpc.name).head.zIndex;
            return maplebirch.char.ZIndices.head + nnpc.position;
          },
          /** @param {{ maplebirch: { nnpc: { model: any; dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.model ? options.maplebirch.nnpc.dxfn : 0; },
          /** @param {{ maplebirch: { nnpc: { model: any; dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.model ? options.maplebirch.nnpc.dyfn : 0; },
          /** @param {{ maplebirch: { nnpc: { model: any; }; }; }} options */
          filtersfn(options) { return options.maplebirch.nnpc.model ? ['nnpc_tan'] : []; },
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
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { name: any; breasts: string; breast_size: number; }; }; }} options */
          srcfn(options) {
            if (!options.maplebirch.nnpc.breasts) return '';
            const suffix = (options.maplebirch.nnpc.breasts === 'cleavage' && options.maplebirch.nnpc.breast_size >= 3) ? '_clothed.png' : '.png';
            return `img/body/breasts/breasts${options.maplebirch.nnpc.breast_size}${suffix}`;
          },
          /** @param {{ maplebirch: { nnpc: { show: any; model: any; }; }; }} options */
          showfn(options) { return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.breasts + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_tan'],
          animation: 'idle'
        },
        nnpc_leftarm: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          src:'img/body/leftarmidle-classic.png',
          /** @param {{ maplebirch: { nnpc: { show: any; model: any; }; }; }} options */
          showfn(options) { return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { arm_left: string; zarms: any; }; }; }} options */
          zfn(options) {
            return options.maplebirch.nnpc.arm_left === 'cover' ? maplebirch.char.ZIndices.arms_cover : options.maplebirch.nnpc.zarms;
          },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_tan'],
          animation: 'idle'
        },
        nnpc_rightarm: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          src: 'img/body/rightarmidle-classic.png',
          /** @param {{ maplebirch: { nnpc: { show: any; model: any; }; }; }} options */
          showfn(options) { return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { arm_right: string; zarms: any; }; }; }} options */
          zfn(options) {
            return (options.maplebirch.nnpc.arm_right === 'cover' || options.maplebirch.nnpc.arm_right === 'hold') ? maplebirch.char.ZIndices.arms_cover : options.maplebirch.nnpc.zarms;
          },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_tan'],
          animation: 'idle'
        },
        nnpc_penis: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { name: any; genitals_chastity: any; clothes: { genitals: { name: string; }; under_lower: { type: string | string[]; state: string; }; }; penis: string; penis_size: any; }; }; }} options */
          srcfn(options) {
            if (!!options.maplebirch.nnpc.name) return '';
            if (options.maplebirch.nnpc.genitals_chastity) {
              if (['chastity belt', 'flat chastity cage', 'chastity parasite'].includes(options.maplebirch.nnpc.clothes.genitals.name)) return;
              if (options.maplebirch.nnpc.clothes.genitals.name === 'small chastity cage') return 'img/body/penis/penis_chastitysmall.png';
              return 'img/body/penis/penis_chastity.png';
            }
            if (!(options.maplebirch.nnpc.clothes.under_lower.type.includes('strap-on') && options.maplebirch.nnpc.clothes.under_lower.state === 'waist')) return `img/body/penis/${options.maplebirch.nnpc.penis === 'virgin' ? 'penis_virgin' : 'penis'}${options.maplebirch.nnpc.penis_size}.png`;
          },
          /** @param {{ maplebirch: { nnpc: { crotch_visible: any; penis: any; show: any; model: any; }; }; }} options */
          showfn(options) { 
            return options.maplebirch.nnpc.crotch_visible && !!options.maplebirch.nnpc.penis && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
          },
          /** @param {{ maplebirch: { nnpc: { crotch_exposed: any; position: number; genitals_chastity: any; }; }; }} options */
          zfn(options) {
            if (!options.maplebirch.nnpc.crotch_exposed) return maplebirch.char.ZIndices.penisunderclothes + options.maplebirch.nnpc.position;
            return options.maplebirch.nnpc.genitals_chastity ? maplebirch.char.ZIndices.penis_chastity + options.maplebirch.nnpc.position : maplebirch.char.ZIndices.penis + options.maplebirch.nnpc.position;
          },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_tan'],
          animation: 'idle'
        },
        nnpc_freckles: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { facestyle: any; }; }; }} options */
          srcfn(options) { return `img/face/${options.maplebirch.nnpc.facestyle}/freckles.png`; },
          /** @param {{ maplebirch: { nnpc: { freckles: any; show: any; model: any; }; }; }} options */
          showfn(options) { return !!options.maplebirch.nnpc.freckles && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.freckles + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_tan'],
        },
        nnpc_ears: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { facestyle: any; }; }; }} options */
          srcfn(options) { return `img/face/${options.maplebirch.nnpc.facestyle}/ears.png`; },
          /** @param {{ maplebirch: { nnpc: { ears_position: string; show: any; model: any; }; }; }} options */
          showfn(options) { return options.maplebirch.nnpc.ears_position === 'front' && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.ears + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_tan']
        },
        nnpc_eyes: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { facestyle: any; facevariant: any; }; }; }} options */
          srcfn(options) { return `img/face/${options.maplebirch.nnpc.facestyle}/${options.maplebirch.nnpc.facevariant}/eyes.png`; },
          /** @param {{ maplebirch: { nnpc: { show: any; model: any; }; }; }} options */
          showfn(options) { return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.eyes + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_tan'],
        },
        nnpc_sclera: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { facestyle: any; facevariant: any; }; }; }} options */
          srcfn(options) { return `img/face/${options.maplebirch.nnpc.facestyle}/${options.maplebirch.nnpc.facevariant}/sclera.png`; },
          /** @param {{ maplebirch: { nnpc: { show: any; model: any; }; }; }} options */
          showfn(options) { return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.sclera + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
        },
        nnpc_iris: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { facestyle: any; facevariant: any; }; }; }} options */
          srcfn(options) { return `img/face/${options.maplebirch.nnpc.facestyle}/${options.maplebirch.nnpc.facevariant}/iris.png`;},
          /** @param {{ maplebirch: { nnpc: { show: any; model: any; }; }; }} options */
          showfn(options) { return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.iris + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_eyes'],
          animation: 'idle'
        },
        nnpc_eyelids: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { facestyle: any; facevariant: any; }; }; }} options */
          srcfn(options) { return `img/face/${options.maplebirch.nnpc.facestyle}/${options.maplebirch.nnpc.facevariant}/eyelids.png`; },
          /** @param {{ maplebirch: { nnpc: { show: any; model: any; }; }; }} options */
          showfn(options) { return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.eyelids + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_tan'],
          /** @param {any} options */
          animationfn(options) { return options.blink ? 'blink' : ''; },
        },
        nnpc_lashes: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { facestyle: any; facevariant: any; }; }; }} options */
          srcfn(options) { return `img/face/${options.maplebirch.nnpc.facestyle}/${options.maplebirch.nnpc.facevariant}/lashes.png`; },
          /** @param {{ maplebirch: { nnpc: { show: any; model: any; }; }; }} options */
          showfn(options) { return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.lashes + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_tan'],
          /** @param {any} options */
          animationfn(options) { return options.blink ? 'blink' : ''; }
        },
        nnpc_brows: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { facestyle: any; facevariant: any; }; }; }} options */
          srcfn(options) { return `img/face/${options.maplebirch.nnpc.facestyle}/${options.maplebirch.nnpc.facevariant}/brow-top.png`; },
          /** @param {{ maplebirch: { nnpc: { show: any; model: any; }; }; }} options */
          showfn(options) { return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.brow + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_brows']
        },
        nnpc_mouth: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { facestyle: any; }; }; }} options */
          srcfn(options) { return `img/face/${options.maplebirch.nnpc.facestyle}/mouth-smile.png`; },
          /** @param {{ maplebirch: { nnpc: { show: any; model: any; }; }; }} options */
          showfn(options) { return options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.mouth + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_tan']
        },
        nnpc_hair_sides: {
          /** @param {{ maplebirch: { nnpc: { head_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.head_mask; },
          /** @param {{ maplebirch: { nnpc: { hair_sides_type: any; hair_length: any; }; }; }} options */
          srcfn(options) { return `img/hair/sides/${options.maplebirch.nnpc.hair_sides_type}/${options.maplebirch.nnpc.hair_length}.png`; },
          /** @param {{ maplebirch: { nnpc: { hair_sides_type: any; show: any; model: any; }; }; }} options */
          showfn(options) { return !!options.maplebirch.nnpc.hair_sides_type && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { hair_position: string; position: number; }; }; }} options */
          zfn(options) { return ( options.maplebirch.nnpc.hair_position === 'front' ? maplebirch.char.ZIndices.hairforwards : maplebirch.char.ZIndices.backhair) + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_hair'],
          animation: 'idle'
        },
        nnpc_hair_fringe: {
          /** @param {{ maplebirch: { nnpc: { hair_sides_type: string; hair_fringe_type: string; close_up_mask: any; head_mask: any; }; }; }} options */
          masksrcfn(options) {
            const fringe_mask_src = (['fro', 'afro pouf', 'afro puffs'].includes(options.maplebirch.nnpc.hair_sides_type) && options.maplebirch.nnpc.hair_fringe_type === 'fro') ? [options.maplebirch.nnpc.close_up_mask,`img/hair/fringe/${options.maplebirch.nnpc.hair_fringe_type}/mask.png`] : options.maplebirch.nnpc.close_up_mask;
            return options.maplebirch.nnpc.head_mask ? options.maplebirch.nnpc.head_mask : fringe_mask_src;
          },
          /** @param {{ maplebirch: { nnpc: { hair_fringe_type: any; hair_length: any; }; }; }} options */
          srcfn(options) { return `img/hair/fringe/${options.maplebirch.nnpc.hair_fringe_type}/${options.maplebirch.nnpc.hair_length}.png`; },
          /** @param {{ maplebirch: { nnpc: { hair_fringe_type: any; show: any; model: any; }; }; }} options */
          showfn(options) { return !!options.maplebirch.nnpc.hair_fringe_type && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.fronthair + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_hair'],
          animation: 'idle'
        },
        nnpc_hair_extra: {
          /** @param {{ maplebirch: { nnpc: { head_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.head_mask; },
          /** @param {{ maplebirch: { nnpc: { hair_sides_type: string; }; }; hair_sides_length: string; }} options */
          srcfn(options) {
            const hairs = ['default','loose','curl','defined curl','neat','dreads','afro pouf','thick ponytail','all down','half-up','messy ponytail','ruffled','half up twintail','princess wave','space buns','sleek','bedhead'];
            const path = `img/hair/back/${options.maplebirch.nnpc.hair_sides_type}`;
            if (options.hair_sides_length === 'feet' && [...hairs, 'straight'].includes(options.maplebirch.nnpc.hair_sides_type)) return `${path}/feet.png`;
            if (options.hair_sides_length === 'thighs' && hairs.includes(options.maplebirch.nnpc.hair_sides_type)) return `${path}/thighs.png`;
            if (options.hair_sides_length === 'navel' && options.maplebirch.nnpc.hair_sides_type === 'messy ponytail') return `${path}/navel.png`;
          },
          /** @param {{ maplebirch: { nnpc: { hair_sides_type: any; show: any; model: any; }; }; }} options */
          showfn(options) { return !!options.maplebirch.nnpc.hair_sides_type && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model; },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.backhair + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_hair'],
          animation: 'idle'
        }
      }

      static head_layers = {
        nnpc_over_head_main: clothes_layer('over_head', 'main'),
        nnpc_over_head_acc: clothes_layer('over_head', 'acc'),
        nnpc_over_head_back: clothes_back('over_head'),
        nnpc_over_head_back_acc: clothes_back_acc('over_head'),
        nnpc_head_main: clothes_layer('head', 'main', {
          /** @param {{ maplebirch: { nnpc: any; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
          srcfn(options) {
            const nnpc = options.maplebirch.nnpc;
            const dmg = nnpc.clothes.head.accessory_integrity_img ? nnpc.clothes.upper.integrity : nnpc.clothes.head.integrity;
            const pattern = nnpc.clothes.head.pattern && !['tertiary', 'secondary'].includes(nnpc.clothes.head.pattern_layer) ? '_' + nnpc.clothes.head.pattern?.replace(/ /g, '_') : '';
            return gray_suffix(`img/clothes/head/${nnpc.clothes.head.variable}/${dmg}${pattern}.png`, options.filters['nnpc_head']);
          },
          /** @param {{ maplebirch: { nnpc: { clothes: { head: { mainImage: number; }; }; hide_all: any; show: any; model: any; }; }; }} options */
          showfn(options) {
            return options.maplebirch.nnpc.clothes.head.mainImage !== 0 && !options.maplebirch.nnpc.hide_all && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
          },
        }),
        nnpc_head_acc: clothes_layer('head', 'acc', {
          /** @param {{ maplebirch: { nnpc: any; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
          srcfn(options) {
            const nnpc = options.maplebirch.nnpc;
            const dmg = nnpc.clothes.head.accessory_integrity_img ? `_${nnpc.clothes.upper.integrity}` : '';
            const pattern = nnpc.clothes.head.pattern && nnpc.clothes.head.pattern_layer === 'secondary' ? '_' + nnpc.clothes.head.pattern?.replace(/ /g, '_') : '';
            return gray_suffix(`img/clothes/head/${nnpc.clothes.head.variable}/acc${dmg}${pattern}.png`, options.filters['nnpc_head_acc']);
          },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          showfn(options) {
            const nnpc = options.maplebirch.nnpc;
            return nnpc.clothes.head.accImage !== 0 && nnpc.clothes.head.accessory === 1 && !nnpc.hide_head_acc && !nnpc.hide_all && nnpc.show && nnpc.model;
          },
        }),
        nnpc_head_detail: clothes_layer('head', 'detail', {
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          showfn(options) {
            const nnpc = options.maplebirch.nnpc;
            return nnpc.clothes.head.mainImage !== 0 && nnpc.clothes.head.pattern_layer === 'tertiary' && !!nnpc.clothes.head.pattern && !nnpc.hide_all && nnpc.show && nnpc.model;
          },
        }),
        nnpc_head_back: clothes_back('head'),
        nnpc_head_back_acc: clothes_back_acc('head')
      }

      static face_layers = {
        nnpc_face_main: clothes_layer('face', 'main', {
          /** @param {{ maplebirch: { nnpc: { clothes: { face: { type: string | string[]; }; }; position: number; }; }; }} options */
          zfn(options) {
            if (options.maplebirch.nnpc.clothes.face.type.includes('glasses')) return maplebirch.char.ZIndices.over_head + options.maplebirch.nnpc.position;
            return maplebirch.char.ZIndices.face + options.maplebirch.nnpc.position;
          },
        }),
        nnpc_face_acc: clothes_layer('face', 'acc', {
          /** @param {{ maplebirch: { nnpc: { clothes: { face: { type: string | string[]; }; }; position: number; }; }; }} options */
          zfn(options) {
            if (options.maplebirch.nnpc.clothes.face.type.includes('glasses')) return maplebirch.char.ZIndices.over_head + options.maplebirch.nnpc.position;
            return maplebirch.char.ZIndices.face + options.maplebirch.nnpc.position;
          },
        }),
        nnpc_face_back: clothes_back('face'),
        nnpc_face_back_acc: clothes_back_acc('face')
      }

      static neck_layers = {
        nnpc_neck_main: clothes_layer('neck', 'main', {
          /** @param {{ maplebirch: { nnpc: { high_waist_suspenders: any; close_up_mask: any; }; }; }} options */
          masksrcfn(options) {
            return options.maplebirch.nnpc.high_waist_suspenders ? [options.maplebirch.nnpc.close_up_mask,'img/clothes/neck/suspenders/mask.png'] : options.maplebirch.nnpc.close_up_mask;
          },
          /** @param {{ maplebirch: { nnpc: any; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
          srcfn(options) {
            const nnpc = options.maplebirch.nnpc;
            const collar = (nnpc.clothes.neck.has_collar === 1 && nnpc.clothes.upper.has_collar === 1) ? '_nocollar' : (nnpc.clothes.neck.name === 'sailor ribbon' && nnpc.clothes.upper.name === 'serafuku') ? '_serafuku' : '';
            const pattern = nnpc.clothes.neck.pattern && !['tertiary', 'secondary'].includes(nnpc.clothes.neck.pattern_layer) ? '_' + nnpc.clothes.neck.pattern?.replace(/ /g, '_') : '';
            return gray_suffix(`img/clothes/neck/${nnpc.clothes.neck.variable}/${nnpc.clothes.neck.integrity}${collar}${pattern}.png`, options.filters['nnpc_neck']);
          },
          /** @param {{ maplebirch: { nnpc: { clothes: { neck: { mainImage: number; }; }; hide_all: any; show: any; model: any; }; }; }} options */
          showfn(options) {
            return options.maplebirch.nnpc.clothes.neck.mainImage !== 0 && !options.maplebirch.nnpc.hide_all && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
          },
          /** @param {{ maplebirch: { nnpc: { hood_mask: any; position: number; }; }; }} options */
          zfn(options) {
            return (options.maplebirch.nnpc.hood_mask ? maplebirch.char.ZIndices.collar : maplebirch.char.ZIndices.neck) + options.maplebirch.nnpc.position;
          },
        }),
        nnpc_neck_acc: clothes_layer('neck', 'acc', {
          /** @param {{ maplebirch: { nnpc: any; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
          srcfn(options) {
            const nnpc = options.maplebirch.nnpc;
            const integrity = nnpc.clothes.neck.accessory_integrity_img ? `_${nnpc.clothes.neck.integrity}` : '';
            const pattern = nnpc.clothes.neck?.pattern && nnpc.clothes.neck?.pattern_layer === 'secondary' ? '_' + nnpc.clothes.neck.pattern?.replace(/ /g, '_') : '';
            return gray_suffix(`img/clothes/neck/${nnpc.clothes.neck.variable}/acc${integrity}${pattern}.png`, options.filters['nnpc_neck_acc']);
          },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          showfn(options) {
            const nnpc = options.maplebirch.nnpc;
            return nnpc.clothes.neck.accImage !== 0 && nnpc.clothes.neck.accessory === 1 && !nnpc.hide_leash && nnpc.show && nnpc.model;
          },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          zfn(options) {
            const nnpc = options.maplebirch.nnpc;
            const check = nnpc.clothes.head.mask_img === 1 && !(nnpc.clothes.upper.hoodposition === 'down' && nnpc.clothes.head.hood && nnpc.clothes.head.outfitSecondary != null);
            return (check ? maplebirch.char.ZIndices.collar : maplebirch.char.ZIndices.neck) + options.maplebirch.nnpc.position;
          },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          dyfn(options) { return (options.maplebirch.nnpc.high_waist_suspenders ? -8 : 0) + options.maplebirch.nnpc.dyfn; },
        }),
      }

      static upper_layers = {
        nnpc_over_upper_main: clothes_layer('over_upper', 'main'),
        nnpc_over_upper_acc: clothes_layer('over_upper', 'acc'),
        nnpc_over_upper_detail: clothes_layer('over_upper', 'detail'),
        nnpc_over_upper_breasts: clothes_breasts('over_upper', 'main'),
        nnpc_over_upper_leftarm: clothes_arm('over_upper','left'),
        nnpc_over_upper_rightarm: clothes_arm('over_upper','right'),
        nnpc_upper_main: clothes_layer('upper', 'main', {
          /** @param {{ maplebirch: { nnpc: { upper_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.upper_mask; },
          /** @param {{ maplebirch: { nnpc: { clothes: { upper: { name: string; }; }; position: number; zupper: any; }; }; }} options */
          zfn(options) {
            return options.maplebirch.nnpc.clothes.upper.name === 'cocoon' ? (maplebirch.char.ZIndices.over_head + options.maplebirch.nnpc.position) : options.maplebirch.nnpc.zupper;
          },
        }),
        nnpc_upper_acc: clothes_layer('upper', 'acc', {
          /** @param {{ maplebirch: { nnpc: { upper_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.upper_mask; },
          /** @param {{ maplebirch: { nnpc: { zupper: any; }; }; }} options */
          zfn(options) { return options.maplebirch.nnpc.zupper; }
        }),
        nnpc_upper_detail: clothes_layer('upper', 'detail', {
          /** @param {{ maplebirch: { nnpc: { zupper: any; }; }; }} options */
          zfn(options) { return options.maplebirch.nnpc.zupper; }
        }),
        nnpc_upper_breasts: clothes_breasts('upper', 'main', {
          /** @param {{ maplebirch: { nnpc: { zupper: any; }; }; }} options */
          zfn(options) { return options.maplebirch.nnpc.zupper; }
        }),
        nnpc_upper_breasts_acc: clothes_breasts('upper', 'acc', {
          /** @param {{ maplebirch: { nnpc: { zupper: any; }; }; }} options */
          zfn(options) { return options.maplebirch.nnpc.zupper; }
        }),
        nnpc_upper_breasts_detail: clothes_breasts('upper', 'detail', {
          /** @param {{ maplebirch: { nnpc: { zupper: any; }; }; }} options */
          zfn(options) { return options.maplebirch.nnpc.zupper; }
        }),
        nnpc_upper_leftarm: clothes_arm('upper','left', {
          /** @param {{ maplebirch: { nnpc: { zupperleft: any; }; }; }} options */
          zfn(options) { return options.maplebirch.nnpc.zupperleft; },
        }),
        nnpc_upper_rightarm: clothes_arm('upper','right', {
          /** @param {{ maplebirch: { nnpc: { zupperright: any; }; }; }} options */
          zfn(options) { return options.maplebirch.nnpc.zupperright; },
        }),
        nnpc_upper_leftarm_acc: clothes_arm_acc('upper', 'left', {
          /** @param {{ maplebirch: { nnpc: { zupperleft: any; }; }; }} options */
          zfn(options) { return options.maplebirch.nnpc.zupperleft; },
        }),
        nnpc_upper_rightarm_acc: clothes_arm_acc('upper', 'right', {
          /** @param {{ maplebirch: { nnpc: { zupperright: any; }; }; }} options */
          zfn(options) { return options.maplebirch.nnpc.zupperright; },
        }),
        nnpc_upper_back: clothes_back('upper',{
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.back_lower + options.maplebirch.nnpc.position;}
        }),
        nnpc_under_upper_main: clothes_layer('under_upper', 'main'),
        nnpc_under_upper_acc: clothes_layer('under_upper', 'acc'),
        nnpc_under_upper_breasts: clothes_breasts('under_upper', 'main'),
        nnpc_under_upper_breasts_acc: clothes_breasts('under_upper', 'acc'),
        nnpc_under_upper_breasts_detail: clothes_breasts('under_upper', 'detail', {
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.under_upper + options.maplebirch.nnpc.position; },
        }),
        nnpc_under_upper_leftarm: clothes_arm('under_upper','left'),
        nnpc_under_upper_rightarm: clothes_arm('under_upper','right'),
        nnpc_under_upper_back: clothes_back('under_upper')
      }

      static lower_layers = {
        nnpc_over_lower_main: clothes_layer('over_lower', 'main'),
        nnpc_over_lower_acc: clothes_layer('over_lower', 'acc'),
        nnpc_over_lower_detail: clothes_layer('over_lower', 'detail'),
        nnpc_over_lower_back: clothes_back('over_lower'),
        nnpc_lower_main: clothes_layer('lower', 'main', {
          /** @param {{ maplebirch: { nnpc: { lower_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.lower_mask; },
          /** @param {{ maplebirch: { nnpc: { clothes: { lower: { type: string | string[]; high_img: any; }; }; position: number; }; }; }} options */
          zfn(options) {
            const secondary = (options.maplebirch.nnpc.clothes.lower.type.includes('covered') ? maplebirch.char.ZIndices.lower_cover : maplebirch.char.ZIndices.lower) + options.maplebirch.nnpc.position;
            return options.maplebirch.nnpc.clothes.lower.high_img ? (maplebirch.char.ZIndices.lower_high + options.maplebirch.nnpc.position) : secondary;
          },
        }),
        nnpc_lower_acc: clothes_layer('lower', 'acc', {
          /** @param {{ maplebirch: { nnpc: { lower_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.lower_mask; },
          /** @param {{ maplebirch: { nnpc: { clothes: any; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
          srcfn(options) {
            const clothes = options.maplebirch.nnpc.clothes;
            const secondary = clothes.upper.name === 'school blouse' && clothes.lower.name.includes('pinafore') ? '_under' : '';
            const suffix = clothes.lower.accessory_integrity_img ? `_${clothes.lower.integrity}` : secondary;
            const pattern = clothes.lower.pattern && clothes.lower.pattern_layer === 'secondary' ? '_' + clothes.lower.pattern?.replace(/ /g,'_') : '';
            return gray_suffix(`img/clothes/lower/${clothes.lower.variable}/acc${suffix}${pattern}.png`, options.filters['nnpc_lower_acc']);
          },
          /** @param {{ maplebirch: { nnpc: { clothes: { lower: { name: string | string[]; type: string | string[]; }; }; position: number; }; }; }} options */
          zfn(options) {
            if (options.maplebirch.nnpc.clothes.lower.name.includes('ballgown') || options.maplebirch.nnpc.clothes.lower.name.includes('pinafore')) return maplebirch.char.ZIndices.upper_top + options.maplebirch.nnpc.position;
            if (options.maplebirch.nnpc.clothes.lower.type.includes('covered')) return maplebirch.char.ZIndices.lower_cover + options.maplebirch.nnpc.position;
            return maplebirch.char.ZIndices.lower + options.maplebirch.nnpc.position;
          },
        }),
        nnpc_lower_detail: clothes_layer('lower', 'detail', {
          /** @param {{ maplebirch: { nnpc: { lower_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.lower_mask; },
        }),
        nnpc_lower_breasts: clothes_breasts('lower', 'main', {
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.lower_high + options.maplebirch.nnpc.position; }
        }),
        nnpc_lower_breasts_acc: clothes_breasts('lower', 'acc', {
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.lower_high + options.maplebirch.nnpc.position; }
        }),
        nnpc_lower_penis: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { clothes: { lower: { variable: any; }; }; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
          srcfn(options) { return gray_suffix(`img/clothes/lower/${options.maplebirch.nnpc.clothes.lower.variable}/penis.png`,options.filters['nnpc_lower']); },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          showfn(options) {
            const nnpc = options.maplebirch.nnpc;
            return nnpc.clothes.lower.penis_img === 1 && (nnpc.calculate_penis_bulge(nnpc) - 6 > 0) && nnpc.show && nnpc.model;
          },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.lower_top + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_lower'],
          animation: 'idle'
        },
        nnpc_lower_penis_acc: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { clothes: { lower: { variable: any; }; }; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
          srcfn(options) { return gray_suffix(`img/clothes/lower/${options.maplebirch.nnpc.clothes.lower.variable}/acc_penis.png`,options.filters['nnpc_lower_acc']); },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          showfn(options) {
            const nnpc = options.maplebirch.nnpc;
            return nnpc.clothes.lower.penis_acc_img === 1 && nnpc.clothes.lower.accessory === 1 && (nnpc.calculate_penis_bulge(nnpc) - 6 > 0) && nnpc.show && nnpc.model;
          },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.lower_top + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_lower_acc'],
          animation: 'idle'
        },
        nnpc_lower_back: clothes_back('lower',{
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.back_lower + options.maplebirch.nnpc.position; },
        }),
        nnpc_lower_back_acc: clothes_back_acc('lower', {
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.back_lower + options.maplebirch.nnpc.position; },
        }),
        nnpc_under_lower_main: clothes_layer('under_lower', 'main', {
          /** @param {{ maplebirch: { nnpc: { clothes: { lower: { high_img: any; }; }; position: number; }; }; }} options */
          zfn(options) { return options.maplebirch.nnpc.clothes.lower.high_img ? maplebirch.char.ZIndices.under_lower_high + options.maplebirch.nnpc.position : maplebirch.char.ZIndices.under_lower + options.maplebirch.nnpc.position; },
        }),
        nnpc_under_lower_acc: clothes_layer('under_lower', 'acc'),
        nnpc_under_lower_detail: clothes_layer('under_lower', 'detail'),
        nnpc_under_lower_penis: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { clothes: { under_lower: { variable: any; }; }; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
          srcfn(options) { return gray_suffix(`img/clothes/under_lower/${options.maplebirch.nnpc.clothes.under_lower.variable}/penis.png`,options.filters['nnpc_under_lower']); },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          showfn(options) {
            const nnpc = options.maplebirch.nnpc;
            return nnpc.clothes.under_lower.penis_img === 1 && (nnpc.calculate_penis_bulge(nnpc) > 0) && nnpc.show && nnpc.model;
          },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.under_lower_top + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_under_lower'],
          animation: 'idle'
        },
        nnpc_under_lower_penis_acc: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { clothes: { under_lower: { variable: any; }; }; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
          srcfn(options) { return gray_suffix(`img/clothes/under_lower/${options.maplebirch.nnpc.clothes.under_lower.variable}/acc_penis.png`,options.filters['nnpc_under_lower_acc']); },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          showfn(options) {
            const nnpc = options.maplebirch.nnpc;
            return nnpc.clothes.under_lower.penis_acc_img === 1 && nnpc.clothes.under_lower.accessory === 1 && (nnpc.calculate_penis_bulge(nnpc) > 0) && nnpc.show && nnpc.model;
          },
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.under_lower_top + options.maplebirch.nnpc.position; },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters: ['nnpc_under_lower'],
          animation: 'idle'
        }
      }

      static hands_layers = {
        nnpc_hands_main: clothes_layer('hands', 'main'),
        nnpc_hands_left: clothes_hand('left', 'main'),
        nnpc_hands_left_acc: clothes_hand('left', 'acc'),
        nnpc_hands_left_detail: clothes_hand('left', 'detail'),
        nnpc_hands_right: clothes_hand('right', 'main'),
        nnpc_hands_right_acc: clothes_hand('right', 'acc'),
        nnpc_hands_right_detail: clothes_hand('right', 'detail'),
      }

      static handheld_layers = {
        nnpc_handheld_main: clothes_handheld('main', {
          /** @param {{ maplebirch: { nnpc: { clothes: { handheld: { variable: string; colour: string; }; }; }; }; }} options */
          filtersfn(options) {
            if (['feather'].includes(options.maplebirch.nnpc.clothes.handheld.variable) && options.maplebirch.nnpc.clothes.handheld.colour === 'grey') return ['nnpc_hair'];
            return ['nnpc_handheld'];
          },
          /** @param {{ maplebirch: { nnpc: { handheld_animation: any; }; }; }} options */
          animationfn(options) { return options.maplebirch.nnpc.handheld_animation; }
        }),
        nnpc_handheld_acc: clothes_handheld('acc'),
        nnpc_handheld_detail: clothes_handheld('detail'),
        nnpc_handheld_left: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { clothes: { handheld: any; }; arm_left: string; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
          srcfn(options) {
            const handheld = options.maplebirch.nnpc.clothes.handheld;
            const cover = options.maplebirch.nnpc.arm_left === 'cover' ? 'left_cover' : 'left';
            const directory = handheld.type.includes('prop') ? 'props' : 'handheld';
            const category = directory === 'props' ? (handheld.type.find((/**@type {string}*/type) => ['food', 'ingredient', 'recipe', 'tending', 'antique', 'sex toy', 'child toy', 'book', 'furniture'].includes(type)) || 'general') + '/' : '';
            return gray_suffix(`img/clothes/${directory}/${category}${handheld.variable}/${cover}.png`, options.filters['nnpc_handheld']);
          },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          showfn(options) {
            const nnpc = options.maplebirch.nnpc;
            return nnpc.clothes.handheld.index > 0 && nnpc.clothes.handheld.leftImage === 1 && nnpc.arm_left !== 'none' && !nnpc.hide_all && nnpc.show && nnpc.model;
          },
          /** @param {{ maplebirch: { nnpc: { arm_left: string; position: number; zarms: number; }; }; }} options */
          zfn(options) {
            return options.maplebirch.nnpc.arm_left === 'cover' ? (maplebirch.char.ZIndices.hands + options.maplebirch.nnpc.position) : (options.maplebirch.nnpc.zarms + 0.2);
          },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters:['nnpc_handheld'],
        },
        nnpc_handheld_left_acc: {
          /** @param {{ maplebirch: { nnpc: { close_up_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.close_up_mask; },
          /** @param {{ maplebirch: { nnpc: { clothes: { handheld: any; }; arm_left: string; }; }; filters: { [x: string]: { blendMode: string; blend: any; }; }; }} options */
          srcfn(options) {
            const handheld = options.maplebirch.nnpc.clothes.handheld;
            const cover = options.maplebirch.nnpc.arm_left === 'cover' ? 'left_cover' : 'left';
            const directory = handheld.type.includes('prop') ? 'props' : 'handheld';
            const category = directory === 'props' ? (handheld.type.find((/**@type {string}*/type) => ['food', 'ingredient', 'recipe', 'tending', 'antique', 'sex toy', 'child toy', 'book', 'furniture'].includes(type)) || 'general') + '/' : '';
            return gray_suffix(`img/clothes/${directory}/${category}${handheld.variable}/${cover}_acc.png`, options.filters['nnpc_handheld_acc']);
          },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          showfn(options) {
            const nnpc = options.maplebirch.nnpc;
            return nnpc.clothes.handheld.index > 0 && nnpc.clothes.handheld.leftImage === 1 && nnpc.clothes.handheld.accessory === 1 && nnpc.arm_left !== 'none' && !nnpc.hide_all && nnpc.show && nnpc.model;
          },
          /** @param {{ maplebirch: { nnpc: { arm_left: string; position: number; zarms: number; }; }; }} options */
          zfn(options) {
            return options.maplebirch.nnpc.arm_left === 'cover' ? (maplebirch.char.ZIndices.hands + options.maplebirch.nnpc.position) : (options.maplebirch.nnpc.zarms + 0.2);
          },
          /** @param {{ maplebirch: { nnpc: { dxfn: any; }; }; }} options */
          dxfn(options) { return options.maplebirch.nnpc.dxfn; },
          /** @param {{ maplebirch: { nnpc: { dyfn: any; }; }; }} options */
          dyfn(options) { return options.maplebirch.nnpc.dyfn; },
          filters:['nnpc_handheld_acc'],
        },
        nnpc_handheld_back: clothes_back('handheld'),
        nnpc_handheld_back_acc: clothes_back_acc('handheld', {
          /** @param {{ maplebirch: { nnpc: { position: number; }; }; }} options */
          zfn(options) { return maplebirch.char.ZIndices.over_head_back + options.maplebirch.nnpc.position; },
        })
      }

      static legs_layers = {
        nnpc_legs_main: clothes_layer('legs', 'main', {
          /** @param {{ maplebirch: { nnpc: { legs_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.legs_mask; },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          zfn(options) {
            const nnpc = options.maplebirch.nnpc;
            const check = (nnpc.clothes.under_lower.set === nnpc.clothes.under_upper.set || nnpc.clothes.under_lower.high_img === 1) && nnpc.clothes.legs.high_img !== 1 && nnpc.show && nnpc.model;
            if (check) return maplebirch.char.ZIndices.legs + options.maplebirch.nnpc.position;
            return maplebirch.char.ZIndices.legs_high + options.maplebirch.nnpc.position;
          },
        }),
        nnpc_legs_acc: clothes_layer('legs', 'acc', {
          /** @param {{ maplebirch: { nnpc: { legs_mask: any; }; }; }} options */
          masksrcfn(options) { return options.maplebirch.nnpc.legs_mask; },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          zfn(options) {
            const nnpc = options.maplebirch.nnpc;
            const check = nnpc.clothes.under_lower.set === nnpc.clothes.under_upper.set || nnpc.clothes.under_lower.high_img === 1 && nnpc.show && nnpc.model;
            if (check) return maplebirch.char.ZIndices.legs + options.maplebirch.nnpc.position;
            return maplebirch.char.ZIndices.legs_high + options.maplebirch.nnpc.position;
          },
        }),
        nnpc_legs_back: clothes_back('legs'),
        nnpc_legs_back_acc: clothes_back_acc('legs')
      }

      static feet_layers = {
        nnpc_feet_main: clothes_layer('feet', 'main', {
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          zfn(options) {
            const nnpc = options.maplebirch.nnpc;
            const check = nnpc.lower_tucked && !nnpc.clothes.lower.notuck && !nnpc.clothes.feet.notuck;
            if (check) return maplebirch.char.ZIndices.lower_tucked_feet + options.maplebirch.nnpc.position;
            return maplebirch.char.ZIndices.feet + options.maplebirch.nnpc.position;
          },
        }),
        nnpc_feet_acc: clothes_layer('feet', 'acc', {
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          zfn(options) {
            const nnpc = options.maplebirch.nnpc;
            const check = nnpc.lower_tucked && !nnpc.clothes.lower.notuck && !nnpc.clothes.feet.notuck;
            if (check) return maplebirch.char.ZIndices.lower_tucked_feet + options.maplebirch.nnpc.position;
            return maplebirch.char.ZIndices.feet + options.maplebirch.nnpc.position;
          },
        }),
        nnpc_feet_details: clothes_layer('feet', 'detail'),
        nnpc_feet_back: clothes_back('feet'),
		    nnpc_feet_back_acc: clothes_back_acc('feet')
      }

      /** @param {{ maplebirch: { nnpc?:any; npcsidebar?:any; }; filters: { nnpc_tan:any; nnpc_eyes:any; nnpc_brows:any; nnpc_hair:any; }; }} options */
      static preprocess(options) {
        (options.maplebirch ??= {}).nnpc ??= {};
        const nnpc = options.maplebirch.nnpc;
        nnpc.name =  V.NPCList[0].fullDescription;
        const nnpc_name = nnpc.name;
        nnpc.show = V.options.maplebirch.npcsidebar.show ? true : false;
        nnpc.model = (V.options.maplebirch.npcsidebar.model && setup.NPCNameList.includes(nnpc_name)) ? true : false;
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
          const keys = ['head','face','neck','upper','lower','feet','legs','handheld','genitals','under_upper','under_lower','over_head','over_upper','over_lower','hands'];
          const clothes_data = { ...keys.reduce((acc, slot) => ({ ...acc, [slot]: { index: 0, name: '', type: [] } }), {}), ...(npcData.clothes ?? {}) };
          nnpc.clothes = {};
          keys.forEach(slot => {
            const index = clothes_data[slot]?.index ?? 0;
            nnpc.clothes[slot] = { ...setup.clothes[slot][index], ...clothes_data[slot] };
            nnpc.clothes[slot].integrity = integrityKeyword(nnpc.clothes[slot], slot);
            const prefilter = setup.clothes[slot][index].prefilter;
            const colour = nnpc.clothes[slot].colour ?? 'white';
            // @ts-ignore
            if (colour) options.filters[`nnpc_${slot}`] = lookupColour(setup.colours.clothes_map, colour, prefilter);
            const acc = nnpc.clothes[slot].accessory_colour ?? 'white';
            // @ts-ignore
            if (acc) options.filters[`nnpc_${slot}_acc`] = lookupColour(setup.colours.clothes_map, acc, prefilter);
          });
          const nnpc_clothes = nnpc.clothes;

          nnpc.upper_tucked = npcData.tucked[0] && !setup.clothes.upper[clothesIndex('upper', nnpc_clothes.upper)].notuck && nnpc_clothes.upper.outfitPrimary == null;
          nnpc.lower_tucked = npcData.tucked[1] && !nnpc_clothes.feet.notuck && !nnpc_clothes.lower.notuck;
          nnpc.handheld_animation = nnpc_clothes.handheld.name.includes('coin') ? 'coinFlip' : nnpc_clothes.handheld.name === 'heart hand warmer' ? 'handWarmer' : 'idle'

          if (nnpc_clothes.lower.exposed >= 2 && nnpc_clothes.under_lower.exposed >= 1 && !nnpc_clothes.legs.name.includes('tights')) {
            nnpc.crotch_visible = true;
            nnpc.crotch_exposed = true;
          } else if (nnpc_clothes.lower.type.includes('naked') && nnpc_clothes.under_lower.type.includes('naked')) {
            nnpc.crotch_visible = true;
            nnpc.crotch_exposed = false;
          } else {
            nnpc.crotch_visible = false;
          }

          nnpc.arm_left = setup.clothes_all_slots.some((/**@type {string}*/slot) => ['left_cover', 'clutch', 'cover_both'].includes(nnpc_clothes[slot]?.holdPosition)) ? 'cover' : 'idle';
          nnpc.arm_right = setup.clothes_all_slots.some((/**@type {string}*/slot) => ['right_cover', 'cover_both'].includes(nnpc_clothes[slot]?.holdPosition)) ? 'cover' : (nnpc_clothes.handheld.name !== 'naked' && !['left_cover', 'idle'].includes(nnpc_clothes.handheld?.holdPosition)) || setup.clothes_all_slots.some((/**@type {string}*/slot) => nnpc_clothes[slot]?.holdPosition === 'hold') ? 'hold' : 'idle';

          if (nnpc_clothes.under_upper.sleeve_img === 1) {
            nnpc.zarms = maplebirch.char.ZIndices.under_upper_arms - 0.1;
          } else if (nnpc_clothes.upper.sleeve_img === 1) {
            nnpc.zarms = (nnpc.arm_left === 'cover' ? (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_arms_tucked : maplebirch.char.ZIndices.upper_arms) : maplebirch.char.ZIndices.under_upper_arms) - 0.1;
          } else if (nnpc_clothes.over_upper.index) {
            nnpc.zarms = maplebirch.char.ZIndices.over_upper_arms - 0.1;
          } else if (nnpc_clothes.upper.index) {
            nnpc.zarms = (nnpc.arm_left === 'cover' ? (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_arms_tucked : maplebirch.char.ZIndices.upper_arms) : maplebirch.char.ZIndices.under_upper_arms) - 0.1;
          } else if (nnpc_clothes.under_upper.index) {
            nnpc.zarms = maplebirch.char.ZIndices.under_upper_arms - 0.1;
          } else {
            nnpc.zarms = maplebirch.char.ZIndices.armsidle;
          }
          nnpc.zarms += nnpc.position;

          nnpc.zupper = (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_tucked : maplebirch.char.ZIndices.upper) + nnpc.position;
          nnpc.zupperleft = (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_arms_tucked : maplebirch.char.ZIndices.upper_arms) + nnpc.position;
		      nnpc.zupperright = (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_arms_tucked : maplebirch.char.ZIndices.upper_arms) + nnpc.position;

          nnpc.handheld_position = nnpc.arm_right === 'hold' ? 'hold' : ['right_cover'].includes(nnpc_clothes.handheld.holdPosition) ? 'right_cover' : null;
          if (nnpc_clothes.upper.name === 'cocoon') nnpc.hide_all = true;
          if (nnpc_clothes.neck.name === 'familiar collar') if (!nnpc_clothes.neck.type.includes('leash')) nnpc.hide_leash = true;

          if (nnpc_clothes.handheld.type.includes('rainproof')) {
            nnpc.handheld_overhead = true;
          } else if (['right_cover', 'over_head'].includes(nnpc_clothes.handheld.holdPosition)) {
            nnpc.handheld_overhead = true;
          } else {
            nnpc.handheld_overhead = null;
          }
          if (nnpc_clothes.head.name === 'sage witch hat') nnpc.hide_head_acc = false; // 等npc转化来

          nnpc.breasts = !nnpc_clothes.upper.type.includes('naked') || !nnpc_clothes.under_upper.type.includes('naked') ? 'cleavage' : 'default';
          nnpc.breast_size = [0,1,1,2,3,3,4,4,5,5,5,5,6][Math.round(npcData?.bodydata.breastsize)] ?? 0;
          nnpc.penis = (npcData?.bodydata.penis !== 'none') ? (npcData?.bodydata.virginity.penile ? 'virgin' : 'default') : false;
          nnpc.penis_size = Math.clamp(npcData?.bodydata.penissize, 1, 4);
          nnpc.genitals_chastity = nnpc_clothes.genitals.type.includes('chastity');
          nnpc.eye_colour = npcData?.bodydata.eyeColour;
          options.filters.nnpc_eyes = lookupColour(setup.colours.eyes_map, nnpc.eye_colour, 'eyes');
          nnpc.hair_colour = npcData?.bodydata.hairColour;
          options.filters.nnpc_brows = lookupColour(setup.colours.hair_map, nnpc.hair_colour, 'brows');
          options.filters.nnpc_hair = lookupColour(setup.colours.hair_map, nnpc.hair_colour, 'hair');
          const hairstyle = setup.hairstyles.sides.find((/**@type {{ variable:string; }}*/hs) => hs.variable === npcData?.bodydata.hair_side_type);
          nnpc.hair_sides_type = (hairstyle?.alt_head_type && hairstyle?.alt_head_type.includes(setup.clothes.head[clothesIndex('head', nnpc_clothes.head)].head_type)) ? hairstyle.alt : npcData?.bodydata.hair_side_type;
          nnpc.hair_fringe_type = npcData?.bodydata.hair_fringe_type;
          nnpc.hair_position = npcData?.bodydata.hair_position;
          nnpc.hair_length = ['short', 'shoulder', 'chest', 'navel', 'thighs', 'feet'][Math.trunc(npcData?.bodydata.hairlength / 200)];

          // 计算凸起，后续如果可以加性欲控制
          nnpc.calculate_penis_bulge = (/**@type {{ clothes: any; name: string; penis_size: number; }}*/ nnpc) => {
            const clothes = nnpc.clothes;
            if (clothes.under_lower.type.includes('strap-on')) return (clothes.under_lower.size || 0) * 3;
            const penis = V.maplebirch.npc[nnpc.name.toLowerCase()]?.bodydata.penis !== 'none';
            const compressed = penis && clothes.genitals.type.includes('hidden');
            if (!penis || compressed) return 0;
            if (clothes.genitals.type.includes('cage')) return Math.clamp(nnpc.penis_size, 0, Infinity);
          }
          nnpc.alt_sleeve_state = (nnpc_clothes.upper.variable === 'schoolcardigan' && nnpc_clothes.upper.altposition !== 'alt') ? null : true;
          nnpc.high_waist_suspenders = (nnpc_clothes.neck.name === 'suspenders' && nnpc_clothes.neck.altposition != 'alt' && ['retro shorts', 'retro trousers', 'baseball shorts', 'wide leg trousers'].includes(nnpc_clothes.lower.name)) ? true : null;
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
            const hair_all = ['curly pigtails', 'fluffy ponytail', 'thick sidetail', 'thick twintails', 'ribbon tail', 'thick ponytail', 'half-up']
            const hair_featured = ['scorpion tails', 'thick pigtails', 'thick twintails']
            nnpc.head_mask.push(`img/clothes/head/${nnpc_clothes.head.variable}/${(nnpc_clothes.head.mask_img_ponytail === 1 && hair_all.includes(nnpc.hair_sides_type)) || (hair_featured.includes(nnpc.hair_sides_type) && ['furcap f','furcap m'].includes(nnpc_clothes.head.variable)) ? 'mask_ponytail' : 'mask'}.png`); 
          }
          // @ts-ignore
          if (nnpc_clothes.upper.mask_img === 1) nnpc.upper_mask.push(gray_suffix(`img/clothes/upper/${nnpc_clothes.upper.variable}/${nnpc_clothes.upper.integrity}.png`,options.filters['nnpc_upper']));
          // @ts-ignore
          if (nnpc_clothes.lower.mask_img === 1) nnpc.lower_mask.push(gray_suffix(`img/clothes/lower/${nnpc_clothes.lower.variable}/${nnpc_clothes.lower.integrity}.png`,options.filters['nnpc_lower']))
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

      static layers = {
        ...NPCSidebar.base_layers,
        ...NPCSidebar.head_layers,
        ...NPCSidebar.face_layers,
        ...NPCSidebar.neck_layers,
        ...NPCSidebar.upper_layers,
        ...NPCSidebar.lower_layers,
        ...NPCSidebar.hands_layers,
        ...NPCSidebar.handheld_layers,
        ...NPCSidebar.legs_layers,
        ...NPCSidebar.feet_layers,
        nnpc_genitals: clothes_layer('genitals', 'main', {
          /** @param {{ maplebirch: { nnpc: { clothes: { genitals: any; }; penis_size: any; }; }; }} options */
          srcfn(options) {
            let size;
            const genitals = options.maplebirch.nnpc.clothes.genitals;
            if (genitals.penisSize) {
              switch (options.maplebirch.nnpc.penis_size) {
                case 0: size = 0; break;
                case 1: case 2: size = 1; break;
                case 3: case 4: size = 2; break;
              }
            }
            return `img/clothes/genitals/${genitals.variable}/${genitals.integrity}${size}.png`;
          },
          /** @param {{ maplebirch: { nnpc: { clothes: any; show: any; model: any; }; }; }} options */
          showfn(options) {
            const clothes = options.maplebirch.nnpc.clothes;
            return clothes.genitals.mainImage !== 0 && !clothes.genitals.hideUnderLower.includes(clothes.under_lower.name) && options.maplebirch.nnpc.show && options.maplebirch.nnpc.model;
          },
          /** @param {{ maplebirch: { nnpc: { crotch_exposed: any; position: number; }; }; }} options */
          zfn(options) {
            return (options.maplebirch.nnpc.crotch_exposed ? (maplebirch.char.ZIndices.penis_chastity + 0.1) : (maplebirch.char.ZIndices.penisunderclothes + 0.1)) + options.maplebirch.nnpc.position;
          },
        }),
        nnpc: {
          /** @param {{ maplebirch: { nnpc: { name: string; }; }; }} options */
          srcfn(options) {
            const nnpc = options.maplebirch.nnpc;
            const npcsidebar = (V.options.maplebirch ??= {}).npcsidebar;
            if (!npcsidebar.display[nnpc.name]) return;
            if (npcsidebar.display[nnpc.name] === 'none' || npcsidebar.display[nnpc.name] === maplebirch.npc.Clothes.layers.get(nnpc.name)?.key) return;
            return `img/ui/nnpc/${nnpc.name.toLowerCase()}/${npcsidebar.display[nnpc.name]}.png`;
          },
          /** @param {{ maplebirch: { nnpc: any; }; }} options */
          showfn(options) {
            const nnpc = options.maplebirch.nnpc;
            return !!nnpc.show && !nnpc.model && nnpc.name && setup.NPCNameList.includes(nnpc.name); 
          },
          /** @param {{ maplebirch: { nnpc: { position: any; }; }; }} options */
          zfn(options) { return options.maplebirch.nnpc.position; },
          animation: 'idle'
        },
      }

      /** @param {'sides'|'fringe'} type */
      static hair_type(type) {
        /**@type {{[x:string]:any;}}*/let hair_name = {};
        const HAIR_NAME = (/**@type {{ name_cap: any; name: any; }} */style) => (modUtils.getMod('ModI18N') && maplebirch.Language === 'CN') ? style.name_cap : style.name;
        if (type === 'sides') setup.hairstyles.sides.forEach((/**@type {{ variable: any; name_cap: any; name: any; }}*/ style) => { hair_name[convert((HAIR_NAME(style)), 'title')] = style.variable; })
        if (type === 'fringe') setup.hairstyles.fringe.forEach((/**@type {{ variable: any; name_cap: any; name: any; }}*/style) => { hair_name[convert((HAIR_NAME(style)), 'title')] = style.variable; })
        return hair_name;
      }

      /** @param {NPCManager} manager */
      static init(manager) {
        for (const npcName of manager.NPCNameList) if (!display.has(npcName)) display.set(npcName, new Set());
        manager.core.char.use('pre', NPCSidebar.preprocess);
        manager.core.char.use(NPCSidebar.layers);
      }
    }

    Object.defineProperties(NPCSidebar, {
      display:    { get: () => display },
    });

    return NPCSidebar;
  })()

  maplebirch.once(':npc-init', (/**@type {NPCManager}*/data) => { Object.assign(data, { Sidebar: NPCSidebar }); });
})();