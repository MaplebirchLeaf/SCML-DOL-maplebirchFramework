# ModLoader Integration

Register synchronous render hooks with `maplebirch.wikify`. Image resources belong to `maplebirch.host.modLoader.resources`, while `maplebirch.infra.diagnostics` collects diagnostics globally. See [boot.json](BootJson.md) for configuration and [HTML Tools](ToolCollection/htmlTools.md) for content construction.

## Render Hooks

```typescript
maplebirch.wikify('myMod:relationship', {
  beforeWidget(text, name, passageTitle, passage) {
    return text;
  },
  afterWidget(text, name, passageTitle, passage, node) {
    if (name !== 'relationshiptext') return;
    node.append(document.createTextNode('Relationship details'));
  }
});
```

Names are ordinary strings: both `myMod:relationship` and `myMod-relationship` work. The framework prefixes the underlying registration with `maplebirch:` without splitting your name. Same-name registration follows ModLoader's replacement rules. Include your Mod name to avoid collisions.

| Callback        | Arguments                                       | Return value                 |
| --------------- | ----------------------------------------------- | ---------------------------- |
| `beforePassage` | `text, passageTitle, passage`                   | Unchanged or modified source |
| `afterPassage`  | `text, passageTitle, passage, node`             | None                         |
| `beforeWidget`  | `text, widgetName, passageTitle?, passage?`     | Unchanged or modified source |
| `afterWidget`   | `text, widgetName, passageTitle, passage, node` | None                         |
| `beforeWikify`  | `text`                                          | Unchanged or modified source |
| `afterWikify`   | `text, node`                                    | None                         |

Callbacks run synchronously, outside the async event bus. Before hooks must return strings; subsequent callbacks receive the previous result. Widget passage information may be `undefined`; the ModLoader SugarCube hook can pass the widget definition passage rather than the current player page. Read `maplebirch.SugarCube.State.passage` when the current page is needed. The current fragment may not yet be attached to the page.

Filter targets before calling Wikifier within a hook to avoid recursion. Upstream exposes no removal API; this entry point does not provide removal or priorities. For vanilla adapters matched by widget name, see [Patch](ToolCollection/Patches.md).

These hooks describe rendering order. A widget containing a reward link can finish before the player clicks that link. Reward logic belongs in the successful branch. Use [source patches](ToolCollection/Framework.md#source-patches) when an exact branch must be adapted; `afterWidget` is not a success event.

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

## Dependencies and Conflicts

```typescript
const diagnostics = maplebirch.infra.diagnostics;
const requirement = diagnostics.mod('OtherMod', '>=1.2.0');
console.log(requirement.status, requirement.version);
console.log(diagnostics.checkDependencies());
console.table(diagnostics.conflicts);
```

`mod(name, range?)` queries an ordinary loaded Mod and returns its name, version, range and status: `available`, `missing` or `incompatible`. Parsing exceptions return `invalid` with `error`. It uses ModLoader's version algorithm; omit the range to check presence only.

`checkDependencies()` delegates complete dependency and load-order validation to ModLoader. It returns a boolean; the loader logs details. Use it for special dependencies such as ModLoader and game versions as well.

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
