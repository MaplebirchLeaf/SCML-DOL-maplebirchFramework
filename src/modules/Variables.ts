// ./src/modules/Variables.ts

import maplebirch, { type MaplebirchCore } from '../core';
import type { ScopedLog } from '../infra/Diagnostics';
import { clone, mergefn as mergeFn } from '../utils';
import Diagnostics from '../infra/Diagnostics';
import dol from '../host/DoL';

const defaults = {
  player: {
    clothing: {}
  },
  npc: {},
  transformation: {}
};

type OptionsData = Record<string, any>;

function fillDefaults(target: OptionsData, defaults: OptionsData): OptionsData {
  const { isPlainObject } = maplebirch.host.modLoader.lodash;
  return mergeFn(target, (_key, value, _depth, current) => current === undefined || (isPlainObject(value) && isPlainObject(current)), clone(defaults));
}

class Options {
  public define(...args: any[]) {
    const options = ((dol.variables.options ??= {}).maplebirch ??= {}) as OptionsData;
    const defaults = args.pop();
    if (defaults == null) return;
    if (typeof defaults !== 'object') {
      const key = args[0];
      Variables.add(key, defaults);
      fillDefaults(options, { [key]: defaults });
      return options[key];
    }

    const entries = args.length ? args.map(key => [key, key in defaults ? defaults[key] : defaults]) : Object.entries(defaults);
    for (const [key, value] of entries) {
      Variables.add(key, value);
      fillDefaults(options, { [key]: value });
    }

    return options;
  }
}

interface Color {
  [0]: string;
  [key: number]: any;
}

interface HairStyleData {
  all?: { colors: Color[] };
  [key: string]: any;
}

interface HairGradientsReturn {
  fringe: Record<string, string[]>;
  sides: Record<string, string[]>;
}

function hairgradients(): HairGradientsReturn {
  if (!dol.setup.colours?.hairgradients_prototypes) return { fringe: {}, sides: {} };
  const data: HairGradientsReturn = { fringe: {}, sides: {} };
  const hg = dol.setup.colours.hairgradients_prototypes;
  for (const section of ['fringe', 'sides'] as const) {
    for (const [style, hairstyles] of Object.entries(hg[section] || {})) {
      const colors = (hairstyles as HairStyleData).all?.colors;
      if (colors) data[section][style] = colors.map(color => color[0]);
    }
  }
  return data;
}

class Variables {
  private static readonly OPTIONS_STORAGE_KEY = 'maplebirchFrameworkOptions';
  private static moduleOptions: OptionsData = {};

  public static add(key: string, value: any): void {
    const current = this.moduleOptions[key];
    if (maplebirch.host.modLoader.lodash.isPlainObject(value) && maplebirch.host.modLoader.lodash.isPlainObject(current)) {
      fillDefaults(current, value);
      return;
    }
    this.moduleOptions[key] = clone(value);
  }

  // prettier-ignore
  public static get options(): Record<string, any> {
    return {
      character: {
        mask     : 0,
        rotation : 0,
        pet      : { enabled: false, mask: 25, rotation: 0, scale: 1 },
        charArt  : { type: 'fringe' as const, select: 'low-ombre', value: clone(hairgradients()) },
        closeUp  : { type: 'fringe' as const, select: 'low-ombre', value: clone(hairgradients()) },
      },
      npcsidebar: {
        show         : false,
        model        : false,
        second_model : false,
        primary_npc  : '',
        secondary_npc: '',
        position     : 'back' as const,
        dxfn         : -48,
        dyfn         : -8,
        previous_dx  : -36,
        previous_dy  : -8,
        skin_type    : 'light',
        tan          : 0,
        facestyle    : 'default',
        facevariant  : 'default',
        freckles     : false,
        ears         : 'back',
        mask         : 30,
        rotation     : 0,
        pet          : { enabled: false, mask: 25, rotation: 0, scale: 1 },
        nnpc         : false,
        display      : {}
      },
      relationcount: 4,
      petLocked: false,

      ...clone(this.moduleOptions)
    };
  }

  public readonly tool: MaplebirchCore['tool'];
  public readonly log!: ScopedLog;
  public readonly options: Options;
  constructor(readonly core: MaplebirchCore) {
    this.tool = this.core.tool;
    this.options = new Options();
    this.core.once(':storyready', () => this.check());
    this.core.on(':rest-options', () => this.check());
  }

  public hairgradients = hairgradients;

  public optionsStorage(action: 'save' | 'restore' | 'reset' | 'load'): any | null {
    try {
      if (action === 'save') {
        localStorage.setItem(Variables.OPTIONS_STORAGE_KEY, JSON.stringify(dol.variables.options?.maplebirch ?? {}));
        return null;
      }

      if (action === 'reset') {
        localStorage.removeItem(Variables.OPTIONS_STORAGE_KEY);
        dol.variables.options ??= {};
        dol.variables.options.maplebirch = clone(Variables.options);
        return null;
      }

      const raw = localStorage.getItem(Variables.OPTIONS_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const saved = this.core.host.modLoader.lodash.isPlainObject(parsed) ? parsed : null;

      if (action === 'restore' && saved) {
        dol.variables.options ??= {};
        dol.variables.options.maplebirch = saved;
        this.check();
      }

      return saved;
    } catch (error) {
      this.log(`框架设置存储处理失败: ${Diagnostics.message(error)}`, 'WARN');
      return null;
    }
  }

  public check() {
    dol.variables.options ??= {};
    const current = this.core.host.modLoader.lodash.isPlainObject(dol.variables.options.maplebirch) ? dol.variables.options.maplebirch : this.optionsStorage('load');
    dol.variables.options.maplebirch = fillDefaults(current ?? {}, Variables.options);
  }

  public Init(): void {
    if (this.core.host.sugarcube.passage?.title === 'Start2') dol.variables.maplebirch = clone(defaults);
    this.loadInit();
  }

  public loadInit(): void {
    this.check();
    dol.variables.maplebirch = fillDefaults(dol.variables.maplebirch ?? {}, defaults);
    this.tool.patch.apply('state');
    void this.core.trigger(':variable');
    const widgets = this.tool.zone.play('State');
    if (widgets) new this.core.SugarCube.Wikifier(document.createDocumentFragment(), widgets);
  }

  public postInit(): void {
    this.check();
  }
}

export default Variables;
