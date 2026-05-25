import path from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';

interface RootPackage {
  version?: string;
}

const rootDir = path.join(import.meta.dir, '..');
const distTypes = path.join(rootDir, 'dist', 'maplebirch.d.ts');
const packageDir = path.join(rootDir, 'packages', 'types');
const globals = 'import type {} from \'twine-sugarcube\';\n\ndeclare global {\n  class DateTime {\n    constructor(...args: any[]);\n    [key: string]: any;\n  }\n}\n\n';

async function readRootVersion(): Promise<string> {
  const content = await readFile(path.join(rootDir, 'package.json'), 'utf8');
  try {
    const pkg = JSON.parse(content) as RootPackage;
    if (pkg.version) return pkg.version;
  } catch {
    const match = content.match(/"version"\s*:\s*"([^"]+)"/);
    if (match) return match[1];
  }
  return '0.0.0';
}

async function writeTypesPackage(): Promise<void> {
  const version = await readRootVersion();
  await mkdir(packageDir, { recursive: true });
  const maplebirchTypes = `${globals}${(await readFile(distTypes, 'utf8'))
    .replace(/^\/\/\/ <reference types="[^"]+" \/>\r?\n/gm, '')
    .replace(/^\s*#private;\r?\n/gm, '')
    .replace(/^\s*private\b.*;\r?\n/gm, '')
    .replace(/\btypeof window\.SugarCube\b/g, 'any')}`;
  await Bun.write(distTypes, maplebirchTypes);
  await Bun.write(path.join(packageDir, 'maplebirch.d.ts'), maplebirchTypes);

  await Bun.write(
    path.join(packageDir, 'index.d.ts'),
    'import maplebirchDefault from \'./maplebirch\';\n\ndeclare global {\n  const maplebirch: typeof maplebirchDefault;\n\n  interface Window {\n    readonly maplebirch: typeof maplebirchDefault;\n  }\n}\n\nexport default maplebirchDefault;\nexport * from \'./maplebirch\';\n'
  );

  await Bun.write(
    path.join(packageDir, 'package.json'),
    `${JSON.stringify(
      {
        name: '@maplebirch/types',
        version,
        description: 'TypeScript definitions for maplebirchFramework.',
        license: 'MIT',
        types: 'index.d.ts',
        sideEffects: false,
        files: ['index.d.ts', 'maplebirch.d.ts', 'README.md'],
        keywords: ['degrees-of-lewdity', 'dol', 'maplebirch', 'modloader', 'types'],
        homepage: 'https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework#readme',
        repository: {
          type: 'git',
          url: 'git+https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework.git',
          directory: 'packages/types'
        },
        publishConfig: {
          access: 'public'
        },
        dependencies: {
          '@scml/types': '^1.0.7',
          '@types/howler': '^2.2.12',
          '@types/js-yaml': '^4.0.5',
          '@types/twine-sugarcube': '^2.37.2',
          howler: '^2.2.4',
          'js-yaml': '^4.1.0',
          marked: '^17.0.3'
        }
      },
      null,
      2
    )}\n`
  );

  await Bun.write(
    path.join(packageDir, 'README.md'),
    `# @maplebirch/types\n\nTypeScript definitions for **maplebirchFramework**.\n\nThis package is types-only. It does not provide runtime code and should be used by mod projects as a development dependency.\n\n## Usage\n\n\`\`\`json\n{\n  "devDependencies": {\n    "@maplebirch/types": "^${version}"\n  }\n}\n\`\`\`\n\nIn \`tsconfig.json\`:\n\n\`\`\`json\n{\n  "compilerOptions": {\n    "types": [\n      "@types/twine-sugarcube",\n      "@maplebirch/types"\n    ]\n  }\n}\n\`\`\`\n\nAfter that, mod code can use the global \`maplebirch\` object with type hints:\n\n\`\`\`ts\nmaplebirch.tool.patch.addFoodstuff('deadwood_black_apple', {\n  name: 'black apple',\n  category: 'fruit'\n});\n\`\`\`\n`
  );

  console.log(`Types package generated: ${path.relative(rootDir, packageDir)}`);
}

writeTypesPackage().catch(error => {
  console.error(error);
  process.exit(1);
});
