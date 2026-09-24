import './runtime';
import { expect, mock, test } from 'bun:test';

mock.module('../../src/core', () => ({ default: { on() {}, once() {} } }));

const { default: ToolCollection } = await import('../../src/modules/ToolCollection');

test('tool forwards define and defineS to its macro service with all options', () => {
  const calls: unknown[][] = [];
  const tool = Object.create(ToolCollection.prototype) as InstanceType<typeof ToolCollection>;
  Object.defineProperty(tool, 'macro', {
    value: {
      define: (...args: unknown[]) => calls.push(['define', ...args]),
      defineS: (...args: unknown[]) => calls.push(['defineS', ...args])
    }
  });
  const raw = function () {};
  const simple = (name: string) => `Hello, ${name}`;

  tool.define('myMod:raw', raw, ['body'], ['skip'], true);
  tool.defineS('myMod:simple', simple, null, false, true);

  expect(calls).toEqual([
    ['define', 'myMod:raw', raw, ['body'], ['skip'], true],
    ['defineS', 'myMod:simple', simple, null, false, true]
  ]);
});
