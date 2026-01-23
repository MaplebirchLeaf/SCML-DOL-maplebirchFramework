(() => {
  'use strict';

  const variable = maplebirch.var;
  const migration = variable.migration;

  // v1.0.0版本
  migration.add('0.0.0', '1.0.0', (data, utils) => {
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
  migration.add('1.0.0', '1.0.1', (data, utils) => {
    if (data.effect) utils.remove(data, 'effect');
    if (data.location) utils.remove(data, 'location');
    if (data.orchard) utils.remove(data, 'orchard');
    if (data.enemy) utils.remove(data, 'enemy');
    if (data.npcList) utils.remove(data, 'npcList');
    data.version = '1.0.1';
  });

  // v1.0.2版本数据更新
  migration.add('1.0.1', '1.0.2', (data, utils) => {
    if (!data.transformation) data.transformation = {};
    if (!data.hintlocation) data.hintlocation = 'maplebirchModHint';
    data.version = '1.0.2';
  });

  // v1.0.3版本数据更新
  migration.add('1.0.2', '1.0.3', (data, utils) => {
    if (data.npc) for (const npcName in data.npc) if (Object.prototype.hasOwnProperty.call(data.npc, npcName)) utils.remove(data.npc, `${npcName}.location`);
    data.version = '1.0.3';
  });

  // v1.0.4版本数据更新
  migration.add('1.0.3', '1.0.4', (data, utils) => {
    utils.remove(data, 'time');
    utils.remove(data, 'character');
    utils.remove(data, 'inventory');
    if (data.wardrobeSearch == null) data.wardrobeSearch = '';
    data.version = '1.0.4';
  });

  // v1.0.5版本数据更新
  migration.add('1.0.4', '1.0.5', (data, utils) => {
    utils.remove(data, 'wardrobeSearch');
    utils.remove(data, 'audio');
    utils.remove(data, 'combat');
    utils.remove(data, 'hintlocation');
    data.version = '1.0.5';
  })

  // v1.0.6版本数据更新
  migration.add('1.0.5', '1.0.6', (data, utils) => {
    if (data.npc) for (const npcName in data.npc) if (Object.prototype.hasOwnProperty.call(data.npc, npcName)) utils.remove(data.npc, `${npcName}.clothes`);
    data.version = '1.0.6';
  })
})();