import './runtime';
import { expect, mock, test } from 'bun:test';

mock.module('../../src/core', () => ({ default: {} }));

const { default: CombatActions } = await import('../../src/modules/CombatAddon/CombatAction');
type OptionsTable = import('../../src/modules/CombatAddon/CombatAction').OptionsTable;

test('runs a registered effect only in its selected encounter type', () => {
  const actions = new CombatActions();
  actions.reg({ id: 'myMod:escape', actionType: 'leftaction', combatType: 'Vore', cond: () => true, display: () => 'Escape', value: () => 'myModEscape', effect: '<<myModEscape>>' });
  expect(actions.effect('Vore', 'leftaction')).toContain('<<myModEscape>>');
  expect(actions.effect('Machine', 'leftaction')).toBe('');
  expect(actions.effect('Vore', 'rightaction')).toBe('');
  expect(actions.effect(undefined, 'leftaction')).toBe('');
});

test('one action can appear and resolve in several encounter types', () => {
  const actions = new CombatActions();
  actions.reg({
    id: 'myMod:guard',
    actionType: 'leftaction',
    combatType: ['Default', 'Struggle'],
    cond: () => true,
    display: () => 'Guard',
    value: () => 'myModGuard',
    color: 'brat',
    difficulty: 'Easy',
    effect: '<<myModGuard>>'
  });
  expect(actions.patchOptions({}, 'leftaction', 'Default')).toEqual({ Guard: 'myModGuard' });
  expect(actions.patchOptions({}, 'leftaction', 'Struggle')).toEqual({ Guard: 'myModGuard' });
  expect(actions.patchOptions({}, 'leftaction', 'Vore')).toEqual({});
  expect(actions.color('myModGuard', 'Struggle')).toBe('brat');
  expect(actions.difficulty('myModGuard', 'Struggle')).toBe('Easy');
  expect(actions.effect('Struggle', 'leftaction')).toContain('<<myModGuard>>');
  expect(actions.effect('Vore', 'leftaction')).toBe('');
});

test('modifies an original button by value without replacing its action', () => {
  const actions = new CombatActions();
  actions.modify({ id: 'myMod:ask', actionType: 'mouthaction', value: 'ask', display: ctx => `Request: ${ctx.label}`, order: 0 });
  const options: OptionsTable = { Rest: 'rest', Ask: 'ask', Scream: 'scream' };
  expect(actions.patchOptions(options, 'mouthaction')).toEqual({ 'Request: Ask': 'ask', Rest: 'rest', Scream: 'scream' });
  expect(options).toEqual({ 'Request: Ask': 'ask', Rest: 'rest', Scream: 'scream' });
});

test('filters Ask choices by original value while leaving unrelated choices intact', () => {
  const actions = new CombatActions();
  actions.modify({ id: 'myMod:noCondoms', actionType: 'ask', value: 'noCondoms', cond: () => false });
  const options = { Nothing: 'rest', 'Use a condom': 'condoms', 'Do not use a condom': 'noCondoms' };
  expect(actions.patchOptions(options, 'ask')).toEqual({ Nothing: 'rest', 'Use a condom': 'condoms' });
});

test('keeps a vanilla option when a visibility callback fails', () => {
  const actions = new CombatActions();
  actions.modify({
    id: 'myMod:broken',
    actionType: 'ask',
    value: 'condoms',
    cond: () => {
      throw new Error('failed');
    }
  });
  expect(actions.patchOptions({ Condoms: 'condoms' }, 'ask')).toEqual({ Condoms: 'condoms' });
});

test('scopes original-button modifications to selected encounter types', () => {
  const actions = new CombatActions();
  actions.modify({ id: 'myMod:rest', actionType: ['leftaction', 'rightaction'], value: 'rest', combatType: ['Default', 'Self'], display: 'Pause' });
  expect(actions.patchOptions({ Rest: 'rest' }, 'leftaction', 'Default')).toEqual({ Pause: 'rest' });
  expect(actions.patchOptions({ Rest: 'rest' }, 'rightaction', 'Self')).toEqual({ Pause: 'rest' });
  expect(actions.patchOptions({ Rest: 'rest' }, 'leftaction', 'Vore')).toEqual({ Rest: 'rest' });
});
