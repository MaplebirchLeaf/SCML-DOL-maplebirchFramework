import { expect, test } from 'bun:test';
import path from 'node:path';

for (const [scenario, description] of [
  ['constants', 'extends the native minimum date while preserving other time constant patches'],
  ['datetime', 'preserves patched AD DateTime behavior and supports dates across the BCE boundary'],
  ['time', 'keeps native Time closures, methods and calendar getters after framework binding']
] as const) {
  test(description, () => {
    const result = Bun.spawnSync({ cmd: [process.execPath, path.join(import.meta.dir, '../fixtures/TimeCompatibility.ts'), scenario], cwd: path.join(import.meta.dir, '../..') });
    expect({ exitCode: result.exitCode, output: result.stderr.toString() + result.stdout.toString() }).toEqual({ exitCode: 0, output: '' });
  });
}
