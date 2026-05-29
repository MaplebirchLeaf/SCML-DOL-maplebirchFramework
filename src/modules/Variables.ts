// ./src/modules/Variables.ts

import { clone, merge } from '../utils';
import maplebirch, { MaplebirchCore, createlog } from '../core';
import migration from './Frameworks/migration';

const version = '3.2.0';

const defaults = {
  player: {
    clothing: {}
  },
  npc: {},
  transformation: {}
};

function dataUpdate(migration: migration): void {
  migration.add('0.0.0', version, (data, utils) => utils.fill(data, clone(defaults)));
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

  // prettier-ignore
  static get options() {
		return {
			character: {
				mask     : 0,
        rotation : 0,
				charArt: { type: 'fringe' as const, select: 'low-ombre', value: clone(hairgradients()) },
				closeUp: { type: 'fringe' as const, select: 'low-ombre', value: clone(hairgradients()) },
			},
			npcsidebar: {
				show     : false,
				model    : false,
				position : 'back' as const,
				dxfn     : -48,
				dyfn     : -8,
				skin_type: 'light',
				tan      : 0,
				facestyle: 'default',
				facevariant: 'default',
				freckles : false,
				ears     : 'back',
				mask     : 0,
        rotation : 0,
				nnpc     : false,
				display  : {}
			},
			relationcount: 4,
			npcschedules : false,
		};
	}

  version: string;
  readonly tool: MaplebirchCore['tool'];
  readonly log: ReturnType<typeof createlog>;
  readonly migration: migration;
  hairgradients: () => HairGradientsReturn;

  constructor(readonly core: MaplebirchCore) {
    this.version = version;
    this.tool = this.core.tool;
    this.log = createlog('var');
    this.migration = new this.tool.migration();
    this.hairgradients = hairgradients;
    dataUpdate(this.migration);
    this.core.once(':passageend', () => this.optionsCheck());
    this.core.on(':rest-options', () => this.optionsCheck());
  }

  private mapProcessing() {
    Object.defineProperty(V.maplebirch.player, 'clothing', {
      get: () => V.worn,
      set: () => maplebirch.log('V.maplebirch.player.clothing 是 V.worn 的只读镜像。请直接修改 V.worn', 'WARN')
    });
  }

  public optionsStorage(action: 'save' | 'restore' | 'reset' | 'load'): any | null {
    try {
      if (action === 'save') {
        localStorage.setItem(Variables.OPTIONS_STORAGE_KEY, JSON.stringify(V.options?.maplebirch ?? {}));
        this.log('框架设置已保存', 'DEBUG');
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
        this.optionsCheck();
      }

      return saved;
    } catch (error: any) {
      this.log(`框架设置存储处理失败: ${error?.message || error}`, 'WARN');
      return null;
    }
  }

  public optionsCheck() {
    V.options ??= {};
    const current = this.core.lodash.isPlainObject(V.options.maplebirch) ? V.options.maplebirch : this.optionsStorage('load');
    V.options.maplebirch = merge({}, Variables.options, current ?? {}, { mode: 'merge' });
  }

  public Init() {
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
      this.optionsCheck();
      this.migration.run(V.maplebirch, this.version);
      $.wiki('<<maplebirchState>>');
    } catch (e: any) {
      this.log(`读档迁移出错: ${e?.message || e}`, 'ERROR');
    }
  }

  public postInit() {
    if (V.maplebirch?.version !== this.version) this.migration.run(V.maplebirch, this.version);
    this.mapProcessing();
  }
}

(function (maplebirch): void {
  'use strict';
  maplebirch.register('var', Object.seal(new Variables(maplebirch)), ['tool']);
})(maplebirch);

export default Variables;
