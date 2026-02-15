import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { execSync } from 'child_process';

const CONFIG = {
  SRC_PROJECT_PATH: path.resolve(__dirname, '../scml-types'),
  DEST_TYPES_PATH: path.resolve(__dirname, '../types'),
  SRC_DIR: path.resolve(__dirname, '../src'),
  GIT_REPO: 'https://github.com/Muromi-Rikka/scml-types.git',
};

function prepareSourceProject() {
  console.log('准备 scml-types 项目...');
  if (!fs.existsSync(CONFIG.SRC_PROJECT_PATH)) {
    execSync(`git clone ${CONFIG.GIT_REPO} ${CONFIG.SRC_PROJECT_PATH}`, { stdio: 'ignore' });
  }

  const packagesPath = path.join(CONFIG.SRC_PROJECT_PATH, 'packages');
  if (!fs.existsSync(packagesPath)) throw new Error('项目结构异常');

  let hasBuiltTypes = false;
  for (const dirent of fs.readdirSync(packagesPath, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      const typeDistPath = path.join(packagesPath, dirent.name, 'type-dist');
      if (fs.existsSync(typeDistPath) && fs.readdirSync(typeDistPath).some(f => f.endsWith('.d.ts'))) {
        hasBuiltTypes = true;
        break;
      }
    }
  }

  if (!hasBuiltTypes) {
    console.log('安装依赖并构建...');
    execSync('pnpm install', { cwd: CONFIG.SRC_PROJECT_PATH, stdio: 'ignore' });
    execSync('pnpm build', { cwd: CONFIG.SRC_PROJECT_PATH, stdio: 'ignore' });
  }
}

function getAllTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  const walk = (currentPath: string) => {
    for (const item of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const fullPath = path.join(currentPath, item.name);
      if (item.isDirectory()) {
        if (!['node_modules', 'dist', '.git', '.vscode'].includes(item.name)) walk(fullPath);
      } else if (item.name.endsWith('.ts') && !item.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  };
  walk(dir);
  return files;
}

function extractPackageName(importPath: string): string | null {
  const match = importPath.match(/\.\.\/+types\/([^\/]+)(?:\/|$)/);
  return match ? match[1] : null;
}

function analyzeImports(filePath: string): Set<string> {
  const packages = new Set<string>();
  try {
    const code = fs.readFileSync(filePath, 'utf-8');
    const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
    traverse(ast, {
      ImportDeclaration(path: { node: { source: { value: any; }; }; }) {
        const importPath = path.node.source.value;
        if (typeof importPath === 'string') {
          const pkg = extractPackageName(importPath);
          if (pkg) packages.add(pkg);
        }
      }
    });
  } catch {}
  return packages;
}

function extractDependenciesFromPackage(packagesPath: string, packageName: string): Set<string> {
  const dependencies = new Set<string>();
  const typeDistPath = path.join(packagesPath, packageName, 'type-dist');
  if (!fs.existsSync(typeDistPath)) return dependencies;

  for (const dtsFile of fs.readdirSync(typeDistPath).filter(f => f.endsWith('.d.ts'))) {
    const filePath = path.join(typeDistPath, dtsFile);
    try {
      const code = fs.readFileSync(filePath, 'utf-8');
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      traverse(ast, {
        ImportDeclaration(path: { node: { source: { value: any; }; }; }) {
          const importPath = path.node.source.value;
          if (typeof importPath === 'string') {
            const match = importPath.match(/\.\.\/+types\/([^\/]+)(?:\/|$)/);
            if (match) {
              const depPackage = match[1];
              if (!dependencies.has(depPackage)) {
                dependencies.add(depPackage);
              }
            }
          }
        }
      });
    } catch {}
  }

  return dependencies;
}

function collectAllDependencies(packagesPath: string, initialPackages: Set<string>): Set<string> {
  const allPackages = new Set<string>(initialPackages);
  const queue = Array.from(initialPackages);
  const processed = new Set<string>();

  while (queue.length > 0) {
    const packageName = queue.shift()!;
    if (processed.has(packageName)) continue;
    processed.add(packageName);

    const dependencies = extractDependenciesFromPackage(packagesPath, packageName);
    
    for (const depPackage of dependencies) {
      if (!allPackages.has(depPackage)) {
        allPackages.add(depPackage);
        queue.push(depPackage);
      }
    }
  }

  return allPackages;
}

function copyDirRecursive(srcDir: string, destDir: string): number {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  
  let copiedCount = 0;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    
    if (entry.isDirectory()) {
      copiedCount += copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      fs.copyFileSync(srcPath, destPath);
      copiedCount++;
    }
  }
  return copiedCount;
}

async function copyTypeDefinitions() {
  prepareSourceProject();
  
  if (!fs.existsSync(CONFIG.SRC_DIR)) return 0;
  if (!fs.existsSync(CONFIG.DEST_TYPES_PATH)) fs.mkdirSync(CONFIG.DEST_TYPES_PATH, { recursive: true });

  const tsFiles = getAllTypeScriptFiles(CONFIG.SRC_DIR);
  if (tsFiles.length === 0) {
    console.log('没有找到 TypeScript 源文件');
    return 0;
  }

  console.log(`分析 ${tsFiles.length} 个 TypeScript 文件...`);
  const neededPackages = new Set<string>();
  for (const file of tsFiles) analyzeImports(file).forEach(pkg => neededPackages.add(pkg));
  
  if (neededPackages.size === 0) {
    console.log('未发现任何包依赖');
    return 0;
  }

  console.log(`发现 ${neededPackages.size} 个直接依赖包`);
  const packagesPath = path.join(CONFIG.SRC_PROJECT_PATH, 'packages');
  const allPackages = collectAllDependencies(packagesPath, neededPackages);
  console.log(`递归分析后共需 ${allPackages.size} 个包`);

  let copiedCount = 0;
  for (const packageName of allPackages) {
    const typeDistPath = path.join(packagesPath, packageName, 'type-dist');
    if (!fs.existsSync(typeDistPath)) {
      console.warn(`包 ${packageName} 的 type-dist 目录不存在，跳过`);
      continue;
    }

    const destPath = path.join(CONFIG.DEST_TYPES_PATH, packageName);
    copiedCount += copyDirRecursive(typeDistPath, destPath);
  }

  return copiedCount;
}

async function main() {
  try {
    const copiedCount = await copyTypeDefinitions();
    console.log(`复制完成: ${copiedCount} 个 .d.ts 文件`);
  } catch (error) {
    console.error('执行出错:', error.message);
    process.exit(1);
  }
}

main();