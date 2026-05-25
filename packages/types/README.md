# @maplebirch/types

TypeScript definitions for **maplebirchFramework**.

This package is types-only. It does not provide runtime code and should be used by mod projects as a development dependency.

## Usage

```json
{
  "devDependencies": {
    "@maplebirch/types": "^3.2.5"
  }
}
```

In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": [
      "@types/twine-sugarcube",
      "@maplebirch/types"
    ]
  }
}
```

After that, mod code can use the global `maplebirch` object with type hints:

```ts
maplebirch.tool.patch.addFoodstuff('deadwood_black_apple', {
  name: 'black apple',
  category: 'fruit'
});
```
