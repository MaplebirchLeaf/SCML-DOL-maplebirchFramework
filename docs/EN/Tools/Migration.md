# Data migration

`migration` upgrades a mod's saved data. Create an instance through `maplebirch.tool.migration`, register version transitions, and run them against the saved object.

## Entry Point

```javascript
const migrator = maplebirch.tool.migration.create();
// new maplebirch.tool.migration() is also supported.

migrator.add('1.0.0', '1.1.0', (data, utils) => {
  utils.move(data, 'user.name', 'user.fullName');
  utils.transform(data, 'user.age', value => Number(value));
  utils.remove(data, 'user.deprecatedField');
});

const data = {
  version: '1.0.0',
  user: {
    name: 'Alice',
    age: '25',
    deprecatedField: true
  }
};
migrator.run(data, '1.1.0');
// data: { version: '1.1.0', user: { fullName: 'Alice', age: 25 } }
```

## Versions and Execution Order

Use numeric version segments such as `1.0.0`. A missing `data.version` is treated as `0.0.0`.

`add(from, to, apply)` registers a synchronous transition; `from` accepts a version or `'*'`. Duplicate version pairs and steps that cannot advance the version are ignored.

For a save at `1.0.0` targeting `1.2.0`, registered steps determine the route:

| Registered steps                    | Execution                                            |
| :---------------------------------- | :--------------------------------------------------- |
| `1.0.0 → 1.1.0` and `1.1.0 → 1.2.0` | Run both in sequence                                 |
| Those two plus `1.0.0 → 1.2.0`      | Run the direct step only                             |
| Only `1.0.0 → 1.1.0`                | Stop at `1.1.0`; do not assign `1.2.0` automatically |

**A direct step must include all necessary intermediate conversions.** Selection first looks for the current version as an exact start, then falls back to `'*'`. Within each group, it chooses the highest destination no later than the target. `data.version` updates only after each successful step.

A thrown error stops execution and is wrapped with `fromVersion`, `toVersion`, and `cause`. Changes already made to the data are not automatically rolled back.

## Utility Methods

The callback's second argument provides the same helpers as `migrator.utils`.

| Method                          | Description                                                                                  |
| :------------------------------ | :------------------------------------------------------------------------------------------- |
| `path(obj, route, create?)`     | Resolve a dotted path to `{ parent, key }` or `null`; `create` defaults to `false`           |
| `move(data, from, to)`          | Move or rename a property; returns `true` on success                                         |
| `remove(data, route)`           | Delete an existing property; returns `true` on success                                       |
| `transform(data, route, fn)`    | Convert an existing value; returns `true` on success                                         |
| `fill(target, defaults, mode?)` | Recursively fill missing defaults; `mode` is `'merge'` or `'cover'`, defaulting to `'merge'` |
| `log(message, level, ...data)`  | Write a migration log entry                                                                  |

Paths traverse own properties only and reject `__proto__`, `prototype`, and `constructor`. Moving to the same path keeps the value; moving an object into its own descendant is rejected. An existing destination property is overwritten by `move()`.

The input to `transform()` is `unknown`; narrow its type before using it. If the callback throws, the old value is retained, the error is logged, and the helper returns `false`.

## Filling Defaults

```javascript
const migrator = maplebirch.tool.migration.create();

migrator.add('*', '1.2.0', (data, utils) => {
  // Fill missing fields while keeping the player's saved false.
  utils.fill(data, {
    settings: {
      enabled: true,
      volume: 0.8
    },
    flags: {}
  });
});

const data = {
  version: '1.1.0',
  settings: { enabled: false } // Keep this saved choice rather than replacing it with true.
};
migrator.run(data, '1.2.0');

console.log(data.settings); // { enabled: false, volume: 0.8 }
console.log(data.version); // '1.2.0'
```

`fill()` preserves existing scalars and arrays, descends into existing plain objects to add missing fields, and skips the root `version`. For example, `{ settings: { enabled: false } }` keeps `false` and gains `volume`.

Default filling suits additive changes. Register specific transitions for renamed fields or changed types; callbacks can also narrow and edit `data` directly.
