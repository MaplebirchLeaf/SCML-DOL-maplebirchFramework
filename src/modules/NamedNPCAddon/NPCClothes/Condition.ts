// ./src/modules/NamedNPCAddon/NPCClothes/Condition.ts

import { errorMessage } from '../../../utils/error';
import { compileBooleanExpression } from '../../../utils/condition';
import type { MaplebirchCore } from '../../../core';

export type Condition = boolean | string | (() => boolean) | Condition[];

export function evaluate(core: MaplebirchCore, condition?: Condition): boolean {
  if (condition == null) return true;
  if (Array.isArray(condition)) return condition.every(item => evaluate(core, item));
  if (typeof condition === 'boolean') return condition;
  if (typeof condition === 'function') {
    try {
      return condition();
    } catch (e) {
      core.npc.log(`条件函数执行失败: ${errorMessage(e)}`, 'WARN');
      return false;
    }
  }
  try {
    return compileBooleanExpression(condition)();
  } catch {
    core.npc.log(`条件求值失败: ${condition}`, 'WARN');
    return false;
  }
}
