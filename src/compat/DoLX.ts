// ./src/compat/DoLX.ts

import type { MaplebirchCore } from '../core';
import dol from '../host/DoL';
import DoLP from './DoLP';

class DoLX {
  public static get isDoLX(): boolean {
    return String(dol.gameVersion ?? '').includes('DoLX') || (dol.has('V') && !!dol.variables?.xchange);
  }

  public static readonly PreservedTraits = ['dragonTongue', 'ironWill', 'leviathan'] as const;

  public static install(core: MaplebirchCore): void {
    DoLP.install(core);
  }

  public static extend(valid: { names: Set<string>; traits: Set<string> }): void {
    if (!this.isDoLX) return;
    for (const trait of this.PreservedTraits) valid.traits.add(trait);
  }
}

export default DoLX;
