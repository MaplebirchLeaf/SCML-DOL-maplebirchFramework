# @maplebirch/types

TypeScript definitions for **maplebirchFramework**.

This package is types-only. It does not provide runtime code. Use it as a development dependency in DoL mod projects that run with maplebirchFramework loaded by ModLoader.

## Install

```bash
npm install -D @maplebirch/types
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "types": ["@types/twine-sugarcube", "@maplebirch/types"],
    "skipLibCheck": true
  }
}
```

## Global API Example

The package declares the global `maplebirch` object, so mod scripts can use the framework APIs directly:

```ts
maplebirch.log('module loaded', 'INFO');
maplebirch.tool.addTo('Options', 'MyModOptions');

maplebirch.on(':passagestart', passage => {
  maplebirch.log(`entered passage: ${passage.title}`, 'DEBUG');
});

maplebirch.dynamic.regTimeEvent('onDay', 'myMod.dailyTask', {
  cond: () => V.myMod?.enabled === true,
  event: () => '<<run setup.myMod.dailyTask()>>'
});
```

## Importing Types

Most mod scripts use the global `maplebirch` object. If you need the default type in a helper file, import it as type-only:

```ts
import type maplebirch from '@maplebirch/types';

type Maplebirch = typeof maplebirch;
```

## Notes

- This package only provides TypeScript declarations.
- It does not replace the actual maplebirchFramework mod dependency.
- Keep the package version close to the framework version used by your mod.
