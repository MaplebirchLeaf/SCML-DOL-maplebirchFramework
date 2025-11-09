(() => {
  'use strict';
  const maplebirch = window.maplebirch;

  const modelShow = (options) => !!options.show_nnpc && !!options.canvas_mode;

  class BaseBody {
    static default = {
      breasts: '',
      breast_size: 1,
      arm_left: 'idle',
      arm_right: 'idle',
      crotch_exposed: false,
      genitals_chastity: false,
      penis: '',
			penis_size: 0,
			penis_condom: '',
      balls: false,
      crotch_visible: false
    }

    static preprocess(options) {
      options.breasts = !options.worn.upper.setup.type.includes('naked') || !options.worn.under_upper.setup.type.includes('naked') ? 'cleavage' : 'default';
      if (options.worn.under_upper.setup.sleeve_img === 1) {
        options.zarms = NPCSidebar.ZIndices.under_upper_arms - 0.1;
      } else if (options.worn.upper.setup.sleeve_img === 1) {
        options.zarms = (options.arm_left === 'cover') ? (options.upper_tucked ? NPCSidebar.ZIndices.upper_arms_tucked - 0.1 : NPCSidebar.ZIndices.upper_arms - 0.1) : NPCSidebar.ZIndices.under_upper_arms - 0.1;
      } else if (options.worn.over_upper.index) {
        options.zarms = NPCSidebar.ZIndices.over_upper_arms - 0.1;
      } else if (options.worn.upper.index) {
        options.zarms = (options.arm_left === 'cover') ? (options.upper_tucked ? NPCSidebar.ZIndices.upper_arms_tucked - 0.1 : NPCSidebar.ZIndices.upper_arms - 0.1) : NPCSidebar.ZIndices.under_upper_arms - 0.1;
      } else if (options.worn.under_upper.index) {
        options.zarms = NPCSidebar.ZIndices.under_upper_arms - 0.1;
      } else {
        options.zarms = NPCSidebar.ZIndices.armsidle;
      }
      options.genitals_chastity = options.worn.genitals.setup.type.includes('chastity');
    }

    static get layers() {
      return {
        base: {
          src: 'img/body/basenoarms-classic.png',
          showfn(options) { return modelShow(options); },
          z: NPCSidebar.ZIndices.base,
          animation: 'idle',
          filters: ['tan'],
        },
        basehead: {
          src: 'img/body/basehead.png',
          showfn(options) { return modelShow(options); },
          z: NPCSidebar.ZIndices.basehead,
          animation: 'idle',
          filters: ['tan'],
        },
        breasts: {
          srcfn(options) {
            const suffix = (options.breasts === 'cleavage' && options.breast_size >= 3) ? '_clothed.png' : '.png';
            return `img/body/breasts/breasts${options.breast_size}${suffix}`;
          },
          showfn(options) { return modelShow(options); }, 
          z: NPCSidebar.ZIndices.breasts,
          animation: 'idle',
          filters: ['tan'],
        },
        leftarm: {
          srcfn(options) { return options.arm_left === 'cover' ? 'img/body/leftarmcover.png' : 'img/body/leftarmidle-classic.png' },
          showfn(options) { return options.arm_left !== 'none' && modelShow(options); },
          zfn(options) { return (options.arm_left === 'cover') ? NPCSidebar.ZIndices.arms_cover : options.zarms; },
          animation: 'idle',
          filters: ['tan'],
        },
        rightarm: {
          src: 'img/body/rightarmidle-classic.png',
          showfn(options) { return options.arm_right !== 'none' && modelShow(options); },
          zfn(options) { return (options.arm_right === 'cover' || options.arm_right === 'hold') ? NPCSidebar.ZIndices.arms_cover : options.zarms; },
          animation: 'idle',
          filters: ['tan'],
        },
        penis: {
          srcfn(options) {
            if (options.genitals_chastity) {
              if (['chastity belt', 'flat chastity cage', 'chastity parasite'].includes(options.worn.genitals.setup.name)) return;
              if (options.worn.genitals.setup.name === 'small chastity cage') return 'img/body/penis/penis_chastitysmall.png';
              return 'img/body/penis/penis_chastity.png';
            }
            if (!(options.worn.under_lower.type.includes('strap-on') && options.worn.under_lower.state === 'waist')) {
              return `img/body/${options.balls ? 'penis' : 'penisnoballs'}/${options.penis === 'virgin' ? 'penis_virgin' : 'penis'}${options.penis_size}.png`;
            }
            return;
          },
          showfn(options) { return options.crotch_visible && !!options.penis && modelShow(options); },
          zfn(options) { return !options.crotch_exposed ? NPCSidebar.ZIndices.penisunderclothes : options.genitals_chastity ? NPCSidebar.ZIndices.penis_chastity : NPCSidebar.ZIndices.penis; },
          animation: 'idle',
          filters: ['tan'],
        },
        penis_condom: {
          alpha: 0.4,
          srcfn(options) { return options.penis_condom === 'plain' ? `img/body/penis/condom${options.penis_size}.png` : ''; },
          showfn(options) { return options.crotch_visible && !!options.penis && !!options.penis_condom && !options.genitals_chastity && modelShow(options);
          },
          zfn(options) { return options.crotch_exposed ? NPCSidebar.ZIndices.parasite : NPCSidebar.ZIndices.underParasite; },
          animation: 'idle',
          filters: ['condom'],
        },
      }
    }
  }

  class FaceBody {
    static default = {
      show_face: true,
      facestyle: 'default',
			facevariant: 'default',
      ears_position: 'back',
      trauma: false,
      eyes_half: false,
      blink: true,
      blink_animation: '',
      brows: 'none',
			brows_position: 'front',
      blush: 0,
      tears: 0,
      mouth: 'none'
    }

    static preprocess(options) {
      options.facestyle = 'default'; // npc数据还未写
      options.blink_animation = options.blink ? options.trauma ? 'blink-trauma' : 'blink' : '';
      options.brows = 'top'; // 之后再写条件
      // options.blush 和暴露有关
      options.mouth = 'smile'; // 试条件待定
      options.scars = false;
    }

    static get layers() {
      return {
        freckles: {
          srcfn(options) { return `img/face/${options.facestyle}/freckles.png`; },
          showfn(options) { return options.show_face && !!options.freckles && modelShow(options); },
          z: NPCSidebar.ZIndices.freckles,
          filters: ['tan'],
        },
        ears: {
          srcfn(options) { return `img/face/${options.facestyle}/ears.png`; },
          showfn(options) { return options.show_face && options.ears_position === 'front' && modelShow(options); },
          z: NPCSidebar.ZIndices.ears,
          filters: ['tan'],
        },
        eyes: {
          srcfn(options) { return `img/face/${options.facestyle}/${options.facevariant}/eyes.png`; },
          showfn(options) { return options.show_face && modelShow(options); },
          z: NPCSidebar.ZIndices.eyes,
          filters: ['tan'],
        },
        sclera: {
          srcfn(options) { return `img/face/${options.facestyle}/${options.facevariant}/${options.eyes_bloodshot ? 'sclera-bloodshot' : 'sclera'}.png`; },
          showfn(options) { return options.show_face && modelShow(options); },
          z: NPCSidebar.ZIndices.sclera,
        },
        left_iris: {
          srcfn(options) {
            const iris = options.trauma ? 'iris-empty' : 'iris';
            const half = options.eyes_half ? '-half-closed' : '';
            return `img/face/${options.facestyle}/${options.facevariant}/${iris}${half}.png`;
          },
          showfn(options) { return options.show_face && modelShow(options); },
          z: NPCSidebar.ZIndices.iris,
          masksrcfn(options) { return 'img/face/masks/left.png' },
          animation: 'idle',
          filters: ['left_eye'],
        },
        right_iris: {
          srcfn(options) {
            const iris = options.trauma ? 'iris-empty' : 'iris';
            const half = options.eyes_half ? '-half-closed' : '';
            return `img/face/${options.facestyle}/${options.facevariant}/${iris}${half}.png`;
          },
          showfn(options) { return options.show_face && modelShow(options); },
          z: NPCSidebar.ZIndices.iris,
          masksrcfn(options) { return 'img/face/masks/right.png' },
          animation: 'idle',
          filters: ['right_eye'],
        },
        eyelids: {
          srcfn(options) {
            const half = options.eyes_half ? '-half-closed' : '';
            return `img/face/${options.facestyle}/${options.facevariant}/eyelids${half}.png`;
          },
          showfn(options) { return options.show_face && modelShow(options); },
          z: NPCSidebar.ZIndices.eyelids,
          animationfn(options) { return options.blink_animation; },
          filters: ['tan'],
        },
        lashes: {
          srcfn(options) {
            const half = options.eyes_half ? '-half-closed' : '';
            return `img/face/${options.facestyle}/${options.facevariant}/lashes${half}.png`;
          },
          showfn(options) { return options.show_face && modelShow(options); },
          z: NPCSidebar.ZIndices.lashes,
          animationfn(options) { return options.blink_animation; },
          filters: ['tan'],
        },
        brows: {
          srcfn(options) { return `img/face/${options.facestyle}/${options.facevariant}/brow-${options.brows}.png`; },
          showfn(options) { return options.show_face && options.brows !== 'none' && modelShow(options); },
          z: NPCSidebar.ZIndices.brow,
          zfn(options) { return options.brows_position === 'back' ? NPCSidebar.ZIndices.backbrow : NPCSidebar.ZIndices.brow; },
          filters: ['brows'],
        },
        mouth: {
          filters: ['tan'],
          z: NPCSidebar.ZIndices.mouth,
          srcfn(options) { return `img/face/${options.facestyle}/mouth-${options.mouth}.png`; },
          showfn(options) { return options.show_face && options.mouth !== 'none' && modelShow(options); },
        },
        blush: {
          srcfn(options) { return `img/face/${options.facestyle}/blush${options.blush}.png`;},
          showfn(options) { return options.show_face && options.blush > 0 && modelShow(options); },
          z: NPCSidebar.ZIndices.blush,
          filters: ['tan'],
        },
        tears: {
          srcfn(options) { return `img/face/${options.facestyle}/tear${options.tears}.png`; },
          showfn(options) { return options.show_face && options.tears > 0 && modelShow(options); },
          z: NPCSidebar.ZIndices.tears,
          animation: 'idle',
        },
        scars: {
          z: NPCSidebar.ZIndices.neck,
          srcfn() { return 'img/body/wraith_scars.png'; },
          showfn(options) { return options.show_face && options.scars && modelShow(options); },
        },
      }
    }
  }

  class HairBody {
    static default = {
      show_hair: true,
      hair_sides_type: 'default',
      hair_sides_length: 'short',
      hair_sides_position: 'back',
      head_mask_src: '',
      hair_fringe_type: 'default',
      hair_fringe_length: 'short',
    }

    static preprocess(options) {
      options.head_mask_src =
        options.worn.upper.setup.mask_img === 1 && options.worn.upper.setup.name === 'cocoon'
          ? 'img/clothes/upper/cocoon/mask.png'
          : options.worn.over_head.setup.mask_img === 1 && !(options.hood_down && options.worn.over_head.setup.hood && options.worn.over_head.setup.outfitSecondary !== undefined)
            ? `img/clothes/head/${options.worn.over_head.setup.variable}/mask.png`
            : options.worn.head.setup.mask_img === 1 && !(options.hood_down && options.worn.head.setup.hood && options.worn.head.setup.outfitSecondary !== undefined)
              ? (options.worn.head.setup.mask_img_ponytail === 1 && hairTails.includes(options.hair_sides_type) || thickTails.includes(options.hair_sides_type) && furCap.includes(options.worn.head.setup.variable))
                ? `img/clothes/head/${options.worn.head.setup.variable}/mask_ponytail.png`
                : `img/clothes/head/${options.worn.head.setup.variable}/mask.png`
              : null;
      options.head_mask_src = null;
      options.fringe_mask_src = ['fro', 'afro pouf', 'afro puffs'].includes(options.hair_sides_type) && options.hair_fringe_type === 'fro' ? `img/hair/fringe/${options.hair_fringe_type}/mask.png` : null;
    }

    static get layers() {
      return {
        hair_sides: {
          srcfn(options) { return `img/hair/sides/${options.hair_sides_type}/${options.hair_sides_length}.png`; },
          showfn(options) { return !!options.show_hair && !!options.hair_sides_type && modelShow(options); },
          zfn(options) {return options.hair_sides_position === 'front' ? NPCSidebar.ZIndices.hairforwards : NPCSidebar.ZIndices.backhair; },
          masksrcfn(options) { return options.head_mask_src; },
          animation: 'idle',
          filters: ['hair'],
        },
        hair_fringe: {
          srcfn(options) { return `img/hair/fringe/${options.hair_fringe_type}/${options.hair_fringe_length}.png`; },
          showfn(options) { return !!options.show_hair && !!options.hair_fringe_type && modelShow(options); },
          z: NPCSidebar.ZIndices.fronthair,
          masksrcfn(options) { return options.head_mask_src ? options.head_mask_src : options.fringe_mask_src; },
          animation: 'idle',
          filters: ['hair_fringe'],
        },
        hair_extra: {
          srcfn(options) {
            const hairs = [
              'default', 'loose', 'curl', 'defined curl', 'neat', 'dreads', 'afro pouf',
              'thick ponytail', 'all down', 'half-up', 'messy ponytail', 'ruffled',
              'half up twintail', 'princess wave', 'space buns', 'sleek', 'bedhead',
            ];
            const path = `img/hair/back/${options.hair_sides_type}`;
            const conditions = {
              feet: [...hairs, 'straight'].includes(options.hair_sides_type),
              thighs: hairs.includes(options.hair_sides_type),
              navel: options.hair_sides_type === 'messy ponytail'
            };
            return conditions[options.hair_sides_length] ? `${path}/${options.hair_sides_length}.png` : '';
          },
          showfn(options) { return !!options.show_hair && !!options.hair_sides_type && modelShow(options); },
          z: NPCSidebar.ZIndices.backhair,
          masksrcfn(options) { return options.head_mask_src; },
          animation: 'idle',
          filters: ['hair'],
        },
      }
    }
  }

  class Clothes {
    static #gray_suffix(path, filter) {
      if (!filter || filter.blendMode !== 'hard-light' || !filter.blend) return path;
      return path.replace('.png', '_gray.png');
    }

    static #filterFnArm(state, slot, options) {
      const altFilterSwap = !options.alt_override && options.worn[slot].setup.altposition !== undefined && options.worn[slot].alt === 'alt' && options.worn[slot].setup.altdisabled.includes('filter');
      switch (state) {
        case undefined:
        case '':
        case 'primary':
          return altFilterSwap ? [`worn_${slot}_acc`] : [`worn_${slot}`];
        case 'secondary':
          return altFilterSwap ? [`worn_${slot}`] : [`worn_${slot}_acc`];
        case 'pattern':
          switch (options.worn[slot].setup.pattern_layer) {
            case 'tertiary':
              return [];
            case 'secondary':
              return [`worn_${slot}_acc`]
            default:
              return [`worn_${slot}`]
          }
        default:
          return [];
      }
    }

    static #genlayer_clothing_basic(slot, overrideOptions) {
      return Object.assign({
        animation: 'idle',
        alphafn(options) { return options.worn[slot].alpha; },
        showfn(options) { return modelShow(options); },
        wornfn(options) {
          return {
            slot,
            integrity: options.worn[slot].integrity,
            alt: options.worn[slot].alt,
            index: options.worn[slot].setup.index
          }
        },
      }, overrideOptions);
    }

    static #genlayer_clothing_main(slot, overrideOptions) {
      return Clothes.#genlayer_clothing_basic(slot, Object.assign({
        z: NPCSidebar.ZIndices[slot],
        filtersfn(options) {
          const altFilterSwap = !options.alt_override && options.worn[slot].setup.altposition !== undefined && options.worn[slot].alt === 'alt' && options.worn[slot].setup.altdisabled.includes('filter');
          return altFilterSwap ? [`worn_${slot}_acc`] : [`worn_${slot}`];
        },
        showfn(options) { return options.show_clothes && options.worn[slot].index > 0 && options.worn[slot].setup.mainImage !== 0; },
        srcfn(options) {
          const setup = options.worn[slot].setup;
          const isHoodDown = options.hood_down && setup.hoodposition !== undefined && setup.outfitPrimary.head !== undefined;
          const isAltPosition = !options.alt_override && setup.altposition !== undefined && options.worn[slot].alt === 'alt' && !setup.altdisabled.includes('full');
          const pattern = options.worn[slot].pattern && !['secondary', 'tertiary'].includes(options.worn[slot].setup.pattern_layer) ? '_' + options.worn[slot].pattern?.replace(/ /g, '_') : '';
          const end = isHoodDown ? '_down' : isAltPosition ? '_alt' : '';
          const path = `img/clothes/${slot}/${setup.variable}/${options.worn[slot].integrity}${pattern}${end}.png`;
          return Clothes.#gray_suffix(path, options.filters[`worn_${slot}`]);
        },
      }, overrideOptions));
    }

    static #genlayer_clothing_accessory(slot, overrideOptions) {
      return Clothes.#genlayer_clothing_main(slot, Object.assign({
        filtersfn(options) {
          const altFilterSwap = !options.alt_override
            && options.worn[slot].setup.altposition !== undefined
            && options.worn[slot].alt === 'alt'
            && options.worn[slot].setup.altdisabled.includes('filter');
          return altFilterSwap ? [`worn_${slot}`] : [`worn_${slot}_acc`];
        },
        showfn(options) {
          return options.show_clothes && options.worn[slot].index > 0 && options.worn[slot].setup.accImage !== 0 && options.worn[slot].setup.accessory === 1;
        },
        srcfn(options) {
          const setup = options.worn[slot].setup;
          const isHoodDown = options.hood_down && setup.hoodposition !== undefined && setup.outfitPrimary.head !== undefined;
          const isAltPosition = !options.alt_override && setup.altposition !== undefined && options.worn[slot].alt === 'alt' && !setup.altdisabled.includes('acc');
          const integrity = setup.accessory_integrity_img ? `_${options.worn[slot].integrity}` : '';
          const pattern = options.worn[slot].pattern && options.worn[slot].setup.pattern_layer === 'secondary' ? '_' + options.worn[slot].pattern?.replace(/ /g, '_') : '';
          const end = isHoodDown ? '_down' : isAltPosition ? '_alt' : '';
          const path = `img/clothes/${slot}/${setup.variable}/acc${integrity}${pattern}${end}.png`;
          return Clothes.#gray_suffix(path, options.filters[`worn_${slot}_acc`]);
        },
      }, overrideOptions));
    }

    static #genlayer_clothing_detail(slot, overrideOptions) {
      return Clothes.#genlayer_clothing_basic(slot, Object.assign({
        z: NPCSidebar.ZIndices[slot],
        showfn(options) { return options.show_clothes && options.worn[slot].index > 0 && !!options.worn[slot].pattern && options.worn[slot].setup.pattern_layer === 'tertiary' && options.worn[slot].setup.mainImage !== 0; },
        srcfn(options) {
          const setup = options.worn[slot].setup;
          const isAltPosition = !options.alt_override && setup.altposition !== undefined && options.worn[slot].alt === 'alt' && !setup.altdisabled.includes('full');
          const pattern = options.worn[slot].pattern ? options.worn[slot].pattern?.replace(/ /g, '_') : '';
          const end = isAltPosition ? '_alt' : '';
          return `img/clothes/${slot}/${setup.variable}/${pattern}${end}.png`;
        },
      }, overrideOptions));
    }

    static #genlayer_clothing_back_img_acc(slot, overrideOptions) {
      return Clothes.#genlayer_clothing_basic(slot, Object.assign({
        z: NPCSidebar.ZIndices['head_back'],
        filtersfn(options) {
          switch (options.worn[slot].setup.back_img_acc_colour) {
            case 'none':
              return [];
            case '':
            case undefined:
            case 'primary':
              return [`worn_${slot}`];
            case 'secondary':
              return [`worn_${slot}_acc`]
          }
        },
        showfn(options) {
          if (!options.show_clothes) return false;
          const isHoodDown = options.hood_down && options.worn[slot].setup.hood && options.worn[slot].setup.outfitSecondary !== undefined;
          return options.worn[slot].index > 0 && options.worn[slot].setup.back_img_acc === 1 && !isHoodDown;
        },
        srcfn(options) {
          const isAltPosition = !options.alt_override && options.worn[slot].setup.altposition !== undefined && options.worn[slot].alt === 'alt' && !options.worn[slot].setup.altdisabled.includes('back');
          const suffix = isAltPosition ? 'back_alt' : 'back';
          const pattern = options.worn[slot].pattern && options.worn[slot].setup.pattern_layer === 'secondary' ? '_' + options.worn[slot].pattern?.replace(/ /g, '_') : '';
          const path = `img/clothes/${slot}/${options.worn[slot].setup.variable}/${suffix}${pattern}_acc.png`;
          return Clothes.#gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
        },
      }, overrideOptions));
    }

    static #genlayer_clothing_back_img(slot, overrideOptions) {
      return Clothes.#genlayer_clothing_basic(slot, Object.assign({
        z: NPCSidebar.ZIndices['over_head_back'],
        filtersfn(options) {
          switch (options.worn[slot].setup.back_img_colour) {
            case 'none':
              return [];
            case '':
            case undefined:
            case 'primary':
              return [`worn_${slot}`];
            case 'secondary':
              return [`worn_${slot}_acc`];
          }
        },
        showfn(options) {
          if (!options.show_clothes) return false;
          const isHoodDown = options.hood_down && options.worn[slot].setup.hood && options.worn[slot].setup.outfitSecondary !== undefined;
          return options.worn[slot].index > 0 && options.worn[slot].setup.back_img === 1 && !isHoodDown;
        },
        srcfn(options) {
          const isAltPosition = !options.alt_override && options.worn[slot].setup.altposition !== undefined && options.worn[slot].alt === 'alt' && !options.worn[slot].setup.altdisabled.includes('back');
          const prefix = isAltPosition ? 'back_alt' : 'back';
          const suffix = options.worn[slot].setup.back_integrity_img ? `_${options.worn[slot].integrity}` : '';
          const pattern = options.worn[slot].pattern && !['tertiary', 'secondary'].includes(options.worn[slot].setup.pattern_layer) ? '_' + options.worn[slot].pattern?.replace(/ /g, '_') : '';
          const path = `img/clothes/${slot}/${options.worn[slot].setup.variable}/${prefix}${suffix}${pattern}.png`;
          return Clothes.#gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
        },
      }, overrideOptions));
    }

    static #genlayer_clothing_breasts(slot, overrideOptions) {
      return Clothes.#genlayer_clothing_main(slot, Object.assign({
        masksrcfn(options) {
          const variable = options.worn[slot].setup.variable;
          const integrity = options.worn[slot].integrity;
          if (options.worn[slot].setup.mask_img === 1) return `img/clothes/${slot}/${variable}/mask_${integrity}.png`;
          return null;
        },
        showfn(options) {
          let breastImg = options.worn[slot].setup.breast_img;
          if (typeof breastImg === 'object' && breastImg[options.breast_size] !== null) breastImg = 1;
          return options.show_clothes && options.worn[slot].index > 0 && breastImg === 1;
        },
        srcfn(options) {
          const setup = options.worn[slot].setup;
          const breastImg = setup.breast_img;
          const isAltPosition = !options.alt_override && setup.altposition !== undefined && options.worn[slot].alt === 'alt' && !setup.altdisabled.includes('breasts');
          const breastSize = typeof breastImg === 'object' ? breastImg[options.breast_size] : Math.min(options.breast_size, 6);
          const pattern = options.worn[slot].pattern && !['tertiary', 'secondary'].includes(options.worn[slot].setup.pattern_layer) ? '_' + options.worn[slot].pattern?.replace(/ /g, '_') : '';
          const end = isAltPosition ? '_alt' : '';
          const path = `img/clothes/${slot}/${setup.variable}/${breastSize}${pattern}${end}.png`;
          return Clothes.#gray_suffix(path, options.filters[`worn_${slot}`]);
        },
      }, overrideOptions));
    }

    static #getClothingPathBreastsAcc(slot, options) {
      const breastImg = options.worn[slot].setup.breast_img;
      const breastAccImg = options.worn[slot].setup.breast_acc_img;
      const breastSize = typeof breastAccImg === 'object' ? breastAccImg[options.breast_size] : typeof breastImg === 'object' ? breastImg[options.breast_size] : Math.min(options.breast_size, 6);
      const pattern = options.worn[slot].pattern && options.worn[slot].setup.pattern_layer === 'secondary' ? '_' + options.worn[slot].pattern?.replace(/ /g, '_') : '';
      const path = `img/clothes/${slot}/${options.worn[slot].setup.variable}/${breastSize}_acc${pattern}.png`;
      return Clothes.#gray_suffix(path, options.filters[`worn_${slot}_acc`]);
    }

    static #genlayer_clothing_breasts_acc(slot, overrideOptions) {
      return Clothes.#genlayer_clothing_accessory(slot, Object.assign({
        filters: [`worn_${slot}_acc`],
        srcfn(options) { return Clothes.#getClothingPathBreastsAcc(slot, options); },
        showfn(options) {
          const breastAccImg = options.worn[slot].setup.breast_acc_img;
          const breastImg = options.worn[slot].setup.breast_img;
          let breastAcc = 0;
          if (breastAccImg === 1 && typeof breastImg === 'object' && breastImg[options.breast_size] !== null) breastAcc = 1;
          else if (typeof breastAccImg === 'object' && options.worn[slot].setup.breast_acc_img[options.breast_size] !== null) breastAcc = 1;
          return options.show_clothes && options.worn[slot].index > 0 && breastAcc === 1
        },
      }, overrideOptions));
    }

    static #genlayer_clothing_breasts_detail(slot, overrideOptions) {
      return Clothes.#genlayer_clothing_detail(slot, Object.assign({
        showfn(options) {
          let breastImg = options.worn[slot].setup.breast_acc_img;
          if (typeof breastImg === 'object' && breastImg[options.breast_size] !== null) breastImg = 1;
          return options.show_clothes && options.worn[slot].index > 0 && breastImg === 1 && !!options.worn[slot].pattern && !!options.worn[slot].setup.breast_pattern;
        },
        srcfn(options) {
          const breastImg = options.worn[slot].setup.breast_img;
          const breastAccImg = options.worn[slot].setup.breast_acc_img;
          const breastSize = typeof breastAccImg === 'object' ? breastAccImg[options.breast_size] : typeof breastImg === 'object' ? breastImg[options.breast_size] : Math.min(options.breast_size, 6);
          const pattern = options.worn[slot].pattern ? options.worn[slot].pattern?.replace(/ /g, '_') : '';
          return `img/clothes/${slot}/${options.worn[slot].setup.variable}/${breastSize}_${pattern}.png`;
        },
      }, overrideOptions));
    }

    static #genlayer_clothing_arm(arm, slot, overrideOptions) {
      return Clothes.#genlayer_clothing_basic(slot, Object.assign({
        filtersfn(options) { return Clothes.#filterFnArm(options.worn[slot].setup.sleeve_colour, slot, options); },
        showfn(options) { return options.show_clothes && options.worn[slot].index > 0 && options.worn[slot].setup.sleeve_img === 1 && options[`arm_${arm}`] !== 'none'; },
        srcfn(options) {
          const setup = options.worn[slot].setup;
          const isAltPosition = !options.alt_override && setup.altposition !== undefined && options.worn[slot].alt === 'alt' && !setup.altdisabled.includes('sleeves');
          const isAltSleeve = !options.alt_override && options.alt_sleeve_state && V.worn[slot]?.altsleeve === 'alt'; //  有需要修改
          const cover = options[`arm_${arm}`] === 'cover' ? `${arm}_cover` : arm;
          const alt = isAltPosition ? '_alt' : '';
          const rolled = isAltSleeve ? '_rolled' : '';
          const pattern = setup.sleeve_colour === 'pattern' && options.worn[slot].pattern ? `_${options.worn[slot].pattern?.replace(/ /g, '_')}` : '';
          const path = `img/clothes/${slot}/${setup.variable}/${cover}${alt}${pattern}${rolled}.png`;
          return Clothes.#gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
        },
      }, overrideOptions));
    }

    static #genlayer_clothing_arm_acc(arm, slot, overrideOptions) {
      return Clothes.#genlayer_clothing_basic(slot, Object.assign({
        filtersfn(options) { return Clothes.#filterFnArm(options.worn[slot].setup.accessory_colour_sidebar, slot, options); },
        showfn(options) { return options.worn[slot].index > 0 && options.worn[slot].setup.sleeve_img === 1 && options.worn[slot].setup.sleeve_acc_img === 1 && options[`arm_${arm}`] !== 'none'; },
        srcfn(options) {
          const setup = options.worn[slot].setup;
          const isAltPosition = !options.alt_override && setup.altposition !== undefined && options.worn[slot].alt === 'alt' && !setup.altdisabled.includes('sleeves') && !setup.altdisabled.includes('sleeve_acc');
          let filename = `${arm}_cover_acc`;
          if (options[`arm_${arm}`] !== 'cover') {
            filename = arm;
            filename += (isAltPosition) ? '_alt_acc' : '_acc';
          }
          const path = `img/clothes/${slot}/${setup.variable}/${filename}.png`;
          return Clothes.#gray_suffix(path, options.filters[this.filtersfn(options)[0]]);
        },
      }, overrideOptions));
    }

    static default = {
      worn: (() => {
        const parts = ['head', 'over_head', 'face', 'neck', 'legs', 'feet', 'over_upper', 'upper', 'under_upper', 'over_lower', 'lower', 'under_lower', 'genitals', 'hands'];
        const worn = {};
        parts.forEach(part => {
          worn[part] = {
            index: 0,
            alpha: 1,
            integrity: 'full',
            colour: 'white',
            accColour: 'white',
            pattern: 0,
            setup: { type: [] }
          };
        });
        return worn;
      })(),
      show_clothes: true,
      hood_down: false,
      lower_tucked: false,
      arm_left: 'idle',
			arm_right: 'idle',
    };

    static preprocess(options) {
      options.zupper = NPCSidebar.ZIndices.upper;
			options.zupperleft = NPCSidebar.ZIndices.upper_arms;
			options.zupperright = NPCSidebar.ZIndices.upper_arms;
      if (options.worn.neck.setup.name === 'suspenders' && options.worn.neck.setup.altposition != 'alt' && ['retro shorts', 'retro trousers', 'baseball shorts', 'wide leg trousers'].includes(options.worn.lower.setup.name)) {
        options.high_waist_suspenders = true;
      } else {
        options.high_waist_suspenders = null;
      }
      options.upperMask = [];
      options.legsMask = [];
      options.lowerMask = [];
      if (options.worn.upper.setup.mask_img === 1) {
        options.upperMask.push(Clothes.#gray_suffix(`img/clothes/upper/${options.worn.upper.setup.variable}/${options.worn.upper.integrity}.png`,options.filters['worn_upper']))
      }
      if (options.worn.lower.setup.mask_img === 1) {
        options.lowerMask.push(Clothes.#gray_suffix(`img/clothes/lower/${options.worn.lower.setup.variable}/${options.worn.lower.integrity}.png`,options.filters['worn_lower']))
      }
      if (options.worn.upper.setup.mask_img === 1) {
        options.upperMask.push(Clothes.#gray_suffix(`img/clothes/upper/${options.worn.upper.setup.variable}/${options.worn.upper.integrity}.png`,options.filters['worn_upper']))
      }
      if (options.lower_tucked && !options.worn.lower.setup.notuck && !options.worn.feet.setup.notuck) {
        options.feet_clip_src = `img/clothes/feet/${options.worn.feet.setup.variable}/mask.png`;
        options.lowerMask.push(options.feet_clip_src);
        options.legsMask.push(options.feet_clip_src);
        options.lowerBellyMask.push(options.feet_clip_src);
      } else if (!options.worn.feet.setup.notuck) {
        options.legsMask.push(`img/clothes/feet/${options.worn.feet.setup.variable}/mask.png`)
      } else {
        options.feet_clip_src = null;
      }
    }

    static get Headlayers() {
      return {
        head: Clothes.#genlayer_clothing_main('head', {
          srcfn(options) {
            const dmg = options.worn.head.setup.accessory_integrity_img ? options.worn.upper.integrity : options.worn.head.integrity;
            const pattern = options.worn.head.pattern && !['tertiary', 'secondary'].includes(options.worn.head.setup.pattern_layer) ? '_' + options.worn.head.pattern?.replace(/ /g, '_') : '';
            const path = `img/clothes/head/${options.worn.head.setup.variable}/${dmg}${pattern}.png`;
            return Clothes.#gray_suffix(path, options.filters['worn_head']);
          },
          showfn(options) { return options.show_clothes && options.worn.head.index > 0 && options.worn.head.setup.mainImage !== 0 && !options.hideAll; },
        }),
        head_acc: Clothes.#genlayer_clothing_accessory('head', {
          srcfn(options) {
            const dmg = options.worn.head.setup.accessory_integrity_img ? `_${options.worn.upper.integrity}` : '';
            const pattern = options.worn.head.pattern && options.worn.head.setup.pattern_layer === 'secondary' ? '_' + options.worn.head.pattern?.replace(/ /g, '_') : '';
            const path = `img/clothes/head/${options.worn.head.setup.variable}/acc${dmg}${pattern}.png`;
            return Clothes.#gray_suffix(path, options.filters['worn_head_acc']);
          },
          showfn(options) { return options.show_clothes && options.worn.head.index > 0 && options.worn.head.setup.accImage !== 0 && options.worn.head.setup.accessory === 1 && !options.hideHeadAcc && !options.hideAll; },
        }),
        head_detail: Clothes.#genlayer_clothing_detail('head', {
          showfn(options) { return options.show_clothes && options.worn.head.index > 0 && options.worn.head.setup.mainImage !== 0 && options.worn.head.setup.pattern_layer === 'tertiary' && !!options.worn.head.pattern && !options.hideAll; },
        }),
        head_back_acc: Clothes.#genlayer_clothing_back_img_acc('head'),
        head_back: Clothes.#genlayer_clothing_back_img('head'),
        over_head: Clothes.#genlayer_clothing_main('over_head'),
        over_head_acc: Clothes.#genlayer_clothing_accessory('over_head'),
        over_head_back_acc: Clothes.#genlayer_clothing_back_img_acc('over_head'),
        over_head_back: Clothes.#genlayer_clothing_back_img('over_head'),
      }
    }

    static get Facelayers() {
      return {
        face: Clothes.#genlayer_clothing_main('face', {
          zfn(options) {
            const isAltPosition = !options.alt_override && options.worn.face.setup.altposition !== undefined && options.worn.face.alt === 'alt';
            const check = isAltPosition && (options.worn.face.setup.type.includes('cool') || options.worn.face.setup.type.includes('glasses'));
            if (check) return NPCSidebar.ZIndices.over_head;
            return options.facewear_layer === 'front' ? NPCSidebar.ZIndices.face - 12.5 : NPCSidebar.ZIndices.face;
          },
        }),
        face_acc: Clothes.#genlayer_clothing_accessory('face', {
          zfn(options) {
            const isAltPosition = !options.alt_override && options.worn.face.setup.altposition !== undefined && options.worn.face.alt === 'alt';
            const check = isAltPosition && (options.worn.face.setup.type.includes('cool') || options.worn.face.setup.type.includes('glasses'));
            if (check) return NPCSidebar.ZIndices.over_head;
            return options.facewear_layer === 'front' ? NPCSidebar.ZIndices.face - 12.5 : NPCSidebar.ZIndices.face;
          },
        }),
        face_back_acc: Clothes.#genlayer_clothing_back_img_acc('face'),
        face_back: Clothes.#genlayer_clothing_back_img('face'),
      }
    }

    static get Necklayers() {
      return {
        neck: Clothes.#genlayer_clothing_main('neck', {
          srcfn(options) {
            const isAltPosition = !options.alt_override && options.worn.neck.setup.altposition !== undefined && options.worn.neck.alt === 'alt';
            let collar = '';
            if (options.worn.neck.setup.has_collar === 1 && options.worn.upper.setup.has_collar === 1 && !(options.worn.upper.setup.name === 'dress shirt' && options.worn.upper.alt === 'alt')) {
              collar = '_nocollar';
            } else if (options.worn.neck.setup.name === 'sailor ribbon' && options.worn.upper.setup.name === 'serafuku') {
              collar = '_serafuku';
            }
            const pattern = options.worn.neck.pattern && !['tertiary', 'secondary'].includes(options.worn.neck.pattern_layer) ? '_' + options.worn.neck.pattern?.replace(/ /g, '_') : '';
            const alt = isAltPosition ? '_alt' : '';
            const setupVar = options.worn.neck.setup.variable;
            const integrity = options.worn.neck.integrity;
            const path = `img/clothes/neck/${setupVar}/${integrity}${collar}${pattern}${alt}.png`;
            return Clothes.#gray_suffix(path, options.filters['worn_neck']);
          },
          showfn(options) { return options.show_clothes && options.worn.neck.index > 0 && options.worn.neck.setup.mainImage !== 0 && !options.hideAll; },
          masksrcfn(options) { return options.high_waist_suspenders ? 'img/clothes/neck/suspenders/mask.png' : null; },
          zfn(options) { return options.hood_mask ? NPCSidebar.ZIndices.collar : NPCSidebar.ZIndices.neck; },
        }),
        neck_acc: Clothes.#genlayer_clothing_accessory('neck', {
          srcfn(options) {
            const isAltPosition = !options.alt_override && options.worn.neck.setup.altposition !== undefined && options.worn.neck.alt === 'alt';
            const integrity = setup.accessory_integrity_img ? `_${options.worn.neck.integrity}` : '';
            const alt = isAltPosition ? '_alt' : '';
            const pattern = options.worn.neck?.pattern && options.worn.neck?.pattern_layer === 'secondary' ? '_' + options.worn.neck.pattern?.replace(/ /g, '_') : '';
            const setupVar = options.worn.neck.setup.variable;
            const path = `img/clothes/neck/${setupVar}/acc${integrity}${pattern}${alt}.png`;
            return Clothes.#gray_suffix(path, options.filters['worn_neck_acc']);
          },
          showfn(options) { return options.show_clothes && options.worn.neck.index > 0 && options.worn.neck.setup.accImage !== 0 && options.worn.neck.setup.accessory === 1 && !options.hideLeash; },
          zfn(options) {
            const check = options.worn.head.setup.mask_img === 1 && !(options.hood_down && options.worn.head.setup.hood && options.worn.head.setup.outfitSecondary !== undefined);
            return check ? NPCSidebar.ZIndices.collar : NPCSidebar.ZIndices.neck;
          },
          dyfn(options) { return options.high_waist_suspenders ? -8 : 0; },
        }),
      }
    }

    static get Legslayers() {
      return {
        legs: Clothes.#genlayer_clothing_main('legs', {
          zfn(options) {
            const check = (options.worn.under_lower.setup.set === options.worn.under_upper.setup.set || options.worn.under_lower.setup.high_img === 1) && options.worn.legs.setup.high_img !== 1;
            if (check) return NPCSidebar.ZIndices.legs;
            return NPCSidebar.ZIndices.legs_high;
          },
          masksrcfn(options) { return options.legsMask; },
        }),
        legs_acc: Clothes.#genlayer_clothing_accessory('legs', {
          zfn(options) {
            const check = options.worn.under_lower.setup.set === options.worn.under_upper.setup.set || options.worn.under_lower.setup.high_img === 1;
            if (check) return NPCSidebar.ZIndices.legs;
            return NPCSidebar.ZIndices.legs_high;
          },
          masksrcfn(options) { return options.legsMask; },
        }),
        legs_back_acc: Clothes.#genlayer_clothing_back_img_acc('legs'),
        legs_back: Clothes.#genlayer_clothing_back_img('legs'),
      }
    }

    static get Feetlayers() {
      return {
        feet: Clothes.#genlayer_clothing_main('feet', {
          zfn(options) {
            const check = options.lower_tucked && !options.worn.lower.setup.notuck && !options.worn.feet.setup.notuck;
            if (check) return ZIndices.lower_tucked_feet;
            return NPCSidebar.ZIndices.feet;
          },
        }),
        feet_acc: Clothes.#genlayer_clothing_accessory('feet', {
          zfn(options) {
            const check = options.lower_tucked && !options.worn.lower.setup.notuck && !options.worn.feet.setup.notuck;
            if (check) return ZIndices.lower_tucked_feet;
            return NPCSidebar.ZIndices.feet;
          },
        }),
        feet_details: Clothes.#genlayer_clothing_detail('feet'),
        feet_back_acc: Clothes.#genlayer_clothing_back_img_acc('feet'),
        feet_back: Clothes.#genlayer_clothing_back_img('feet'),
      }
    }

    static get Upperlayers() {
      return {
        over_upper_main: Clothes.#genlayer_clothing_main('over_upper'),
        over_upper_breasts: Clothes.#genlayer_clothing_breasts('over_upper'),
        over_upper_acc: Clothes.#genlayer_clothing_accessory('over_upper'),
        over_upper_detail: Clothes.#genlayer_clothing_detail('over_upper'),
        over_upper_rightarm: Clothes.#genlayer_clothing_arm('right', 'over_upper', {
          zfn(options) { return (options.arm_right === 'cover' || options.arm_right === 'hold') ? NPCSidebar.ZIndices.over_upper_arms_cover : NPCSidebar.ZIndices.over_upper_arms; },
        }),
        over_upper_leftarm: Clothes.#genlayer_clothing_arm('left', 'over_upper', {
          zfn(options) { return options.arm_left === 'cover' ? NPCSidebar.ZIndices.over_upper_arms_cover : NPCSidebar.ZIndices.over_upper_arms; },
        }),
        upper_main: Clothes.#genlayer_clothing_main('upper', {
          zfn(options) { return options.worn.upper.setup.name === 'cocoon' ? NPCSidebar.ZIndices.over_head : options.zupper; },
          masksrcfn(options) { return options.upperMask; },
        }),
        upper_detail: Clothes.#genlayer_clothing_detail('upper', {
          zfn(options) { return options.zupper; },
        }),
        upper_breasts: Clothes.#genlayer_clothing_breasts('upper', {
          zfn(options) { return options.acc_layer_under ? NPCSidebar.ZIndices.upper + 1 : options.zupper; },
        }),
        upper_acc: Clothes.#genlayer_clothing_accessory('upper', {
          zfn(options) { return options.arm_right === 'hold' && options.sleeve_over_hold ? NPCSidebar.ZIndices.lower_high : options.zupper; },
          masksrcfn(options) { return options.upperMask; },
        }),
        upper_breasts_acc: Clothes.#genlayer_clothing_breasts_acc('upper', {
          zfn(options) { return options.zupper; },
        }),
        upper_breasts_detail: Clothes.#genlayer_clothing_breasts_detail('upper', {
          zfn(options) { return options.zupper; },
        }),
        upper_rightarm: Clothes.#genlayer_clothing_arm('right', 'upper', {
          zfn(options) { return options.zupperright; },
        }),
        upper_leftarm: Clothes.#genlayer_clothing_arm('left', 'upper', {
          zfn(options) { return options.zupperleft; },
        }),
        upper_rightarm_acc: Clothes.#genlayer_clothing_arm_acc('right', 'upper', {
          zfn(options) { return options.zupperright; },
        }),
        upper_leftarm_acc: Clothes.#genlayer_clothing_arm_acc('left', 'upper', {
          zfn(options) { return options.zupperleft; },
        }),
        upper_back: Clothes.#genlayer_clothing_back_img('upper', {
          z: NPCSidebar.ZIndices.back_lower
        }),
        under_upper: Clothes.#genlayer_clothing_main('under_upper', {
          masksrcfn(options) { return options.worn.under_upper.setup.formfitting && options.under_upper_fitted_clip_src; }
        }),
        under_upper_breasts: Clothes.#genlayer_clothing_breasts('under_upper'),
        under_upper_acc: Clothes.#genlayer_clothing_accessory('under_upper'),
        under_upper_breasts_acc: Clothes.#genlayer_clothing_breasts_acc('under_upper'),
        under_upper_breasts_detail: Clothes.#genlayer_clothing_breasts_detail('under_upper'),
        under_upper_back: Clothes.#genlayer_clothing_back_img('under_upper'),
        under_upper_rightarm: Clothes.#genlayer_clothing_arm('right', 'under_upper', {
          zfn(options) { return options.arm_right === 'cover' || options.arm_right === 'hold' ? NPCSidebar.ZIndices.under_upper_arms_cover : NPCSidebar.ZIndices.under_upper_arms; },
        }),
        under_upper_leftarm: Clothes.#genlayer_clothing_arm('left', 'under_upper', {
          zfn(options) { return options.arm_left === 'cover' ? NPCSidebar.ZIndices.under_upper_arms_cover : NPCSidebar.ZIndices.under_upper_arms; },
        }),
      }
    }

    static get Lowerlayers() {
      return {
        over_lower: Clothes.#genlayer_clothing_main('over_lower'),
        over_lower_acc: Clothes.#genlayer_clothing_accessory('over_lower'),
        over_lower_detail: Clothes.#genlayer_clothing_detail('over_lower'),
        over_lower_back: Clothes.#genlayer_clothing_back_img('over_lower'),
        lower: Clothes.#genlayer_clothing_main('lower', {
          zfn(options) {
            const secondary = options.worn.lower.setup.type.includes('covered') ? NPCSidebar.ZIndices.lower_cover : NPCSidebar.ZIndices.lower;
            return options.worn.lower.setup.high_img ? NPCSidebar.ZIndices.lower_high : secondary;
          },
          masksrcfn(options) { return options.lowerMask; },
        }),
        lower_breasts: Clothes.#genlayer_clothing_breasts('lower', {
          zfn(options) {
            return options.acc_layer_under ? ZIndices.lower_high + 1 : ZIndices.lower_high;
          },
        }),
        lower_acc: Clothes.#genlayer_clothing_accessory('lower', {
          srcfn(options) {
            const secondary = options.worn.upper.setup.name === 'school blouse' && options.worn.lower.setup.name.includes('pinafore') ? '_under' : '';
            const suffix = options.worn.lower.setup.accessory_integrity_img ? `_${options.worn.lower.integrity}` : secondary;
            const pattern = options.worn.lower.pattern && options.worn.lower.setup.pattern_layer === 'secondary' ? '_' + options.worn.lower.pattern?.replace(/ /g, '_') : '';
            return Clothes.#gray_suffix(`img/clothes/lower/${options.worn.lower.setup.variable}/acc${suffix}${pattern}.png`, options.filters['worn_lower_acc']);
          },
          zfn(options) {
            if (options.worn.lower.setup.name.includes('ballgown') || options.worn.lower.setup.name.includes('pinafore')) return NPCSidebar.ZIndices.upper_top;
            if (options.worn.lower.setup.type.includes('covered')) return NPCSidebar.ZIndices.lower_cover;
            return NPCSidebar.ZIndices.lower;
          },
          masksrcfn(options) { return options.lowerMask; },
        }),
        lower_detail: Clothes.#genlayer_clothing_detail('lower', {
          z: NPCSidebar.ZIndices.lower,
          masksrcfn(options) { return options.lowerMask; },
        }),
        lower_breasts_acc: Clothes.#genlayer_clothing_breasts_acc('lower', {
          zfn(options) { return options.acc_layer_under ? NPCSidebar.ZIndices.lower_high + 1 : NPCSidebar.ZIndices.lower_high; },
        }),
        lower_penis: {
          z: NPCSidebar.ZIndices.lower_top,
          filters: ['worn_lower'],
          animation: 'idle',
          srcfn(options) {
            return Clothes.#gray_suffix(`img/clothes/lower/${options.worn.lower.setup.variable}/penis.png`,options.filters['worn_lower']);
          },
          showfn(options) {// calculatePenisBulge() - 6 > 0 改为用npc的
            return options.show_clothes && options.worn.lower.index > 0 && options.worn.lower.setup.penis_img === 1 && modelShow(options);
          },
        },
        lower_penis_acc: {
          z: NPCSidebar.ZIndices.lower_top,
          filters: ['worn_lower_acc'],
          animation: 'idle',
          srcfn(options) {
            return Clothes.#gray_suffix(`img/clothes/lower/${options.worn.lower.setup.variable}/acc_penis.png`,options.filters['worn_lower_acc']);
          },
          showfn(options) {// calculatePenisBulge() - 6 > 0 改为用npc的
            return options.show_clothes && options.worn.lower.index > 0 && options.worn.lower.setup.penis_acc_img === 1 && options.worn.lower.setup.accessory === 1 && modelShow(options);
          },
        },
        lower_back: Clothes.#genlayer_clothing_back_img('lower', {
          z: NPCSidebar.ZIndices.back_lower
        }),
        under_lower: Clothes.#genlayer_clothing_main('under_lower', {
          zfn(options) {
            return options.worn.lower.setup.high_img ? NPCSidebar.ZIndices.under_lower_high : NPCSidebar.ZIndices.under_lower;
          },
        }),
        under_lower_acc: Clothes.#genlayer_clothing_accessory('under_lower'),
        under_lower_detail: Clothes.#genlayer_clothing_detail('under_lower'),
        under_lower_penis: {
          z: NPCSidebar.ZIndices.under_lower_top,
          filters: ['worn_under_lower'],
          animation: 'idle',
          srcfn(options) {
            return Clothes.#gray_suffix(`img/clothes/under_lower/${options.worn.under_lower.setup.variable}/penis.png`,options.filters['worn_under_lower']);
          },
          showfn(options) {// calculatePenisBulge() > 0 改为用npc的
            return options.show_clothes && options.worn.under_lower.index > 0 && options.worn.under_lower.setup.penis_img === 1 && modelShow(options);
          },
        },
        under_lower_penis_acc: {
          z: NPCSidebar.ZIndices.under_lower_top,
          filters: ['worn_under_lower_acc'],
          animation: 'idle',
          srcfn(options) {
            return Clothes.#gray_suffix(`img/clothes/under_lower/${options.worn.under_lower.setup.variable}/acc_penis.png`,options.filters['worn_under_lower_acc']);
          },
          showfn(options) {// calculatePenisBulge() > 0 改为用npc的
            return options.show_clothes && options.worn.under_lower.index > 0 && options.worn.under_lower.setup.penis_acc_img === 1 && options.worn.under_lower.setup.accessory === 1 && modelShow(options);
          },
        },
      }
    }

    static get Genitalslayers() {
      return {
        genitals: Clothes.#genlayer_clothing_main('genitals', {
          zfn(options) { return options.crotch_exposed ? NPCSidebar.ZIndices.penis_chastity + 0.1 : NPCSidebar.ZIndices.penisunderclothes + 0.1; },
          showfn(options) {
            return options.worn.genitals.index > 0 && options.worn.genitals.setup.mainImage !== 0 && !options.worn.genitals.setup.hideUnderLower.includes(options.worn.under_lower.setup.name);
          },
          srcfn(options) {
            let size = '';
            if (options.worn.genitals.setup.penisSize) {
              switch (options.penis_size) {
                case 0: size = 0; break;
                case 1: case 2: size = 1; break;
                case 3: case 4: size = 2; break;
              }
            }
            const setupVar = options.worn.genitals.setup.variable;
            const integrity = options.worn.genitals.integrity;
            return `img/clothes/genitals/${setupVar}/${integrity}${size}.png`;
          },
        }),
        buttplug: {
          z: NPCSidebar.ZIndices.backhair,
          animation: 'idle',
          showfn(options) {
            return //playerHasButtPlug() && V.worn.butt_plug.name.includes('tail') && !options.mannequin && modelShow(options);
          },
          srcfn() {
            return //`img/clothes/back/${V.worn.butt_plug.name}/back.png` && modelShow(options); },
          },
        }
      }
    }

    static get Handlayers() {
      return {
        hands: Clothes.#genlayer_clothing_main('hands'),
        hands_left: {
          filters: ['worn_hands'],
          animation: 'idle',
          srcfn(options) {
            const suffix = options.arm_left === 'cover' ? 'left_cover' : 'left';
            const pattern = options.worn.hands.pattern && !['tertiary', 'secondary'].includes(options.worn.hands.setup.pattern_layer) ? '_' + options.worn.hands.pattern?.replace(/ /g, '_') : '';
            const path = `img/clothes/hands/${options.worn.hands.setup.variable}/${suffix}${pattern}.png`;
            return Clothes.#gray_suffix(path, options.filters['worn_hands']);
          },
          showfn(options) {
            return options.show_clothes && options.worn.hands.index > 0 && options.worn.hands.setup.leftImage === 1 && options.arm_left !== 'none' && modelShow(options);
          },
          zfn(options) {
            return options.arm_left === 'cover' ? NPCSidebar.ZIndices.hands : options.zarms + 0.2;
          },
        },
        hands_left_acc: {
          filters: ['worn_hands_acc'],
          animation: 'idle',
          srcfn(options) {
            const suffix = options.arm_left === 'cover' ? 'left_cover' : 'left';
            const pattern = options.worn.hands.pattern && options.worn.hands.setup.pattern_layer === 'secondary' ? '_' + options.worn.hands.pattern?.replace(/ /g, '_') : '';
            const path = `img/clothes/hands/${options.worn.hands.setup.variable}/${suffix}${pattern}_acc.png`;
            return Clothes.#gray_suffix(path, options.filters['worn_hands_acc']);
          },
          showfn(options) {
            return options.show_clothes && options.worn.hands.index > 0 && options.worn.hands.setup.leftImage === 1 && options.worn.hands.setup.accessory === 1 && options.arm_left !== 'none' && modelShow(options);
          },
          zfn(options) { return options.arm_left === 'cover' ? NPCSidebar.ZIndices.hands : options.zarms + 0.2; },
        },
        hands_left_detail: {
          animation: 'idle',
          srcfn(options) {
            const suffix = options.arm_right === 'cover' ? 'right_cover' : 'right';
            return `img/clothes/hands/${options.worn.hands.setup.variable}/${suffix}_${options.worn.hands.pattern}.png`;
          },
          showfn(options) {
            return options.show_clothes && options.worn.hands.index > 0 && options.worn.hands.setup.leftImage === 1 && options.worn.hands.setup.pattern_layer === 'tertiary' && !!options.worn.hands.setup.pattern && options.arm_right !== 'none' && modelShow(options);
          },
          zfn(options) {
            return (options.arm_right === 'cover' || options.arm_right === 'hold') ? NPCSidebar.ZIndices.hands : options.zarms + 0.2;
          },
        },
        hands_right: {
          filters: ['worn_hands'],
          animation: 'idle',
          srcfn(options) {
            const suffix = options.arm_right === 'cover' ? 'right_cover' : 'right';
            const pattern = options.worn.hands.pattern && !['tertiary', 'secondary'].includes(options.worn.hands.setup.pattern_layer) ? '_' + options.worn.hands.pattern?.replace(/ /g, '_') : '';
            const path = `img/clothes/hands/${options.worn.hands.setup.variable}/${suffix}${pattern}.png`;
            return Clothes.#gray_suffix(path, options.filters['worn_hands']);
          },
          showfn(options) {
            return options.show_clothes && options.worn.hands.index > 0 && options.worn.hands.setup.rightImage === 1 && options.arm_right !== 'none' && modelShow(options);
          },
          zfn(options) {
            return (options.arm_right === 'cover' || options.arm_right === 'hold') ? NPCSidebar.ZIndices.hands : options.zarms + 0.2;
          },
        },
        hands_right_acc: {
          filters: ['worn_hands_acc'],
          animation: 'idle',
          srcfn(options) {
            const suffix = options.arm_right === 'cover' ? 'right_cover' : 'right';
            const pattern = options.worn.hands.pattern && options.worn.hands.setup.pattern_layer === 'secondary' ? '_' + options.worn.hands.pattern?.replace(/ /g, '_') : '';
            const path = `img/clothes/hands/${options.worn.hands.setup.variable}/${suffix}${pattern}_acc.png`;
            return Clothes.#gray_suffix(path, options.filters['worn_hands_acc']);
          },
          showfn(options) {
            return options.show_clothes && options.worn.hands.index > 0 && options.worn.hands.setup.rightImage === 1 && options.worn.hands.setup.accessory === 1 && options.arm_right !== 'none' && modelShow(options);
          },
          zfn(options) {
            return (options.arm_right === 'cover' || options.arm_right === 'hold') ? NPCSidebar.ZIndices.hands : options.zarms + 0.2;
          },
        },
        hands_right_detail: {
          animation: 'idle',
          srcfn(options) {
            const suffix = options.arm_right === 'cover' ? 'right_cover' : 'right';
            return `img/clothes/hands/${options.worn.hands.setup.variable}/${suffix}_${options.worn.hands.pattern}.png`;
          },
          showfn(options) {
            return options.show_clothes && options.worn.hands.index > 0 && options.worn.hands.setup.rightImage === 1 && options.worn.hands.setup.pattern_layer === 'tertiary' && !!options.worn.hands.setup.pattern && options.arm_right !== 'none' && modelShow(options);
          },
          zfn(options) {
            return (options.arm_right === 'cover' || options.arm_right === 'hold') ? NPCSidebar.ZIndices.hands : options.zarms + 0.2;
          },
        },
      }
    }

    static get layers() {
      return {
        ...Clothes.Headlayers,
        ...Clothes.Facelayers,
        ...Clothes.Necklayers,
        ...Clothes.Legslayers,
        ...Clothes.Feetlayers,
        ...Clothes.Upperlayers,
        ...Clothes.Lowerlayers,
        ...Clothes.Genitalslayers,
        ...Clothes.Handlayers,
      }
    }
  }

  class DripBody {
    static default = {
      drip_vaginal: '',
      drip_anal: '',
			drip_mouth: '',
      cum_chest: '',
			cum_face: '',
			cum_feet: '',
			cum_leftarm: '',
			cum_rightarm: '',
			cum_neck: '',
			cum_thigh: '',
			cum_tummy: '',
    }

    static preprocess(options) {

    }

    static get layers() {
      return {
        drip_vaginal: {
          srcfn(options) { return `img/body/cum/VaginalCumDrip${options.drip_vaginal}.png`; },
          showfn(options) { return !!options.drip_vaginal && modelShow(options); },
          z: NPCSidebar.ZIndices.tears,
          animationfn(options) { return `VaginalCumDrip${options.drip_vaginal}`; },
        },
        drip_anal: {
          srcfn(options) { return `img/body/cum/AnalCumDrip${options.drip_anal}.png`; },
          showfn(options) { return !!options.drip_anal && modelShow(options); },
          z: NPCSidebar.ZIndices.tears,
          animationfn(options) { return `AnalCumDrip${options.drip_anal}`; },
        },
        drip_mouth: {
          srcfn(options) { return `img/body/cum/MouthCumDrip${options.drip_mouth}.png`; },
          showfn(options) { return options.show_face && !!options.drip_mouth && !options.worn.face.setup.type.includesAny('mask', 'covered') && modelShow(options); },
          z: NPCSidebar.ZIndices.semencough,
          dxfn(options) { return options.facestyle === 'small-eyes' ? 2 : 0; },
          animationfn(options) { return `MouthCumDrip${options.drip_mouth}`; },
        },
        cum_chest: {
          srcfn(options) { return `img/body/cum/Chest ${options.cum_chest}.png`; },
          showfn(options) { return !!options.cum_chest && modelShow(options); },
          z: NPCSidebar.ZIndices.tears,
          animation: 'idle',
        },
        cum_face: {
          srcfn(options) { return `img/body/cum/Face ${options.cum_face}.png`; },
          showfn(options) { return options.show_face && !!options.cum_face && modelShow(options); },
          z: NPCSidebar.ZIndices.tears,
          animation: 'idle',
        },
        cum_feet: {
          srcfn(options) { return `img/body/cum/Feet ${options.cum_feet}.png`; },
          showfn(options) { return !!options.cum_feet && modelShow(options); },
          z: NPCSidebar.ZIndices.tears,
          animation: 'idle',
        },
        cum_leftarm: {
          srcfn(options) { return `img/body/cum/Left Arm ${options.cum_leftarm}.png`; },
          showfn(options) { return options.arm_left !== 'none' && options.arm_left != 'cover' && !!options.cum_leftarm && modelShow(options); },
          zfn(options) { return (options.arm_right === 'cover') ? NPCSidebar.ZIndices.arms_cover + 0.05 : options.zarms + 0.05; },
          animation: 'idle',
        },
        cum_rightarm: {
          srcfn(options) { return `img/body/cum/Right Arm ${options.cum_rightarm}.png`; },
          showfn(options) { return options.arm_right !== 'none' && options.arm_right != 'cover' && options.arm_right != 'hold' && !!options.cum_rightarm && modelShow(options); },
          zfn(options) { return (options.arm_right === 'cover' || options.arm_right === 'hold') ? NPCSidebar.ZIndices.arms_cover + 0.05 : options.zarms + 0.05; },
          animation: 'idle',
        },
        cum_neck: {
          srcfn(options) { return `img/body/cum/Neck ${options.cum_neck}.png`; },
          showfn(options) { return !!options.cum_neck && modelShow(options); },
          z: NPCSidebar.ZIndices.tears,
          animation: 'idle',
        },
        cum_thigh: {
          srcfn(options) { return `img/body/cum/Thighs ${options.cum_thigh}.png`; },
          showfn(options) { return !!options.cum_thigh && modelShow(options); },
          z: NPCSidebar.ZIndices.tears,
          animation: 'idle',
        },
        cum_tummy: {
          srcfn(options) { return `img/body/cum/Tummy ${options.cum_tummy}.png`; },
          showfn(options) { return !!options.cum_tummy && modelShow(options); },
          z: NPCSidebar.ZIndices.tears,
          animation: 'idle',
        },
      }
    }
  }

  class NPCSidebar {
    static set ZIndices(value) {
      this.baseZIndices ??= {};
      this.baseZIndices = value;
    }

    static get ZIndices() {
      return this.baseZIndices;
    }

    static generatedOptions() {
      return [
        'zarms',
        'blink_animation'
      ];
    }

    static defaultOptions() {
      return {
        show_nnpc: false,
        canvas_mode: false,
        ...BaseBody.default,
        ...FaceBody.default,
        ...HairBody.default,
        ...Clothes.default,
        ...DripBody.default,
      }
    }

    static preprocess(options) {
      if (V.options.maplebirch.npcsidebar.show) options.show_nnpc = true;
      if (V.options.maplebirch.npcsidebar.model) options.canvas_mode = true;
      BaseBody.preprocess(options);
      FaceBody.preprocess(options);
      HairBody.preprocess(options);
      Clothes.preprocess(options);
      DripBody.preprocess(options);
    }

    static postprocess(options) {
      
    }

    constructor(manager) {
      this.manager = manager;
      this.display = {};
      maplebirch.once(':definewidget', () => this.init(true));
    }

    init(model=false) {
      Object.keys(this.display).forEach(npcName => { if (!new Set(this.manager.NPCNameList).has(npcName)) delete this.display[npcName]; });
      this.manager.NPCNameList.forEach(npcName => { if (!this.display[npcName] || !(this.display[npcName] instanceof Set)) this.display[npcName] = new Set(); });
      if (model) {
        NPCSidebar.ZIndices = ZIndices;
        Renderer.CanvasModels.npcmodel = this.canvasModel;
      }
    }

    get canvasModel() {
      return {
        name: 'npc-model',
        width: 256,
        height: 256,
        frames: 2,
        scale: true,
        generatedOptions: () => NPCSidebar.generatedOptions(),
        defaultOptions: () => NPCSidebar.defaultOptions(),
        preprocess: (options) => NPCSidebar.preprocess(options),
        postprocess: (options) => NPCSidebar.postprocess(options),

        layers: {
          nnpc: {
            srcfn() {
              if (V.NPCList[0].fullDescription && setup.NPCNameList.includes(V.NPCList[0].fullDescription)) {
                if (V.options?.maplebirch?.npcsidebar?.display[V.NPCList[0].fullDescription] === 'none') return;
                return `img/ui/nnpc/${V.NPCList[0].fullDescription.toLowerCase()}/${V.options?.maplebirch?.npcsidebar?.display[V.NPCList[0].fullDescription]}.png`;
              }
            },
            showfn(options) {
              return !!options.show_nnpc && !options.canvas_mode;
            },
            z: 0,
            animation: 'idle'
          },
          ...BaseBody.layers,
          ...FaceBody.layers,
          ...HairBody.layers,
          ...Clothes.layers,
          ...DripBody.layers,
        }
      }
    }
  }

  maplebirch.once(':npc-init', (data) => {
    Object.assign(data, {Sidebar: new NPCSidebar(data)});
    Object.assign(data.constructor, NPCSidebar);
  });
})();

/*
function calculatePenisBulge() {
	if (V.worn.under_lower.type.includes('strap-on')) return (V.worn.under_lower.size || 0) * 3;
	const compressed = V.player.penisExist && V.worn.genitals.type.includes('hidden');
	if (!V.player.penisExist || compressed) return 0;

	if (V.worn.genitals.type.includes('cage')) {
		return Math.clamp(V.player.penissize, 0, Infinity);
	}
	// Mentioned in combat about npcs `trying to force an erection`, when below the specific arousal checks
	if ((V.arousal > 9000 && V.player.penissize === -1) || (V.arousal > 9500 && V.player.penissize === -2)) return 1;

	let erectionState = 1;
	if (V.arousal >= 8000) {
		erectionState = 3;
	} else if (V.arousal >= 6000) {
		erectionState = 2;
	}
	return Math.clamp((V.player.penissize + 1) * erectionState, 0, Infinity);
}
window.calculatePenisBulge = calculatePenisBulge;

function playerHasButtPlug() {
	return V.worn.butt_plug != null && V.worn.butt_plug.state === 'worn' && V.worn.butt_plug.worn;
	// V.worn.butt_plug.worn is just as a safeguard for now
}
window.playerHasButtPlug = playerHasButtPlug;
*/