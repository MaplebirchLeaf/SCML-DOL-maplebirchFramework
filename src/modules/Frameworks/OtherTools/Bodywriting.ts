// .src/modules/Frameworks/OtherTools/Bodywriting.ts

import { clone } from '../../../utils';

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

export interface BodywritingData {
  operation: 'add' | 'del';
  config?: BodywritingConfig;
}

export const bodywritingData: Record<string, BodywritingData> = {};

class Bodywriting {
  public static add(key: string, config: BodywritingConfig): void {
    if (!key || !config) return;
    bodywritingData[key] = {
      operation: 'add',
      config: clone(config)
    };
  }

  public static delete(key: string): void {
    if (!key) return;
    bodywritingData[key] = {
      operation: 'del'
    };
  }

  public static apply(): void {
    setup.bodywriting ??= {};
    setup.bodywriting_namebyindex ??= {};
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
    const item = setup.bodywriting[key];
    if (!item) return;
    const index = item.index;
    delete setup.bodywriting[key];
    if (setup.bodywriting_namebyindex[index] === key) delete setup.bodywriting_namebyindex[index];
  }

  private static set(key: string, config: BodywritingConfig): void {
    if (config.index === undefined) {
      let maxIndex = 0;
      for (const item of Object.values(setup.bodywriting) as BodywritingConfig[]) {
        const index = Number(item.index);
        if (Number.isFinite(index) && index > maxIndex) maxIndex = index;
      }
      config.index = maxIndex + 1;
    }
    setup.bodywriting[key] = {
      key,
      type: 'text',
      arrow: 0,
      special: 'none',
      gender: 'n',
      lewd: 0,
      degree: 0,
      featSkip: true,
      ...config
    };
    setup.bodywriting_namebyindex[config.index] = key;
  }
}

export default Bodywriting;
