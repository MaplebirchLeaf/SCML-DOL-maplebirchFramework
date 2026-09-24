# Fishing Extensions

Register fish, foodstuff bait, and fish weights at **existing fishing spots** in vanilla `setup.fishing.lootTables.fish`. Vanilla still handles selection, minigames, bait consumption, and catch records.

> [!IMPORTANT]
> The target DoL version must provide `setup.fishing.lootTables.fish`. The framework does not create new fishing spots or supply fish icons for your mod.

## Entry Point

```javascript
maplebirch.tool.patch.fishing.add(key, config);
maplebirch.tool.patch.fishing.addBait(key, config);
maplebirch.tool.patch.fishing.configure(location, weights);
```

**`key`** identifies a fish or bait. Use a mod prefix to avoid replacing a vanilla or another mod's entry. `add()` and `configure()` return whether the configuration was accepted; invalid configurations return `false`. `addBait()` has no return value.

Register during startup so the framework can merge the configuration into `setup` during initialization. Loading a save only fills missing food inventory; vanilla updates catch records.

## Minimal Example

This example registers a new fish and its preferred bait, then adjusts the pier weight. It assumes your mod supplies `fish/my-mod-silverfish.png`:

```javascript
maplebirch.tool.patch.fishing.addBait('my_mod_grub', { name: 'river grub' });

maplebirch.tool.patch.fishing.add('my_mod_silverfish', {
  minSize: 10,
  maxSize: 35,
  locations: { fishingPier: 0.7 },
  preferredBait: 'my_mod_grub',
  icon: 'fish/my-mod-silverfish.png'
});

maplebirch.tool.patch.fishing.configure('fishingPier', { my_mod_silverfish: 1.2 });
```

## Config Fields

Configuration fields for `add(key, config)`:

| Field               | Description                                                           | Default     |
| :------------------ | :-------------------------------------------------------------------- | :---------- |
| `minSize`           | Minimum size, finite and positive                                     | Required    |
| `maxSize`           | Maximum size, at least `minSize`                                      | Required    |
| `locations`         | Map of spots to nonnegative weights, with at least one positive entry | Required    |
| `icon`              | Fish icon path, such as `fish/salmon.png`                             | Required    |
| `preferredSeason`   | Array of `spring`, `summer`, `autumn`, `winter`                       | `[]`        |
| `preferredLocation` | Preferred spots                                                       | `[]`        |
| `preferredBait`     | Foodstuff key                                                         | `bait_worm` |
| `cookable`          | Whether the fish can be cooked                                        | `false`     |
| `isBaitFish`        | Marks the fish and its foodstuff entry as bait                        | -           |
| `requiresBaitFish`  | Requires bait fish; when `true`, a minigame configuration is required | -           |
| `minigame`          | `behavior`, `maxStamina`, `armFatigueDifficulty`                      | -           |
| `foodstuff`         | Associated food configuration; see [Foodstuff](Foodstuff.md)          | -           |

Supported behaviors are vanilla `runner`, `darter`, `panicked`, `anchor`, `thrasher`, and `slipper`. Sizes and minigame numbers must be finite and positive; location weights must be finite and nonnegative.

Every registered fish gets a same-key food catalog entry for vanilla catch inventory. Mods supply the assets. The food icon defaults to `icon` without the `fish/` prefix, or can be set through `foodstuff.icon`.

`addBait(key, config)` accepts [food configuration](Foodstuff.md#common-fields), sets vanilla `is_fishing_bait`, and shares food inventory. Custom bait uses vanilla ordinary-food behavior; the original `baitfish` and `bait_worm` retain their special handling.

> [!TIP]
> If configuration depends on reading vanilla `setup`, register it inside `maplebirch.tool.onInit()`, then call `maplebirch.tool.patch.fishing.apply()` followed by `maplebirch.tool.patch.foodstuff.apply()`. Ordinary static configurations do not need manual `apply()` calls.

## Fishing Locations

`locations`, `preferredLocation`, and `configure()` use these vanilla spots:

```text
fishingBeach / fishingPier / fishingCoastPath / fishingForestLake / fishingMoor
```

`configure(location, weights)` adjusts fish weights at an existing spot. `0` excludes a fish from that spot. Fish keys must exist when the configuration is applied; unknown keys produce an error. This API adjusts fish distribution; the Mod provides entrances, discovery conditions, and stories. Fishing configuration is skipped on older versions without `setup.fishing`.

## boot.json

```json
{
  "framework": {
    "fish": "data/fish.json",
    "bait": "data/bait.yaml",
    "fishingLocations": { "fishingPier": { "salmon": 1.25 } }
  }
}
```

`fish` and `bait` accept keyed objects or arrays with a `key` on each entry. `fishingLocations` uses a spot-to-fish-weights object. See [boot.json Configuration](../BootJson.md) for file formats and the complete addon structure.

## Related guides

- [Foodstuff](Foodstuff.md): fish food entries and bait configuration.
- [Patch extensions](Patches.md): registering and applying DoL data patches.
- [boot.json configuration](../BootJson.md): importing fish, bait, and location weights from files.
- [Documentation index](../README.md): other DoL content extensions.
