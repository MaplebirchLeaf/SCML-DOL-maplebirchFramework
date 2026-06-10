# Data Migration

`migration` helps a mod update saved data when its data structure changes between versions.

Access it with:

```javascript
const migrator = maplebirch.tool.migration.create();
```

or:

```javascript
const migrator = new maplebirch.tool.migration();
```

Use semantic version strings such as `1.0.0`. Migration steps run in ascending version order.

## Add A Migration Step

```javascript
migrator.add('1.0.0', '1.1.0', (data, utils) => {
  utils.rename(data, 'oldField', 'newField');
});
```

## Run Migrations

```javascript
const data = {
  version: '1.0.0',
  oldField: 'value'
};

migrator.run(data, '1.1.0');
```

After running, `data.version` is updated to the target version and the registered steps are applied.

## Utility Methods

| Method                                     | Description                  |
| :----------------------------------------- | :--------------------------- |
| `resolvePath(obj, path, createIfMissing?)` | Resolve a dotted object path |
| `rename(data, oldPath, newPath)`           | Rename or move a value       |
| `move(data, oldPath, newPath)`             | Alias-style move operation   |
| `remove(data, path)`                       | Delete a value               |
| `transform(data, path, fn)`                | Transform a value in place   |
| `fill(target, defaults, options)`          | Fill missing default fields  |

## Examples

Rename and convert fields:

```javascript
migrator.add('1.0.0', '1.1.0', (data, utils) => {
  utils.rename(data, 'user.name', 'user.fullName');
  utils.transform(data, 'user.age', value => parseInt(value, 10));
  utils.remove(data, 'user.deprecatedField');
});
```

Fill defaults:

```javascript
migrator.add('1.1.0', '1.2.0', (data, utils) => {
  utils.fill(
    data.settings,
    {
      enabled: true,
      volume: 0.8
    },
    { mode: 'merge' }
  );
});
```

Direct custom restructuring is also allowed:

```javascript
migrator.add('2.0.0', '2.1.0', data => {
  if (Array.isArray(data.characters)) {
    const map = {};
    data.characters.forEach(character => {
      map[character.id] = character;
    });
    data.characters = map;
  }
});
```

Keep migrations small and ordered. Each step should describe one clear data version change.
