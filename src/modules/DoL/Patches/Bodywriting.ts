// ./src/modules/DoL/Patches/Bodywriting.ts

import { isKey, isRecord } from './config';
import dol from '../../../host/DoL';

export interface BodywritingConfig {
  writing?: string;
  writ_cn?: string;
  type?: 'text' | 'object';
  arrow?: 0 | 1;
  special?: string;
  gender?: 'n' | 'f' | 'm' | 'h';
  lewd?: 0 | 1;
  degree?: number;
  featSkip?: boolean;
  sprites?: string[];
  index?: number;
  key?: string;
}

export type BodywritingData = { operation: 'add'; config: BodywritingConfig } | { operation: 'del' };
export type BodywritingItem = BodywritingConfig & { index: number; key: string };

export const bodywritingData: Record<string, BodywritingData> = Object.create(null);

import { clone } from '../../../utils/object';

class Bodywriting {
  public static add(key: string, config: BodywritingConfig): void {
    if (!isKey(key) || !isRecord(config)) return;
    bodywritingData[key] = {
      operation: 'add',
      config: clone(config)
    };
  }

  public static delete(key: string): void {
    if (!isKey(key)) return;
    bodywritingData[key] = {
      operation: 'del'
    };
  }

  public static apply(): void {
    if (!dol.has('setup') || !isRecord(dol.setup.bodywriting) || !Array.isArray(dol.setup.bodywriting_namebyindex)) return;
    for (const [key, data] of Object.entries(bodywritingData)) {
      if (data.operation === 'del') {
        Bodywriting.remove(key);
      } else if (data.config) {
        Bodywriting.set(key, data.config);
      }
      delete bodywritingData[key];
    }
  }

  private static remove(key: string): void {
    const item = dol.setup.bodywriting[key];
    if (!item) return;
    const index = item.index;
    delete dol.setup.bodywriting[key];
    if (dol.setup.bodywriting_namebyindex[index] === key) delete dol.setup.bodywriting_namebyindex[index];
  }

  private static set(key: string, config: BodywritingConfig): void {
    const current = dol.setup.bodywriting[key];
    let index = config.index ?? current?.index;
    if (index === undefined) {
      index = Math.max(0, ...Object.values(dol.setup.bodywriting).map(item => Number(item.index) || 0)) + 1;
    }
    if (!Number.isInteger(index) || index < 0) throw new Error(`Invalid bodywriting index: ${key}`);
    const owner = dol.setup.bodywriting_namebyindex[index];
    if (owner !== undefined && owner !== key) throw new Error(`Bodywriting index ${index} already belongs to ${owner}`);
    if (current && current.index !== index && dol.setup.bodywriting_namebyindex[current.index] === key) delete dol.setup.bodywriting_namebyindex[current.index];
    dol.setup.bodywriting[key] = {
      type: 'text',
      arrow: 0,
      special: 'none',
      gender: 'n',
      lewd: 0,
      degree: 0,
      featSkip: true,
      ...current,
      ...config,
      key,
      index
    };
    dol.setup.bodywriting_namebyindex[index] = key;
  }
}

export default Bodywriting;
