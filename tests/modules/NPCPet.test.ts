import { expect, test } from 'bun:test';
import path from 'node:path';

for (const [scenario, description] of [
  ['missing', 'keeps NPC pets disabled without accessing missing framework options or the renderer'],
  ['state-switch', 'unmounts queued NPC pets when the active state loses its options'],
  ['disabled', 'honours NPC pet disabling before the queued frame runs'],
  ['current-options', 'renders NPC pets with the current state selection, mask, lock and animation options'],
  ['cancel', 'cancels queued NPC pet work when a disabled state is synchronized']
] as const) {
  test(description, () => {
    const result = Bun.spawnSync({ cmd: [process.execPath, path.join(import.meta.dir, '../fixtures/NPCPetState.ts'), scenario], cwd: path.join(import.meta.dir, '../..') });
    expect({ exitCode: result.exitCode, output: result.stderr.toString() + result.stdout.toString() }).toEqual({ exitCode: 0, output: '' });
  });
}
