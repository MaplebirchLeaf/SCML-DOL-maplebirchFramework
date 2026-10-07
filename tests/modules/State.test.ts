import { expect, test } from 'bun:test';
import { StateManager } from '../../src/modules/State';

function state(title = 'Bedroom') {
  const manager = {
    log: () => {},
    core: { host: { sugarcube: { passage: { title } } } }
  } as unknown as ConstructorParameters<typeof StateManager>[0];
  return new StateManager(manager);
}

test('all nonblocking gates run before the highest priority blocking gate', () => {
  const events = state();
  const calls: string[] = [];
  events.register('gate', 'block', { priority: 100, forceExit: true, output: 'block', action: () => calls.push('block') });
  events.register('gate', 'second-block', { forceExit: true, output: 'secondBlock', action: () => calls.push('second-block'), once: true });
  events.register('gate', 'hint', { priority: 2, output: 'hint', action: () => calls.push('hint'), once: true });
  events.register('gate', 'update', { priority: 1, action: () => calls.push('update') });
  events.register('gate', 'other-hint', { output: 'otherHint', action: () => calls.push('other-hint') });
  expect(events.trigger('gate')).toBe('<<hint>><<otherHint>><<block>><<exitAll>>');
  expect(calls).toEqual(['hint', 'update', 'other-hint', 'block']);
  expect(events.events.gate.has('hint')).toBe(false);
  expect(events.events.gate.has('second-block')).toBe(true);
});

test('blocking gates recheck eligibility after nonblocking actions', () => {
  const events = state();
  let blocked = true;
  let blockRuns = 0;
  events.register('gate', 'block', { priority: 100, forceExit: true, cond: () => blocked, output: 'block', action: () => blockRuns++, once: true });
  events.register('gate', 'clear', {
    action: () => {
      blocked = false;
    },
    output: 'clear'
  });
  expect(events.trigger('gate')).toBe('<<clear>>');
  expect(blockRuns).toBe(0);
  expect(events.events.gate.has('block')).toBe(true);
});

test('dynamic forceExit false continues and passage filters prevent evaluation', () => {
  const events = state();
  let checked = 0;
  events.register('gate', 'scoped', {
    extra: { passage: ['Forest'] },
    cond: () => {
      checked++;
      return true;
    },
    forceExit: () => {
      checked++;
      return true;
    },
    output: 'scoped'
  });
  events.register('gate', 'dynamic', { forceExit: () => false, output: 'dynamic' });
  events.register('gate', 'hint', { output: 'hint' });
  expect(events.trigger('gate')).toBe('<<dynamic>><<hint>>');
  expect(checked).toBe(0);
});

test('append still collects all outputs and removes only triggered once events', () => {
  const events = state();
  events.register('append', 'first', { priority: 2, output: 'first', once: true });
  events.register('append', 'skip', { cond: () => false, output: 'skip', once: true });
  events.register('append', 'last', { output: 'last' });
  expect(events.trigger('append')).toBe('<<first>><<last>>');
  expect(events.events.append.has('first')).toBe(false);
  expect(events.events.append.has('skip')).toBe(true);
});

test('startup skips passage-scoped gates and appends before evaluating conditions', () => {
  for (const type of ['gate', 'append'] as const) {
    const manager = { log: () => {}, core: { host: { sugarcube: { passage: undefined as { title: string } | undefined } } } };
    const events = new StateManager(manager as unknown as ConstructorParameters<typeof StateManager>[0]);
    let checked = 0;
    for (const [id, extra] of Object.entries({ include: { passage: ['Bird Tower'] }, exclude: { exclude: ['Bedroom'] }, match: { match: /^Bird Tower$/ } })) {
      events.register(type, id, {
        extra,
        once: true,
        output: id,
        cond: () => {
          checked++;
          return true;
        }
      });
    }
    events.register(type, 'global', { output: 'global' });
    expect(events.trigger(type)).toBe('<<global>>');
    expect(checked).toBe(0);
    expect(events.events[type].size).toBe(4);
    manager.core.host.sugarcube.passage = { title: 'Bird Tower' };
    expect(events.trigger(type)).toBe('<<include>><<exclude>><<match>><<global>>');
    expect(checked).toBe(3);
    expect(events.events[type].size).toBe(1);
  }
});
