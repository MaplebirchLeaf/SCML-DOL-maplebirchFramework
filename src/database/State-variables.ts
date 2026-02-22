// ./src/database/State-variables.ts

import { version } from '../constants';
import maplebirch from '../core';
import { clone } from '../utils';
import { defaultVar } from '../modules/Variables';

function dataUpdate(migration: typeof maplebirch.var.migration): void {
  migration.add('0.0.0', version, (data, utils) => {
    const defaults = clone(defaultVar);
    if (data?.version <= '3.0.0') return;
    try {
      utils.fill(data, defaults);
    } catch (e) {
      utils.log(`迁移合并默认值失败: ${e?.message || e}`, 'ERROR');
    } finally {
      data.version = version;
    }
  });
}

maplebirch.once(':modLoaderEnd', () => dataUpdate(maplebirch.var.migration));
