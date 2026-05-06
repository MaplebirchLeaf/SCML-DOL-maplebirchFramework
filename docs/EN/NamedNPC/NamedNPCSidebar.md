# NPC Sidebar

The NPC sidebar system lets a mod show custom NPCs in the sidebar. It supports static portraits and dynamic layered rendering.

## Display Modes

| Mode | Use case |
| :--- | :--- |
| Static image | Pre-rendered portrait images |
| Dynamic model | Layered rendering based on clothes and conditions |

## Static Images

Place images under:

```text
img/ui/nnpc/[npc_name]/[image_name].[png|jpg|gif]
```

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

| Field | Description |
| :--- | :--- |
| `image` | NPC names whose static portrait folders should be loaded |
| `clothes` | Wardrobe config files, YAML or JSON |
| `config` | Sidebar layer config files, YAML or JSON |

## Layer Config

```yaml
- name: 'Elara'
  body: 'img/npc/elara/body.png'
  head:
    - { img: 'img/npc/elara/hair.png', zIndex: auto }
    - { img: 'img/npc/elara/ears.png', zIndex: 7 }
  face:
    - { img: 'img/npc/elara/face_default.png', zIndex: 10 }
    - {
        img: 'img/npc/elara/blush.png',
        zIndex: 12,
        cond: "C.npc.Elara.mood === 'shy'"
      }
  upper:
    - {
        img: 'img/npc/elara/top_default.png',
        zIndex: 15,
        cond: "maplebirch.npc.Clothes.worn('Elara').upper.name === 'elven_robe'"
      }
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
