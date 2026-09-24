export const actionTypes = ['leftaction', 'rightaction', 'feetaction', 'mouthaction', 'penisaction', 'vaginaaction', 'anusaction', 'chestaction', 'thighaction'] as const;
export type ActionType = (typeof actionTypes)[number];
export const combatTypes = ['Default', 'Self', 'Struggle', 'Swarm', 'Vore', 'Machine', 'Tentacle'] as const;
export type CombatType = (typeof combatTypes)[number];
