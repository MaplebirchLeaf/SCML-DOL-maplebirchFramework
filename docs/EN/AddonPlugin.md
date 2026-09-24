# ModLoader Integration

Image resources belong to `maplebirch.host.modLoader.resources`, while `maplebirch.infra.diagnostics` collects diagnostics globally. See [boot.json](BootJson.md) for configuration and [HTML Tools](Tools/Text.md) for content construction.

## Adapting Vanilla Content

The framework no longer exposes `maplebirch.wikify()` rendering interception: the current host accepts callback registration but does not invoke it while SugarCube parses content. Use [source patches](Tools/Zones.md#source-patches) with `expected` to change widget content, or listen for [`:passagedisplay`](Events.md) to edit displayed page nodes. The text Builder's `wikify(content)` only parses supplied text; it is not a rendering hook.

## Image Resources

```typescript
const resources = maplebirch.host.modLoader.resources;
const image = await resources.load('img/myMod/icon.png');
if (image !== false) document.querySelector<HTMLImageElement>('#myModIcon')!.src = image;
```

| Method            | Result and behavior                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `normalize(path)` | Normalizes relative Mod paths, preserving protocol URLs                                                                         |
| `has(path)`       | `true` for present, `false` for absent, `undefined` when providers cannot decide; sends no image request                        |
| `load(path)`      | Returns a cached resolved URL or `false`, otherwise a Promise; queries ModLoader before trying the original path in the browser |
| `clear(path?)`    | Clears one path or all cached results; pending requests still complete but cannot restore cleared entries                       |

Concurrent loads of the same path share a request. The cache retains the resolved address, including Mod image data URLs. Browser fallback times out after 15 seconds. `has` reflects cache/provider knowledge; a provider returning false does not rule out a working ordinary URL. Use `load` to resolve it. Failures are cached too; call `clear` after resource changes or before retrying. The framework clears the cache after early-load.

[loadImage](Utilities.md#loadimage) uses this resolver and retains its sidebar refresh behavior.

## Conflicts

```typescript
const diagnostics = maplebirch.infra.diagnostics;
console.table(diagnostics.conflicts);
```

`conflicts` snapshots upstream merge results: `source`, `dataSource`, and arrays of colliding `passages`, `scripts` and `styles`. `undefined` means results are unavailable. These are resource-name conflicts, not failed source patches or exact attribution of conflicting source changes.

## Patch Reports

```typescript
const failures = maplebirch.infra.diagnostics.patches.filter(item => item.status !== 'applied');
console.table(failures);
```

Framework zone patches, `maplebirch.host.modLoader.replace()` and replacement of existing Twine scripts/styles produce reports with `kind`, `target`, `index`, `pattern`, `matches`, `applied`, `status`, and optional `expected`/`error`. Patch indices start at 1; whole-asset operations and target checks use 0.

| Status      | Meaning                                                  |
| ----------- | -------------------------------------------------------- |
| `applied`   | Replacement executed                                     |
| `unmatched` | Target exists but source did not match                   |
| `missing`   | Passage, asset or container is absent                    |
| `invalid`   | Invalid configuration or wrong passage patch group       |
| `mismatch`  | Match count differs from `expected`; replacement skipped |
| `error`     | Execution failed; see error                              |

The latest result is retained for each kind/target/index. Reads return copies; `clearPatches()` clears the reports. Third-party patches executed directly are outside this record, and reports do not replace game behavior validation.
