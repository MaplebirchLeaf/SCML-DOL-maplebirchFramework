# Transformation System

The transformation system lets a mod add custom body transformations, traits, messages, and rendering layers.

Register transformations with:

```javascript
maplebirch.char.transformation.add(name, type, config);
```

## Minimal Example

```javascript
maplebirch.tool.onInit(() => {
  maplebirch.char.transformation.add('fairy', 'physical', {
    parts: [
      { name: 'wings', tfRequired: 1, default: 'delicate' },
      { name: 'glow', tfRequired: 2, default: 'default' },
      { name: 'pointed_ears', tfRequired: 3, default: 'default' }
    ],
    build: 100,
    level: 3,
    update: [33, 66, 100],
    decay: true,
    layers: {
      fairy_wings: {
        srcfn: () => 'img/transformations/fairy/wings.png',
        showfn: () => V.maplebirch?.transformation?.fairy?.level >= 1,
        zfn: () => maplebirch.char.ZIndices.effects + 2
      }
    }
  });
});
```

## Main Config

| Field | Type | Description |
| :--- | :--- | :--- |
| `parts` | array | Transformation parts unlocked by level |
| `traits` | array | Optional transformation traits |
| `build` | number | Maximum build value |
| `level` | number | Maximum level |
| `update` | number[] | Build thresholds for each level |
| `icon` | string | Optional icon path |
| `message` | object | Level-up and level-down messages |
| `decay` | boolean | Whether the transformation can decay |
| `decayConditions` | Function[] | Conditions required for decay |
| `suppress` | boolean | Whether it can suppress other transformations |
| `suppressConditions` | Function[] | Conditions for suppression |
| `target` | string, string[], or function | Canvas model target for `pre`, `post`, and `layers`. Defaults to `main`. |
| `pre` | function | Runs before character rendering |
| `post` | function | Runs after character rendering |
| `layers` | object | Character rendering layers |
| `translations` | object | Display translations |

## Parts And Traits

```javascript
parts: [
  { name: 'tail', tfRequired: 2, default: 'default' },
  { name: 'horns', tfRequired: 1, default: 'curved' },
  { name: 'wings', tfRequired: 3, default: 'leathery' }
],
traits: [
  { name: 'night_vision', tfRequired: 2, default: 'default' },
  { name: 'enhanced_senses', tfRequired: 4, default: 'default' }
]
```

`tfRequired` is the minimum transformation level required to enable that part or trait.

## Messages

```javascript
message: {
  EN: {
    up: ['Level 1 message', 'Level 2 message', 'Level 3 message'],
    down: ['Level 3 to 2', 'Level 2 to 1', 'Back to normal']
  },
  CN: {
    up: ['...', '...', '...'],
    down: ['...', '...', '...']
  }
}
```

## Decay And Suppression

```javascript
decay: true,
decayConditions: [
  () => V.maplebirch.transformation.dragon.build >= 1,
  () => V.worn.neck.name !== 'dragon_amulet'
],

suppress: true,
suppressConditions: [
  sourceName => sourceName !== 'dragon'
]
```

## Rendering Hooks

```javascript
pre: options => {
  const level = V.maplebirch?.transformation?.dragon?.level || 0;
  if (level >= 4) {
    options.color_tint = '#ff6b00';
  }
},
post: options => {
  if (options.canvas) {
    setup.myMod.drawAura(options.canvas);
  }
}
```

Transformation state is stored under `V.maplebirch.transformation`.

## Canvas Model Target

By default, transformation rendering hooks are applied to the original `main` player model. If a mod needs the same transformation to appear on another model, pass `target`.

```javascript
maplebirch.char.transformation.add('fairy', 'physical', {
  target: ['main', 'combat'],
  parts: [{ name: 'wings', tfRequired: 1 }],
  pre(options) {
    options.fairy_glow = true;
  },
  layers: {
    fairy_wings: {
      srcfn: () => 'img/transformations/fairy/wings.png',
      showfn: () => V.maplebirch.transformation.fairy.level >= 1
    }
  }
});
```
