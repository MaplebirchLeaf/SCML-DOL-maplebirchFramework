// ./src/modules/CharacterAddon/Transformation.ts

import Diagnostics from '../../infra/Diagnostics';
import maplebirch from '../../core';
import type { ScopedLog } from '../../infra/Diagnostics';
import type { Translation } from '../../services/Translator';
import type AddonPlugin from '../../services/AddonPlugin';
import type { Replacement } from '../../host/ModLoader';
import type Character from '../Character';
import {
  AnimalMacros,
  AnimalTransforms,
  DecayConditions,
  HistoryTransforms,
  SuppressConditions,
  BuildUpdaters,
  type NativeMacroMap,
  type DecayCondition,
  type SuppressCondition,
  type BuildUpdater
} from './TransformationConfig';
import DoLPcompat from '../../compat/DoLPcompat';
import dol from '../../host/DoL';

interface Part {
  name: string;
  tfRequired: number;
  default?: string;
  [key: string]: any;
}

interface TransformData {
  level: number;
  build: number;
}

type TransformHook = (options: any, model?: CanvasModel) => void;
type TransformMessage = Record<string, { up: string[]; down: string[] }>;
type TranslationInput = Record<string, Translation> | Map<string, Translation>;

interface EntryOptions {
  build?: number;
  level?: number;
  update?: number[];
  icon?: string;
  message?: TransformMessage;
  decay?: boolean;
  decayConditions?: DecayCondition[];
  suppress?: boolean;
  suppressConditions?: SuppressCondition[];
  pre?: TransformHook;
  post?: TransformHook;
  layers?: CanvasLayerMap;
  translations?: TranslationInput;
}

interface TransformationOption extends EntryOptions {
  parts: Part[];
  traits?: Part[];
}

class Entry {
  public type: string;
  public parts: Part[];
  public traits?: Part[];
  public build: number;
  public level: number;
  public update?: number[];
  public icon?: string;
  public message?: TransformMessage;

  public constructor(type: string, parts: Part[], traits?: Part[], options?: EntryOptions) {
    this.type = type;
    this.parts = parts;
    this.traits = traits;
    this.build = options?.build ?? 100;
    this.level = options?.level ?? 6;
    this.update = options?.update;
    this.icon = options?.icon;
    this.message = options?.message;
  }
}

class Transformation {
  private get log(): ScopedLog {
    return this.manager.log;
  }
  private config: Map<string, Entry> = new Map();
  public readonly decayConditions: Record<string, DecayCondition[]> = { ...DecayConditions };
  public readonly suppressConditions: Record<string, SuppressCondition[]> = { ...SuppressConditions };
  public readonly buildUpdaters: Record<string, BuildUpdater> = { ...BuildUpdaters };

  public constructor(private manager: Character) {
    manager.core.once(':storyready', () => {
      if (DoLPcompat.isDoLP) {
        Object.cover(this.decayConditions, DoLPcompat.Transformations.DecayConditions);
        Object.cover(this.suppressConditions, DoLPcompat.Transformations.SuppressConditions);
        Object.cover(this.buildUpdaters, DoLPcompat.Transformations.BuildUpdaters);
      }
      manager.core.tool.macro.define('transform', (name: string, change: number) => this._transform(name, change));
      manager.core.tool.macro.defineS('transform-hint', (name: string, colour: string) => {
        if (dol.variables.settings?.blindStatsEnabled) return;
        const fragment = document.createDocumentFragment();
        const label = document.createElement('span');
        label.className = colour;
        label.textContent = manager.core.t(name);
        fragment.append(' | ', label);
        return fragment;
      });
      manager.core.tool.macro.define('transformationAlteration', () => this._transformationAlteration());
      manager.core.tool.macro.define('transformationStateUpdate', () => this._transformationStateUpdate());
    });
  }

  private get isDoLP() {
    return DoLPcompat.isDoLP;
  }

  private get animalTransforms() {
    return this.isDoLP ? [...AnimalTransforms, ...DoLPcompat.Transformations.AnimalTransforms] : AnimalTransforms;
  }

  private get animalMacros(): NativeMacroMap {
    return this.isDoLP ? (Object.cover({}, AnimalMacros, DoLPcompat.Transformations.AnimalMacros) as NativeMacroMap) : AnimalMacros;
  }

  private get historyTransforms() {
    return this.isDoLP ? [...HistoryTransforms, ...DoLPcompat.Transformations.HistoryTransforms] : HistoryTransforms;
  }

  public wikifier(widget: string, ...args: any[]): any {
    return this.manager.core.host.sugarcube.require().Wikifier.wikifyEval(`<<${widget}${args.length ? ` ${args.join(' ')}` : ''}>>`);
  }

  public modifyEffect(manager: AddonPlugin): void {
    const oldSCdata = manager.SC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const file = SCdata.scriptFileItems.getByNameWithOrWithoutPath('effect.js')!;
    const replacements: Replacement[] = [
      [
        /(errors\.pushUnique\(messageKey\);)/g,
        'if (maplebirch.char.transformation.message(messageKey, { element: element, sWikifier: sWikifier, fragment: fragment, wikifier: wikifier })) break;\n\t\t\t\t\t$1'
      ]
    ];
    file.content = manager.replace(file.content, replacements, 'Effect');
    manager.modUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
  }

  public add(name: string, type: string, options: TransformationOption): this {
    const entry = new Entry(type, options.parts, options.traits, options);
    this.config.set(name, entry);

    if (type === 'physical' && options.decay !== false && !this.decayConditions[name])
      this.decayConditions[name] = options.decayConditions ?? [() => dol.variables.maplebirch?.transformation?.[name]?.build >= 1];
    if (type === 'physical' && options.suppress !== false && !this.suppressConditions[name])
      this.suppressConditions[name] = options.suppressConditions ?? [(sourceName: string) => sourceName !== name];

    if (options.pre) this.manager.use('pre', options.pre, 'main');
    if (options.post) this.manager.use('post', options.post, 'main');
    if (options.layers) this.manager.use(options.layers, 'main', { pet: true });

    if (options.translations) {
      const translations = options.translations instanceof Map ? options.translations.entries() : Object.entries(options.translations);
      for (const [key, value] of translations) {
        try {
          this.manager.core.services.translator.set(key, value);
        } catch (error) {
          this.log(`设置翻译键失败: ${key} - ${Diagnostics.message(error)}`, 'ERROR');
        }
      }
    }

    return this;
  }

  public inject(): void {
    this._update();
    this.state();
  }

  private _update(): void {
    const base = Array.isArray(dol.setup.transformations)
      ? dol.setup.transformations.filter((tf: { name?: string }) => {
          if (!tf?.name) return true;
          const name = tf.name === 'fallenangel' ? 'fallenAngel' : tf.name;
          return !this.config.has(name);
        })
      : [];
    const baseNames = new Set<string>();

    for (const tf of base) if (tf?.name) baseNames.add(tf.name === 'fallenangel' ? 'fallenAngel' : tf.name);
    const injected: Array<{ name: string; [key: string]: any }> = [];

    for (const [name, entry] of this.config) {
      if (!entry?.type) continue;
      injected.push({
        name,
        get level() {
          return dol.variables.maplebirch?.transformation?.[name]?.level ?? 0;
        },
        get build() {
          return dol.variables.maplebirch?.transformation?.[name]?.build ?? 0;
        },
        type: `${entry.type}Transform`,
        parts: entry.parts || [],
        traits: entry.traits || []
      });
    }

    const transformations = [...base, ...injected.filter(tf => !baseNames.has(tf.name))];
    dol.setup.transformations = this.isDoLP ? DoLPcompat.Transformations.merge(transformations) : transformations;
  }

  public state(): void {
    const collectNames = (list?: Part[]): string[] => {
      if (!Array.isArray(list)) return [];
      return list.map(part => part?.name).filter(Boolean);
    };

    for (const [name, entry] of this.config) {
      dol.variables.maplebirch.transformation[name] ??= { level: 0, build: 0 };
      if (entry.parts?.length) {
        dol.variables.transformationParts[name] ??= {};
        for (const partName of collectNames(entry.parts)) if (!(partName in dol.variables.transformationParts[name])) dol.variables.transformationParts[name][partName] = 'disabled';
      }
      if (entry.traits?.length) {
        dol.variables.transformationParts.traits ??= {};
        for (const traitName of collectNames(entry.traits)) if (!(traitName in dol.variables.transformationParts.traits)) dol.variables.transformationParts.traits[traitName] = 'disabled';
      }
    }
    this._clear();
  }

  private _clear(): void {
    const valid = {
      names: new Set<string>(),
      traits: new Set<string>()
    };

    if (Array.isArray(dol.setup.transformations)) {
      dol.setup.transformations.forEach((tf: { name?: any; traits?: Array<{ name: any }> }) => {
        if (tf?.name) valid.names.add(tf.name === 'fallenangel' ? 'fallenAngel' : tf.name);
        tf?.traits?.forEach((trait: { name: any }) => trait?.name && valid.traits.add(trait.name));
      });
    }

    if (this.isDoLP) DoLPcompat.Transformations.extend(valid);

    if (dol.variables.maplebirch?.transformation) {
      Object.keys(dol.variables.maplebirch.transformation).forEach(name => {
        if (!valid.names.has(name)) delete dol.variables.maplebirch.transformation[name];
      });
    }

    if (dol.variables.transformationParts) {
      Object.keys(dol.variables.transformationParts).forEach(name => {
        if (name === 'traits') return;
        if (!valid.names.has(name)) delete dol.variables.transformationParts[name];
      });

      if (dol.variables.transformationParts.traits) {
        Object.keys(dol.variables.transformationParts.traits).forEach(trait => {
          if (!valid.traits.has(trait)) delete dol.variables.transformationParts.traits[trait];
        });
      }
    }
  }

  private suppress(name: string, change: number): void {
    const absChange = Math.abs(change);
    for (const [target, conditions] of Object.entries(this.suppressConditions)) {
      if (target === name) continue;
      if (conditions.every(condition => condition(name))) this._transform(target, -absChange);
    }
  }

  public _transform(name: string, change: number): void {
    if (!change) return;

    if (this.isDoLP) change = DoLPcompat.Transformations.change(change);

    const updater = this.buildUpdaters[name];
    if (updater) {
      updater(change);
    } else {
      const config = this.config.get(name);
      const data = dol.variables.maplebirch?.transformation?.[name];
      if (config && data) data.build = Math.clamp(data.build + change, 0, config.build);
    }

    if (Object.hasOwn(this.suppressConditions, name) && change > 0 && !(dol.variables.worn.neck.name === 'familiar collar' && dol.variables.worn.neck.cursed === 1)) this.suppress(name, change);
  }

  public updateTransform(name: string): void {
    const entry = this.config.get(name);
    if (!entry) return;

    const data = dol.variables.maplebirch?.transformation?.[name];
    if (!data) return;
    const build = data.build ?? 0;
    const level = data.level ?? 0;
    const maxLevel = entry.level ?? 6;
    if (!Array.isArray(entry.update)) return;
    const thresholds = entry.update;
    if (level < maxLevel && build >= thresholds[level]) {
      data.level = level + 1;
      this._updateParts(name, level, level + 1);
      if (dol.variables.timeMessages && !dol.variables.timeMessages.includes(`${name}Up${level + 1}`)) dol.variables.timeMessages.push(`${name}Up${level + 1}`);
    } else if (level > 0 && build < thresholds[level - 1]) {
      data.level = level - 1;
      this._updateParts(name, level, level - 1);
      if (dol.variables.timeMessages && !dol.variables.timeMessages.includes(`${name}Down${level}`)) dol.variables.timeMessages.push(`${name}Down${level}`);
    }
  }

  public _updateParts(name: string, oldLevel: number, newLevel: number): void {
    const entry = this.config.get(name);
    if (!entry?.parts) return;

    dol.variables.transformationParts[name] ??= {};

    for (const part of entry.parts) {
      if (!part.name || part.tfRequired === undefined) continue;
      if (newLevel >= part.tfRequired) {
        dol.variables.transformationParts[name][part.name] = part.default || 'default';
      } else if (oldLevel >= part.tfRequired) {
        dol.variables.transformationParts[name][part.name] = 'disabled';
      }
    }

    if (!entry.traits) return;
    dol.variables.transformationParts.traits ??= {};
    for (const trait of entry.traits) {
      if (!trait.name || trait.tfRequired === undefined) continue;
      if (newLevel >= trait.tfRequired) {
        dol.variables.transformationParts.traits[trait.name] = trait.default || 'default';
      } else if (oldLevel >= trait.tfRequired) {
        dol.variables.transformationParts.traits[trait.name] = 'disabled';
      }
    }
  }

  public _transformationAlteration(): void {
    if (dol.variables.settings.transformDivineEnabled) {
      if ((dol.variables.demonbuild >= 5 && dol.variables.specialTransform !== 1) || (dol.variables.demon >= 1 && dol.variables.specialTransform === 1)) {
        this.wikifier('demonTransform', dol.variables.demon);
      } else if ((dol.variables.angelbuild >= 5 && dol.variables.specialTransform !== 1) || (dol.variables.angel >= 1 && dol.variables.specialTransform === 1)) {
        this.wikifier('angelTransform', dol.variables.angel);
      } else if (dol.variables.fallenangel >= 2) {
        this.wikifier('fallenButNotOut', dol.variables.fallenangel);
      }
    }

    if (dol.variables.settings.transformAnimalEnabled) {
      const transforms: Array<{ name: string; level: number; build: number }> = this.animalTransforms.map(transform => ({
        name: transform.name,
        level: transform.level(),
        build: transform.build()
      }));

      for (const [name, entry] of this.config) {
        if (entry.type !== 'physical') continue;
        transforms.push({
          name,
          level: dol.variables.maplebirch?.transformation?.[name]?.level ?? 0,
          build: dol.variables.maplebirch?.transformation?.[name]?.build ?? 0
        });
      }

      const maxLevel = Math.max(...transforms.map(transform => transform.level));
      let selected: { name: string; level: number; build: number } | null = null;

      if (maxLevel > 0) {
        selected = transforms.find(transform => transform.level === maxLevel) || null;
      } else {
        const maxBuild = Math.max(...transforms.map(transform => transform.build));

        if (maxBuild >= 5) {
          const highest = transforms.filter(transform => transform.build === maxBuild);
          if (highest.length === 1) selected = highest[0];
        }
      }

      if (selected) {
        const vanilla: Record<string, [string, number]> = Object.fromEntries(Object.entries(this.animalMacros).map(([name, [macro, level]]) => [name, [macro, level()]]));
        if (vanilla[selected.name]) {
          const [macro, level] = vanilla[selected.name];
          this.wikifier(macro, level);
        } else {
          this.updateTransform(selected.name);
        }
      }
    }

    for (const [name, entry] of this.config) {
      if (entry.type === 'physical') continue;
      this.updateTransform(name);
    }
  }

  public _transformationStateUpdate(): void {
    if (!(dol.variables.worn.neck.name === 'familiar collar' && dol.variables.worn.neck.cursed === 1)) {
      Object.entries(this.decayConditions).forEach(([_animal, conditions]) => {
        if (conditions.every(condition => condition())) this._transform(_animal, -1);
      });
    }

    if (this.isDoLP) DoLPcompat.Transformations.composite();

    if (dol.variables.wolfgirl >= 6) this.wikifier('def', 5);

    this._transformationAlteration();

    dol.variables.physicalTransform =
      this.animalTransforms.some(transform => transform.level() > 0) ||
      Array.from(this.config.entries()).some(([name, entry]) => entry.type === 'physical' && (dol.variables.maplebirch?.transformation?.[name]?.level ?? 0) > 0)
        ? 1
        : 0;

    if ((dol.variables.physicalTransform === 1 || dol.variables.specialTransform === 1) && !(dol.variables.hypnosis_traits?.peace && dol.variables.settings.hypnosisEnabled))
      this.handleHiddenTransformParts();

    for (const tf of this.historyTransforms) {
      const level = tf.level();
      if (level >= tf.max) {
        dol.variables.transformationHistory ??= [];
        if (!dol.variables.transformationHistory.includes(tf.name)) dol.variables.transformationHistory.push(tf.name);
      }
    }

    for (const [name, entry] of this.config) {
      const level = dol.variables.maplebirch?.transformation?.[name]?.level ?? 0;
      const max = entry.level ?? 6;
      if (level >= max) {
        dol.variables.transformationHistory ??= [];
        if (!dol.variables.transformationHistory.includes(name)) dol.variables.transformationHistory.push(name);
      }
    }
  }

  private handleHiddenTransformParts(): void {
    let excludeWings = false;

    if (dol.variables.harpy >= 6 && dol.variables.transformationParts.bird?.wings !== 'hidden') {
      if (dol.variables.angel >= 6 && dol.variables.transformationParts.angel?.wings !== 'hidden') excludeWings = true;
      if (dol.variables.fallenangel >= 2 && dol.variables.transformationParts.fallenAngel?.wings !== 'hidden') excludeWings = true;
      if (dol.variables.demon >= 6 && dol.variables.transformationParts.demon?.wings !== 'hidden') excludeWings = true;

      if (!excludeWings) {
        for (const [name, entry] of this.config) {
          const wingsPart = entry.parts?.find(part => part.name === 'wings');
          if (!wingsPart) continue;
          const level = dol.variables.maplebirch?.transformation?.[name]?.level ?? 0;
          if (level < wingsPart.tfRequired) continue;
          if (dol.variables.transformationParts[name]?.wings !== 'hidden') {
            excludeWings = true;
            break;
          }
        }
      }
    }

    for (const key in dol.variables.transformationParts) {
      if (key === 'traits') continue;
      const parts = dol.variables.transformationParts[key];
      if (!parts) continue;

      for (const [label, value] of Object.entries(parts as Record<string, any>)) {
        if (value !== 'hidden' || ['pubes', 'pits'].includes(label)) continue;
        if (label === 'wings' && excludeWings) continue;

        if (dol.variables.panicattacks >= 2) {
          dol.variables.transformationParts[key][label] = 'default';
          dol.variables.effectsmessage = 1;
          dol.variables.hiddenTransformMessage = 1;
        } else {
          this.wikifier('trauma', 15);
          dol.variables.effectsmessage = 1;
          dol.variables.hiddenTransformMessage = 2;
        }
      }
    }
  }

  public message(
    key: string,
    tools: {
      element: (tag: string, text: any, className?: string) => void;
      wikifier: (macro: string, param: string) => void;
    }
  ): boolean {
    const match = key.match(/^(.+?)(Up|Down)(\d+)$/);
    if (!match) return false;

    const [, name, direction, levelStr] = match;
    const level = parseInt(levelStr, 10);
    const entry = this.config.get(name);

    if (!entry?.message) return false;

    const lang = maplebirch.services.translator.language as string;
    const messageArray = entry.message[lang]?.[direction.toLowerCase() as 'up' | 'down'];

    if (!messageArray) return false;

    const messageText = messageArray[level - 1];
    if (!messageText) return false;

    tools.element('span', messageText, 'gold');

    if (direction === 'Up' && level === entry.level) {
      const featName = name.charAt(0).toUpperCase() + name.slice(1);
      tools.wikifier('earnFeat', `'${featName}'`);
    }

    return true;
  }

  public get icon(): string {
    if (!Array.isArray(dol.setup.transformations)) return '<<tficon "angel">>';
    const activeTfs = dol.setup.transformations.filter((tf: { parts?: any[]; level: number }) => tf.parts?.some((part: any) => tf.level >= part.tfRequired));
    if (activeTfs.length === 0) return '<<tficon "angel">>';
    let highestTf = activeTfs[0];
    for (let i = 1; i < activeTfs.length; i++) if (activeTfs[i].level > highestTf.level) highestTf = activeTfs[i];
    const tfName = highestTf.name;
    for (const [name, entry] of this.config) if (name === tfName && entry?.icon) return `<<iconUi '${entry.icon}'>>`;
    return `<<tficon '${tfName}'>>`;
  }

  public setTransform(name: string, level: number | null = null): void {
    const entry = this.config.get(name);
    if (!entry) return;

    const data: TransformData = dol.variables.maplebirch?.transformation?.[name];
    if (!data) return;

    const maxLevel = entry.level ?? 6;
    const oldLevel = data.level ?? 0;
    let newLevel: number;
    let newBuild: number;

    if (level == null) {
      newLevel = maxLevel;
    } else if (level <= 0) {
      newLevel = 0;
    } else {
      newLevel = Math.min(level, maxLevel);
    }

    if (newLevel === 0) {
      newBuild = 0;
    } else if (Array.isArray(entry.update) && newLevel > 0) {
      newBuild = entry.update[newLevel - 1];
    } else {
      newBuild = Math.round((newLevel / maxLevel) * (entry.build ?? 100));
    }

    data.level = newLevel;
    data.build = newBuild;
    this._updateParts(name, oldLevel, newLevel);
  }

  public part(partName: string): boolean {
    const transformations = dol.variables.transformationParts ?? {};
    return Object.entries(transformations).some(([name, parts]) => {
      if (name === 'traits' || !parts) return false;
      const value = (parts as Record<string, unknown>)[partName];
      return value !== undefined && value !== 'disabled';
    });
  }
}

export default Transformation;
