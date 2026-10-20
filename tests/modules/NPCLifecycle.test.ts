import { expect, test } from 'bun:test';

test('NPC load lifecycle preserves progress, restores name lookups and adds only missing NPCs', async () => {
  const child = Bun.spawn([process.execPath, 'tests/fixtures/NPCLifecycle.ts'], { stdout: 'pipe', stderr: 'pipe' });
  const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
  expect(stderr).toBe('');
  expect(exitCode).toBe(0);
});
