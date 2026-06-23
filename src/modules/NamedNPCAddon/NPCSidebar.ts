// ./src/modules/NamedNPCAddon/NPCSidebar.ts

import type { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';
import maplebirch from '../../core';
import { lookupColour, clothes_layer } from './NPCSidebarConfig/functions';
import base_layers from './NPCSidebarConfig/base_layers';
import fluids_layers from './NPCSidebarConfig/fluids_layers';
import head_layers from './NPCSidebarConfig/head_layers';
import face_layers from './NPCSidebarConfig/face_layers';
import neck_layers from './NPCSidebarConfig/neck_layers';
import upper_layers from './NPCSidebarConfig/upper_layers';
import lower_layers from './NPCSidebarConfig/lower_layers';
import hands_layers from './NPCSidebarConfig/hands_layers';
import handheld_layers from './NPCSidebarConfig/handheld_layers';
import legs_layers from './NPCSidebarConfig/legs_layers';
import feet_layers from './NPCSidebarConfig/feet_layers';
import transformation_layers, { transformationDefaults } from './NPCSidebarConfig/transformation_layers';
import NPCFluids from './NPCFluids';
import type NPCManager from '../NamedNPC';

type NPCSidebarOptions = {
  filters?: Record<string, any>;
  maplebirch?: {
    nnpc?: Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
};

type ClothesSlot = 'head' | 'face' | 'neck' | 'upper' | 'lower' | 'feet' | 'legs' | 'handheld' | 'genitals' | 'under_upper' | 'under_lower' | 'over_head' | 'over_upper' | 'over_lower' | 'hands';

const display = new Map<string, Set<string>>();
const imageFormats = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);

// prettier-ignore
const clothesSlots: ClothesSlot[] = [
  'head', 'face', 'neck', 'upper', 'lower', 'feet', 'legs', 'handheld',
  'genitals', 'under_upper', 'under_lower', 'over_head', 'over_upper', 'over_lower', 'hands'
];

const hairLengthList = ['short', 'shoulder', 'chest', 'navel', 'thighs', 'feet'] as const;
const upperCombatSlots: ClothesSlot[] = ['over_upper', 'upper', 'under_upper'];
const lowerCombatSlots: ClothesSlot[] = ['over_lower', 'lower', 'under_lower'];

function loadFromMod(modZip: ModZipReader, npcNames: string[]) {
  if (!modZip || !Array.isArray(npcNames) || npcNames.length === 0) return [];
  const paths: string[] = [];
  for (const name of npcNames) {
    const npcName = name.convert('title');
    if (!display.has(npcName)) display.set(npcName, new Set());
    const npcSet = display.get(npcName)!;
    const folder = `img/ui/nnpc/${npcName.toLowerCase()}/`;
    for (const filePath in modZip.zip.files) {
      if (!filePath.startsWith(folder) || filePath === folder) continue;
      const ext = filePath.split('.').pop()?.toLowerCase();
      if (!ext || !imageFormats.has(ext)) continue;
      const fileName = filePath.split('/').pop();
      const imgName = fileName?.split('.')[0];
      if (!imgName) continue;
      npcSet.add(imgName);
      paths.push(filePath);
    }
  }
  return paths;
}

function clothesIndex(slot: ClothesSlot, clothes: any) {
  const fn = window.clothesIndex;
  if (typeof fn === 'function') return fn(slot, clothes);
  return clothes?.index ?? 0;
}

function Integrity(clothes: any, slot: ClothesSlot) {
  const fn = window.integrityKeyword;
  if (typeof fn === 'function') {
    try {
      return fn(clothes, slot);
    } catch {
      return clothes.integrity ?? 'full';
    }
  }
  return clothes.integrity ?? 'full';
}

function defaultClothes() {
  return clothesSlots.reduce(
    (result, slot) => {
      result[slot] = { index: 0, name: '', type: [] };
      return result;
    },
    {} as Record<ClothesSlot, any>
  );
}

function NPCClothes(npcData: any, options: NPCSidebarOptions) {
  const filters = options.filters!;
  const clothesData = {
    ...defaultClothes(),
    ...npcData?.clothes
  };

  const clothes = {} as Record<ClothesSlot, any>;

  for (const slot of clothesSlots) {
    const data = clothesData[slot] ?? {};
    const index = data.index ?? 0;
    const setupData = setup.clothes[slot][index] ?? setup.clothes[slot][0] ?? { type: [] };

    clothes[slot] = {
      ...setupData,
      ...data,
      index,
      setup: setupData,
      type: data.type ?? setupData.type ?? []
    };

    clothes[slot].integrity = Integrity(clothes[slot], slot);

    const prefilter = setupData.prefilter;
    const colour = clothes[slot].colour ?? clothes[slot].colour_sidebar ?? 'white';
    const acc = clothes[slot].accessory_colour ?? clothes[slot].accColour ?? clothes[slot].accessory_colour_sidebar ?? 'white';

    if (colour) filters[`nnpc_${slot}`] = lookupColour(setup.colours.clothes_map, colour, prefilter);
    if (acc) filters[`nnpc_${slot}_acc`] = lookupColour(setup.colours.clothes_map, acc, prefilter);
  }

  return clothes;
}

function combatNpc(name: string) {
  const list = Array.isArray(V.NPCList) ? V.NPCList : [];
  return list.find((npc: any) => {
    const npcName = npc?.fullDescription ?? npc?.description ?? npc?.nam ?? npc?.name;
    return npcName === name;
  });
}

function nakedClothes(slot: ClothesSlot) {
  const data = setup.clothes[slot]?.[0] ?? { index: 0, name: 'naked', variable: 'naked', type: ['naked'] };
  return {
    ...data,
    index: 0,
    setup: data,
    type: data.type ?? ['naked'],
    integrity: Integrity(data, slot)
  };
}

function applyCombatClothesState(nnpc: Record<string, any>) {
  if (V.combat !== 1) return;
  const npc = combatNpc(nnpc.name);
  if (!npc) return;
  if (npc.chest != null && npc.chest !== 'clothed') upperCombatSlots.forEach(slot => (nnpc.clothes[slot] = nakedClothes(slot)));
  if (npc.penis != null && npc.vagina != null && npc.penis !== 'clothed' && npc.vagina !== 'clothed') lowerCombatSlots.forEach(slot => (nnpc.clothes[slot] = nakedClothes(slot)));
}

function setupBasicData(options: NPCSidebarOptions) {
  options.maplebirch ??= {};
  options.maplebirch.nnpc ??= {};
  options.filters ??= {};

  const nnpc = options.maplebirch.nnpc;
  const npcsidebar = V.options.maplebirch.npcsidebar;

  nnpc.name = V.npc.at(-1) ?? '';
  nnpc.show = !!npcsidebar.show;
  nnpc.model = !!npcsidebar.model && setup.NPCNameList.includes(nnpc.name);

  nnpc.position = npcsidebar.position === 'front' ? 300 : -100;
  nnpc.dxfn = npcsidebar.dxfn ?? -48;
  nnpc.dyfn = npcsidebar.dyfn ?? -8;
  nnpc.tan = npcsidebar.tan ?? 0;

  nnpc.skin_type = nnpc.name === 'Ivory Wraith' ? 'wraith' : (npcsidebar.skin_type ?? 'light');
  nnpc.freckles = !!npcsidebar.freckles;
  nnpc.facestyle = npcsidebar.facestyle ?? 'default';
  nnpc.facevariant = npcsidebar.facevariant ?? 'default';
  nnpc.ears_position = npcsidebar.ears ?? 'back';
  nnpc.close_up_mask = maplebirch.char.mask(npcsidebar.mask, npcsidebar.rotation);

  nnpc.hide_all = false;
  nnpc.hide_head_acc = false;
  nnpc.hide_leash = false;
  nnpc.hood_down = false;
  nnpc.show_hair = true;

  return nnpc;
}

function setupClothesData(options: NPCSidebarOptions, nnpc: Record<string, any>, npcData: any) {
  options.filters!.nnpc_tan = setup.colours.getSkinFilter(nnpc.skin_type, nnpc.tan);

  nnpc.clothes = NPCClothes(npcData, options);
  applyCombatClothesState(nnpc);

  const clothes = nnpc.clothes;
  const allSlots = Array.isArray(setup.clothes_all_slots) ? setup.clothes_all_slots : clothesSlots;

  nnpc.hood_down = clothes.upper.hoodposition === 'down';
  nnpc.upper_tucked = !!npcData?.tucked?.[0] && !clothes.upper.notuck && clothes.upper.outfitPrimary == null;
  nnpc.lower_tucked = !!npcData?.tucked?.[1] && !clothes.feet.notuck && !clothes.lower.notuck;

  nnpc.handheld_animation = clothes.handheld.name?.includes('coin') ? 'coinFlip' : clothes.handheld.name === 'heart hand warmer' ? 'handWarmer' : 'idle';

  if ((clothes.lower.exposed ?? 0) >= 2 && (clothes.under_lower.exposed ?? 0) >= 1 && !String(clothes.legs.name ?? '').includes('tights')) {
    nnpc.crotch_visible = true;
    nnpc.crotch_exposed = true;
  } else if (clothes.lower.type?.includes('naked') && clothes.under_lower.type?.includes('naked')) {
    nnpc.crotch_visible = true;
    nnpc.crotch_exposed = false;
  } else {
    nnpc.crotch_visible = false;
    nnpc.crotch_exposed = false;
  }

  const holdPositions = allSlots.map((slot: string) => clothes[slot]?.holdPosition);
  const handheldPosition = clothes.handheld?.holdPosition;

  nnpc.arm_left = ['left_cover', 'clutch', 'cover_both'].some(pos => holdPositions.includes(pos)) ? 'cover' : holdPositions.includes('left_hold') ? 'hold' : 'idle';

  nnpc.arm_right = ['right_cover', 'cover_both'].some(pos => holdPositions.includes(pos))
    ? 'cover'
    : ['right_hold', 'clutch'].some(pos => holdPositions.includes(pos)) || (clothes.handheld.name !== 'naked' && !['left_cover', 'left_idle', 'idle_both'].includes(handheldPosition))
      ? 'hold'
      : 'idle';

  nnpc.handheld_position = nnpc.arm_right === 'hold' ? 'hold' : handheldPosition === 'right_cover' ? 'right_cover' : null;

  if (clothes.over_upper.index) {
    nnpc.zarms = maplebirch.char.ZIndices.over_upper_arms - 0.1;
  } else if (clothes.upper.index) {
    nnpc.zarms = (nnpc.arm_left === 'cover' ? (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_arms_tucked : maplebirch.char.ZIndices.upper_arms) : maplebirch.char.ZIndices.under_upper_arms) - 0.1;
  } else if (clothes.under_upper.index) {
    nnpc.zarms = maplebirch.char.ZIndices.under_upper_arms - 0.1;
  } else {
    nnpc.zarms = maplebirch.char.ZIndices.armsidle;
  }

  if (clothes.under_upper.sleeve_img === 1) {
    nnpc.zarms = maplebirch.char.ZIndices.under_upper_arms - 0.1;
  } else if (clothes.upper.sleeve_img === 1) {
    nnpc.zarms = (nnpc.arm_left === 'cover' ? (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_arms_tucked : maplebirch.char.ZIndices.upper_arms) : maplebirch.char.ZIndices.under_upper_arms) - 0.1;
  }

  nnpc.zarms += nnpc.position;

  nnpc.zupper = (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_tucked : maplebirch.char.ZIndices.upper) + nnpc.position;
  nnpc.zupperleft = (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_arms_tucked : maplebirch.char.ZIndices.upper_arms) + nnpc.position;
  nnpc.zupperright = (nnpc.upper_tucked ? maplebirch.char.ZIndices.upper_arms_tucked : maplebirch.char.ZIndices.upper_arms) + nnpc.position;

  if (nnpc.arm_right === 'cover' || nnpc.arm_right === 'hold') nnpc.zupperright = maplebirch.char.ZIndices.right_cover_arm + 1 + nnpc.position;
  if (nnpc.arm_left === 'cover') nnpc.zupperleft = maplebirch.char.ZIndices.left_cover_arm + 1 + nnpc.position;

  nnpc.handheld_position = nnpc.arm_right === 'hold' ? 'hold' : clothes.handheld.holdPosition === 'right_cover' ? 'right_cover' : null;

  if (clothes.upper.name === 'cocoon') {
    nnpc.hide_all = true;
    nnpc.show_hair = false;
  }

  if (clothes.neck.name === 'familiar collar' && !clothes.neck.type?.includes('leash')) nnpc.hide_leash = true;

  if (clothes.handheld.zIndex === 'over_head' || clothes.handheld.type?.includes('rainproof') || ['right_cover', 'over_head'].includes(clothes.handheld.holdPosition)) {
    nnpc.handheld_overhead = true;
    nnpc.angel_halo_lower = nnpc.arm_right !== 'cover';
  } else {
    nnpc.handheld_overhead = null;
    nnpc.angel_halo_lower = false;
  }

  if (clothes.head.name === 'sage witch hat') nnpc.hide_head_acc = false;

  nnpc.alt_sleeve_state = clothes.upper.variable === 'schoolcardigan' && clothes.upper.alt !== 'alt' && clothes.upper.altposition !== 'alt' ? null : true;

  nnpc.high_waist_suspenders =
    clothes.neck.name === 'suspenders' && clothes.neck.altposition !== 'alt' && ['retro shorts', 'retro trousers', 'baseball shorts', 'wide leg trousers'].includes(clothes.lower.name) ? true : null;

  nnpc.hood_mask = clothes.head.mask_img === 1 && !(nnpc.hood_down && clothes.head.hood && clothes.head.outfitSecondary !== undefined) ? true : null;
}

function setupBodyData(options: NPCSidebarOptions, nnpc: Record<string, any>, npcData: any) {
  const filters = options.filters!;
  const bodydata = nnpc.bodydata ?? npcData.bodydata ?? {};
  const clothes = nnpc.clothes;
  const npc = Array.isArray(V.NPCName) ? V.NPCName.find((npc: { nam?: string; name?: string }) => (npc.nam ?? npc.name) === nnpc.name) : undefined;

  nnpc.lust = Math.clamp(npc?.lust ?? 0, 0, 100);

  nnpc.breasts = !clothes.upper.type?.includes('naked') || !clothes.under_upper.type?.includes('naked') ? 'cleavage' : 'default';
  nnpc.breast_size = [0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 5, 5, 6][Math.round(bodydata.breastsize ?? 0)] ?? 0;

  const hasPenis = bodydata.penis != null && bodydata.penis !== 'none';
  const penisState = nnpc.lust >= 60 ? 'hard' : 'soft';
  const penisVirgin = hasPenis && bodydata.virginity?.penile === true ? '-virgin-' : '-';

  nnpc.penis_size = hasPenis ? Math.clamp(Math.round(bodydata.penissize ?? 1), 1, 4) + 2 : 0;
  nnpc.balls = hasPenis && (bodydata.ballssize ?? 0) > 0;
  nnpc.penis = hasPenis ? `${penisState}${penisVirgin}${nnpc.penis_size}` : false;
  nnpc.genitals_chastity = clothes.genitals.type?.includes('chastity');

  nnpc.eye_colour = bodydata.eyeColour;
  filters.nnpc_eyes = lookupColour(setup.colours.eyes_map, nnpc.eye_colour, 'eyes');

  nnpc.hair_colour = bodydata.hairColour;
  filters.nnpc_brows = lookupColour(setup.colours.hair_map, nnpc.hair_colour, 'brows');
  filters.nnpc_hair = lookupColour(setup.colours.hair_map, nnpc.hair_colour, 'hair');
  filters.nnpc_hair_fringe = lookupColour(setup.colours.hair_map, nnpc.hair_colour, 'hair_fringe');

  const hairstyle = setup.hairstyles.sides.find((style: any) => style.variable === bodydata.hair_side_type);
  const headIndex = clothesIndex('head', clothes.head);
  const headType = setup.clothes.head[headIndex]?.head_type;

  nnpc.hair_sides_type = hairstyle?.alt_head_type?.includes(headType) ? hairstyle.alt : bodydata.hair_side_type;
  nnpc.hair_fringe_type = bodydata.hair_fringe_type;
  nnpc.hair_position = bodydata.hair_position;
  nnpc.hair_length = hairLengthList[Math.trunc((bodydata.hairlength ?? 0) / 200)] ?? 'short';

  nnpc.hair_sides_length = nnpc.hair_length;
  nnpc.hair_sides_position = nnpc.hair_position;
  nnpc.hair_fringe_length = nnpc.hair_length;

  nnpc.calculate_penis_bulge = (target = nnpc) => {
    const clothes = target.clothes;
    const penisSize = target.penis_size ?? 0;
    const lust = target.lust ?? 0;
    if (clothes.under_lower?.type?.includes('strap-on')) return (clothes.under_lower.size ?? 0) * 3;
    const compressed = !!target.penis && clothes.genitals?.type?.includes('hidden');
    if (!target.penis || compressed) return 0;
    if (clothes.genitals?.type?.includes('cage')) return Math.max(0, penisSize);
    const erection = lust >= 80 ? 3 : lust >= 60 ? 2 : 1;
    return Math.max(0, (penisSize - 1) * erection);
  };
}

function setupMaskData(nnpc: Record<string, any>) {
  const clothes = nnpc.clothes;
  const close_up_mask = nnpc.close_up_mask;

  nnpc.head_mask = [close_up_mask];
  nnpc.upper_mask = [close_up_mask];
  nnpc.lower_mask = [close_up_mask];
  nnpc.legs_mask = [close_up_mask];
  nnpc.feet_mask = [close_up_mask];

  const hairTails = ['curly pigtails', 'fluffy ponytail', 'thick sidetail', 'thick twintails', 'ribbon tail', 'thick sidetail', 'thick ponytail', 'half-up'];
  const thickTails = ['scorpion tails', 'thick pigtails', 'thick twintails'];
  const furCap = ['furcap f', 'furcap m'];

  if (clothes.upper.mask_img === 1 && clothes.upper.name === 'cocoon') nnpc.head_mask.push('img/clothes/upper/cocoon/mask.png');

  if (clothes.over_head.mask_img === 1 && !(nnpc.hood_down && clothes.over_head.hood && clothes.over_head.outfitSecondary !== undefined)) {
    nnpc.head_mask.push(`img/clothes/head/${clothes.over_head.variable}/mask.png`);
  }

  if (clothes.head.mask_img === 1 && !(nnpc.hood_down && clothes.head.hood && clothes.head.outfitSecondary !== undefined)) {
    const ponytail = (clothes.head.mask_img_ponytail === 1 && hairTails.includes(nnpc.hair_sides_type)) || (thickTails.includes(nnpc.hair_sides_type) && furCap.includes(clothes.head.variable));
    nnpc.head_mask.push(`img/clothes/head/${clothes.head.variable}/${ponytail ? 'mask_ponytail' : 'mask'}.png`);
  }

  if (clothes.handheld.mask_img === 1) nnpc.head_mask.push(`img/clothes/handheld/${clothes.handheld.variable}/mask.png`);

  if (['fro', 'afro pouf', 'afro puffs'].includes(nnpc.hair_sides_type) && nnpc.hair_fringe_type === 'fro') {
    nnpc.fringe_mask_src = `img/hair/fringe/${nnpc.hair_fringe_type}/mask.png`;
  } else {
    nnpc.fringe_mask_src = null;
  }

  if (clothes.upper.mask_img === 1) nnpc.upper_mask.push(`img/clothes/upper/${clothes.upper.variable}/${clothes.upper.integrity}.png`);
  if (clothes.lower.mask_img === 1) nnpc.lower_mask.push(`img/clothes/lower/${clothes.lower.variable}/${clothes.lower.integrity}.png`);

  if (nnpc.lower_tucked && !clothes.lower.notuck && !clothes.feet.notuck) {
    nnpc.feet_clip_src = `img/clothes/feet/${clothes.feet.variable}/mask.png`;
    nnpc.lower_mask.push(nnpc.feet_clip_src);
    nnpc.legs_mask.push(nnpc.feet_clip_src);
  } else if (!clothes.feet.notuck) {
    nnpc.legs_mask.push(`img/clothes/feet/${clothes.feet.variable}/mask.png`);
  } else {
    nnpc.feet_clip_src = null;
  }
}

function preprocess(options: NPCSidebarOptions) {
  const nnpc = setupBasicData(options);
  if (!nnpc.name || !nnpc.model) return;
  const npcData = V.maplebirch.npc[nnpc.name.toLowerCase()];
  if (!npcData) {
    nnpc.model = false;
    return;
  }
  Object.assign(nnpc, transformationDefaults);
  maplebirch.npc.Transformation.applyBody(nnpc, npcData);
  maplebirch.npc.Transformation.applySidebar(nnpc);
  setupClothesData(options, nnpc, npcData);
  setupBodyData(options, nnpc, npcData);
  NPCFluids.apply(nnpc, npcData);
  setupMaskData(nnpc);
}

const layers = {
  ...base_layers,
  ...fluids_layers,
  ...head_layers,
  ...face_layers,
  ...neck_layers,
  ...upper_layers,
  ...lower_layers,
  ...hands_layers,
  ...handheld_layers,
  ...legs_layers,
  ...feet_layers,
  ...transformation_layers,
  nnpc_genitals: clothes_layer('genitals', 'main', {
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch!.nnpc!;
      const genitals = nnpc.clothes.genitals;
      let size = '';
      if (genitals.penisSize) {
        if (nnpc.penis_size <= 0) size = '0';
        else if (nnpc.penis_size <= 2) size = '1';
        else if (nnpc.penis_size <= 4) size = '2';
      }
      return `img/clothes/genitals/${genitals.variable}/${genitals.integrity}${size}.png`;
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch!.nnpc!;
      const clothes = nnpc.clothes;
      if (!nnpc.show || !nnpc.model) return false;
      if (!clothes?.genitals) return false;
      if (clothes.genitals.index <= 0) return false;
      if (clothes.genitals.mainImage === 0) return false;
      if (Array.isArray(clothes.genitals.hideUnderLower) && clothes.genitals.hideUnderLower.includes(clothes.under_lower?.name)) return false;
      return true;
    },

    zfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch!.nnpc!;
      return (nnpc.crotch_exposed ? maplebirch.char.ZIndices.penis_chastity + 0.1 : maplebirch.char.ZIndices.penisunderclothes + 0.1) + nnpc.position;
    }
  }),

  nnpc: {
    srcfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch!.nnpc!;
      const selected = V.options.maplebirch.npcsidebar.display[nnpc.name];
      const artKey = maplebirch.npc.Clothes.art?.get?.(nnpc.name)?.key;
      if (!selected) return '';
      if (selected === 'none' || selected === artKey) return '';
      return `img/ui/nnpc/${nnpc.name.toLowerCase()}/${selected}.png`;
    },

    showfn(options: NPCSidebarOptions) {
      const nnpc = options.maplebirch!.nnpc!;
      return !!nnpc.show && !nnpc.model && !!nnpc.name && setup.NPCNameList.includes(nnpc.name);
    },

    zfn(options: NPCSidebarOptions) {
      return options.maplebirch!.nnpc!.position;
    },

    animation: 'idle'
  }
};

const NPCSidebar = (() => {
  class NPCSidebar {
    public static get display() {
      return display;
    }

    public static loadFromMod = loadFromMod;

    public static hair_type(type: 'sides' | 'fringe') {
      const hair_name: Record<string, string> = {};
      const styles = type === 'sides' ? setup.hairstyles.sides : setup.hairstyles.fringe;
      styles.forEach((style: any) => {
        const name = maplebirch.modUtils.getModListNameNoAlias().includes('ModI18N') && maplebirch.Language === 'CN' ? style.name_cap : style.name;
        hair_name[name.convert('title')] = style.variable;
      });
      return hair_name;
    }

    public static init(manager: NPCManager) {
      manager.core.once(':storyready', () => {
        for (const npcName of manager.NPCNameList) {
          if (!display.has(npcName)) display.set(npcName, new Set());
          V.options.maplebirch.npcsidebar.display[npcName] ??= 'none';
        }
      });
      manager.core.char.use('pre', preprocess, 'main');
      manager.core.char.use(layers, 'main');
      manager.core.dynamic.regTimeEvent('onHour', 'maplebirch.npc.fluids.decay', {
        action: data => NPCFluids.decay(data.triggeredByAccumulator?.count ?? 1),
        accumulate: { unit: 'hour', target: 1 },
        priority: -10
      });
    }
  }

  return NPCSidebar;
})();

export default NPCSidebar;
