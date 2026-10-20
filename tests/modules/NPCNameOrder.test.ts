import { expect, test } from 'bun:test';

test('saved NPC indices follow the data array across registration changes and save loads', async () => {
  const child = Bun.spawn([process.execPath, 'tests/fixtures/NPCNameOrder.ts'], { stdout: 'pipe', stderr: 'pipe' });
  const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
  expect(stderr).toBe('');
  expect(exitCode).toBe(0);
});
