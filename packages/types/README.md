# @scml-dol-maplebirch/types

[![npm version](https://img.shields.io/npm/v/@scml-dol-maplebirch/types.svg)](https://www.npmjs.com/package/@scml-dol-maplebirch/types)
[![license](https://img.shields.io/npm/l/@scml-dol-maplebirch/types.svg)](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/LICENSE)

TypeScript declarations for the public APIs and globals exposed by
[maplebirchFramework](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework).

This package contains declarations only. It improves editor completion and type checking for DoL mods,
but does not install or load maplebirchFramework at runtime.

## Installation

```bash
npm install --save-dev @scml-dol-maplebirch/types
```

## Configuration

Add the package to the `types` list in your mod project's `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@types/twine-sugarcube", "@scml-dol-maplebirch/types"],
    "skipLibCheck": true
  }
}
```

`skipLibCheck` is currently recommended because declarations supplied by the wider ModLoader ecosystem
are not yet fully compatible with TypeScript 7's stricter declaration checks. Your own source files are
still checked normally.

If your project does not restrict `compilerOptions.types`, installing the package and importing it from
one source file is sufficient:

```ts
import type {} from '@scml-dol-maplebirch/types';
```

## Global API

The package declares the global `maplebirch` instance and the framework's public utility globals:

```ts
maplebirch.log('module loaded', 'INFO');
maplebirch.tool.addTo('Options', 'MyModOptions');

maplebirch.on(':passagestart', passage => {
  maplebirch.log(`entered passage: ${passage.title}`, 'DEBUG');
});

const copy = clone({ enabled: true });
```

## Importing the API type

Use a type-only import when a named type is more convenient than the global declaration:

```ts
import type maplebirch from '@scml-dol-maplebirch/types';

type Maplebirch = typeof maplebirch;
```

## Version compatibility

Package versions follow maplebirchFramework versions. For the most accurate declarations, use the same
version as the framework loaded by your mod rather than relying on an unpinned latest version.

## Related dependencies

Declarations from SugarCube, ModLoader, and SC2 are installed transitively. You normally do not need to
install them separately unless your project imports those packages directly.

## License

[MIT](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/LICENSE)
