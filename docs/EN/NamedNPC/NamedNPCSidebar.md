# NPC Sidebar

The NPC sidebar system lets a mod show custom NPCs in the sidebar. It supports static portraits and dynamic layered rendering.

## Display Modes

| Mode          | Use case                                          |
| :------------ | :------------------------------------------------ |
| Static image  | Pre-rendered portrait images                      |
| Dynamic model | Layered rendering based on clothes and conditions |

## Dynamic Hair Lengths

Each NPC stores separate numeric `hair_sides_length` (main hair) and `hair_fringe_length` (fringe) fields. Rendering converts each independently using `0 / 200 / 400 / 600 / 800 / 1000` for `short / shoulder / chest / navel / thighs / feet`; `0` is valid. Extra back hair uses only the main hair length. Both numeric fields default independently to 200; invalid types reset to the default in NPCUtils. Old fields are not converted, and edits to either length leave the other unchanged.

```javascript
Object.assign(C.npc['Ivory Wraith'], {
  hair_side_type: 'ruffled',
  hair_fringe_type: 'sideswept braid',
  hair_sides_length: 800,
  hair_fringe_length: 200
});
```

## Static Images

Place images under:

```text
img/ui/nnpc/[npc_name]/[image_name].[png|jpg|gif]
```

**DOLP deep folder layout is also supported:**

```text
img/ui/nnpc/[npc_name]/[gender]/[skin_tone]/[image_name].[png|jpg|gif]
```

- `[gender]`: `male` / `female`, resolved dynamically from the NPC's current gender (`male` for male, `female` otherwise)
- `[skin_tone]`: `dark` / `pale`, mapped dynamically from the sidebar's skin shade setting (`skin_type`): `dark` when it contains `dark`, `pale` otherwise
- Folder names accept `black_wolf` (snake_case), `black-wolf` (kebab-case) and `black wolf` (space), normalized to the NPC name automatically

Both layouts are recognized while scanning the `img/ui/nnpc` folder. At render time the deep path matching the NPC's current gender and skin tone is preferred, falling back to any registered path of the same image name — so extra DOLP folders like `fools` or `monster` still work.

Example:

```text
img/ui/nnpc/luna/default.png
img/ui/nnpc/luna/happy.png
img/ui/nnpc/luna/angry.png
```

Register the NPC image folder in `boot.json`:

```json
{
  "params": {
    "npc": {
      "Sidebar": {
        "image": ["luna", "draven"]
      }
    }
  }
}
```

## Full boot.json Example

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^required framework version",
  "params": {
    "npc": {
      "Sidebar": {
        "image": ["Elara", "Merlin"],
        "clothes": ["data/npc/elven_clothes.yaml"],
        "config": ["data/npc/elara_sidebar.yaml"]
      }
    }
  }
}
```

| Field     | Description                                              |
| :-------- | :------------------------------------------------------- |
| `image`   | NPC names whose static portrait folders should be loaded |
| `clothes` | Wardrobe config files, YAML or JSON                      |
| `config`  | Sidebar layer config files, YAML or JSON                 |

## Layer Config

```yaml
- name: 'Elara'
  body: 'img/npc/elara/body.png'
  head:
    - { img: 'img/npc/elara/hair.png', zIndex: auto }
    - { img: 'img/npc/elara/ears.png', zIndex: 7 }
  face:
    - { img: 'img/npc/elara/face_default.png', zIndex: 10 }
    - { img: 'img/npc/elara/blush.png', zIndex: 12, cond: "C.npc.Elara.mood === 'shy'" }
  upper:
    - { img: 'img/npc/elara/top_default.png', zIndex: 15, cond: "maplebirch.npc.Clothes.wardrobe.worn('Elara').upper.name === 'elven_robe'" }
```

`body` is the base layer. Groups such as `head`, `face`, `upper`, and `lower` are rendered as logical layer groups. `zIndex` controls stacking order, and `cond` controls whether a layer is shown.

## Suggested File Layout

```text
myMod/
  img/ui/nnpc/elara/default.png
  img/ui/nnpc/elara/happy.png
  data/npc/elara_sidebar.yaml
  data/npc/elara_wardrobe.yaml
  boot.json
```

Use static images for simple NPCs and layered config when the NPC needs clothes, expressions, or conditional visual states.

## Dynamic Model Fluids

Dynamic NPC sidebar models can show the same cum and drip sprites used by the original player model. State is stored under `V.maplebirch.npc[name].fluids`, without modifying `V.player.bodyliquid`. Each body part stores a tuple `[goo, semen]`: index `0` is vaginal fluids/slime, index `1` is semen. There is no `nectar` slot.

```javascript
maplebirch.npc.fluids.add('Robin', 'mouth', 2, 'semen');
maplebirch.npc.fluids.add('Robin', 'vagina', 1, 'goo');
maplebirch.npc.fluids.set('Robin', 'face', 3, 'semen');
maplebirch.npc.fluids.reduce('Robin', 'mouth', 1, 'semen');
maplebirch.npc.fluids.combined('Robin', 'mouth'); // goo + semen, without clamping the sum
maplebirch.npc.fluids.clear('Robin', 'vagina', 'goo');
maplebirch.npc.fluids.clear('Robin', 'face');
maplebirch.npc.fluids.clear('Robin');
```

Supported parts match the original body-liquid slots: `vagina`, `vaginaoutside`, `anus`, `mouth`, `penis`, `chest`, `face`, `hair`, `bottom`, `feet`, `leftarm`, `rightarm`, `neck`, `thigh`, and `tummy`. Each liquid is independently clamped to `0–5`. Rendering clamps their sum to `0–5` and converts it to original `drip_*` and `cum_*` options without changing stored amounts. `penis`, `hair`, `bottom`, and `vaginaoutside` have no matching original sidebar fluid layers and store data only.

`set`, `add`, and `reduce` default to `semen` when the type is omitted. `clear` clears both liquids when the type is omitted, and all parts when the part is omitted. Both amounts decay independently each hour. Legacy numeric values have no source information and migrate to `[oldValue, 0]` (`goo`); missing parts receive `[0, 0]`. Read one liquid by array index or use `combined` for the sum; a whole part is no longer a number.

Callers are responsible for updating levels from story events; the framework does not detect orgasms or fluid sources. Drip masks cover the complete animation sprite sheet while preserving the original drip timing. Display levels share the original fluid sprites and do not visually distinguish semen from vaginal fluids.

### Story Presence

Sidebar models and settings candidates use vanilla `V.npc`, retaining known named NPCs. Models follow the current list after `<<npc "Name">>` generates an NPC or an event clears the list. Clothing schedules choose outfits without adding or removing nearby NPCs.
