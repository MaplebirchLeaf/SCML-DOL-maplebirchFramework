# Traits

Trait registration lets a mod add custom player or NPC traits to the vanilla trait display.

Use:

```javascript
maplebirch.tool.patch.addTraits(...traits);
```

## Basic Example

```javascript
maplebirch.tool.patch.addTraits({
  title: 'General Traits',
  name: 'quick_learner',
  colour: 'blue',
  has: true,
  text: 'Learns new skills quickly.'
});
```

## Trait Config

| Field    | Type             | Description                 |
| :------- | :--------------- | :-------------------------- |
| `title`  | string           | Trait category              |
| `name`   | string/function  | Trait name                  |
| `colour` | string/function  | Display color               |
| `has`    | boolean/function | Whether the trait is active |
| `text`   | string/function  | Description text            |

## Known Categories

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
maplebirch.tool.patch.addTraits({
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

In `boot.json`, string expressions for fields such as `has`, `colour`, and `text` are evaluated in the game context.

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
