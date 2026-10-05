import { expect, test } from 'bun:test';

test('saved NPCs acquire custom stats without losing progress', async () => {
  const child = Bun.spawn([process.execPath, 'tests/fixtures/NPCStats.ts'], { stdout: 'pipe', stderr: 'pipe' });
  const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
  expect(stderr).toBe('');
  expect(exitCode).toBe(0);
});
