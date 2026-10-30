# Getting started

Begin with one small feature: load your own script and show “My Mod” in Options. Seeing both results tells you that ModLoader, the framework, and your files are connected.

## 1. Declare the dependency and load a script

Add these fields to your existing mod's `boot.json`. This is the framework integration portion; for complete files, compare it with the [NPC example](NamedNPC/Example.md).

```json
{
  "tweeFileList": ["widgets.twee"],
  "dependenceInfo": [
    {
      "modName": "maplebirch",
      "version": ">=5.2.0"
    }
  ],
  "addonPlugin": [
    {
      "modName": "maplebirch",
      "addonName": "maplebirchAddon",
      "modVersion": ">=5.2.0",
      "params": {
        "script": ["framework.js"]
      }
    }
  ]
}
```

`framework.js` and `widgets.twee` are **paths inside the ZIP**. Match them to the packaged files rather than using absolute filesystem paths. Set the dependency range to the oldest framework version you actually tested and support.

Most mod code can go in `script`. Use `module` for earlier framework-module extensions when you need them. See [boot.json configuration](BootJson.md) for all fields.

## 2. Call the public API

Open `framework.js` and add:

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

This does two things: `on()` waits for the story to be ready before writing a log message, and `tool.addTo()` registers a widget name for Options.

The page still needs the widget's contents. Put this definition in `widgets.twee`:

```twine
:: My Mod Options [widget]
<<widget "MyModOptions">>
  <h3>My Mod</h3>
  <p>Mod options have loaded.</p>
<</widget>>
```

Package both files with `boot.json` and load the mod in your target game. The log should say “MyMod is ready”, and Options should show “My Mod”. The first confirms script execution; the second confirms that Twee loading and the zone entry are connected too.

ModLoader reads `tweeFileList`; the framework handles `params.script` and `tool.addTo()`. Follow [events](Events.md) and [zones](Tools/Zones.md) to explore what each can do.

For everyday work, use short entry points such as `maplebirch.on()`, `t()`, `define()`, `with()`, and `log()`. Reach into `services`, `infra`, or `host` when you need advanced features. Prefix your own event IDs, registration names, and translation keys, for example `myMod:dailyCheck`; `V.myMod` remains an ordinary variable object name.

## 3. Pick a next step

With a small feature visible in the game, choose what you would like to add next:

| Goal                             | Guide                                                                                 |
| :------------------------------- | :------------------------------------------------------------------------------------ |
| Split CN/EN text                 | [Translations and multiple files](Translator.md)                                      |
| Add content to a page            | [Zones](Tools/Zones.md)                                                               |
| React to game state              | [State events](Dynamic/StateEvents.md)                                                |
| Add NPC data or outfits          | [NPC registration](NamedNPC/NamedNPC.md) / [NPC clothes](NamedNPC/NamedNPCClothes.md) |
| Diagnose errors or loading order | [Modules and diagnostics](Modules.md)                                                 |

To connect several APIs into a story, continue with the [development workflow](Development.md) or work through the [NPC park-meeting example](NamedNPC/Example.md). Load and use the result in your chosen DoL, SugarCube, and ModLoader versions: builds and type checks help with code, while page behavior and the story path still need an in-game check.

[Back to documentation](README.md)
