# NPC Transformation

Use `maplebirch.npc.Transformation` to register named NPC transformations, growth stages, and sidebar parts. State lives in `V.maplebirch.npc[name.toLowerCase()].transformation`, independently of player transformations.

## Register a Transformation

```javascript
maplebirch.npc.Transformation.add('Example', 'wolf', {
  levels: [5, 10, 15, 20, 25, 30],
  type: 'wolfgirl',
  parts: {
    wolf_ears: { level: 1 },
    wolf_tail: { level: 2 },
    wolf_cheeks: { level: 3, style: 'feral' },
    wolf_pits: { level: 4 },
    wolf_pubes: { level: 4 }
  },
  sidebar(nnpc) {
    nnpc.wolf_tail_layer = 'back';
  }
});
```

The first argument is the NPC's `nam`; the second is a transformation ID local to that NPC. Different NPCs may each register `wolf` without overwriting one another. Registration does not give an NPC a transformation.

| Option                           | Description                                                                                       |
| :------------------------------- | :------------------------------------------------------------------------------------------------ |
| `levels`                         | Increasing positive cumulative growth thresholds; defaults to `[5, 10, 15, 20, 25, 30]`           |
| `type`                           | Gameplay identity returned by `Transformation.type(name)`; leaves the NPC's base `type` unchanged |
| `parts`                          | Vanilla parts enabled at chosen levels, for both primary and secondary NPC models                 |
| `body(bodydata, state, npcName)` | Changes a copy of body data for this render, such as `hairColour` or `eyeColour`                  |
| `sidebar(nnpc, state, npcName)`  | Runs after parts are applied, to adjust position, pose, or style                                  |
| `layers`                         | Registers custom layers on the `main` model through the character layer API                       |

Both callbacks receive read-only `build` and `level` values. The sidebar object is still being assembled: clothing, body filters, and masks are not all available yet.

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
maplebirch.npc.Transformation.add('Example', 'cat', {
  parts: {
    cat_ears: { level: 1, filter: { blend: '#665544', blendMode: 'hard-light' } },
    cat_tail: { level: 2 }
  }
});
```

Parts without a filter use the NPC's hair colour. Fixed-colour assets such as cow ear tags keep their original colours. Filters also accept `brightness`, `contrast`, and `desaturate`, and apply only to that NPC's corresponding part.

Existing `sidebar()` assignments such as `nnpc.wolf_ears_type = 'default'` still work. Callbacks can override `parts`; custom assets can still use `layers`.

## Growth and Queries

```javascript
const transformation = maplebirch.npc.Transformation;
transformation.build('Example', 'wolf', 10); // Add growth; negative values reduce it
transformation.set('Example', 'wolf', 3); // Set the level and its growth threshold
transformation.level('Example', 'wolf'); // 3
transformation.type('Example'); // 'wolfgirl'
transformation.clear('Example', 'wolf');
```

`build()`, `set()`, and `get()` return `{ build, level }`. `get()` initializes missing state. `level()`, `type()`, and rendering queries do not create save records. `clear(name)` removes all transformations for that NPC.

Growth is clamped between zero and the last threshold, and determines the level. Unregistered types use the default thresholds but have no rendering effects. Loading repairs missing growth while preserving existing state objects. Multiple transformations can render together; identity comes from the highest-level transformation, with growth breaking ties.
