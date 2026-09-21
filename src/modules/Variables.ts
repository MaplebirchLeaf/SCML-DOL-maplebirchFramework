// ./src/modules/Variables.ts

import { version } from '../constants';
import maplebirch, { MaplebirchCore, createlog } from '../core';
import migration from './Frameworks/migration';
import { clone } from '../utils';
import { errorMessage } from '../utils/error';
import dol from '../host/Adapter';

const defaults = {
  player: {
    clothing: {}
  },
  npc: {},
  transformation: {}
};

function dataUpdate(migration: migration): void {
  migration.add('*', version, (data, utils) => utils.fill(data, clone(defaults)));
}

type OptionsData = Record<string, any>;

class Options {
  public define(...args: any[]) {
    const options = ((dol.variables.options ??= {}).maplebirch ??= {}) as OptionsData;
    const defaults = args.pop();
    if (defaults == null) return;
    if (typeof defaults !== 'object') {
      const key = args[0];
      Variables.add(key, defaults);
      options[key] ??= clone(defaults);
      return options[key];
    }

    if (args.length) {
      for (const key of args) {
        if (key in defaults) {
          const value = defaults[key];
          Variables.add(key, value);
          if (maplebirch.lodash.isPlainObject(value) && maplebirch.lodash.isPlainObject(options[key])) {
            options[key] = Object.merge(clone(value), options[key]);
          } else {
            options[key] ??= clone(value);
          }
          continue;
        }
        Variables.add(key, defaults);
        options[key] = Object.merge(clone(defaults), options[key] ?? {});
      }
      return options;
    }

    for (const [key, value] of Object.entries(defaults)) {
      Variables.add(key, value);
      if (maplebirch.lodash.isPlainObject(value) && maplebirch.lodash.isPlainObject(options[key])) {
        options[key] = Object.merge(clone(value), options[key]);
      } else {
        options[key] ??= clone(value);
      }
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
  for (const [style, hairstyles] of Object.entries(hg.fringe || {}))
    if ((hairstyles as HairStyleData).all?.colors) data.fringe[style] = (hairstyles as HairStyleData).all!.colors.map(color => color[0]);
  for (const [style, hairstyles] of Object.entries(hg.sides || {})) if ((hairstyles as HairStyleData).all?.colors) data.sides[style] = (hairstyles as HairStyleData).all!.colors.map(color => color[0]);
  return data;
}

class Variables {
  private static readonly OPTIONS_STORAGE_KEY = 'maplebirchFrameworkOptions';
  private static moduleOptions: OptionsData = {};

  public static add(key: string, value: any): void {
    const current = this.moduleOptions[key];
    if (maplebirch.lodash.isPlainObject(value) && maplebirch.lodash.isPlainObject(current)) {
      this.moduleOptions[key] = Object.merge(clone(value), current);
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

      ...clone(this.moduleOptions)
    };
  }

  public version: string;
  public readonly tool: MaplebirchCore['tool'];
  public readonly log: ReturnType<typeof createlog>;
  public readonly migration: migration;
  public readonly options: Options;
  constructor(readonly core: MaplebirchCore) {
    this.version = version;
    this.tool = this.core.tool;
    this.log = createlog('var');
    this.migration = new this.tool.migration();
    this.options = new Options();
    dataUpdate(this.migration);
    this.core.once(':passageend', () => this.check());
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
        dol.variables.options.maplebirch = clone(Variables.options);
        return null;
      }

      const raw = localStorage.getItem(Variables.OPTIONS_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const saved = this.core.lodash.isPlainObject(parsed) ? parsed : null;

      if (action === 'restore' && saved) {
        dol.variables.options.maplebirch = saved;
        this.check();
      }

      return saved;
    } catch (error) {
      this.log(`框架设置存储处理失败: ${errorMessage(error)}`, 'WARN');
      return null;
    }
  }

  public check() {
    dol.variables.options ??= {};
    const current = this.core.lodash.isPlainObject(dol.variables.options.maplebirch) ? dol.variables.options.maplebirch : this.optionsStorage('load');
    dol.variables.options.maplebirch = Object.merge(clone(Variables.options), current ?? {});
  }

  public Init(): void {
    try {
      dol.variables.maplebirch ??= {};
      if (this.tool.core.passage?.title === 'Start2') dol.variables.maplebirch = clone({ ...defaults, version: this.version });
    } catch (error) {
      this.log(`出现错误：${errorMessage(error)}`, 'ERROR');
    } finally {
      this.migration.run(dol.variables.maplebirch, this.version);
      $.wiki('<<maplebirchState>>');
    }
  }

  public loadInit() {
    try {
      dol.variables.maplebirch ??= {};
      this.check();
      this.migration.run(dol.variables.maplebirch, this.version);
      $.wiki('<<maplebirchState>>');
    } catch (error) {
      this.log(`读档迁移出错: ${errorMessage(error)}`, 'ERROR');
    }
  }

  public postInit() {
    if (dol.variables.maplebirch?.version !== this.version) this.migration.run(dol.variables.maplebirch, this.version);
  }
}

maplebirch.register('var', Object.seal(new Variables(maplebirch)), ['tool']);

export default Variables;
