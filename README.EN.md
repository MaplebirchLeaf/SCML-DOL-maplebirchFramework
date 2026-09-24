[中文](README.md) | [English](README.EN.md)

# SCML-DOL-maplebirchFramework

[![Author](https://img.shields.io/badge/By-Vrelnir-purple)](https://vrelnir.blogspot.com/)
[![Game](https://img.shields.io/badge/Game-DoL-purple)](https://gitgud.io/Vrelnir/degrees-of-lewdity)
[![ModLoader](https://img.shields.io/badge/SC2-ModLoader-blue)](https://modloader.pages.dev/)
[![CHS](https://img.shields.io/badge/CHS-DOL--CHS-red)](https://github.com/Eltirosto/Degrees-of-Lewdity-Chinese-Localization)
[![Release](https://img.shields.io/github/v/release/MaplebirchLeaf/SCML-DOL-maplebirchFramework?label=release)](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/MaplebirchLeaf/SCML-DOL-maplebirchFramework/total?label=downloads)](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/releases/latest)
[![Stars](https://img.shields.io/github/stars/MaplebirchLeaf/SCML-DOL-maplebirchFramework?label=stars)](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/stargazers)
[![Issues](https://img.shields.io/github/issues-raw/MaplebirchLeaf/SCML-DOL-maplebirchFramework?label=issues)](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/issues)

**`maplebirchFramework`** is a **_SugarCube 2 ModLoader_** extension framework for **_Degrees of Lewdity_** mod authors. It provides public APIs for scripts and resources, translations, audio, UI zones, NPCs, characters, combat, and dynamic events, alongside optional mod encryption and self-hosted cloud saves.

Its guiding idea is simple: **extend the game through public interfaces instead of replacing large pieces of vanilla content.** Use it when your mod needs to add UI or NPC content, react to game events, or load scripts, translations, and audio in a consistent way.

> [!TIP]
> New to the framework? Start with [Getting started](docs/EN/GettingStarted.md), then use the [mod author documentation](docs/EN/README.md) to look up specific fields and features. You do not need to read every topic first.

---

## Contents

- [Overview](#overview)
- [Installation](#installation)
- [Script Loading](#script-loading)
- [Framework Services](#framework-services)
  - [Mod Encryption](#mod-encryption)
  - [Cloud Save](#cloud-save)
- [Recommended Structure](#recommended-structure)
- [Type Package](#type-package)
- [Documentation](#documentation)
- [boot.json Quick Reference](#bootjson-quick-reference)
- [Feedback and Updates](#feedback-and-updates)
- [Acknowledgements](#acknowledgements)
- [Links](#links)

## Overview

Use this framework when your mod needs to:

- Load framework-dependent JavaScript files through `boot.json`.
- Import translation files and audio folders.
- Add widgets to existing UI zones such as options, status bar, menus, and link areas.
- Register SugarCube macros or reusable text builders.
- Register time, state, and weather events.
- Add named NPCs, NPC stats, schedules, clothes, sidebar displays, NPC transformations, and NPC pregnancy extensions.
- Add character layers, face styles, and transformations.
- Add custom combat actions.
- Protect framework-dependent mods with encrypted shells, credential verification, and secure local credential storage.
- Sync local save slots and export codes through a self-hosted Cloudflare Worker and private R2 bucket.
- Use shared helpers such as `maplebirch.utils.clone(source)`, `Object.merge()`, `list.contains()`, `list.either()`, and `Math.clamp()`.

**Choose a path:** content mods can start with [NPC registration](docs/EN/NamedNPC/NamedNPC.md), [state events](docs/EN/Dynamic/StateEvents.md), [zones](docs/EN/Tools/Zones.md), and [translations](docs/EN/Translator.md). UI or tooling mods can start with [boot.json](docs/EN/BootJson.md), [SugarCube macros](docs/EN/Macros.md), and [HTML tools](docs/EN/Tools/Text.md). Character and combat mods can follow the [character](docs/EN/Character/Character.md), [transformation](docs/EN/Character/Transformation.md), and [combat action](docs/EN/Combat/Actions.md) guides.

## Installation

Download the framework from [**Releases**](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/releases/latest) and load it as a **ModLoader mod**.

Mods depending on this framework should declare the dependency:

```json
"dependenceInfo": [
  {
    "modName": "maplebirch",
    "version": ">=required framework version"
  }
]
```

> [!IMPORTANT]
> The `@scml-dol-maplebirch/types` package provides editor completions only; players still need the framework mod. Set the dependency range to the oldest framework version you actually tested.

## Script Loading

Use **`maplebirchAddon`** to load JavaScript files that depend on the framework:

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

**Most mods need only `script`.** Use `module` only when you intentionally need the earlier framework-module extension stage.

## Framework Services

The framework also offers two **optional services**. **Mod Encryption** protects distributed mod content; **Cloud Save** syncs a player's local saves to infrastructure they control. Ordinary content mods need neither.

### Mod Encryption

The framework itself is not encrypted. Authors who publish encrypted mods can use the companion tools to build an encrypted shell; the framework's `CredentialVault` verifies credentials during loading and hands successfully decrypted content to ModLoader.

Author tools: **[DOL Mod Protection Tools](https://github.com/MaplebirchLeaf/dol-mod-protection-tools)**

On first load, the player enters a credential. Closing the prompt or failing verification disables that encrypted mod. See the [companion tools](https://github.com/MaplebirchLeaf/dol-mod-protection-tools) for package generation, file layout, and publishing requirements.

The `auth.json` data used for verification includes a key identifier and public key. Minimal example:

```json
{
  "key": "main",
  "publicKey": "BASE64_SPKI_PUBLIC_KEY"
}
```

Optional fields include `subject`, `name`, `prompt`, and `date`. See the companion author tools README for the full configuration.

See [Mod Encryption](docs/EN/Encryption.md) for the complete player flow, author configuration, and validity rules.

### Cloud Save

Cloud Save syncs DoL's local IndexedDB slots and save export codes to a **player-owned** Cloudflare Worker + R2 deployment. The in-game settings gain a **Cloud Save** tab; enter the Worker URL and matching `MAPLEBIRCH_TOKEN` to upload, download, or delete remote slots.

> [!WARNING]
> The framework does not provide a public save server. Uploaded records are plain JSON: use HTTPS, a strong random token, and a private R2 bucket. The token is not persisted by default, but the in-game “Remember access token on this device” option stores it in browser local storage. See [Cloud Save](docs/EN/CloudSave.md).

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

maplebirch.dynamic.regTimeEvent('onDay', 'myMod:dailyCheck', {
  cond: () => V.myMod?.enabled,
  action: () => setup.myMod?.dailyCheck?.()
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

## Type Package

If your mod uses TypeScript, or if you want editor completion for the global `maplebirch` APIs, install the framework type package:

```bash
npm install -D @scml-dol-maplebirch/types
```

Then add it to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@types/twine-sugarcube", "@scml-dol-maplebirch/types"],
    "skipLibCheck": true
  }
}
```

This package only provides TypeScript declarations. It does not include runtime framework code, so players still need to load the actual `maplebirchFramework` mod through ModLoader. Keep the type package version close to the framework version your mod depends on.

## Documentation

The [English documentation index](docs/EN/README.md) groups guides by mod-author task. This page keeps direct links to common topics:

- [Getting started](docs/EN/GettingStarted.md)
- [English documentation index](docs/EN/README.md)
- [boot.json configuration](docs/EN/BootJson.md)
- [Utilities](docs/EN/Utilities.md)
- [Event emitter](docs/EN/Events.md)
- [Translation service](docs/EN/Translator.md)
- [SugarCube macros](docs/EN/Macros.md)
- [Audio manager](docs/EN/Audio.md)
- [Module management](docs/EN/Modules.md)
- [Mod encryption](docs/EN/Encryption.md)
- [Cloud save](docs/EN/CloudSave.md)

Feature areas:

- [Dynamic events](docs/EN/Dynamic/TimeEvents.md)
- [State events](docs/EN/Dynamic/StateEvents.md)
- [Weather events](docs/EN/Dynamic/WeatherEvents.md)
- [Zone manager](docs/EN/Tools/Zones.md)
- [Random system](docs/EN/Tools/Random.md)
- [Data migration](docs/EN/Tools/Migration.md)
- [Text builder](docs/EN/Tools/Text.md)
- [Traits](docs/EN/Tools/Traits.md)
- [Tips](docs/EN/Tools/Tips.md)
- [Location config](docs/EN/Tools/Location.md)
- [Bodywriting](docs/EN/Tools/Bodywriting.md)
- [Foodstuff](docs/EN/Tools/Foodstuff.md)
- [Antiques](docs/EN/Tools/Antiques.md)
- [Character layers](docs/EN/Character/Character.md)
- [Transformation system](docs/EN/Character/Transformation.md)
- [Named NPC](docs/EN/NamedNPC/NamedNPC.md)
- [NPC stats](docs/EN/NamedNPC/NamedNPCStats.md)
- [NPC schedule](docs/EN/NamedNPC/NamedNPCSchedule.md)
- [NPC clothes](docs/EN/NamedNPC/NamedNPCClothes.md)
- [NPC sidebar](docs/EN/NamedNPC/NamedNPCSidebar.md)
- [NPC transformation](docs/EN/NamedNPC/NamedNPCTransformation.md)
- [NPC pregnancy](docs/EN/NamedNPC/NamedNPCPregnancy.md)
- [Fishing extensions](docs/EN/Tools/Fishing.md)
- [Combat actions](docs/EN/Combat/Actions.md)

Complete Chinese docs:

- [中文文档目录](docs/CN/README.md)

## boot.json Quick Reference

Start with one script, then add only the fields your mod uses. For field details and multi-file translations, see the [boot.json guide](docs/EN/BootJson.md).

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

| Optional field | Purpose                                                                             |
| :------------- | :---------------------------------------------------------------------------------- |
| `language`     | Import CN/EN translations; each language may use an ordered list of files.          |
| `audio`        | Import audio folders from the mod ZIP.                                              |
| `framework`    | Add zone widgets and register DoL content extensions.                               |
| `npc`          | Register NPCs, stats, sidebar assets, transformations, and pregnancy configuration. |
| `module`       | Load early scripts for framework-module extensions.                                 |

> [!NOTE]
> Audio files must also be listed in the mod's `boot.json` `additionFile`; `params.audio` alone does not package them.

## Feedback and Updates

- [Issue tracker](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/issues)
- [Changelog](UPDATE.md)
- [Discord](https://discord.com/channels/1103864219620884560/1433136946032410674)

## Acknowledgements

- Thanks to [Lyoko-Jeremie](https://github.com/Lyoko-Jeremie) for [SugarCube 2 ModLoader](https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader), the framework's loading foundation.
- Thanks to [狐千月](https://github.com/emicoto) for [Simple Framework](https://github.com/emicoto/SCMLSimpleFramework), an important early influence.
- Thanks to [Muromi-Rikka](https://github.com/Muromi-Rikka) for script improvements, and to [苯环](https://github.com/Nephthelana), [零环](https://github.com/ZeroRing233), [丧心](https://github.com/MissedHeart), and other mod authors for guidance and feedback.
- Thanks to [Aoki Utage](https://github.com/AOKIUTAGE), [miyakoAki4828](https://github.com/miyakoAki4828), and [HCPTangHY](https://github.com/HCPTangHY) for guidance on visual presentation, and to everyone who has tested or discussed the framework.

## Links

- <img decoding="async" src="https://gitgud.io/uploads/-/system/user/avatar/9096/avatar.png" width="24" alt=""> <b>Game Author</b> $\color{purple} {Vrelnir}$
- [Vrelnir's blog](https://vrelnir.blogspot.com/)
- [English game wiki](https://degreesoflewdity.miraheze.org/wiki/Main_Page)
- [Chinese game wiki](https://degreesoflewditycn.miraheze.org/wiki)
- [Degrees of Lewdity source](https://gitgud.io/Vrelnir/degrees-of-lewdity/-/tree/master)
- [ModLoader documentation](https://modloader.pages.dev/)
- [Chinese localization repository](https://github.com/Eltirosto/Degrees-of-Lewdity-Chinese-Localization)
