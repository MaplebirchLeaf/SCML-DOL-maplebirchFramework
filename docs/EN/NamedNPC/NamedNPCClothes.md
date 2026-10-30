# NPC Clothes and Wardrobe

Interaction outfits, artist images and PC-model clothing use different data. Choose the system that owns the change you need.

## Three Configuration Boundaries

| Entry point                       | Changes                                                         | Does not automatically provide                                        |
| :-------------------------------- | :-------------------------------------------------------------- | :-------------------------------------------------------------------- |
| `maplebirch.npc.addClothes()`     | Native interaction sets: names, lift/pull actions and integrity | PC-model clothing sprites                                             |
| `params.npc.Sidebar.config`       | Artist-model image candidates and conditions                    | Native interaction outfits or clothing data inferred from image names |
| `maplebirch.npc.Clothes.wardrobe` | Sidebar clothing drawn with PC assets                           | Changes to encounter interaction clothing or scene presence           |

One character can use all three. When story text and appearance must agree, drive both from the same mod state. Registering one system does not synchronize the others.

## Native Interaction Sets

Register after native `setup` is available, for example in `tool.onInit()`:

```javascript
maplebirch.tool.onInit(() => {
  maplebirch.npc.addClothes({
    name: 'myMod:library',
    type: 'custom',
    gender: 'f',
    upper: {
      name: 'shirt',
      desc: 'shirt',
      word: 'a',
      action: 'lift',
      integrity_max: 100
    },
    lower: {
      name: 'trousers',
      desc: 'trousers',
      word: 'n',
      action: 'pull',
      integrity_max: 100
    },
    desc: 'A shirt and trousers'
  });
});

maplebirch.npc.add({
  nam: 'Luna',
  gender: 'f',
  adult: 1,
  teen: 0,
  outfits: ['myMod:library']
});
```

`outfits` lists available sets; the framework also adds the gender's default set. Native outfit generation and scene logic still choose what is worn. Registration does not immediately redress an active encounter.

| Field                      | Meaning and default                                                                      |
| :------------------------- | :--------------------------------------------------------------------------------------- |
| `name`                     | Required unique set ID; duplicates are skipped with a warning                            |
| `type`, `gender`, `outfit` | Native selection data; defaults to `'custom'`, `'n'`, `0`                                |
| `upper`, `lower`           | Required name strings or part objects; names alone do not identify PC clothing resources |
| `upper/lower.name`         | Required interaction name                                                                |
| `desc`                     | Set or part description; defaults from names                                             |
| `word`                     | Native article marker; upper defaults to `'a'`, lower to `'n'`                           |
| `action`                   | Upper defaults to `'lift'`, lower to `'pull'`                                            |
| `integrity_max`            | Maximum integrity, default `100`                                                         |

The framework appends sets to `setup.npcClothesSets`; do not replace that array. `addClothes()` accepts several configurations and returns nothing.

## Minimal PC-Model Wardrobe Integration

### 1. Supply Templates

`data/npc/wardrobe.yaml`:

```yaml
'myMod:casual':
  upper:
    name: 't-shirt'
    variable: 'tshirt'
    colour: 'blue'
  lower:
    name: 'shorts'
    variable: 'shorts'
    colour: 'black'

'myMod:library':
  upper:
    name: 'school shirt'
    variable: 'schoolshirt'
    colour: 'white'
  lower:
    name: 'shorts'
    variable: 'shorts'
    colour: 'black'
```

These compact entries use native 0.5.12.13 clothes. `name` and `variable` must identify actual PC clothing; guessed names such as `school_shirt` do not suffice. The framework resolves the full definition through native `clothesIndex`, then combines it with current state. Custom clothes also require their owning mod's definitions and sprites.

Use `colour`, not `color`. Copy a complete clothing object when damage, style, colour or other state needs to be retained. The framework includes the `naked` slot template, so no large naked configuration is needed. Supply other sets yourself and prefix their keys.

### 2. Import Through boot.json

This is a `maplebirchAddon` entry:

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": ">=5.2.0",
  "params": {
    "npc": {
      "Sidebar": {
        "clothes": ["data/npc/wardrobe.yaml"]
      }
    }
  }
}
```

A script may instead call `await wardrobe.load('myMod', 'data/npc/wardrobe.yaml')`, using the actual mod name and ZIP-relative path. Loading failures are logged, so check paths and `wardrobe.has(key)`; completion of the Promise does not prove the template exists.

### 3. Register Schedule and Wear Rules

```javascript
maplebirch.npc.addSchedule('Luna', schedule => {
  schedule.at(0, 'home').at(8, 'library').at(18, 'home');
});

maplebirch.once(':storyready', () => {
  const wardrobe = maplebirch.npc.Clothes.wardrobe;
  wardrobe.wear('Luna', '*', 'myMod:casual');
  wardrobe.wear('Luna', 'library', 'myMod:library');
});
```

Waiting for `:storyready` allows the wardrobe file to load first. `wear()` checks template existence immediately; a missing template is skipped. `library` and `home` are location labels used by this mod.

Wear locations come from **Luna's framework schedule**, not the player's `V.location`. Enable NPC sidebar display and “PC Model Mode” in framework settings, and generate Luna in the actual scene to see the clothes. See [Sidebar](NamedNPCSidebar.md) for presence requirements.

## Rule Selection and Current Clothing

`wardrobe.wear(npcName, location, choice, options?)`:

- `location` accepts a string, an array of locations or the global fallback `'*'`.
- Current scheduled-location rules take precedence over global rules. Within a group, the last matching registration wins.
- `choice` is a template key or an array of `[template key, weight]` entries.
- `options` accepts a condition or `{ when, wetness }`.

```javascript
const wardrobe = maplebirch.npc.Clothes.wardrobe;
wardrobe.wear('Luna', 'library', [
  ['myMod:library', 8],
  ['myMod:casual', 2]
]);
```

This weighted rule takes precedence over the earlier rule for the same location. It chooses once when becoming the active rule; repeated `worn()` calls or redraws do not reroll. It chooses again after deactivation and reactivation. Missing keys and nonfinite or nonpositive weights are ignored with a warning.

```javascript
const outfit = maplebirch.npc.Clothes.wardrobe.worn('Luna');
console.log(outfit.upper?.name);
```

When no rule matches, the last selected outfit is retained for this runtime. `naked` is used before any selection. `worn()` returns the newly composed copy, so changing its result does not save an outfit. Rules and selections are runtime data rebuilt on loading; persistent story outfit state belongs in your mod's saved variables.

## Whose Location Does a Condition Use?

“Where does Luna's schedule place her?” and “Where is the player?” are separate questions. Wardrobe rules can use either, through different arguments.

| Entry point                      | Reads                                                   |
| :------------------------------- | :------------------------------------------------------ |
| Second argument to `wear()`      | This NPC's `Schedule.location`                          |
| `context.location` in `modify()` | This NPC's scheduled location                           |
| `location` in a `when()` group   | Player `V.location`                                     |
| `passage` in a `when()` group    | Current passage title                                   |
| `hours` in a `when()` group      | Current `V.time.hour`; inclusive and may cross midnight |

### Define a reusable rainy-night condition

Continue with Luna registered above. Suppose your scene uses `park` as its location value. Her clothes should appear damp when the player meets her there on a rainy night:

```javascript
const wardrobe = maplebirch.npc.Clothes.wardrobe;

const rainyNight = wardrobe.when(
  // Name the check for reuse in other wardrobe rules.
  'myMod:rainyNight',
  {
    // Checks player V.location.
    location: 'park',
    // Hours 21–23 and 0–5, including 05:59.
    hours: [21, 5]
  },
  // Location, hours AND rain must match.
  () => Weather.precipitation === 'rain'
);

// Register the rule now; the framework checks current state when reading clothes.
wardrobe.wet('Luna', 'damp', rainyNight);
```

Replace `park` with the value your scene writes to `V.location`. Use `passage` instead of `location` to match a passage title. This rule controls wetness; the story still controls whether Luna is present.

### Retrieve it from another rule

`when(name, group, extraCondition)` **registers** a check. Passing only the name **retrieves** it:

```javascript
const sameRainyNight = maplebirch.npc.Clothes.wardrobe.when('myMod:rainyNight');

// Run after the previous example: this is the same function, not a result snapshot.
console.log(sameRainyNight === rainyNight); // true
```

| Call                                                         | Result                                                  |
| :----------------------------------------------------------- | :------------------------------------------------------ |
| `when('myMod:rainyNight')`                                   | Returns the registered predicate                        |
| `when('myMod:missing')`                                      | Throws because the name is unknown                      |
| Calling `when('myMod:rainyNight', { hours: [20, 6] })` again | Throws for a duplicate name; does not replace the check |

Pass the retrieved function to `wet()`, `layer()` or `wear()`; each check reads current state. Register each name once, then pass only its name to retrieve it.

### Combine several checks

Conditions passed to `wet()`, `layer()` and `wear()` can also be arrays. This is an **alternative** way to express the rainy-night rule; choose one version when registering it:

```javascript
const wardrobe = maplebirch.npc.Clothes.wardrobe;

wardrobe.wet('Luna', 'damp', [
  // Boolean: true allows this item; false rejects the group.
  true,
  // Expression string: reads current player location.
  "V.location === 'park'",
  // Synchronous function: checks current weather.
  () => Weather.precipitation === 'rain',
  // Keep “evening OR early morning” inside one item.
  () => Time.hour >= 21 || Time.hour <= 5
]);
```

**Every array item must pass.** For “any of these,” use `||` inside one expression or callback. Conditions only inspect state; payments and rewards belong in action resolution.

JSON/YAML supports booleans, expression strings and condition arrays. Put functions in JavaScript scripts; a string containing `() => ...` is not a JSON/YAML callback.

## Composition and Local Changes

Order: `naked` → `base`/`layer` → selected outfit → `modify` → wetness.

A matching slot replaces the **whole clothing item**, rather than deeply merging two items. An outfit may overwrite a slot supplied by `base()`; use `modify()` for final changes.

```javascript
maplebirch.once(':storyready', () => {
  const wardrobe = maplebirch.npc.Clothes.wardrobe;
  wardrobe.modify('Luna', clothes => {
    if (V.myMod?.lunaBorrowedShirt) {
      wardrobe.put(clothes, 'myMod:casual', 'upper');
    }
  });
});
```

| Method                                         | Purpose                                                                            |
| :--------------------------------------------- | :--------------------------------------------------------------------------------- |
| `set(key, template)` / `get(key)` / `has(key)` | Register, retrieve a copy or check existence; `set()` replaces an existing key     |
| `base(name, callback)`                         | Modify current clothes before the selected outfit                                  |
| `layer(name, keyOrFunction, condition?)`       | Conditionally merge a base template                                                |
| `modify(name, callback)`                       | Modify after the outfit; receives `(clothes, context)`                             |
| `put(clothes, key, slots?)`                    | Merge a template inside a callback, optionally limited to one slot or a slot array |
| `apply(clothes, slot, item)`                   | Copy one item into a slot                                                          |
| `strip(clothes, slots)`                        | Restore `naked` placeholders without deleting slots                                |

Rendering and condition callbacks may repeat. Change only the supplied clothing copy; payments, consumption and rewards belong in actual action resolution.

## Wetness

```javascript
maplebirch.once(':storyready', () => {
  const wardrobe = maplebirch.npc.Clothes.wardrobe;
  wardrobe.wear('Luna', 'lake', 'myMod:casual', {
    when: () => V.myMod?.lunaSwimming === true,
    wetness: 'soaked'
  });
  wardrobe.wet('Luna', 'soaked', () => V.myMod?.lunaJustFellInWater === true);
});
```

`dry / damp / wet / soaked` correspond to alpha `1 / 0.9 / 0.7 / 0.5`, affecting only `upper`, `lower`, `under_upper` and `under_lower`. Other slots are unchanged. Wear-rule wetness belongs to that rule. `wet()` overrides the current outfit; the last matching override wins, otherwise the wear-rule setting applies.

Your mod owns `lunaSwimming` and `lunaJustFellInWater`. Clear the latter when recovery actually occurs, allowing wetness to fall back to the wear rule. Omitting the third `wet()` argument makes the override apply at every location.

## Artist Models

`Sidebar.config` loads image composition data, separate from wardrobe templates. Each part chooses the first matching image; put the default last. See [NPC Sidebar](NamedNPCSidebar.md#artist-layer-models) for fields, paths and examples.
