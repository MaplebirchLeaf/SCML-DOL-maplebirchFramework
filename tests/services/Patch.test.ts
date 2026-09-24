import { expect, test } from 'bun:test';
import Patch from '../../src/modules/Frameworks/Patch';

test('generic patch registrar starts empty and runs registered state handlers in order', () => {
  const calls: string[] = [];
  const patch = new Patch((name, error) => calls.push(`${name}: ${String(error)}`));

  expect(patch.names()).toEqual([]);
  patch.add('first', { api: { id: 1 }, state: () => calls.push('first') });
  patch.add('second', { api: { id: 2 }, state: () => calls.push('second') });
  patch.apply('state');

  expect(patch.names()).toEqual(['first', 'second']);
  expect(patch.require<{ id: number }>('first').id).toBe(1);
  expect(() => patch.add('first', { api: { id: 3 } })).toThrow('Patch already registered');
  expect(calls.at(-1)).toContain('first: Error: Patch already registered');
  expect(patch.names()).toEqual(['first', 'second']);
  expect(calls.slice(0, 2)).toEqual(['first', 'second']);
});
