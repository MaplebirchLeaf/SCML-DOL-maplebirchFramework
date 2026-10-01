# Transformation System

The transformation system lets a mod add custom body transformations, traits, messages, and rendering layers.

Top-level `pre`, `post`, and `layers` target the vanilla PC `main` canvas. Supply the corresponding hooks in `combat` to register them to `combatMainPc`.

Register transformations with:

```javascript
maplebirch.char.transformation.add(name, type, config);
```

## Rendering and Chimeras

`layers` and `combat.layers` accept a layer map or a function returning one. Layer maps register immediately. Functions run during the game's `StoryInit` phase, when native `Renderer.CanvasModels` are available. Transformations and chimera conditions can therefore register in `preInit` before image resources are ready.

```javascript
maplebirch.tool.onInit(() => {
  maplebirch.char.transformation.add('dragon', 'physical', {
    parts: [
      { name: 'eyes', tfRequired: 2, label: () => lanSwitch('Eyes', '眼睛') },
      { name: 'tail', tfRequired: 4, label: () => lanSwitch('Scaled tail', '鳞尾') }
    ],
    layers: () => dragonLayers(),
    combat: { pre: dragonCombatPre, layers: dragonCombatLayers },
    chimeras: [
      {
        name: 'demondragon',
        part: 'tail',
        sources: ['dragon', 'demon'],
        label: () => lanSwitch('Demon dragon tail:', '恶魔龙尾：')
      }
    ]
  });
});
```

- A part's optional `label` accepts a string or function and applies only to that transformation's mirror control.
- Each chimera specifies its `name`, `part`, contributing transformations in `sources`, and display `label`. The mirror shows its control when every source has that part visible.
- The framework adds native defaults and mirror controls. The toggle lives at `$chimera[name][part]`, defaults to `true`, and preserves a saved `false`. One chimera name can have several distinct parts.
- Select fusion images in the transformation's own `pre` and `layers`. Read the toggle with the native `isChimeraEnabled(name, part)`.

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

| Field                | Type       | Description                                   |
| :------------------- | :--------- | :-------------------------------------------- |
| `parts`              | array      | Transformation parts unlocked by level        |
| `traits`             | array      | Optional transformation traits                |
| `build`              | number     | Maximum build value                           |
| `level`              | number     | Maximum level                                 |
| `update`             | number[]   | Build thresholds for each level               |
| `icon`               | string     | Optional icon path                            |
| `message`            | object     | Level-up and level-down messages              |
| `decay`              | boolean    | Whether the transformation can decay          |
| `decayConditions`    | Function[] | Conditions required for decay                 |
| `suppress`           | boolean    | Whether it can suppress other transformations |
| `suppressConditions` | Function[] | Conditions for suppression                    |
| `pre`                | function   | Runs before character rendering               |
| `post`               | function   | Runs after character rendering                |
| `layers`             | object     | Character rendering layers                    |
| `translations`       | object     | Display translations                          |

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
    down: ['Level 1 to 0', 'Level 2 to 1', 'Level 3 to 2']
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

`pre` and `post` only apply to the `main` model. Use them to adjust regular PC model render options or add post-render effects.

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

## Rendering Layers

`layers` is also injected only into the `main` model. If a combat canvas or another model needs separate layers, register those layers directly with `maplebirch.char.use()`.

```javascript
maplebirch.char.use(
  {
    fairy_combat_wings: {
      srcfn: () => 'img/transformations/fairy/combat-wings.png',
      showfn: options => V.maplebirch.transformation.fairy.level >= 1
    }
  },
  'combat'
);
```

For the regular PC model, keep the layer inside the transformation config:

```javascript
layers: {
  fairy_wings: {
    srcfn: () => 'img/transformations/fairy/wings.png',
    showfn: () => V.maplebirch.transformation.fairy.level >= 1
  }
}
```

## Shared Traits and Message Indices

Traits with the same name, such as vanilla `sharpEyes`, remain enabled while any owning transformation meets its requirement. They disable only when all owners lose eligibility, without stacking vanilla bonuses. Registering a trait switch does not implement its skill or damage effect. The effect still needs vanilla or mod settlement logic.

`up[n - 1]` describes entering level n, and `down[n - 1]` describes leaving level n. Both arrays are ordered from the lowest level upward. Part visibility and trait switches are stored separately. Rendering should check `isPartEnabled()`, rather than the level alone.
