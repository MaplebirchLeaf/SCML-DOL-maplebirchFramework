// ./src/modules/NamedNPCAddon/NPCClothes/Condition.ts

import type { MaplebirchCore } from '../../../core';

export type Condition = boolean | string | (() => boolean) | Condition[];

export function evaluate(core: MaplebirchCore, condition?: Condition): boolean {
  if (condition == null) return true;
  if (Array.isArray(condition)) return condition.every(item => evaluate(core, item));
  if (typeof condition === 'boolean') return condition;
  if (typeof condition === 'function') {
    try {
      return condition();
    } catch (e: any) {
      core.npc.log(`条件函数执行失败: ${e.message}`, 'WARN');
      return false;
    }
  }
  try {
    return new Function(`return (${condition})`)();
  } catch {
    core.npc.log(`条件求值失败: ${condition}`, 'WARN');
    return false;
  }
}
