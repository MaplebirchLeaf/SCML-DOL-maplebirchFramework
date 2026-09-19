// ./src/modules/NamedNPCAddon/NPCSidebar.ts

import type { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';
import type { MacroDefinition } from 'twine-sugarcube';
import maplebirch from '../../core';
import { lookupColour, clothes_layer, isAltPosition, normaliseClothingState, clothingIndex, previousFilterName } from './NPCSidebarConfig/functions';
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
import type NPCManager from '../NamedNPC';
import DoLPcompat from '../../DoLPcompat';
import { FloatingPet, type PetOptions, type PetSettings } from '../CharacterAddon/Pet';

export interface NPCSidebarBootConfig {
  clothes?: string[];
  image?: string[];
  config?: string[];
}

async function images(manager: NPCManager, modName: string, modZip: ModZipReader, paths: string[]): Promise<void> {
  const image_paths: string[] = [];
  for (const path of paths) {
    if (!modZip.zip.file(path)) {
      manager.log(`图片未找到: ${path} (模组: ${modName})`, 'WARN');
      continue;
    }
    image_paths.push(path);
  }
  if (!image_paths.length) return;
  const modInfo = modZip.modInfo;
  if (!modInfo) return;
  const plugins = modInfo.bootJson?.addonPlugin;
  if (!plugins) return;
  let plugin = plugins.find(item => item.modName === 'BeautySelectorAddon' && item.addonName === 'BeautySelectorAddon');
  if (!plugin) {
    plugin = { modName: 'BeautySelectorAddon', addonName: 'BeautySelectorAddon', modVersion: '^2.0.0', params: {} };
    plugins.push(plugin);
  }
  const params = plugin.params && typeof plugin.params === 'object' && !Array.isArray(plugin.params) ? (plugin.params as Record<string, unknown>) : {};
  params.type = `npc-sidebar:${modName}`;
  params.imgFileList = image_paths;
  plugin.params = params;
  await window.addonBeautySelectorAddon.registerMod('BeautySelectorAddon', modInfo, modZip);
}

async function config(manager: NPCManager, modName: string, modZip: ModZipReader, config: NPCSidebarBootConfig): Promise<void> {
  if (Array.isArray(config.clothes)) for (const file_path of config.clothes) await manager.Clothes.wardrobe.load(modName, file_path);
  const image_paths: string[] = [];
  if (Array.isArray(config.image)) image_paths.push(...loadFromMod(modZip, config.image));
  if (Array.isArray(config.config)) image_paths.push(...(await manager.Clothes.art.import(modName, modZip, config.config)));
  if (image_paths.length) await images(manager, modName, modZip, image_paths);
}

type NPCSidebarOptions = {
  filters?: Record<string, any>;
  maplebirch?: {
    nnpc?: Record<string, any>;
    previous?: Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
};

type ClothesSlot = 'head' | 'face' | 'neck' | 'upper' | 'lower' | 'feet' | 'legs' | 'handheld' | 'genitals' | 'under_upper' | 'under_lower' | 'over_head' | 'over_upper' | 'over_lower' | 'hands';

const display = new Map<string, Set<string>>();
const image_formats = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
const portrait_paths = new Map<string, Set<string>>();

// prettier-ignore
const clothes_slots: ClothesSlot[] = [
  'head', 'face', 'neck', 'upper', 'lower', 'feet', 'legs', 'handheld',
  'genitals', 'under_upper', 'under_lower', 'over_head', 'over_upper', 'over_lower', 'hands'
];

const hair_length_list = ['short', 'shoulder', 'chest', 'navel', 'thighs', 'feet'] as const;
const upper_combat_slots: ClothesSlot[] = ['over_upper', 'upper', 'under_upper'];
const lower_combat_slots: ClothesSlot[] = ['over_lower', 'lower', 'under_lower', 'legs'];

const portrait_npc_name = (name: string): string => String(name).replace(/[_-]/g, ' ').convert('title');
const portrait_gender = (npc: Record<string, any>): string => (C.npc?.[npc.name]?.gender === 'm' ? 'male' : 'female');
const portrait_skin_tone = (npc: Record<string, any>): string => (npc.skin_type?.includes('dark') ? 'dark' : 'pale');

function selected(): [string, string?] {
  const sidebar = V.options.maplebirch.npcsidebar;
  const nearby = Array.isArray(V.npc) ? V.npc.filter((name: unknown): name is string => typeof name === 'string' && name.length > 0 && setup.NPCNameList.includes(name)) : [];
  const names = nearby.filter((name, index) => nearby.lastIndexOf(name) === index);
  const primary = names.includes(sidebar.primary_npc) ? sidebar.primary_npc : (names.at(-1) ?? '');
  const selected_secondary = names.includes(sidebar.secondary_npc) && sidebar.secondary_npc !== primary ? sidebar.secondary_npc : undefined;
  const secondary = sidebar.second_model
    ? (selected_secondary ??
      names
        .slice()
        .reverse()
        .find(name => name !== primary))
    : undefined;
  return [primary, secondary];
}

function clothes_changed(rendered: Record<string, any> | undefined, current: Record<string, any>): boolean {
  if (!rendered) return true;
  const keys = ['name', 'variable', 'state', 'state_top', 'colour', 'colourCustom', 'accessory_colour', 'accessory_colourCustom', 'altposition', 'pattern', 'accessory', 'altsleeve', 'alpha'];
  return clothes_slots.some(slot => {
    const item = current[slot] ?? {};
    if (rendered[slot]?.index !== clothes_index(slot, item)) return true;
    if (Object.hasOwn(item, 'integrity') && rendered[slot]?.integrity !== Integrity(item, slot)) return true;
    return keys.some(key => Object.hasOwn(item, key) && rendered[slot]?.[key] !== item[key]);
  });
}

function refresh(manager: NPCManager): void {
  const model = Renderer.CanvasModelCaches?.main?.sidebar as CanvasModel | undefined;
  if (!model?.canvas) return;
  const rendered = [model.options?.maplebirch?.nnpc, model.options?.maplebirch?.previous] as Array<Record<string, any> | undefined>;
  const changed = selected().some((name, index) => {
    const npc = rendered[index];
    if (!name) return !!npc?.name;
    return npc?.name !== name || clothes_changed(npc.clothes, manager.Clothes.wardrobe.worn(name));
  });
  if (changed) model.redraw();
}

function loadFromMod(modZip: ModZipReader, npc_names: string[]) {
  if (!modZip) return [];

  const paths: string[] = [];
  const root = 'img/ui/nnpc/';

  for (const name of npc_names ?? []) {
    const npc_name = portrait_npc_name(name);
    if (!display.has(npc_name)) display.set(npc_name, new Set());
  }

  for (const path in modZip.zip.files) {
    const normalized = path.replace(/\\/g, '/');
    const match = normalized.match(/(?:^|\/)(img\/ui\/nnpc\/.*)$/);
    if (!match) continue;

    const file_path = match[1];
    const parts = file_path.slice(root.length).split('/').filter(Boolean);
    if (parts.length < 2) continue;

    const npc_name = portrait_npc_name(parts[0]);
    const file_name = parts.at(-1)!;
    const dot = file_name.lastIndexOf('.');

    if (dot <= 0) continue;
    const img_name = file_name.slice(0, dot);
    const ext = file_name.slice(dot + 1).toLowerCase();
    if (!image_formats.has(ext)) continue;
    if (!display.has(npc_name)) display.set(npc_name, new Set());
    if (!portrait_paths.has(npc_name)) portrait_paths.set(npc_name, new Set());

    display.get(npc_name)!.add(img_name);
    portrait_paths.get(npc_name)!.add(file_path);
    paths.push(file_path);
  }

  return paths;
}

function load_all_images(manager: NPCManager) {
  for (const name of manager.NPCNameList) {
    const npc_name = portrait_npc_name(name);
    if (!display.has(npc_name)) display.set(npc_name, new Set());
  }
  const paths: string[] = [];
  for (const modName of manager.core.modUtils.getModListNameNoAlias()) {
    if (modName === 'ModI18N') continue;
    try {
      const modZip = manager.core.modUtils.getModZip(modName);
      if (modZip) paths.push(...loadFromMod(modZip, []));
    } catch {
      continue;
    }
  }
  return paths;
}

function resolve(nnpc: Record<string, any>, selected: string): string {
  const name = portrait_npc_name(nnpc.name).toLowerCase();
  const flat = `img/ui/nnpc/${name}/${selected}.png`;
  const src = portrait_paths.get(nnpc.name);
  if (!src?.size) return flat;

  const gender = portrait_gender(nnpc);
  const tone = portrait_skin_tone(nnpc);
  for (const dir of [name.replace(/\s+/g, '_'), name.replace(/\s+/g, '-'), name]) {
    const deep = `img/ui/nnpc/${dir}/${gender}/${tone}/${selected}.png`;
    if (src.has(deep)) return deep;
  }
  if (src.has(flat)) return flat;

  const candidates = [...src].filter(path => path.endsWith(`/${selected}.png`));
  if (candidates.length === 0) return flat;
  return candidates.find(path => path.includes(`/${gender}/`)) ?? candidates[0];
}

function clothes_index(slot: ClothesSlot, clothes: any) {
  const fn = window.clothesIndex;
  return clothingIndex(slot, clothes ?? {}, typeof fn === 'function' ? (target, item) => fn(target as ClothesSlot, item) : undefined);
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

function default_clothes() {
  return clothes_slots.reduce(
    (result, slot) => {
      result[slot] = { index: 0, name: '', type: [] };
      return result;
    },
    {} as Record<ClothesSlot, any>
  );
}

function npc_clothes(npcData: any, options: NPCSidebarOptions) {
  const filters = options.filters!;
  const clothes_data = {
    ...default_clothes(),
    ...npcData?.clothes
  };

  const clothes = {} as Record<ClothesSlot, any>;

  for (const slot of clothes_slots) {
    const data = clothes_data[slot] ?? {};
    const index = clothes_index(slot, data);
    const setup_data = setup.clothes[slot][index] ?? setup.clothes[slot][0] ?? { type: [] };

    clothes[slot] = normaliseClothingState(setup_data, data, index);

    clothes[slot].integrity = Integrity(clothes[slot], slot);

    const prefilter = setup_data.prefilter;
    const colour = clothes[slot].colour ?? clothes[slot].colour_sidebar ?? 'white';
    const acc = clothes[slot].accessory_colour ?? clothes[slot].accColour ?? clothes[slot].accessory_colour_sidebar ?? 'white';

    if (colour) filters[`nnpc_${slot}`] = lookupColour(setup.colours.clothes_map, colour, prefilter);
    if (acc) filters[`nnpc_${slot}_acc`] = lookupColour(setup.colours.clothes_map, acc, prefilter);
  }

  return clothes;
}

function combat_npc(name: string) {
  const list = Array.isArray(V.NPCList) ? V.NPCList : [];
  return list.find((npc: any) => {
    const npc_name = npc?.fullDescription ?? npc?.description ?? npc?.nam ?? npc?.name;
    return npc_name === name;
  });
}

function naked_clothes(slot: ClothesSlot) {
  const data = setup.clothes[slot]?.[0] ?? { index: 0, name: 'naked', variable: 'naked', type: ['naked'] };
  return {
    ...data,
    index: 0,
    setup: data,
    type: data.type ?? ['naked'],
    integrity: Integrity(data, slot)
  };
}

function exposed(state: unknown): boolean {
  return state === 0 || (typeof state === 'string' && state !== '' && state !== 'clothed' && state !== 'none');
}

function apply_combat_clothes_state(nnpc: Record<string, any>) {
  if (V.combat !== 1) return;
  const npc = combat_npc(nnpc.name);
  if (!npc) return;
  if (exposed(npc.chest)) upper_combat_slots.forEach(slot => (nnpc.clothes[slot] = naked_clothes(slot)));
  if (exposed(npc.penis) || exposed(npc.vagina)) lower_combat_slots.forEach(slot => (nnpc.clothes[slot] = naked_clothes(slot)));
}

function setup_basic_data(options: NPCSidebarOptions, name: string) {
  options.maplebirch ??= {};
  options.maplebirch.nnpc ??= {};
  options.filters ??= {};

  const nnpc = options.maplebirch.nnpc;
  const npcsidebar = V.options.maplebirch.npcsidebar;

  nnpc.name = name;
  nnpc.show = !!npcsidebar.show;
  nnpc.model = !!npcsidebar.model && setup.NPCNameList.includes(nnpc.name);

  nnpc.position = npcsidebar.position === 'front' ? 300 : -300;
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

function setup_clothes_data(options: NPCSidebarOptions, nnpc: Record<string, any>, npcData: any) {
  options.filters!.nnpc_tan = setup.colours.getSkinFilter(nnpc.skin_type, nnpc.tan);

  nnpc.clothes = npc_clothes(npcData, options);
  apply_combat_clothes_state(nnpc);

  const clothes = nnpc.clothes;
  const all_slots = Array.isArray(setup.clothes_all_slots) ? setup.clothes_all_slots : clothes_slots;

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

  const hold_positions = all_slots.map((slot: string) => clothes[slot]?.holdPosition);
  const handheld_position = clothes.handheld?.holdPosition;

  nnpc.arm_left = ['left_cover', 'clutch', 'cover_both'].some(pos => hold_positions.includes(pos)) ? 'cover' : hold_positions.includes('left_hold') ? 'hold' : 'idle';

  nnpc.arm_right = ['right_cover', 'cover_both'].some(pos => hold_positions.includes(pos))
    ? 'cover'
    : ['right_hold', 'clutch'].some(pos => hold_positions.includes(pos)) || (clothes.handheld.name !== 'naked' && !['left_cover', 'left_idle', 'idle_both'].includes(handheld_position))
      ? 'hold'
      : 'idle';

  nnpc.handheld_position = nnpc.arm_right === 'hold' ? 'hold' : handheld_position === 'right_cover' ? 'right_cover' : null;

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

  if (clothes.head.name === 'sage witch hat') {
    const ears = [nnpc.fox_ears_type, nnpc.wolf_ears_type, nnpc.cat_ears_type].some(value => typeof value === 'string' && !['disabled', 'hidden'].includes(value));
    if (ears) nnpc.hide_head_acc = true;
  }

  nnpc.alt_sleeve_state = clothes.upper.variable === 'schoolcardigan' && !isAltPosition(clothes.upper) ? null : true;

  nnpc.high_waist_suspenders =
    clothes.neck.name === 'suspenders' && !isAltPosition(clothes.neck) && ['retro shorts', 'retro trousers', 'baseball shorts', 'wide leg trousers'].includes(clothes.lower.name) ? true : null;

  nnpc.hood_mask = clothes.head.mask_img === 1 && !(nnpc.hood_down && clothes.head.hood && clothes.head.outfitSecondary !== undefined) ? true : null;
}

function setup_body_data(options: NPCSidebarOptions, nnpc: Record<string, any>, npcData: any) {
  const filters = options.filters!;
  const bodydata = nnpc.bodydata ?? npcData.bodydata ?? {};
  const clothes = nnpc.clothes;
  const npc = Array.isArray(V.NPCName) ? V.NPCName.find((npc: { nam?: string; name?: string }) => (npc.nam ?? npc.name) === nnpc.name) : undefined;

  nnpc.lust = Math.clamp(npc?.lust ?? 0, 0, 100);

  nnpc.breasts = !clothes.upper.type?.includes('naked') || !clothes.under_upper.type?.includes('naked') ? 'cleavage' : 'default';
  nnpc.breast_size = [0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 5, 5, 6][Math.round(bodydata.breastsize ?? 0)] ?? 0;

  const has_penis = bodydata.penis != null && bodydata.penis !== 'none';
  const penis_state = nnpc.lust >= 60 ? 'hard' : 'soft';
  const penis_virgin = has_penis && bodydata.virginity?.penile === true ? '-virgin-' : '-';

  nnpc.penis_size = has_penis ? Math.clamp(Math.round(bodydata.penissize ?? 1), 1, 4) + 2 : 0;
  nnpc.balls = has_penis && (bodydata.ballssize ?? 0) > 0;
  nnpc.penis = has_penis ? `${penis_state}${penis_virgin}${nnpc.penis_size}` : false;
  nnpc.genitals_chastity = clothes.genitals.type?.includes('chastity');

  nnpc.eye_colour = bodydata.eyeColour;
  filters.nnpc_eyes = lookupColour(setup.colours.eyes_map, nnpc.eye_colour, 'eyes');

  nnpc.hair_colour = bodydata.hairColour;
  filters.nnpc_brows = lookupColour(setup.colours.hair_map, nnpc.hair_colour, 'brows');
  filters.nnpc_hair = lookupColour(setup.colours.hair_map, nnpc.hair_colour, 'hair');
  filters.nnpc_hair_fringe = lookupColour(setup.colours.hair_map, nnpc.hair_colour, 'hair_fringe');

  const hairstyle = setup.hairstyles.sides.find((style: any) => style.variable === bodydata.hair_side_type);
  const head_index = clothes_index('head', clothes.head);
  const head_type = setup.clothes.head[head_index]?.head_type;

  nnpc.hair_sides_type = hairstyle?.alt_head_type?.includes(head_type) ? hairstyle.alt : bodydata.hair_side_type;
  nnpc.hair_fringe_type = bodydata.hair_fringe_type;
  nnpc.hair_position = bodydata.hair_position;
  nnpc.hair_sides_length = hair_length_list[Math.trunc((bodydata.hair_sides_length ?? 0) / 200)] ?? 'short';
  nnpc.hair_sides_position = nnpc.hair_position;
  nnpc.hair_fringe_length = hair_length_list[Math.trunc((bodydata.hair_fringe_length ?? 0) / 200)] ?? 'short';

  nnpc.calculate_penis_bulge = (target = nnpc) => {
    const clothes = target.clothes;
    const penis_size = target.penis_size ?? 0;
    const lust = target.lust ?? 0;
    if (clothes.under_lower?.type?.includes('strap-on')) return (clothes.under_lower.size ?? 0) * 3;
    const compressed = !!target.penis && clothes.genitals?.type?.includes('hidden');
    if (!target.penis || compressed) return 0;
    if (clothes.genitals?.type?.includes('cage')) return Math.max(0, penis_size);
    const erection = lust >= 80 ? 3 : lust >= 60 ? 2 : 1;
    return Math.max(0, (penis_size - 1) * erection);
  };
}

function setup_mask_data(nnpc: Record<string, any>) {
  const clothes = nnpc.clothes;
  const close_up_mask = nnpc.close_up_mask;

  nnpc.head_mask = [close_up_mask];
  nnpc.upper_mask = [close_up_mask];
  nnpc.lower_mask = [close_up_mask];
  nnpc.legs_mask = [close_up_mask];
  nnpc.feet_mask = [close_up_mask];

  const hair_tails = ['curly pigtails', 'fluffy ponytail', 'thick sidetail', 'thick twintails', 'ribbon tail', 'thick sidetail', 'thick ponytail', 'half-up'];
  const thick_tails = ['scorpion tails', 'thick pigtails', 'thick twintails'];
  const fur_cap = ['furcap f', 'furcap m'];

  if (clothes.upper.mask_img === 1 && clothes.upper.name === 'cocoon') nnpc.head_mask.push('img/clothes/upper/cocoon/mask.png');

  if (clothes.over_head.mask_img === 1 && !(nnpc.hood_down && clothes.over_head.hood && clothes.over_head.outfitSecondary !== undefined)) {
    nnpc.head_mask.push(`img/clothes/over-head/${clothes.over_head.variable}/mask.png`);
  }

  if (clothes.head.mask_img === 1 && !(nnpc.hood_down && clothes.head.hood && clothes.head.outfitSecondary !== undefined)) {
    const ponytail = (clothes.head.mask_img_ponytail === 1 && hair_tails.includes(nnpc.hair_sides_type)) || (thick_tails.includes(nnpc.hair_sides_type) && fur_cap.includes(clothes.head.variable));
    nnpc.head_mask.push(`img/clothes/head/${clothes.head.variable}/${ponytail ? 'mask-ponytail' : 'mask'}.png`);
  }

  if (clothes.handheld.mask_img === 1) nnpc.head_mask.push(`img/clothes/handheld/${clothes.handheld.variable}/mask.png`);

  if (nnpc.hair_sides_type === 'fro' && nnpc.hair_fringe_type === 'fro') {
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

function setup_npc(options: NPCSidebarOptions, nnpc: Record<string, any>) {
  if (!nnpc.name || !nnpc.model) return;
  const npcData = V.maplebirch.npc[nnpc.name.toLowerCase()];
  if (!npcData) {
    nnpc.model = false;
    return;
  }
  Object.assign(nnpc, transformationDefaults);
  nnpc.tf_ears_layer = nnpc.ears_position ?? nnpc.tf_ears_layer;
  maplebirch.npc.Transformation.applyBody(nnpc, npcData);
  maplebirch.npc.Transformation.applySidebar(nnpc);
  setup_clothes_data(options, nnpc, npcData);
  setup_body_data(options, nnpc, npcData);
  maplebirch.npc.fluids.apply(nnpc, npcData);
  setup_mask_data(nnpc);
}

function preprocess(options: NPCSidebarOptions) {
  const sidebar = V.options.maplebirch.npcsidebar;
  const [primary, secondary] = selected();
  const nnpc = setup_basic_data(options, primary);
  options.maplebirch!.previous = undefined;
  if (secondary) {
    const previous: Record<string, any> = {
      name: secondary,
      model: nnpc.model,
      position: sidebar.position === 'front' ? 0 : -600,
      dxfn: nnpc.dxfn + (sidebar.previous_dx ?? -36),
      dyfn: nnpc.dyfn + (sidebar.previous_dy ?? -8),
      skin_type: nnpc.skin_type,
      hide_all: false,
      hide_head_acc: false,
      hide_leash: false,
      hood_down: false,
      show_hair: true
    };
    for (const key of ['show', 'tan', 'freckles', 'facestyle', 'facevariant', 'ears_position', 'close_up_mask']) {
      Object.defineProperty(previous, key, { configurable: true, enumerable: true, get: () => nnpc[key] });
    }
    options.maplebirch!.previous = previous;
    setup_npc(previous_options(options) as NPCSidebarOptions, previous);
  }
  setup_npc(options, nnpc);
}

function previous_options(options: NPCSidebarOptions) {
  const filters = new Proxy(options.filters!, {
    get: (target, key) => target[previousFilterName(key) as any],
    set: (target, key, value) => {
      target[previousFilterName(key) as any] = value;
      return true;
    }
  });
  return { ...options, filters, maplebirch: { ...options.maplebirch, nnpc: options.maplebirch!.previous } };
}

function previous_layers(layers: Record<string, any>) {
  const remap_filters = (value: unknown) => (Array.isArray(value) ? value.map(previousFilterName) : value);
  const result: Record<string, any> = {};
  for (const [name, layer] of Object.entries(layers)) {
    const copy = { ...layer };
    if (copy.filters) copy.filters = remap_filters(copy.filters);
    for (const [key, fn] of Object.entries(copy)) {
      if (typeof fn !== 'function' || !key.endsWith('fn')) continue;
      copy[key] = function (options: NPCSidebarOptions, ...args: any[]) {
        const value = fn.call(this, previous_options(options), ...args);
        return key === 'filtersfn' ? remap_filters(value) : value;
      };
    }
    result[`nnpc_previous_${name.replace(/^nnpc_/, '')}`] = copy;
  }
  return result;
}

const npc_layers = {
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
    srcfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch!.nnpc!;
      const genitals = nnpc.clothes.genitals;
      return `img/clothes/genitals/${genitals.variable}/${genitals.integrity}.png`;
    },

    showfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch!.nnpc!;
      const clothes = nnpc.clothes;
      if (!nnpc.show || !nnpc.model) return false;
      if (!clothes?.genitals) return false;
      if (clothes.genitals.index <= 0) return false;
      if (clothes.genitals.mainImage === 0) return false;
      if (Array.isArray(clothes.genitals.hideUnderLower) && clothes.genitals.hideUnderLower.includes(clothes.under_lower?.name)) return false;
      return true;
    },

    zfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch!.nnpc!;
      return (nnpc.crotch_exposed ? maplebirch.char.ZIndices.penis_chastity + 0.1 : maplebirch.char.ZIndices.penisunderclothes + 0.1) + nnpc.position;
    }
  }),

  nnpc_sidebar: {
    srcfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch!.nnpc!;
      const selected = V.options.maplebirch.npcsidebar.display[nnpc.name];
      if (!selected || selected === 'none' || maplebirch.npc.Clothes.art.has(nnpc.name, selected)) return '';
      return resolve(nnpc, selected);
    },

    showfn: (options: NPCSidebarOptions) => {
      const nnpc = options.maplebirch!.nnpc!;
      return !!nnpc.show && !nnpc.model && !!nnpc.name && setup.NPCNameList.includes(nnpc.name);
    },

    zfn: (options: NPCSidebarOptions) => {
      return options.maplebirch!.nnpc!.position;
    },

    animation: 'idle'
  }
};

const layers = {
  ...npc_layers,
  ...previous_layers(npc_layers)
};

function init_drip_mask(): void {
  const pipeline = Renderer.RenderingPipeline;
  if (pipeline.some((step: { name: string }) => step.name === 'npc-drip-mask')) return;
  const index = pipeline.findIndex((step: { name: string }) => step.name === 'mask');
  if (index < 0) return;
  const masks = new WeakMap<object, Map<string, HTMLCanvasElement>>();
  pipeline.splice(index, 0, {
    name: 'npc-drip-mask',
    condition: (layer: any) => !!layer.repeat_mask && layer.mask?.width > 0,
    render(image: HTMLCanvasElement, layer: any, context: any) {
      const source = layer.mask;
      let cached = masks.get(source);
      if (!cached) masks.set(source, (cached = new Map()));
      const key = `${image.width}|${image.height}`;
      let mask = cached.get(key);
      if (!mask) {
        const stencil = Renderer.createCanvas(image.width, image.height);
        for (let x = 0; x < image.width; x += source.width) stencil.drawImage(source, x, 0);
        mask = stencil.canvas;
        if (cached.size >= 8) cached.clear();
        cached.set(key, mask!);
      }
      context.layer = { ...layer, mask, maskOffsets: [] };
      return image;
    }
  });
}

function pet_layers(slot: 'nnpc' | 'previous'): CanvasLayerMap {
  const previous = 'nnpc_previous_';
  return Object.fromEntries(Object.entries(layers).filter(([name]) => (slot === 'previous' ? name.startsWith(previous) : name.startsWith('nnpc_') && !name.startsWith(previous))));
}

class NPCPetSlot extends FloatingPet {
  private readonly model_name: string;
  private render_options?: CanvasModelOptionsData;

  public constructor(private readonly slot: 'nnpc' | 'previous') {
    const second = slot === 'previous';
    super(maplebirch.char, {
      elementId: `maplebirch-npc-pet-${second ? 'second' : 'first'}`,
      storageKey: `maplebirch.npc.pet.${second ? 'second' : 'first'}.position`,
      className: 'maplebirch-npc-pet',
      fallback: size => ({ left: 16, top: Math.max(0, window.innerHeight - size - (second ? size + 48 : 32)) })
    });
    this.model_name = `npc-pet-${slot}`;
  }

  public render(source: CanvasModelOptionsData, settings: PetOptions): boolean {
    const state = source.maplebirch?.[this.slot] as Record<string, any> | undefined;
    if (!state?.name) {
      this.unmount();
      return false;
    }
    const container = document.getElementById(this.petConfig.elementId);
    if (!container) return false;
    this.configure(settings);
    const models = Renderer.CanvasModels as Record<string, CanvasModelOptions | undefined>;
    const main = models.main;
    if (!main) return false;
    models[this.model_name] = {
      name: this.model_name,
      width: main.width,
      height: main.height,
      frames: main.frames,
      metadata: main.metadata,
      scale: main.scale,
      layers: {}
    };
    const model = Renderer.locateModel(this.model_name);
    const context = model.createCanvas(false);
    this.render_options = {
      ...source,
      filters: { ...source.filters },
      maplebirch: {
        ...source.maplebirch,
        [this.slot]: { ...state, show: true }
      }
    };
    delete this.render_options.generatedLayers;
    model.reset();
    this.draw(model, context);
    this.mount(container, model, context.canvas);
    return true;
  }

  protected draw(model: CanvasModel, context: CanvasRenderingContext2D): void {
    if (!this.render_options) return;
    this.stopAnimation();
    try {
      if (this.options.animated) model.animate(context, this.render_options, Renderer.defaultListener);
      else model.render(context, this.render_options, Renderer.defaultListener);
    } catch (error) {
      if (!this.options.animated) throw error;
      this.options.animated = false;
      model.render(context, this.render_options, Renderer.defaultListener);
    }
  }
}

class NPCPet {
  private readonly pets = [new NPCPetSlot('nnpc'), new NPCPetSlot('previous')];
  private frame = 0;
  private syncing = false;

  public sync(): boolean {
    const settings = (V.options?.maplebirch?.npcsidebar?.pet ?? {}) as PetSettings;
    if (!settings.enabled) {
      this.cancel();
      this.pets.forEach(pet => pet.unmount());
      return false;
    }
    this.cancel();
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.syncing) return;
      this.syncing = true;
      try {
        this.render(settings);
      } finally {
        this.syncing = false;
      }
    });
    return true;
  }

  private render(settings: PetSettings): void {
    const source = ((Renderer.CanvasModelCaches?.main?.sidebar as CanvasModel | undefined)?.options ?? Renderer.CanvasModels.main.defaultOptions()) as CanvasModelOptionsData;
    const pet_source = { ...source, filters: { ...source.filters }, maplebirch: { ...source.maplebirch, nnpc: {} } };
    preprocess(pet_source);
    const options: PetOptions = { ...settings, animated: !!V.options.sidebarAnimations, floating: true };
    this.pets[0].render(pet_source, options);
    if (V.options.maplebirch.npcsidebar.second_model) this.pets[1].render(pet_source, options);
    else this.pets[1].unmount();
  }

  public reset(): void {
    localStorage.removeItem('maplebirch.npc.pet.first.position');
    localStorage.removeItem('maplebirch.npc.pet.second.position');
    this.sync();
  }

  private cancel(): void {
    if (!this.frame) return;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
}

const NPCSidebar = (() => {
  class NPCSidebar {
    public static readonly pet = new NPCPet();
    public static get display() {
      return display;
    }

    public static config = config;

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
        init_drip_mask();
        if (DoLPcompat.isDoLP) manager.core.char.use({ nnpc: DoLPcompat.nnpc }, 'main');
        load_all_images(manager);
        for (const npc_name of manager.NPCNameList) {
          if (!display.has(npc_name)) display.set(npc_name, new Set());
          V.options.maplebirch.npcsidebar.display[npc_name] ??= 'none';
        }
      });
      manager.core.char.use('pre', preprocess, 'main');
      manager.core.char.use(layers, 'main');
      manager.core.char.use(pet_layers('nnpc'), 'npc-pet-nnpc');
      manager.core.char.use(pet_layers('previous'), 'npc-pet-previous');
      manager.core.once(':storyready', () => {
        const macro = manager.core.SugarCube.Macro.get('updatesidebarimg') as MacroDefinition | undefined;
        if (!macro) return;
        manager.core.tool.macro.define('updatesidebarimg', function (this: any) {
          macro.handler.call(this);
          NPCSidebar.pet.sync();
        });
      });
      manager.core.on(
        ':passageend',
        () => {
          refresh(manager);
          NPCSidebar.pet.sync();
        },
        'NPC sidebar state sync'
      );
      manager.core.dynamic.regTimeEvent('onHour', 'maplebirch.npc.fluids.decay', {
        action: data => manager.fluids.decay(data.triggeredByAccumulator?.count ?? 1),
        accumulate: { unit: 'hour', target: 1 },
        priority: -10
      });
    }
  }

  return NPCSidebar;
})();

export default NPCSidebar;
