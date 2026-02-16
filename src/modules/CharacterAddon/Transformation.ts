// ./src/modules/CharacterAddon/Transformation.ts

import { createlog } from '../../core';
import maplebirch from '../../core';
import { Translation } from '../../services/LanguageManager';
import Character from '../Character';

interface Part {
  name: string;
  tfRequired: number;
  [x: string]: any;
  default?: string;
}

interface EntryOptions {
  build?: number;
  level?: number;
  update?: number[];
  icon?: string;
  message?: { [lang: string]: { up: string[]; down: string[] } };
  decay?: boolean;
  decayConditions?: (() => boolean)[];
  suppress?: boolean;
  suppressConditions?: ((sourceName: string) => boolean)[];
  pre?: Function;
  post?: Function;
  layers?: any;
  translations?: Map<string, Translation>;
}

interface TransformationOption {
  parts: Part[];
  traits?: Part[];
  decay?: boolean;
  decayConditions?: (() => boolean)[];
  suppress?: boolean;
  suppressConditions?: ((sourceName: string) => boolean)[];
  pre?: Function;
  post?: Function;
  layers?: any;
  translations?: Map<string, Translation>;
}

interface TransformData {
  level: number;
  build: number;
}

class Entry {
  type: string;
  parts: Part[];
  traits?: Part[];
  build: number;
  level: number;
  update?: number[];
  icon?: string;
  message?: { [lang: string]: { up: string[]; down: string[] } };

  constructor(type: string, parts: Part[], traits?: Part[], options?: EntryOptions) {
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
  private log: ReturnType<typeof createlog>;
  private config: Map<string, Entry> = new Map();
  // prettier-ignore
  readonly decayConditions: { [key: string]: Array<() => boolean> } = {
    wolf: [
      () => V.wolfbuild >= 1,
      () => V.worn.neck.name !== 'spiked collar',
      () => V.worn.neck.name !== 'spiked collar with leash',
      () => playerNormalPregnancyType() !== 'wolf'
    ],
    cat: [
      () => V.catbuild >= 1,
      () => V.worn.neck.name !== 'cat bell collar',
      () => playerNormalPregnancyType() !== 'cat'
    ],
    cow: [
      () => V.cowbuild >= 1,
      () => V.worn.neck.name !== 'cow bell',
      () => playerNormalPregnancyType() !== 'cow'
    ],
    bird: [
      () => V.birdbuild >= 1,
      () => V.worn.head.name !== 'feathered hair clip',
      () => V.worn.neck.name !== 'feather necklace',
      () => playerNormalPregnancyType() !== 'hawk'
    ],
    fox: [
      () => V.foxbuild >= 1,
      () => V.worn.head.name !== 'spirit mask',
      () => V.worn.neck.name !== 'jasper pendant',
      () => playerNormalPregnancyType() !== 'fox'
    ]
  };

  // prettier-ignore
  readonly suppressConditions: { [key: string]: Array<(sourceName: string) => boolean> } = {
    wolf: [
      (sourceName: string) => sourceName !== 'wolf',
      () => V.worn.neck.name !== 'spiked collar',
      () => V.worn.neck.name !== 'spiked collar with leash'
    ],
    cat: [
      (sourceName: string) => sourceName !== 'cat',
      () => V.worn.neck.name !== 'cat bell collar'
    ],
    cow: [
      (sourceName: string) => sourceName !== 'cow',
      () => V.worn.neck.name !== 'cow bell'
    ],
    bird: [
      (sourceName: string) => sourceName !== 'bird',
      () => V.worn.head.name !== 'feathered hair clip',
      () => V.worn.neck.name !== 'feather necklace'
    ],
    fox: [
      (sourceName: string) => sourceName !== 'fox',
      () => V.worn.head.name !== 'spirit mask',
      () => V.worn.neck.name !== 'jasper pendant'
    ]
  };

  constructor(private manager: Character) {
    this.log = manager.log;
    manager.core.once(':storyready', () => {
      manager.core.tool.macro.define('transform', (name: string, change: number) => this._transform(name, change));
      manager.core.tool.macro.define('transformationAlteration', () => this._transformationAlteration());
      manager.core.tool.macro.define('transformationStateUpdate', () => this._transformationStateUpdate());
    });
  }

  #wikifier(widget: string, ...args: any[]): any {
    return this.manager.core.SugarCube.Wikifier.wikifyEval('<<' + widget + (args.length ? ' ' + args.join(' ') : '') + '>>');
  }

  async modifyEffect(manager: any): Promise<void> {
    const oldSCdata = manager.gSC2DataManager.getSC2DataInfoAfterPatch();
    const SCdata = oldSCdata.cloneSC2DataInfo();
    const file = SCdata.scriptFileItems.getByNameWithOrWithoutPath('effect.js');
    const replacements: [RegExp, string][] = [
      [
        /errors\.pushUnique\(messageKey\);/g,
        'if (maplebirch.char.transformation.message(messageKey, { element: element, sWikifier: sWikifier, fragment: fragment, wikifier: wikifier })) break;\n\t\t\t\t\terrors.pushUnique(messageKey);'
      ]
    ];
    file.content = manager.replace(file.content, replacements);
    manager.addonReplacePatcher.gModUtils.replaceFollowSC2DataInfo(SCdata, oldSCdata);
  }

  add(name: string, type: string, options: TransformationOption): this {
    const entry = new Entry(type, options.parts, options.traits, options);
    this.config.set(name, entry);

    if (type === 'physical' && options.decay !== false && !this.decayConditions[name]) {
      this.decayConditions[name] = options.decayConditions ?? [() => V.maplebirch.transformation[name].build >= 1];
    }

    if (type === 'physical' && options.suppress !== false && !this.suppressConditions[name]) {
      this.suppressConditions[name] = options.suppressConditions ?? [(sourceName: string) => sourceName !== name];
    }

    if (options.pre && typeof options.pre === 'function') this.manager.use('pre', options.pre);
    if (options.post && typeof options.post === 'function') this.manager.use('post', options.post);
    if (options.layers && typeof options.layers === 'object') this.manager.use(options.layers);

    if (typeof options.translations === 'object') {
      for (const key in options.translations) {
        if (options.translations.hasOwnProperty(key)) {
          try {
            this.manager.core.lang.translations.set(key, options.translations[key]);
          } catch (error: any) {
            this.log(`设置翻译键失败: ${key} - ${error.message}`, 'ERROR');
          }
        }
      }
    }

    return this;
  }

  inject(): void {
    this._update();
    this._clear();
  }

  _update(): void {
    const base = setup.transformations;
    const injected: Array<{ name: string; [x: string]: any }> = [];
    const baseNames = new Set<string>();

    for (const tf of base) {
      if (tf?.name) baseNames.add(tf.name === 'fallenangel' ? 'fallenAngel' : tf.name);
    }

    for (const [name, entry] of this.config) {
      if (!entry?.type) continue;
      injected.push({
        name,
        get level() {
          return V.maplebirch?.transformation?.[name]?.level ?? 0;
        },
        get build() {
          return V.maplebirch?.transformation?.[name]?.build ?? 0;
        },
        type: entry.type + 'Transform',
        parts: entry.parts || [],
        traits: entry.traits || []
      });
    }

    setup.transformations = [...base, ...injected.filter(t => !baseNames.has(t.name))];
    V.maplebirch.transformation ??= {};

    if (!V.transformationParts) V.transformationParts = {};
    if (!V.transformationParts.traits) V.transformationParts.traits = {};

    const collectNames = (list: any[]): string[] => {
      if (!Array.isArray(list)) return [];
      return list.map(p => p?.name).filter(Boolean);
    };

    for (const [name, entry] of this.config) {
      if (!V.maplebirch.transformation[name]) V.maplebirch.transformation[name] = { level: 0, build: 0 };

      if (entry.parts?.length) {
        if (!V.transformationParts[name]) V.transformationParts[name] = {};
        const original = V.transformationParts[name];
        for (const partName of collectNames(entry.parts)) if (!(partName in original)) V.transformationParts[name][partName] = 'disabled';
      }

      if (entry.traits?.length) {
        if (!V.transformationParts.traits) V.transformationParts.traits = {};
        const original = V.transformationParts.traits;
        for (const traitName of collectNames(entry.traits)) if (!(traitName in original)) V.transformationParts.traits[traitName] = 'disabled';
      }
    }
  }

  _clear(): void {
    const valid = { names: new Set<string>(), traits: new Set<string>() };

    if (Array.isArray(setup.transformations)) {
      setup.transformations.forEach((t: { name?: any; traits?: Array<{ name: any }> }) => {
        if (t?.name) valid.names.add(t.name === 'fallenangel' ? 'fallenAngel' : t.name);
        t?.traits?.forEach((trait: { name: any }) => trait?.name && valid.traits.add(trait.name));
      });
    }

    if (V.maplebirch?.transformation) {
      Object.keys(V.maplebirch.transformation).forEach(name => {
        if (!valid.names.has(name)) delete V.maplebirch.transformation[name];
      });
    }

    if (V.transformationParts) {
      Object.keys(V.transformationParts).forEach(name => {
        if (name === 'traits') return;
        if (!valid.names.has(name)) delete V.transformationParts[name];
      });

      if (V.transformationParts.traits) {
        Object.keys(V.transformationParts.traits).forEach(trait => {
          if (!valid.traits.has(trait)) delete V.transformationParts.traits[trait];
        });
      }
    }
  }

  #suppress(name: string, change: number): void {
    const absChange = Math.abs(change);
    for (const [target, conditions] of Object.entries(this.suppressConditions)) {
      if (target === name) continue;
      if (conditions.every((condition: (sourceName: string) => boolean) => condition(name))) this._transform(target, -absChange);
    }
  }

  _transform(name: string, change: number): void {
    if (!change) return;

    let _type = '';
    if (Array.isArray(setup.transformations)) {
      const transformation = setup.transformations.find((t: { name: string }) => t.name === name);
      if (transformation) _type = transformation.type;
    }

    // prettier-ignore
    switch (name) {
      case 'wolf'  : V.wolfbuild   = Math.clamp(V.wolfbuild + change, 0, 100); break;
      case 'cat'   : V.catbuild    = Math.clamp(V.catbuild + change, 0, 100); break;
      case 'cow'   : V.cowbuild    = Math.clamp(V.cowbuild + change, 0, 100); break;
      case 'bird'  : V.birdbuild   = Math.clamp(V.birdbuild + change, 0, 100); break;
      case 'fox'   : V.foxbuild    = Math.clamp(V.foxbuild + change, 0, 100); break;
      case 'angel' : V.angelbuild  = Math.clamp(V.angelbuild + change, 0, 100); break;
      case 'fallen': V.fallenbuild = Math.clamp(V.fallenbuild + change, 0, 100); break;
      case 'demon' : V.demonbuild  = Math.clamp(V.demonbuild + change, 0, 100); break;
      default: 
        const config = this.config.get(name);
        if (config) {
          V.maplebirch.transformation[name].build = Math.clamp(
            V.maplebirch.transformation[name].build + change, 0, config.build
          );
        }
        break;
    }

    if (this.suppressConditions.hasOwnProperty(name) && change > 0 && !(V.worn.neck.name === 'familiar collar' && V.worn.neck.cursed === 1)) this.#suppress(name, change);
  }

  updateTransform(name: string): void {
    const entry = this.config.get(name);
    if (!entry) return;

    const Build = V.maplebirch?.transformation?.[name]?.build ?? 0;
    const Level = V.maplebirch?.transformation?.[name]?.level ?? 0;
    const maxLevel = entry.level ?? 6;

    if (Array.isArray(entry.update)) {
      const thresholds = entry.update;
      if (Level < maxLevel && Build >= thresholds[Level]) {
        V.maplebirch.transformation[name].level = Level + 1;
        this._updateParts(name, Level, Level + 1);
        if (V.timeMessages && !V.timeMessages.includes(`${name}Up${Level + 1}`)) V.timeMessages.push(`${name}Up${Level + 1}`);
      } else if (Level > 0 && Build < thresholds[Level - 1]) {
        V.maplebirch.transformation[name].level = Level - 1;
        this._updateParts(name, Level, Level - 1);
        if (V.timeMessages && !V.timeMessages.includes(`${name}Down${Level}`)) V.timeMessages.push(`${name}Down${Level}`);
      }
    }
  }

  _updateParts(name: string, oldLevel: number, newLevel: number): void {
    const entry = this.config.get(name);
    if (!entry || !entry.parts) return;

    V.transformationParts[name] ??= {};

    for (const part of entry.parts) {
      if (!part.name || part.tfRequired === undefined) continue;
      if (newLevel >= part.tfRequired) {
        V.transformationParts[name][part.name] = part.default || 'default';
      } else if (oldLevel >= part.tfRequired) {
        V.transformationParts[name][part.name] = 'disabled';
      }
    }

    if (entry.traits) {
      V.transformationParts.traits ??= {};
      for (const trait of entry.traits) {
        if (!trait.name || trait.tfRequired === undefined) continue;
        if (newLevel >= trait.tfRequired) {
          V.transformationParts.traits[trait.name] = 'default';
        } else if (oldLevel >= trait.tfRequired) {
          V.transformationParts.traits[trait.name] = 'disabled';
        }
      }
    }
  }

  _transformationAlteration(): void {
    // 神圣转化
    if (V.settings.transformDivineEnabled) {
      if ((V.demonbuild >= 5 && V.specialTransform !== 1) || (V.demon >= 1 && V.specialTransform === 1)) {
        this.#wikifier('demonTransform', V.demon);
      } else if ((V.angelbuild >= 5 && V.specialTransform !== 1) || (V.angel >= 1 && V.specialTransform === 1)) {
        this.#wikifier('angelTransform', V.angel);
      } else if (V.fallenangel >= 2) {
        this.#wikifier('fallenButNotOut', V.fallenangel);
      }
    }

    // 动物转化
    if (V.settings.transformAnimalEnabled) {
      const transforms: Array<{ name: string; level: number; build: number }> = [
        { name: 'wolf', level: V.wolfgirl, build: V.wolfbuild },
        { name: 'cat', level: V.cat, build: V.catbuild },
        { name: 'cow', level: V.cow, build: V.cowbuild },
        { name: 'bird', level: V.harpy, build: V.birdbuild },
        { name: 'fox', level: V.fox, build: V.foxbuild }
      ];

      for (const [name, entry] of this.config) {
        if (entry.type === 'physical') {
          transforms.push({
            name,
            level: V.maplebirch?.transformation?.[name]?.level ?? 0,
            build: V.maplebirch?.transformation?.[name]?.build ?? 0
          });
        }
      }

      const maxLevel = Math.max(...transforms.map(t => t.level));
      let selected: { name: string; level: number; build: number } | null = null;

      if (maxLevel > 0) {
        const highest = transforms.filter(t => t.level === maxLevel);
        selected = highest[0];
      } else {
        const maxBuild = Math.max(...transforms.map(t => t.build));
        if (maxBuild >= 5) {
          const highest = transforms.filter(t => t.build === maxBuild);
          if (highest.length === 1) selected = highest[0];
        }
      }

      if (selected) {
        // prettier-ignore
        const vanilla: { [key: string]: [string, number] } = {
          'wolf': ['wolfTransform', V.wolfgirl],
          'cat' : ['catTransform', V.cat],
          'cow' : ['cowTransform', V.cow],
          'bird': ['harpyTransform', V.harpy],
          'fox' : ['foxTransform', V.fox]
        };

        if (vanilla[selected.name]) {
          const [macro, level] = vanilla[selected.name];
          this.#wikifier(macro, level);
        } else {
          this.updateTransform(selected.name);
        }
      }
    }

    // 其它类型
    for (const [name, entry] of this.config) {
      if (entry.type === 'physical') continue;
      this.updateTransform(name);
    }
  }

  _transformationStateUpdate(): void {
    // 0.5.6：眷属项圈检查
    if (!(V.worn.neck.name === 'familiar collar' && V.worn.neck.cursed === 1)) {
      Object.entries(this.decayConditions).forEach(([animal, conditions]) => {
        if (conditions.every((condition: () => boolean) => condition())) this._transform(animal, -1);
      });
    }

    if (V.wolfgirl >= 6) this.#wikifier('def', 5);

    this._transformationAlteration();

    V.physicalTransform =
      V.cat > 0 ||
      V.wolfgirl > 0 ||
      V.cow > 0 ||
      V.harpy > 0 ||
      V.fox > 0 ||
      Array.from(this.config.entries()).some(([name, entry]) => entry.type === 'physical' && (V.maplebirch?.transformation?.[name]?.level ?? 0) > 0)
        ? 1
        : 0;

    if ((V.physicalTransform === 1 || V.specialTransform === 1) && !(V.hypnosis_traits?.peace && V.settings.hypnosisEnabled)) {
      this.#handleHiddenTransformParts();
    }

    // 0.5.6 转化历史
    for (const tf of ['angel', 'fallenangel', 'demon', 'dryad', 'wolfgirl', 'cat', 'cow', 'harpy', 'fox']) {
      const level = V[tf as keyof typeof V] as number;
      const max = tf === 'fallenangel' ? 2 : 6;
      if (level >= max) {
        if (!V.transformationHistory) V.transformationHistory = [];
        if (!V.transformationHistory.includes(tf)) V.transformationHistory.push(tf);
      }
    }

    for (const [name, entry] of this.config) {
      const level = V.maplebirch?.transformation?.[name]?.level ?? 0;
      const max = entry.level ?? 6;
      if (level >= max) {
        if (!V.transformationHistory) V.transformationHistory = [];
        if (!V.transformationHistory.includes(name)) V.transformationHistory.push(name);
      }
    }
  }

  #handleHiddenTransformParts(): void {
    let excludeWings = false;

    if (V.harpy >= 6 && V.transformationParts.bird?.wings !== 'hidden') {
      if (V.angel >= 6 && V.transformationParts.angel?.wings !== 'hidden') excludeWings = true;
      if (V.fallenangel >= 2 && V.transformationParts.fallenAngel?.wings !== 'hidden') excludeWings = true;
      if (V.demon >= 6 && V.transformationParts.demon?.wings !== 'hidden') excludeWings = true;

      if (!excludeWings) {
        for (const [name, entry] of this.config) {
          const wingsPart = entry.parts?.find(p => p.name === 'wings');
          if (!wingsPart) continue;
          const level = V.maplebirch?.transformation?.[name]?.level ?? 0;
          if (level < wingsPart.tfRequired) continue;
          if (V.transformationParts[name]?.wings !== 'hidden') {
            excludeWings = true;
            break;
          }
        }
      }
    }

    for (const key in V.transformationParts) {
      if (key === 'traits') continue;
      const parts = V.transformationParts[key];
      if (!parts) continue;

      for (const [label, value] of Object.entries(parts as { [key: string]: any })) {
        if (value !== 'hidden' || ['pubes', 'pits'].includes(label)) continue;
        if (label === 'wings' && excludeWings) continue;

        if (V.panicattacks >= 2) {
          V.transformationParts[key][label] = 'default';
          V.effectsmessage = 1;
          V.hiddenTransformMessage = 1;
        } else {
          this.#wikifier('trauma', 15);
          V.effectsmessage = 1;
          V.hiddenTransformMessage = 2;
        }
      }
    }
  }

  message(key: string, tools: { element: (tag: string, text: any, className?: string) => void; wikifier: (macro: string, param: string) => void }): boolean {
    const match = key.match(/^([a-z]+)(Up|Down)(\d+)$/i);
    if (!match) return false;

    const [, name, direction, levelStr] = match;
    const level = parseInt(levelStr);
    const entry = this.config.get(name);

    if (!entry || !entry.message) return false;

    const lang = maplebirch.Language as string;
    if (!entry.message[lang]) return false;

    const messageArray = entry.message[lang][direction.toLowerCase() as 'up' | 'down'];
    if (!messageArray) return false;

    const index = direction === 'Up' ? level - 1 : level;
    if (index < 0 || index >= messageArray.length) return false;

    const messageText = messageArray[index];
    if (!messageText) return false;

    tools.element('span', messageText, 'gold');

    if (direction === 'Up' && level === entry.level) {
      const featName = name.charAt(0).toUpperCase() + name.slice(1);
      tools.wikifier('earnFeat', `'${featName}'`);
    }

    return true;
  }

  get icon(): string {
    const activeTfs = setup.transformations.filter((tf: { parts: any[]; level: number }) => tf.parts?.some((part: any) => tf.level >= part.tfRequired));

    if (activeTfs.length === 0) return '<<tficon "angel">>';

    let highestTf = activeTfs[0];
    for (let i = 1; i < activeTfs.length; i++) if (activeTfs[i].level > highestTf.level) highestTf = activeTfs[i];

    const tfName = highestTf.name;
    for (const [name, entry] of this.config) if (name === tfName && entry?.icon) return `<<icon '${entry.icon}'>>`;

    return `<<tficon '${tfName}'>>`;
  }

  setTransform(name: string, level: number | null): void {
    const entry = this.config.get(name);
    if (!entry) return;

    const data: TransformData = V.maplebirch?.transformation?.[name];
    if (!data) return;

    const maxLevel = entry.level ?? 6;
    const oldLevel = data.level ?? 0;
    let newLevel: number, newBuild: number;

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
}

export default Transformation;
