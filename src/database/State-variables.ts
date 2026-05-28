// ./src/database/State-variables.ts

import type migration from '../modules/Frameworks/migration';
import { clone } from '../utils';

export const defaults = {
  player: {
    clothing: {}
  },
  npc: {},
  transformation: {}
};

function dataUpdate(migration: migration): void {
  migration.add('0.0.0', '3.2.0', (data, utils) => utils.fill(data, clone(defaults)));
}

export default dataUpdate;
