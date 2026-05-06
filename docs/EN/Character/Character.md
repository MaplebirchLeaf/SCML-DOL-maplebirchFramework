# Character Layers

## Purpose

Character layers extend the player sidebar model. Mods can add new layers, control visibility, provide face style images, or run pre/post render handlers.

## Entry Points

```javascript
maplebirch.char.use(layerMap);
maplebirch.char.use('pre', handler);
maplebirch.char.use('post', handler);
```

## Add a Layer

```javascript
maplebirch.char.use({
  my_mod_glow: {
    srcfn: () => 'img/myMod/glow.png',
    showfn: options => V.myMod?.glow === true,
    zfn: () => maplebirch.char.ZIndices.hair
  }
});
```

## Layer Fields

| Field | Purpose |
| :--- | :--- |
| `srcfn(options)` | Image path |
| `masksrcfn(options)` | Mask image path |
| `showfn(options)` | Visibility |
| `zfn(options)` | Z index |
| `filtersfn(options)` | Filters |
| `animation` | Animation key |

## Face Style Images

Recommended structure:

```text
img/face/
  cat/
    default/
      eyes.png
      mouth-happy.png
```

Use helper:

```javascript
const eyesSrc = maplebirch.char.faceStyleSrcFn('eyes');
```
