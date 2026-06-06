import path from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';

interface RootPackage {
  version?: string;
}

const rootDir = path.join(import.meta.dir, '..');
const distTypes = path.join(rootDir, 'dist', 'maplebirch.d.ts');
const packageDir = path.join(rootDir, 'packages', 'types');

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
  const maplebirchTypes = (await readFile(distTypes, 'utf8'))
    .replace(/^\/\/\/ <reference types="[^"]+" \/>\r?\n/gm, '')
    .replace(/^\s*#private;\r?\n/gm, '')
    .replace(/^\s*private\b.*;\r?\n/gm, '');
  await Bun.write(distTypes, maplebirchTypes);
  await Bun.write(path.join(packageDir, 'maplebirch.d.ts'), maplebirchTypes);

  await Bun.write(
    path.join(packageDir, 'index.d.ts'),
    "import instance, * as types from './maplebirch';\n\ntype Utils = typeof types.utils.publicUtils;\n\ndeclare global {\n  const maplebirch: typeof instance;\n  const clone: Utils['clone'];\n  const equal: Utils['equal'];\n  const merge: Utils['merge'];\n  const append: Utils['append'];\n  const cover: Utils['cover'];\n  const mergefn: Utils['mergefn'];\n  const appendfn: Utils['appendfn'];\n  const coverfn: Utils['coverfn'];\n  const contains: Utils['contains'];\n  const random: Utils['random'];\n  const either: Utils['either'];\n  const SelectCase: Utils['SelectCase'];\n  const convert: Utils['convert'];\n  const clamp: Utils['clamp'];\n  const loadImage: Utils['loadImage'];\n\n  interface Window extends Readonly<Utils> {\n    readonly maplebirch: typeof instance;\n  }\n}\n\nexport default instance;\nexport * from './maplebirch';\n"
  );

  await Bun.write(
    path.join(packageDir, 'package.json'),
    `${JSON.stringify(
      {
        name: '@scml-maplebirch/types',
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
    `# @scml-maplebirch/types\n\nTypeScript definitions for **maplebirchFramework**.\n\nThis package is types-only. It does not provide runtime code. Use it as a development dependency in DoL mod projects that run with maplebirchFramework loaded by ModLoader.\n\n## Install\n\n\`\`\`bash\nnpm install -D @scml-maplebirch/types\n\`\`\`\n\n## tsconfig.json\n\n\`\`\`json\n{\n  "compilerOptions": {\n    "types": ["@types/twine-sugarcube", "@scml-maplebirch/types"],\n    "skipLibCheck": true\n  }\n}\n\`\`\`\n\n## Global API Example\n\nThe package declares the global \`maplebirch\` object, so mod scripts can use the framework APIs directly:\n\n\`\`\`ts\nmaplebirch.log('module loaded', 'INFO');\nmaplebirch.tool.addTo('Options', 'MyModOptions');\n\nmaplebirch.on(':passagestart', passage => {\n  maplebirch.log(\`entered passage: \${passage.title}\`, 'DEBUG');\n});\n\nmaplebirch.dynamic.regTimeEvent('onDay', 'myMod.dailyTask', {\n  cond: () => V.myMod?.enabled === true,\n  event: () => '<<run setup.myMod.dailyTask()>>'\n});\n\`\`\`\n\n## Importing Types\n\nMost mod scripts use the global \`maplebirch\` object. If you need the default type in a helper file, import it as type-only:\n\n\`\`\`ts\nimport type maplebirch from '@scml-maplebirch/types';\n\ntype Maplebirch = typeof maplebirch;\n\`\`\`\n\n## Notes\n\n- This package only provides TypeScript declarations.\n- It does not replace the actual maplebirchFramework mod dependency.\n- Keep the package version close to the framework version used by your mod.\n`
  );

  console.log(`Types package generated: ${path.relative(rootDir, packageDir)}`);
}

writeTypesPackage().catch(error => {
  console.error(error);
  process.exit(1);
});
