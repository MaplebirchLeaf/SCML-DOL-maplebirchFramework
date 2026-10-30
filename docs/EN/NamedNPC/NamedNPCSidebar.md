# NPC Sidebar

The sidebar selects characters from the current scene's named-NPC list. Registering the character, registering images and making the character present are separate steps; see [NPC Registration](NamedNPC.md).

## Choose a Display Method

| Method                   | Resources                                                   | Settings                                              |
| :----------------------- | :---------------------------------------------------------- | :---------------------------------------------------- |
| Complete static portrait | `img/ui/nnpc/<npc>/` and `Sidebar.image`                    | Disable “PC Model Mode” and select the NPC's image    |
| Artist layer model       | Image configuration loaded by `Sidebar.config`              | Disable “PC Model Mode” and select that configuration |
| PC model                 | Native body assets, NPC appearance and the sidebar wardrobe | Enable “PC Model Mode”                                |

All methods require “NPC Sidebar Image Display”. Enabling PC Model Mode selects that rendering method rather than also drawing the chosen artist portrait. Second NPC models and NPC pets use the corresponding character's display resources.

## Minimal Static Portrait Integration

### 1. Prepare Files

```text
myMod/
  boot.json
  framework.js
  scenes.twee
  img/ui/nnpc/luna/default.png
  img/ui/nnpc/luna/happy.png
```

Register `nam: 'Luna'` in `framework.js` and use `<<npc "Luna">>` in `scenes.twee`. See [Registration](NamedNPC.md) for both complete examples. Include the actual image files in the mod ZIP.

### 2. Declare Resources

This is a framework entry inside `addonPlugin`:

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": ">=5.2.0",
  "params": {
    "script": ["framework.js"],
    "npc": {
      "Sidebar": {
        "image": ["Luna"]
      }
    }
  }
}
```

`tweeFileList` remains a top-level `boot.json` field handled by ModLoader. `image` contains character names, not PNG paths. Scanning `img/ui/nnpc/` adds filenames without extensions to the graphic choices. `default.png` and `happy.png` are two choices; their names do not automatically detect mood.

### 3. Select in Game

1. Load the mod and enter a scene where Luna is present.
2. Open the framework's NPC sidebar settings and enable image display.
3. Disable “PC Model Mode” and select Luna's `default` or `happy` graphic.
4. A disabled image display or a `none` graphic remains hidden despite registered images.

Character selection is separate from graphic selection. Primary and secondary choices come from current `V.npc` entries also present in the native named-character table. Graphics can be registered in advance. `initnpc` alone or a scheduled location does not add scene presence. Use native `endevent` when the encounter ends.

Automatic selection uses the last character in the current list for the primary model and another recently added character for the secondary. A manually selected character leaving the list falls back to automatic selection. Enable the second model separately.

## Image Paths and DoLP Folders

Supported extensions are `png`, `jpg`, `jpeg`, `gif` and `webp`.

```text
img/ui/nnpc/luna/default.png
img/ui/nnpc/luna/female/pale/default.png
img/ui/nnpc/luna/male/dark/default.png
```

The latter two follow DoLP's common deeper layout. Current gender chooses `male` for male characters and `female` otherwise. Sidebar `skin_type` containing `dark` chooses `dark`; other values choose `pale`.

Resolution prefers a matching gender/skin path, then the flat folder, then other available same-name images. Names such as `black_wolf`, `black-wolf` and `black wolf` normalize to the character name. Additional folders can provide fallback images, so avoid accidental duplicate filenames.

## Artist Layer Models

`Sidebar.config` accepts an array of JSON/YAML paths. Each file may contain one configuration object or an array. Here is `data/npc/luna.yaml`:

```yaml
- name: 'Luna'
  body: 'img/npc/luna/body.png'
  head:
    - img: 'img/npc/luna/hair_rain.png'
      zIndex: auto
      cond: "Weather.name === 'rain'"
    - img: 'img/npc/luna/hair.png'
      zIndex: auto
  face:
    - img: 'img/npc/luna/face_happy.png'
      zIndex: auto
      cond: 'V.myMod?.lunaHappy === true'
    - img: 'img/npc/luna/face_default.png'
      zIndex: auto
  upper:
    - img: 'img/npc/luna/library_top.png'
      zIndex: auto
      cond: "maplebirch.npc.Schedule.get('Luna').location === 'library'"
    - img: 'img/npc/luna/casual_top.png'
      zIndex: auto
```

Supply every image yourself. Your mod owns `lunaHappy`; `library` is a label in this character's schedule. Align images to the same canvas dimensions and coordinates. The framework does not create missing assets.

Add this under the same framework entry's `params`:

```json
{
  "npc": {
    "Sidebar": {
      "config": ["data/npc/luna.yaml"]
    }
  }
}
```

The outer addon structure is the same as in the static-image example.

| Field                                                             | Meaning                                                                                |
| :---------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| `name`                                                            | Named NPC identifier, `Luna` here                                                      |
| `body`                                                            | Base image path string, not a candidate array                                          |
| `head`, `face`, `neck`, `upper`, `lower`, `legs`, `feet`, `hands` | Candidate arrays; use an array even for one image                                      |
| Candidate `img`                                                   | Required image path relative to the ZIP root                                           |
| Candidate `cond`                                                  | Defaults to true; boolean, expression string or condition array                        |
| Candidate `zIndex`                                                | Defaults to `'auto'`; a number is an absolute canvas layer, not an NPC-relative offset |

**Each part chooses only its first matching candidate; it does not stack every entry.** Place conditional candidates before the default. To show hair and ears together, combine them in one image or use a dedicated character-layer extension. Putting both into `head` does not create two simultaneous layers.

Condition arrays use AND. Express OR inside a string, such as `Weather.name === 'rain' || Weather.name === 'snow'`; `$or` objects are unsupported. Callback conditions belong in script objects, not function strings inside JSON/YAML. Keep queries free of state changes.

Import creates internal graphic-selection keys. For a single configuration in `myMod`'s `luna.yaml`, the key is `myMod_luna`. Query `maplebirch.npc.Clothes.art.keys('Luna')` for actual keys; there is no need to hard-code saved graphic preferences.

## PC Models and Wardrobe

PC models read current NPC appearance, framework transformations and the sidebar wardrobe, not artist PNG candidates. Static portraits are unnecessary in this mode, but the clothing assets must exist in the game.

| `Sidebar` field | Loads                             |
| :-------------- | :-------------------------------- |
| `image`         | Static portrait character folders |
| `config`        | Artist image-candidate files      |
| `clothes`       | PC-model wardrobe template files  |

Wardrobe files map template keys to clothing-slot objects; they do not use the artist `name/body/head` schema. Integrate templates, schedules and wear rules together; see [NPC Clothes](NamedNPCClothes.md). The framework supplies naked placeholders, so each mod need not redefine them.

### Hair Lengths

`hair_sides_length` (main hair) and `hair_fringe_length` (fringe) store separate finite numbers, each defaulting to `200`. Use the recommended range `0` through `1000`:

| Starting length | Render stage |
| :-------------- | :----------- |
| `0`             | `short`      |
| `200`           | `shoulder`   |
| `400`           | `chest`      |
| `600`           | `navel`      |
| `800`           | `thighs`     |
| `1000`          | `feet`       |

Rendering selects with `Math.trunc(length / 200)` and falls back to `short` when the result has no table entry. It does not automatically clamp every out-of-range length to the maximum stage. Extra back hair uses only main-hair length.

```javascript
maplebirch.npc.add({
  nam: 'Luna',
  hair_side_type: 'default',
  hair_fringe_type: 'default',
  hair_sides_length: 800,
  hair_fringe_length: 200
});
```

This adds initial appearance to registration. Change current `C.npc.Luna` for story-driven haircuts. Hairstyle fields use native resource IDs. Lengths are independent; missing, nonnumeric or nonfinite values reset independently to the default, while `0` is retained. Old fields are not converted.

### Fluids and Drips

PC models can display native fluid and drip assets. Data lives under `V.maplebirch.npc.luna.fluids`, separate from player `V.player.bodyliquid`. Each part stores `[goo, semen]`, independently limited to `0` through `5`. There is no `nectar` slot.

Call during actual scene resolution:

```javascript
maplebirch.npc.fluids.add('Luna', 'mouth', 2, 'semen');
maplebirch.npc.fluids.set('Luna', 'face', 1, 'goo');
maplebirch.npc.fluids.reduce('Luna', 'mouth', 1, 'semen');
const mouth = maplebirch.npc.fluids.get('Luna').mouth;
const total = maplebirch.npc.fluids.combined('Luna', 'mouth');
```

`mouth[0]` is vaginal fluid/slime and `mouth[1]` semen. `combined()` returns the unbounded sum. Rendering clamps that sum to `0–5` without changing saved amounts. `get()` fills missing data and is not a purely read-only query.

When cleaning up, choose the scope needed:

```javascript
maplebirch.npc.fluids.clear('Luna', 'face', 'goo');
maplebirch.npc.fluids.clear('Luna', 'face');
maplebirch.npc.fluids.clear('Luna');
```

`set/add/reduce` default to `semen`. `clear` without a type clears both; without a part it clears all parts. Legal parts are `vagina`, `vaginaoutside`, `anus`, `mouth`, `penis`, `chest`, `face`, `hair`, `bottom`, `feet`, `leftarm`, `rightarm`, `neck`, `thigh` and `tummy`.

`penis`, `hair`, `bottom` and `vaginaoutside` store data only, without matching native sidebar fluid layers. Both liquids decay independently each hour, using the native drip timing and animation assets. Old numeric amounts become `[oldValue, 0]`; missing parts become `[0, 0]`. Do not use a whole tuple as a number.

The content mod owns sources and timing. The framework does not infer scene fluid sources, and the two liquids share the same visual assets.

## Troubleshooting Display

| Symptom                           | Check in order                                                                               |
| :-------------------------------- | :------------------------------------------------------------------------------------------- |
| No character                      | Registration → native `npc` in this scene → display enabled → correct mode                   |
| No static portrait                | Files in ZIP → matching folder identity → graphic other than `none`                          |
| Artist expression never changes   | Condition truth, earlier default candidates and array-shaped parts                           |
| Artist layers hidden              | Aligned images and automatic ordering first; numeric layers compare across the entire canvas |
| PC model has no clothes           | Imported template, valid clothing `name/variable`, matching scheduled location and wear rule |
| Correct schedule but no character | Schedules do not generate encounters; provide a presence scene                               |
| Only one NPC shown                | Enable the second model and ensure both NPCs are in the current scene list                   |
