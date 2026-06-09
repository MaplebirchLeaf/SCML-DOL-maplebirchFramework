// ./src/macros/helpers.ts

import maplebirch, { type MaplebirchCore } from '../core';
import type { MacroContext as SugarCubeMacroContext } from 'twine-sugarcube';

export const CONVERT_MODES = ['lower', 'upper', 'capitalize', 'title', 'camel', 'pascal', 'snake', 'kebab', 'constant'] as const;
export type ConvertMode = (typeof CONVERT_MODES)[number];

export interface MacroPayload {
  name: string;
  args: any;
  contents?: string;
}

export interface MacroContext extends Omit<SugarCubeMacroContext, 'createShadowWrapper' | 'error' | 'payload'> {
  payload?: MacroPayload[] | null;
  error(msg: string): any;
  createShadowWrapper(callback: Function, doneCallback?: Function, startCallback?: Function): (...args: any[]) => void;
  passageObj?: any;
  lanListboxCache?: Record<string, { options: ListboxOption[]; selectedIdx: number }>;
}

export interface LinkArg {
  text: string;
  link?: string;
}

export interface StyleArgs {
  className: string;
  style: string;
  icon: string;
  iconOnly: boolean;
  convertMode: ConvertMode | null;
}

export interface ListboxOption {
  label: string;
  value: any;
  type: 'static' | 'dynamic';
  exprIndex?: number;
  convertMode: ConvertMode | null;
}

export function text(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return text(value());
  if (typeof value === 'object') {
    if (typeof value.label === 'string') return value.label;
    if (typeof value.name === 'string') return value.name;
    if (typeof value.text === 'string') return value.text;
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return '';
}

export function macroTranslation(key: any, core: MaplebirchCore = maplebirch): string {
  const source = text(key);
  if (!source) return '';
  const translation = core.t(source);
  if (translation[0] !== '[' || translation[translation.length - 1] !== ']') return translation;
  const auto = core.auto(source);
  if (auto !== source) return auto;
  if (!source.includes(' ')) return source;
  const words = source.split(' ');
  const translated = words.map(word => core.auto(word));
  if (translated.some((word, index) => word !== words[index])) return core.Language === 'CN' ? translated.join('') : translated.join(' ');
  return source;
}

export function readStyle(args: any[], start = 1): StyleArgs {
  let className = '';
  let style = '';
  let icon = '';
  let iconOnly = false;
  let convertMode: ConvertMode | null = null;
  for (let i = start; i < args.length; i++) {
    const arg = args[i];
    if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
      if (typeof arg.class === 'string') className = arg.class;
      if (typeof arg.style === 'string') style = arg.style;
      if (typeof arg.icon === 'string') icon = arg.icon;
      if (arg.iconOnly === true || arg.iconOnly === 'true') iconOnly = true;
      continue;
    }
    if (typeof arg !== 'string') continue;
    if (arg === 'icon-only') {
      iconOnly = true;
      continue;
    }
    if (arg.startsWith('class:')) {
      className = arg.slice(6);
      continue;
    }
    if (arg.startsWith('style:')) {
      style = arg.slice(6);
      continue;
    }
    if (arg.startsWith('icon:')) {
      icon = arg.slice(5);
      continue;
    }
    if (!convertMode && (CONVERT_MODES as readonly string[]).includes(arg)) convertMode = arg as ConvertMode;
  }
  return { className, style, icon, iconOnly, convertMode };
}

export function isStyleArg(arg: string): boolean {
  return arg === 'icon-only' || arg.startsWith('class:') || arg.startsWith('style:') || arg.startsWith('icon:') || (CONVERT_MODES as readonly string[]).includes(arg);
}

export function translatedText(source: string, convertMode: ConvertMode | null): string {
  const value = macroTranslation(source, maplebirch);
  return convertMode ? value.convert(convertMode) : value;
}

export function appendMacroIcon($target: JQuery, icon: string): void {
  if (icon) $target.append(jQuery(document.createElement('img')).attr({ src: icon, alt: '' }));
}

export function addClasses($target: JQuery, className: string): void {
  if (!className) return;
  for (const cls of className.split(/\s+/)) if (cls.trim()) $target.addClass(cls.trim());
}

export function bindLanguageUpdate($target: JQuery, key: string, update: () => void): void {
  setup.maplebirch?.language?.add(key, update);
  $target.on('remove', () => setup.maplebirch?.language?.remove(key, update));
}

export function wiki($container: JQuery, content: string): void {
  $container.empty();
  if (!content) return;
  const fragment = document.createDocumentFragment();
  new maplebirch.SugarCube.Wikifier(fragment, content);
  $container.append(fragment);
  Links.generate();
}
