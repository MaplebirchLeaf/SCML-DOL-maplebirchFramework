# NPC Transformation

Use `maplebirch.npc.Transformation` to register named NPC transformations, growth stages, and sidebar parts. State lives in `V.maplebirch.npc[name.toLowerCase()].transformation`, independently of player transformations.

## Integration Order and Responsibilities

1. [Register the NPC](NamedNPC.md) first, for example `nam: 'Luna'`.
2. Register transformation definitions in the loading script. These describe thresholds and appearance without adding growth.
3. Call `build()` or `set()` when a transformation action actually completes. Your mod owns growth sources, time progression and story conditions.
4. Enable PC Model Mode in the sidebar and make the NPC present to see native part layers. Static portraits and artist images do not generate new transformation assets automatically.

NPC `parts` describe rendering parts, unlike the PC transformation system's `parts` array. Do not pass `maplebirch.char.transformation` configuration to this API unchanged.

## Register a Transformation

```javascript
maplebirch.npc.Transformation.add('Luna', 'wolf', {
  levels: [5, 10, 15, 20, 25, 30],
  type: 'wolfgirl',
  parts: {
    wolf_ears: {
      level: 1
    },
    wolf_tail: {
      level: 2
    },
    wolf_cheeks: {
      level: 3,
      style: 'feral'
    },
    wolf_pits: {
      level: 4
    },
    wolf_pubes: {
      level: 4
    }
  },
  sidebar(nnpc) {
    nnpc.wolf_tail_layer = 'back';
  }
});
```

The first argument is the NPC's `nam`; the second is a transformation ID local to that NPC. Different NPCs may each register `wolf` without overwriting one another. Registration does not give an NPC a transformation.

Registering the same NPC/transformation ID again replaces the definition rather than merging fields. Definitions live in runtime; saves retain growth state.

| Option                           | Description                                                                                       |
| :------------------------------- | :------------------------------------------------------------------------------------------------ |
| `levels`                         | Increasing positive cumulative growth thresholds; defaults to `[5, 10, 15, 20, 25, 30]`           |
| `max`                            | Growth cap, at least the last threshold; defaults to the last threshold                           |
| `type`                           | Gameplay identity returned by `Transformation.type(name)`; leaves the NPC's base `type` unchanged |
| `parts`                          | Vanilla parts enabled at chosen levels, for both primary and secondary NPC models                 |
| `body(bodydata, state, npcName)` | Changes a copy of body data for this render, such as `hairColour` or `eyeColour`                  |
| `sidebar(nnpc, state, npcName)`  | Runs after parts are applied, to adjust position, pose, or style                                  |
| `layers`                         | Registers custom layers on the `main` model through the character layer API                       |

Both callbacks receive read-only `build` and `level` values. The sidebar object is still being assembled: clothing, body filters, and masks are not all available yet.

`bodydata` is a shallow copy, suitable for replacing fields such as hair and eye colour. Nested objects may still be shared. Copy a nested field before replacing it instead of mutating saved NPC data in place.

Rendering callbacks may repeat. Change only the supplied render copy, without adding growth, spending resources or advancing scenes. Custom `layers` attach to `main`; the author must bind them to the intended NPC and display conditions. The framework handles primary/secondary characters for native `parts`.

## Vanilla Parts

Each `parts` key combines the transformation and part names:

| Transformation | Supported keys                                                                     |
| :------------- | :--------------------------------------------------------------------------------- |
| Angel          | `angel_halo`, `angel_wings`                                                        |
| Fallen angel   | `fallen_halo`, `fallen_wings`                                                      |
| Demon          | `demon_horns`, `demon_wings`, `demon_tail`                                         |
| Wolf           | `wolf_ears`, `wolf_tail`, `wolf_cheeks`, `wolf_pits`, `wolf_pubes`                 |
| Cat            | `cat_ears`, `cat_tail`                                                             |
| Cow            | `cow_horns`, `cow_ears`, `cow_tail`                                                |
| Bird           | `bird_wings`, `bird_tail`, `bird_eyes`, `bird_malar`, `bird_plumage`, `bird_pubes` |
| Fox            | `fox_ears`, `fox_tail`, `fox_cheeks`                                               |

Each part accepts `level` (default `1`), `style` (default `'default'`), and an optional `filter`. Styles correspond to vanilla image filenames; `'hidden'` and `'disabled'` hide the part. Mods choose the unlock levels.

```javascript
maplebirch.npc.Transformation.add('Luna', 'cat', {
  parts: {
    cat_ears: {
      level: 1,
      filter: {
        blend: '#665544',
        blendMode: 'hard-light'
      }
    },
    cat_tail: {
      level: 2
    }
  }
});
```

Parts without a filter use the NPC's hair colour. Fixed-colour assets such as cow ear tags keep their original colours. Filters also accept `brightness`, `contrast`, and `desaturate`, and apply only to that NPC's corresponding part.

Existing `sidebar()` assignments such as `nnpc.wolf_ears_type = 'default'` still work. Callbacks can override `parts`; custom assets can still use `layers`.

## Growth and Queries

Run changes only after the character is loaded and the story action completes, rather than as per-render initialization:

```javascript
const transformation = maplebirch.npc.Transformation;
transformation.build('Luna', 'wolf', 10); // Add growth; negative values reduce it
```

Queries do not add growth. From zero, `10` points reaches level `2` under the default thresholds:

```javascript
maplebirch.npc.Transformation.level('Luna', 'wolf'); // 2
maplebirch.npc.Transformation.type('Luna'); // 'wolfgirl'
```

Use `set()` when the story directly grants a level. Call `clear()` separately only when the story removes the transformation:

```javascript
const transformation = maplebirch.npc.Transformation;
transformation.set('Luna', 'wolf', 3); // Set the level and its growth threshold
```

```javascript
const transformation = maplebirch.npc.Transformation;
transformation.clear('Luna', 'wolf'); // Only when removal is intended
```

`build()`, `set()`, and `get()` return `{ build, level }`. `get()` initializes missing state. `level()`, `type()`, and rendering queries do not create save records. `clear(name)` removes all transformations for that NPC.

`get()` returns the saved state object, as do changes through `build()` and `set()`. Copy values first when comparing before/after states, and do not retain references across loads. Use these methods rather than independently assigning `build` and `level`.

| Operation                | Bounds                                                                                  |
| :----------------------- | :-------------------------------------------------------------------------------------- |
| `build(name, id, delta)` | Finite growth delta, clamped with the level recalculated                                |
| `set(name, id, level)`   | Rounded and clamped from `0` to the highest level, with growth aligned to its threshold |
| `level(name, id)`        | Current level, or `0` without state                                                     |
| `type(name)`             | Highest-priority active transformation identity, or an empty string                     |
| `clear(name, id?)`       | Remove one state, or all this NPC's states without an ID; definitions remain            |

Growth is clamped between zero and `max`; `levels` determines the level. A higher `max` allows growth to accumulate after the highest level. Explicit queries or changes to unregistered types use the default thresholds but have no rendering effects. Bulk loading leaves unregistered types untouched and repairs missing growth for registered types while preserving existing state objects. Multiple transformations can render together; identity comes from the highest-level transformation, with growth breaking ties.
