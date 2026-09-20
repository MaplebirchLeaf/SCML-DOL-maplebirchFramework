# Patch Registration

`maplebirch.tool.patch` manages vanilla data extensions. Use catalog APIs such as `addTraits()`, `addFoodstuff()` and `addFish()`, or register your own APIs and lifecycle handlers with `.add(name, definition)`.

## Entry Point

```javascript
maplebirch.tool.patch.add(name, definition);
```

**`name`** is the unique extension name; both `myMod:catalog` and `myMod-catalog` work. **`definition.api`** declares the members to add to `patch`; other fields are optional.

The return value is `patch` with the new members and their TypeScript types. Duplicate names or API properties conflicting with existing members throw. Register during startup; late registration does not replay completed phases.

## Minimal Example

```typescript
const patch = maplebirch.tool.patch.add('myMod:catalog', {
  api: { myCatalog: new Map<string, string>() },
  init() {
    // Merge static configuration into setup
  },
  state() {
    // Fill missing save data in V
  },
  widgets: {
    myModWidget: {
      before(text) {
        return text;
      },
      after(node) {
        node.append(document.createTextNode('My Mod'));
      }
    }
  }
});
patch.myCatalog.set('example', 'value');
```

## Lifecycle

| Handler                      | Timing                                                | Purpose                                                         |
| ---------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| `init()`                     | During StoryInit, after vanilla static initialization | Merge setup catalogs without creating save variables            |
| `state()`                    | State initialization for a new or loaded game         | Fill missing V entries while preserving quantities and progress |
| `widgets[name].before(text)` | Before the named widget executes                      | Prepare data or transform source; must return a string          |
| `widgets[name].after(node)`  | After the named widget renders                        | Use results or edit its fragment                                |

Handlers run synchronously in registration order. Errors are logged without stopping subsequent handlers. `before` results feed subsequent handlers; return unchanged source when only preparing data. `after` receives a fragment that may not be attached yet and cannot determine whether a link has been clicked or a reward granted. See [ModLoader Integration](../AddonPlugin.md#render-hooks) for hooks with full context.

Locations, bodywriting, food, fish and tips merge static data during init. Food inventory and antique state fill missing entries during state. Antique text, donation and tip lists use widget hooks. Loading a save does not initialize setup again.

Related docs:

- [boot.json Configuration](../BootJson.md)
- [Traits](Traits.md)
- [Tips](Tips.md)
- [Location Config](Location.md)
- [Bodywriting](Bodywriting.md)
- [Foodstuff](Foodstuff.md)
- [Fishing Extensions](Fishing.md)
- [Antiques](Antiques.md)
