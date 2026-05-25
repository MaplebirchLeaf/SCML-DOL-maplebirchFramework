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

| Field | Purpose |
| :--- | :--- |
| `script` | Load normal JavaScript files |
| `module` | Load earlier module-extension scripts |
| `language` | Import translation files |
| `audio` | Import audio folders |
| `framework` | Add UI widgets, traits, bodywriting, foodstuff, or antiques |
| `npc` | Register NPC resources |

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
    "bodywriting": "data/bodywriting.yaml"
  },
  {
    "foodstuff": "data/foodstuff.yaml"
  },
  {
    "antiques": "data/antiques.yaml"
  }
]
```

**`traits`**, **`bodywriting`**, **`foodstuff`**, and **`antiques`** accept inline arrays/objects or external **`.json`**, **`.yaml`**, and **`.yml`** files. For array forms of **`bodywriting`**, **`foodstuff`**, and **`antiques`**, each item must include **`key`**.

Related docs:

- [Traits](ToolCollection/Traits.md)
- [Bodywriting](ToolCollection/Bodywriting.md)
- [Foodstuff](ToolCollection/Foodstuff.md)
- [Antiques](ToolCollection/Antiques.md)

## npc

```json
"npc": {
  "NamedNPC": [],
  "Stats": {},
  "Sidebar": {
    "image": [],
    "clothes": [],
    "config": []
  }
}
```

| Field | Purpose |
| :--- | :--- |
| `NamedNPC` | Register named NPCs |
| `Stats` | Register NPC stats |
| `Sidebar.image` | Import static sidebar images |
| `Sidebar.clothes` | Import wardrobe config |
| `Sidebar.config` | Import sidebar model layer config |

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
