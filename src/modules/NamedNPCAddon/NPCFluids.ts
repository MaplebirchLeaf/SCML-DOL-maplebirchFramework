// ./src/modules/NamedNPCAddon/NPCFluids.ts

export type NPCFluidPart = 'vagina' | 'anus' | 'mouth' | 'chest' | 'face' | 'feet' | 'leftarm' | 'rightarm' | 'neck' | 'thigh' | 'tummy';

export type NPCFluidData = Record<NPCFluidPart, number>;

const parts: NPCFluidPart[] = ['vagina', 'anus', 'mouth', 'chest', 'face', 'feet', 'leftarm', 'rightarm', 'neck', 'thigh', 'tummy'];
const dripSpeeds = ['', 'start', 'very-slow', 'slow', 'fast', 'very-fast'];

// prettier-ignore
const cumSprites: Record<Exclude<NPCFluidPart, 'vagina' | 'anus' | 'mouth'>, Array<string | null>> = {
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
    result[part] = 0;
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
    parts.forEach(part => (fluids[part] = level(current[part])));
    npc.fluids = fluids;
    return fluids;
  }

  public get(npcName: string): NPCFluidData {
    return this.ensure(npcName);
  }

  public set(npcName: string, part: NPCFluidPart, value: number): NPCFluidData {
    const fluids = this.ensure(npcName);
    if (parts.includes(part)) fluids[part] = level(value);
    return fluids;
  }

  public add(npcName: string, part: NPCFluidPart, value = 1): NPCFluidData {
    const fluids = this.ensure(npcName);
    if (parts.includes(part)) fluids[part] = level(fluids[part] + value);
    return fluids;
  }

  public reduce(npcName: string, part: NPCFluidPart, value = 1): NPCFluidData {
    return this.add(npcName, part, -value);
  }

  public clear(npcName: string, part?: NPCFluidPart): NPCFluidData {
    const fluids = this.ensure(npcName);
    if (part && parts.includes(part)) {
      fluids[part] = 0;
    } else {
      parts.forEach(name => (fluids[name] = 0));
    }
    return fluids;
  }

  public decay(value = 1): void {
    for (const name of Object.keys(V.maplebirch?.npc ?? {})) {
      const fluids = this.ensure(name);
      parts.forEach(part => (fluids[part] = level(fluids[part] - value)));
    }
  }

  public apply(nnpc: Record<string, any>, npcData: any): void {
    const fluids = this.ensure(nnpc.name);
    npcData.fluids = fluids;
    nnpc.drip_vaginal = dripSpeeds[fluids.vagina] ?? '';
    nnpc.drip_anal = dripSpeeds[fluids.anus] ?? '';
    nnpc.drip_mouth = dripSpeeds[fluids.mouth] ?? '';
    for (const [part, sprites] of Object.entries(cumSprites)) nnpc[`cum_${part}`] = sprites[level(fluids[part as keyof typeof cumSprites])] ?? '';
  }
}

export default Object.seal(new NPCFluids());
