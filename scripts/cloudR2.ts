import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const workerDir = join(import.meta.dir, '..', 'cloud-services', 'cloudflare-webdav-worker');
const envPath = join(workerDir, '.dev.vars');
const workerUrlPath = join(workerDir, 'worker-url.txt');
const forwardedEnv = new Set(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']);

function readDevVars() {
  if (!existsSync(envPath)) return {};

  const env: Record<string, string> = {};
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator < 0) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    if (forwardedEnv.has(key)) env[key] = value;
  }
  return env;
}

const result = spawnSync('wrangler', Bun.argv.slice(2), {
  cwd: workerDir,
  stdio: 'pipe',
  shell: true,
  encoding: 'utf8',
  env: {
    ...process.env,
    ...readDevVars()
  }
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if ((result.status ?? 1) === 0 && Bun.argv.slice(2).includes('deploy')) {
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const url = output.match(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/i)?.[0];
  if (url) {
    writeFileSync(workerUrlPath, `${url}\n`, 'utf8');
    console.log(`Worker URL saved to ${workerUrlPath}`);
  }
}

process.exit(result.status ?? 1);
