# Patch Registration

`maplebirch.tool.patch` is a reusable patch registry. The DoL integration registers the built-in vanilla-data extensions, such as traits and locations; another game can register only the extensions it needs. Each extension is mounted by name on `patch` and registers its APIs and lifecycle handlers through `.add(name, definition)`.

## Entry Point

```javascript
maplebirch.tool.patch.add(name, definition);
maplebirch.tool.patch.get(name);
```

**`name`** is the unique extension name; both `myMod:catalog` and `myMod-catalog` work. **`definition.api`** declares the members to add to `patch`; other fields are optional.

Built-in extensions are available as `patch.traits`, `patch.location`, `patch.bodywriting`, `patch.fishing`, `patch.foodstuff`, `patch.antiques` and `patch.tips`. Use `get(name)` for dynamic names; it returns `undefined` when absent. Use `require(name)` when absence should throw, and `has(name)` or `names()` to inspect registrations.

Separate extensions may declare API members with the same name without conflicting in their namespaces. `.add()` keeps non-conflicting flat API members for 4.x compatibility; new code should use namespaces. Duplicate extension names throw. Register during startup; late registration does not replay completed phases.

## Minimal Example

```typescript
const api = { myCatalog: new Map<string, string>() };

maplebirch.tool.patch.add('myMod:catalog', {
  api,
  available() {
    return Boolean(setup.myCatalog);
  },
  init() {
    // Merge static configuration into setup
  },
  state() {
    // Fill missing save data in V
  }
});

const catalog = maplebirch.tool.patch.require<typeof api>('myMod:catalog');
catalog.myCatalog.set('example', 'value');
```

## Lifecycle

| Handler       | Timing                                                | Purpose                                                         |
| ------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| `available()` | Before each lifecycle handler                         | Skip this extension when it returns `false`                     |
| `init()`      | During StoryInit, after vanilla static initialization | Merge setup catalogs without creating save variables            |
| `state()`     | State initialization for a new or loaded game         | Fill missing V entries while preserving quantities and progress |

Handlers run synchronously in registration order. `available` is evaluated each time and can return `false` when a required vanilla structure is absent, skipping `init` or `state`. Errors are logged without stopping subsequent handlers.

Locations, bodywriting, food, fish and tips merge static data during init. They silently skip when their vanilla catalog is absent and do not create missing vanilla `setup` roots. Food inventory and antique state fill missing entries during state. Antique text, donation and tip lists use [widget source patches](Zones.md#source-patches). Loading a save does not initialize setup again.

Related docs:

- [boot.json Configuration](../BootJson.md)
- [Traits](Traits.md)
- [Tips](Tips.md)
- [Location Config](Location.md)
- [Bodywriting](Bodywriting.md)
- [Foodstuff](Foodstuff.md)
- [Fishing Extensions](Fishing.md)
- [Antiques](Antiques.md)
