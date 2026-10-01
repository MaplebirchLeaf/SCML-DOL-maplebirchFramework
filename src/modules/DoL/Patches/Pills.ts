import dol from '../../../host/DoL';
import { isKey } from './config';

type Text = string | (() => string);

/** 手动服用的扩展药片。库存与药效归调用模组管理，框架只接入原版药柜。 */
export interface PillConfig {
  cn_name?: Text;
  description: Text;
  warning_label: Text;
  icon?: string;
  indicators?: string[] | (() => string[]);
  owned: () => number;
  doseTaken: () => number;
  canTake: () => boolean;
  take: () => void;
}

export const pillsData: Record<string, PillConfig> = Object.create(null);
const text = (value: Text | undefined) => (typeof value === 'function' ? value() : (value ?? ''));

class Pills {
  private installed = false;

  public static add(name: string, config: PillConfig): void {
    if (!isKey(name) || !config || !['owned', 'doseTaken', 'canTake', 'take'].every(key => typeof Reflect.get(config, key) === 'function')) throw new TypeError(`Invalid pill registration: ${name}`);
    pillsData[name] = config;
  }

  public apply(): void {
    const pills = dol.setup.pills;
    if (!Array.isArray(pills)) return;
    for (const [name, config] of Object.entries(pillsData)) {
      const existing = pills.find(item => item.name === name);
      if (existing && existing.type !== 'maplebirch pill') throw new Error(`Pill name already exists: ${name}`);
      const item = {
        name,
        get cn_name() {
          return text(config.cn_name) || name;
        },
        get description() {
          return text(config.description);
        },
        get warning_label() {
          return text(config.warning_label);
        },
        type: 'maplebirch pill',
        subtype: name,
        shape: 'pill',
        icon: config.icon ?? 'img/misc/icon/pill-collection.png',
        get indicators() {
          return typeof config.indicators === 'function' ? config.indicators() : (config.indicators ?? []);
        },
        effects: [],
        autoTake: () => false,
        owned: config.owned,
        doseTaken: config.doseTaken,
        overdose: () => 0,
        display_condition: () => (config.owned() > 0 ? 1 : 0),
        take_condition: () => (config.owned() > 0 && config.canTake() ? 1 : 0)
      };
      if (existing) pills[pills.indexOf(existing)] = item;
      else pills.push(item);
    }
    if (this.installed || !Object.keys(pillsData).length) return;
    const host = window;
    if (typeof host.onTakeClick !== 'function' || typeof host.onAutoTakeClick !== 'function' || typeof host.initPillContextButtons !== 'function')
      throw new Error('Original medicine drawer functions are unavailable');
    const take = host.onTakeClick;
    const auto = host.onAutoTakeClick;
    const context = host.initPillContextButtons;
    host.onTakeClick = (name, type) => {
      const config = pillsData[name];
      if (!config) return take.call(host, name, type);
      if (config.owned() > 0 && config.canTake()) config.take();
    };
    host.onAutoTakeClick = (name, type) => {
      if (!Object.hasOwn(pillsData, name)) return auto.call(host, name, type);
    };
    host.initPillContextButtons = item => {
      context.call(host, item);
      if (Object.hasOwn(pillsData, item.name)) {
        document.getElementById('hpi_take_every_morning')?.classList.add('hidden');
        document.getElementById('hpi_take_pills')?.classList.add('hpi_take_me_single');
      }
    };
    this.installed = true;
  }
}

export default Pills;
