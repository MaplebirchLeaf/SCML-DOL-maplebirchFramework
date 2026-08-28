# Face Style

`faceStyle` extends the face image system. The framework scans `img/face/...` inside every installed mod zip and adds the discovered styles (`facestyle`) and variants (`facevariant`) to `setup.faceStyleOptions` / `setup.faceVariantOptions`, used by the vanilla mirror and the NPC sidebar Face Style / Face Demeanour options.

---

## Layout

Regular face layers should usually be grouped by style and variant:

```text
img/face/
  my-style/
    default/
      eyes.png
      mouth-smile.png
    sweet/
      eyes.png
```

- `<style>`: a style such as `my-style` or `default`
- `<variant>`: a variant / demeanour such as `default` or `sweet`

After mod loading (`afterPreload`) the framework iterates every installed mod, scanning `img/face/<style>/<variant>/<image>.png` and `img/face/<style>/<image>.png` paths to build the style and variant options. The `img/face/masks/` folder is skipped; built-in variants of the `default` style (`aloof`, `catty`, `default`, `foxy`, `gloomy`, `sweet`) are not re-added as variant options.

NPC sidebar face layers render via `img/face/<facestyle>/<facevariant>/<image>.png` (or `img/face/<facestyle>/<image>.png`).

---

## Base Head

To replace the base head for a face style, provide:

```text
img/face/<facestyle>/base-head.png
```

When the current `facestyle` has `base-head.png`, the framework uses it first. Otherwise it falls back to vanilla:

```text
img/body/base-head.png
```

`options.mannequin` keeps the vanilla path and does not use the faceStyle base head:

```text
img/body/mannequin/base-head.png
```

---

## Vanilla UI Compatibility

The framework patches the array-length check `setup.faceStyleOptions.length` in vanilla `Widgets Mirror`, `Cheats`, `clothesTestingImageGenerate` and `Widgets Settings` passages, because `faceStyleOptions` becomes an object instead of the vanilla array.
