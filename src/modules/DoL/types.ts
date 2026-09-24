import type DoLDynamic from './Dynamic';
import type DoLToolCollection from './ToolCollection';
import type Audio from '../Audio';
import type Variables from '../Variables';
import type Character from '../Character';
import type NPCManager from '../NamedNPC';
import type Combat from '../Combat';

export interface CoreModules {
  readonly dynamic: DoLDynamic;
  readonly tool: DoLToolCollection;
  readonly audio: Audio;
  readonly var: Variables;
  readonly char: Character;
  readonly npc: NPCManager;
  readonly combat: Combat;
}

declare global {
  interface MaplebirchExtensions extends CoreModules {}
}
