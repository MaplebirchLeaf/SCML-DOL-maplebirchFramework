// ./src/database/State-variables.ts

import maplebirch from '../core';
import { clone } from '../utils';

export const defaultVar = {
  player: {
    clothing: {}
  },
  npc: {},
  transformation: {}
};

function dataUpdate(migration: typeof maplebirch.var.migration): void {
  migration.add('0.0.0', '3.2.0', (data, utils) => {
    const defaults = clone(defaultVar);
    try {
      utils.fill(data, defaults);
    } catch (e) {
      utils.log(`迁移合并默认值失败: ${e?.message || e}`, 'ERROR');
    } finally {
      data.version = '3.2.0';
    }
  });
}

export default dataUpdate;
