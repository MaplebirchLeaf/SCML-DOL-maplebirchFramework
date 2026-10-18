import { expect, test } from 'bun:test';

test('NPC descriptions follow language across exposure and saves without changing anatomy or custom text', async () => {
  const child = Bun.spawn([process.execPath, 'tests/fixtures/NPCDescriptions.ts'], { stdout: 'pipe', stderr: 'pipe' });
  const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
  expect(stderr).toBe('');
  expect(exitCode).toBe(0);
});
