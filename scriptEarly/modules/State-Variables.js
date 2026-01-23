// @ts-optionsCheck
/// <reference path='../../maplebirch.d.ts' />
(async() => {
  'use strict';

  const currentVersion = '1.0.6';

  class variables {
    static options = {
      npcsidebar: {
        show:     false,
        model:    false,
        position: 'back',
        dxfn:     -48,
        dyfn:     -8,
        skin_type:'light',
        tan:      0,
        facevariant: 'default',
        freckles: false,
        mask:     'mask_0',
        nnpc:     false,
        display:  {}
      },
      relationcount: 4,
      npcschedules: false
    }

    static player = {
      clothing: {}
    }

    static defaultVar = {
      player:     variables.player,
      npc:            {},
      transformation: {},
    };
    
    /** @param {MaplebirchCore} core */
    constructor(core) {
      this.version = currentVersion;
      this.tool = core.tool;
      this.log = this.tool.createLog('var');
      this.migration = new this.tool.migration();
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
        for (const key in variables.options) if (!(key in V.options.maplebirch)) V.options.maplebirch[key] = this.tool.clone(variables.options[key]);
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