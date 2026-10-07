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

## AI Repair State Permissions

The framework automatically discovers save fields related to the diagnosis from explicit static `V.foo`, `$foo` or `State.variables` paths in the current error logs and related current source. Authors do not need to register paths, schemas or ownership, and discovery does not distinguish game and mod variables. Core supplies the SugarCube `State.variables` host for reading actual values; the service does not bind to DoL-specific variable names.

Only targets and bounds supplied for the current analysis may be read or modified. The model cannot add targets or expand their bounds, and it never receives a complete save. Each analysis includes at most 8 state fragments, each limited to 16 KiB and accepting only plain JSON data: objects, arrays, strings, finite numbers, booleans and null. Functions, special objects, cycles and accessors are excluded from requests and repairs. JSON validation checks data and operation bounds; it cannot establish that repaired values have the correct game semantics.

State operations are `set / delete / rename / copy / merge / fill`, with complete array paths such as `['ExampleMod', 'progress', 'state']`. Both operation and destination paths must remain within the supplied target bounds. `merge` combines recursively; `fill` supplies missing values only, preserving existing false, 0 and null. Whole host state roots, V/setup/window and prototype fields are prohibited, as are expression evaluation and generated code execution.

Records using an old repair format are disabled when validation fails. Analyze again to generate a proposal in the current format.

Source operations are `replace / insertBefore / insertAfter / delete`, retaining exact matches, fingerprints, target bindings and existing code restrictions. AI-generated functions are never executed. Correctable format or anchor errors receive at most one feedback attempt through the same API. Permission failures, prohibited code, cancellation and API failures do not retry.

`type: 'ast'` supports expression, statement and block replacement, insertion before/after a statement, and whole-statement deletion in bound JS or embedded Twee JS. `selector: { nodeType, source }` uses an ESTree type and the complete observed node source; token matching ignores whitespace/comments and must be unique. `action` is `replaceExpression / replaceStatement / replaceBlock / insertBefore / insertAfter / deleteStatement`; all except deletion require `code`. Offsets and match counts cannot resolve ambiguity.

Acorn parses, validates and computes ranges; the engine splices only the original source and reparses the complete containing JS unit. Twee macro ranges are also checked again. The initial subset allows existing identifiers, static properties, JSON, ordinary expressions, existing assignment paths, return, if and blocks. New functions, constructors, dynamic properties and network loading are rejected. Existing calls may only be retained unchanged, without different arguments, duplication or redirection. Twee accepts independently parseable JS macro arguments/script bodies; SugarCube dialects such as `to/is/and` are not converted. CSS, state and patch bindings retain their existing mechanisms. AST recipes remain in memory and are revalidated for location, syntax and permissions during replay.

All targets validate before source overlays apply. State migrations check old values, write and validate synchronously at `:variable`. A repair enters `trial` only after both phases verify; users retest and confirm `active`. Memory lives in `maplebirch/repair` and replays on reload or save loading without AI. Changed targets or permissions disable it. Failure across loading phases restores reversible overlays and state snapshots and requires a reload; previously executed script effects cannot be undone generically. Original ZIPs and installed ModLoader packages remain unchanged.

TweeReplacer bindings may combine `rebase: true` with `expressions: [{ find, replace, expectedMatches: 1 }]`. Rebase first preserves inherited current source, then the engine migrates a complete installed `if/elseif` condition or single `set` RHS. New expressions use ordinary JS operators, observed static reads and literal values, with no calls or macro structure. Introduced temporary roots require unconditional initialization before the anchor. Recheck the actual native input and final output; validate and roll back the body, binding and state changes together.

AST binding and write permissions come from the selected node's original lexical block, excluding unrelated functions and nested blocks. Declaration kinds, expression slots and lexical boundaries must remain valid. Units containing dynamic callees, constructors, dynamic imports, tagged templates or prohibited calls currently reject AST repairs to prevent indirect execution through modified argument variables; other supported Repair mechanisms remain available. Static validation does not establish runtime correctness.
