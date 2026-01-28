// @ts-optionsCheck
/// <reference path='../../maplebirch.d.ts' />
(async() => {
  'use strict';

  const currentVersion = '1.0.6';

  function hairgradients() {
    if (!setup.colours?.hairgradients_prototypes) return { fringe: {}, sides: {} };
    const data = { fringe: {}, sides: {} };
    const hg = setup.colours.hairgradients_prototypes;
    for (const [style, hairstyles] of Object.entries(hg.fringe||{})) if (hairstyles.all?.colors) data.fringe[style] = hairstyles.all.colors.map(color => color[0]);
    for (const [style, hairstyles] of Object.entries(hg.sides||{})) if (hairstyles.all?.colors) data.sides[style] = hairstyles.all.colors.map(color => color[0]);
    return data;
  }

  class variables {
    static get options() {
      return {
        character: {
          mask: 0,
          charArt: { type:'fringe',select:'low-ombre',value:clone(hairgradients()) },
          closeUp: { type:'fringe',select:'low-ombre',value:clone(hairgradients()) },
        },
        npcsidebar: {
          show: false,
          model: false,
          position: 'back',
          dxfn: -48,
          dyfn: -8,
          skin_type: 'light',
          tan: 0,
          facestyle: 'default',
          facevariant: 'default',
          freckles: false,
          ears: 'back',
          mask: 0,
          nnpc: false,
          display: {}
        },
        relationcount: 4,
        npcschedules: false
      };
    }

    static player = {
      clothing: {}
    };

    static defaultVar = {
      player: variables.player,
      npc: {},
      transformation: {}
    };
    
    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.version = currentVersion;
      this.tool = core.tool;
      this.log = this.tool.createLog('var');
      this.migration = new this.tool.migration();
      this.hairgradients = hairgradients;
      core.once(':passageend', () => this.optionsCheck());
    }

    #mapProcessing() {
      Object.defineProperty(V.maplebirch.player, 'clothing', {
        get: () => V.worn,
        set: (val) => maplebirch.log('V.maplebirch.player.clothing 是 V.worn 的只读镜像。请直接修改 V.worn', 'WARN'),
      });
    }

    optionsCheck() {
      if (typeof V.maplebirch !== 'object' || V.maplebirch == null) V.maplebirch = {};
      if (typeof V.maplebirch.language !== 'string') V.maplebirch.language = maplebirch.Language;
      if (typeof V.options?.maplebirch !== 'object' || V.options?.maplebirch === null) {
        V.options.maplebirch = this.tool.clone(variables.options);
      } else {
        V.options.maplebirch = this.tool.merge({}, variables.options, V.options.maplebirch, { mode: 'merge', filterFn: (key, value, depth) => true });
      }
    }

    Init() {
      try {
        if (this.tool.core.state.Passage?.title === 'Start2') {
          V.maplebirch = this.tool.clone({ ...variables.defaultVar, version: this.version });
          return;
        }
        this.migration.run(V.maplebirch, this.version);
        $.wiki('<<maplebirchDataInit>>');
      } catch (/**@type {any}*/e) {
        this.log(`出现错误：${e?.message || e}`, 'ERROR');
      }
    }

    loadInit() {
      try {
        this.optionsCheck();
        this.migration.run(V.maplebirch, this.version);
        $.wiki('<<maplebirchDataInit>>');
      } catch (/**@type {any}*/e) {
        this.log(`读档迁移出错: ${e?.message || e}`, 'ERROR');
      }
    }

    postInit() {
      if (!V.maplebirch?.version || V.maplebirch?.version !== this.version) {
        try {
          this.migration.run(V.maplebirch, this.version);
          this.log(`存档数据修正完成 (→ v${this.version})`, 'DEBUG');
        } catch (/**@type {any}*/e) {
          this.log(`后初始化迁移出错: ${e?.message || e}`, 'ERROR');
        }
      }
      this.#mapProcessing();
    }
  }

  await maplebirch.register('var', new variables(maplebirch), ['tool']);
})();