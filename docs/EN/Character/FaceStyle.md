# Face Style

`faceStyle` extends the vanilla PC face image system. The framework scans mod image paths and adds styles found under `img/face/...` to mirror and model options.

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

`faceStyleSrcFn()` uses this lookup order:

1. `img/face/<current style>/<current variant>/<layer name>.png`
2. `img/face/<current style>/<layer name>.png`
3. `img/face/default/<current variant>/<layer name>.png`
4. `img/face/default/<layer name>.png`

The framework checks paths through the vanilla image loading flow, so both local `img` files and BSA/IDB mod images can be used.

---

## Base Head

Since 4.1.3, `base-head` can also follow `faceStyle`.

To replace the base head for a face style, provide:

```text
img/face/<facestyle>/base-head.png
```

Example:

```text
img/face/my-style/base-head.png
```

When the current `facestyle` has `base-head.png`, the framework uses it first. Otherwise it falls back to vanilla:

```text
img/body/basehead.png
```

`options.mannequin` keeps the vanilla path and does not use the faceStyle base head:

```text
img/body/mannequin/basehead.png
```

---

## Example

```text
img/
  face/
    author-style/
      base-head.png
      default/
        eyes.png
        sclera.png
        iris.png
        mouth-smile.png
```

Place `base-head.png` directly under the style folder, not inside the `default/` variant folder.
