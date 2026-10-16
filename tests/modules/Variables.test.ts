import { expect, test } from 'bun:test';
import path from 'node:path';

for (const [scenario, description] of [
  ['registration', 'fills all option registration forms without replacing player values'],
  ['settings', 'fills options on storyready before title-screen settings are opened'],
  ['startup', 'fills options before initial state migrations and variable listeners'],
  ['load', 'fills loaded options while retaining false, zero, null and empty arrays'],
  ['history', 'fills options on historical moments without replacing existing objects'],
  ['missing', 'fills undefined and nested keys without extending custom arrays'],
  ['isolation', 'isolates registered defaults from active options and caller objects'],
  ['storage', 'fills restored settings and preserves reset and storage fallback behaviour']
] as const) {
  test(description, () => {
    const result = Bun.spawnSync({ cmd: [process.execPath, path.join(import.meta.dir, '../fixtures/Options.ts'), scenario], cwd: path.join(import.meta.dir, '../..') });
    expect({ exitCode: result.exitCode, output: result.stderr.toString() + result.stdout.toString() }).toEqual({ exitCode: 0, output: '' });
  });
}

test('keeps state widget execution after options and migration', () => {
  const result = Bun.spawnSync({ cmd: [process.execPath, path.join(import.meta.dir, '../fixtures/VariablesState.ts')], cwd: path.join(import.meta.dir, '../..') });
  expect({ exitCode: result.exitCode, output: result.stderr.toString() + result.stdout.toString() }).toEqual({ exitCode: 0, output: '' });
});
