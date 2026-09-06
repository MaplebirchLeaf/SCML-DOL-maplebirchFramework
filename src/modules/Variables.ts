// ./src/modules/Variables.ts

import { version } from '../constants';
import maplebirch, { MaplebirchCore, createlog } from '../core';
import migration from './Frameworks/migration';
import { clone } from '../utils';

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
    const options = ((V.options ??= {}).maplebirch ??= {}) as OptionsData;
    const defaults = args.pop();
    if (defaults == null) return;

    if (typeof defaults !== 'object') {
      options[args[0]] = defaults;
      return defaults;
    }

    if (args.length) {
      for (const key of args) if (key in defaults) options[key] = Object.merge(defaults[key], options[key] ?? {});
      return options;
    }

    Object.assign(options, defaults);
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
  if (!setup.colours?.hairgradients_prototypes) return { fringe: {}, sides: {} };
  const data: HairGradientsReturn = { fringe: {}, sides: {} };
  const hg = setup.colours.hairgradients_prototypes;
  for (const [style, hairstyles] of Object.entries(hg.fringe || {}))
    if ((hairstyles as HairStyleData).all?.colors) data.fringe[style] = (hairstyles as HairStyleData).all!.colors.map(color => color[0]);
  for (const [style, hairstyles] of Object.entries(hg.sides || {})) if ((hairstyles as HairStyleData).all?.colors) data.sides[style] = (hairstyles as HairStyleData).all!.colors.map(color => color[0]);
  return data;
}

class Variables {
  private static readonly OPTIONS_STORAGE_KEY = 'maplebirchFrameworkOptions';
  private static moduleOptions: OptionsData = {};

  public static add<T extends object>(key: string, options: T) {
    this.moduleOptions[key] = {
      ...this.moduleOptions[key],
      ...options
    };
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
        show       : false,
        model      : false,
        position   : 'back' as const,
        dxfn       : -48,
        dyfn       : -8,
        skin_type  : 'light',
        tan        : 0,
        facestyle  : 'default',
        facevariant: 'default',
        freckles   : false,
        ears       : 'back',
        mask       : 30,
        rotation   : 0,
        nnpc       : false,
        display    : {}
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

  public optionsStorage(action: 'save' | 'restore' | 'reset' | 'load'): any | null {
    try {
      if (action === 'save') {
        localStorage.setItem(Variables.OPTIONS_STORAGE_KEY, JSON.stringify(V.options?.maplebirch ?? {}));
        return null;
      }

      if (action === 'reset') {
        localStorage.removeItem(Variables.OPTIONS_STORAGE_KEY);
        V.options.maplebirch = clone(Variables.options);
        return null;
      }

      const raw = localStorage.getItem(Variables.OPTIONS_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const saved = this.core.lodash.isPlainObject(parsed) ? parsed : null;

      if (action === 'restore' && saved) {
        V.options.maplebirch = saved;
        this.check();
      }

      return saved;
    } catch (error: any) {
      this.log(`框架设置存储处理失败: ${error?.message || error}`, 'WARN');
      return null;
    }
  }

  public check() {
    V.options ??= {};
    const current = this.core.lodash.isPlainObject(V.options.maplebirch) ? V.options.maplebirch : this.optionsStorage('load');
    V.options.maplebirch = Object.merge(clone(Variables.options), current ?? {});
  }

  public Init(): void {
    try {
      V.maplebirch ??= {};
      if (this.tool.core.passage?.title === 'Start2') V.maplebirch = clone({ ...defaults, version: this.version });
    } catch (e: any) {
      this.log(`出现错误：${e?.message || e}`, 'ERROR');
    } finally {
      this.migration.run(V.maplebirch, this.version);
      $.wiki('<<maplebirchState>>');
    }
  }

  public loadInit() {
    try {
      V.maplebirch ??= {};
      this.check();
      this.migration.run(V.maplebirch, this.version);
      $.wiki('<<maplebirchState>>');
    } catch (e: any) {
      this.log(`读档迁移出错: ${e?.message || e}`, 'ERROR');
    }
  }

  public postInit() {
    if (V.maplebirch?.version !== this.version) this.migration.run(V.maplebirch, this.version);
  }
}

maplebirch.register('var', Object.seal(new Variables(maplebirch)), ['tool']);

export default Variables;
