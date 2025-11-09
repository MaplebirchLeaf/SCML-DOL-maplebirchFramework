(async() => {
  'use strict';
  if (!window.maplebirch) {
    console.log('%c[maplebirch] 错误: 核心系统未初始化', 'color: #C62828; font-weight: bold;');
    return;
  }

  const maplebirch = window.maplebirch;
  const currentVersion = '1.0.1';

  class variablesModule {
    static check() {
      if (typeof V.maplebirch !== 'object' || V.maplebirch === null) V.maplebirch = {};
      if (typeof V.maplebirch.language !== 'string') V.maplebirch.language = maplebirch.Language;
      if (!V.options) return;
      if (typeof V.options?.maplebirch !== 'object' || V.options?.maplebirch === null) {
        V.options.maplebirch = maplebirch.tool.clone(variablesModule.options);
      } else {
        const defaultOptions = variablesModule.options;
        for (const key in defaultOptions) if (!(key in V.options.maplebirch)) V.options.maplebirch[key] = maplebirch.tool.clone(defaultOptions[key]);
      }
    }

    static options = {
      modHint: 'disable',
      debug: false,
      sandbox: {
        V: true,
        T: true,
        maplebirch: false,
        window: false
      },
      npcsidebar: {
        show: false,
        model: false,
        nnpc: false,
        display: {}
      },
      solarEclipse: true
    }

    static audio = {
      playlist: null,
      currentTrack: null,
      currentIndex: -1,
      loopMode: "none",
      currentAudio: null,
      storage: {}
    }

    static time = {
      monthly:  {},
      weekly:   {},
      daily:    {},
      dawn:     {},
    }

    static character = {
      carrying:   {},
      attribute:  {}
    }

    static inventory = {
      items: [],
      maxSlots: 5,
      backpack: 'none'
    }

    static combat = {
      npcList: [],
      enemy:   {},
      sex: {},
    }

    static player = {
      clothing: {}
    }

    static defaultVar = {
      audio:      variablesModule.audio,
      time:       variablesModule.time,
      character:  variablesModule.character,
      inventory:  variablesModule.inventory,
      combat:     variablesModule.combat,
      player:     variablesModule.player,
      npc:        {},
    };
    
    constructor() {
      this.version = currentVersion;
      this.tool = null;
      this.migrationSystem = null;
      this.log = null;
    }

    #mapProcessing() {
      let worn = V.worn;
      Object.defineProperty(V.maplebirch.player, 'clothing', {
        get: () => worn,
        set: (val) => { worn = val; V.worn = val; },
      });
      Object.defineProperty(V, 'worn', {
        get: () => worn,
        set: (val) => { worn = val; V.maplebirch.player.clothing = val; },
      });
    }

    preInit() { 
      this.tool = maplebirch.tool;
      this.log = this.tool.createLog('var');
      maplebirch.once(':passageinit', () => variablesModule.check());
      maplebirch.once(':finally', () => variablesModule.check());
      if (this.migrationSystem) return;
      this.migrationSystem = this.tool.migration.create();
    }

    Init() {
      try {
        if (maplebirch.state.passage.title === 'Start2') {
          V.maplebirch = this.tool.clone({
            ...variablesModule.defaultVar,
            version: this.version
          });
          this.log(`新游戏数据初始化完成 (v${this.version})`, 'DEBUG');
          return;
        }
        this.migrationSystem.run(V.maplebirch, this.version);
        $.wiki('<<maplebirchDataInit>>');
        this.log(`存档数据迁移完成 (→ v${this.version})`, 'DEBUG');
      } catch (e) {
        this.log(`出现错误：${e?.message || e}`, 'ERROR');
      }
      
    }

    loadInit() {
      try {
        variablesModule.check();
        this.migrationSystem.run(V.maplebirch, this.version);
        $.wiki('<<maplebirchDataInit>>');
        this.log(`读档迁移/修正完成 (→ v${this.version})`, 'DEBUG');
      } catch (e) {
        this.log(`读档迁移出错: ${e?.message || e}`, 'ERROR');
      }
      
    }

    postInit() {
      if (!V.maplebirch?.version || V.maplebirch?.version !== this.version) {
        try {
          this.migrationSystem.run(V.maplebirch, this.version);
          this.log(`存档数据修正完成 (→ v${this.version})`, 'DEBUG');
        } catch (e) {
          this.log(`后初始化迁移出错: ${e?.message || e}`, 'ERROR');
        }
      }
      this.#mapProcessing();
    }
  }

  await maplebirch.register('var', new variablesModule(), ['tool']);
})();