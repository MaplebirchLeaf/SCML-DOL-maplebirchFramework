# boot.json Configuration

## Purpose

Use **`boot.json`** when your mod has fixed resources that can be declared at load time: scripts, translation files, audio folders, UI widgets, or basic NPC resources.

Put complex conditions and runtime logic in JavaScript files loaded through **`script`**.

## Basic Structure

```json
"addonPlugin": [
  {
    "modName": "maplebirch",
    "addonName": "maplebirchAddon",
    "modVersion": "^required framework version",
    "params": {
      "script": ["framework.js"]
    }
  }
]
```

## params Fields

| Field       | Purpose                                                           |
| :---------- | :---------------------------------------------------------------- |
| `script`    | Load normal JavaScript files                                      |
| `module`    | Load earlier module-extension scripts                             |
| `language`  | Import translation files                                          |
| `audio`     | Import audio folders                                              |
| `framework` | Add UI widgets, traits, tips, bodywriting, foodstuff, or antiques |
| `npc`       | Register NPC resources                                            |

## script

```json
"script": [
  "framework.js",
  "modules/options.js",
  "modules/events.js",
  "modules/npc.js"
]
```

Use **`script`** for most mod logic: NPC registration, dynamic events, combat actions, character layers, and UI zones.

## module

```json
"module": ["modules/register.js"]
```

Use **`module`** only when you intentionally need earlier module-extension behavior. _Most mods do not need it._

## language

```json
"language": ["CN", "EN"]
```

Custom files:

```json
"language": {
  "CN": "language/cn.yml",
  "EN": "language/en.yml"
}
```

## audio

```json
"audio": ["audio"]
```

Multiple folders:

```json
"audio": ["audio/bgm", "audio/se"]
```

## framework

Add a widget to a zone:

```json
"framework": {
  "addto": "Options",
  "widget": "MyModOptions"
}
```

Equivalent JavaScript:

```javascript
maplebirch.tool.addTo('Options', 'MyModOptions');
```

Register framework data:

```json
"framework": [
  {
    "traits": "data/traits.yaml"
  },
  {
    "tips": "data/tips.json"
  },
  {
    "bodywriting": "data/bodywriting.yaml"
  },
  {
    "foodstuff": "data/foodstuff.yaml"
  },
  {
    "antiques": "data/antiques.yaml"
  },
  {
    "fish": "data/fish.json",
    "bait": "data/bait.yaml",
    "fishingLocations": "data/fishing-locations.yaml"
  }
]
```

A single **`framework`** object may contain multiple data fields. Each field accepts a path or array of paths to **`.json`**, **`.yaml`**, or **`.yml`** files. Files are read in order and use these formats:

| Field                                                  | Content Format                                                         |
| :----------------------------------------------------- | :--------------------------------------------------------------------- |
| `traits`                                               | Array of trait configurations                                          |
| `tips`                                                 | Array of tip strings, or an object mapping categories to string arrays |
| `bodywriting`, `foodstuff`, `antiques`, `fish`, `bait` | Object keyed by unique id, or an array with `key` on each item         |
| `fishingLocations`                                     | Object mapping fishing spots to fish weights                           |

These formats also work inline. For keyed data, later registrations take precedence. `fish`, `bait`, and `fishingLocations` target the vanilla 0.5.12.13 fishing system.

`tips.json` may be a string array. This adds every entry to vanilla's always-enabled `general` category:

```json
["The first mod tip.", "Tips may use the same HTML and SugarCube markup as vanilla tips."]
```

To follow vanilla content settings, use an object matching the shape of `setup.tips`:

```json
{
  "general": ["A tip that may always appear."],
  "weather": ["A tip that appears with weather content."],
  "myMod": ["A custom category automatically joins the random pool."]
}
```

Vanilla categories continue to follow vanilla content settings. New categories are always enabled by default and automatically join the pool built by vanilla `generateTipsList`. Scripts may also call `maplebirch.tool.patch.addTips('myMod', 'A new tip')`. The framework merges tips after vanilla `init_tips` and ignores duplicate text.

Inline `tips` string arrays contain tip text. When every entry ends with `.json`, `.yaml`, or `.yml`, they are read as file paths instead.

Related docs:

- [Patch Registration](ToolCollection/Patches.md)
- [Traits](ToolCollection/Traits.md)
- [Tips](ToolCollection/Tips.md)
- [Bodywriting](ToolCollection/Bodywriting.md)
- [Foodstuff](ToolCollection/Foodstuff.md)
- [Fishing Extensions](ToolCollection/Fishing.md)
- [Antiques](ToolCollection/Antiques.md)

## npc

```json
"npc": {
  "NamedNPC": [],
  "Stats": {},
  "Transformation": {
    "Example": {
      "wolf": {
        "parts": { "wolf_ears": { "level": 1 }, "wolf_tail": { "level": 2 } }
      }
    }
  },
  "Pregnancy": {
    "Example": {
      "canBePregnant": true,
      "canImpregnatePlayer": true,
      "cycle": { "days": [26, 30], "dangerousDay": 14, "fertileLeadDays": [4, 6] }
    }
  },
  "Sidebar": {
    "image": [],
    "clothes": [],
    "config": []
  }
}
```

| Field             | Purpose                                                   |
| :---------------- | :-------------------------------------------------------- |
| `NamedNPC`        | Register named NPCs                                       |
| `Stats`           | Register NPC stats                                        |
| `Transformation`  | Register independent transformation configs by NPC name   |
| `Pregnancy`       | Register pregnancy content and cycle settings by NPC name |
| `Sidebar.image`   | Import static sidebar images                              |
| `Sidebar.clothes` | Import wardrobe config                                    |
| `Sidebar.config`  | Import sidebar model layer config                         |

Related docs:

- [NPC Registration](NamedNPC/NamedNPC.md)
- [NPC Transformation](NamedNPC/NamedNPCTransformation.md)
- [NPC Pregnancy](NamedNPC/NamedNPCPregnancy.md)
- [NPC Clothes](NamedNPC/NamedNPCClothes.md)
- [NPC Sidebar](NamedNPC/NamedNPCSidebar.md)

## Full Example

```json
"addonPlugin": [
  {
    "modName": "maplebirch",
    "addonName": "maplebirchAddon",
    "modVersion": "^required framework version",
    "params": {
      "language": {
        "CN": "language/cn.yml",
        "EN": "language/en.yml"
      },
      "audio": ["audio"],
      "framework": {
        "addto": "Options",
        "widget": "MyModOptions"
      },
      "script": [
        "framework.js",
        "modules/events.js"
      ]
    }
  }
]
```
