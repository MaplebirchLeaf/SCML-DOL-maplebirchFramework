import { expect, test } from 'bun:test';

test('core startup keeps public utilities and leaves unsupported wikify callbacks unavailable', async () => {
  const child = Bun.spawn([process.execPath, 'tests/fixtures/CoreSurface.ts'], { stdout: 'pipe', stderr: 'pipe' });
  const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);

  expect(stderr).toBe('');
  expect(exitCode).toBe(0);
});
