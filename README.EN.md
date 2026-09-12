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

**`maplebirchFramework`** is a **_SugarCube2 ModLoader_** framework for **_Degrees of Lewdity_** mods. It provides helper APIs for script loading, language and audio import, UI zone injection, NPC registration, combat actions, character layers, transformations, dynamic events, and general utility functions, plus mod-encryption authorization and self-hosted cloud saves.

The framework is designed around additive mod development: instead of directly replacing large parts of vanilla passages or widgets, a mod can register content through stable framework APIs and let the framework merge it at the appropriate loading stage.

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
- Use shared helpers such as `source.clone()`, `Object.merge()`, `list.contains()`, `list.either()`, and `Math.clamp()`.

English documentation is organized under **[docs/EN](docs/EN/README.md)** and mirrors the Chinese documentation structure.

## Installation

Download the framework from **_Releases_** and load it as a **ModLoader** mod.

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

Most mod logic should use **`script`**. Use **`module`** only when you intentionally need an earlier module-extension stage.

## Framework Services

The framework also offers two optional services for authors and players. They solve separate problems: **Mod Encryption** protects distributed mod content, while **Cloud Save** syncs a player's local saves to infrastructure they control.

### Mod Encryption

The framework itself is not encrypted. Other mods that depend on the framework can use the companion author tools to build an encrypted shell **`.modpack`**. The shell asks the framework to verify a credential during **`earlyload`**, decrypts the real mod, then injects it through ModLoader lazy loading.

Author tools: **[DOL Mod Protection Tools](https://github.com/MaplebirchLeaf/dol-mod-protection-tools)**

The generated `.modpack` only exposes a shell `boot.json`, an earlyload decryptor, and `.crypt` chunks. The original `boot.json`, `auth.json`, scripts, and assets are stored inside the encrypted payload. On first load, the player enters a credential; after successful verification, the password is cached. Closing the dialog or failing verification disables that encrypted mod.

`auth.json` is generated by the author tools or placed in the original zip root before conversion. It is not left in the shell package as plaintext. Minimal example:

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

The framework does not provide a public save server and does not persist the access token. Uploaded records are plain JSON, so use HTTPS, a strong random token, and a private R2 bucket. See [Cloud Save](docs/EN/CloudSave.md) for deployment, endpoint, and in-game instructions.

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

Start here:

- [English documentation index](docs/EN/README.md)
- [boot.json configuration](docs/EN/BootJson.md)
- [Utilities](docs/EN/Utilities.md)
- [Event emitter](docs/EN/EventEmitter.md)
- [Language manager](docs/EN/LanguageManager.md)
- [SugarCube macros](docs/EN/SugarCubeMacro.md)
- [Audio manager](docs/EN/Audio.md)
- [Module system](docs/EN/ModuleSystem.md)
- [Mod encryption](docs/EN/Encryption.md)
- [Cloud save](docs/EN/CloudSave.md)

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
- [Foodstuff](docs/EN/ToolCollection/Foodstuff.md)
- [Antiques](docs/EN/ToolCollection/Antiques.md)
- [Character layers](docs/EN/Character/Character.md)
- [Transformation system](docs/EN/Character/Transformation.md)
- [Named NPC](docs/EN/NamedNPC/NamedNPC.md)
- [NPC stats](docs/EN/NamedNPC/NamedNPCStats.md)
- [NPC schedule](docs/EN/NamedNPC/NamedNPCSchedule.md)
- [NPC clothes](docs/EN/NamedNPC/NamedNPCClothes.md)
- [NPC sidebar](docs/EN/NamedNPC/NamedNPCSidebar.md)
- [NPC transformation](docs/EN/NamedNPC/NamedNPCTransformation.md)
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

- <img decoding="async" src="https://gitgud.io/uploads/-/system/user/avatar/9096/avatar.png" width="24" alt=""> <b>Game Author</b> $\color{purple} {Vrelnir}$
- [Vrelnir's blog](https://vrelnir.blogspot.com/)
- [English game wiki](https://degreesoflewdity.miraheze.org/wiki/Main_Page)
- [Chinese game wiki](https://degreesoflewditycn.miraheze.org/wiki)
- [Degrees of Lewdity source](https://gitgud.io/Vrelnir/degrees-of-lewdity/-/tree/master)
- [ModLoader documentation](https://modloader.pages.dev/)
- [Chinese localization repository](https://github.com/Eltirosto/Degrees-of-Lewdity-Chinese-Localization)
