# Traits

Trait registration lets a mod add custom traits to the vanilla trait display via `maplebirch.tool.patch.traits.add(...traits)`.

> [!IMPORTANT]
> This API only registers visibility and description text; it does **not** grant gameplay bonuses automatically. Any stat effects described in `text` must be implemented separately by your mod. The example courage, resistance, and class values belong to your own story under `V.myMod` and are not native fields.

## Entry Point

```javascript
maplebirch.tool.patch.traits.add(...traits);
```

Accepts one or more trait config objects. `title` and `name` are required; registering the same `title` and `name` again updates the existing entry.

## Basic Example

```javascript
maplebirch.tool.patch.traits.add({
  title: 'General Traits',
  name: 'Quick learner',
  colour: 'blue',
  has: true,
  text: 'Learns new skills quickly.'
});
```

## Trait Config

| Field     | Type             | Description                                                                 |
| :-------- | :--------------- | :-------------------------------------------------------------------------- |
| `title`   | string           | Trait category, required                                                    |
| `name`    | string/function  | Trait name, required                                                        |
| `replace` | string/RegExp    | Optional original name or regular expression to replace within the category |
| `colour`  | string/function  | Display color, defaults to `""`                                             |
| `has`     | boolean/function | Whether the trait is active, defaults to `false`                            |
| `text`    | string/function  | Description text, defaults to `""`                                          |

## Known Categories

`replace` matches names before rendering and keeps the original position. Strings match exactly, while regular expressions can match both English and Chinese native names. If absent or unmatched, registration retains same-name replacement and append behavior. If an existing trait has a function as its name, matching reads its return value only while the trait is active; hidden name functions are left unevaluated. This field is available through script registration:

```javascript
maplebirch.tool.patch.traits.add({
  title: 'General Traits',
  replace: /^(?:Rite of Promise:|承诺仪式：)/,
  name: () => 'Rite of Promise: ' + maplebirch.auto('Robin'),
  colour: 'blue',
  has: () => V.myMod?.promised,
  text: 'A promise recognised by the temple.'
});
```

Built-in categories use the native keys below (automatically translated in Chinese builds):

| Category key        |
| :------------------ |
| `General Traits`    |
| `Medicinal Traits`  |
| `Special Traits`    |
| `School Traits`     |
| `Trauma Traits`     |
| `NPC Traits`        |
| `Hypnosis Traits`   |
| `Acceptance Traits` |

> [!NOTE]
> Unknown category names are kept as-is when creating or matching categories.

## Dynamic Trait

```javascript
maplebirch.tool.patch.traits.add({
  title: 'Medicinal Traits',
  name: 'Poison resistance',
  colour: () => {
    const level = V.myMod?.poisonResistance ?? 0;
    if (level >= 80) return 'green';
    if (level >= 50) return 'yellow';
    return 'red';
  },
  has: () => (V.myMod?.poisonResistance ?? 0) > 0,
  text: () => `Poison resistance: ${V.myMod?.poisonResistance ?? 0}%`
});
```

## boot.json

`traits` registers multiple entries as an array under `params.framework` in `boot.json`:

```json
{
  "params": {
    "framework": [
      {
        "traits": [
          {
            "title": "General Traits",
            "name": "Strong",
            "colour": "brown",
            "has": "V.myMod?.strength > 70",
            "text": "Strong enough to stand out."
          },
          {
            "title": "School Traits",
            "name": "Honor student",
            "colour": "yellow",
            "has": "V.myMod?.grades >= 90",
            "text": "Known for strong grades."
          }
        ]
      }
    ]
  }
}
```

In `boot.json`, `has` accepts a boolean or JavaScript condition, while `name`, `colour`, and `text` are plain strings (use script registration when those fields need functions).

> [!CAUTION]
> String `has` expressions in `boot.json` are evaluated in the game context (with access to `V`, `Time`, `Weather`, etc.). Only use trusted expressions.

External `.json`, `.yaml`, or `.yml` files are also supported:

```json
{
  "params": {
    "framework": {
      "traits": "data/traits.yaml"
    }
  }
}
```
