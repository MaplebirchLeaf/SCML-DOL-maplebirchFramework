[中文](README.md) | [English](README.EN.md)

# SCML-DOL-maplebirchFramework

[![Author](https://img.shields.io/badge/Author-MaplebirchLeaf-purple)](https://github.com/MaplebirchLeaf)
[![GitHub release](https://img.shields.io/github/v/release/MaplebirchLeaf/SCML-DOL-maplebirchFramework)](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/releases/latest)
[![GitHub downloads](https://img.shields.io/github/downloads/MaplebirchLeaf/SCML-DOL-maplebirchFramework/total)](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/releases/latest)
[![GitHub stars](https://img.shields.io/github/stars/MaplebirchLeaf/SCML-DOL-maplebirchFramework)](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/stargazers)
[![GitHub issues](https://img.shields.io/github/issues-raw/MaplebirchLeaf/SCML-DOL-maplebirchFramework)](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/issues)
[![ModLoader](https://img.shields.io/badge/ModLoader-SugarCube2-blue)](https://modloader.pages.dev/)

`maplebirchFramework` is a **SugarCube2 ModLoader** framework for **Degrees of Lewdity** mods. It provides helper APIs for script loading, language and audio import, UI zone injection, NPC registration, combat actions, character layers, transformations, dynamic events, and general utility functions.

The framework is designed around additive mod development: instead of directly replacing large parts of vanilla passages or widgets, a mod can register content through stable framework APIs and let the framework merge it at the appropriate loading stage.

---

## Contents

- [Overview](#overview)
- [Installation](#installation)
- [Script Loading](#script-loading)
- [Recommended Structure](#recommended-structure)
- [Documentation](#documentation)
- [boot.json Quick Reference](#bootjson-quick-reference)
- [Links](#links)

## Overview

Use this framework when your mod needs to:

- Load framework-dependent JavaScript files through `boot.json`.
- Import translation files and audio folders.
- Add widgets to existing UI zones such as options, status bar, menus, and link areas.
- Register SugarCube macros or reusable text builders.
- Register time, state, and weather events.
- Add named NPCs, NPC stats, schedules, clothes, and sidebar displays.
- Add character layers, face styles, and transformations.
- Add custom combat actions.
- Use shared helpers such as `clone`, `merge`, `random`, `either`, and `number`.

English documentation is organized under [docs/EN](docs/EN/README.md) and mirrors the Chinese documentation structure.

## Installation

Download the framework from Releases and load it as a ModLoader mod.

Mods depending on this framework should declare the dependency:

```json
"dependenceInfo": [
  {
    "modName": "maplebirch",
    "version": ">=required framework version"
  }
]
```

## Script Loading

Use `maplebirchAddon` to load JavaScript files that depend on the framework:

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

Most mod logic should use `script`. Use `module` only when you intentionally need an earlier module-extension stage.

## Recommended Structure

For a small mod:

```text
framework.js
```

For a larger mod:

```text
framework.js
modules/options.js
modules/events.js
modules/npc.js
modules/combat.js
modules/sidebar.js
```

Example:

```javascript
maplebirch.tool.addTo('Options', 'MyModOptions');

maplebirch.dynamic.regTimeEvent('onDay', 'myMod.dailyCheck', {
  cond: () => V.myMod?.enabled,
  event: () => '<<run setup.myMod.dailyCheck()>>'
});

maplebirch.npc.addStats({
  trust: {
    min: 0,
    max: 100,
    default: 0,
    position: 1
  }
});
```

## Documentation

Start here:

- [English documentation index](docs/EN/README.md)
- [boot.json configuration](docs/EN/BootJson.md)
- [Utilities](docs/EN/Utilities.md)
- [Event emitter](docs/EN/EventEmitter.md)
- [Language manager](docs/EN/LanguageManager.md)
- [SugarCube macros](docs/EN/SugarCubeMacro.md)
- [Audio manager](docs/EN/Audio.md)
- [Module system](docs/EN/ModuleSystem.md)

Feature areas:

- [Dynamic events](docs/EN/Dynamic/TimeEvents.md)
- [State events](docs/EN/Dynamic/StateEvents.md)
- [Weather events](docs/EN/Dynamic/WeatherEvents.md)
- [Zone manager](docs/EN/ToolCollection/Framework.md)
- [Random system](docs/EN/ToolCollection/randSystem.md)
- [Data migration](docs/EN/ToolCollection/migration.md)
- [Text builder](docs/EN/ToolCollection/htmlTools.md)
- [Traits](docs/EN/ToolCollection/Traits.md)
- [Location config](docs/EN/ToolCollection/Location.md)
- [Bodywriting](docs/EN/ToolCollection/Bodywriting.md)
- [Character layers](docs/EN/Character/Character.md)
- [Transformation system](docs/EN/Character/Transformation.md)
- [Named NPC](docs/EN/NamedNPC/NamedNPC.md)
- [NPC stats](docs/EN/NamedNPC/NamedNPCStats.md)
- [NPC schedule](docs/EN/NamedNPC/NamedNPCSchedule.md)
- [NPC clothes](docs/EN/NamedNPC/NamedNPCClothes.md)
- [NPC sidebar](docs/EN/NamedNPC/NamedNPCSidebar.md)
- [Combat actions](docs/EN/Combat/Actions.md)

Complete Chinese docs:

- [中文文档目录](docs/CN/README.md)

## boot.json Quick Reference

```json
"addonPlugin": [
  {
    "modName": "maplebirch",
    "addonName": "maplebirchAddon",
    "modVersion": "^required framework version",
    "params": {
      "language": ["CN", "EN"],
      "audio": ["audio"],
      "framework": {
        "addto": "Options",
        "widget": "MyModOptions"
      },
      "npc": {
        "NamedNPC": [],
        "Stats": {},
        "Sidebar": {
          "image": [],
          "clothes": [],
          "config": []
        }
      },
      "script": ["framework.js"]
    }
  }
]
```

## Links

- [Degrees of Lewdity source](https://gitgud.io/Vrelnir/degrees-of-lewdity/-/tree/master)
- [ModLoader documentation](https://modloader.pages.dev/)
- [Chinese localization repository](https://github.com/Eltirosto/Degrees-of-Lewdity-Chinese-Localization)
