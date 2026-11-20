# Achievement Definitions

Mods can add achievements through a startup script or `boot.json`. The framework adds the definitions to vanilla's `setup.feats` during StoryInit.

## Startup Script

Call `maplebirch.tool.patch.feats.add(id, config)` before StoryInit.

```javascript
const { feats } = maplebirch.tool.patch;

feats.add('MyMod First Delivery', {
  title: ['First Delivery', '首次交付'],
  description: ['Complete your first delivery.', '完成首次交付。'],
  difficulty: 1,
  series: 'myMod:deliveries'
});
```

Use stable achievement IDs. The first valid definition added for an ID takes precedence among mod entries. Existing vanilla definitions take priority.

## JSON Configuration

You can also add `framework` to the `maplebirchAddon` entry's `params` in `boot.json`.

```json
{
  "framework": [
    {
      "feats": "data/feats.json"
    }
  ]
}
```

`data/feats.json` accepts an object keyed by achievement ID or an array with `key` on each entry. These two achievements belong to the same series.

```json
{
  "MyMod First Delivery": {
    "title": ["First Delivery", "首次交付"],
    "description": ["Complete your first delivery.", "完成首次交付。"],
    "difficulty": 1,
    "series": "myMod:deliveries"
  },
  "MyMod Ten Deliveries": {
    "title": ["Ten Deliveries", "十次交付"],
    "description": ["Complete ten deliveries.", "完成十次交付。"],
    "difficulty": 2,
    "series": "myMod:deliveries"
  }
}
```

YAML, inline data and arrays of file paths are also supported. See [boot.json Configuration](../BootJson.md#framework).

## Fields

| Field               | Description                                                                           |
| ------------------- | ------------------------------------------------------------------------------------- |
| `title`             | Achievement title, required                                                           |
| `description`       | Achievement description, required                                                     |
| `difficulty`        | Vanilla difficulty, required integer from 1 to 5                                      |
| `series`            | Series ID, omitted for standalone achievements                                        |
| `filter`            | Array of filter categories, defaults to `['All', 'General']`                          |
| `hidden`            | `true` hides the achievement until it is earned, optional                             |
| `softLockable`      | `true` makes the achievement subject to the vanilla soft-mode lock, optional          |
| `pregnancyLockable` | `true` makes the achievement subject to the vanilla pregnancy settings lock, optional |

`title` and `description` accept strings or `[English, Chinese]` pairs. Bilingual text follows the game language.

Include `All` in a custom `filter` to list the achievement under Show All.

## Series

Give achievements in a series the same `series` and `filter` values, and add them in progression order. For the selected filter, the vanilla achievement screen shows only the first eligible locked achievement in the series.

## Awarding Achievements

Use the native macro when gameplay meets the achievement's condition. Pass the ID used in the definition.

```twine
<<earnFeat "MyMod First Delivery">>
```

Related docs

- [Patch Registration](Patches.md)
- [Starting Feat Boosts](FeatBoosts.md)
