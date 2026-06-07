# NPC Stats

NPC stats let a mod add custom numeric properties to NPCs, such as trust, loyalty, pressure, affinity, or skill levels. Register them with:

```javascript
maplebirch.npc.addStats(stats);
```

## Basic Usage

```javascript
maplebirch.npc.addStats({
  trust: {
    min: 0,
    max: 100,
    default: 0,
    position: 2
  },
  corruption: {
    min: 0,
    max: 100,
    default: 0,
    position: 3
  }
});
```

## Stat Config

```javascript
{
  [statName]: {
    min: number,
    max: number,
    default: number,
    position?: number | 'first' | 'last',
    [key: string]: any
  }
}
```

| Field | Required | Description |
| :--- | :--- | :--- |
| `min` | Yes | Minimum value |
| `max` | Yes | Maximum value |
| `default` | Yes | Initial value |
| `position` | No | Display order in the NPC stat list |

`position` can be a number, `first`, or `last`.

## boot.json

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^required framework version",
  "params": {
    "npc": {
      "Stats": {
        "magic_affinity": {
          "min": 0,
          "max": 100,
          "default": 0,
          "position": 5
        },
        "loyalty": {
          "min": 0,
          "max": 100,
          "default": 10,
          "position": 6
        }
      }
    }
  }
}
```

## With NPC Data

Register stat definitions before you rely on them in NPC setup:

```javascript
maplebirch.npc.addStats({
  arcane_knowledge: {
    min: 0,
    max: 100,
    default: 25,
    position: 4
  }
});

maplebirch.npc.add({
  nam: 'Merlin',
  gender: 'm',
  title: 'Archmage',
  description: 'An old mage with forbidden knowledge.'
});
```

Initial values can then be set through normal NPC data after the NPC exists.
