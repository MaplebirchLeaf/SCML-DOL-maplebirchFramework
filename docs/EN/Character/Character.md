# Character Layers

## Purpose

Character layers extend the player sidebar model. Mods can add new layers, control visibility, provide face style images, or run pre/post render handlers.

## Entry Points

```javascript
maplebirch.char.use(layerMap);
maplebirch.char.use(layerMap, target);
maplebirch.char.use('pre', handler);
maplebirch.char.use('post', handler);
maplebirch.char.use('pre', handler, target);
maplebirch.char.use('post', handler, target);
```

By default, `use()` targets the vanilla `main` model only. Pass `target` when a mod needs to patch another canvas model.

`target` accepts:

| Form                                | Purpose          |
| :---------------------------------- | :--------------- |
| `'main'`                            | One model        |
| `['main', 'lighting']`              | Multiple models  |
| `(name, modelOrOptions) => boolean` | Dynamic matching |

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

Target a specific model:

```javascript
maplebirch.char.use(
  {
    my_mod_overlay: {
      srcfn: () => 'img/myMod/overlay.png',
      showfn: () => true
    }
  },
  'main'
);
```

Target multiple models:

```javascript
maplebirch.char.use(layers, ['main', 'lighting']);
```

Dynamic target:

```javascript
maplebirch.char.use(layers, name => name.startsWith('main'));
```

## Pre/Post Handlers

```javascript
maplebirch.char.use(
  'pre',
  (options, model) => {
    options.myMod ??= {};
    options.myMod.modelName = model?.name;
  },
  ['main', 'lighting']
);
```

The second handler argument is the active `CanvasModel` instance. Ignore it when only the render options are needed.

## Layer Fields

| Field                | Purpose         |
| :------------------- | :-------------- |
| `srcfn(options)`     | Image path      |
| `masksrcfn(options)` | Mask image path |
| `showfn(options)`    | Visibility      |
| `zfn(options)`       | Z index         |
| `filtersfn(options)` | Filters         |
| `animation`          | Animation key   |

## Face Style Images

See [FaceStyle](./FaceStyle.md) for face image layout and `base-head.png` rules.

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

## Notes

- Omit `target` to patch only `main`.
- Use an array for a known list of models; use a predicate only for rule-based matching.
- Prefix custom layer names with your mod name to avoid collisions.
