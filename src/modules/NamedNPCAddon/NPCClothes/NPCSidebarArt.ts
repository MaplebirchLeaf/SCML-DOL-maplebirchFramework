// ./src/modules/NamedNPCAddon/NPCClothes/NPCSidebarArt.ts

import type { ModZipReader } from '@scml/types/sugarcube-2-ModLoader/ModZipReader';
import { evaluate, type Condition } from './Condition';
import NPCManager from '../../NamedNPC';

interface ArtLayer {
  cond?: Condition;
  zIndex?: number | string;
  img: string;
}

interface ResolvedArtLayer {
  zIndex: number | string;
  img: string;
}

type ArtPart = 'head' | 'face' | 'neck' | 'upper' | 'lower' | 'legs' | 'feet' | 'hands';

interface ArtConfig {
  key: string;
  name: string;
  body: string;
  parts: Partial<Record<ArtPart, ArtLayer[]>>;
}

export interface ResolvedArt {
  key: string;
  body: string;
  parts: Partial<Record<ArtPart, ResolvedArtLayer>>;
}

const artParts: ArtPart[] = ['head', 'face', 'neck', 'upper', 'lower', 'legs', 'feet', 'hands'];

class NPCSidebarArt {
  private readonly configs = new Map<string, Map<string, ArtConfig>>();

  public constructor(private readonly manager: NPCManager) {}

  public async import(modName: string, modZip: ModZipReader, filePaths: string | string[]): Promise<string[]> {
    if (!modZip) {
      this.manager.log('无效的模组压缩包', 'ERROR');
      return [];
    }

    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    const imagePaths = new Set<string>();

    for (const filePath of paths) {
      const file = modZip.zip.file(filePath);
      if (!file) continue;
      let data: any;

      try {
        const content = await file.async('string');
        if (filePath.endsWith('.json')) {
          data = JSON.parse(content);
        } else if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
          data = this.manager.core.yaml.load(content);
        } else {
          this.manager.log(`不支持的文件格式: ${filePath}`, 'WARN');
          continue;
        }
      } catch (e: any) {
        this.manager.log(`读取侧边栏人模配置失败: ${filePath} - ${e.message}`, 'ERROR');
        continue;
      }

      const fileName =
        filePath
          .split('/')
          .pop()
          ?.replace(/\.[^.]+$/, '') ?? 'unknown';

      const items = Array.isArray(data) ? data : [data];

      items.forEach((item: any, index: number) => {
        if (!item?.name) return;
        const npcName = item.name.convert('title');
        const key = items.length > 1 ? `${modName}_${fileName}_${index}` : `${modName}_${fileName}`;
        const config: ArtConfig = {
          key,
          name: npcName,
          body: item.body ?? '',
          parts: {}
        };

        if (item.body) imagePaths.add(item.body);

        for (const part of artParts) {
          if (!Array.isArray(item[part])) continue;
          const layers = item[part] as ArtLayer[];
          config.parts[part] = layers;
          for (const layer of layers) if (layer?.img) imagePaths.add(layer.img);
        }

        this.setConfig(npcName, key, config);
        const display = this.manager.Sidebar.display;
        if (!display) return;
        const displaySet = display.get(npcName) ?? new Set<string>();
        displaySet.add(key);
        display.set(npcName, displaySet);
      });
    }

    return [...imagePaths];
  }

  public has(npcName: string, key: string): boolean {
    return this.configs.get(npcName)?.has(key) ?? false;
  }

  public keys(npcName: string): string[] {
    return [...(this.configs.get(npcName)?.keys() ?? [])];
  }

  public get(npcName: string, key: string): ResolvedArt | undefined {
    const config = this.configs.get(npcName)?.get(key);
    return config ? this.resolve(config) : undefined;
  }

  public get layers() {
    const result = new Map<string, Map<string, ResolvedArt>>();
    for (const [npcName, configs] of this.configs) {
      const arts = new Map<string, ResolvedArt>();
      for (const [key, config] of configs) arts.set(key, this.resolve(config));
      result.set(npcName, arts);
    }
    return result;
  }

  private setConfig(npcName: string, key: string, config: ArtConfig): void {
    let configs = this.configs.get(npcName);
    if (!configs) {
      configs = new Map();
      this.configs.set(npcName, configs);
    }
    configs.set(key, config);
  }

  private resolve(config: ArtConfig): ResolvedArt {
    const result: ResolvedArt = {
      key: config.key,
      body: config.body,
      parts: {}
    };

    for (const part of artParts) {
      const layer = config.parts[part]?.find(item => evaluate(this.manager.core, item.cond));
      if (!layer) continue;
      result.parts[part] = {
        zIndex: layer.zIndex ?? 'auto',
        img: layer.img
      };
    }
    return result;
  }
}

export default NPCSidebarArt;
