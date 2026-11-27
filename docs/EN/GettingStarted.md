# Getting started

Start with the smallest working mod: print one log line in the console and show “My Mod” in Options. Seeing both confirms that ModLoader, the framework, and your files are wired up.

## 1. Prepare the files and `boot.json`

A minimal mod needs just three files at the root of the ZIP:

```text
MyMod.mod.zip
├── boot.json
├── framework.js
└── widgets.twee
```

Save this configuration as `boot.json` (see the [NPC park-meeting example](NamedNPC/Example.md) for a full mod):

```json
{
  "name": "myMod",
  "version": "0.1.0",
  "styleFileList": [],
  "scriptFileList": [],
  "tweeFileList": ["widgets.twee"],
  "imgFileList": [],
  "additionFile": ["framework.js"],
  "dependenceInfo": [
    {
      "modName": "maplebirch",
      "version": ">=5.5.7"
    }
  ],
  "addonPlugin": [
    {
      "modName": "maplebirch",
      "addonName": "maplebirchAddon",
      "modVersion": ">=5.5.7",
      "params": {
        "script": ["framework.js"]
      }
    }
  ]
}
```

> [!WARNING]
> **Do not list `framework.js` in both `scriptFileList` and `params.script`**, or it will execute twice. When loading it through `params.script`, keep `scriptFileList` empty and list it in `additionFile` so ModLoader includes it in the ZIP.

> [!NOTE]
>
> - `tweeFileList`, `additionFile`, and `params.script` are **paths inside the ZIP**, not absolute paths on your machine.
> - Set the dependency version to the oldest framework release you actually tested and support. Use `module` instead of `script` only when extending framework modules earlier in boot (see [boot.json configuration](BootJson.md)).

## 2. Write the script and widget

Add this to `framework.js`:

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

- `maplebirch.on(':storyready', ...)` waits until the story is ready, then logs a message.
- `maplebirch.tool.addTo('Options', 'MyModOptions')` mounts the `MyModOptions` widget into the framework's `Options` zone.

Define that widget in `widgets.twee`:

```twine
:: My Mod Options [widget]
<<widget "MyModOptions">>
  <h3>My Mod</h3>
  <p>Mod options have loaded.</p>
<</widget>>
```

## 3. Package and verify in-game

Zip the three files directly at the root of a `.mod.zip` and load it in your target game:

1. Press `F12` and check the browser Console: `MyMod is ready` confirms your script ran.
2. Open the in-game **Options** screen: seeing “My Mod” confirms Twee loading and zone injection both work.

> [!TIP]
> Prefer top-level helpers such as `maplebirch.on()`, `t()`, `define()`, `with()`, and `log()` for everyday code; reach into `services`, `infra`, or `host` only when you need low-level control. Prefix your event IDs, registrations, and translation keys (e.g. `myMod:dailyCheck`), while keeping save variables under `V.myMod`.

## 4. Pick your next step

| Goal                           | Guide                                                                                    |
| :----------------------------- | :--------------------------------------------------------------------------------------- |
| Connect APIs into a full story | [Development workflow](Development.md) / [NPC park-meeting example](NamedNPC/Example.md) |
| Split CN/EN text               | [Translations and multiple files](Translator.md)                                         |
| Inject UI into game pages      | [Zones](Tools/Zones.md)                                                                  |
| React to game state            | [State events](Dynamic/StateEvents.md)                                                   |
| Add NPC data or outfits        | [NPC registration](NamedNPC/NamedNPC.md) / [NPC clothes](NamedNPC/NamedNPCClothes.md)    |
| Debug errors or load order     | [Modules and diagnostics](Modules.md)                                                    |

[Back to documentation](README.md)
