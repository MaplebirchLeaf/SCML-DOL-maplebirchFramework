import dol from '../../../host/DoL';
import { clone } from '../../../utils/object';
import { isKey, isRecord } from './config';

type FeatText = string | readonly string[];

export interface FeatConfig {
  title: FeatText;
  description: FeatText;
  difficulty: number;
  series?: string;
  filter?: readonly string[];
  hidden?: boolean;
  softLockable?: boolean;
  pregnancyLockable?: boolean;
}

const feats = new Map<string, FeatConfig>();
const flags = ['hidden', 'softLockable', 'pregnancyLockable'] as const;

function isText(value: unknown): value is FeatText {
  return typeof value === 'string' || (Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'string');
}

function add(key: string, config: FeatConfig): boolean {
  if (
    !isKey(key) ||
    feats.has(key) ||
    !isRecord(config) ||
    !isText(config.title) ||
    !isText(config.description) ||
    !Number.isInteger(config.difficulty) ||
    config.difficulty < 1 ||
    config.difficulty > 5 ||
    (config.series !== undefined && typeof config.series !== 'string') ||
    (config.filter !== undefined && (!Array.isArray(config.filter) || !config.filter.every(isKey))) ||
    flags.some(flag => config[flag] !== undefined && typeof config[flag] !== 'boolean')
  ) {
    return false;
  }
  feats.set(key, clone(config));
  return true;
}

function apply(translate: (text: FeatText) => string): void {
  const target = dol.setup.feats;
  // 原版成就页按定义顺序选取系列内首个未获得的成就。
  for (const [key, { title, description, difficulty, series = '', filter = ['All', 'General'], ...options }] of feats) {
    if (Object.hasOwn(target, key)) continue;
    const feat = {
      get title() {
        return translate(title);
      },
      get desc() {
        return translate(description);
      },
      difficulty,
      series,
      filter: [...filter]
    };
    for (const flag of flags) {
      if (options[flag] !== undefined) Object.assign(feat, { [flag]: options[flag] });
    }
    target[key] = feat;
  }
}

export default { add, apply };
