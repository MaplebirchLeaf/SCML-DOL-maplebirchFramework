import type { MaplebirchCore } from '../../core';
import { _languageSwitch } from '../../macros';
import Macros from '../../macros/macros';
import ModI18N from '../../compat/ModI18N';
import dol from '../../host/DoL';
import ToolCollection from '../ToolCollection';
import DoLConsole from '../Frameworks/DoLConsole';
import DoLMacros from '../Frameworks/DoLMacros';
import register, { type Patches } from './Patches';
import FrameworkConfigLoader, { type FrameworkConfig } from './Config';
import OptionEvents from '../Frameworks/OptionEvents';
import TextStore from '../Frameworks/TextStore';
import { specialWidget, defaultData, locationPassage, widgetPassage } from './Replacements';

export default class DoLToolCollection extends ToolCollection {
  declare public readonly console: DoLConsole;
  declare public readonly macro: DoLMacros;
  declare public readonly patch: Patches;

  private readonly macros: Macros;
  private readonly optionEvents: OptionEvents;
  private readonly modI18N: ModI18N;

  public constructor(core: MaplebirchCore) {
    super(core, { console: DoLConsole, macro: DoLMacros });
    this.zone.inject({ specialWidget, defaultData, locationPassage, widgetPassage });
    this.macros = new Macros(core);
    this.optionEvents = new OptionEvents(core);
    this.modI18N = new ModI18N(core.services.translator, core.host.modLoader);
    register(core, this.patch);
    const config = new FrameworkConfigLoader(core, this.patch, this.zone);
    core.services.addonPlugin.hook<FrameworkConfig | FrameworkConfig[]>('framework', task => config.apply(task));
    core.once(':sugarcube', () => this.macros.register());
  }

  public preInit(): void {
    this.macros.notice();
    this.core.wikify('patches', {
      beforeWidget: (text, name) => this.patch.beforeWidget(name, text),
      afterWidget: (_text, name, _title, _passage, node) => this.patch.afterWidget(name, node)
    });
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
    this.optionEvents.install();
  }

  public Init(): void {
    this.modI18N.install();
  }
}
