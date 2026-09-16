// ./src/modules/NamedNPCAddon/NPCFluids.ts

export type NPCFluidPart = 'vagina' | 'vaginaoutside' | 'anus' | 'mouth' | 'penis' | 'chest' | 'face' | 'hair' | 'bottom' | 'feet' | 'leftarm' | 'rightarm' | 'neck' | 'thigh' | 'tummy';

export type NPCFluidType = 'goo' | 'semen';
export type NPCFluidAmount = [goo: number, semen: number];
export type NPCFluidData = Record<NPCFluidPart, NPCFluidAmount>;

const parts: NPCFluidPart[] = ['vagina', 'vaginaoutside', 'anus', 'mouth', 'penis', 'chest', 'face', 'hair', 'bottom', 'feet', 'leftarm', 'rightarm', 'neck', 'thigh', 'tummy'];
const dripSpeeds = ['', 'start', 'very-slow', 'slow', 'fast', 'very-fast'];

// prettier-ignore
const cumSprites: Record<Exclude<NPCFluidPart, 'vagina' | 'vaginaoutside' | 'anus' | 'mouth' | 'penis' | 'hair' | 'bottom'>, Array<string | null>> = {
  chest   : [null, '1', '2', '3', '4', '4'],
  face    : [null, '1', '1', '2', '2', '3'],
  feet    : [null, null, '1', '1', '2', '2'],
  leftarm : [null, '1', '1', '1', '2', '2'],
  rightarm: [null, '1', '1', '1', '2', '2'],
  neck    : [null, '1', '1', '2', '2', '3'],
  thigh   : [null, '1', '2', '3', '4', '5'],
  tummy   : [null, '1', '2', '3', '4', '5']
};

function key(npcName: string) {
  return String(npcName || '').toLowerCase();
}

function level(value: any) {
  return Math.clamp(Math.round(Number(value) || 0), 0, 5);
}

function empty(): NPCFluidData {
  return parts.reduce((result, part) => {
    result[part] = [0, 0];
    return result;
  }, {} as NPCFluidData);
}

class NPCFluids {
  public readonly parts = parts;

  public ensure(npcName: string): NPCFluidData {
    V.maplebirch ??= {};
    V.maplebirch.npc ??= {};
    const npc = (V.maplebirch.npc[key(npcName)] ??= {});
    const current = npc.fluids && typeof npc.fluids === 'object' ? npc.fluids : {};
    const fluids = empty();
    parts.forEach(part => {
      const value = current[part];
      fluids[part] = Array.isArray(value) ? [level(value[0]), level(value[1])] : [level(value), 0];
    });
    npc.fluids = fluids;
    return fluids;
  }

  public get(npcName: string): NPCFluidData {
    return this.ensure(npcName);
  }

  public combined(npcName: string, part: NPCFluidPart): number {
    const amount = this.ensure(npcName)[part];
    return amount ? amount[0] + amount[1] : 0;
  }

  public set(npcName: string, part: NPCFluidPart, value: number, type: NPCFluidType = 'semen'): NPCFluidData {
    const fluids = this.ensure(npcName);
    if (parts.includes(part)) fluids[part][type === 'goo' ? 0 : 1] = level(value);
    return fluids;
  }

  public add(npcName: string, part: NPCFluidPart, value = 1, type: NPCFluidType = 'semen'): NPCFluidData {
    const fluids = this.ensure(npcName);
    const index = type === 'goo' ? 0 : 1;
    if (parts.includes(part)) fluids[part][index] = level(fluids[part][index] + value);
    return fluids;
  }

  public reduce(npcName: string, part: NPCFluidPart, value = 1, type: NPCFluidType = 'semen'): NPCFluidData {
    return this.add(npcName, part, -value, type);
  }

  public clear(npcName: string, part?: NPCFluidPart, type?: NPCFluidType): NPCFluidData {
    const fluids = this.ensure(npcName);
    for (const name of part && parts.includes(part) ? [part] : parts) {
      if (type) fluids[name][type === 'goo' ? 0 : 1] = 0;
      else fluids[name] = [0, 0];
    }
    return fluids;
  }

  public decay(value = 1): void {
    for (const name of Object.keys(V.maplebirch?.npc ?? {})) {
      const fluids = this.ensure(name);
      parts.forEach(part => (fluids[part] = [level(fluids[part][0] - value), level(fluids[part][1] - value)]));
    }
  }

  public apply(nnpc: Record<string, any>, npcData: any): void {
    const fluids = this.ensure(nnpc.name);
    npcData.fluids = fluids;
    const display = (part: NPCFluidPart) => level(fluids[part][0] + fluids[part][1]);
    nnpc.drip_vaginal = dripSpeeds[display('vagina')] ?? '';
    nnpc.drip_anal = dripSpeeds[display('anus')] ?? '';
    nnpc.drip_mouth = dripSpeeds[display('mouth')] ?? '';
    for (const [part, sprites] of Object.entries(cumSprites)) nnpc[`cum_${part}`] = sprites[display(part as keyof typeof cumSprites)] ?? '';
  }
}

export default NPCFluids;
