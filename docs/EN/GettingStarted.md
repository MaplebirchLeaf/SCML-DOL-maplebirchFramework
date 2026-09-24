# Getting started

Start here if this is your first DoL mod using `maplebirch`. Load one script successfully, then follow the feature pages you need.

## 1. Declare the dependency and load a script

Add the following fields to your mod's `boot.json` (only the relevant fields are shown):

```json
{
  "dependenceInfo": [{ "modName": "maplebirch", "version": ">=5.0.0" }],
  "addonPlugin": [
    {
      "modName": "maplebirch",
      "addonName": "maplebirchAddon",
      "modVersion": ">=5.0.0",
      "params": { "script": ["framework.js"] }
    }
  ]
}
```

> [!IMPORTANT]
> `framework.js` is a path inside the mod ZIP, not an absolute filesystem path. Set the dependency version to the oldest framework version you actually tested.

Put most mod code in `script`. Use `module` only for early framework-module extensions; see [boot.json configuration](BootJson.md) for all fields.

## 2. Call the public API

```javascript
maplebirch.on(
  ':storyready',
  () => {
    maplebirch.log('MyMod is ready');
  },
  'myMod startup'
);

maplebirch.tool.addTo('Options', 'MyModOptions');
```

Your mod must provide `MyModOptions` as a SugarCube widget. `on()` listens for a framework event, while `tool.addTo()` places the widget in Options. See [events](Events.md) and [zones](Tools/Zones.md).

> [!TIP]
> Prefer short `maplebirch` entry points such as `on()`, `t()`, `define()`, `with()`, `wikify()`, and `log()`. Reach into `services`, `infra`, or `host` only for advanced needs.

Use `myMod:purpose` for your own event IDs, registration names, and translation keys (for example, `myMod:dailyCheck`). `V.myMod` is a variable object name and is not renamed by this convention.

## 3. Pick a next step

| Goal                             | Guide                                                                                 |
| :------------------------------- | :------------------------------------------------------------------------------------ |
| Split CN/EN text                 | [Translations and multiple files](Translator.md)                                      |
| Add content to a page            | [Zones](Tools/Zones.md)                                                               |
| React to game state              | [State events](Dynamic/StateEvents.md)                                                |
| Add NPC data or outfits          | [NPC registration](NamedNPC/NamedNPC.md) / [NPC clothes](NamedNPC/NamedNPCClothes.md) |
| Diagnose errors or loading order | [Modules and diagnostics](Modules.md)                                                 |

> [!WARNING]
> A successful build or type check does not prove that your mod loads in the target DoL, SugarCube, and ModLoader versions. Verify one running script before adding more features.

[Back to documentation](README.md)
