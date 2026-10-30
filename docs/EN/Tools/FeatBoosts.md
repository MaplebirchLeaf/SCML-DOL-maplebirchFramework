# Starting Feat Boosts

`maplebirch.tool.patch.featBoosts.add(key, config)` adds a mod boost to the native feat booster menu, using the game's feats, VrelCoin budget, purchase levels and refund controls.

## Registration

Register during startup, before vanilla calls `setupFeatBoosts`. Prefix boost keys with your mod's name.

```javascript
maplebirch.tool.patch.featBoosts.add('myMod:boost', {
  name: 'Example Boost',
  required: ['Thief'],
  cost: 60,
  max: 1,
  missing: 'Obtain the Thief feat to unlock this boost.',
  text: 'Start with the example trait.',
  upgrade: 'Unlock this trait at the start of a new game.',
  effect: '<<myModFeatBoost>>'
});
```

`effect` is Twee source and may call an existing mod widget. The mod must define and load `myModFeatBoost` from this example.

| Field           | Description                                                                               |
| --------------- | ----------------------------------------------------------------------------------------- |
| `name`          | Boost name shown in the menu; required                                                    |
| `required`      | Array of feat keys; owning any one unlocks the boost; defaults to no prerequisite         |
| `cost`          | VrelCoins per level; required nonnegative safe integer                                    |
| `max`           | Purchase limit after unlocking; nonnegative safe integer                                  |
| `maxMultiplier` | Purchases granted per earned prerequisite feat; positive safe integer; ignored with `max` |
| `exclusive`     | Key of another boost that is mutually exclusive with this one                             |
| `missing`       | Message shown while locked                                                                |
| `text`          | Boost description                                                                         |
| `upgrade`       | Effect description in the purchase area                                                   |
| `effect`        | Twee source executed for the new game                                                     |

Without `max`, the limit is the number of earned prerequisite feats multiplied by `maxMultiplier` (default 1). A boost with no prerequisites counts as one. `name`, `missing`, `text` and `upgrade` accept strings or functions returning strings; display text passes through `maplebirch.auto()`.

## Define the effect widget

**widgets.twee** — add to `tweeFileList`; keep the name identical to effect above.

```twine
:: My Mod Feat Boost [widget]
<<widget "myModFeatBoost">>
  /* The new game may not have mod state yet; only create missing data. */
  <<if !$myMod>><<set $myMod to {}>><</if>>
  <<set $myMod.featBoostApplied to true>>
<</widget>>
```

**framework.js**

```javascript
maplebirch.tool.patch.traits.add({
  title: 'General Traits',
  name: 'Head start',
  colour: 'gold',
  // Purchasing does not set this flag; show only after the new-game effect runs.
  has: () => V.myMod?.featBoostApplied === true,
  text: 'You began this journey with a feat boost.'
});
```

## JSON Configuration

Alternatively, add a separate entry under `framework` in `boot.json`:

```json
{
  "framework": [
    {
      "featBoosts": "data/feat-boosts.json"
    }
  ]
}
```

`data/feat-boosts.json` accepts an object keyed by boost id, or an array with `key` on each entry:

```json
{
  "myMod:boost": {
    "name": "Example Boost",
    "required": ["Thief"],
    "cost": 60,
    "max": 1,
    "effect": "<<myModFeatBoost>>"
  }
}
```

YAML, inline data and arrays of file paths are also supported. See [boot.json Configuration](../BootJson.md#framework).

## Application

The framework wraps two native macros:

- `setupFeatBoosts`: adds mod boosts after native initialization. Ordinary reopening preserves purchases; native import and reset flows recalculate limits and clear purchases.
- `applyFeatBoosts`: runs purchased `effect` sources before vanilla cleans up the boost data.

Purchasing, refunding and displaying a boost do not grant gameplay effects. `effect` runs through the native new-game booster flow when the player has feat points; purchasing does not apply it early to the current character.
