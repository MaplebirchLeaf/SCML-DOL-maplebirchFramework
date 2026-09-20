// ./src/modules/NamedNPCAddon/NPCSidebarConfig/types.ts

import type { NPCData } from '../../NamedNPC';
import type { transformationDefaults } from './transformation_layers';

export type NPCBodyData = Pick<
  NPCData,
  | 'penis'
  | 'vagina'
  | 'virginity'
  | 'hair_side_type'
  | 'hair_fringe_type'
  | 'hair_position'
  | 'hair_sides_length'
  | 'hair_fringe_length'
  | 'eyeColour'
  | 'hairColour'
  | 'penissize'
  | 'breastsize'
  | 'ballssize'
>;

export type NPCClothesSlot =
  | 'head'
  | 'face'
  | 'neck'
  | 'upper'
  | 'lower'
  | 'feet'
  | 'legs'
  | 'handheld'
  | 'genitals'
  | 'under_upper'
  | 'under_lower'
  | 'over_head'
  | 'over_upper'
  | 'over_lower'
  | 'hands';

export interface NPCSidebarClothing {
  index: number;
  name: string;
  variable: string;
  type: string[];
  integrity: string;
  setup?: NPCSidebarClothing;
  alpha?: number;
  alt?: string;
  altposition?: string;
  altdisabled?: string[];
  altsleeve?: string;
  state?: string;
  state_top?: string;
  colour?: string;
  colourCustom?: string;
  accessory_colour?: string;
  accessory_colourCustom?: string;
  accessory_colour_sidebar?: string;
  accessory?: number;
  accessory_integrity_img?: number;
  mainImage?: number;
  accImage?: number;
  leftImage?: number;
  rightImage?: number;
  coverImage?: number;
  coverBackImage?: number;
  back_img?: number;
  back_img_acc?: number;
  back_img_colour?: string;
  back_img_acc_colour?: string;
  back_integrity_img?: number;
  breast_img?: number | Record<number, number>;
  breast_acc_img?: number | Record<number, number>;
  breast_pattern?: number;
  sleeve_img?: number;
  sleeve_acc_img?: number;
  sleeve_colour?: string;
  penis_img?: number;
  penis_acc_img?: number;
  mask_img?: number;
  pattern?: string;
  pattern_layer?: string;
  holdPosition?: string;
  hoodposition?: string;
  hood?: number;
  has_collar?: number;
  high_img?: number;
  notuck?: number;
  outfitPrimary?: Partial<Record<NPCClothesSlot, string>>;
  outfitSecondary?: string[];
  set?: string;
  zIndex?: string | number;
}

export interface NPCSidebarState extends Partial<typeof transformationDefaults> {
  name: string;
  show: boolean;
  model: boolean;
  position: number;
  dxfn: number;
  dyfn: number;
  tan: number;
  skin_type: string;
  freckles: boolean;
  facestyle: string;
  facevariant: string;
  ears_position: string;
  close_up_mask: string;
  hide_all: boolean;
  hide_head_acc: boolean;
  hide_leash: boolean;
  hood_down: boolean;
  show_hair: boolean;
  clothes: Record<NPCClothesSlot, NPCSidebarClothing>;
  bodydata: NPCBodyData;
  tf_filters?: Record<string, CanvasLayerFilter>;
  head_mask: string[];
  upper_mask: string[];
  lower_mask: string[];
  legs_mask: string[];
  feet_mask: string[];
  fringe_mask_src: string | null;
  feet_clip_src: string | null;
  upper_tucked: boolean;
  lower_tucked: boolean;
  crotch_visible: boolean;
  crotch_exposed: boolean;
  arm_left: string;
  arm_right: string;
  handheld_position: string | null;
  handheld_animation: string;
  handheld_overhead: boolean | null;
  alt_sleeve_state: boolean | null;
  high_waist_suspenders: boolean | null;
  hood_mask: boolean | null;
  zarms: number;
  zupper: number;
  zupperleft: number;
  zupperright: number;
  lust: number;
  breasts: string;
  breast_size: number;
  penis: string | false;
  penis_size: number;
  balls: boolean;
  genitals_chastity: boolean;
  eye_colour: string;
  hair_colour: string;
  hair_sides_type: string;
  hair_fringe_type: string;
  hair_position: string;
  hair_sides_position: string;
  hair_sides_length: string;
  hair_fringe_length: string;
  drip_mouth: string;
  calculate_penis_bulge(target?: NPCSidebarState): number;
  [key: string]: unknown;
}

export interface NPCSidebarOptions {
  filters?: Record<string, CanvasLayerFilter>;
  blink?: boolean;
  maplebirch: {
    nnpc: NPCSidebarState;
    previous?: NPCSidebarState;
  };
}
