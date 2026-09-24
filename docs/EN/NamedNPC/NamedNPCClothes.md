# NPC Clothes

The NPC clothes system covers three related use cases:

1. Vanilla NPC clothes used by interaction logic.
2. Sidebar appearance config used by NPC sidebar rendering.
3. Wardrobe data used for location or condition-based outfits.

Register vanilla NPC clothes with:

```javascript
maplebirch.npc.addClothes(config);
```

## Vanilla NPC Clothes

These clothes are used by game interactions such as inspection, damage, stripping, or event logic.

```javascript
maplebirch.npc.addClothes({
  name: 'school_uniform',
  type: 'uniform',
  gender: 'f',
  upper: {
    name: 'school_shirt',
    word: 'a',
    action: 'lift',
    integrity_max: 100
  },
  lower: {
    name: 'pleated_skirt',
    word: 'a',
    action: 'lift',
    integrity_max: 100
  },
  desc: 'A standard school uniform.'
});
```

The framework stores these in `setup.npcClothesSets`.

## Sidebar Outfit Config

Sidebar clothes define how an NPC should look in the sidebar renderer. Config files can be YAML or JSON.

```yaml
- name: 'Luna'
  body: 'img/npc/luna/body.png'
  head:
    - { img: 'img/npc/luna/hair_back.png', zIndex: 5 }
    - { img: 'img/npc/luna/face_base.png', zIndex: 10 }
  upper:
    - { img: 'img/npc/luna/top_casual.png', zIndex: 15, cond: "maplebirch.npc.Clothes.wardrobe.worn('Luna').upper.name === 'casual_top'" }
```

Load sidebar config from `boot.json`:

```json
{
  "params": {
    "npc": {
      "Sidebar": {
        "config": ["data/npc/luna_sidebar.yaml"]
      }
    }
  }
}
```

## Wardrobe

Wardrobe files define outfit objects by name:

```yaml
casual_outfit:
  upper: { name: 't-shirt', color: 'blue' }
  lower: { name: 'jeans', color: 'black' }
  head: { name: 'baseball_cap' }

school_uniform:
  upper: { name: 'school_shirt' }
  lower: { name: 'pleated_skirt' }
```

Load wardrobe data:

```json
{
  "params": {
    "npc": {
      "Sidebar": {
        "clothes": ["data/npc/wardrobe.yaml"]
      }
    }
  }
}
```

The built-in wardrobe is bundled with the framework and loaded automatically. Extra wardrobe files loaded by code must pass both the mod name and the file path.

Register outfits for locations:

```javascript
const wardrobe = maplebirch.npc.Clothes.wardrobe;

await wardrobe.load('myMod', 'data/npc/wardrobe.yaml');

// Base modifiers run before the selected location outfit is merged.
wardrobe.base('Luna', clothes => {
  clothes.neck = { name: 'collar' };
});

wardrobe.wear('Luna', 'school', 'school_uniform');
wardrobe.wear('Luna', 'cafe', 'casual_outfit', () => Time.hour >= 18 || Time.hour <= 8);
wardrobe.wear('Luna', 'school', [
  ['school_uniform', 8],
  ['school_uniform_alt', 2]
]);
wardrobe.wear('Luna', 'lake', 'school_uniform', {
  when: () => V.lunaSwimming,
  wetness: 'soaked'
});
wardrobe.wear('Luna', 'park', 'casual_outfit', {
  wetness: () => (V.weather === 'rain' ? 'wet' : 'dry')
});
wardrobe.wet('Luna', 'soaked', () => passage() === 'Lake Soak');
wardrobe.layer(
  'Luna',
  () => (C.npc.Luna.pronoun === 'm' ? 'male_underwear' : 'female_underwear'),
  () => C.npc.Luna.corruption < 10
);
wardrobe.modify('Luna', clothes => {
  wardrobe.put(clothes, 'chastity_belt');
  wardrobe.strip(clothes, ['upper', 'lower']);
});
wardrobe.wear('Luna', '*', 'casual_outfit');

// Dynamic modifiers run after the selected location outfit is merged.
wardrobe.modify('Luna', (clothes, context) => {
  if (context.location === 'park' && V.weather === 'rain') clothes.head = { name: 'hood' };
});

const outfit = wardrobe.worn('Luna');
```

Location-specific outfits are checked before the global `*` fallback.
The final outfit is composed in this order: naked template, NPC base modifiers, selected location outfit, dynamic modifiers, then outfit wetness.

`wardrobe.wear()` changes an outfit only when a valid rule matches the current location. With no matching rule, the NPC retains the last successfully selected outfit; `naked` is used only before any rule has matched.

Use named condition groups to reuse a location, passage, time, and story-state check. `location` reads `V.location`, `passage` reads the current passage title, and `hours: [from, to]` reads `V.time.hour` (including ranges crossing midnight). The third argument adds game-specific conditions. Conditions are evaluated when used; calling `when()` by name returns the same function:

```javascript
const nightStudy = wardrobe.when(
  'night-study',
  {
    location: ['library', 'school'],
    passage: 'Study',
    hours: [21, 5]
  },
  () => V.weather === 'rain'
);
wardrobe.wear('Luna', 'library', 'school_uniform', { when: nightStudy });
wardrobe.wet('Luna', 'damp', wardrobe.when('night-study'));
```

The third argument also accepts an array of `[outfit key, weight]` entries. A weighted choice is made once when a rule becomes active, not on repeated reads or while the outfit is retained. The choice is made again after the rule stops matching and later becomes active. Missing outfit keys and non-positive or non-finite weights are ignored with a warning.

NPC outfit wetness uses the semantic states `dry`, `damp`, `wet`, and `soaked`, which the framework maps internally to alpha values `1`, `0.9`, `0.7`, and `0.5`. One state applies uniformly to `upper`, `lower`, `under_upper`, and `under_lower`; glasses, jewellery, shoes, and other slots remain unchanged. Wetness belongs to a `wear` rule rather than a reusable outfit template. Omitting `wetness` preserves the dry display. `wardrobe.wet()` overrides the currently selected outfit's wetness; the last matching rule wins, and no match falls back to the `wardrobe.wear()` wetness.

`wardrobe.layer()` conditionally merges a base template before the location outfit and may resolve its template key dynamically. `wardrobe.put(clothes, key, slots?)` merges a registered template inside a callback, optionally filtering to one slot or a list of slots. `wardrobe.apply(clothes, slot, item)` copies one clothing item into a typed slot. `wardrobe.strip()` restores the requested slots from the `naked` template instead of leaving undefined slots that renderers cannot read. Because the location outfit is merged after base layers, swimwear and other outfits may still provide their own `under_upper` or `under_lower` items.
