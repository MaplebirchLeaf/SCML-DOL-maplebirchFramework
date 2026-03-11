// ./src/main.ts

import { clone, equal, merge, contains, random, either, SelectCase, convert, number, loadImage } from './utils';
import './modules/AddonPlugin';
import './modules/Dynamic';
import './modules/ToolCollection';
import './modules/Audio';
import './modules/Variables';
import './modules/Internals';
import './modules/Character';
import './modules/NamedNPC';
import './modules/Combat';
import './database/State-variables';
import './SFcompat';
import maplebirch from './core';

export default maplebirch;
export { clone, equal, merge, contains, random, either, SelectCase, convert, number, loadImage };
