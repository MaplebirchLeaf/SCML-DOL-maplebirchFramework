import path from 'node:path';
import { rm, readFile, writeFile } from 'node:fs/promises';

async function updateDate(rootDir: string) {
  const pkgPath = path.join(rootDir, 'package.json');
  const raw = await readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(raw);
  const now = new Date();
  const date = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
  pkg.lastUpdate = date;
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ lastUpdate 已更新: ${date}`);
}

async function clean(rootDir: string) {
  const distDir = path.join(rootDir, 'dist');
  const packageDir = path.join(rootDir, 'package');
  await rm(distDir, { recursive: true, force: true });
  console.log('✓ dist目录已清理');
  await rm(packageDir, { recursive: true, force: true });
  console.log('✓ package目录已清理');
}

async function prep() {
  const rootDir = path.join(import.meta.dir, '..');
  try {
    await updateDate(rootDir);
    await clean(rootDir);
  } catch (err) {
    console.error('构建准备阶段出错:', err);
    process.exit(1);
  }
}

void prep();
