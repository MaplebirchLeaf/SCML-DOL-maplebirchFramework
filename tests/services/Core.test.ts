import { expect, test } from 'bun:test';

test('core startup is logged at INFO and wikify delegates to the AddonPlugin', async () => {
  const child = Bun.spawn([process.execPath, 'tests/fixtures/CoreWikify.ts'], { stdout: 'pipe', stderr: 'pipe' });
  const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);

  expect(stderr).toBe('');
  expect(exitCode).toBe(0);
});
