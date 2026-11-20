import type { MaplebirchCore } from '../../core';
import { _languageSwitch } from '../../macros';
import Macros from '../../macros/macros';
import ModI18N from '../../compat/ModI18N';
import dol from '../../host/DoL';
import ToolCollection from '../ToolCollection';
import DoLConsole from './Console';
import DoLMacros from './Macros';
import installPatches, { type Patches } from './Patches';
import Config, { type FrameworkConfig } from './Config';
import Options from './Options';
import TextStore from '../Frameworks/TextStore';
import { specialWidget, defaultData, locationPassage, widgetPassage } from './Replacements';

class DoLToolCollection extends ToolCollection {
  declare public readonly console: DoLConsole;
  declare public readonly macro: DoLMacros;
  declare public readonly patch: Patches;

  private readonly macros: Macros;
  private readonly options: Options;
  private readonly modI18N: ModI18N;

  public constructor(core: MaplebirchCore) {
    super(core, { console: DoLConsole, macro: DoLMacros });
    this.inject({ specialWidget, defaultData, locationPassage, widgetPassage });
    this.macros = new Macros(core);
    this.options = new Options(core);
    this.modI18N = new ModI18N(core.services.translator, core.host.modLoader);
    installPatches(core, this.patch);
    const config = new Config(core, this.patch, this.zone);
    core.services.addonPlugin.hook<FrameworkConfig | FrameworkConfig[]>('framework', task => config.apply(task));
  }

  public preInit(): void {
    this.macros.register();
    this.macros.notice();
    this.onInit(() => this.patch.apply('init'));
    window.lanSwitch = Object.freeze(_languageSwitch);
    this.onInit(() => {
      dol.setup.maplebirch ??= {};
      this.macros.install();
      dol.setup.maplebirch.hint = new TextStore();
      dol.setup.maplebirch.content = new TextStore();
    });
    this.patch.location.configure('lake_ruin', { condition: () => Weather.bloodMoon && !Weather.isSnow }, { layer: 'base', element: 'bloodmoon' });
    this.patch.location.configure('lake_ruin', { condition: () => Weather.bloodMoon && Weather.isSnow }, { layer: 'base', element: 'blood_moon_snow' });
    this.options.install();
  }

  public Init(): void {
    this.modI18N.install();
  }
}

export default DoLToolCollection;
