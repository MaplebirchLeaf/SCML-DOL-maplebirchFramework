// types/npcsidebar-layers.d.ts

interface Position {
  x?: number;
  y?: number;
}

interface Filters {
  nnpc_tan?: any;
  nnpc_eyes?: any;
  nnpc_brows?: any;
  nnpc_hair?: any;
  nnpc_head?: any;
  nnpc_head_acc?: any;
  nnpc_neck?: any;
  nnpc_neck_acc?: any;
  nnpc_lower?: any;
  nnpc_lower_acc?: any;
  nnpc_under_lower?: any;
  nnpc_under_lower_acc?: any;
  nnpc_handheld?: any;
  nnpc_handheld_acc?: any;
  [key: string]: any;
}

interface ClothesGenitals {
  name: string;
  type?: string | string[];
  penisSize?: number;
  variable?: string;
  integrity?: string;
  mainImage?: number;
  hideUnderLower?: string[];
}

interface ClothesUnderLower {
  name: string;
  type: string | string[];
  state: string;
  size?: number;
  exposed?: number;
  notuck?: boolean;
  penis_img?: number;
  penis_acc_img?: number;
  accessory?: number;
  variable?: string;
  integrity?: string;
  accessory_integrity_img?: number;
  set?: any;
  high_img?: number;
}

interface ClothesUpper {
  index?: number;
  type?: string | string[];
  exposed?: number;
  notuck?: boolean;
  sleeve_img?: number;
  variable?: string;
  altposition?: string;
  mask_img?: number;
  mask_img_ponytail?: number;
  integrity?: string;
  accessory_integrity_img?: number;
  outfitPrimary?: any;
  name?: string;
  has_collar?: number;
  hoodposition?: string;
}

interface ClothesLower {
  type?: string | string[];
  exposed?: number;
  notuck?: boolean;
  name?: string;
  variable?: string;
  mask_img?: number;
  integrity?: string;
  accessory_integrity_img?: number;
  high_img?: any;
  penis_img?: number;
  penis_acc_img?: number;
  accessory?: number;
  pattern?: string;
  pattern_layer?: string;
}

interface ClothesFeet {
  type?: string | string[];
  notuck?: boolean;
  variable?: string;
  mask_img?: number;
  name?: string;
}

interface ClothesHead {
  name?: string;
  type?: string | string[];
  mask_img?: number;
  hood?: boolean;
  outfitSecondary?: any;
  head_type?: string;
  variable?: string;
  accessory_integrity_img?: number;
  pattern?: string;
  pattern_layer?: string;
  integrity?: string;
  mainImage?: number;
  accImage?: number;
  accessory?: number;
  mask_img_ponytail?: number;
}

interface ClothesFace {
  type?: string | string[];
  variable?: string;
  integrity?: string;
  mainImage?: number;
  accImage?: number;
  accessory?: number;
  pattern?: string;
  pattern_layer?: string;
}

interface ClothesNeck {
  name?: string;
  type?: string | string[];
  altposition?: string;
  has_collar?: number;
  variable?: string;
  pattern?: string;
  pattern_layer?: string;
  integrity?: string;
  accessory_integrity_img?: number;
  mainImage?: number;
  accImage?: number;
  accessory?: number;
}

interface ClothesOverHead {
  mask_img?: number;
  variable?: string;
  accessory_integrity_img?: number;
}

interface ClothesOverUpper {
  index?: number;
  variable?: string;
  accessory_integrity_img?: number;
  name?: string;
}

interface ClothesOverLower {
  index?: number;
  accessory_integrity_img?: number;
  name?: string;
}

interface ClothesHandheld {
  name: string;
  type?: string | string[];
  holdPosition?: string;
  size?: number;
  variable?: string;
  colour?: string;
  index?: number;
  leftImage?: number;
  rightImage?: number;
  accessory?: number;
}

interface ClothesUnderUpper {
  sleeve_img?: number;
  type?: string | string[];
  exposed?: number;
  notuck?: boolean;
  index?: number;
  set?: any;
}

interface ClothesLegs {
  name?: string;
  notuck?: boolean;
  high_img?: number;
}

interface ClothesHands {
  name?: string;
}

interface Clothes {
  genitals?: ClothesGenitals;
  under_lower?: ClothesUnderLower;
  upper?: ClothesUpper;
  lower?: ClothesLower;
  feet?: ClothesFeet;
  head?: ClothesHead;
  face?: ClothesFace;
  neck?: ClothesNeck;
  over_head?: ClothesOverHead;
  over_upper?: ClothesOverUpper;
  over_lower?: ClothesOverLower;
  handheld?: ClothesHandheld;
  under_upper?: ClothesUnderUpper;
  legs?: ClothesLegs;
  hands?: ClothesHands;
  [key: string]: any;
}

interface NNPC {
  model?: boolean;
  close_up_mask?: any;
  show?: boolean;
  position?: number;
  dxfn?: number;
  dyfn?: number;
  name?: string;
  breasts?: string;
  breast_size?: number;
  arm_left?: string;
  arm_right?: string;
  zarms?: number;
  genitals_chastity?: boolean;
  clothes?: Clothes;
  penis?: string | false;
  penis_size?: number;
  crotch_visible?: boolean;
  crotch_exposed?: boolean;
  facestyle?: string;
  facevariant?: string;
  freckles?: boolean;
  ears_position?: string;
  hair_sides_type?: string;
  hair_length?: string;
  hair_fringe_type?: string;
  hair_position?: string;
  head_mask?: any[];
  face?: string;
  neck?: string;
  upper?: string;
  lower?: string;
  legs?: string;
  feet?: string;
  hands?: string;
  eye_colour?: string;
  hair_colour?: string;
  skin_type?: string;
  tan?: number;
  calculate_penis_bulge?: (nnpc: any) => number;
  alt_sleeve_state?: boolean | null;
  high_waist_suspenders?: boolean | null;
  hood_mask?: boolean | null;
  upper_mask?: any[];
  lower_mask?: any[];
  legs_mask?: any[];
  handheld_position?: string | null;
  handheld_overhead?: boolean | null;
  handheld_animation?: string;
  hide_all?: boolean;
  hide_leash?: boolean;
  hide_head_acc?: boolean;
  tucked?: [boolean, boolean];
  zupper?: number;
  zupperleft?: number;
  zupperright?: number;
  upper_tucked?: boolean;
  lower_tucked?: boolean;
  feet_clip_src?: string | null;
  [key: string]: any;
}

interface CharZIndices {
  base: number;
  basehead: number;
  head: number;
  face: number;
  neck: number;
  collar: number;
  back_lower: number;
  under_upper: number;
  lower_cover: number;
  lower_high: number;
  lower_top: number;
  under_lower_high: number;
  under_lower_top: number;
  upper_top: number;
  hands: number;
  over_head_back: number;
  legs: number;
  legs_high: number;
  lower_tucked_feet: number;
  feet: number;
  breasts: number;
  arms_cover: number;
  penisunderclothes: number;
  penis_chastity: number;
  penis: number;
  freckles: number;
  ears: number;
  eyes: number;
  sclera: number;
  iris: number;
  eyelids: number;
  lashes: number;
  brow: number;
  mouth: number;
  hairforwards: number;
  backhair: number;
  fronthair: number;
  under_upper_arms: number;
  upper_arms: number;
  upper_arms_tucked: number;
  upper: number;
  upper_tucked: number;
  [key: string]: number;
}

interface Char {
  ZIndices: CharZIndices;
  mask: (maskType: any) => any;
}

interface NPCClothesLayers {
  key?: string;
  body?: string;
  head?: {
    img?: string;
    zIndex?: number;
    accessory_integrity_img?: number;
  };
  [key: string]: any;
}

interface NPC {
  Clothes: {
    layers: Map<string, NPCClothesLayers>;
  };
}

export interface LayerOptions {
  maplebirch: {
    nnpc: NNPC;
    char: Char;
    npc: NPC;
  };
  blink?: boolean;
  hair_sides_length?: string;
  filters?: Filters;
  [key: string]: any;
}