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
    - {
        img: 'img/npc/luna/top_casual.png',
        zIndex: 15,
        cond: "maplebirch.npc.Clothes.worn('Luna').upper.name === 'casual_top'"
      }
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

Register outfits for locations:

```javascript
await maplebirch.npc.Clothes.load('myMod', 'data/npc/wardrobe.yaml');

maplebirch.npc.Clothes.register('Luna', 'school', 'school_uniform');
maplebirch.npc.Clothes.register('Luna', 'cafe', 'casual_outfit', () => Time.hour >= 18 || Time.hour <= 8);
maplebirch.npc.Clothes.register('Luna', '*', 'casual_outfit');

const outfit = maplebirch.npc.Clothes.worn('Luna');
```

Location-specific outfits are checked before the global `*` fallback.
