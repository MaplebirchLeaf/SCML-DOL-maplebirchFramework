import { expect, test } from 'bun:test';

test('NPC transformation caps preserve growth, foreign saves and render isolation across loads', async () => {
  const child = Bun.spawn([process.execPath, 'tests/fixtures/NPCTransformation.ts'], { stdout: 'pipe', stderr: 'pipe' });
  const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
  expect(stderr).toBe('');
  expect(exitCode).toBe(0);
});
