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

  tool.define('myModRaw', raw, ['body'], ['skip'], true);
  tool.defineS('myModSimple', simple, null, false, true, 'storyready');

  expect(calls).toEqual([
    ['define', 'myModRaw', raw, ['body'], ['skip'], true, 'sugarcube'],
    ['defineS', 'myModSimple', simple, null, false, true, 'storyready']
  ]);
});
