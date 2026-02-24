// ./src/database/State-variables.ts

import maplebirch from '../core';
import { clone } from '../utils';
import { defaultVar } from '../modules/Variables';

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

maplebirch.once(':modLoaderEnd', () => dataUpdate(maplebirch.var.migration));
