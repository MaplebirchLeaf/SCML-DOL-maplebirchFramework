# Traits

Trait registration lets a mod add custom player or NPC traits to the vanilla trait display.

Use:

```javascript
maplebirch.tool.patch.traits.add(...traits);
```

## Basic Example

```javascript
maplebirch.tool.patch.traits.add({
  title: 'General Traits',
  name: 'quick_learner',
  colour: 'blue',
  has: true,
  text: 'Learns new skills quickly.'
});
```

## Trait Config

| Field     | Type             | Description                                                                 |
| :-------- | :--------------- | :-------------------------------------------------------------------------- |
| `title`   | string           | Trait category                                                              |
| `name`    | string/function  | Trait name                                                                  |
| `replace` | string/RegExp    | Optional original name or regular expression to replace within the category |
| `colour`  | string/function  | Display color                                                               |
| `has`     | boolean/function | Whether the trait is active                                                 |
| `text`    | string/function  | Description text                                                            |

## Known Categories

`replace` matches names before rendering and keeps the original position. Strings match exactly, while regular expressions can match both English and Chinese native names. If absent or unmatched, registration retains the existing same-name replacement and append behavior. This field is available through script registration:

```javascript
maplebirch.tool.patch.traits.add({
  title: 'General Traits',
  replace: /^(?:Rite of Promise:|承诺仪式：)/,
  name: () => lanSwitch('Rite of Promise: ', '承诺仪式：') + maplebirch.auto('Robin'),
  colour: 'blue',
  has: () => V.myMod.promised,
  text: 'A promise recognised by the temple.'
});
```

| English category    | Chinese display   |
| :------------------ | :---------------- |
| `General Traits`    | General traits    |
| `Medicinal Traits`  | Medicinal traits  |
| `Special Traits`    | Special traits    |
| `School Traits`     | School traits     |
| `Trauma Traits`     | Trauma traits     |
| `NPC Traits`        | NPC traits        |
| `Hypnosis Traits`   | Hypnosis traits   |
| `Acceptance Traits` | Acceptance traits |

Unknown category names are kept as-is.

## Dynamic Trait

```javascript
maplebirch.tool.patch.traits.add({
  title: 'Medicinal Traits',
  name: 'poison_resistance',
  colour: () => {
    const level = V.poisonResistance || 0;
    if (level >= 80) return 'green';
    if (level >= 50) return 'yellow';
    return 'red';
  },
  has: () => (V.poisonResistance || 0) > 0,
  text: () => `Poison resistance: ${V.poisonResistance || 0}%`
});
```

## boot.json

`traits` registers multiple entries as an array:

```json
{
  "params": {
    "framework": [
      {
        "traits": [
          {
            "title": "General Traits",
            "name": "strong",
            "colour": "brown",
            "has": "V.strength > 70",
            "text": "Strong enough to stand out."
          },
          {
            "title": "School Traits",
            "name": "honor_student",
            "colour": "yellow",
            "has": "V.grades >= 90",
            "text": "Known for strong grades."
          }
        ]
      }
    ]
  }
}
```

In `boot.json`, `has` accepts a boolean or JavaScript condition evaluated in the game context. Only use trusted expressions. `name`, `colour`, and `text` are plain strings; use function configurations in a script when these fields need dynamic values.

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
