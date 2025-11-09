(() => {
  'use strict';
  const modUtils = window.modUtils;
  if (modUtils.getNowRunningModName() !== 'maplebirch' || !window.maplebirch) return;
  const maplebirch = window.maplebirch;
  const variable = maplebirch.var;
  const migrationSystem = variable.migrationSystem;

  // v1.0.0版本
  migrationSystem.add('0.0.0', '1.0.0', (data, utils) => {
    const defaults = variable.tool.clone(variable.constructor.defaultVar);
    if (!data || Object.keys(data).length === 0 || !data.version || data.version === '0.0.0') {
      Object.assign(data, defaults);
      data.version = '1.0.0';
      return;
    }
    try {
      utils.fill(data, defaults);
    } catch (e) {
      variable.log(`迁移合并默认值失败: ${e?.message || e}`, 'ERROR');
    }
    data.version = '1.0.0';
  });

  // v1.0.1版本数据修正
  migrationSystem.add('1.0.0', '1.0.1', (data, utils) => {
    if (data.effect) utils.remove(data, 'effect');
    if (data.effect) utils.remove(data, 'effect');
    if (data.location) utils.remove(data, 'location');
    if (data.orchard) utils.remove(data, 'orchard');
    if (data.enemy) utils.remove(data, 'enemy');
    if (data.npcList) utils.remove(data, 'npcList');
    data.version = '1.0.1';
  });
})();