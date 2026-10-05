import './runtime';
import { expect, test } from 'bun:test';
import { runInNewContext } from 'node:vm';
import SugarCube from '../../src/host/SugarCube';
import Diagnostics from '../../src/infra/Diagnostics';

// 模拟引擎私有作用域，window 中没有 throwError。
test('captures lexical renderer errors without changing native arguments or return values', () => {
  const host = new SugarCube();
  const diagnostics = new Diagnostics();
  const start = diagnostics.history.length;
  const receiver = {};
  const args = [{}, '<<widget>> failed', '<<widget>>', false, false];
  const calls: unknown[][] = [];
  const renderer = function (this: unknown, ...values: unknown[]) {
    calls.push([this, ...values]);
    return false;
  };
  const result = runInNewContext(
    '(function(){let throwError=renderer;throwError=host.captureErrors(throwError,diagnostics);throwError=host.captureErrors(throwError,diagnostics);return throwError.apply(receiver,args);})()',
    { host, diagnostics, renderer, receiver, args }
  );
  expect(result).toBe(false);
  expect(calls).toEqual([[receiver, ...args]]);
  expect(diagnostics.history.slice(start)).toMatchObject([{ level: 'ERROR', scope: 'sugarcube', message: '<<widget>> failed\n<<widget>>' }]);
});

test('diagnostic failure does not prevent native rendering or swallow native exceptions', () => {
  const host = new SugarCube();
  const diagnostics = {
    write: () => {
      throw new Error('logger unavailable');
    }
  } as unknown as Diagnostics;
  const failure = new Error('native failure');
  const renderer = host.captureErrors(() => {
    throw failure;
  }, diagnostics);
  expect(() => renderer(null, 'error')).toThrow(failure);
});
