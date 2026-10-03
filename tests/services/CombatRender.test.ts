import './runtime';
import { expect, mock, test } from 'bun:test';
import type { MaplebirchCore } from '../../src/core';
import type { MacroContext } from '../../src/macros';
import type { ActionType, CombatType, OptionsTable } from '../../src/modules/CombatAddon/CombatAction';

mock.module('../../src/core', () => ({ default: {} }));

const { default: maplebirch } = await import('../../src/core');
const { default: Combat } = await import('../../src/modules/Combat');
type CombatInstance = InstanceType<typeof Combat>;
type Variables = {
  options: { combatControls: string };
  leftaction: string;
  rightaction: string;
  leftactiondefault: string;
  rightactiondefault: string;
  struggle: { penis: { grip: number } };
};

class RenderNode {
  append(..._children: unknown[]): void {}
}

function withCombatRender(run: (combat: CombatInstance, variables: Variables, render: (table: OptionsTable, actionType: ActionType, combatType?: CombatType) => void) => void): void {
  const originals = new Map(['V', 'T', 'document', 'combatListColor', 'jQuery'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const originalHost = Object.getOwnPropertyDescriptor(maplebirch, 'host');
  const variables: Variables = {
    options: { combatControls: 'radio' },
    leftaction: 'rest',
    rightaction: 'rest',
    leftactiondefault: 'rest',
    rightactiondefault: 'rest',
    struggle: { penis: { grip: 1 } }
  };
  const handlers = new Map<string, unknown>();
  const jquery = { off: () => jquery, on: () => jquery };
  const host = { sugarcube: { require: () => ({ Wikifier: { wikifyEval: () => new RenderNode() } }) } };
  for (const [key, value] of Object.entries({
    V: variables,
    T: {},
    document: { createDocumentFragment: () => new RenderNode(), createElement: () => new RenderNode() },
    combatListColor: (): string => 'white',
    jQuery: () => jquery
  })) {
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  Object.defineProperty(maplebirch, 'host', { value: host, configurable: true });
  const core = { tool: { define: (name: string, handler: unknown) => handlers.set(name, handler) } } as unknown as MaplebirchCore;
  const combat = new Combat(core);
  Object.defineProperty(combat, 'log', { value: () => {}, configurable: true });
  try {
    combat.preInit();
    const generate = handlers.get('generateCombatAction') as (this: MacroContext) => void;
    run(combat, variables, (table, actionType, combatType = 'Struggle') => generate.call({ args: [table, actionType, combatType], output: new RenderNode() } as unknown as MacroContext));
  } finally {
    for (const [key, original] of originals) {
      if (original) Object.defineProperty(globalThis, key, original);
      else Reflect.deleteProperty(globalThis, key);
    }
    if (originalHost) Object.defineProperty(maplebirch, 'host', originalHost);
    else Reflect.deleteProperty(maplebirch, 'host');
  }
}

test('Struggle radio tables preserve hand actions rendered separately so Pull remains available', () => {
  withCombatRender((_combat, variables, render) => {
    for (const controls of ['radio', 'columnRadio']) {
      variables.options.combatControls = controls;
      for (const side of ['left', 'right'] as const) {
        const actionType = `${side}action` as const;
        const defaultType = `${actionType}default` as const;
        for (const action of ['penis_pull', 'penis_strengthen', 'penis_grasp']) {
          variables[actionType] = variables[defaultType] = action;
          render({ Rest: 'rest', Guard: 'guard' }, actionType);
          expect(variables[actionType]).toBe(action);
          expect(variables[defaultType]).toBe(action);
          expect(variables.struggle.penis.grip >= 1 && variables[defaultType].includes('penis')).toBe(true);
        }
      }
    }
  });
});

test('complete list tables still repair an unavailable current action and default', () => {
  withCombatRender((_combat, variables, render) => {
    for (const controls of ['lists', 'limitedLists']) {
      variables.options.combatControls = controls;
      for (const combatType of ['Default', 'Struggle', 'Swarm'] as const) {
        variables.leftaction = variables.leftactiondefault = 'unavailable';
        render({ Rest: 'rest', Guard: 'guard' }, 'leftaction', combatType);
        expect(variables.leftaction).toBe('rest');
        expect(variables.leftactiondefault).toBe('rest');
      }
    }
  });
});

test('removing a selected local radio action through a mod still selects a remaining option', () => {
  withCombatRender((combat, variables, render) => {
    combat.CombatAction.modify({ id: 'test:remove-rest', actionType: ['leftaction', 'rightaction'], combatType: 'Struggle', value: 'rest', cond: () => false });
    for (const controls of ['radio', 'columnRadio']) {
      variables.options.combatControls = controls;
      for (const side of ['left', 'right'] as const) {
        const actionType = `${side}action` as const;
        const defaultType = `${actionType}default` as const;
        variables[actionType] = variables[defaultType] = 'rest';
        render({ Rest: 'rest', Guard: 'guard' }, actionType);
        expect(variables[actionType]).toBe('guard');
        expect(variables[defaultType]).toBe('guard');
      }
    }
  });
});
