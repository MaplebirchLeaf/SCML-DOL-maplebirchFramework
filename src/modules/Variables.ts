// ./src/modules/Variables.ts

import { version } from '../constants';
import { clone, merge } from '../utils';
import maplebirch, { MaplebirchCore, createlog } from '../core';
import migration from './Frameworks/migration';

export const defaultVar = {
  player: {
    clothing: {}
  },
  npc: {},
  transformation: {}
};

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
  // prettier-ignore
  static get options() {
		return {
			character: {
				mask   : 0,
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
				nnpc     : false,
				display  : {}
			},
			relationcount: 4,
			npcschedules:  false
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
    this.core.once(':passageend', () => this.optionsCheck());
  }

  #mapProcessing() {
    Object.defineProperty(V.maplebirch.player, 'clothing', {
      get: () => V.worn,
      set: () => maplebirch.log('V.maplebirch.player.clothing 是 V.worn 的只读镜像。请直接修改 V.worn', 'WARN')
    });
  }

  optionsCheck() {
    if (!this.core.lodash.isPlainObject(V.options?.maplebirch)) {
      V.options.maplebirch = clone(Variables.options);
    } else {
      V.options.maplebirch = merge({}, Variables.options, V.options.maplebirch, {
        mode: 'merge',
        filterFn: (key: string, value: any, depth: number, targetValue: any) => {
          if (targetValue !== undefined && typeof value !== typeof targetValue) return false;
          return true;
        }
      });
    }
  }

  Init() {
    try {
      if (this.tool.core.passage?.title === 'Start2') V.maplebirch = clone({ ...defaultVar, version: this.version });
    } catch (e: any) {
      this.log(`出现错误：${e?.message || e}`, 'ERROR');
    } finally {
      this.migration.run(V.maplebirch, this.version);
      $.wiki('<<maplebirchState>>');
    }
  }

  loadInit() {
    try {
      this.optionsCheck();
      this.migration.run(V.maplebirch, this.version);
      $.wiki('<<maplebirchState>>');
    } catch (e: any) {
      this.log(`读档迁移出错: ${e?.message || e}`, 'ERROR');
    }
  }

  postInit() {
    if (V.maplebirch?.version !== this.version) this.migration.run(V.maplebirch, this.version);
    this.#mapProcessing();
  }
}

(function (maplebirch): void {
  'use strict';
  void maplebirch.register('var', Object.seal(new Variables(maplebirch)), ['tool']);
})(maplebirch);

export default Variables;
