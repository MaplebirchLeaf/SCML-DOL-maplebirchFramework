import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const releaseRefs = (process.env.RELEASE_SYNC_REFS || 'dol-v0.5.8.10,dol-v0.5.9.8')
  .split(/[\n,]/)
  .map(ref => ref.trim())
  .filter(Boolean);

const versionFiles = ['package.json', 'packages/types/package.json', 'src/modules/Variables.ts'];
const sourceBranch = output('git', ['branch', '--show-current']);

if (!sourceBranch) fail('当前不在具名分支上，无法安全发布。');
if (sourceBranch.startsWith('dol-v')) fail(`当前分支是兼容分支 ${sourceBranch}，请切回 main/dev 后发布。`);

try {
  run('bunx', ['bumpp', '--no-push', '--tag', 'maplebirch-release-v%s', ...Bun.argv.slice(2)]);

  const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
  const tagName = `maplebirch-release-v${version}`;

  if (output('git', ['status', '--porcelain'])) fail('bumpp 后工作区仍有未提交改动，已停止同步分支。');
  if (output('git', ['tag', '--list', tagName]) !== tagName) fail(`没有找到发布标签 ${tagName}。`);

  for (const ref of releaseRefs) syncRef(ref, version);

  run('git', ['switch', sourceBranch]);
  run('git', ['push', 'origin', sourceBranch]);
  run('git', ['push', 'origin', tagName]);
  for (const ref of releaseRefs) run('git', ['push', 'origin', ref]);
} finally {
  if (sourceBranch && output('git', ['branch', '--show-current']) !== sourceBranch) run('git', ['switch', sourceBranch]);
}

function syncRef(ref: string, version: string) {
  run('git', ['fetch', 'origin', `refs/heads/${ref}:refs/remotes/origin/${ref}`]);

  if (!hasRef(`refs/heads/${ref}`)) {
    run('git', ['switch', '-c', ref, `origin/${ref}`]);
  } else {
    run('git', ['switch', ref]);
    run('git', ['merge', '--ff-only', `origin/${ref}`]);
  }

  updateVersionFiles(version);

  if (!output('git', ['status', '--porcelain'])) return;
  run('git', ['add', ...versionFiles.filter(file => existsSync(file))]);
  run('git', ['commit', '-m', `chore(release): sync v${version}`]);
}

function updateVersionFiles(version: string) {
  updateJsonVersion('package.json', version);
  updateJsonVersion('packages/types/package.json', version);

  if (existsSync('src/modules/Variables.ts')) {
    const file = 'src/modules/Variables.ts';
    const content = readFileSync(file, 'utf8');
    const next = content.replace(/const version = ['"][^'"]+['"];/, `const version = '${version}';`);
    if (next !== content) writeFileSync(file, next);
  }
}

function updateJsonVersion(file: string, version: string) {
  if (!existsSync(file)) return;
  const data = JSON.parse(readFileSync(file, 'utf8'));
  data.version = version;
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function hasRef(ref: string) {
  return Bun.spawnSync({ cmd: ['git', 'show-ref', '--verify', '--quiet', ref], stdout: 'ignore', stderr: 'ignore' }).exitCode === 0;
}

function output(command: string, args: string[]) {
  const result = Bun.spawnSync({ cmd: [command, ...args], stdout: 'pipe', stderr: 'inherit' });
  if (result.exitCode !== 0) fail(`${command} ${args.join(' ')} 执行失败。`);
  return result.stdout.toString().trim();
}

function run(command: string, args: string[]) {
  console.log(`> ${command} ${args.join(' ')}`);
  const result = Bun.spawnSync({ cmd: [command, ...args], stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' });
  if (result.exitCode !== 0) fail(`${command} ${args.join(' ')} 执行失败。`);
}

function fail(message: string): never {
  console.error(`\n[release] ${message}`);
  process.exit(1);
}
