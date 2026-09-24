// ./src/modules/Dynamic.ts

import type { MaplebirchCore } from '../core';
import type { ScopedLog } from '../infra/Diagnostics';
import Lifecycle, { type LifecycleTarget } from '../infra/Lifecycle';

class Dynamic extends Lifecycle<string, LifecycleTarget> {
  public readonly log: ScopedLog;

  public constructor(readonly core: MaplebirchCore) {
    super(core.host.modLoader);
    this.log = core.infra.diagnostics.scoped('dynamic');
  }

  public override Init(): void {
    for (const [name, feature] of this.items) this.execute(feature, 'Init', `dynamic:${name}`);
  }
}

export default Dynamic;
